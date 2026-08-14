# Explore #20 `projects_list_ui` — ¿qué filtros acepta HOY `GET /api/projects`?

> **Encargo:** medir el contrato real del endpoint en las tres capas y cruzarlo contra lo que pide el
> toolbar de #20 (RFC-03 §2 + ficha). **Sólo lectura**: no se tocó ni un archivo de `src/**`.
> **Fecha de la medición:** 2026-08-12, sobre `main` (último commit `bdb11b0`).

---

## 0. TL;DR — el hueco que frena la slice

**Hay UN hueco, y es "buscar".**

| Lo que pide el toolbar de #20 | ¿Existe en backend? |
|---|---|
| segmentado activo/inactivo | ✅ `?active=true|false` |
| botones de tipo | ✅ `?type=knitting|crochet` |
| "más filtros" → **aguja** | ✅ `?needle=<mm>` |
| "más filtros" → **lana usada** | ✅ `?yarnId=<uuid>` |
| **buscar** (texto libre) | ❌ **NO EXISTE.** Ni parámetro, ni columna indexada, ni nada equivalente |

Los cuatro primeros están implementados y probados. **El buscador es el único que no tiene backend**, y
además —dato que agrava la decisión— **tampoco está en el PRD**, que es la fuente única de verdad
funcional: `PRD-01 §6.2` (línea 310) enumera los filtros de la página Proyectos como *"activo/no-activo
(aparte) + varios (tipo, aguja, lana usada, rango de fechas)"*. **No dice "buscar".** El buscador aparece
por primera vez en `RFC-03 §2` (línea 26) y de ahí se copió al `acceptance` de la ficha #20. O sea: no es
que el backend se haya olvidado de implementarlo — es que **nunca se especificó como dato**.

**Segundo hallazgo, menor pero del mismo tipo:** RFC-03 §1 (línea 13) declara el **rango de fechas** como
filtro *principal* del toolbar, y el PRD lo lista también. Pero **RFC-03 §2 (la línea que describe el
toolbar) NO lo menciona**, y la ficha #20 tampoco. El backend **sí** lo tiene (`?from=&to=`). Es el hueco
inverso: capacidad existente que el toolbar podría no pintar. También es decisión de producto.

**Modo de fallo silencioso a tener en cuenta si alguien improvisa** (medido, ver §6): el esquema de
filtros es un `z.object` normal de Zod, que **descarta las claves desconocidas sin error**. Si el
implementer manda `?search=gorro`, el endpoint responde **200 con la lista entera sin filtrar** — no un
400. Un buscador cableado "a ver si cuela" no falla ruidosamente: **miente**.

---

## 1. El contrato real, leído en las tres capas

### Capa 1 — Route handler: `src/app/api/projects/route.ts:23-34`

```ts
export const GET = withSession("GET /api/projects", async (userId, request) => {
  const parsed = projectFiltersSchema.safeParse(readFilters(request));
  if (!parsed.success) return validationErrorResponse(parsed.error);
  const projects = await listProjects(userId, parsed.data);
  return NextResponse.json({ projects }, { status: 200 });
});
```

Tres cosas medidas aquí:

- **`readFilters` (líneas 16-21)** vuelca la query string **tal cual** en el esquema, tras descartar los
  valores vacíos: `?active=` significa *"sin filtro"*, no *"valor inválido"*. Confirmado por el test
  `src/app/api/projects/projects-routes.test.ts:362-373`, que manda los siete parámetros vacíos y espera
  200 con `store.lastFilters` igual a `{}`.
- Como `readFilters` no renombra nada, **las claves del esquema Zod SON los nombres de los query params**.
  Eso está anclado a propósito por un test literal (`projects-routes.test.ts:310-320`) que compara la lista
  ordenada de claves con `toEqual` — falla en las dos direcciones, si falta un filtro y si sobra uno.
- Un filtro **inválido** (no vacío, pero mal formado) responde **400**, no se ignora
  (`projects-routes.test.ts:375-393`: `?active=maybe`, `?type=macrame`, `?needle=gorda`, `?yarnId=123`,
  `?patternId=123`, `?from=ayer` → los seis 400).

### Capa 2 — Validación Zod: `src/features/projects/validation.ts:35-50`

`projectFiltersSchema` es exactamente esto (líneas 39-50):

| Query param | Tipo Zod (línea) | Qué acepta | Default |
|---|---|---|---|
| `active` | `booleanFlag.optional()` (40) | **sólo** las cadenas literales `"true"` / `"false"`; se transforma a booleano | **ausente = sin filtro** (devuelve activos **e** inactivos) |
| `type` | `z.enum(CRAFT_TYPES).optional()` (41) | `"knitting"` \| `"crochet"` | ausente = sin filtro |
| `needle` | `z.coerce.number().positive().optional()` (42-45) | un número en mm, > 0 (coerción desde la cadena; acepta decimales, p. ej. `4.5`) | ausente = sin filtro |
| `yarnId` | `z.uuid().optional()` (46) | UUID | ausente = sin filtro |
| `patternId` | `z.uuid().optional()` (47) | UUID | ausente = sin filtro |
| `from` | `z.coerce.date().optional()` (48) | fecha parseable (`2026-05-01` funciona) | ausente = sin filtro |
| `to` | `z.coerce.date().optional()` (49) | fecha parseable | ausente = sin filtro |

**Son siete. No hay ninguno más.** Ni `q`, ni `search`, ni `name`, ni `status`, ni `limit`, ni `offset`,
ni `sort`/`order`.

⚠️ **Ojo con `active`: NO hay default de "activos".** El backend, sin el parámetro, devuelve **todo**. El
"default activos" del RFC es una decisión de **cliente**: la página tiene que arrancar mandando
`?active=true` explícitamente. Ese es exactamente el patrón que ya usa el Dashboard
(`src/features/dashboard/ui/dashboard-client.ts:123-126`, que fija `active: "true"` a mano).

⚠️ **`active` no acepta `1`/`0`/`yes`.** `?active=1` → 400. Ya está documentado en el comentario de
`dashboard-client.ts:112-114`.

### Capa 3 — Store / `list`: `src/features/projects/api/store.ts:65-115`

El servicio `listProjects` (`src/features/projects/api/list-projects.ts:10-16`) es un paso-a-través puro:
recibe los filtros ya validados y llama a `store.list(userId, filters)`. La traducción a SQL está en
`store.ts:65-115`:

- **Scoping siempre:** `eq(projects.userId, userId)` es la condición base (línea 66). Ningún filtro puede
  sacar proyectos ajenos.
- **`active`** (68-73): `true` → `status IN ('in_progress','paused')`; `false` → **`NOT IN`** de ese mismo
  conjunto (o sea `finished` + `archived`, mirando `PROJECT_STATUSES` en `src/shared/config/index.ts:9-18`
  y `ACTIVE_PROJECT_STATUSES` en la 18). El segmentado inactivo **no** es "todo menos in_progress": es la
  negación del par activo.
- **`type`** (74-76): `eq` directo sobre la columna.
- **`needle`** (77-81): **contención jsonb** — `projects.needles @> '[4]'::jsonb`. Es "el array de agujas
  del proyecto contiene esta medida", no "su primera aguja es". Un solo valor por petición: **no se pueden
  pedir dos agujas a la vez**.
- **`yarnId`** (82-96): `EXISTS` contra `project_yarns` (relación N:N). Un valor por petición.
- **`patternId`** (100-102): `eq` sobre la columna `projects.pattern_id` (FK 1→N, no hay tabla de enlace).
  Como es NULLABLE, un proyecto sin patrón nunca casa.
- **`from` / `to`** (103-108): `gte` / `lte` sobre **`startDate`** (no sobre `endDate` ni `updatedAt`).
- **Orden** (114): `ORDER BY projects.start_date DESC`. **Fijo, no negociable por query param.**
- **Sin `.limit()` ni `.offset()`** en esta consulta (los dos `.limit(1)` que aparecen en el archivo,
  líneas 122 y 157, son de `findById` y `findYarn`, no de `list`).

Los filtros se **combinan con AND** (`and(...conditions)`, línea 113). Test de la combinación:
`projects-routes.test.ts:349-360` y `:505-519`.

---

## 2. Lo que pide el toolbar de #20

**RFC-03 §2, línea 26** (`docs/design/rfc/RFC-03-proyectos.md`), literal:

> **Toolbar:** segmentado activo/inactivo (`kc-tabs`/toggle) + botones de tipo (`kc-btn`) + "más filtros"
> (desplegable) + buscar.

**RFC-03 §1, línea 13:**

> **Filtros principales:** activo/inactivo, tipo, rango de fechas. **Resto** (aguja, lana usada) en
> **"más filtros"**.

**RFC-03 §3, línea 37** (la parte de datos) enumera el contrato así:
`GET /api/projects` (filtros `?active=&type=&needle=&yarnId=&from=&to=`) — o sea, **el propio RFC, en su
sección de backend, NO lista ningún parámetro de búsqueda**. La contradicción es interna al RFC: §2 pide
un buscador que §3 no respalda con ningún dato.

**Ficha #20 en `feature_list.json`** (`acceptance[1]`), literal:

> toolbar: segmentado activo/inactivo (default activos), botones de tipo, 'más filtros', buscar; consume
> GET /api/projects con sus filtros

La `description` de la ficha detalla el contenido de "más filtros": *"'más filtros' (aguja, lana usada)"*.

---

## 3. El cruce, explícito

| Filtro pedido | ¿Existe? | Query param | Tipo / valores | Qué falta |
|---|---|---|---|---|
| Segmentado **activo/inactivo**, default activos | ✅ | `active` | `"true"` \| `"false"` (literales) | Nada en backend. **El "default activos" lo pone el cliente**: sin el param el endpoint devuelve todo |
| **Botones de tipo** (agujas/crochet) | ✅ | `type` | `"knitting"` \| `"crochet"` | Nada. Pero **sólo UN tipo por petición**: "los dos botones marcados" y "ninguno" son la misma petición (sin `type`), como ya resolvió el Dashboard (`dashboard-client.ts:30-38`) |
| Más filtros → **aguja** | ✅ | `needle` | número mm > 0, coercionado | Nada en el endpoint. Falta **de dónde saca la UI la lista de agujas disponibles**: no hay endpoint de "agujas distintas" (ver §7) |
| Más filtros → **lana usada** | ✅ | `yarnId` | UUID | Nada en el endpoint. La UI necesita `GET /api/yarns` para poblar el selector (ver §7) |
| **Buscar** (texto libre) | ❌ **NO** | — | — | **TODO.** No hay parámetro, no hay `ILIKE`/`tsvector` en el store, no hay columna de búsqueda. Y el PRD §6.2 tampoco lo pide |
| Rango de fechas (RFC-03 §1, PRD §6.2) | ✅ | `from` / `to` | fechas, sobre `startDate` | Existe en backend pero **RFC-03 §2 y la ficha #20 no lo ponen en el toolbar**. Hueco inverso |
| Filtro por patrón | ✅ | `patternId` | UUID | Existe y nadie lo pide en #20 (es para RFC-05 / "usado en"). No es trabajo de esta slice |

### Sobre "buscar", con toda la literalidad que pide el encargo

**No existe búsqueda por texto en `GET /api/projects`. Ninguna forma de ella.** Lo verificado:

1. `projectFiltersSchema` tiene exactamente 7 claves y ninguna es de texto (`validation.ts:39-50`).
2. El test ancla del contrato (`projects-routes.test.ts:310-320`) enumera esas 7 con `toEqual`: **añadir un
   parámetro de búsqueda rompe ese test a propósito.** Es un candado, no un descuido.
3. El `WHERE` de `store.list` (`store.ts:66-108`) no contiene ningún `ilike`, `like`, `similar to`,
   `to_tsquery` ni comparación sobre `projects.name` / `projects.notes`. Búsqueda en todo
   `src/features/projects/`: cero coincidencias de `ilike`/`search`/`\bq\b` como parámetro.
4. Tampoco hay índice de texto en el schema (`src/features/projects/schema.ts:17-40`: `name` y `notes` son
   `text` planos, sin índice declarado).

### Las tres salidas posibles (decisión del USUARIO, no del implementer)

Se listan sin recomendar, porque la decisión es de producto:

- **(a) Buscar en cliente**, sobre la lista ya traída: filtrar por `name` en memoria. Cero backend, cero
  contrato nuevo. Riesgo: si el usuario tiene 500 proyectos, se traen los 500 igual (ver §5, no hay
  paginación — hoy ya se traen todos de todas formas, así que **no empeora nada**). Coherente con el
  precedente ya establecido en #19, donde *el orden y el tope de activos son de cliente* porque el
  contrato no los tiene (`ActiveProjectsPanel.tsx:36`, `filters.ts:56`).
- **(b) Ampliar el backend** con un parámetro nuevo. Rompe "backend cerrado (1-18 `done`)", obliga a tocar
  el test ancla del contrato, el PRD §9 (lista de filtros, línea 439) y RFC-03 §3. Es una feature de
  backend, no un detalle de #20.
- **(c) No poner buscador** en esta slice y anotarlo como deuda / diferirlo. Es lo único que el PRD §6.2
  respalda literalmente hoy.

---

## 4. Forma de la respuesta — confirmado: viene ENVUELTA

`route.ts:32` → `NextResponse.json({ projects }, { status: 200 })`.

**Es `{ projects: [...] }`, no un array pelado.** Confirmado también por el tipo que dejó #19:
`src/features/projects/ui/types.ts:32` → `export type ProjectListPayload = { projects: SerializedProject[] }`,
y por el cliente del Dashboard, que desenvuelve a mano (`dashboard-client.ts:122-128`).

Asimetría conocida del proyecto, ya documentada en el código: `GET /api/dashboard/metrics` responde el
objeto **plano**, sin envoltorio (`dashboard-client.ts:96-99`). No es descuido: es el contrato.

**Cada proyecto es la FILA ENTERA de la tabla** — `store.list` hace `.select()` sin proyección
(`store.ts:111`). Campos, según `src/features/projects/schema.ts:17-40`:

| Campo | Tipo en la BD | Cómo llega al navegador |
|---|---|---|
| `id` | uuid PK | `string` |
| `userId` | uuid FK, NOT NULL | `string` — **sí, viaja al cliente**; es del propio usuario, pero conviene saberlo |
| `name` | text NOT NULL | `string` |
| `image` | text NULLABLE | `string \| null` (URL de Cloudinary) |
| `type` | enum NOT NULL | `"knitting" \| "crochet"` |
| `status` | enum NOT NULL, default `in_progress` | `"in_progress" \| "paused" \| "finished" \| "archived"` (orden exacto en `src/shared/config/enums.test.ts:15-22`) |
| `rounds` | int NOT NULL default 0 | `number` |
| `targetRounds` | int NOT NULL default 0 | `number` |
| `progress` | int NOT NULL default 0 | `number` (0-100; lo calcula el backend, el cliente **nunca** lo manda) |
| `needles` | jsonb `number[]` NOT NULL default `[]` | `number[]` |
| `startDate` | timestamp NOT NULL | **`string` ISO** (ver §5) |
| `endDate` | timestamp NULLABLE | **`string \| null` ISO** |
| `time` | int NOT NULL default 0 | `number` (segundos acumulados; lo pinta la card) |
| `patternId` | uuid FK NULLABLE | `string \| null` |
| `completedSteps` | jsonb `number[]` NOT NULL default `[]` | `number[]` |
| `notes` | text NOT NULL default `""` | `string` |
| `createdAt` | timestamp NOT NULL | **`string` ISO** |
| `updatedAt` | timestamp NOT NULL | **`string` ISO** |

**Lo que NO trae:** las lanas enlazadas. Decisión cerrada y escrita en el PRD §9.1 (línea 468): *"`GET
/api/projects` (la lista) NO las lleva"*. Si el toolbar filtra por `yarnId`, la card **no puede** mostrar
qué lana es sin pedir el detalle. Tampoco trae nombre de patrón (sólo el `patternId`).

---

## 5. La trampa de `updatedAt` — confirmada, y ya resuelta por #19

**Confirmado, no re-investigado.** `ProjectRecord` (`src/features/projects/types.ts:4`) es
`typeof projects.$inferSelect`, y Drizzle infiere `Date` para las cuatro columnas `timestamp`. Pero el
handler responde con `NextResponse.json`, que serializa con `JSON.stringify`, que invoca
`Date.prototype.toJSON`: **al navegador llega una cadena ISO-8601**. Tipar la respuesta del fetch como
`ProjectRecord` deja que TypeScript acepte `project.updatedAt.getTime()`, que **compila y explota en
runtime**.

**#19 ya lo resolvió**, en `src/features/projects/ui/types.ts:22-29`, y la forma importa:

```ts
type SerializedDates = "startDate" | "endDate" | "createdAt" | "updatedAt";

export type SerializedProject = Omit<ProjectRecord, SerializedDates> & {
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
};
```

Cómo lo resuelve, en tres puntos:

1. **Se deriva del tipo de dominio con `Omit`, no se reescribe a mano.** Si mañana la tabla gana una
   columna, `SerializedProject` la gana también; si pierde una de esas cuatro fechas, el `Omit` deja de
   compilar y alguien se entera.
2. **Reemplaza las cuatro fechas por `string`** (con `endDate` como `string | null`, respetando el
   NULLABLE de la columna).
3. **El `import type` se borra en compilación** (`verbatimModuleSyntax`), así que el tipo **no arrastra
   Drizzle al bundle del navegador** aunque el módulo de origen lo importe. Por eso `features/projects/ui/`
   tiene su **propio barrel** separado del de la feature: el barrel grande (`src/features/projects/index.ts`)
   hace `export * from "./api"` → store → Drizzle, y traerlo a un componente de cliente metería el ORM en
   el bundle (comentario explícito en `src/features/projects/ui/index.ts:1-7`).

**Consecuencia práctica para #20:** el implementer debe tipar la respuesta como `ProjectListPayload` /
`SerializedProject` importándolos de **`@/features/projects/ui`** (el barrel de UI), **nunca** de
`@/features/projects`. Si necesita ordenar por `updatedAt` o comparar fechas, opera sobre cadenas ISO —que
son ordenables lexicográficamente en UTC— o construye el `Date` explícitamente.

---

## 6. Modo de fallo silencioso: los parámetros desconocidos se DESCARTAN sin error

**Medido empíricamente**, no deducido. Zod instalado: **4.4.3** (`package.json:31` declara `^4.4.3`;
la versión resuelta en `node_modules` se leyó en la ejecución). `projectFiltersSchema` es un `z.object`
sin `.strict()`, y el modo por defecto de Zod es **strip**:

```
$ node --input-type=module -e "..."   # réplica del esquema con dos claves conocidas
zod version: 4.4.3
success: true data: {"type":"crochet"}     # entrada: { type:'crochet', search:'gorro', limit:'10' }
```

O sea: **`GET /api/projects?type=crochet&search=gorro` responde 200 y devuelve todos los proyectos de
crochet, ignorando `search` en silencio.** No hay 400, no hay aviso, no hay log. Un buscador cableado
contra un parámetro inexistente **parecería funcionar hasta que alguien escribe algo en la caja y la lista
no cambia**. Lo mismo aplica a `?limit=20`, `?q=`, `?sort=`.

Esto es justamente lo que hace que el hueco de §0 tenga que cerrarse **antes** de implementar, y no
"probando a ver".

---

## 7. De dónde saca la UI las opciones de "más filtros"

Ninguno de los dos desplegables tiene un endpoint que le dé sus opciones. Es trabajo de diseño de #20, y
conviene que el leader lo sepa antes de encargar:

- **Lana usada (`yarnId`)** → hay que poblarlo con **`GET /api/yarns`**
  (`src/app/api/yarns/route.ts:16-27`). Responde **envuelto** también: `{ yarns }`. Acepta filtros
  `?brandId=&typeId=&colorFamily=` (`src/features/yarns/validation.ts:47-53`) y ordena por
  `createdAt DESC` (`src/features/yarns/api/store.ts:244-249`). **Devuelve la fila cruda de `yarns`**, o
  sea `brandId`/`typeId` como UUIDs — **NO trae `brandName` ni `typeName`**. Para pintar la etiqueta
  habitual "marca·tipo·color" harían falta llamadas extra a marcas/tipos, o conformarse con
  `colorName`/`colorCode`. (El único sitio del repo que devuelve los nombres aplanados es
  `listLinkedYarns` en `store.ts:177-199`, y sólo sirve al detalle de un proyecto, no a un selector global.)
- **Aguja (`needle`)** → **no existe ningún endpoint de "medidas de aguja usadas"**. Verificado: no hay
  ruta bajo `src/app/api/` que lo ofrezca, y `needles` es una columna jsonb por proyecto. Las opciones sólo
  pueden salir de (a) derivarlas de los proyectos ya cargados —**ojo, es circular**: la lista que tenés ya
  está filtrada, así que las opciones cambiarían según el filtro activo— o (b) una lista fija de medidas
  en el cliente, o (c) un input numérico libre. Decisión de diseño abierta.

---

## 8. Paginación: NO hay. Ni paginar hace falta.

- El esquema no tiene `limit` ni `offset` (`validation.ts:39-50`, siete claves), y el test ancla
  (`projects-routes.test.ts:310-320`) lo impide con `toEqual`.
- `store.list` no aplica `.limit()` ni `.offset()` (`store.ts:110-114`); los dos `.limit(1)` del archivo
  son de otras operaciones.
- La respuesta no lleva metadatos de página: es `{ projects }` a secas, sin `total` ni `nextCursor`
  (`route.ts:32`).
- El orden es fijo, `startDate DESC`, y **no hay parámetro para cambiarlo**.

**Ya está registrado como decisión previa:** el `acceptance` de la ficha #19 dice literalmente *"El orden
es de cliente: el backend devuelve startDate descendente y no acepta limit ni offset"*, y el código de #19
lo documenta en `src/features/dashboard/ui/filters.ts:56` y
`src/features/dashboard/ui/ActiveProjectsPanel.tsx:36`.

**Para #20:** la lista **no puede** paginar contra el servidor, y no debería intentarlo. La grilla pinta lo
que venga. Si en algún momento hiciera falta un tope o un "ver más", es **de cliente** —mismo precedente
que el tope de ~15 activos del Dashboard—. Nada que decidir aquí salvo que el usuario quiera paginación
real, que sería backend nuevo.

---

## 9. Precedente listo para reusar (no medido en profundidad, señalado)

`src/features/dashboard/ui/dashboard-client.ts` es el único cliente HTTP de navegador que ya consume este
endpoint, y su cabecera (líneas 8-16) explica por qué existe: **no hay cliente compartido de navegador en
el repo** (`src/shared/lib/http.ts` es exclusivamente de servidor), así que copia la forma de
`features/auth/ui/auth-client.ts`. Piezas que #20 probablemente quiera repetir: endpoints y mensajes como
constantes exportadas (para que los tests las importen en vez de reescribirlas), `fetch` pelado con
`credentials: "same-origin"`, resultado como unión discriminada en vez de excepciones, y un lector de
error defensivo porque un 500 puede responder HTML. **Si eso debe extraerse a un cliente compartido o
duplicarse una tercera vez, es decisión de arquitectura que no medí.**

La card ya existe y **no lleva quick-start, a propósito**: `src/features/projects/ui/ProjectCard.tsx:32-36`
lo dice explícitamente, y también que **no hay slot de acción "preparado"** esperándolo (sería código
muerto). #20 la extiende de forma aditiva. Sus props hoy: `project: ProjectCardData` (que es
`Pick<SerializedProject, "id"|"name"|"image"|"progress"|"time">`), `headingLevel` y `className`.

---

## 10. No medido (declarado a propósito)

- **Rendimiento real** de traer todos los proyectos sin paginar: no se midió con datos reales, no hay
  volumen conocido de la BD.
- **Comportamiento de la contención jsonb con decimales** (`needles @> '[4.5]'`) contra Postgres real: se
  leyó el SQL generado, pero **no se ejecutó contra Neon**. Los tests del store son de SQL generado
  (`store.test.ts` intercepta `toSQL()`), no de ejecución.
- **Si `from`/`to` interpretan zona horaria** de forma que un filtro de "hoy" se corra un día: no se midió.
  `z.coerce.date("2026-05-01")` produce medianoche **UTC**, y `startDate` es `timestamp` sin zona.
- **Cómo debería pintarse** el toolbar (clases, primitivas concretas de `src/shared/ui/`): fuera del
  encargo, no lo miré. No cito ninguna clase de Tailwind que no haya leído literalmente en el código.

---

## 11. Lo que el leader tiene que llevar al usuario

1. **¿Qué se hace con "buscar"?** El backend no lo tiene y el PRD tampoco lo pide. Opciones (a) filtrado en
   cliente sobre `name`, (b) parámetro nuevo de backend —rompe "backend cerrado" y toca PRD §9 + RFC-03 §3
   + el test ancla del contrato—, (c) no ponerlo en esta slice. **Ninguna es improvisable por el
   implementer.**
2. **¿Entra el rango de fechas (`?from=&to=`) en el toolbar?** RFC-03 §1 y PRD §6.2 dicen que sí; RFC-03 §2
   y la ficha #20 no lo mencionan. El backend lo soporta hoy.
3. **¿De dónde salen las opciones de "aguja"?** No hay endpoint. Lista fija, input libre, o derivar de los
   proyectos cargados (circular).
4. **¿Cómo se etiqueta la lana en su selector?** `GET /api/yarns` no devuelve marca ni tipo por nombre. O se
   piden aparte, o la etiqueta se limita a color.

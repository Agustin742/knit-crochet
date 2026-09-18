# Explore #19 — Datos reales y primitivas disponibles

> **Método.** Todo lo que sigue está leído del código en el árbol de trabajo actual
> (rama `main`, con los cambios sin commitear de #33 aplicados). Cada afirmación
> lleva **archivo + línea**. Lo que NO leí en el código va marcado como
> `inferencia (no medido)`. No ejecuté la app ni los tests.
>
> **Nota de seguridad del repo:** este documento **no escribe ninguna clase de
> Tailwind**, ni literal ni abreviada, ni siquiera entre comillas. Cuando hace
> falta nombrar el aspecto de una variante se describe en prosa. Si necesitás el
> string exacto, está en el archivo `*.variants.ts` citado.

---

## BLOQUE A — Contratos de datos reales

### A.1 `GET /api/dashboard/metrics?year=&type=`

**Handler:** `src/app/api/dashboard/metrics/route.ts` (28 líneas, único método `GET`).

**Forma de la respuesta 200: objeto PLANO, sin envoltorio.**
`route.ts:26` → `NextResponse.json(metrics, { status: 200 })`. El cuerpo **es**
`DashboardMetrics`, no `{ metrics: ... }`. (Ojo: `/api/projects` sí envuelve — ver A.2.
La asimetría es real y hay que respetarla.)

**Tipo exacto** — `src/features/dashboard/types.ts`:

```ts
// types.ts:38-51
type DashboardMetrics = {
  hours: number;        // SEGUNDOS  (ver abajo)
  projects: number;     // unidades
  yarnMeters: number;   // metros, LIFETIME
  comparison: MetricComparisons;
};

// types.ts:32-36
type MetricComparisons = {
  hours: Comparison;
  projects: Comparison;
  yarnMeters: Comparison;
};

// types.ts:20-25
type Comparison = {
  label: string;
  referenceValue: number;  // MISMA unidad que la métrica que compara
  times: number;           // cociente adimensional; 0 cuando la métrica vale 0
};
```

#### La trampa de las unidades: CONFIRMADA

**`hours` NO viaja en horas. Viaja en SEGUNDOS. Y su `referenceValue` también.**

Cadena de evidencia completa:

1. `src/features/dashboard/api/store.ts:31-35` + `:66` — `sumHours` es
   `coalesce(sum(craft_sessions.duration), 0)`.
2. `src/features/time-tracking/schema.ts:16` — `duration` es `integer`, y
   `src/features/time-tracking/api/stop-session.ts:15-20` (`calculateDuration`)
   lo calcula como `Math.floor(ms / 1000)` → **segundos enteros**.
3. `src/features/dashboard/types.ts:39-45` — el JSDoc lo dice explícitamente:
   *"Σ `craft_sessions.duration` (en **segundos**) … El nombre `hours` sigue el
   contrato de respuesta del PRD §9; la conversión a horas para mostrar es de la
   UI"*.
4. `src/features/dashboard/api/comparison.ts:31-35` — `HOURS_REFERENCES` toma
   `HOURS_COMPARISONS` (que está **en horas** en config) y multiplica cada una
   por `SECONDS_PER_HOUR`. Por tanto el `referenceValue` que sale por HTTP
   también está **en segundos**.
5. `src/shared/config/index.ts:38` — `SECONDS_PER_HOUR = 3600`, con nota de que
   es el único puente entre las dos unidades y que nunca se escriba `3600` suelto.

**Consecuencia práctica para #19:** el número grande de la tarjeta "horas" hay
que dividirlo por 3600 en la UI, y ese 3600 **no se escribe a mano**: se importa
`SECONDS_PER_HOUR` de `@/shared/config`. Lo mismo si se quisiera mostrar el
`referenceValue` de horas (que en la enmienda E1.4 **no se muestra**: sólo se usa
`label` y `times`, así que en la práctica el implementer puede no tocar
`referenceValue` de `hours` en absoluto).

Valores concretos de `HOURS_COMPARISONS` (`src/shared/config/index.ts:43-50`),
con su `referenceValue` derivado aritméticamente (×3600) — *cálculo mío sobre las
constantes leídas, no una medición en runtime*:

| label | config `hours` | `referenceValue` (segundos) |
|---|---|---|
| Un partido de fútbol | 1.5 | 5400 |
| Un vuelo a Bariloche | 2.3 | 8280 |
| El Señor de los Anillos (extendida) | 11.4 | 41040 |
| Un vuelo a Madrid | 12.5 | 45000 |
| Una semana laboral | 45 | 162000 |
| Un mes de trabajo | 180 | 648000 |

`PROJECTS_COMPARISONS` (`config:55-61`) están en **unidades** y
`YARN_COMPARISONS` (`config:23-29`) en **metros**: en esas dos, `referenceValue`
= el valor tal cual de config, sin conversión (`comparison.ts:38-49`).

#### Semántica de `times` (relevante para E1.4)

`src/features/dashboard/api/comparison.ts:62-80` (`pickComparison`):
- elige la **mayor** referencia cuyo `value <= metric`;
- si ninguna cabe (métrica menor que la referencia más pequeña, **incluido 0**),
  usa la **menor**;
- `times = metric / chosen.value`.

Por tanto: `times >= 1` en el caso normal; `times < 1` cuando la métrica no llega
ni a la referencia más chica; `times === 0` exactamente cuando la métrica es 0.
Esto encaja pieza a pieza con las tres ramas de E1.4 (`≈ N veces <label>` /
"todavía no llegás a X" / no pintar nada). **`times` no viene redondeado**: es un
float crudo (p. ej. 2.1333…). El redondeo y el formato con coma decimal son de
la UI. *(No hay ningún helper de formato de números en el repo — grep de
`Intl.NumberFormat` no aparece en `src/`; inferencia: #19 tendrá que escribirlo.)*

#### `yarnMeters` ignora los filtros

`src/features/dashboard/api/store.ts:46-49` y `:108-116` — `sumYarnMeters(userId)`
sólo recibe `userId`: no hay parámetro de año ni de tipo. `metrics.ts:38` lo
llama sin filtro. Su comparativa tampoco se mueve. Esto es exactamente lo que
E1.5 manda marcar en la UI.

#### `year` y `type` ausentes o inválidos

| Caso | Qué pasa | Dónde |
|---|---|---|
| `year` ausente | El servicio usa `new Date().getFullYear()` del **servidor** | `api/metrics.ts:32` |
| `?year=` (vacío) | `readQuery` descarta las entradas con valor `""` → se trata como **ausente**, no como inválido | `route.ts:10-15`; test en `dashboard-routes.test.ts` ("treats empty query params as no filter") |
| `year` no numérico / no entero / <1970 / >9999 | **400** con `{ error: "<primer mensaje zod>" }` | `validation.ts:11-19` + `http.ts:18-23`; test "answers 400 on an invalid year or type" |
| `type` ausente o vacío | Sin filtro: `hours` y `projects` cuentan los dos crafts | `validation.ts:18`, `metrics.ts:36-39` |
| `type` fuera de `knitting`/`crochet` | **400** | `validation.ts:18` |
| Sin cookie de sesión válida | **401** con `{ error: "No autenticado." }` | `http.ts:54-62`, `withSession` |
| Excepción no controlada | **500** con `{ error: "Error interno del servidor." }` | `http.ts:45-51` |

El cuerpo de error es **siempre** `{ error: string }` y **nunca** dice qué campo
falló (`http.ts:9`, `ErrorBody`). Es el mismo contrato contra el que ya trabaja
`auth-client.ts`.

**Ventana del año** (`api/metrics.ts:13-18`): `[new Date(year,0,1), new Date(year+1,0,1))`
— construida con el constructor **local** del servidor, no UTC. Es una
característica del backend cerrado en #16, no algo que #19 pueda o deba tocar.

**Qué cuenta `projects`** (`store.ts:83-106`): proyectos **iniciados O terminados**
en el año (`startDate` en rango OR `endDate` en rango). No es "proyectos activos".

---

### A.2 `GET /api/projects?active=true`

**Handler:** `src/app/api/projects/route.ts:23-34`.

**Forma de la respuesta 200: ENVUELTA.** `route.ts:32` →
`NextResponse.json({ projects }, { status: 200 })`. El cuerpo es
`{ projects: ProjectRecord[] }`.

**`ProjectRecord` = `typeof projects.$inferSelect`** (`src/features/projects/types.ts:4`),
derivado de `src/features/projects/schema.ts:17-40`. Campo por campo:

| Campo | Tipo TS (inferido de Drizzle) | Columna | Notas |
|---|---|---|---|
| `id` | `string` | `uuid` PK, default aleatorio | |
| `userId` | `string` | `uuid` NOT NULL, FK users cascade | |
| `name` | `string` | `text` NOT NULL | |
| `image` | `string \| null` | `text` NULLABLE | **SÍ trae foto.** Es la URL (Cloudinary), validada como URL en el alta (`validation.ts:16`) |
| `type` | `"knitting" \| "crochet"` | enum NOT NULL | |
| `status` | `"in_progress" \| "paused" \| "finished" \| "abandoned"` | enum NOT NULL, default `in_progress` | |
| `rounds` | `number` | `integer` NOT NULL default 0 | |
| `targetRounds` | `number` | `integer` NOT NULL default 0 | |
| `progress` | `number` | `integer` NOT NULL default 0 | **SÍ viene.** Entero **0-100** (porcentaje), ver abajo |
| `needles` | `number[]` | `jsonb` NOT NULL default `[]` | medidas en mm |
| `startDate` | `Date` en el tipo / **string ISO** por HTTP | `timestamp` NOT NULL defaultNow | |
| `endDate` | `Date \| null` en el tipo / **string ISO o `null`** por HTTP | `timestamp` NULLABLE | |
| `time` | `number` | `integer` NOT NULL default 0 | **SEGUNDOS.** Cache de Σ `craft_sessions.duration` |
| `patternId` | `string \| null` | `uuid` NULLABLE FK patterns set null | |
| `completedSteps` | `number[]` | `jsonb` NOT NULL default `[]` | |
| `notes` | `string` | `text` NOT NULL default `""` | |
| `createdAt` | `Date` / string ISO | `timestamp` NOT NULL defaultNow | |
| `updatedAt` | `Date` / string ISO | `timestamp` NOT NULL defaultNow | **SÍ trae `updatedAt`.** Ver Q14 |

**`progress` es 0-100, no 0-1.** `src/features/projects/api/progress.ts:7-16`:
`Math.round((rounds / targetRounds) * 100)` con clamp 0..100, y **0** si
`targetRounds <= 0`. Encaja tal cual con el contrato de `ProgressBar`
(`PROGRESS_MIN` 0 / `PROGRESS_MAX` 100): se le pasa `project.progress` directo,
sin transformar.

**`time` está en segundos.** `src/features/time-tracking/api/stop-session.ts:22-31`
+ `:57-58`: `Project.time` se **recalcula** como Σ `duration` de las sesiones del
proyecto, y `duration` es segundos enteros (`calculateDuration`, `:15-20`). Igual
que `DashboardMetrics.hours`. Otra vez: `SECONDS_PER_HOUR` para mostrar.

**Serialización de fechas al cruzar HTTP.** El **tipo TypeScript dice `Date`,
pero el JSON entrega `string`.** `NextResponse.json` serializa con
`JSON.stringify`, que invoca `Date.prototype.toJSON` → cadena ISO-8601 en UTC
(p. ej. `"2026-01-15T10:00:00.000Z"`).
- **Honestidad:** esto es semántica de `JSON.stringify`, no algo que yo haya
  medido en runtime, y **no encontré ningún test del repo que asierte el formato
  serializado** de `startDate`/`updatedAt` (los tests de ruta castean el cuerpo a
  `ProjectRecord[]` y sólo comparan `id` y `name`: ver
  `src/app/api/projects/projects-routes.test.ts:418-428`). El único `toISOString()`
  del área está en `session-routes.test.ts:218`, y es del **request**, no de la
  respuesta.
- **Consecuencia dura para #19:** si el cliente escribe
  `const p: ProjectRecord = await res.json()`, TypeScript le dejará hacer
  `p.updatedAt.getTime()` y eso **explota en runtime** (`.getTime is not a
  function`). El tipo miente al cruzar la red. El implementer necesita un tipo
  propio de cliente (algo tipo `Serialized<ProjectRecord>` con las cuatro fechas
  como `string`) o parsear con `new Date(...)` en el borde. **No existe hoy
  ninguna utilidad así en el repo** (grep de `Serialized` / `Jsonify`: cero
  resultados).

**Orden que devuelve el backend:** `src/features/projects/api/store.ts:114` →
`orderBy(desc(projects.startDate))`. **`startDate` descendente**, NO `updatedAt`.
El RFC-02 §3 ya dice que el orden es de cliente; esto confirma que el orden por
defecto que llega **no** es el que la página quiere.

**Filtro `active`:** `src/features/projects/validation.ts:35-38` →
`z.enum(["true","false"]).transform(v => v === "true")`. O sea: **sólo** las
cadenas literales `true` / `false`. `?active=1` → **400**. `?active=` (vacío) →
descartado por `readFilters` (`route.ts:16-21`) → sin filtro (devuelve TODOS los
proyectos, incluidos terminados). `active=true` se traduce a
`status IN (in_progress, paused)` vía `ACTIVE_PROJECT_STATUSES`
(`store.ts:68-73`, `src/shared/config/index.ts:18`).

**No hay `limit` ni `offset` en el contrato.** `ProjectFilters`
(`types.ts:52-69`) no los tiene y `projectFiltersSchema` tampoco. El tope de ~15
del RFC es 100% de cliente, como dice RFC-02 §3.

**El endpoint no trae las lanas.** `LinkedYarn[]` sólo viene en
`GET /api/projects/:id` (`ProjectDetail`, `types.ts:23-26`). La lista es
`ProjectRecord[]` pelado.

---

### A.3 Q14 — el orden "último tejido". **Verificación del código.**

#### ¿`setProjectTime` bumpea `updatedAt`? **SÍ. La afirmación del RFC es cierta.**

`src/features/time-tracking/api/store.ts:137-142`:

```ts
async setProjectTime(userId, projectId, time) {
  await database
    .update(projects)
    .set({ time, updatedAt: new Date() })
    .where(and(eq(projects.userId, userId), eq(projects.id, projectId)));
},
```

Se invoca desde `src/features/time-tracking/api/stop-session.ts:58`, o sea al
**parar** el cronómetro.

**Corrección menor al RFC-02 §3:** el archivo NO es el `store.ts` de projects. Es
`src/features/time-tracking/api/store.ts`. El `store.ts` de projects
(`src/features/projects/api/store.ts:135-142`) tiene un `update` genérico que
aplica el patch que le den; no pone `updatedAt` por su cuenta.

#### ¿Qué OTRAS operaciones bumpean `updatedAt`? — **inventario completo**

Barrí todos los servicios que escriben en la tabla `projects`:

| Operación | Endpoint | ¿Bumpea `updatedAt`? | Evidencia |
|---|---|---|---|
| **Parar sesión** (stop) | `POST /api/projects/:id/sessions/stop` | **SÍ** | `time-tracking/api/store.ts:140` vía `stop-session.ts:58` |
| **Arrancar sesión** (start) | `POST /api/projects/:id/sessions/start` | **NO** — no escribe en `projects` en absoluto | `time-tracking/api/start-session.ts` (sólo `findProject` + `create` de la sesión) |
| **Editar el proyecto** (nombre, notas, estado, foto, agujas, fechas, patrón, `targetRounds`…) | `PATCH /api/projects/:id` | **SÍ, siempre** — `updatedAt` va en el patch de forma incondicional, sea cual sea el campo tocado | `projects/api/update-project.ts:24` → `const patch = { ...input, updatedAt: new Date() }` |
| **Sumar/restar vueltas** | `POST /api/projects/:id/rounds` | **SÍ** | `projects/api/add-rounds.ts:25-29` |
| **Cambiar pasos completados** | `PUT /api/projects/:id/steps` | **SÍ** | `projects/api/set-completed-steps.ts:25-28` |
| **Enlazar / desenlazar lana** | `POST`/`DELETE /api/projects/:id/yarns[/:yarnId]` | **NO** — sólo tocan la tabla `project_yarns` | `projects/api/project-yarns.ts:41-64` (no llama a `store.update`) |
| **Crear proyecto** | `POST /api/projects` | `updatedAt` = `defaultNow()` del insert | `schema.ts:39`, `create-project.ts:19-25` |

#### Veredicto medido

**`updatedAt` NO es "último tejido". Es "último toque".**

Concretamente: es el instante de la **última escritura de cualquier tipo sobre la
fila del proyecto**. Los casos que rompen la lectura "último tejido" y que están
medidos arriba:

- **Renombrar un proyecto** (o cambiarle una nota, o la foto, o el estado) lo
  manda al tope del orden "último tejido" **sin haber tejido un solo minuto**.
  Es el falso positivo más barato de provocar y el más probable en uso real.
- **Sumar vueltas** también lo bumpea. Éste es *discutiblemente* tejido (contar
  vueltas es lo que hacés tejiendo, aunque no corras el cronómetro), así que
  puede leerse como un falso positivo **benigno** o incluso deseable.
- **Marcar pasos del patrón** — mismo caso ambiguo que las vueltas.
- Por el otro lado, **arrancar** el cronómetro no lo mueve: un proyecto que
  llevás **tejiendo tres horas ahora mismo, sin haber parado todavía**, sigue
  con el `updatedAt` de la última vez que se paró. Es un falso **negativo**
  mientras la sesión está abierta.

Resumen: `updatedAt` es un **superconjunto** de "último tejido". Nunca se queda
corto salvo por la sesión abierta en curso, y se pasa de largo con cualquier
edición de metadatos.

#### Qué costaría el camino (b) del RFC

No existe hoy ningún endpoint que dé el timestamp de última sesión **por lote**.
`GET /api/projects/:id/sessions` (`src/app/api/projects/[id]/sessions/route.ts`)
es por proyecto → con ~15 activos serían ~15 peticiones extra en la página que
más se abre. El dato existe en la tabla (`craft_sessions.start` / `.end`,
`src/features/time-tracking/schema.ts:14-15`) pero exponerlo por proyecto exige
**tocar el backend**: o un campo derivado en la lista de proyectos
(`lastSessionAt` con un `MAX(craft_sessions.end)` en el `list` del store), o un
endpoint nuevo. Es una slice de backend, no algo que #19 pueda resolver en UI.

**Para cerrar la decisión con el usuario** (no decido yo): la pregunta real es si
"un proyecto que renombraste ayer aparezca arriba de la lista de último tejido"
es aceptable. Si lo es → camino (a), coste cero. Si no lo es → hace falta una
slice de backend previa (una columna derivada en `list`), y conviene medir si
vale la pena para un orden que además es **cambiable desde la UI** (RFC-02 §1),
o sea que el usuario puede irse a otro criterio en un clic.

---

## BLOQUE B — API pública de las primitivas

### B.0 Qué exporta HOY el barrel `@/shared/ui`

`src/shared/ui/index.ts` (6 líneas) reexporta `cn`, `usePrefersReducedMotion` y
las cuatro capas completas: `./feedback`, `./layout`, `./primitives`, `./three`.

`src/shared/ui/public-api.test.ts:20-47` es el **ancla de contrato** y compara con
`toEqual` sobre la lista ordenada (falla en las dos direcciones: al añadir y al
quitar un export). La superficie exacta hoy es:

**`primitives` (19 nombres, `public-api.test.ts:20-40`):**
`Button`, `Card`, `DIALOG_CLOSE_LABEL`, `DIALOG_SIZES`, `Dialog`, `Field`,
`Input`, `PROGRESS_MAX`, `PROGRESS_MIN`, `PROGRESS_TONES`, `ProgressBar`,
`SKELETON_SHAPES`, `Skeleton`, `Toggle`, `ToggleGroup`, `buttonVariants`,
`cardVariants`, `clampProgress`, `inputClasses`.

**`feedback` (4 nombres, `:42-47`):**
`ERROR_STATE_RETRY_LABEL`, `EmptyState`, `ErrorState`, `STATE_PANEL_HEADING_LEVELS`.
**`StatePanel` NO se exporta** — es la implementación compartida
(`state-panel/StatePanel.tsx:44`, y el test lo dice explícitamente en `:70-71`).

**`layout` (`layout/index.ts`):** `AccountBand`, `AppShell`, `ArchiveNav`,
`BottomNav` + `NAV_ITEMS`, `isRouteActive`, tipo `NavItem`.
**`three`:** `AsciiYarn` (+ lo que exporte `ascii-yarn/index.ts`).

Los tipos de props (`ButtonProps`, `DialogProps`, …) salen todos por los barrels
de cada carpeta (verificado archivo a archivo en `primitives/*/index.ts`).

**Todas las piezas de #33 llegan por `@/shared/ui`** (test `:87-94`). Importar de
la ruta profunda no hace falta nunca.

**Gotcha del barrel raíz:** `@/shared/ui` arrastra `./three` → `AsciiYarn.tsx`,
que es `"use client"` y hace `next/dynamic` con `ssr:false`. Hoy `AppShellClient`
(cliente) importa así sin problema (`src/features/auth/ui/AppShellClient.tsx:6`).
*Inferencia (no medido): importar el barrel desde un Server Component debería
seguir funcionando porque `AsciiYarn` marca su propia frontera de cliente, pero
no lo probé.*

---

### B.1 `Toggle` — `src/shared/ui/primitives/toggle/Toggle.tsx`

```ts
interface ToggleProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type" | "aria-pressed"> {
  pressed: boolean;                              // REQUERIDA
  onPressedChange?: (pressed: boolean) => void;  // recibe el estado NUEVO
}
```

- `forwardRef<HTMLButtonElement>` (`:35`). `"use client"` (`:1`).
- Export: `Toggle`, `type ToggleProps` desde `toggle/index.ts` → barrel raíz.
- **CONFIRMADO: es controlado.** No guarda estado propio; el JSDoc `:25-31`
  explica por qué (una sola verdad arriba).
- **CONFIRMADO: NO es un Tabs.** Es un `button` con `aria-pressed`, superponible:
  varios pueden estar activos a la vez (`:17-23`, y `toggle.variants.ts:3-7`).
- **CONFIRMADO: `type="button"` fijo** (`:42`), y además `type` está **omitido de
  las props**: no se puede sobreescribir. Lo mismo con `aria-pressed`.
- **Gotcha nuevo (no estaba en tu lista):** si le pasás tu propio `onClick` y
  llamás `event.preventDefault()`, `onPressedChange` **no se dispara** (`:46-52`).
  Es deliberado, pero sorprende.
- **Gotcha:** `pressed` es **requerida** — no hay estado no controlado ni
  `defaultPressed`.
- El estado activo se pinta **desde el propio `aria-pressed`**, no desde una
  clase que el llamador tenga que pasar (`toggle.variants.ts:9-12`). O sea: no
  hay prop de "activo visual" que se pueda desincronizar de la semántica.
- `toggleVariants` **no tiene variantes** (`toggle.variants.ts:17-32`, `cva` con
  un solo array): no hay `size` ni `variant`. Un solo aspecto.

### B.2 `ToggleGroup` — `.../toggle/ToggleGroup.tsx`

```ts
interface ToggleGroupProps extends Omit<HTMLAttributes<HTMLDivElement>, "role"> {
  label: string;  // REQUERIDA → aria-label
}
```
- `forwardRef<HTMLDivElement>` (`:25`). **No lleva `"use client"`** (es un `div`
  sin interactividad; el que la lleva es `Toggle`).
- Pone `role="group"` (no sobreescribible, `role` está omitido) + `aria-label={label}` (`:30-32`).
- **No gestiona estado ni impone exclusividad** (`:22-23`): es un contenedor con
  nombre. Quién está activo lo decide el consumidor.
- **Gotcha:** `label` es obligatorio. Sin él un lector anuncia tres botones
  sueltos sin decir de qué conjunto son.

### B.3 `ProgressBar` — `.../progress-bar/ProgressBar.tsx`

```ts
interface ProgressBarProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">, ProgressFillVariants {
  value: number;   // REQUERIDA, escala 0-100
  label: string;   // REQUERIDA
}
// ProgressFillVariants: { tone?: "accent" | "success" }  — default "accent"
```
- `forwardRef<HTMLDivElement>` (`:59`). Sin `"use client"`.
- **CONFIRMADO: `label` es obligatorio** (`:50`, tipo `string` no opcional). El
  JSDoc `:44-49` explica que sin nombre es una violación de `axe`
  (`aria-progressbar-name`). Se puede además pasar `aria-labelledby`, que gana
  sobre `aria-label`.
- **`children` está prohibido por tipo** (`Omit<..., "children">`).
- Valores fuera de rango **se acotan, no lanzan** (`clampProgress`, `:32-37`):
  fuera de rango → al extremo más cercano; **no finito (`NaN`, `±Infinity`) → 0**.
  El valor acotado va tanto al ancho pintado como a `aria-valuenow` (`:71`,`:79`).
- `tone`: dos valores, derivados de `progress-bar.variants.ts:23-30`
  (`PROGRESS_TONES` es exportado y es `["accent","success"]`). Default `accent`
  (`:38-41`).
- Renderiza `role="progressbar"` con `aria-valuemin=0` / `aria-valuemax=100`.
- **Para #19:** `project.progress` ya viene 0-100 entero → se le pasa directo.

### B.4 `Skeleton` — `.../skeleton/Skeleton.tsx`

```ts
interface SkeletonProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">, SkeletonVariants {}
// SkeletonVariants: { shape?: "text" | "block" | "circle" }  — default "text"
```
- `forwardRef<HTMLDivElement>` (`:36`). **`"use client"`** (`:1`) porque usa
  `usePrefersReducedMotion`.
- **CONFIRMADO: es `aria-hidden="true"`** (`:43`), fijo, no parametrizable.
  Consecuencia explícita en el JSDoc `:23-26`: **quien monte varios debe anunciar
  la carga UNA vez desde fuera** (`aria-busy` en el contenedor, o una región
  `aria-live`). Esto es una obligación directa para el estado *loading* de #19.
- `shape` sale de `skeleton.variants.ts:11-15`; `SKELETON_SHAPES` está exportado.
- Con `prefers-reduced-motion` **no desaparece**: pierde el degradado y se queda
  quieto (`:32-34`, `skeleton.variants.ts:39-45`). La decisión se toma **en JS**,
  no sólo en CSS, para que un test pueda medirla.
- `children` prohibido por tipo. El tamaño lo ajusta el llamador por `className`.

### B.5 `Dialog` — `.../dialog/Dialog.tsx`

```ts
interface DialogProps extends DialogVariants {   // DialogVariants: { size?: "md" | "lg" }
  open: boolean;                       // REQUERIDA
  onClose: () => void;                 // REQUERIDA
  title: ReactNode;                    // REQUERIDA
  description?: ReactNode;
  children?: ReactNode;
  closeLabel?: ReactNode;              // default DIALOG_CLOSE_LABEL = "Cerrar"
  dismissOnScrimClick?: boolean;       // default true
  initialFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
}
```
- **NO es `forwardRef`** — es una función plana (`:126`). **`"use client"`** (`:1`).
- **CONFIRMADO: controlado** (`open` + `onClose`). Cuando `open` es `false`
  devuelve `null` (`:237-239`): **el contenido se desmonta**, no se oculta. El
  estado interno de un formulario dentro se pierde al cerrar.
- **CONFIRMADO: portal al `document.body`** (`:143`, `:241`, `createPortal`), y es
  **obligatorio**, no una preferencia: el `main` del `AppShell` abre su propio
  contexto de apilamiento y encerraría el panel por debajo del nav
  (`:92-113` con el razonamiento completo, atado a `dialog.portal.tokens.test.ts`).
  **No lo quites.**
- **CONFIRMADO: `initialFocusRef`**. Por defecto enfoca **el panel**. Repliegue
  documentado (`:76-87`, `:158-170`): si el elemento apuntado no está montado o
  no es una parada de tabulación **dentro del panel**, se enfoca el panel. Nunca
  queda nada sin enfocar.
- Cuatro invariantes implementados y testeados: trampa de foco (`:189-229`),
  `Escape` cierra (`:190-194`), al cerrar el foco vuelve al disparador
  (`:150-176`), y el fondo no hace scroll (`:179-187`, `root-scroll-lock.ts`).
- **Gotcha grande: NO hace spread de props sueltas.** La firma es un objeto
  cerrado — **no podés pasarle `id`, `data-testid`, `aria-*` ni ningún atributo
  HTML**. Sólo `className` (que va al **panel**, no al velo).
- **Gotcha: el `title` siempre se renderiza como `h2`** (`:259`) con `id`
  generado por `useId`, y `aria-labelledby` apunta ahí. No hay `headingLevel`.
- **Gotcha: siempre monta un botón de cierre** en la cabecera (`:262-264`,
  variante fantasma). No se puede quitar; sólo cambiar su etiqueta.
- `aria-describedby` sólo se cablea **si pasás `description`** (`:254`).
- `size`: `md` (default) o `lg` (`dialog.variants.ts:29-36`, `DIALOG_SIZES` exportado).
- **Gotcha de test:** el bloqueo de scroll es un módulo con contador compartido;
  `Dialog.test.tsx:16-27` limpia `document.documentElement.style.overflow` en
  `afterEach` **y** asierta que nadie lo dejó puesto. Copiar ese `afterEach` en
  cualquier test de #19 que abra el modal.

### B.6 `Card` — `.../card/Card.tsx`

```ts
interface CardProps extends HTMLAttributes<HTMLDivElement>, CardVariants {}
// CardVariants: { variant?: "raised" | "flat" }  — default "raised"
```
- `forwardRef<HTMLDivElement>` (`:11`). Sin `"use client"`. Spread completo de
  props HTML.
- Es un `div` **sin semántica**: si la tarjeta de proyecto necesita ser un
  `article` o un `li`, hay que envolverla o usar otro elemento — `Card` no acepta
  `as`. *(Verificado: no hay prop polimórfica en el archivo.)*
- `raised` lleva sombra dura; `flat` no (`card.variants.ts:16-24`). Ambas
  declaran **fondo Y primer plano** a propósito (deuda 32, `:3-12`).

### B.7 `Button` — `.../button/Button.tsx`

```ts
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariants {
  loading?: boolean;   // default false
}
// ButtonVariants: { variant?: "primary"|"secondary"|"danger"|"ghost";  size?: "md"|"icon" }
// defaults: variant "secondary", size "md"
```
- `forwardRef<HTMLButtonElement>` (`:13`). Sin `"use client"`.
- **CONFIRMADO: `type="button"` por defecto** — pero **sobreescribible**:
  `type={type ?? "button"}` (`:19`). Para el submit de un formulario se pasa
  `type="submit"` explícito (es lo que hace `LoginForm`, ver
  `LoginForm.test.tsx:82-85`).
- **Gotcha: `loading` implica `disabled`** — `disabled={disabled ?? loading}`
  (`:22`). Ojo con el `??`: si pasás `disabled={false}` **explícito**, el
  `loading` ya **no** deshabilita (porque `false ?? loading` es `false`).
- `aria-busy` se pone sólo con `loading` (`:23`), y se antepone un glifo giratorio
  `aria-hidden` (`:26-30`).
- La variante fantasma **hereda** el color de texto de la superficie que la
  contiene, a propósito (deuda 17, `button.variants.ts:41-50`): montarla sobre
  una superficie que no declare primer plano la deja invisible.

### B.8 `Field` — `.../field/Field.tsx`

```ts
interface FieldProps {
  label: ReactNode;                     // REQUERIDA
  hint?: ReactNode;
  error?: ReactNode;
  id?: string;                          // si falta, useId
  className?: string;
  children: ReactElement<ControlProps>; // UN solo elemento
}
```
- **NO es `forwardRef`.** **`"use client"`** (`:1`).
- Clona el hijo (`cloneElement`, `:45-51`) y le cablea `id`, `aria-invalid`
  (sólo si hay error) y `aria-describedby` (sólo si hay mensaje).
- **Gotcha: el `error` gana sobre el `hint`** — se pinta uno solo (`:42`).
- **Gotcha: exige exactamente UN hijo elemento** que acepte esas tres props. Un
  fragmento o dos hijos rompe el cableado.
- **Gotcha (deuda 38, documentada en `LoginForm.test.tsx:208-211`):** el mensaje
  **no es región viva**. Un error que aparece tras un envío sólo se anuncia si el
  foco se mueve al control. El repo ya tiene la utilidad para eso:
  `src/features/auth/ui/focus-first-invalid.ts`.

### B.9 `Input` — `.../field/Input.tsx`

```ts
type InputProps = InputHTMLAttributes<HTMLInputElement>;
```
- `forwardRef<HTMLInputElement>` (`:23`). Sin `"use client"`. Sin variantes.
- `inputClasses` se exporta por si hace falta el mismo aspecto en un `select` o
  `textarea` (`:8-19`).
- El estado de error se dispara **por `aria-invalid`** (que cablea `Field`), no
  por una clase manual (`:5-7`).
- **Para el filtro de año de #19:** no hay primitivo de `select`, `textarea` ni
  stepper numérico. Sólo `Input`. El "rango libre" del RFC se monta con un
  `Input` numérico dentro de un `Field`, o con controles propios de la feature.

### B.10 `EmptyState` / `ErrorState` — `src/shared/ui/feedback/`

Base común: `StatePanel` (`feedback/state-panel/StatePanel.tsx`, **no exportado**).

```ts
// StatePanelProps (:18-31)
interface StatePanelProps extends Omit<HTMLAttributes<HTMLElement>, "title">, StatePanelVariants {
  title: ReactNode;                       // REQUERIDA
  description?: ReactNode;
  action?: ReactNode;                     // slot libre
  headingLevel?: 2 | 3 | 4;               // default 2
}

// EmptyStateProps = Omit<StatePanelProps, "tone">      (empty-state/EmptyState.tsx:8)
// ErrorStateProps  = Omit<StatePanelProps, "tone"> & {
//   onRetry?: () => void;
//   retryLabel?: ReactNode;              // default ERROR_STATE_RETRY_LABEL = "Reintentar"
// }
```
- Los dos son `forwardRef<HTMLElement>`. Ninguno lleva `"use client"`.
- Renderiza un **`<section aria-labelledby>`** con el encabezado del nivel pedido
  (`StatePanel.tsx:63-78`). El JSDoc `:35-39` explica por qué `section` y no
  `div`: `aria-labelledby` sobre un `div` sin rol es un atributo prohibido y
  `axe` lo marca.
- **`EmptyState`:** tono neutro, **sin `role="alert"`** — un vacío no es un fallo
  y no se anuncia solo (`EmptyState.tsx:10-18`).
- **`ErrorState`:** `role="alert"` (`:51`) + tono de peligro. El botón de
  reintentar se monta **sólo si pasás `onRetry`** (`:39-44`). **Gotcha: si pasás
  `action`, tu `action` GANA y el reintento no se monta** (`:52`,
  `action ?? retry`).
- `headingLevel` importa en #19: si el estado vacío va dentro de una sección que
  ya tiene su `h2`, hay que pasar `headingLevel={3}` para no saltarse un nivel.
- `STATE_PANEL_HEADING_LEVELS` (`[2,3,4]`) sí está exportado por el barrel.

### B.11 Bonus para E1.2 — `AppShell` y `AsciiYarn`

Relevante porque E1.2 obliga a que `/` no monte el fondo global.

- `src/shared/ui/layout/app-shell/AppShell.tsx:17` — **`background?: ReactNode`
  ya existe** como slot opcional. Si no se pasa, el `div` del slot se monta vacío
  (`:52-58`), no hay ovillo.
- `src/features/auth/ui/AppShellClient.tsx:57` — **hoy lo fija a fuego**:
  `background={<AsciiYarn />}` para **todo** el grupo `(app)`. Ése es exactamente
  "la fontanería acotada" que menciona E1.2: hay que darle al `AppShellClient`
  una forma de que la ruta decida (una prop, o leer `usePathname`). *Inferencia
  (no medido): no vi ningún mecanismo ya montado para eso.*
- `src/shared/ui/three/ascii-yarn/AsciiYarn.tsx:19-33` — props del hero:
  `interactive?: boolean` (default `false`), `glow?: boolean` (default `false`),
  `cols?: number`, `rows?: number`, `className?: string`. Siempre `aria-hidden`
  (`:57`), lo que sostiene E1.3 sin trabajo extra.

---

## BLOQUE C — Patrones de la casa

### C.1 Fetching desde cliente

**No hay cliente HTTP compartido para el navegador.**
`src/shared/lib/` contiene sólo `http.ts` (+ `auth/`, `cloudinary/`), y `http.ts`
es **exclusivamente de servidor**: importa `NextResponse` y `requireSessionUserId`,
y expone `withSession`, `errorResponse`, `validationErrorResponse`,
`readJsonBody`, `readFormData`. Nada de eso sirve en el cliente.

**El único precedente real es feature-local:**
`src/features/auth/ui/auth-client.ts` (92 líneas). Su forma, que #19 debe copiar:

- **Constantes de endpoint exportadas** al principio (`:1-3`) — no cadenas
  sueltas repartidas por los componentes.
- **Mensajes de error como constantes exportadas** (`:5-8`) para que el test los
  importe en vez de reescribirlos (`LoginForm.test.tsx:10`).
- **`fetch` pelado** (`:48-53`), con `credentials: "same-origin"` y
  `headers: { "content-type": "application/json" }`.
- **Resultado como unión discriminada**, no excepciones (`:11-13`):
  `{ ok: true } | { ok: false; status: number; message: string }`.
- **`status: 0` = la petición no llegó a salir** (red caída/DNS/CORS), capturado
  con `try/catch` alrededor del `fetch` (`:54-56`).
- **Lector de error defensivo** (`:15-30`): intenta `response.json()`, comprueba
  que tenga una propiedad `error` de tipo `string`, y si no, mensaje genérico
  (un 500 puede responder HTML).

**Zustand: NO está en uso, y NO está instalado.**
No aparece en `package.json` (leído entero: 50 líneas, dependencias y
devDependencies) ni en ningún import de `src/**` (grep sin resultados). El estado
de UI hoy es `useState` local en los formularios de auth. Aunque `CLAUDE.md`
nombra Zustand en el stack, **añadirlo sería una decisión nueva**, no seguir un
patrón existente.

**Patrón de sesión servidor→cliente:** `src/app/(app)/layout.tsx:17-25` resuelve
la sesión en el Server Component y la baja por props; el JSDoc de
`AppShellClient.tsx:25-34` documenta que pedirla por `fetch` en un `useEffect`
fue la **deuda 21** y se revirtió. *Inferencia (no medido): #19 podría hacer la
primera carga de métricas en el Server Component de `page.tsx` y refetchear en
cliente sólo al cambiar filtros, pero eso es una decisión de diseño, no un patrón
ya escrito en el repo.*

### C.2 Cómo se escribe un test de UI aquí

**Plantilla de referencia recomendada:
`C:\_dev\projects\knit-crochet\src\features\auth\ui\LoginForm.test.tsx`** (252 líneas).
Es la más parecida a lo que #19 necesita: componente de feature + `fetch` doblado
+ router doblado + `axe`. Para el modal, la segunda referencia es
`C:\_dev\projects\knit-crochet\src\shared\ui\primitives\dialog\Dialog.test.tsx`.

Mecánica exacta:

1. **Cabecera de entorno, línea 1 del archivo, antes de todo import:**
   `// @vitest-environment happy-dom`.
   `vitest.config.ts:9` pone `environment: "node"` por defecto y el comentario
   `:7-8` explica que los tests de UI lo declaran por archivo.
2. **`next/navigation`** se dobla con `vi.mock` + `vi.hoisted` para poder asertar
   sobre los espías (`LoginForm.test.tsx:18-28`):
   estado hoisteado `{ replace: vi.fn(), refresh: vi.fn() }`, y el mock devuelve
   `useRouter: () => ({ replace, refresh })`. Se resetean en `afterEach`.
3. **`next/link`** también se dobla, a un ancla simple (`:30-34`).
4. **`fetch`** se dobla con `vi.stubGlobal("fetch", fetchSpy)` en `beforeEach`
   (`:63-65`) y se suelta con `vi.unstubAllGlobals()` en `afterEach` (`:67-73`),
   junto con `cleanup()` de RTL y `fetchSpy.mockReset()`.
   Las respuestas se fabrican con `new Response(JSON.stringify(body), { status, headers })`
   (`:40-45`) — objetos `Response` de verdad, no literales falsos.
5. **`axe`**: `import { axe } from "vitest-axe"` en el propio test (`:7`), y
   `expect(await axe(container)).toHaveNoViolations()` (`:244`). El **matcher**
   se registra globalmente en `vitest.setup.ts` (`expect.extend(axeMatchers)`);
   el **runner** se importa por archivo porque necesita DOM. El buen ejemplo
   (`:237-251`) corre `axe` **dos veces**: en reposo y después de un error, para
   cubrir el estado con contenido nuevo.
6. `userEvent.setup()` por test, `screen.getByRole` / `getByLabelText` — nunca
   selectores de clase. Los asertos son sobre roles, foco, atributos ARIA y
   callbacks; **nunca píxeles** (`docs/harness/conventions.md:161-169`).
7. Estándar de "done" para UI, textual (`conventions.md:161-169`): RTL +
   `user-event` sobre happy-dom, smoke de render, `axe`, y **cero valores
   hardcodeados**. La fidelidad visual contra el mockup es revisión **humana**.

### C.3 El guardrail de no-hardcode: **qué barre y hasta dónde llega**

**`src/shared/ui/no-hardcode.test.ts` NO alcanza a `src/features/**/ui/`.**

Prueba, línea a línea:

- `:27` → `const UI_DIR = fileURLToPath(new URL("./", import.meta.url));`
  El archivo vive en `src/shared/ui/`, así que `"./"` resuelve a
  **`src/shared/ui/`** y punto.
- `:30-44` → `collectComponentFiles(dir)` recorre **recursivamente** ese
  directorio, se queda con `.ts`/`.tsx`, y **excluye** `*.test.*`, `*.spec.*` y
  `*.d.ts`.
- `:46` → `COMPONENT_FILES = collectComponentFiles(UI_DIR)` — no hay ninguna otra
  raíz, ni una lista adicional, ni un segundo `describe` con otro directorio.
- Qué busca (`:49-51`): `HEX_COLOR` = `#` + 3-8 hexadecimales; `RGB_COLOR` =
  `rgb(`/`rgba(`; `PX_LITERAL` = un número seguido de `px`. Un `it` por archivo y
  por categoría (`:78-97`).
- Seguro anti-barrido-roto (`:53-76`): asierta que encuentra >20 archivos y que
  llega a las cuatro capas (`primitives`, `feedback`, `layout`, `three`), porque
  un recorrido roto devolvería cero infractores, es decir verde falso.
- El cambio de #33 fue **lista fija de 18 archivos → recorrido de directorios**
  (documentado en `:12-19`), pero **el recorrido sigue anclado a `shared/ui`**.

**Veredicto para #19: `src/features/dashboard/ui/` y `src/features/projects/ui/`
nacen SIN vigilancia de no-hardcode.** Ni un color hexadecimal ni un `px` suelto
allí haría fallar nada hoy.

**PERO sí nacen vigiladas por el otro guardrail.**
`src/shared/ui/canonical-tailwind-classes.test.ts:49` →
`const SRC_DIR = fileURLToPath(new URL("../../", import.meta.url));`
Desde `src/shared/ui/`, `"../../"` resuelve a **`src/`**. El recorrido
(`:53-67`) barre `.ts`, `.tsx`, `.js`, `.jsx`, `.mjs` y `.css` de **todo `src/**`**,
excluyéndose sólo a sí mismo. O sea: la sintaxis canónica de variables de
Tailwind v4 (forma corta de paréntesis, no corchetes envolviendo un `var()`) **sí**
se exige en `src/features/**/ui/` desde el primer archivo.

**Resumen del alcance real:**

| Guardrail | Raíz del barrido | ¿Cubre `src/features/**/ui/`? |
|---|---|---|
| `no-hardcode.test.ts` (hex / rgb / px) | `src/shared/ui/` (`:27`) | **NO** |
| `canonical-tailwind-classes.test.ts` (sintaxis de variables) | `src/` (`:49`) | **SÍ** |

**Recomendación para el leader** (decisión, no medición): o el implementer de #19
se auto-impone la disciplina token-first sin red, o se amplía `UI_DIR` del
guardrail de no-hardcode a `src/` en la misma slice. Lo segundo es tres líneas y
cierra el agujero para las once páginas que vienen detrás (#19-#30), que es
exactamente el patrón de las deudas 40/43/71 que el propio archivo dice haber
venido a matar (`no-hardcode.test.ts:12-19`).

---

## Apéndice — Lo que NO existe todavía (para que nadie lo dé por hecho)

Verificado por listado de directorios y grep:

- **`src/features/dashboard/ui/` no existe.** La feature tiene `api/`, `index.ts`,
  `types.ts`, `validation.ts` y nada más.
- **`src/features/projects/ui/` no existe.** La "card de proyecto de RFC-03" que
  RFC-02 §7 dice reusar **hay que crearla en #19**, no está escrita.
- **No hay tarjeta de proyecto, ni modal de creación, ni selector de año, ni
  formateador de números/duraciones** en ninguna parte de `src/`.
- **No hay tipo de cliente para respuestas serializadas** (fechas como string).
- **`src/app/(app)/page.tsx` es hoy un placeholder de 12 líneas** (título + un
  párrafo). #19 lo reemplaza entero.
- **`src/proxy.ts:14`** todavía tiene `const PUBLIC_PAGES = ["/", "/login", "/register"];`
  — la deuda 13 / E1.1 sigue abierta tal cual la describe la ficha.

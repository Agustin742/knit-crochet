# Review — feature #20 `projects_list_ui`

**Veredicto: APROBADO**

> Revisión hecha **contra el código, no contra el informe**, por el aviso de procedencia: el
> grueso de la feature lo escribió un implementer que murió antes de verificar, y quien firmó
> la condición doble estaba documentando trabajo ajeno. **Las cinco roturas del §3 del informe
> se reprodujeron desde cero en esta sesión**, más una sexta de diseño propio, y los números
> que van abajo son los que salieron por pantalla aquí.
>
> **Nota de método:** no se modificó ni un byte del árbol. Las roturas se inyectaron **por
> alias de módulo** en configuraciones temporales de vitest fuera del repositorio (se redirige
> `@/features/projects/ui` o `@/features/auth/ui/AppShellClient` a un doble roto y se ejecuta
> **el archivo de gate real, sin tocar**). Integridad verificada al cerrar: los cuatro archivos
> sensibles conservan su SHA-256 de partida, idénticos a los que declara el informe (§3.4).

---

## 1. Verificación de entorno (números tal cual salieron)

| Comando | Resultado medido aquí |
|---|---|
| `bash ./init.sh` (redirigido a archivo, **sin tubería**) | **EXIT 0** · lint verde · typecheck verde · `Test Files 74 passed \| 3 skipped (77)` · `Tests 1281 passed \| 13 skipped (1294)` |
| `pnpm build` (aparte: `init.sh` no ejecuta `next build`) | **EXIT 0** · **28 rutas** · `/proyectos` presente y marcada como dinámica |

Coincide con lo declarado por el leader y por el informe.

### 1-bis. La aritmética que el informe NO pudo cerrar, cerrada

El informe (§4.1) reconoce con honestidad que le faltaban **10 tests por explicar** y ofrece una
hipótesis (baseline anterior a la sesión de deudas 117/118/119) que **es falsa**: el conteo de
archivos cuadra exacto (70 + 4 archivos nuevos = 74), así que el baseline ya incluía aquella sesión.

**La causa real, medida:** `src/shared/ui/no-hardcode.test.ts` **genera dos casos por cada archivo
fuente de src** (uno de colores crudos, otro de tamaños en px) recorriendo el directorio. #20
añade **cinco** archivos fuente no-test (el `page.tsx` de la ruta, `ProjectsView`, `ProjectsToolbar`,
`projects-client`, `project-filters`) → **5 × 2 = 10**. Verificado leyendo los diez casos con sus
nombres en la salida del barrido.

La cuenta cierra al número, sin residuo:

```
1220 (baseline)
+  47  cuatro archivos de test nuevos (24 + 13 + 5 + 5)
+   4  crecimiento de ProjectCard.test.tsx (9 -> 13, medido sobre HEAD)
+  10  dos casos por archivo fuente nuevo, generados por no-hardcode.test.ts
= 1281  OK: exactamente lo que reporta init.sh
```

Medición propia del alcance de #20, ejecutando los cinco archivos juntos:
`Test Files 5 passed (5)` · **`Tests 60 passed (60)`** — coincide con la tabla del informe.

---

## 2. El gate nuevo del caparazón (deuda 111) — atacado, no leído

`src/app/(app)/proyectos/projects-page.test.tsx`. Las cuatro comprobaciones que pedía el encargo:

- ✅ **Usa `queryAllByTestId`, nunca el singular** (líneas 118, 128-129). El comentario de la línea 117
  documenta el motivo correcto: `getByTestId` no falla con dos instancias.
- ✅ **Comprueba `data-interactive` en `"false"`** (línea 130), sobre un doble del ovillo que
  **conserva el atributo** (línea 58) — sin eso la aserción sería decorativa.
- ✅ **Comprueba pertenencia al slot de fondo** con `querySelectorAll(...).toHaveLength(1)`
  (líneas 145-147), otra vez en plural.
- ✅ **Monta la página real dentro del `AppShellClient` real.** Sólo se doblan `next/navigation`,
  `next/link`, la capa 3D y `fetch`. `AppShell`, `ProjectsView`, `ProjectsToolbar`,
  `ProjectCard` y los primitivos corren de verdad.

### Roturas reproducidas en esta sesión

| # | Fallo inyectado | Salida medida aquí | ¿Coincide con el informe? |
|---|---|---|---|
| **A1** | `/proyectos` monta su propio ovillo interactivo | `Test Files 1 failed \| 1 passed (2)` · `Tests 2 failed \| 8 passed (10)` · `expected […] to have a length of 1 but got 2` | **Sí, exacto** |
| **A2** | el caparazón deja de poner el fondo | `Test Files 1 failed (1)` · `Tests 3 failed \| 2 passed (5)` · `expected [] to have a length of 1 but got +0` | **Sí, exacto** |
| **A3** | *(diseñada por el revisor)* exactamente **un** ovillo, **no** interactivo, pero **fuera** del slot | `Tests 1 failed \| 4 passed (5)` — cae **sólo** la aserción del slot | n/a (nueva) |

**A1 confirma el agujero entero:** con `/proyectos` montando dos ovillos, `dashboard-page.test.tsx`
pasa **sus 5 de 5**. Sin este archivo el repo seguía verde con el defecto puesto.

**A3 es la aportación de esta revisión.** A1 y A2 tumban varias aserciones a la vez, así que por sí
solas no demuestran que la tercera (pertenencia al slot) sea **independiente**: podría estar de
adorno. A3 la aísla — un solo ovillo, no interactivo, colocado en el flujo del contenido — y cae
**ella sola**. El gate discrimina en los tres ejes por separado. Es un gate sano.

---

## 3. Las NUEVE decisiones de E1, contra el código

Se auditaron las nueve; se detallan las cuatro que el encargo marcó como "fáciles de cumplir de mentira".

**E1(a) — buscar en cliente. ✅ Bien gateada, y por el motivo correcto.**
El texto de búsqueda **no entra en `requestKey`** (`ProjectsView.tsx:109`) y `ProjectListFilters`
(`projects-client.ts:59-72`) no tiene clave de texto. El gate **no se limita a "la petición salió"**:
`ProjectsView.test.tsx:365-374` recorre **todas** las llamadas a `fetch` y exige que ninguna URL
contenga ni el nombre del parámetro ni el texto tecleado, y `:352-363` exige que el número de
peticiones **no aumente** al escribir. Eso sí distingue el caso bueno del malo (200 sin filtrar).

**E1(e) — el quick-start sólo arranca. ✅ No inventa el dato que no existe.**
Un solo botón por tarjeta, sin icono de parada ni estado "corriendo". `handleQuickStart`
(`ProjectsView.tsx:179-193`) hace **una** petición y nada más: **no hay ningún sondeo** para
adivinar si el cronómetro corre. El 201 frente al 200 se aprende **al tocar**, y el cliente
devuelve `status` también en el camino OK (`projects-client.ts:110-115`), que es el ensanchamiento
del molde que la enmienda pide. `POST` **sin cuerpo**, verificado por aserción
(`ProjectsView.test.tsx:496`). El gate que hace ejecutable la decisión es `:500`, que exige **texto
distinto** para 200 y 201.

**E1(f) — la card no es tocable. ✅ En las dos capas.**
No hay `Link` en `ProjectCard` ni alrededor de la tarjeta en `ProjectsView`; el botón es hermano del
título, no hijo de un ancla. Cero botones dentro de un ancla. Gateado con `queryAllByRole("link")`
en 0 **con y sin** la prop (`ProjectCard.test.tsx:129, 136`) y a nivel de vista (`:545-549`), más
`axe` con el botón montado. Los únicos enlaces son los dos "crear" del estado vacío.

**E1(i) — el activo por defecto se manda explícito. ✅ Y el gate es inmune al modo de fallo que preocupaba.**
`getProjects` serializa el parámetro `active` **siempre** (`projects-client.ts:148`, ternaria sin
rama que lo omita). El doble de `fetch` de los tests **no implementa filtrado propio**: devuelve una
lista fija y las aserciones son sobre **la URL literal pedida** (`ProjectsView.test.tsx:261`:
igualdad exacta con el endpoint más el parámetro activo en `true`). Por construcción, un gate así no
puede quedarse verde porque el doble filtre por su cuenta.

**Las otras cinco:** E1(b) cumplida por omisión (sin campo de fecha, y el tipo de filtros no declara
el rango); E1(c) lista fija en `shared/config` con anclas de orden, monotonía y positividad;
E1(d) etiqueta por color con desambiguación sólo ante repetición, y `Record<ColorFamily, string>`
completo (añadir una familia sin etiqueta **no compila**); E1(g) `<details>`/`<summary>` nativo,
gateado además con "no hay ningún `dialog`" y con la comprobación de que **nadie se dejó el scroll
bloqueado** en el `afterEach`; E1(h) tercer clon documentado.

**Las nueve se cumplen en el código.** No encontré ninguna cumplida "de mentira".

---

## 4. El gate aditivo de `ProjectCard.test.tsx:125-137` — las dos direcciones

| # | Fallo inyectado | Salida medida aquí | ¿Coincide con el informe? |
|---|---|---|---|
| **B1** | el botón se monta **siempre** | `Tests 1 failed \| 12 passed (13)` | **Sí, exacto** |
| **B2** | el botón **no** se monta nunca | `Tests 3 failed \| 10 passed (13)` | **No: el informe escribe `12 passed`** (ver §6.1) |

El par queda demostrado igualmente: sin la prop, **cero** controles; con ella, **exactamente uno**.

### 4-bis. Corrección a una premisa del encargo (medida, no supuesta)

El encargo daba por hecho que si el quick-start se colara "de serie", *"`DashboardView.test.tsx` y su
`axe` verían controles nuevos"*. **Es falso.** Inyectado B1 sobre el consumidor de #19 (todas las
tarjetas del Dashboard con botón), `DashboardView.test.tsx` pasa **`31 passed (31)`**, `axe`
incluido. Además **no existe** ningún `ActiveProjectsPanel.test.tsx`.

Conclusión: la invariante *"la tarjeta del Dashboard no monta controles"* **está protegida en un
solo punto del repo**, `ProjectCard.test.tsx:125-130` — que existe, es correcto y sí cae (B1). No es
un defecto de #20: es que #20 es **lo único** que la sostiene. **Sugerencia de ficha para el leader**
(no bloquea): la mitad "consumidor" de esa invariante no tiene gate propio.

---

## 5. Arquitectura, convenciones e higiene

- **Capas.** ✅ La página (`src/app/(app)/proyectos/page.tsx`) es de 3 líneas: rutea y compone. Cero
  importaciones de Drizzle, de `@/shared/db` o de `features/projects/api` en toda la UI de la feature
  (verificado por búsqueda recursiva). Los datos entran por `fetch` contra el BFF ya existente; **#20
  no toca backend**, coherente con E1(a)/E1(b).
- **Barrel correcto.** ✅ Se consume `@/features/projects/ui`, el barrel de presentación, y no el de
  la feature —que arrastraría `./api` → store → ORM al bundle del navegador—. El JSDoc del `index.ts`
  lo explica y el cambio lo respeta.
- **Tipos.** ✅ Cero `any`. `YarnOption` es un `Pick` de tres campos con justificación escrita de por
  qué **no** necesita el tratamiento de serialización (ninguno de los tres es fecha).
- **Idioma.** ✅ Código en inglés, UI y prosa en español.
- **Higiene.** ✅ Ni un `console.log`, ni un `TODO`/`FIXME`, ni un secreto, ni una dependencia nueva
  en los siete archivos de la feature.
- **Tokens.** ✅ Los cinco archivos fuente nuevos entran en el barrido **sin allowlist** de
  `no-hardcode.test.ts` (verificado uno a uno en la salida) y en el de la sintaxis canónica de
  variables. **Nadie se saltó el sistema con un breakpoint de fábrica** (deuda 122): las variantes
  responsive de la grilla y del toolbar usan **los breakpoints propios del repo**, declarados como
  tokens en `globals.css`; búsqueda explícita de los cinco de fábrica en los archivos de #20 →
  **ninguna**.
- **Accesibilidad.** ✅ `axe` sobre la vista cargada, sobre la vacía y sobre la tarjeta con el botón.
  Región viva **con nombre** (deuda 114) — y la primera vez que ese nombre se cobra es justo el
  `settle()` del gate nuevo, porque la pantalla tiene dos regiones vivas y el selector anónimo sería
  ambiguo. Nombre accesible del botón parametrizado por proyecto, `aria-pressed` en el segmentado,
  `aria-busy` en la grilla.
- **Tests por módulo.** ✅ Todo módulo nuevo con lógica tiene el suyo: lógica pura (13), vista (24),
  composición en ruta (5), listas de config (5), tarjeta (13).
- **`yarn-host-responsive.test.ts` sigue verde por el motivo correcto.** ✅ Su ancla es una igualdad
  exacta sobre los anfitriones **descubiertos** recorriendo el árbol de fuentes; hoy devuelve los
  **cuatro** de siempre. Si el descubrimiento se hubiera roto, la lista saldría vacía y la igualdad
  caería. Está verde porque **#20 no montó ovillo propio**, que es exactamente lo que su propio gate
  de composición exige.

---

## 6. Defectos encontrados (ninguno bloqueante)

**6.1 — El informe transcribe mal un número en un bloque presentado como salida literal (REGLA 3).**
`impl_projects_list_ui.md` §3.3, rotura **B2**, pega `Tests 3 failed | 12 passed (13)`. Es imposible
de raíz —3 + 12 = 15, no 13— y la salida real, reproducida aquí, es **`3 failed | 10 passed (13)`**.
El resto de bloques (A1, A2, B1) coinciden **exactos** con lo medido. Es el mismo tipo de defecto que
el precedente de #31. **Corrección de una línea, en el informe; no toca código.**

**6.2 — La explicación del descuadre de +10 tests (informe §4.1) es una hipótesis errónea.**
Ya resuelta y medida en el §1-bis de esta revisión. Conviene sustituir la hipótesis por la causa
real antes de que el número viaje al informe de cierre.

**6.3 — Código muerto y engañoso en `ProjectsView.test.tsx`.** El `void init;` de la línea 149, dentro
de `serve()`, **no se refiere al parámetro del doble de `fetch`** —que es lo que el comentario de la
línea 152 sugiere— sino a un `const init = undefined` de módulo declarado **tres líneas más abajo**.
Funciona por accidente (se evalúa en tiempo de llamada, no de definición). Lo correcto sería no
declarar el parámetro que no se usa. No rompe nada; ensucia.

**6.4 — Deuda 6 suma su cuarta instancia.** Las aserciones de filtros son sobre la **URL literal**,
que es el patrón correcto y el que evita el fallo silencioso. Pero **nada ata** esas cadenas al
esquema real del endpoint: si el backend renombrara un parámetro, estos gates seguirían verdes. Es
la clase ya fichada, no un defecto nuevo de #20.

**6.5 — Comprobaciones que el implementer no pudo hacer, hechas aquí:**
- §6.3 del informe (¿está fichado el tercer clon del cliente HTTP?) → **SÍ**, es la **deuda 129** de
  `progress/deudas.md`. Confirmado. **No cuenta como falta.**
- §6.1 del informe ("ocho" frente a nueve decisiones) → **ya corregido** en `RFC-03` §7-bis, con la
  corrección **escrita y no borrada** (bloque marcado como corrección del leader, que además explica
  la causa: ocho del usuario más una del leader). **No cuenta como falta.**
- §6.2 (E1(b) sin gate) y §6.4 (deuda 111 saldada en su instancia, no en su clase) → confirmados tal
  como los describe. Ambos son decisiones de alcance del leader, no defectos de esta slice.

---

## 7. Checkpoints

- **C1: [x]** — archivos base y los tres docs presentes; `bash ./init.sh` → **EXIT 0** (ejecutado en
  esta sesión, redirigido a archivo).
- **C2: [x]** — **una sola** feature en `in_progress` (la #20, correcto: el `done` es posterior a esta
  aprobación). `progress/current.md` describe la sesión activa, sin restos de sesiones anteriores.
- **C3: [x]** — capas respetadas: la UI no toca la DB, la página es fina, no hay lógica de negocio en
  ningún route handler (#20 **no añade** ninguno), estructura feature-first, cero dependencias nuevas,
  cero `console.log`, cero TODOs sin contexto, cero secretos.
- **C4: [x]** — lint y typecheck verdes; los 1281 tests verdes; cada módulo nuevo con su test; y —lo
  que de verdad importa aquí— **los gates nuevos se vieron caer en rojo**, en seis inyecciones
  distintas, antes de aceptarlos.
- **C5: [x]** — sin archivos sospechosos sin trackear (ni `*.tmp` ni artefactos de build;
  `next-env.d.ts` borrado a propósito, deuda 119). El árbol quedó **byte a byte** como estaba:
  SHA-256 idénticos a los de partida. La entrada de `progress/history.md` y el paso de #20 a `done`
  corresponden al cierre, después de esta aprobación.

---

## 8. Veredicto

**APROBADO.** El código hace lo que el informe dice que hace — que era la duda razonable de partida,
dado que quien lo documentó no lo escribió. Las nueve decisiones de E1 están en el código, no sólo en
la prosa; los gates nuevos **gatean de verdad**, comprobado tumbándolos en seis direcciones; y el
único descuadre numérico que el informe dejó abierto tiene ahora una causa medida y una cuenta que
cierra al número.

**Antes del informe de cierre, dos correcciones de documentación** (no de código, no bloquean el
`done`):

1. `progress/reports/impl_projects_list_ui.md` §3.3, bloque **B2**: `12 passed` → **`10 passed`**.
2. `progress/reports/impl_projects_list_ui.md` §4.1: sustituir la hipótesis del baseline por la causa
   real de los +10 (dos casos por archivo fuente nuevo que genera `no-hardcode.test.ts`), con la
   cuenta que cierra en 1281.

**Sugerencias de ficha para el leader** (ninguna bloquea): §6.3 (código muerto en el test de la
vista), §6.4 (cuarta instancia de la deuda 6) y §4-bis (la mitad "consumidor" de la invariante de la
tarjeta no tiene gate propio: `DashboardView.test.tsx` pasa 31/31 con los botones colados).

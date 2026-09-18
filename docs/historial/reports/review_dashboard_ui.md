# Review — feature 19 `dashboard_ui`

**Veredicto: CAMBIOS REQUERIDOS**

Un (1) bloqueante. **No es un bug de código**: es una afirmación sobre el arnés,
presentada como hecho establecido, escrita en un comentario de producción y copiada al
informe, que **es falsa** y que además es justo la que sostiene la decisión que documenta.
La desmentí con una mutación sobre la suite completa. Es exactamente el patrón que cerró la
sesión anterior (el dato falso de happy-dom) y el de la enmienda E1.1 (la "deuda 13" que
era una procedencia): un error de código lo caza un test; una afirmación inventada la cita
el siguiente agente como verdad.

**Todo lo demás está muy bien.** Las ocho decisiones están implementadas, los dos gates
nuevos son reales y caen en las dos direcciones (lo verifiqué yo, no me fié de la salida
pegada), el guardrail ampliado no perdió cobertura, `init.sh` sale verde **con los números
exactos que declara el implementer**, y la medición contra servidor real que afirma haber
hecho **la reproduje y da lo mismo**. El arreglo del bloqueante son dos líneas de
comentario, o un test de seis.

---

## Checkpoints

- **C1: [x]** — Existen `AGENTS.md`, `init.sh`, `feature_list.json`, `progress/current.md`
  y los tres docs de `docs/harness/`. `bash ./init.sh` **exit code 0**, ejecutado por mí
  sin tubería (§1).
- **C2: [x]** — Una sola feature en `in_progress` (la 19; el implementer **no** la marcó
  `done`, como corresponde). `progress/current.md` describe la sesión activa. *Nota menor:*
  lleva **dos** bloques "EN CURSO" para la misma feature #19; no es basura de sesiones
  anteriores, pero conviene fundirlos.
- **C3: [x]** — Capas respetadas. La UI nueva **no importa Drizzle ni `@/shared/db`**
  (grep sobre `features/dashboard/ui`, `features/projects/ui`, `shared/lib/format.ts` y
  `app/(app)/page.tsx`: cero coincidencias), y los dos barrels de UI existen **precisamente**
  para no arrastrar el barrel de feature que sí llega al ORM. La página es fina. Sin
  `console.log`, sin TODO/FIXME, sin secretos. Sin dependencias nuevas (`zustand` sigue
  **sin instalar**, verificado en `package.json`).
- **C4: [x]** — `pnpm lint` **sin una sola línea de salida** (cero errores y cero warnings),
  typecheck verde, **1194 tests verdes**. Cada módulo con lógica no trivial tiene test.
- **C5: [ ]** — Razón: **`progress/history.md` no tiene entrada por la última sesión
  cerrada.** Su última cabecera es `## 2026-08-05 — Feature #15 uploads_image`; no hay
  ninguna para **#33 `ui_primitives_2`**, cerrada el 2026-08-06 y con dos commits
  (`feat: add primitive UI`). Es contabilidad del **leader** y es **anterior a #19**, así
  que no la cuento contra el implementer, pero el checkpoint no se cumple hoy. El resto de
  C5 sí: no hay archivos sin trackear sospechosos y la feature está en su estado correcto.

---

## 0. Cómo revisé (para que se pueda auditar este review a su vez)

Todas las mutaciones se hicieron sobre el árbol real, con **copia byte a byte previa** en el
scratchpad y restauración verificada por `md5sum -c`. Al terminar, `git status --porcelain`
y `git diff --stat` devuelven **exactamente** lo mismo que al empezar: 13 archivos
modificados, el mismo juego de untracked, `421 insertions(+), 49 deletions(-)`. No queda ni
una mutación viva, ni un archivo temporal dentro del repo.

---

## 1. `bash ./init.sh` — ejecutado por mí, salida real

Redirigido a fichero, **sin tubería** (una tubería devolvería el código de salida de `tail`,
que es la trampa fichada en `current.md`):

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  68 passed | 3 skipped (71)
      Tests  1194 passed | 13 skipped (1207)
   Start at  14:19:47
   Duration  123.56s

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
EXIT=0
```

**CONFIRMADOS los números exactos del informe:** `1194 passed | 13 skipped`, **68** archivos.
Contra el baseline declarado (`788 passed | 13 skipped`, 62 archivos) el delta es **+406
tests y +6 archivos**, que es lo que dice el §0 del informe.

`src/shared/db/index.test.ts` **no** falló por timeout en ninguna de mis dos corridas
completas: la **deuda 103** no apareció.

**`pnpm build`** — ejecutado por mí, `EXIT=0`:

```
✓ Compiled successfully in 10.2s
Route (app)
┌ ƒ /
├ ○ /_not-found
…
├ ƒ /login
└ ○ /register
```

**`pnpm lint`** — ejecutado por mí:

```
$ eslint .
```

Salida vacía: cero errores y **cero warnings**, incluido el `eslint-disable-next-line`
acotado del `<img>` de `ProjectCard`. La afirmación del informe §8.6 se sostiene.

---

## 2. BLOQUEANTE

### B1 — `DashboardHero.tsx:24-26` afirma que existe un test que NO existe, y esa afirmación es lo único que sostiene la decisión que documenta

**Dónde.** `src/features/dashboard/ui/DashboardHero.tsx`, líneas 22-26:

> *"Por debajo de `--bp-tablet` el ovillo **no se monta** (`useViewportSupports3d` ni
> siquiera descarga `three`), así que su hueco se apaga con la misma condición de ancho en
> vez de quedarse como un agujero: la variante `tablet:` y el token `--bp-tablet` comparten
> valor, **y un test de tokens los obliga a moverse juntos**."*

Y repetido en `progress/reports/impl_dashboard_ui.md` §3, E1.3 (líneas 130-133):

> *"…la variante `tablet:` y el token `--bp-tablet` comparten valor **y hay un test de
> tokens que los obliga a moverse juntos**."*

**Ese test no existe.** Barrí **todos** los ficheros de test del repo buscando la cadena
`breakpoint`. Aparece en exactamente dos líneas, y las dos son del **archivero**:

```
src/shared/ui/layout/archive-nav/archive-nav.tokens.test.ts:257:
  it("los dos juegos de breakpoints declaran el mismo ancho de nacimiento", () => {
src/shared/ui/layout/archive-nav/archive-nav.tokens.test.ts:261:
    expect(length("--breakpoint-archive")).toBe(length("--bp-archive"));
```

Es el par **`archive`**, y sólo el par `archive`. No hay nada, en ningún test, que ate
`--breakpoint-tablet` con `--bp-tablet`. (La otra mención de `--bp-tablet` en ese archivo,
línea 266, es una cuenta de anchos del nav: no compara los dos namespaces.)

**Comprobado con la condición doble, en la dirección que importa.** Desincronicé los dos
tokens en `src/app/globals.css` (`--breakpoint-tablet: 768px` → `900px`, dejando
`--bp-tablet: 768px`) y corrí **la suite entera**:

```
mutated: --breakpoint-tablet 768px -> 900px (desincronizado de --bp-tablet)
VITEST_EXIT=0

 Test Files  68 passed | 3 skipped (71)
      Tests  1194 passed | 13 skipped (1207)
```

**Cero rojos. Exit 0.** Restaurado desde copia y verificado por `md5sum`
(`9aa85707662c00471d8a315c9fff7bfc`, idéntico al de antes de tocarlo).

**Por qué es bloqueante y no una nota al pie.** No es prosa decorativa: es **la
justificación entera** del hueco. `useViewportSupports3d` lee **`--bp-tablet`** en runtime
para decidir si monta la escena (`useViewportSupports3d.ts:5,15`), mientras que el hueco del
hero se enseña con la variante responsive **`tablet:`**, que la genera
**`--breakpoint-tablet`** (`globals.css:307`; el propio comentario de `globals.css:302-305`
avisa de que el ancho vive dos veces porque las media queries no resuelven `var()`). Si se
desincronizan —y hoy nada lo impide— pasa **exactamente** el defecto que el comentario
declara imposible: entre 768px y 900px el ovillo se monta pero su hueco sigue oculto, o al
revés según qué token se mueva, y queda el agujero. El comentario dice "esto está guardado"
cuando no lo está, y el siguiente agente que toque los breakpoints lo leerá como verdad —
que es literalmente cómo nació la corrección de procedencia de E1.1 de esta misma semana.

Y hay señal de **propagación por copia**: el `it` del archivero existe y dice casi lo mismo
para su propio par. Lo más probable es que se generalizara de ahí sin comprobarlo, igual que
el `(#13)` de la deuda 1 se leyó como número de deuda.

**Qué hay que hacer (una de las dos, no las dos):**

1. **Preferible — hacer verdadera la afirmación.** Añadir el `it` que falta, hermano literal
   del de `archive-nav.tokens.test.ts:257-262`, asertando
   `length("--breakpoint-tablet") === length("--bp-tablet")`. Con eso el comentario deja de
   mentir y el hueco queda de verdad guardado. Si se hace, **verificarlo con la condición
   doble**: desincronizar los dos tokens tiene que ponerlo **rojo** (la mutación de arriba es
   reproducible tal cual). Punto extra si el `it` cubre los cuatro pares (`mobile`, `tablet`,
   `desktop`, `archive`), porque el agujero es el mismo para los cuatro y hoy sólo uno está
   tapado.
2. **Alternativa — corregir el texto.** Quitar la frase de `DashboardHero.tsx` y del
   informe, y decir lo que de verdad pasa: que los dos valores están sincronizados **por
   disciplina**, no por gate, con ficha de deuda.

En los dos casos hay que **corregir también `progress/reports/impl_dashboard_ui.md` §3
(E1.3)**, porque ese informe es el que va a leer el leader para escribir el de cierre, y es
por donde se propagaría.

---

## 3. Lo que verifiqué y SÍ se sostiene (condición doble re-ejecutada por mí)

No usé la salida pegada en el informe. Cada mutación es mía, con su restauración.

### 3.1 E1.1 — el gate positivo del proxy

Mutación: devolver `"/"` a `PUBLIC_PAGES` (`src/proxy.ts:22`).

```
 ❯ src/proxy.test.ts (14 tests | 1 failed)
     × redirects the Dashboard to login when there is no session
AssertionError: expected 200 to be 307 // Object.is equality
 Test Files  1 failed (1)
      Tests  1 failed | 13 passed (14)
```

Restaurado desde copia → `Test Files 1 passed (1) / Tests 14 passed (14)`.

**El gate positivo es real y cae en la dirección correcta.** Comprobado además lo que la
ficha pedía explícitamente: el test que **enumera** públicas (`proxy.test.ts:55-62`) sigue
**verde** con esa mutación — no detecta lo que sobra. Por eso el positivo era obligatorio, y
por eso no valía con recortar el viejo.

Y el viejo **está reescrito, no recortado**: conserva el invariante ("la puerta de entrada se
puede abrir sin sesión") con las dos páginas de auth, y su comentario ya no dice "las tres".
`proxy.test.ts:127-131` también está reescrito de título y comentario, y ahora enuncia el
eslabón que de verdad sostiene (que sin él habría bucle entre las dos rutas).

`PUBLIC_PAGES` y `AUTH_PAGES` **NO están fusionadas**, y los dos JSDoc explican por qué no
(`proxy.ts:13-37`): uno decide si la sesión es **obligatoria** y el otro si **sobra**. El
comentario no quedó mintiendo.

### 3.2 E1.2 — un solo ovillo, en las dos direcciones **y con un segundo ovillo real**

**Dirección A** — el caparazón vuelve a montar el fondo siempre:

```
     × no monta el fondo global en el Dashboard: el hero es el único ovillo
     × monta EXACTAMENTE un ovillo en '/', y es el hero interactivo
     × deja vacío el slot de fondo del caparazón en '/'
 Test Files  2 failed (2)
      Tests  3 failed | 12 passed (15)
```

**Dirección B** — el caparazón no lo monta nunca:

```
     × hands the 3D layer to the shell as its background outside the Dashboard
     × mantiene el fondo global en cualquier otra ruta de (app)
 Test Files  2 failed (2)
      Tests  2 failed | 13 passed (15)
```

**Tercera sonda, mía, la que el encargo pedía de verdad:** inyecté un **segundo ovillo dentro
del propio hero**, que es el defecto que E1.2 prohíbe, sin tocar el caparazón:

```
     × monta EXACTAMENTE un ovillo en '/', y es el hero interactivo
AssertionError: expected [ <span …(2)></span>, …(1) ] to have a length of 1 but got 2
 Test Files  1 failed (1)
      Tests  1 failed | 4 passed (5)
```

**El gate cuenta de verdad.** Es `queryAllByTestId("ascii-yarn")` con `toHaveLength(1)`
(`dashboard-page.test.tsx:105-107`), no un singular disfrazado, y la línea siguiente exige
`data-interactive="true"`, que es lo que distingue el hero del fondo. Verifiqué que ese
atributo **existe en el componente real** y no sólo en el doble: `AsciiYarn.tsx:61` lo pinta,
y `:64` es quien decide si captura puntero.

Restaurado todo → `15 passed (15)`.

**No se importó `HOME_PATH` desde `src/proxy.ts`.** `AppShellClient.tsx:15` declara una
constante local `HERO_PATHS` con el motivo escrito. Correcto: traer el módulo del middleware
al grafo de un componente de cliente por una cadena de un carácter era el riesgo a evitar.

### 3.3 E2.3 — el guardrail ampliado, auditado a fondo

Éste lo miré con lupa porque reescribir un guardrail es la forma silenciosa de debilitarlo.

**La raíz cambió de verdad, y no perdió nada.** Reimplementé el recorrido del test en un
script aparte y lo medí:

```
sweep NOW (src/):              216
sweep BEFORE (src/shared/ui/):  55
old files lost from new sweep:   0  []
current offenders in src/:       0  []
```

- **216 archivos barridos ahora** contra **55** antes: la ampliación es real.
- **Cero archivos perdidos por el camino**: los 55 que ya vigilaba siguen dentro (`src/` es
  superconjunto estricto de `src/shared/ui/`).
- **Cero infractores preexistentes**, lo que confirma el §5 del informe: por eso **no hay
  allowlist ni exclusiones**, y no las hay tampoco "por si acaso". No hay ningún agujero con
  permiso que fichar.
- 216 menos los 13 fuentes nuevos de la slice = **203 preexistentes**, el número del informe.

**Las regexes no cambiaron.** Comparadas en el `git diff`: las tres líneas (`HEX_COLOR`,
`RGB_COLOR`, `PX_LITERAL`) **no aparecen en el diff**, es decir están byte a byte idénticas.
Tampoco cambió `collectComponentFiles` ni el `it` que impide que el barrido se meta en los
propios tests.

**El seguro anti-barrido-roto se amplió también**, que es la mitad que se olvida. El viejo
(más de 20 archivos, más las cuatro capas del design system) seguiría verde con la raíz
estrechada. El nuevo (`no-hardcode.test.ts:91-99`) ancla tres rutas que **sólo existen
fuera** de `shared/ui`.

**Inyecté hardcode a propósito en los dos sitios** (un hex y un valor en píxeles), en un
archivo **nuevo** y en uno **viejo**:

```
     × has no raw hex/rgb colors in features\dashboard\ui\DashboardView.tsx
     × has no raw px sizes in features\dashboard\ui\DashboardView.tsx
     × has no raw hex/rgb colors in shared\ui\primitives\button\Button.tsx
     × has no raw px sizes in shared\ui\primitives\button\Button.tsx
 Test Files  1 failed (1)
      Tests  4 failed | 432 passed (436)
```

**Enrojece en los dos.** Y la corrida más valiosa: con **el mismo hardcode puesto**, estreché
la raíz de vuelta a `src/shared/ui/`:

```
     × encuentra los fuentes de src/
     × llega a las cuatro capas del design system
     × llega también a la UI de features y a las páginas
     × has no raw hex/rgb colors in primitives\button\Button.tsx
     × has no raw px sizes in primitives\button\Button.tsx
AssertionError: expected 55 to be greater than 100
AssertionError: expected [ …(55) ] to include 'features\dashboard\ui\DashboardView.t…'
 Test Files  1 failed (1)
      Tests  5 failed | 109 passed (114)
```

Mide las dos cosas a la vez: con la raíz vieja el hardcode del archivo **nuevo deja de
existir como test** (sólo enrojece el de `Button.tsx`), o sea que **la ampliación es lo que
lo caza**; y el seguro **nuevo** cae, o sea que **la ampliación no se puede deshacer en
silencio**. Restaurado todo desde copia.

### 3.4 Unidades — verificado con mutación, no leyendo

Precedente de #16: un test que "protege" una conversión pero deriva del valor ya convertido
se mueve **con** el bug. Comprobé que aquí no pasa.

Mutación: quitar la conversión (pintar `metrics.hours` sin `secondsToHours`):

```
     × converts the hours metric from seconds
     × convierte las horas desde segundos
 Test Files  2 failed (2)
      Tests  2 failed | 40 passed (42)
```

Cae en **las dos capas** (la unitaria y la de pantalla), y cae porque el lado esperado es un
literal independiente mientras la entrada se construye desde `SECONDS_PER_HOUR`: el test
**no** puede moverse con el bug. Hay además gate negativo (`metrics-display.test.ts:43-48` y
`DashboardView.test.tsx:266-268`): los segundos crudos **no** pueden aparecer en pantalla.

`grep` sobre `features/dashboard/ui`: **ningún 3600 ni 60 escrito a mano** en código (las dos
únicas coincidencias son comentarios que dicen precisamente que no se escriba).
`SECONDS_PER_MINUTE` se añadió a `shared/config` con su ancla, y los minutos por hora se
**derivan** (`format.ts:36`) en vez de escribirse: no pueden desincronizarse. `ProjectCard`
usa `formatDuration`, que también sale de los puentes de config; su test comprueba además que
los segundos crudos no se pintan.

### 3.5 Serialización de fechas — el defecto más probable de la slice, y está resuelto

`ProjectRecord` declara `Date` pero el JSON entrega **string ISO**. Está resuelto con un tipo
de cliente **derivado** (`features/projects/ui/types.ts:22-29`, un `Omit` del tipo de dominio
más las cuatro fechas como `string`), que es la elección correcta: una columna nueva la
hereda, y si desaparece una fecha el `Omit` deja de compilar.

`sortProjects` **no llama a `.getTime()`** sobre el campo (verificado por grep: la única
mención de `getTime` en toda la slice está en los comentarios que advierten de ello). Parsea
con `Date.parse` y una fecha ilegible cuenta 0 en vez de propagar un `NaN`, que en un
comparador da orden distinto por motor.

Mutación: ordenar por `startDate` (el campo que el backend sí devuelve ordenado, o sea el
error más probable):

```
     × puts the most recently touched project first
     × reads the timestamp out of the ISO string it really receives
     × sends an unreadable date to the bottom instead of poisoning the order
     × ordena por actividad reciente y lo dice sin mentir
 Test Files  2 failed (2)
      Tests  4 failed | 38 passed (42)
```

El orden funciona **sobre strings**, y hay test que lo fija (`filters.test.ts:134-138` asierta
`typeof updatedAt === "string"` además del orden).

### 3.6 REGLA 4 — la medición contra servidor real, reproducida por mí

El informe afirma haberla hecho. **La rehíce entera** (`pnpm build` + `pnpm start -p 3199` +
`curl`), y da lo mismo.

**Sin sesión:**

```
=== GET / sin sesion ===
HTTP/1.1 307 Temporary Redirect
location: /login?next=%2F
=== GET /login ===
status=200
=== GET /proyectos sin sesion ===
HTTP/1.1 307 Temporary Redirect
location: /login?next=%2Fproyectos
```

**Con sesión** (token firmado por mí con el secreto que el servidor resuelve de verdad):

```
GET / con sesion -> status=200

=== / ===
HOSTS de ovillo: 1
   <div aria-hidden="true" data-slot="ascii-yarn" data-interactive="true" class="… pointer-events-auto">
slot bg-3d: <div aria-hidden="true" data-slot="bg-3d" class="pointer-events-none fixed inset-0 …"></div>

=== /login ===
HOSTS de ovillo: 1
   <div aria-hidden="true" data-slot="ascii-yarn" data-interactive="false" class="… pointer-events-none">
slot bg-3d: <div … data-slot="bg-3d" …><div … data-slot="ascii-yarn" data-interactive="false" …>
```

Marcadores presentes en el HTML servido de `/`: `Knit&amp;Crochet`, `Tu taller`,
`Proyectos en curso`, `Nuevo dos agujas`, `Nuevo crochet`, `Ordenar por`,
`Actividad reciente`, `Ver todos`, `Cargando tu resumen`, `role="status"`. Y la etiqueta
prohibida por E2.2 dio **`false`**: no aparece **tampoco en el render real**, no sólo en RTL.

**E1.2 confirmada contra el render real:** en `/` hay **un** host de ovillo, es el hero
(`data-interactive="true"`, y con captura de puntero), y el slot `bg-3d` del caparazón está
**vacío**; en `/login` el ovillo está **dentro** del slot y es decorativo. La afirmación del
informe §7 es cierta.

> **Aviso de método sobre mi propia sonda** (lo dejo escrito por el mismo motivo por el que lo
> dejó el implementer). Mis dos primeros intentos con sesión dieron **307** y luego **500**, y
> los dos eran míos: el primero porque firmé el token sin `sub`/`iss`/`aud`, que es lo que
> `verifySessionToken` exige (`jwt.ts:45-49,62-63`); el segundo porque puse un `sub` que no
> era un UUID y el layout reventó al buscarlo en Neon. Ninguno de los dos es un defecto del
> proxy ni de #19.
>
> **Hallazgo colateral con valor, y no es de #19:** el `JWT_SECRET` de `.env` local está
> **entre comillas y contiene un `$` seguido de caracteres**, y `@next/env` expande variables,
> así que lo que el servidor usa de verdad son **18 caracteres**, no los 24 escritos. Lo medí
> resolviéndolo con el mismo `loadEnvConfig` que usa Next: `len 18`. Es entorno local, no
> repo, pero explica de dónde salió la confusión que el implementer narra en su §7 y merece
> una nota para que no le vuelva a costar media hora a nadie.

---

## 4. Las ocho decisiones — veredicto una a una

| | Decisión | Estado | Evidencia |
|---|---|---|---|
| **E1.1** | `/` privada, sin fusionar allowlists, tests reescritos, gate positivo | **OK** | §3.1 |
| **E1.2** | El hero reemplaza al fondo global en `/`; nunca dos ovillos | **OK** | §3.2, §3.6 |
| **E1.3** | Hero no operable por teclado, documentado | **OK, pero ver B1** | abajo |
| **E1.4** | Formato de comparativa; `times<1` frase propia; `times=0` sin comparativa | **OK** | abajo |
| **E1.5** | Marca de "total histórico" en metros | **OK** | abajo |
| **E2.1** | Card en `projects/ui/`, sin quick-start ni slot especulativo | **OK** | abajo |
| **E2.2** | Orden por `updatedAt` descendente, etiqueta honesta | **OK** | §3.5 |
| **E2.3** | Guardrail ampliado a `src/` | **OK** | §3.3 |

**E1.3** — el "no lo arregles" está escrito y bien argumentado (`DashboardHero.tsx:15-20`):
`AsciiYarn` es siempre `aria-hidden` y su lienzo no es enfocable, así que `axe` pasa solo, y
el comentario explica que hacerlo enfocable obligaría a anunciarle un adorno a un lector de
pantalla. **La decisión está bien implementada y bien documentada.** Lo que falla es el
**párrafo siguiente**, el del breakpoint: ver **B1**.

**E1.4** — `formatComparison` (`metrics-display.ts:89-101`) tiene las tres ramas.
`times = 0` devuelve `null`, o sea **no se pinta comparativa**, confirmado en la pantalla
(`DashboardView.test.tsx:287-300`, que asierta que la etiqueta **no aparece**, no que aparezca
vacía). `times < 1` da frase propia. Un `times` no finito o negativo también cae en `null`,
que es más de lo que la enmienda pedía y es correcto. Mutación de las dos ramas especiales →
4 rojos, reproducido.

La decisión de concordar la palabra con el **número ya formateado** (1.04 se pinta como "1",
luego "vez") la declaró el implementer como suya, está en el JSDoc y tiene test
(`metrics-display.test.ts:84-92`). **La avalo:** no reabre la enmienda —no toca las etiquetas
de config, que es lo que E1.4 descartó— y evita exactamente el texto roto que la enmienda
salió a evitar. Y el test comprueba que la etiqueta se pinta **entera y sin tocar**, incluida
la que no tiene plural natural.

**E1.5** — `LIFETIME_METRIC_NOTE` más `isLifetimeMetric()`. El gate mide la pertenencia en
**las dos direcciones** (`DashboardView.test.tsx:303-314`): con metros visible hay
**exactamente una** marca; con horas y proyectos visibles hay **cero**. Es un
`queryAllByText` con longitud, no un `getByText`. Coherente además con el estado vacío, que
**excluye** los metros del cálculo por ser lifetime (`DashboardView.tsx:175-182`) — buena
captura.

**E2.1** — la card vive en `src/features/projects/ui/`, lleva foto, nombre, progreso y tiempo
y **nada más**. El gate negativo es en las dos direcciones de verdad
(`ProjectCard.test.tsx:112-117`: cero `button` **y** cero `link`), así que no se puede colar
ni un slot "preparado". Mutación (colar un botón de quick-start) → rojo, reproducido.
`progress` se pasa **directo** a `ProgressBar`, que declara escala 0-100
(`ProgressBar.tsx:11-13,41`), y hay test que lo fija contra un futuro "lo normalizo
dividiendo por 100".

---

## 5. Corrección técnica — el resto de los puntos frágiles

- **Asimetría de endpoints: respetada.** `getMetrics` consume el objeto **plano** y
  `getActiveProjects` desenvuelve **`{ projects }`** (`dashboard-client.ts:100-128`), con el
  motivo escrito. Los dobles del test responden con las dos formas distintas, así que la
  asimetría está ejercida, no supuesta.
- **Estados: los tres existen y son alcanzables.** Loading, vacío ("Todavía no tejiste nada
  en {año}") y error ("Se enredó la madeja" con reintento, y el reintento **vuelve a pedir**,
  comprobado). Los tres tienen test.
- **La carga se anuncia UNA vez.** `Skeleton` es `aria-hidden`, y la página tiene una única
  región viva (`DashboardView.tsx:190-192`, un `role="status"` visualmente oculto), más
  `aria-busy` en las listas. El test `456-466` comprueba que hay bloques de carga **y** que el
  anuncio es uno solo; el `settle()` de los demás tests espera a que esa región se vacíe, que
  es una forma limpia de no acoplarse al árbol concreto.
- **Primitivas, bien usadas.** `ProgressBar` con `label` obligatorio, y nombrado con el
  proyecto para que N tarjetas no repitan "Progreso". `ToggleGroup` con `label`. `Toggle`
  **controlado y superponible**: hay test que lo demuestra encendiendo las **tres** métricas a
  la vez (`DashboardView.test.tsx:235-246`) y otro que comprueba que volver a pulsar **apaga**
  — no es un `Tabs`, no contradice RFC-02 §1. `Dialog` recibe `title`, `description` e
  `initialFocusRef`, sin props sueltas; se monta y desmonta con el estado, así que cada
  apertura arranca limpia y devuelve el foco (probado).
- **El `afterEach` del bloqueo de scroll (deuda 101) está copiado**, en
  `DashboardView.test.tsx:175-186`, que es el único test de la slice que abre el modal. Y está
  bien hecho: **limpia antes de asertar**, para que un rojo no arrastre en cascada. Sin él, un
  modal que se fuera sin soltar el bloqueo contaminaría los siguientes con todo en verde.
- **`axe` en los componentes nuevos: sí, a mano y de sobra.** `ProjectCard.test.tsx:119-126`
  (con foto y sin foto) y `DashboardView.test.tsx:636-654` (**tres** estados: con datos, vacío
  y error). Como dice la **deuda 92**, nada lo obliga por gate: lo comprobé leyendo, y está.
- **Regla 1 — ninguna clase de Tailwind con comodín o inventada.** El build compila (una
  clase inválida lo rompería entero), `canonical-tailwind-classes.test.ts` barre todo `src/` y
  está verde, y `globals.css:15-19` excluye `progress/`, `docs/` y `template/` del escaneo, así
  que las citas de los informes no pueden llegar al CSS. Ver una nota menor en §6.
- **Foto decorativa (`alt=""`)**: bien argumentado (el nombre va justo debajo) y medido en los
  dos sitios: el atributo está vacío **y** no queda ningún rol de imagen que anunciar.
- **Etiqueta `img` en vez de `next/image`**: motivo escrito, `eslint-disable` acotado a esa
  línea, y `pnpm lint` sin warnings. De acuerdo: declarar `images.remotePatterns` es una
  decisión de la canalización de imágenes, no de una tarjeta.
- **`METRICS_YEAR_MIN`/`MAX` extraídos**: cero cambio de comportamiento, con **ancla**
  (`filters.test.ts:47-51`, los dos literales) y **derivación** en todo lo demás. Es el patrón
  correcto, y evita que la UI dé por bueno un año que el endpoint contesta con 400 — hay test
  de que además **no dispara ninguna petición** con un año fuera de rango.

---

## 6. Observaciones menores (NO bloquean)

1. **Número que no cuadra con su propia evidencia.** El informe §5 dice "El barrido pasa de
   **54** a **216** archivos". Medido: **55** a 216. Y la propia salida que el informe pega en
   §6.3 dice `expected 55 to be greater than 100` y `expected [ …(55) ]`. O sea, el texto
   contradice a la medición que él mismo adjunta. Es trivial en consecuencias, pero en este
   repo un número mal transcrito es el principio de la cadena que hay que cortar: **corregir a
   55** en el informe.
2. **Clase de Tailwind citada literalmente en prosa.** El informe §3 (E1.3) escribe una
   utilidad completa con su variante entre comillas. No rompe nada —`globals.css:17` excluye
   `progress/` del escaneo—, pero `conventions.md` pide describir la utilidad **en palabras**
   en la prosa, precisamente porque la excepción de `@source` es una defensa y no una licencia.
   El código fuente está limpio: `DashboardHero.tsx` menciona la variante y el token por
   separado, no la clase entera.
3. **Import cruzado por ruta interna.** `NewProjectDialog.tsx:5` importa
   `@/features/projects/validation` en vez de `@/features/projects`. **Es lo correcto** —el
   barrel arrastra `./api`, que llega al store y a Drizzle, y eso metería el ORM en el bundle
   del navegador—, pero `conventions.md` manda consumir otros features por su `index.ts` y esta
   excepción **no está escrita en el sitio del import** (sí lo está en los dos
   `features/<x>/ui/index.ts`, pero eso es otro archivo). Basta una línea de comentario ahí. El
   precedente que existe (`LoginForm.tsx:7`) es **del mismo feature**, no cruzado.
4. **`getActiveProjects` recibe `year` y no lo usa.** `DashboardQuery` lleva `year`, se lo pasa
   `DashboardView.tsx:117`, y `getActiveProjects` sólo manda `active` y `type`
   (`dashboard-client.ts:119-128`). Es **correcto** —el contrato de `/api/projects` no filtra
   por año—, pero el parámetro ignorado invita a creer lo contrario. O se documenta, o
   `getActiveProjects` toma sólo el tipo.
5. **El estado "vacío del año" exige además cero activos.** `isEmpty`
   (`DashboardView.tsx:178-182`) pide horas 0, proyectos 0 **y** lista vacía. Como los activos
   **no** se filtran por año (punto 4), quien tenga un proyecto activo viejo nunca verá
   "Todavía no tejiste nada en {año}". Es conservador y probablemente preferible a la
   alternativa, pero es una interpretación de RFC-02 §4 que no está escrita en ningún
   comentario.
6. **`SEE_ALL_CLASSES` se usa (línea 94) antes de declararse (línea 132)** en
   `ActiveProjectsPanel.tsx`. Legal —es una `const` de módulo y el uso ocurre en tiempo de
   render—, pero se lee mal. Subirla.
7. **`ProjectPhoto` concatena clases con template literal** (`ProjectCard.tsx:93,114`) en vez
   de `cn()`. No hay conflicto real hoy y el `className` que viene de fuera sí se fusiona vía
   `Card`, así que no es un defecto; queda como nota de homogeneidad.
8. **`current.md` tiene dos bloques "EN CURSO" de la misma feature.** Ver C2.

---

## 7. Deuda técnica nueva, para que el leader la fiche

Las **ocho** que propone el implementer en su §9 las revisé una a una y **todas son legítimas
y están bien descritas**. Las doy por buenas tal cual y no las repito. Añado las que salieron
de este review:

1. **Sólo UN par de breakpoints está atado por test; los otros tres no.**
   `archive-nav.tokens.test.ts:261` ata `--breakpoint-archive` con `--bp-archive`. Los pares
   `mobile`, `tablet` y `desktop` pueden desincronizarse **sin que nada avise** — medido: con
   `--breakpoint-tablet` movido a 900px la suite entera sale verde con exit 0. Es la raíz del
   bloqueante **B1** y afecta a todo el design system, no sólo al hero. **Si B1 se resuelve por
   la vía 1 cubriendo los cuatro pares, esta deuda nace saldada.**
2. **El `JWT_SECRET` de `.env` local se trunca solo.** Está entre comillas y contiene un `$`,
   y `@next/env` expande variables: 24 caracteres escritos, **18** usados. No es código del
   repo, pero cualquiera que monte una sonda contra el servidor real vuelve a tropezar.
   Arreglo: escapar el `$` o cambiar el secreto local. Conviene además una línea de aviso en
   `.env.example`.
3. **Un JWT válido con un `sub` que no es UUID devuelve 500 en `/`.** Verificado contra
   servidor real: `invalid input syntax for type uuid` sale de Neon y se propaga hasta el
   render. El token tiene que estar firmado con el secreto del servidor, así que no es
   explotable desde fuera; pero es una ruta a 500 sin `try` intermedio en la capa de auth
   (#31/#32), **no en #19**. Un `sub` mal formado debería tratarse como sesión inválida.
4. **La región viva del Dashboard es un `role="status"` anónimo.** Funciona y hay test, pero
   el helper `settle()` de tres archivos de test depende de que ese `status` sea **único** en
   la pantalla. En cuanto otra pieza monte un `status`, esos tests se vuelven ambiguos.
5. **`progress/history.md` va dos sesiones por detrás** (falta #33 `ui_primitives_2`). Ver C5.

---

## 8. Cambios requeridos

1. **[BLOQUEANTE]** Resolver **B1**: `src/features/dashboard/ui/DashboardHero.tsx:24-26`
   afirma que "un test de tokens los obliga a moverse juntos" refiriéndose a la variante
   responsive de tablet y al token `--bp-tablet`. **Ese test no existe** (el único que ata los
   dos namespaces es `archive-nav.tokens.test.ts:261`, y es del par `archive`), y lo demostré
   desincronizando los dos tokens en `globals.css`: la suite entera sale verde, exit 0. **O se
   escribe el test** —hermano del de `archive-nav`, preferiblemente para los cuatro pares, y
   verificado con condición doble— **o se corrige la frase** en el código y se ficha como
   deuda. En los dos casos, **corregir también `progress/reports/impl_dashboard_ui.md` §3
   (E1.3)**, que repite la afirmación.
2. Corregir en el informe §5 el "de 54 a 216" por **"de 55 a 216"** (su propia salida pegada
   en §6.3 dice 55).
3. Reescribir en prosa, sin citar la clase literal, la mención de la utilidad de Tailwind en
   el informe §3 (E1.3).
4. Una línea de comentario en `NewProjectDialog.tsx:5` explicando por qué el import de
   `@/features/projects/validation` va por ruta interna y no por el barrel.

Los puntos 2-4 son de higiene y pueden cerrarse en la misma pasada que el 1. **En cuanto B1
esté resuelto y `init.sh` siga verde, esto es un APROBADO**: el trabajo de fondo es sólido,
los gates son reales, los números que declara son ciertos y la medición contra servidor real
se sostiene punto por punto.

---
---

# Ronda 2 — verificación del arreglo de B1

**Veredicto: APROBADO**

**B1 está resuelto por la vía 1, y lo verifiqué yo, no lo di por bueno.** El test nuevo existe,
descubre los pares en vez de enumerarlos, **cae en los cuatro por separado**, y —lo que de
verdad importa— **no puede quedarse barriendo cero pares en silencio**: tiene su propio seguro
y lo comprobé rompiendo el descubrimiento a propósito.

La ronda 1 de arriba **queda tal cual**, como registro de lo que pasó.

---

## R2.0 — Qué cambió desde la ronda 1 (medido, no declarado)

Comparé el árbol contra mis copias byte a byte de la ronda 1. **Ningún fuente que ya existía se
tocó**:

```
src/proxy.ts:                                 OK
src/features/auth/ui/AppShellClient.tsx:      OK
src/shared/ui/no-hardcode.test.ts:            OK
src/features/dashboard/ui/DashboardView.tsx:  OK
src/features/dashboard/ui/filters.ts:         OK
src/features/dashboard/ui/metrics-display.ts: OK
src/app/globals.css:                          OK
```

Los únicos cambios de la ronda 2 son:

1. **`src/shared/ui/breakpoint-tokens.test.ts`** — archivo nuevo.
2. **`src/features/dashboard/ui/DashboardHero.tsx`** — sólo el comentario. Verificado filtrando
   las líneas de comentario y comparando el resto: **el código ejecutable es idéntico** al de la
   ronda 1.
3. **`src/features/dashboard/ui/NewProjectDialog.tsx`** — comentario del import añadido.
4. `progress/current.md` y `progress/reports/impl_dashboard_ui.md`.

**No hay arreglo colateral, ni "ya que estaba".** El diff de los 13 tracked pasa de 421 a 455
inserciones, y las 34 de diferencia están **todas en `progress/current.md`**, no en `src/`
(verificado con `git diff --numstat`).

---

## R2.1 — El test cae de verdad, en los CUATRO pares (encargo 1)

Baseline del archivo nuevo: **6 tests** (1 seguro + 1 igualdad de conjuntos + **4 pares**). Que
sean 6 y no 3 ya es la primera prueba de que el bucle genera un `it` por par.

Mutación **uno a uno**, moviendo el alias y dejando el token de lectura quieto (que es la
desincronización real), restaurando entre cada una:

```
--- MUTACION: --breakpoint-mobile 640px -> 900px (--bp-mobile sigue en 640px) ---
     × --breakpoint-mobile vale lo mismo que --bp-mobile
AssertionError: expected 900 to be 640 // Object.is equality
      Tests  1 failed | 5 passed (6)

--- MUTACION: --breakpoint-tablet 768px -> 900px (--bp-tablet sigue en 768px) ---
     × --breakpoint-tablet vale lo mismo que --bp-tablet
AssertionError: expected 900 to be 768 // Object.is equality
      Tests  1 failed | 5 passed (6)

--- MUTACION: --breakpoint-desktop 1180px -> 1300px (--bp-desktop sigue en 1180px) ---
     × --breakpoint-desktop vale lo mismo que --bp-desktop
AssertionError: expected 1300 to be 1180 // Object.is equality
      Tests  1 failed | 5 passed (6)

--- MUTACION: --breakpoint-archive 1180px -> 1300px (--bp-archive sigue en 1180px) ---
     × --breakpoint-archive vale lo mismo que --bp-archive
AssertionError: expected 1300 to be 1180 // Object.is equality
      Tests  1 failed | 5 passed (6)
```

**Los cuatro caen, y caen por separado**: en cada mutación falla **exactamente uno** y los otros
tres siguen verdes. No es un aserto agregado que se enciende por cualquier cosa; hay cuatro
invariantes independientes.

La mutación exacta de la ronda 1 (`--breakpoint-tablet` a 900px) que entonces dejaba la suite
entera en verde con exit 0, **ahora enrojece**. `globals.css` restaurado y verificado por
`md5sum` (`9aa85707662c00471d8a315c9fff7bfc`).

---

## R2.2 — El barrido NO puede quedarse vacío en silencio (encargo 2) — la comprobación decisiva

Es la que pedía el encargo y es la que yo mismo describí en §3.3: un guardrail por derivación
que descubre cero elementos **no ejecuta nada y sale verde**.

**El archivo tiene su propio seguro** (`breakpoint-tokens.test.ts:79-82`), y es del tipo
correcto: no cuenta "al menos N", sino que **ancla los cuatro nombres a mano**, en el único
sitio del archivo donde hay literales, con el motivo escrito ("en este `it` el literal ES el
inventario que se protege").

**Sonda B — rompí el descubrimiento a propósito** (metí `ZZZ` en la expresión, de modo que
`declaredSuffixes` devuelve la lista vacía en los dos namespaces, que es el caso de "dos listas
vacías iguales entre sí"):

```
     × encuentra los cuatro anchos declarados hoy, en los dos namespaces
Error: No test found in suite los dos juegos de breakpoints declaran el mismo ancho
AssertionError: expected [] to deeply equal [ Array(4) ]
 Test Files  1 failed (1)
      Tests  1 failed | 1 passed (2)
```

Léase con cuidado, porque confirma **las dos mitades**:

- El bucle de pares generó **cero tests** — el archivo pasa de 6 a 2, y vitest llega a quejarse
  de que la suite se quedó sin tests. **El peligro que describía el encargo es real y se
  materializó.**
- **Pero el seguro lo cazó**: rojo, `expected [] to deeply equal [ Array(4) ]`. El archivo entero
  falla. **No hay verde falso.**

**Sondas C y D — huérfanos, en las dos direcciones**, que es el otro modo de romperlo (borrar un
token de un namespace y no del otro):

```
### C: borrado --breakpoint-tablet; --bp-tablet sigue declarado
     × encuentra los cuatro anchos declarados hoy, en los dos namespaces
     × los dos namespaces declaran exactamente los mismos anchos
     × --breakpoint-tablet vale lo mismo que --bp-tablet
      Tests  3 failed | 3 passed (6)

### D: borrado --bp-tablet; --breakpoint-tablet sigue declarado
     × encuentra los cuatro anchos declarados hoy, en los dos namespaces
     × los dos namespaces declaran exactamente los mismos anchos
AssertionError: expected [ Array(4) ] to deeply equal [ 'archive', 'desktop', 'mobile' ]
      Tests  2 failed | 3 passed (5)
```

Cae en las dos direcciones, como promete su comentario: sobra un alias sin token de lectura, o
falta el alias de un token. En la sonda C cae además el par concreto, porque `length()` **lanza**
cuando el token no está declarado, en vez de devolver un `NaN` que se compararía en silencio —
detalle bien resuelto.

Todo restaurado; el test nuevo y `globals.css` verificados idénticos al original.

> **Efecto secundario del seguro, y es intencionado:** añadir un quinto breakpoint pondrá **rojo**
> el `it` del inventario hasta que se añada su nombre ahí. Es el mismo patrón de ancla que
> `filters.test.ts` usa con el rango de años, y es lo que hay que querer: obliga a mirar el
> guardrail cuando se toca lo que vigila. El comentario ya lo dice.

---

## R2.3 — Duplicación con `archive-nav.tokens.test.ts` (encargo 3): decidido, y NO se borra

El `it` viejo (`archive-nav.tokens.test.ts:257-262`) **sigue en su sitio** — el implementer no lo
tocó, que es lo que correspondía. El par `archive` queda cubierto **dos veces**.

**Mi decisión: se queda, y conviene que se quede.** No es redundancia gratuita:

- Ese archivo **usa** `--bp-archive` y `--bp-tablet` en sus propias cuentas de ancho de columna
  (`:264-272`). El invariante no es allí una regla general del design system: es **la premisa de
  una aritmética que vive en ese mismo archivo**. Si se borra el `it`, esas cuentas pasan a
  descansar sobre una garantía que vive en otro fichero, y quien lea `archive-nav.tokens.test.ts`
  ya no puede comprobar por qué son válidas sin salir de él.
- Su comentario dice la consecuencia **para el nav** ("el nav aparece a un ancho y la cuenta se
  hace con otro"), que es información que el guardrail general no puede dar.
- Cuesta un aserto y no puede desincronizarse del nuevo: los dos leen el mismo `globals.css`.

**Recomendación (no bloqueante, para el leader):** añadir una línea de referencia cruzada en el
`it` viejo apuntando a `breakpoint-tokens.test.ts`, para que nadie lo borre en el futuro
creyéndolo redundante. **Yo no lo edito.**

---

## R2.4 — La frase de `DashboardHero.tsx` ya es verdadera (encargo 4)

La afirmación falsa **desapareció**. El diff contra mi copia de la ronda 1 lo enseña:

```
- * condición de ancho en vez de quedarse como un agujero: la variante `tablet:`
- * y el token `--bp-tablet` comparten valor, y un test de tokens los obliga a
- * moverse juntos.
```

Y lo que hay ahora lo verifiqué **frase por frase**:

- "el hook lee `--bp-tablet` con `matchMedia` en runtime" → cierto,
  `useViewportSupports3d.ts:5,15`.
- "la variante responsive la genera `--breakpoint-tablet`, que tiene que ser un literal" →
  cierto, `globals.css:307` y su propio comentario `:302-305`.
- "Los ata `src/shared/ui/breakpoint-tokens.test.ts`, que compara los dos namespaces enteros par
  por par" → **cierto, y es lo que acabo de medir en R2.1 y R2.2.**
- "hasta entonces sólo el par `archive` estaba atado (`archive-nav.tokens.test.ts:257-262`)" →
  cierto, es exactamente lo que medí en la ronda 1.

Ninguna de las cuatro es una afirmación heredada por copia: las cuatro se sostienen contra el
archivo que citan. **Y el comentario ya no cita una clase de Tailwind literal**, que era la
observación menor nº 2 de la ronda 1 en su versión de código.

**El informe también se corrigió**, y bien: `impl_dashboard_ui.md` §3 (E1.3) no borró la frase
falsa en silencio, sino que dejó escrito **qué decía antes y por qué era falso**. Es la forma
correcta de corregir en este repo: un borrado limpio habría dejado al siguiente lector sin saber
que ahí hubo un error.

---

## R2.5 — Higiene (encargo 5)

| # | Pedido en la ronda 1 | Estado |
|---|---|---|
| 2 | "de 54 a 216" corregido a **55** | **Hecho en §5**, con nota de corrección. **Queda un residuo**: ver abajo. |
| 3 | Clase de Tailwind del informe §3, en prosa | **Hecho**, y de propina también en §9.7, que citaba otras dos. Barrí el informe entero buscando utilidades con variante: **cero coincidencias**. |
| 4 | Comentario del import en `NewProjectDialog.tsx` | **Hecho** (`:5-11`), y bien: explica que el barrel arrastra `./api`, que llega al store y a Drizzle, y añade el dato que lo cierra — que `validation.ts` sólo importa zod y `shared/config`, así que por esa puerta no entra nada de servidor. Comprobé además su cita a `progress/current.md`: la nota existe, línea 489. |

**Residuo, y es lo único que queda vivo de toda la revisión:** el informe corrigió el número en
**§5**, pero **`impl_dashboard_ui.md:44` (§0) sigue diciendo "de 54 a 216 archivos"**. O sea, el
informe ahora se contradice a sí mismo sobre el número que era objeto de la corrección.

**No bloqueo por esto**, y digo por qué para que la decisión sea auditable: en la ronda 1 marqué
los puntos 2-4 explícitamente como higiene, la corrección sustantiva está hecha y **visible**
(con nota de qué decía antes), el número correcto es comprobable en la propia salida pegada en
§6.3, y es un fichero de `progress/`, no código. **Es un cambio de un carácter que el leader puede
hacer él mismo** —`progress/` es suyo por CLAUDE.md— al escribir el informe de cierre. Devolver la
slice a una ronda 3 por un "54" sería teatro de proceso.

---

## R2.6 — Verificación final (encargo 6), ejecutada por mí

`bash ./init.sh`, redirigido a fichero, **sin tubería**:

```
[OK]    lint verde
[OK]    typecheck verde

 Test Files  69 passed | 3 skipped (72)
      Tests  1200 passed | 13 skipped (1213)

[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
EXIT=0
```

`pnpm build` — `EXIT=0`, `✓ Compiled successfully in 9.3s`.

**Delta contra la ronda 1 (`1194 passed | 13 skipped`, 68 archivos): +1 archivo y +6 tests
exactos**, que son justo los 6 del `breakpoint-tokens.test.ts`. **No se movió nada más**: ni un
test borrado, ni uno que cambiara de resultado. Es la firma de un arreglo quirúrgico.

---

## R2.7 — Estado y limpieza (encargo 7)

- **`feature_list.json` id 19: `in_progress`**, y es la **única** en ese estado. El implementer
  sigue sin marcarla `done`, que es lo correcto: la cierra el leader tras este veredicto.
- **Árbol limpio.** `md5sum -c` de todas mis copias: OK. El test nuevo, idéntico al entregado
  (`diff -q`). `git status --porcelain` no enseña ni un archivo que no sea del implementer. **No
  queda ni una mutación mía ni suya.**

---

## R2.8 — La deuda que ibas a fichar: CONFIRMADA COMO SALDADA

Me lo pediste explícitamente y te lo confirmo **con la medición detrás**, no de palabra:

> **Deuda nueva nº 1 de la ronda 1** — *"Sólo UN par de breakpoints está atado por test; los
> otros tres no."* → **SALDADA por #19**, con gate propio en
> `src/shared/ui/breakpoint-tokens.test.ts`.

Lo que sostiene la afirmación, y que puedes citar en el libro mayor:

1. Los **cuatro** pares tienen `it` propio y **caen por separado**, verificado con cuatro
   mutaciones independientes (R2.1). La mutación concreta que en la ronda 1 dejaba la suite en
   verde con exit 0 ahora enrojece.
2. La cobertura **no es una lista congelada**: se descubre leyendo los dos namespaces de
   `globals.css`, así que un quinto breakpoint queda cubierto solo.
3. El descubrimiento **no puede vaciarse en silencio**: con la expresión rota el bucle genera cero
   tests, pero el `it` de inventario pone el archivo en rojo (R2.2). **Ésta es la parte que no se
   puede dar por supuesta y por eso la medí.**
4. Cubre además dos fallos que la deuda original ni nombraba: los **huérfanos** en las dos
   direcciones (R2.2, sondas C y D).

O sea: **nace saldada, y saldada por encima de lo que la ficha pedía.**

---

## R2.9 — Checkpoints, estado final

- **C1: [x]** — `bash ./init.sh` exit 0, ejecutado por mí sin tubería (R2.6).
- **C2: [x]** — Una sola feature en `in_progress` (la 19). `current.md` describe la sesión activa.
  *(Sigue en pie la nota menor de la ronda 1: dos bloques "EN CURSO" de la misma feature; el
  leader los funde al cerrar.)*
- **C3: [x]** — Capas respetadas; la única duda de la ronda 1 (el import por ruta interna) está
  ahora **documentada en el sitio del import**. Sin `console.log`, sin TODOs, sin secretos, sin
  dependencias nuevas.
- **C4: [x]** — lint sin salida, typecheck verde, **1200 tests verdes**.
- **C5: [ ]** — ← Sigue igual y **sigue sin ser del implementer**: `progress/history.md` no tiene
  entrada por la sesión anterior cerrada (**#33 `ui_primitives_2`**); su última cabecera es
  `2026-08-05 — Feature #15`. Es lo único que impide marcar los cinco, y lo cierra el leader al
  escribir el informe de cierre de #19 (que además le toca añadir por esta sesión).

---

## Veredicto final

**APROBADO.** El bloqueante B1 está resuelto por la vía correcta —la que convierte la afirmación
en verdad en vez de borrarla—, el gate nuevo hace lo que dice **incluso cuando se le rompe el
descubrimiento**, el arreglo es quirúrgico (+6 tests y nada más se movió), y las tres correcciones
de higiene están hechas salvo un "54" residual en §0 del informe que el leader arregla de un
teclazo.

**Para el leader, al cerrar:**

1. Corregir `progress/reports/impl_dashboard_ui.md:44`: "de 54 a 216" por **"de 55 a 216"**.
2. Fichar la **deuda nº 1 de la ronda 1 como saldada**, citando R2.8.
3. Fichar como **vivas** las deudas 2, 3, 4 y 5 de la ronda 1 (el secreto de `.env` que se trunca
   solo; el 500 con un `sub` no-UUID; el `role="status"` anónimo; `history.md` atrasado), más las
   **ocho** del §9 del implementer, que revisé una a una y son legítimas.
4. Considerar la referencia cruzada de R2.3 en `archive-nav.tokens.test.ts:257`, para que nadie
   borre el `it` viejo creyéndolo redundante.
5. Escribir la entrada de `history.md` de esta sesión **y la que falta de #33** (C5).

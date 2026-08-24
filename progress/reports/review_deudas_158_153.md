# Review — lote de deudas 158 + 153

**Veredicto: CHANGES_REQUESTED** (2 bloqueantes; ninguno de los dos es un test rojo)

- `bash ./init.sh` -> **EXIT 0**, `Test Files 81 passed | 3 skipped (84)` ·
  `Tests 1424 passed | 13 skipped (1437)` · 104.95 s. Corrida por mí, **con la máquina libre y en
  serie** (deuda 145: ninguna corrida solapada en toda la sesión).
- **Aritmética comprobada, sin residuo:** 1404 (partida del lote) + 12 (T1-T3) + 3 (T6 a) + 5 (153)
  = **1424**; 1417 + 20 = **1437**; saltados **13** intactos; **84** archivos, ninguno creado.
  Coincide con lo que declara el implementer.
- `feature_list.json` **intacto** (`git diff` vacío). `globals.css` restaurado tras **9 mutaciones**
  de medición: md5 `eed29f5373e3748adb94497902633b0a`, idéntico al de partida. Los dos archivos de
  sonda que escribí para medir están **borrados**; `git status` sólo lista lo del lote.

---

## Checkpoints

- **C1:** [x] arnés completo, `init.sh` EXIT 0.
- **C2:** [x] 0 features `in_progress`, `feature_list.json` sin tocar (no son features),
  `current.md` describe la sesión activa. *Observación menor O-5: la tabla "Estado del lote"
  (`progress/current.md:47-48`) sigue diciendo "Deuda 158 lanzado / Deuda 153 pendiente" mientras la
  bitácora de más abajo ya da las dos por hechas.*
- **C3:** [x] arquitectura respetada. `dashboard-client.ts` sigue siendo el único que habla con el
  BFF; `DashboardView.tsx` no toca DB ni Drizzle; el cambio de tipos (`TypeQuery` /
  `DashboardQuery`) no cruza ninguna capa; los gates son tests de `shared/ui`. Sin `console.log`,
  sin TODOs sin contexto, sin secretos.
- **C4:** [ ] <- lint y typecheck verdes y suite verde, **pero** el ancla principal de E4 (c) monta
  un escenario que producción **no puede producir** (bloqueante 1) y el eje visible del cambio de UI
  **queda sin verificar** (ver sección UI).
- **C5:** [x] sin artefactos sospechosos sin trackear (los `impl_*.md` y este informe son los
  esperados).

---

# Parte 1 — Deuda 158

## P1. ¿Los tres gates se ponen ROJOS de verdad? — SÍ, medido sobre el `globals.css` REAL

Mutaciones aplicadas **en disco** sobre el archivo real, una por corrida, restaurando entre medias:

| # | mutación en `src/app/globals.css` | gate | resultado medido |
|---|---|---|---|
| M1 | `--breakpoint-desktop: 1180` (el caso rojo de la ficha) | `breakpoint-tokens` | **1 failed \| 8 passed (9)** — cae el `it` REAL `--breakpoint-desktop vale lo mismo que --bp-desktop` |
| M2 | `--breakpoint-desktop: 1180em` | `breakpoint-tokens` | **1 failed \| 8 passed (9)**, mismo `it` real |
| M4 | `--leading-tight: 1.1px` (error **simétrico**) | `archive-nav.tokens` | **2 failed \| 25 passed (27)** — caen los dos `it` reales del wordmark (E7) |
| M5 | `--touch-target: 44em` | `account-band.tokens` | **6 failed \| 7 passed (13)** — caen `it` con nombre, ya no "Tests no tests" |
| M6 | `--content-max-inline` sacado de `@theme` y metido en `@media (min-width: 5000px)` | `app-shell.classes` | **6 failed \| 11 passed (17)**, cinco de ellos `it` reales |

**El caso peor tiene ahora quien lo cace:** con `--breakpoint-desktop: 1180` el gate cae y el mensaje
nombra el desenlace ("la media query es inválida y se descarta entera"). En la partida del lote esa
misma mutación dejaba la suite entera en verde.

**T6 (b) verificado aparte:** el rojo de `account-band` sale como `it` nombrado (M5), no como error
de carga. La forma perezosa memorizada cumple el objetivo que el `beforeAll` no cumplía.

## P2. ¿Tokens DESCUBIERTOS o lista fija? — descubiertos de verdad, medido

Añadí un **par de tokens nuevo** al CSS real que nadie había enumerado en ningún sitio:

```
--bp-wall: 1600;
--breakpoint-wall: 1600;
```

Resultado: el gate pasa de 9 a **10 tests** él solo (genera el `it` del par nuevo) y ese `it` cae con
el mensaje de unidad:

```
× --breakpoint-wall vale lo mismo que --bp-wall
  Error: El breakpoint --breakpoint-wall vale "1600", que no es una longitud absoluta en píxeles...
× encuentra los cuatro anchos declarados hoy, en los dos namespaces   (el ancla de inventario)
Tests 2 failed | 8 passed (10)
```

Nadie tuvo que apuntar el token nuevo en ninguna lista. **No es la deuda 40/43/71 otra vez.** El
inventario escrito a mano (los cuatro sufijos) también cae, que es su función: obliga a que un
breakpoint nuevo pase por revisión humana en vez de colarse.

En `account-band` y `archive-nav` el descubrimiento lo hacen los propios lectores
(`LENGTH_TOKENS_READ` / `UNITLESS_TOKENS_READ`) y el control positivo itera esa foto: mismo patrón,
consistente con M4/M5.

## P3. La partición de `archive-nav`: ¿queda alguna longitud en el lado permisivo? — NO

Inventario completo del lado `unitless` (grep sobre el archivo, no muestreo):

```
:148  integer() -> unitless()       (envoltorio)
:269  unitless("--leading-tight")   proporción de interlineado
:292  unitless("--leading-tight")   idem
:359  integer("--z-nav-leaf-1..6")  profundidad de apilamiento
:372  integer("--z-nav-band")       profundidad de apilamiento
```

Son **exactamente** los dos tipos que `isAbsolutePxLength` excluye por escrito. **Ninguna longitud
quedó del lado permisivo**, y el lado permisivo no es permisivo: exige número sin unidad y M4
demuestra que un `1.1px` lo pone en rojo. Aquí no se esconde el siguiente B2.

## P4. T6 — `isDeclared()` / `tokenValue()` / `tokenLength()` contra el compilado

- **Token en una condición:** cazado (M6, medido en disco; antes de T6 esa misma mutación daba
  `14 passed` y la suite entera `1416 passed`).
- **Token bajo un selector que no es la raíz:** cazado por el control positivo del propio archivo
  (`[data-t158-alcance]` -> `undeclaredCapTokens` devuelve `[--content-max-inline]`).
- **¿Sigue verde con el CSS bueno?** Sí: 17 passed dentro de los 1424 de `init.sh`.
- **`tokenLength()`** pasa por `tokenValue()`, así que queda cubierto de rebote: correcto.
- **`declarationsOf()` compara `declaration.prop !== property` por IGUALDAD**, no por subcadena: la
  protección contra el bloqueante **B1** de E13 se conserva y deja de depender de una frontera
  escrita a mano. `@layer` se excluye de `conditions` (una capa ordena, no condiciona) y cualquier
  otra regla-arroba cuenta: conservador en la dirección correcta (falso rojo, nunca falso verde).

**Flanco nuevo que sí introduce, sin medir (honesto):** `tokenValue()` se queda con `.at(-1)`, "la
última gana". Eso es la cascada **sólo dentro de la misma capa**: una declaración **sin capa** gana a
una declarada en `@layer`, esté antes o después en el texto. Hoy `globals.css` no tiene el token en
ninguna capa, así que no hay defecto activo; lo dejo apuntado porque el día que lo tenga, `.at(-1)`
leería el valor equivocado. **No lo he medido.**

---

# Hallazgo del review — el VERDE FALSO que sobrevive a la 158 (medido)

**No paré en el primer hallazgo, como se pidió.** Los tres gates de texto siguen leyendo el
`globals.css` con una regex de línea y **se quedan con la PRIMERA aparición** del token, mientras el
navegador aplica **la última** y respeta el ámbito. T6 arregló eso **sólo en `app-shell`**. Medición:

**Mutación A — la cascada gana la última declaración.** Añadido al final de `globals.css`:

```css
:root {
  --nav-height: 104;      /* sin unidad: height: var(...) inválido -> el cajón pierde su alto */
  --touch-target: 44em;   /* la pestaña pasa de 44px a ~704px */
}
```

```
pnpm vitest run archive-nav.tokens account-band.tokens ->  Tests 40 passed (40)
pnpm vitest run   (LA SUITE ENTERA)                    ->  Tests 1424 passed | 13 skipped (1437)
```

**La suite completa en verde con el archivero roto en pantalla.** Es literalmente el desenlace del
bloqueante B2, por la puerta del ámbito en vez de la del valor.

**Mutación B — el token de lectura fuera de la raíz.** `--bp-tablet` sacado de `@theme` y declarado
sólo dentro de `@media (min-width: 5000px)`:

```
pnpm vitest run breakpoint-tokens archive-nav.tokens -> Tests 36 passed (36)
```

Consecuencia real, no hipotética: `useViewportSupports3d.ts:12-18` lee `--bp-tablet` con
`getComputedStyle`; si no está, **falla abierto** y monta three.js en **todos los móviles** — se
pierde exactamente la degradación que el SDD §7 ordena. Con la variante en `em` pasa lo contrario:
la media query no casa nunca y el ovillo no se monta en ninguna pantalla. Los dos silenciosos, los
dos con la suite verde.

Residuo menor de la misma familia: `account-band.tokens.test.ts:63` conserva su `isDeclared()` de
regex (usado como filtro de roles de color en `:198`; impacto bajo, misma ceguera).

**Por qué no lo cargo contra el implementer:** el leader acotó T6 a `app-shell` de forma explícita
("NO se toca la (A)"). Pero **sí impide cerrar la 158 diciendo que los gates ya no dan verde falso**:
la pieza para arreglarlo (`declarationsOf`) ya existe y son ~20 líneas por gate. Ver bloqueante 2.

---

# Parte 2 — Deuda 153 (enmienda E4)

*No reabro (a) ni (d): reviso cumplimiento, no acierto.*

## P6. E4 (a) — ¿la petición emitida lleva `year`? NO. Medido sobre la petición, no sobre la firma

Sonda propia (montada, año movido y tipo marcado; borrada después):

```
/api/dashboard/metrics?year=2026
/api/projects?active=true
/api/dashboard/metrics?year=2025               <- tras "Año anterior"
/api/projects?active=true                      <- SIN year
/api/dashboard/metrics?year=2025&type=crochet
/api/projects?active=true&type=crochet         <- SIN year, CON type
```

`year` no aparece en ninguna petición a `/api/projects`: ni al montar, ni tras mover el año, ni con
filtro de tipo. El filtro de **tipo** sí viaja, como manda E4.

## P8. `getMetrics` — no se rompió el lado que SÍ necesita `year`

Las tres peticiones de métricas llevan `year=`, incluida la del año movido y la combinada con `type`.
La partición `TypeQuery` / `DashboardQuery = TypeQuery & { year }` mantiene el tipo exportado con el
mismo nombre y forma; typecheck verde. **Con dientes:** pasarle `year` a `getActiveProjects` ya no
compila.

## P7. E4 (d) — `showActiveProjects` en los bordes

`showActiveProjects = !isEmpty || (data?.projects.length ?? 0) > 0` (`DashboardView.tsx:209`):

| escenario | resultado | ¿correcto? |
|---|---|---|
| año vacío **con** activos | vacío + panel de en curso | sí, E4 (d) |
| año vacío **sin** activos | vacío solo, sin región "Proyectos en curso" | sí |
| año con datos | métricas + activos (aunque la lista esté vacía, como antes) | sí |
| error | la rama de error sustituye a todo, como antes | sí |
| cargando (`data === null`) | `isEmpty` es `false` -> los dos paneles con bloques de carga | sí |
| **cambio de año con datos viejos en pantalla** | ver O-1: **la única esquina que chirría** | ojo |

El `?.` de la expresión está bien justificado (TS no estrecha `data` a partir de un booleano
derivado).

## P5. ¿Algún test nuevo pasa SÓLO por el doble? -> **SÍ. Bloqueante 1.**

---

# Bloqueantes

## Bloqueante 1 — REGLA 7: el ancla de E4 (c) monta un estado que producción NO puede producir

**Dónde:** `src/features/dashboard/ui/DashboardView.test.tsx`, los dos tests que sostienen la deuda:
`da el año por vacío aunque quede un proyecto vivo de otro año` y
`el vacío del año NO esconde el proyecto que sigue en curso`. Los dos montan
`metricsBody({ hours: 0, projects: 0, yarnMeters: 500 })` + `projects: [ALFOMBRA]`.

**Por qué pasa sólo por el doble.** `ALFOMBRA` hereda del fixture `project()`
(`DashboardView.test.tsx:74-96`) el campo `startDate: "2026-01-01T00:00:00.000Z"`, y `CURRENT_YEAR`
es **2026** (`new Date().getFullYear()`, hoy 2026-08-24). Producción calcula `metrics.projects` así
(`src/features/dashboard/api/store.ts:83-95`, `countProjects`, leído en esta revisión):

> *"Iniciado O terminado en el año"*: cuenta las filas del usuario con
> `startDate` en `[year-01-01, (year+1)-01-01)` **o** `endDate` en esa misma ventana.

Un proyecto con `startDate` 2026-01-01 **entra en la cuenta de 2026**. Luego, para el año que el test
mira, producción devolvería `metrics.projects >= 1` y el estado vacío **no saldría**. El doble
devuelve `projects: 0` igualmente porque el `fetch` está mockeado y nadie ata las dos respuestas
entre sí. Sin filtro de tipo puesto —el test no marca ninguno, así que `type` es `undefined` y no
recorta nada— no hay escapatoria: **el estado asertado es imposible en producción**.

**Por qué es bloqueante y no una pega de estilo.** Es exactamente el pecado que esta deuda vino a
saldar. El test viejo del vacío estuvo verde sobre `projects: []` —algo que producción nunca produce
si hay un proyecto abierto— y por eso el estado siguió **inalcanzable** durante meses. El test nuevo
sustituye ese escenario imposible por **otro escenario imposible**, y encima su propio comentario
afirma lo contrario: *"Métricas del año en cero **con** `projects: [ALFOMBRA]`, que es lo que
producción sí produce (REGLA 7...)"*. El informe lo repite en `impl_deuda_153.md:86-90`. Un ancla que
documenta un estado que la base de datos no puede emitir no protege el camino que dice proteger.

**El escenario que producción SÍ produce y el test NO cubre.** Proyecto empezado el **2025-03-01**,
`endDate: null`, todavía en las agujas; el usuario mira **2026** sin haber registrado tiempo ni
abierto ni cerrado nada este año: `sumHours` -> 0, `countProjects` -> 0 (no empezó ni terminó en
2026), y `GET /api/projects?active=true` -> `[ALFOMBRA]` porque la lista de activos **no se filtra
por año** (E4 a). Ése es el caso real de E4 (b)+(d), y es el que debería estar escrito en el fixture.

**Qué NO está mal, para no exagerar el hallazgo.** El comportamiento verificado es el correcto y las
aserciones son las buenas: `DashboardView` no lee `startDate` para nada, así que con el fixture
arreglado los dos tests siguen pasando y siguen siendo rojo-antes/verde-después. Lo que falla es la
**verosimilitud del escenario**, que es justo lo que la REGLA 7 exige y lo que este lote presume de
haber arreglado.

**Vía de arreglo (una línea, sin cambiar comportamiento):** dar a ese proyecto un `startDate` de un
año **anterior** al que se mira, derivado de `CURRENT_YEAR` en vez de congelado en 2026 —hoy el
fixture depende del reloj: el 1 de enero de 2027 estos tests cambian de significado solos, sin que
nadie toque nada—, con `endDate: null`. Y reescribir el comentario para que describa el escenario que
de verdad se monta.

**Etiqueta de verificación:** el defecto está **medido por lectura del código de producción**
(`countProjects` y el fixture), no ejecutando la consulta contra la base. No he corrido el arreglo
—la máquina queda quieta por orden del coordinador—, así que la afirmación "con el fixture arreglado
los dos tests siguen verdes" es **razonada, no ejecutada**.

## Bloqueante 2 (de CIERRE, decide el leader) — la 158 no puede cerrarse como "los gates ya no dan verde falso"

Medido en este review (mutaciones A y B de la sección anterior): la suite **entera** queda en
`1424 passed | 13 skipped` con `--nav-height: 104` y `--touch-target: 44em` **vigentes en el
navegador**, y `40 passed` / `36 passed` en los gates concretos con el archivero y el breakpoint de
lectura rotos. La 158 saldó la lectura del **valor**; el **ámbito y la cascada** siguen abiertos en
los tres gates de texto, con la pieza para arreglarlo (`declarationsOf`, escrita y probada en este
mismo lote) ya disponible.

Salidas aceptables, cualquiera de las dos:

1. Extender el camino de T6 a los tres gates (leer del compilado; ~20 líneas por gate), o
2. cerrar la 158 **declarando el residuo por escrito** y abriendo ficha nueva con esta medición.

Lo que no vale es cerrarla en silencio: el informe del implementer dice *"no queda ninguna lectura
permisiva suelta"*, y eso es cierto **del valor** y falso **del ámbito**.

---

# UI — el cambio toca pantalla (`DashboardView`)

**Declaración obligatoria: el eje visible quedó SIN VERIFICAR.** No tengo navegador en esta sesión;
los 1424 tests en verde **no miden cómo se ve**. La composición que E4 (d) inventa —el **panel de
vacío y el de "Proyectos en curso" uno encima del otro**— no la ha mirado nadie todavía: ni el
implementer (lo dice en `impl_deuda_153.md:179-194`) ni yo. **REGLA 4 pendiente**, y no la doy por
buena por omisión.

Lo que sí puedo contestar:

- **¿Jerarquía visual, o todo pesa lo mismo?** **Sin verificar.** `EmptyState` es un `StatePanel`
  `tone="neutral"` y `ActiveProjectsPanel` es un panel de contenido: dos superficies claras del mismo
  peso apiladas sobre el fondo espresso, la de arriba diciendo que no hay nada y la de abajo
  enseñando un proyecto. Que el vacío no pese **más** que el contenido real es justo lo que hay que
  mirar en pantalla.
- **¿Dos controles con comportamiento distinto renderizados igual?** El lote **no toca controles**:
  no añade ni cambia ninguna primitiva. Sin hallazgos de la familia de la deuda 142.
- **¿Alguna decisión visual justificada por el coste del arnés?** **No.** Revisé los dos informes: no
  hay ni una frase del tipo "no creé la pieza porque tocaría public-api.test.ts". El implementer se
  abstuvo de cambiar la copia del vacío **porque E4 dice que §4 no cambia de texto** —respetar la
  especificación, no esquivar un gate— y **fichó el problema** en vez de arreglarlo por su cuenta.
  Conducta correcta.
- **¿Toda acción con efecto tiene feedback VISIBLE?** **Aquí hay un problema medido: O-1.**

## O-1 (deuda nueva, MEDIDA con sonda propia) — el vacío se re-rotula con el año nuevo antes de saber nada, y sin un solo aviso visible

Sonda (año en curso vacío y sin activos, año anterior CON datos, respuesta retenida a propósito):

1. Pantalla en `Todavía no tejiste nada en 2026`.
2. Clic en "Año anterior".
3. **Con la respuesta de 2025 todavía en vuelo**, la pantalla afirma **`Todavía no tejiste nada en
   2025`** — un año que tiene 40 horas. El título sale de `year` (nuevo) y la condición de `data`
   (viejo: `DashboardView.tsx:117-119` deja sobrevivir los datos anteriores a propósito).
4. Feedback de carga durante ese rato: **cero visible**. Medido en el DOM: el único `role="status"`
   lleva `sr-only` (`DashboardView.tsx:217-219`) y **no hay ni un solo bloque de carga**
   (cero nodos `aria-hidden`), porque en la rama del vacío no se monta ningún panel con `loading`.
   Es la **deuda 137** en estado puro: para quien mira, indistinguible de un botón roto.
5. Al llegar la respuesta, la pantalla se desdice sola.

**Honestidad sobre la autoría:** esto **no lo introduce este lote**. Antes de E4 el vacío también se
alcanzaba con `projects: []`, así que la esquina ya existía. Lo que cambia es que E4 pone el vacío
**en el camino principal**. Matiz importante: cuando **hay** activos, el `ActiveProjectsPanel` sí
pinta sus bloques de carga, así que el caso sin feedback es el del **vacío puro**.

**No lo vuelco a `progress/deudas.md`** (lo ficha el leader). Arreglo sugerido: que la rama del vacío
no se pinte mientras `loading` sea `true` con datos de otra clave, o que muestre el mismo bloque de
carga que el panel al que sustituye.

---

# Observaciones (no bloquean)

- **O-2 — El vacío nuevo no pasa por `axe` en su composición nueva.** El test de accesibilidad
  (`DashboardView.test.tsx:769-787`) corre `axe` sobre *con datos*, *vacía con `projects: []`* y
  *error*: nunca sobre **vacío + proyectos en curso**, que es la única disposición que E4 (d)
  inventa. El informe da a entender que sí (`impl_deuda_153.md:188-190`). **Lo medí con una sonda: la
  composición nueva pasa `axe` sin violaciones**, así que es un hueco de cobertura, no un defecto —
  pero conviene añadir esa variante al test que ya existe.
- **O-3 — La especificación quedó partida por la mitad.** En `docs/design/rfc/RFC-02-dashboard.md` el
  bloque **E4 (d)** se insertó **dentro de una frase** de "Lo que E4 NO cambia": la frase arranca en
  la línea 208 y su final aparece en la 225, con la sección E4 (d) entera en medio. La spec del 153
  se lee rota. Es del leader, no del implementer, pero hay que arreglarlo antes de cerrar.
- **O-4 — `archive-nav`: el control positivo depende del ORDEN de los `describe`.** Los tokens se
  descubren mientras corren los `it`, así que la cobertura del bloque de control depende de que siga
  siendo el último del archivo. El implementer lo declara y razona que nunca es falsamente verde
  (comparto el análisis: como mucho vigila de menos, y el primer `it` impide medir aire). Queda
  frágil ante un reordenado futuro; `account-band` no tiene el problema porque fuerza la derivación.
- **O-5 — `progress/current.md:47-48`:** la tabla de estado del lote contradice a la bitácora de más
  abajo. Cosmético, pero es el archivo que lee la sesión siguiente.
- **O-6 — Petición redundante a `/api/projects`.** Confirmo la deuda B que el implementer ficha:
  medido, **3 peticiones a `/api/projects`** en mi sonda, dos de ellas con **la misma URL**
  (`?active=true`) por haber movido el año. Coste bajo, y hoy compra frescura; su arreglo (efecto
  propio) duplica la máquina de "estar cargando". Correctamente diferido.

---

# Lo que este review NO cubre (para que nadie lo dé por cubierto)

- **Cómo se ve la pantalla.** REGLA 4 pendiente: nadie ha mirado el vacío junto al panel de
  proyectos. Ningún gate del repo mide ese eje (deuda 141).
- **El flanco `@layer` de `tokenValue()`** (`.at(-1)` frente a la precedencia de capas): razonado,
  **no medido**.
- **El arreglo del bloqueante 1**: razonado sobre el código de producción, **no ejecutado**.
- La corrección de las decisiones de producto **(a)** y **(d)** de E4: fuera de mi encargo por orden
  expresa.

---

# Veredicto

**RECHAZADO (CHANGES_REQUESTED).** No por tests rojos —`bash ./init.sh` da **EXIT 0** con
`1424 passed | 13 skipped (1437)` y la aritmética cierra sin residuo— sino por un ancla que mide un
estado imposible y por un cierre que no puede escribirse como está.

## Bloqueantes (numerados)

1. **REGLA 7 en el ancla de E4 (c).** `DashboardView.test.tsx`: el proyecto activo de los dos tests
   del vacío tiene `startDate` **en el mismo año** que se mira, y con eso `countProjects`
   (`store.ts:83-95`) daría `metrics.projects >= 1` en producción: el escenario asertado no existe.
   Arreglo: `startDate` de un año anterior, derivado de `CURRENT_YEAR` y no congelado en 2026, y
   corregir el comentario que afirma que ése es el estado que produce producción.
2. **Cierre de la 158.** No puede cerrarse como "los gates ya no dan verde falso": medido, la suite
   entera sigue verde con `--nav-height: 104` y `--touch-target: 44em` vigentes en el navegador, y
   con `--bp-tablet` declarado sólo bajo una condición inalcanzable. O se extiende `declarationsOf`
   a los tres gates de texto, o se cierra declarando el residuo y abriendo ficha nueva con esta
   medición.

## Recomendados (baratos, no bloquean)

3. Añadir la variante *vacío + proyectos en curso* al test de `axe` que ya existe (O-2) y arreglar la
   frase partida del RFC (O-3).

## Para fichar (lo hace el leader, no yo)

4. **O-1** como deuda nueva (el vacío re-rotulado con el año nuevo mientras carga, sin feedback
   visible; deuda 137 otra vez), con la medición de este informe. Y la tabla de `current.md` (O-5).

**Lo que está bien y no hay que tocar:** los tres gates de la 158 se ponen rojos de verdad, en las
cuatro direcciones, con tokens **descubiertos** y sobre el CSS **real**; la partición
`length`/`unitless` de `archive-nav` es correcta y no deja ninguna longitud sin vigilar; T6 cierra la
mitad hermana por la vía buena (preguntar al compilado, comparar por igualdad) con control positivo
en las dos direcciones; E4 (a)(b)(d) está aplicada y **verificada sobre las peticiones emitidas**, no
sobre las firmas.

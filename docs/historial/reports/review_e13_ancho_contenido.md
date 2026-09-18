# Review — enmienda E13 de RFC-01 (+ E3 de RFC-02), deuda 154

**Veredicto:** CHANGES_REQUESTED

> Un bloqueante, **medido por mí y no leído**: el gate de E13(d) da **VERDE con el
> tope de ancho apuntando a un token que no existe**. Todo lo demás de la tanda
> está bien y está comprobado (init verde medido, aritmética cerrada, cero
> hardcodes, alcance respetado, `feature_list.json` intacto).

## Checkpoints

- **C1: [x]** — Archivos base y los 3 docs existen. `bash ./init.sh` **EXIT 0 medido por mí**:
  `Test Files 81 passed | 3 skipped (84)` · `Tests 1400 passed | 13 skipped (1413)`.
  Coincide **exacto** con lo que reporta §9 del implementer.
- **C2: [x]** — `feature_list.json` **NO se tocó** (`git diff --stat -- feature_list.json` vacío;
  0 features en `in_progress`, 33 features). `progress/current.md` describe la tanda en curso y no
  arrastra basura de sesiones anteriores.
- **C3: [x]** — Todo el cambio vive en `src/shared/ui` y `src/features/dashboard/ui`. No hay acceso a
  datos, ni Route Handlers, ni lógica de negocio movida. Feature-first respetado. Sin dependencias
  nuevas, sin console.log, sin TODOs, sin secretos. La pieza compartida
  `src/shared/ui/testing/class-names-from-source.ts` está en la capa correcta y **no** se exporta por
  el barrel (bien: es utilería de test).
- **C4: [ ]** ← Razón: los tres boxes literales pasan (lint, typecheck y suite verdes, y cada módulo
  nuevo tiene test), pero **la verificación NO es real justo donde esta tanda dice que lo es**.
  E13(d) exige que el gate llegue al CSS compilado y compruebe que el tope aplica **ese** token;
  `src/shared/ui/layout/app-shell/app-shell.classes.test.ts:200` lo compara **por subcadena**, y con
  el token mal escrito el gate sale **verde**. Medición reproducida abajo.
- **C5: [x]** — No hay archivos sospechosos ni artefactos. `progress/history.md` tiene la entrada de
  la última sesión cerrada; la de esta tanda la escribe el leader al cerrar, y todavía no cierra.

---

## BLOQUEANTE — B1. El gate de E13(d) sale verde con el tope apuntando a la nada

**Qué mide mal.** `src/shared/ui/layout/app-shell/app-shell.classes.test.ts:193-217`, el test que su
propio comentario llama *"el corazón del gate"*, filtra así:

```ts
declaration.property === MAX_WIDTH &&
declaration.value.includes(CONTENT_MAX)   // <- línea 200, comparación por SUBCADENA
```

`CONTENT_MAX` es la cadena `--content-max-inline`. La comparación **no tiene frontera de fin de
nombre**, o sea exactamente la **deuda 146-A** otra vez, sólo que aplicada al **valor de la
declaración** en vez de al selector. El propio helper que este archivo consume **sí** tiene la
frontera (`class-names-from-source.ts:76-91`, `selectorPattern`), y el gate la tira a la basura tres
líneas más abajo al comparar el valor a mano.

**Medido, no razonado.** Mutación aplicada sobre copia de seguridad y revertida (hashes md5
verificados antes y después; árbol de trabajo idéntico al de partida).

`AppShell.tsx` pasa a `mx-auto w-full max-w-(--content-max-inlinee)` (una `e` de más; el token
`--content-max-inlinee` **no existe en ningún sitio**):

```
$ npx vitest run src/shared/ui/layout/app-shell/app-shell.classes.test.ts src/shared/ui/layout/layout.test.tsx
 Test Files  2 passed (2)
      Tests  44 passed (44)
```

**VERDE.** Y con una sonda propia (archivo mío, `zz-reviewer-probe.test.ts`, ya borrado) se ve por
qué, imprimiendo lo que el gate está leyendo del CSS compilado:

```
"max-w-(--content-max-inlinee) => var(--content-max-inlinee)"
```

El valor `var(--content-max-inlinee)` **contiene** la subcadena `--content-max-inline`, así que el
filtro lo da por bueno. En el navegador, `max-width: var(--content-max-inlinee)` con la variable sin
declarar es **inválido en tiempo de valor computado**: `max-width` cae a su valor inicial (`none`) y
**no hay tope ninguno**. Es decir: la pantalla queda **exactamente en el defecto que E13 vino a
arreglar**, la deuda 154 sin cerrar, y la suite entera en verde. Misma clase de fallo que el lote
anterior (verde con una clase inerte), un archivo más allá.

**Y el segundo cinturón tiene el mismo agujero, no otro.** `src/shared/ui/layout/layout.test.tsx:66`
busca el contenedor con `name.includes("--content-max-inline")` sobre la `classList`. Por eso en la
corrida de arriba **tampoco cayó**: las dos redes fallan por la misma costura, que es justo lo que el
comentario de `writtenClassAttributes` en `class-names-from-source.ts:181-193` declara prohibido
(*"una segunda red que falla donde falla la primera no es una segunda red"*).

**Por qué el control positivo C3 del implementer no lo vio.** Su errata fue en la dirección que **sí**
cae. Comprobadas las dos:

| mutación del token dentro de la utilidad de tope | valor compilado | gate |
|---|---|---|
| `--content-max-inlin` (recortado) | `var(--content-max-inlin)` | **ROJO** (1 failed \| 11 passed) |
| `--content-max-inlinee` (alargado) | `var(--content-max-inlinee)` | **VERDE** (12 passed) |

O sea: el gate caza el prefijo y **no** caza el sufijo. El informe §8/C3 afirma que ese test *"lo caza
… leyendo el valor de la declaración compilada"* — lo lee, pero **no lo compara entero**, así que la
afirmación del informe promete más de lo que el código sostiene.

**Cómo se arregla** (no lo hago yo):

1. En `app-shell.classes.test.ts:200`, comparar el valor **exacto** contra `var(--content-max-inline)`
   o, si hace falta admitir un valor de reserva, con una frontera de fin de nombre igual que la de
   `selectorPattern`. Lo natural es **subir esa comparación al helper compartido** (algo tipo
   `usesToken(value, token)`), porque los tres consumidores la van a querer y ése era justamente el
   argumento para mover la pieza.
2. En `layout.test.tsx:66`, dejar de comparar por subcadena con el mismo criterio.
3. **Control positivo obligatorio de la corrección, en las DOS direcciones**: token recortado y token
   alargado, los dos en rojo, con salida real.
4. Conviene además comprobar que el token **está declarado** en `globals.css` *y* que la utilidad lo
   consume: es la pinza que cierra la clase entera de fallo, no sólo este caso.

---

## Lo que SÍ verifiqué por mi cuenta y está bien

Corridas mías, con mutación y reversión. No es lectura del informe.

| control | resultado medido |
|---|---|
| **Borrar el contenedor de contenido** (se quita el `div` y se deja `{children}` pelado, **dejando la constante viva**: más duro que borrarlo todo) | **ROJO por 3 tests**: `layout.test.tsx > mete el contenido en la columna acotada` + los dos de `app-shell.classes.test.ts`. `Tests 3 failed \| 41 passed (44)`. **El requisito explícito del encargo se cumple: ya no se puede borrar el contenedor y salir verde.** |
| **Frontera de nombre de CLASE** (utilidad recortada a prefijo de una real, `mx-aut`) | **ROJO**: `expected [ 'mx-aut' ] to deeply equal []` más el de centrado. La frontera de la deuda 146 sobrevivió a la mudanza. |
| **Trampa E12(b)** (`grid-cols-2 max-tablet:grid-cols-1`, columna escrita para desaparecer hacia abajo) | **ROJO por 2**: `max-tablet:grid-cols-1: expected 1 to be 2` y `las columnas extra viven en una condición de ancho MÍNIMO`. `2 failed \| 16 passed (18)`. |
| **Tope movido a un número sin derivación** (1040 → 1200) | **ROJO**: `expected 1200 to be 1040`. |

Y por lectura contrastada con el árbol:

- **Cero valores hardcodeados (E13 a).** El tope es el token `--content-max-inline: 1040px`
  (`globals.css:179`) con su derivación escrita al lado (`globals.css:146-178`); `AppShell.tsx:15-16`
  no tiene ni un número. La derivación la **rehace el test** desde `--space-4`, `--space-6` y
  `--space-1`, no la copia. Verificado además que la premisa es cierta: el relleno lateral de página
  es `p-(--space-6)` (`DashboardView.tsx:195`).
- **Alcance respetado.** `ProjectsToolbar.tsx:118` **no se tocó** (no aparece en `git status`), la
  **deuda 153** sigue intacta (ningún cambio de lógica en `isEmpty` ni en `getActiveProjects`), y
  `feature_list.json` está intacto.
- **Aritmética de tests, cuadrada por mí.** 78/1349 → 81/1400 = **+3 archivos, +51 tests**, sin
  residuo: nuevos 12 (`app-shell.classes`, contado en mi corrida) + 18 (`dashboard-ui.classes`,
  contado en mi corrida) + 10 (`field.variants`) = 40; modificados +4 (`DashboardView`) +2 (`Field`)
  +1 (`layout`, corroborado: 12 + 32 = 44 en mi corrida conjunta) = 47; más +4 que genera solo
  `no-hardcode.test.ts` (2 tests por fuente x 2 fuentes nuevos: `field.variants.ts` y
  `class-names-from-source.ts`). 47 + 4 = 51.
- **La técnica NO se copió de `segmented-control.tokens.test.ts`** (que arrastra el defecto de la
  deuda 149): se movió la buena, la de `projects-ui.classes.test.ts`. Comprobado título por título que
  el gate de `/proyectos` conserva **los mismos 9 tests** y sigue verde.
- **"El template es un SUELO" respetado.** Ninguna decisión visual está justificada por el coste del
  arnés: en vez de encoger la pantalla se creó `field.variants.ts` con el tono `inverse`. El argumento
  de §11.4 para no exportar `fieldLabelVariants` / `fieldMessageVariants` por el barrel **es válido**:
  verificado que `toggle/index.ts` y `segmented-control/index.ts` tampoco exportan sus `cva`, y la
  pieza pública (`Field` y su prop `tone`) sí es pública. No es esconder la pieza para esquivar
  `public-api.test.ts`.
- **`Card` fuera de los controles (E13 c).** El stepper de año y el selector de orden salen de la
  tarjeta; las 3 `Card` que quedan (`MetricsPanel.tsx:151` tarjeta de métrica, `MetricsPanel.tsx:188`
  su silueta de carga, `ActiveProjectsPanel.tsx:155` silueta de tarjeta de proyecto) son **contenido**,
  que es lo que E13(c) permite.
- **Deuda fichada, no escondida.** 155, 156 y 157 declaradas en `progress/deudas.md`, incluidas las
  dos que nacen de la propia decisión (desalineación caparazón/contenido y el tope sin ver).

---

## Cambios requeridos

1. **(BLOQUEANTE)** Cerrar B1: `app-shell.classes.test.ts:200` y `layout.test.tsx:66` comparan el
   token **por subcadena**. Comparar con frontera de nombre (o por valor exacto), preferiblemente
   subiendo el ayudante al helper compartido, y **demostrarlo con control positivo en las dos
   direcciones** (token recortado y token alargado), con salida real del rojo.
2. **Corregir el comentario que promete lo que el código no sostiene** — el bloqueante de ronda 2 del
   lote anterior fue exactamente esto. `dashboard-ui.classes.test.ts:41-42` dice *"queda exactamente
   uno en estos archivos, el de la silueta de carga de la tarjeta de proyecto"*, y el docstring de
   `ALLOWED_CARDS` (`:73-81`) razona *"y por qué **uno**"*. **Quedan tres**, y el propio
   `ALLOWED_CARDS` lo dice: `MetricsPanel.tsx: 2`, `ActiveProjectsPanel.tsx: 1`. El número exacto por
   archivo está bien elegido; lo que está mal es la prosa que lo explica.
3. **Corregir el recuento en `progress/current.md`**: dice *"los **siete** controles positivos"* y el
   informe §8 lista **nueve**. Es un dato que el próximo agente va a leer como cierto.
4. **Ajustar la afirmación del informe §8/C3.** Tal y como está escrita (*"lo caza el aserto que lee el
   valor de la declaración compilada"*) es falsa en la mitad de los casos; que quede dicho que el
   control se corrió sólo en la dirección que falla.

## Observaciones no bloqueantes (para el leader, no para esta ronda)

- **`text-danger-inverse` no lo cubre ningún gate de CSS compilado.** `field.variants.test.ts` mide el
  **contraste de los tokens**, que es otra cosa: si mañana alguien renombra el alias
  `--color-danger-inverse`, la utilidad deja de emitir regla y el mensaje de error se queda sin color
  con todo verde. `field.variants.ts` sería el octavo archivo, barato de sumar al gate compartido
  (deuda 150).
- **El `320` de la derivación vive sólo en el test** (`app-shell.classes.test.ts:115`), no como token.
  Está justificado en prosa citando E11(b), pero nada ata los dos sitios: si E11(b) cambia, la
  derivación no se entera.
- **La cobertura de la deuda 150 pasa de 3 a 7 archivos** y la técnica deja de ser copiable a mano.
  Es una mejora real de esta tanda y conviene registrarla al cerrar.

## Lo que este review NO juzga

**El eje visible.** No tengo navegador: no afirmo que la pantalla se vea bien ni mal, y **el aspecto
queda sin verificar** en este informe, no aprobado por omisión. Lo mide el leader por REGLA 4. En
particular quedan sin ver: el valor 1040px (deuda 156), la desalineación caparazón/contenido por
encima del tope (deuda 155) y el tono de `--danger-inverse` (deuda 157). No apruebo ni rechazo por
ninguno de esos tres.

## Nota de método

Todas las mediciones son corridas propias sobre mutaciones que yo introduje y revertí; **no se editó
código del implementer**. Copias de seguridad fuera del repo, hashes md5 comprobados antes y después,
y `git status` idéntico al de partida al terminar. El archivo de sonda que escribí
(`src/shared/ui/layout/app-shell/zz-reviewer-probe.test.ts`) está borrado.

---
---

# Review — ronda 2 (re-review de E13)

**Veredicto de la ronda 2:** CHANGES_REQUESTED

> **B1 está CERRADO y verificado por mí**, incluido el caso exacto que salía verde en la ronda 1.
> Las tres correcciones de registro están hechas. Las tres afirmaciones que el coordinador me pidió
> comprobar son **ciertas**, y una de ellas la demostré en la dirección que el implementer **no**
> corrió. Bloqueo por **una cuarta vía nueva que busqué a propósito y encontré**: la suite **entera**
> (1403 tests) sale verde con el tope **sin efecto en el navegador**.

## Checkpoints (ronda 2)

- **C1: [x]** — `bash ./init.sh` **EXIT 0 medido por mí**:
  `Test Files 81 passed | 3 skipped (84)` · `Tests 1403 passed | 13 skipped (1416)`.
  Coincide con lo que reporta §15.5 y con la medición del coordinador.
- **C2: [x]** — `feature_list.json` sigue intacto; `progress/current.md` al día.
- **C3: [x]** — Sin cambios de arquitectura. El módulo nuevo `src/shared/ui/testing/css-tokens.ts`
  está en la capa correcta y no se exporta por ningún barrel de producción.
- **C4: [ ]** ← Razón: **B2**, abajo. El agujero de la ronda 1 está tapado, pero encontré otro por el
  que el tope no llega al navegador con **todos** los gates en verde. Medido sobre la suite completa.
- **C5: [x]** — Sin artefactos ni archivos sospechosos.

## B1 — CERRADO. Medido por mí, no heredado

Mutación `AppShell.tsx` → `mx-auto w-full max-w-(--content-max-inlinee)`, que es **el caso exacto que
en la ronda 1 salía `44 passed`**:

```
 FAIL  layout.test.tsx > mete el contenido en la columna acotada del caparazón
 FAIL  app-shell.classes.test.ts > una clase del caparazón acota el ancho con el token, y sin condición
 FAIL  app-shell.classes.test.ts > ningún tope del caparazón apunta a un token que no exista
AssertionError: estos tokens los usa un tope del caparazón y NO están declarados en globals.css: … expected [ '--content-max-inlinee' ] to deeply equal []
 Test Files  2 failed (2)
      Tests  3 failed | 42 passed (45)
```

**ROJO por 3**, cifra idéntica a la que reporta §15. Y el **segundo cinturón cae también**
(`layout.test.tsx`), o sea que dejó de compartir costura con el primero — que era la mitad más grave
del hallazgo de la ronda 1.

### La justificación del módulo aparte es CIERTA, y la reexportación no crea dos caminos

Lo comprobé porque el coordinador lo pidió explícitamente:

- `class-names-from-source.ts:1-6` importa **en el nivel de módulo** `@tailwindcss/postcss`, `postcss`
  y `typescript`. Cualquier import desde ese archivo arrastra los tres, aunque sólo se quiera una
  función de texto. La justificación de no hacérselo pagar a un test de DOM **es real**, no una excusa.
- `css-tokens.ts` **no tiene ni un `import`**: es texto puro.
- `class-names-from-source.ts:107` es `export { tokensIn, usesToken } from "./css-tokens";` — una
  **reexportación pura**, no una copia. `app-shell.classes.test.ts` la consume por ahí y
  `layout.test.tsx:7` la consume directa: **dos importadores, una sola implementación**. No hay dos
  caminos que puedan divergir; para que divergieran habría que duplicar el cuerpo, y no está duplicado.

### La pinza NO es decoración, y lo demuestro en la dirección que él no corrió

El implementer probó **una** mitad de la no-redundancia (B1-c): token que existe pero es el
equivocado. Lo reproduje y da lo que dice:

```
mx-auto w-full max-w-(--auth-inset-inline)
 FAIL  layout.test.tsx > mete el contenido en la columna acotada del caparazón
 FAIL  app-shell.classes.test.ts > una clase del caparazón acota el ancho con el token, y sin condición
      Tests  2 failed | 43 passed (45)      <- cae identidad, NO cae la pinza
```

Pero eso solo no prueba que la pinza aporte: prueba que el de identidad aporta. **Corrí la dirección
que falta**, que es la que decide la pregunta del coordinador — dejar el token bueno **y añadir un
segundo tope con un token inexistente**:

```
mx-auto w-full max-w-(--content-max-inline) max-w-(--tope-que-no-existe)
 FAIL  app-shell.classes.test.ts > ningún tope del caparazón apunta a un token que no exista
AssertionError: … expected [ '--tope-que-no-existe' ] to deeply equal []
      Tests  1 failed | 44 passed (45)      <- cae SOLO la pinza
```

**La pinza dispara sola.** El de identidad pasa (el token bueno sigue ahí), el de DOM pasa, y sólo la
pinza ve que hay un segundo tope apuntando a la nada — que en el navegador es una carrera de cascada
que puede dejar el elemento **sin tope**. Cada aserto caza algo que el otro no: **son complementarios
en las dos direcciones, comprobado**. No es decoración.

Verificado además que la pinza **no duplica un gate que ya existía**: `src/app/globals-css.test.ts:60`
(*"no contiene ningún `var(--…*)` inválido"*) sólo busca la firma con asterisco de un bug viejo; **nada
en el repo comprobaba que un token referenciado estuviera declarado**.

## Correcciones de registro — las tres, verificadas

| punto | estado |
|---|---|
| Prosa de las `Card` en `dashboard-ui.classes.test.ts` | **OK.** Reescrita en los **dos** sitios (cabecera `:40-44` y docstring de `ALLOWED_CARDS` `:76-90`): ahora dice **tres**, las nombra una por una y enuncia la frontera como *"contenido sí, control no"*, que es la de E13(c). **Ni un número tocado**: `ALLOWED_CARDS` sigue `MetricsPanel 2 / DashboardView 0 / ActiveProjectsPanel 1`, idéntico a la ronda 1. |
| `progress/current.md` | **OK y cuadra.** Dice *"los **doce** controles positivos … (nueve de la ronda 1, tres de la ronda 2)"*. Contado contra el informe: §8 lista C1-C9 = **9**, §15 lista B1-a/b/c = **3**. 9 + 3 = 12. |
| Afirmación de §8/C3 | **OK.** Corregida **en su sitio**, con marca `⚠️ CORRECCIÓN DE LA RONDA 2`, y **sin borrar** el texto viejo, que queda legible con su desmentido al lado. |

## Aritmética de la ronda 2, contada por mí

1400 → **1403**, +0 archivos. Cuadra sin residuo y con medición propia, no con la tabla de él:

- `app-shell.classes.test.ts` **12 → 13** (+1, la pinza). Lo verifico por diferencia en mis propias
  corridas conjuntas: ronda 1 daba **44** en (`app-shell` + `layout`), ronda 2 da **45**, y
  `layout.test.tsx` sigue en 32 (se le cambió el criterio de comparación, no se le añadió test).
- `no-hardcode.test.ts` **+2**: genera 2 tests por fuente y `css-tokens.ts` es un fuente nuevo.
- 1 + 2 = **3**. Y **+0 archivos de test**, porque `css-tokens.ts` es utilería, no un `*.test.ts`.

---

## BLOQUEANTE B2 (la cuarta vía, buscada a propósito) — la suite ENTERA sale verde con el tope sin efecto

El coordinador pidió seguir buscando después de que el implementer cerrara la anterior, que es como
aparecieron dos de las cuatro vías de la deuda 146. Apareció una.

**El agujero: los gates comprueban el NOMBRE del token hasta el último carácter, y no comprueban NADA
del valor que ese token tiene.** `tokenLength()` (`app-shell.classes.test.ts:93-100`) lee el valor con
`Number.parseFloat`, que **descarta el sufijo en silencio**: para él `1040`, `1040px` y `1040em` son el
mismo número, y la derivación cuadra con los tres.

**Medido, no razonado.** Única mutación: quitarle la unidad al token en `globals.css:179`, que es el
typo natural al editar esa línea.

```
--content-max-inline: 1040;     (sin unidad)

$ npx vitest run          # LA SUITE COMPLETA, no dos archivos
 Test Files  81 passed | 3 skipped (84)
      Tests  1403 passed | 13 skipped (1416)
```

**1403 en verde.** En el navegador, `max-width: 1040` **no es una longitud válida** (un `<length>`
necesita unidad salvo el cero): la declaración es inválida en tiempo de valor computado, `max-width`
cae a su valor inicial `none` y **no hay tope ninguno**. Es exactamente el mismo desenlace que B1 —la
pantalla en el defecto que E13 vino a arreglar, la deuda 154 abierta y nadie avisando—, por otra
puerta.

Y no es un caso aislado de la unidad ausente, es **la unidad entera sin comprobar**:

```
--content-max-inline: 1040em;   -> Tests  45 passed (45)   (gates del caparazón, verde)
```

1040em son ~16.640px: tope nominalmente presente, **efectivamente inexistente**. Verde igual.

**Por qué esto no es teórico.** La **deuda 156** —fichada por el propio implementer— dice que el valor
se eligió sin ver la pantalla y que corregirlo es *"una línea de `globals.css`"*. O sea que esa línea
exacta **está planificada para editarse** en cuanto el leader haga su REGLA 4. El gate que debería
proteger esa edición es el único que no la mira.

**Cómo se cierra** (barato, y no toca arquitectura):

1. En `tokenValue`/`tokenLength` de `app-shell.classes.test.ts`, exigir que el valor **case con una
   longitud absoluta**, p. ej. `/^\d+(?:\.\d+)?px$/`, y fallar con mensaje propio si no. Alternativa
   equivalente y más directa: en el test de la derivación, comparar el **valor crudo** contra
   `${esperado}px` en vez del número suelto.
2. **Control positivo en las tres direcciones**, con salida real: sin unidad (`1040`), con unidad
   equivocada (`1040em`) y con valor no numérico (`nope` — este último ya cae hoy, porque
   `parseFloat` da `NaN` y `tokenLength` lanza; conviene dejarlo escrito para que se vea el reparto).
3. Como el `tokenLength` es genérico, la comprobación protege de paso a `--space-*` y `--bp-tablet`,
   que alimentan la misma derivación.

## Límite residual que NO bloqueo, pero que conviene saber

`isDeclared()` (`app-shell.classes.test.ts:89-91`) comprueba que el token aparezca declarado **en el
texto** de `globals.css`, no que esté declarado en un **ámbito que aplique**. Un token movido dentro
de una regla condicional seguiría contando como declarado y el tope no existiría por debajo de esa
condición. **Esto lo deduje leyendo el regex, no lo medí**, y lo dejo como límite conocido y no como
defecto: la mutación es rebuscada y no tiene el precedente de plausibilidad que sí tiene B2.

## Cambios requeridos (ronda 2)

1. **(BLOQUEANTE)** Cerrar **B2**: validar la **unidad** del valor del token, no sólo su nombre, con
   control positivo en las tres direcciones y salida real del rojo. Todo lo demás de la ronda 2 está
   bien y no hay que volver a tocarlo.

*(Nota para el leader, no para el implementer: B2 no es una regresión de la ronda 2 —el agujero ya
estaba en la ronda 1, debajo de B1— y su coste de cierre es un puñado de líneas en un archivo de test.
Si preferís cerrar la tanda ya y ficharlo como deuda con la medición de arriba pegada, es una decisión
tuya y defendible; lo que no me parece defendible es dejarlo sin escribir en ningún sitio.)*

## Lo que este review sigue sin juzgar

**El eje visible**, igual que en la ronda 1: no tengo navegador y **el aspecto queda sin verificar**,
no aprobado por omisión. Las deudas **155**, **156** y **157** quedan para tu REGLA 4 y no son motivo
de bloqueo mío. La **153** y la `Card` de `ProjectsToolbar.tsx:118` siguen fuera de alcance y
**verificado que siguen sin tocarse**.

## Nota de método (ronda 2)

Cinco mutaciones propias, todas revertidas: token alargado, token existente-pero-otro, tope bueno más
tope inexistente, token sin unidad y token con unidad equivocada. Copias de seguridad fuera del repo;
md5 de `AppShell.tsx` (`7e158bcc3429b9e7330c86b45521126c`) y de `globals.css`
(`eed29f5373e3748adb94497902633b0a`) comprobados idénticos antes y después. **No se editó código del
implementer.** La corrida de la suite completa con el token sin unidad está en
`init_run2.log` / `full_unitless.log` del scratchpad de esta sesión.

---
---

# Review — ronda 3 (re-review de E13)

**Veredicto de la ronda 3:** APPROVED

> **B2 está cerrado y lo verifiqué sobre la SUITE COMPLETA**, que es como lo medí verde en la ronda 2:
> de `1403 passed` a `4 failed`. El barrido de subcadenas que declara es **cierto y lo reproduje por
> dos vías**. La pregunta de las dos capas tiene respuesta y **no es la que él escribió**, pero no es
> bloqueante. Y sobre la deuda 158 traigo una **medición**, no una opinión: su argumento de alcance
> vale para dos de los tres gates y **no** para el tercero.

## Checkpoints (ronda 3)

- **C1: [x]** — `bash ./init.sh` **EXIT 0 medido por mí**:
  `Test Files 81 passed | 3 skipped (84)` · `Tests 1404 passed | 13 skipped (1417)`. Coincide con §16.5.
- **C2: [x]** — `feature_list.json` intacto; `progress/current.md` al día.
- **C3: [x]** — Sin cambios de arquitectura; la ronda es de gate y de registro.
- **C4: [x]** — Lint, typecheck y suite verdes, y esta vez **la verificación es real donde la tanda
  dice que lo es**: los tres agujeros que encontré (B1, B2 y la mitad de la no-redundancia) están
  medidos en rojo.
- **C5: [x]** — Sin artefactos. Árbol idéntico al de partida tras mis mutaciones.

## B2 — CERRADO. Medido sobre la suite completa

Mutación única, `globals.css:179` → `--content-max-inline: 1040;` (sin unidad). Es **exactamente** el
estado que en la ronda 2 me dio `Tests 1403 passed`:

```
$ npx vitest run          # SUITE COMPLETA
 FAIL  app-shell.classes.test.ts > … > cuadra con las tres columnas de tarjeta a su ancho máximo
 FAIL  app-shell.classes.test.ts > … > el tope se declara con unidad de longitud, no con un número pelado
 FAIL  app-shell.classes.test.ts > … > cae exacto en la rejilla de espaciado de la app
 FAIL  app-shell.classes.test.ts > … > no muerde por debajo del ancho de tablet
 Test Files  1 failed | 80 passed | 3 skipped (84)
      Tests  4 failed | 1400 passed | 13 skipped (1417)
```

**De 1403 verdes a 4 rojos con el mismo carácter borrado.** Cifra idéntica a la de §16.3. El
bloqueante está cerrado.

Y **B2-d reproducido** (`--space-4: 16`), que era el punto 3 de mi ronda 2 —que el comprobador
genérico protegiera de paso a los tokens de la derivación—:

```
 FAIL  app-shell.classes.test.ts > … > cuadra con las tres columnas de tarjeta a su ancho máximo
      Tests  1 failed | 13 passed (14)
```

## Las dos capas: la respuesta es NO son simétricas, y no es la que dice el informe

Me lo preguntaste explícitamente, así que lo mido y lo contesto sin adornos.

**Capa A** = la comprobación dentro de `tokenLength()`. **Capa B** = el test con nombre *"el tope se
declara con unidad de longitud…"*.

- **A dispara sin B: SÍ, medido.** Con `--space-4: 16`, cae la derivación por la excepción de A y el
  test B **pasa** (`1 failed | 13 passed`, y el 13 incluye a B). A cubre `--space-1/4/6`,
  `--bp-tablet` y el tope; B cubre **sólo** el tope.
- **B dispara sin A: es IMPOSIBLE, y no hace falta medirlo porque se demuestra leyendo.** Los dos
  evalúan `isAbsolutePxLength(tokenValue(CONTENT_MAX))`, y `tokenLength(CONTENT_MAX)` se llama en
  **tres** tests hermanos del mismo archivo. No existe valor del token que ponga rojo a B y verde a A.
  B2-a lo confirma: los cuatro caen **juntos**, B nunca sola.

**O sea: A ⊃ B en detección.** B no añade ni un caso; añade **un rojo con nombre en el listado**, que
para la deuda 156 —que planifica editar esa línea— es un beneficio real y cuesta un test.

**Lo que no sostiene el código es la ANALOGÍA.** El comentario de la derivación dice *"para que la
protección no dependa de un solo punto"* y §16.2 lo vende como *"misma lógica que la pinza de B1"*.
No es la misma lógica: de la pinza yo **medí una mutación en la que dispara sola** (ronda 2, tope
bueno + tope inexistente, `1 failed | 44 passed`); de B **no existe** esa mutación. La tabla de §16.2
sí describe bien el reparto —A todos los tokens de la derivación, B el tope con nombre—; es la frase
de al lado la que promete simetría donde hay contención.

**No bloqueo por esto:** la capa es barata, honesta en la tabla, y su valor declarado —diagnóstico
nombrado para una edición ya planificada— es legítimo. Es una frase a ajustar si algún día se toca el
archivo, no un defecto de verificación.

## El barrido de subcadenas: CIERTO, verificado por dos vías independientes

Pediste que lo comprobara porque, si es cierto, cierra la clase entera. **Lo es.**

**Vía 1 — comparación de subcadena con un nombre de token literal.** Cero resultados en todo `src/**`:

```
$ grep -rn '\(includes\|indexOf\|startsWith\|endsWith\)([`"'"'"']--' src --include=*.ts --include=*.tsx
(sin resultados)
```

**Vía 2 — toda búsqueda de un token dentro de `globals.css`, una por una.** Las nueve que hay se
construyen con el nombre **seguido de sus dos puntos**, que es una frontera de fin de nombre exacta
(un nombre más largo no puede colarse, porque `\s*` no consume letras):

`app-shell.classes.test.ts:75,91` · `account-band.tokens.test.ts:51,61` · `archive-nav.tokens.test.ts:39`
· `breakpoint-tokens.test.ts:54` · `button.variants.test.ts:189` · `dialog.portal.tokens.test.ts:71` ·
`field.variants.test.ts:52` · `yarn-host-responsive.test.ts:335`.

Y el único consumo de un token en **código de producción**
(`useViewportSupports3d.ts:15`, `getPropertyValue("--bp-tablet")`) es una lectura exacta por API, no
una búsqueda de texto.

**Conclusión: B1 estaba sólo en sus dos sitios y está cerrado. La clase queda cerrada** y conviene
que quede escrito, que es lo que pedías. **Matiz que no cambia la conclusión pero no hay que
confundir:** siguen existiendo comparaciones por subcadena de **nombres de CLASE** en
`segmented-control.tokens.test.ts` (`:244,254,272,280,293,296,311`) — eso es la **deuda 149**, ya
fichada, es otra familia y sigue fuera de alcance.

---

## Deuda 158 — tu pregunta de alcance, MEDIDA. Su argumento vale para dos de los tres

Pediste medición y no intuición, así que muté un token de cada familia. **El resultado no es
uniforme, y por eso su respuesta de "los tres son iguales, van a deuda" no me vale entera.**

### Primero, una buena noticia que él no reclama: `--bp-tablet` ya quedó cubierto

```
--bp-tablet: 768        (sin unidad)
 FAIL  app-shell.classes.test.ts > … > no muerde por debajo del ancho de tablet
 Test Files  1 failed | 1 passed (2)      <- breakpoint-tokens.test.ts pasa; lo caza el gate de E13
      Tests  1 failed | 19 passed (20)
```

El comprobador genérico de esta ronda **cubre de rebote** el token de punto de quiebre más usado del
repo, que su propio gate deja pasar. Cobertura **accidental** —depende de que la derivación de E13
siga llamando a `tokenLength("--bp-tablet")`— pero hoy real.

### Y ahora la mala, que es la que decide: el gate de puntos de quiebre es peligroso de verdad

`breakpoint-tokens.test.ts` vigila **dos familias en paralelo**: los `--bp-*` (que lee el JS) y los
`--breakpoint-*` (de los que Tailwind **genera las variantes responsive**). Le quité la unidad a uno
solo de los segundos:

```
--breakpoint-desktop: 1180      (sin unidad)
```

**Primero, qué sale del compilador de CSS** (sonda propia sobre `globals.css`, ya borrada):

```
@media (width >= 1180)      <- INVÁLIDA: sin unidad. El navegador descarta la regla entera
@media (width >= 640px)
@media (width >= 768px)
@media (width >= 1180px)
```

O sea: **todas las utilidades `desktop:` de la app dejan de aplicarse**, en las 6 rutas a la vez —
incluida la fila del Dashboard que E13 vino a arreglar, que reparte sus mitades con una variante de
ese nivel. El gate compara los dos valores con la misma lectura permisiva, `1180` contra `1180`, y le
cuadran.

**Y esto es lo que hace la suite completa con ese estado:**

```
$ npx vitest run
 Test Files  81 passed | 3 skipped (84)
      Tests  1404 passed | 13 skipped (1417)
```

**1404 en verde con un nivel entero de la maqueta responsive muerto.** Es la misma familia de fallo
que acabamos de cerrar tres veces, con **más alcance** que ninguna de las tres: B2 dejaba sin tope un
contenedor; esto apaga una variante en toda la app.

### Mi respuesta a tu pregunta

- **`account-band.tokens.test.ts` y `archive-nav.tokens.test.ts`: compro su argumento entero.** Son
  gates pagados de otras enmiendas, sus tokens no están planificados para editarse, y tocarlos dentro
  de la ronda que cierra un bloqueante es exactamente cómo se abren bloqueantes nuevos. A deuda.
- **`breakpoint-tokens.test.ts`: NO compro que sea el mismo caso.** No por el gate, sino por lo que
  cuelga de él: los `--breakpoint-*` gobiernan **toda** la maqueta responsive, y el fallo es
  silencioso y total. La ficha 158 lo mete en el mismo saco que los otros dos y **eso subestima el
  riesgo**.
- **Pero NO bloqueo la ronda 3 por ello, y la distinción es deliberada**, no una excepción de
  conveniencia: B2 sí lo bloqueé porque vivía **dentro del artefacto que E13 entrega** y E13(d) hace
  del gate parte del entregable. Esto vive en un gate de otra enmienda, no lo toca esta tanda, y
  bloquear aquí sería cometer el error que él mismo nombra. **Es tuya la decisión de alcance; yo pongo
  la medición.**
- **Lo que sí pido que no se quede como está: la ficha.** La 158 debería **subir de severidad**, citar
  `--breakpoint-*` por su nombre, y llevar pegadas las dos salidas de arriba (la media query inválida
  y los `1404 passed`). Una deuda que dice *"tres gates copian el mismo `parseFloat`"* no transmite
  que uno de los tres puede apagar el desktop entero sin que nadie se entere.

## Resto de la ronda 3, verificado

- **Aritmética.** 1403 → **1404**, +0 archivos. Contado por mí: `app-shell.classes.test.ts` pasa de
  **13 a 14** tests (mis corridas: 14 en solitario; 46 junto con `layout.test.tsx`, que sigue en 32).
  `css-tokens.ts` ya existía desde la ronda 2, así que `no-hardcode.test.ts` no genera ninguno nuevo.
  Acumulado contra el baseline original (`78 / 1349`): **+3 archivos, +55 tests**, sin residuo.
- **El criterio de alcance de `isAbsolutePxLength` está escrito** (`css-tokens.ts:71-82`) y es el
  correcto: la unidad se exige **sólo** a tokens que se consumen como longitud, y se dice expresamente
  que **no** aplica a profundidad de apilamiento, interlineado, proporciones, opacidades, colores ni
  duraciones. Sin ese párrafo, el próximo que copiara la función inventaría errores donde no los hay.
  También declara que no sabe evaluar cálculos ni cadenas de referencias y que por eso los denuncia en
  vez de darlos por buenos — la política correcta, y la misma del barrido de clases.
- **La derivación compara el valor crudo** (`app-shell.classes.test.ts:171`,
  `expect(tokenValue(CONTENT_MAX)).toBe(\`${expected}px\`)`), que era mi sugerencia directa.
- **Alcance intacto**, comprobado en el árbol: `feature_list.json`, la `Card` de
  `ProjectsToolbar.tsx:118` y la **deuda 153** siguen sin tocarse.
- **El límite residual de `isDeclared()`** que marqué sin bloquear en la ronda 2 (token declarado *en
  el texto* y no *en un ámbito que aplique*) queda recogido en la deuda 158 **con su etiqueta de
  "deducido leyendo, no medido"**, que es como yo lo entregué. Bien hecho: no se lo apropió como
  medido.

## Lo que este review no juzgó, en las tres rondas

**El eje visible.** No tengo navegador; lo mediste vos. Tus números (contenedor de 1040px, x=240 en
ventana de 1536) son coherentes con la derivación que verifiqué por gate —1040 de tope y
(1536−1040)/2 = 248 de margen teórico, contra los 240 medidos, diferencia que cae del lado de la barra
de desplazamiento—, pero **eso es una comprobación aritmética, no una opinión sobre cómo se ve**. Las
deudas **155**, **156** y **157** siguen siendo tuyas.

## Veredicto final de E13

**APPROVED.** Las cuatro decisiones de la enmienda están implementadas y **medidas**:

| decisión | cómo quedó verificada por mí |
|---|---|
| **E13(a)** tope tokenizado + columna centrada declarada una vez | borrar el contenedor → rojo; token con una letra de más → rojo; token sin unidad → rojo; token con otra unidad → rojo; valor a ojo → rojo |
| **E13(b)** rejilla de métricas por cantidad | trampa de E12(b) (columna hacia abajo) → rojo |
| **E13(c)** `Card` fuera de los controles | recuento exacto por archivo, prosa corregida, `Field` extendido en vez de encoger la pantalla |
| **E13(d)** gate hasta el CSS compilado | **tres agujeros encontrados probando y cerrados**: subcadena en el valor (B1), subcadena en el DOM (B1), y el valor del token sin comprobar (B2) |

Las tres rondas dejan una lección que vale la pena que sobreviva a esta tanda, y es del implementer:
**en la ronda 1 el gate comprobaba que la clase existiera; en la 2, que el nombre del token fuera el
correcto; hizo falta la 3 para mirar el valor.** Las tres veces medía la forma de lo escrito en vez
del efecto, y las tres veces el agujero apareció **probando, no leyendo**.

## Nota de método (ronda 3)

Cinco mutaciones propias, todas revertidas: tope sin unidad (suite completa), `--space-4` sin unidad,
`--bp-tablet` sin unidad, `--breakpoint-desktop` sin unidad (suite completa) y una sonda de compilación
de `globals.css` para leer las media queries emitidas. **No se editó código del implementer.** Copia de
seguridad fuera del repo y md5 de `globals.css` (`eed29f5373e3748adb94497902633b0a`) comprobado
idéntico antes y después; la sonda (`zz-probe.mjs`) está borrada y `git status` coincide con el de
partida. Las dos corridas de suite completa quedaron en el scratchpad de la sesión.

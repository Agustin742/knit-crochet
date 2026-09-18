# Review — deudas 146, 147 y 148

**Veredicto: CAMBIOS REQUERIDOS**

> No es una feature. **`feature_list.json` no está tocado** — verificado:
> `git diff --stat -- feature_list.json` vacío, 33 features (23 `done`, 10 `pending`,
> 0 `in_progress`).
> `.claude/settings.json` sale modificado y **queda fuera de alcance**, como se me indicó.

El lote está **bien pensado y bien argumentado**, y dos de las tres deudas están
saldadas de verdad. Lo que bloquea es la **146**: probé el gate en vez de leerlo y
**devuelve verde con una clase inerte puesta en el DOM**, por dos caminos distintos.
Eso es exactamente el defecto que la ficha 146 existe para cerrar. Un gate que da
verde falso es peor que no tener gate.

---

## Lo que medí yo, no heredé

### `bash ./init.sh` — verde, y coincide al dígito

```
INIT EXIT=0
[OK]    lint verde
[OK]    typecheck verde
 Test Files  78 passed | 3 skipped (81)
      Tests  1347 passed | 13 skipped (1360)
   Duration  121.72s
```

Coincide con lo que declara el implementer y con lo que midió el leader
(`78/3`, `1347/13`). La duración de mi pasada fue **121.72 s**, no 74 s.

### Aritmética — cierra, contada por mí

| Archivo | `it(` en `HEAD` | `it(` en el árbol | Delta |
|---|---|---|---|
| `DashboardView.test.tsx` | 31 | 32 | **+1** |
| `SegmentedControl.test.tsx` | 9 | 12 | **+3** |
| `projects-ui.classes.test.ts` (nuevo) | — | 4 estáticos + 3 generados en el bucle sobre `COMPONENTS` | **+7** |

`1336 + 1 + 3 + 7 = 1347` OK · `77 + 1 = 78` OK · **7** confirmados por ejecución
aislada del archivo nuevo (`Tests 7 passed`).
**Sin `skip` / `todo` / `only` / `xit`** en los tres archivos, y
`git diff --name-status HEAD` sobre los tests no lista ni un borrado: sólo dos `M`.

---

## Deuda 148 — **SALDADA en lo esencial**, con una afirmación residual que la ficha prohíbe

### Lo que probé con el compilador (no leí: compilé)

Andamiaje temporal en `src/__probe148_*.tsx`, borrado después
(`git status --porcelain` sin residuo, comprobado).

1. **`value` ajeno al juego -> error de compilación. CONFIRMADO.**

```
src/__probe148_bad.tsx(13,7): error TS2322:
  Type '"valor-ajeno"' is not assignable to type '"active" | "inactive"'.
TYPECHECK EXIT=2
```

2. **`value` válido -> compila. CONFIRMADO** (`TYPECHECK EXIT=0`), y también con
   `options` en un array **mutable sin `as const`** (la forma del consumidor real) y
   con `ref` tipado. La aserción sobre `forwardRef` **no rompe el tipado del `ref`**.

`NoInfer` hace lo que el informe dice. La elección de arreglar el tipo en vez de
bajar el comentario es la correcta.

### La aserción sobre `forwardRef` — el idioma es correcto y lo comprobé en runtime

Es el idioma estándar para un componente genérico con `ref`; `forwardRef` borra los
genéricos y no hay alternativa razonable. El riesgo del `as` es que la firma asertada
mienta, así que lo medí con un test propio (borrado después):

- **`displayName` sobrevive** -> `SegmentedControl.displayName === "SegmentedControl"`.
  Sobrevive porque `SegmentedControl` **es el mismo objeto** que
  `SegmentedControlWithRef`; la aserción sólo lo oculta del tipo, y nada del repo lo
  lee (`public-api.test.ts` sólo comprueba el nombre exportado, línea 36).
- **El `ref` llega al `div`** -> confirmado por su test y por el mío.

### La duplicación de `value` — mi propio test, con TRES opciones

Su test usa dos opciones. Escribí uno con **tres** (`a`, `b`, `a`) para que no
quedara probado sólo su caso: **exactamente una pulsada, y es la primera** (`A1`).
`findIndex` + `aria-pressed={index === selectedIndex}` sostiene la invariante.

**Coincido con no lanzar error.** Un `throw` en un primitivo de presentación
convierte un error de programación en una pantalla rota para el usuario final;
marcar la primera mantiene cierta la invariante *visible*, que es lo que la ficha
pedía. Decisión correcta y bien argumentada.

### BLOQUEANTE 148-A — el JSDoc vuelve a afirmar algo que el tipo no sostiene

La ficha 148 es **una brecha entre el comentario y el tipo**. Queda una.

`SegmentedControl.tsx:74-78` enumera lo que **no** cierra nadie:
*"quien llame sin tipos (JS puro, o con un `as`)"*. Falta un tercer caso, y no es
teórico: **anotar `options` con el parámetro por defecto** colapsa `TValue` a
`string` y **cualquier `value` compila**. Probado:

```tsx
const WIDE: readonly SegmentedControlOption[] = [
  { value: "active", label: "A" }, { value: "inactive", label: "I" },
];
<SegmentedControl label="x" options={WIDE} value="cualquier-cosa" />
// pnpm typecheck -> EXIT 0
```

No es "sin tipos" ni un `as`: es una anotación perfectamente idiomática. Y es la
forma que usa **su propio archivo de test** (`SegmentedControl.test.tsx:17`,
`OPTIONS: readonly SegmentedControlOption[]`), donde el test del `ref` pasa
`value="active"` **sin ninguna protección de tipo** y nadie lo diría al leerlo.

Con eso en la mano, estas dos frases prometen de más:

- `SegmentedControl.tsx:41-45` — *"uno ajeno al juego es error de compilación, no una sorpresa en pantalla"*.
- `SegmentedControl.tsx:68-71` — *"un `value` ajeno al juego lo caza `pnpm typecheck`"*.

**No hay que cambiar código.** Basta con que la enumeración de "lo que no cierra
nadie" incluya el caso, y que las dos frases digan *"siempre que `options` no se
anote con el parámetro por defecto"*. Lo marco bloqueante porque es literalmente el
enunciado de la ficha que se está cerrando.

---

## Deuda 147 — **SALDADA**

- **Sigue el precedente E2(f) al pie.** `EMPTY_DESCRIPTION` de `/proyectos` es
  *"Empezá el primero y va a aparecer acá con su foto, su progreso y las horas que le
  dedicaste."*; la nueva es *"Empezá el primero y acá van a estar tus horas, tus
  proyectos y lo que llevás tejido de cada uno."* Misma forma (imperativo corto + qué
  se va a ver), **sin rutas, sin pasos, sin nombrar controles**, mismo voseo.
- **No promete metros de lana** — bien visto: es un agregado *lifetime* que no se
  mueve con el filtro de año (E1.5), así que en el vacío **del año** sería otra
  promesa que la pantalla no sostiene. Ese razonamiento es el que faltaba en 139.
- **El ancla muerde.** `DashboardView.test.tsx:499-514` es **el mismo par de
  aserciones negativas** que `ProjectsView.test.tsx:495-501` (el precedente):
  `queryByText(/en dos pasos/i)` y `queryByText(/los botones de arriba/i)` se ponen
  rojas si vuelve la copia vieja, y su REGLA 3 lo enseña con la salida real.

**Limitación, no bloqueante (y la hereda del precedente):** la dirección positiva
`getByText(EMPTY_STATE_DESCRIPTION)` **importa la constante**, así que sólo ancla "la
constante se renderiza", no "la copia es buena". Andamiaje *nuevo* con otras palabras
pasaría. Es el mismo trato que E2(f), así que no lo bloqueo.

---

## Deuda 146 — **NO SALDADA.** El gate da verde falso por dos caminos

Antes que nada, lo que está bien, porque es mucho:

- **Coincido con no extraer las clases a un `variants.ts` por componente.** Su
  argumento es correcto: mueve el literal de sitio, deja el agujero abierto para la
  siguiente clase inline y **hace que el gate dependa de la disciplina**, que es lo
  que un gate existe para no necesitar. El AST es la técnica adecuada y se paga sola.
  **El problema no es la técnica: es cómo está implementada la comparación y qué hace
  el resolvedor cuando no entiende algo.**
- **Su control positivo lo reproduje en OTRO archivo**, como se me pidió:
  una clase inventada metida en `ProjectsView.tsx:386` ->

```
AssertionError: estas clases de ProjectsView.tsx no generan ninguna regla:
  se quedan inertes en el atributo: expected [ 'bg-review-inventada-xyz' ] to deeply equal []
 Test Files  1 failed (1) · Tests  1 failed | 6 passed (7)
```

  Restaurado byte a byte (`ProjectsView.tsx` no aparece en `git status --porcelain`).
  **El camino feliz del gate funciona.**

### BLOQUEANTE 146-A — la comparación contra el CSS es una **subcadena**, no un selector

`projects-ui.classes.test.ts:353-355`:

```ts
const inert = found.filter((className) => !css.includes(selectorFor(className)));
```

Un `includes` del punto más el nombre es **cierto** en cuanto ese texto aparezca
dentro de un selector más largo. Cualquier clase inventada que sea **prefijo** de una
real pasa en silencio. Probado en `ProjectsToolbar.tsx:156`, añadiendo al atributo
una utilidad recortada a la que le falta la última letra (prefijo de una clase real
de ese mismo atributo):

```
 Test Files  1 passed (1)
      Tests  7 passed (7)
```

Esa clase recortada **no existe** en el CSS compilado: es exactamente la "cadena
inerte en el atributo" que la ficha 146 describe, y el gate nuevo la deja pasar.

Y no es la técnica del precedente: `segmented-control.tokens.test.ts:126-131` compara
con una **regex anclada a la llave de apertura** de la regla, que sí distingue el
prefijo del nombre completo. La afirmación del informe —*"misma técnica que el gate
del segmentado"*— no es cierta: la nueva es estrictamente más débil.

### BLOQUEANTE 146-B — una función **importada** con argumentos se traga las clases reales, sin denunciar

`projects-ui.classes.test.ts:218-224`: si la llamada no es a un identificador local,
el resolvedor devuelve **los argumentos** como si fueran clases. Si algún argumento
resuelve a algo no vacío, `found.length > 0`, así que **no entra en
`emptyAttributes`, no entra en `unhandled`, y nadie denuncia nada** — mientras las
clases que la función realmente devuelve **no se comprueban jamás**.

Probado en `ProjectsToolbar.tsx`, con un helper en otro archivo:

```ts
// __probe-helper.ts
export function helperClasses(kind: string): string {
  return kind + " bg-review-inventada-xyz";
}
// ProjectsToolbar.tsx:158
<div className={helperClasses("flex")}>
```

```
 Test Files  1 passed (1)
      Tests  7 passed (7)
```

La clase inventada **llega al DOM inerte** y el gate no se entera. Es literalmente el
"extractor que se salta lo que no entiende y devuelve verde".

**Los tres tests de autovigilancia sí funcionan en los demás casos** —y eso hay que
reconocérselo—: con **cero argumentos** (`helperClasses()`) el gate se pone rojo
correctamente (`expected [ 'JsxExpression', 'className', ...(1) ] to deeply equal
[ 'className', 'inputClasses' ]`), un `PropertyAccessExpression` cae en `unhandled`,
y una constante importada suelta cae en `external`. **El agujero es específico: la
llamada externa con al menos un argumento resoluble.**

Arreglo posible sin rediseñar: si la llamada no es a un identificador local, tratarla
como forma no seguida (`unhandled` o `external`) en vez de devolver sus argumentos.

### BLOQUEANTE 146-C — hay una clase de Tailwind literal en el test, y **emite CSS de producción**

El JSDoc del archivo (`projects-ui.classes.test.ts:43-46`) afirma *"Ni un nombre de
clase aparece literal en este archivo"*. **No es cierto**, y no es inocuo:

- **Líneas 23 y 28**, en prosa: la palabra que describe escribir las clases dentro del
  JSX es, ella misma, una utilidad real de Tailwind (`display`).
- **Línea 32**: el ejemplo `className={LAYOUT.<utilidad de rejilla>}` usa otra.

Lo comprobé por **doble compilación** de `globals.css` con `postcss` +
`@tailwindcss/postcss`:

| | regla de la utilidad de `display` | regla de la utilidad de rejilla |
|---|---|---|
| árbol tal cual | **presente** | presente |
| cambiando sólo esas dos palabras por sinónimos en castellano | **ausente** | presente |

O sea: **esa regla está en el CSS de producción por culpa de la prosa de un archivo
de test**, y por ninguna otra razón. La de rejilla ya existía por uso real en
`ProjectsView.tsx`, así que ésa no añade CSS, pero sigue siendo un literal.

Es la regla dura de `conventions.md` §"Nunca escribas una clase de Tailwind literal
en un archivo que hable de clases" —*"Ya pasó dos veces"*— violada en el archivo cuyo
JSDoc declara cumplirla. Arreglo: reescribir esas dos palabras en la prosa, como ya
hace `canonical-tailwind-classes.test.ts:33-37` con sus muestras.

### Coste — verificado, y la conclusión del informe se sostiene

`projects-ui.classes.test.ts` aislado: **1.30 s** (179 ms de test) en mi pasada, igual
que declara. **No son dos los archivos que compilan el CSS entero, son tres**: el
nuevo, `segmented-control.tokens.test.ts` y `src/app/globals-css.test.ts`. Los tres
juntos: **2.48 s / 24 tests**. El coste marginal es aceptable.

**No aceptes el argumento de la suite completa.** El informe dice *"74.18 s frente a
los ~105 s de la partida ... ni siquiera medible"*. Mi pasada dio **121.72 s** y la
del leader 116 s: la duración total de la suite en esta máquina es puro ruido y **no
prueba nada** sobre el coste añadido. Lo que sí lo prueba es la medida aislada.

---

## El eje visible — **NO VERIFICADO**, lo digo en vez de aprobarlo por omisión

No tengo herramientas de navegador en esta sesión. Lo que sí puedo afirmar con
evidencia:

- **No hay cambio estructural de UI en este lote.** El único cambio visible es la
  copia del vacío del Dashboard (147). No se añadió ni se quitó ningún control, no
  cambió ninguna jerarquía y **ninguna clase de CSS cambió** en los tres componentes
  de `/proyectos` (lo comprobé restaurando el árbol: `ProjectCard.tsx` y
  `ProjectsView.tsx` no aparecen modificados).
- **¿Jerarquía visual?** No se toca en este lote: no hay control nuevo ni cambio de
  tamaño, peso ni superficie en ninguna pantalla.
- **¿Dos controles distintos renderizados igual?** No se introduce ninguno. La
  **deuda 142** (segmentado y toggles con el mismo peso visual, uno al lado del otro)
  **sigue abierta y este lote no la toca**.
- **¿Alguna decisión visual justificada por el coste del arnés?** No, y al contrario:
  el JSDoc del primitivo (`SegmentedControl.tsx:50-60`) deja escrito que el segmentado
  se creó **pagando** el gate `public-api.test.ts`, que es la salida correcta según la
  regla del suelo. Nada que fichar por ese lado.
- **¿Toda acción con efecto tiene feedback visible?** Este lote no toca ningún aviso
  ni ningún `role="status"`. La **deuda 137** (feedback que sólo vive en `sr-only`)
  sigue abierta y tampoco se toca.
- Pero **el texto nuevo del vacío del Dashboard no lo vio nadie en pantalla**, ni el
  implementer (lo declara, honestamente, en su §"Sin verificar por mí") ni yo. Queda
  para la REGLA 4 del leader antes de cerrar.

---

## Checkpoints

- **C1:** [x] — arnés completo; `bash ./init.sh` **EXIT 0** medido por mí.
- **C2:** [x] — `feature_list.json` intacto (33; 0 `in_progress`); `progress/current.md`
  describe la sesión activa sin basura previa.
- **C3:** [x] — cambios sólo en `shared/ui` (presentación pura: el primitivo importa
  únicamente `cn` y sus variantes), `features/*/ui` y tests. Sin acceso a DB, sin
  lógica en UI, sin `console.log`, sin TODO huérfanos, sin dependencias nuevas
  (`typescript`, `postcss` y `@tailwindcss/postcss` ya eran devDependencies y ya las
  usaban otros gates).
- **C4:** [ ] <- **Razón:** lint, typecheck y los 1347 tests están verdes, pero el gate
  añadido por la deuda 146 (`src/features/projects/ui/projects-ui.classes.test.ts`)
  **no verifica de verdad**: probado, devuelve verde con una clase inerte en el DOM
  por dos caminos distintos (146-A y 146-B). "La verificación es real" es justamente
  lo que falla.
- **C5:** [x] — sin artefactos sospechosos sin trackear; `progress/history.md` con
  entrada de la última sesión; ninguna feature cambió de estado (correcto: no son
  features). El cierre de sesión lo hace el leader.

---

## Cambios requeridos (BLOQUEANTES)

1. **`projects-ui.classes.test.ts:353-355` — comparar selectores, no subcadenas.**
   Usar la técnica real del precedente (`segmented-control.tokens.test.ts:126-131`):
   regex anclada a la llave de apertura, o al menos a un delimitador de fin de
   selector. **Control positivo obligatorio con una utilidad recortada que sea prefijo
   de una real: hoy pasa en verde y tiene que ponerse rojo.**
2. **`projects-ui.classes.test.ts:218-224` — que una llamada a función NO local no se
   trague las clases.** Si el identificador llamado no está en `locals`, es una fuente
   externa: mandarla a `unhandled`/`external` en vez de devolver sus argumentos como
   si fueran clases. **Control positivo obligatorio con un helper importado que
   devuelva una clase inventada y reciba un argumento resoluble: hoy pasa en verde y
   tiene que ponerse rojo o denunciar la forma.**
3. **`projects-ui.classes.test.ts:23, 28 y 32` — quitar los dos nombres de utilidad
   literales de la prosa y del ejemplo.** **Verificado que uno de ellos mete su regla
   en el CSS de producción y desaparece al reescribir la palabra.** Y corregir la
   afirmación del JSDoc (líneas 43-46) **o** hacerla cierta.
4. **`SegmentedControl.tsx:41-45, 68-71 y 74-78` — cerrar la brecha comentario/tipo que
   queda.** Añadir a la enumeración de "lo que no cierra nadie" el caso de `options`
   anotado con el parámetro por defecto (`readonly SegmentedControlOption[]`), que
   colapsa `TValue` a `string` y acepta cualquier `value` (probado con `tsc`), y
   matizar las dos frases absolutas. **No hace falta tocar código.**

## No bloqueantes (anotados, para el leader)

5. **El `.log` renombrado a `.md` es honesto, no un apaño.** Está declarado en el
   informe (§Verificación de cierre) **y en la cabecera del propio archivo**, con el
   motivo (`.gitignore:32` ignora `*.log`); `progress/` está fuera del escaneo de
   Tailwind (`globals.css:17`), así que no hay riesgo colateral; y **reproduje los
   números de forma independiente y coinciden al dígito**. La evidencia versionada es
   mejor que la evidencia perdida. Única imprecisión: el informe dice *"el contenido es
   la salida cruda, sin editar"* y el archivo lleva una cabecera de 5 líneas y una
   valla de código alrededor. Que lo diga así.
6. **El informe afirma "misma técnica que el gate del segmentado"** (dos veces, y en la
   ficha 146 de `deudas.md`). No lo es: la nueva es estrictamente más débil. Corregir
   la ficha cuando se corrija el gate.
7. **El informe presenta la duración de la suite completa como prueba de no regresión**
   (74.18 s vs ~105 s). Mi pasada: 121.72 s; la del leader: 116 s. Ese número es ruido
   de máquina y no prueba nada; la medida aislada (1.30 s) sí.
8. **`projects-ui.classes.test.ts:127-141`** — `locals` indexa por **nombre a cualquier
   profundidad**, así que dos `const` homónimas en funciones distintas se pisan y la
   segunda gana. Hoy no ocurre en los tres archivos, pero es una vía más de pérdida
   silenciosa de clases. Merece al menos un comentario, o clave por ámbito.
9. **`progress/current.md` lo escribió el implementer** y es del leader. Contenido
   correcto y honesto (incluido el aviso de que el eje visible no se midió); sólo lo
   anoto por el reparto de responsabilidades.
10. **El ancla de 147 sólo muerde hacia atrás** (importa la constante para la dirección
    positiva). Es el mismo trato que el precedente E2(f), así que no lo bloqueo, pero
    si algún día se quiere que muerda de verdad hay que asertar propiedades de la
    copia, no la constante.
11. **La deuda nueva que propone el implementer** (el gate de CSS compilado cubre 3 de
    ~20 archivos) **es correcta y vale la pena ficharla** — pero **después** de
    arreglar 146-A y 146-B: extender por directorio un extractor con verde falso
    multiplicaría el problema en vez de resolverlo.

---

## Sin residuo

Todos mis andamiajes fueron borrados y comprobados:
`src/__probe148_bad.tsx`, `src/__probe148_ok.tsx`,
`src/shared/ui/primitives/segmented-control/__probe.test.tsx`,
`src/features/projects/ui/__probe-helper.ts`, un `.mjs` de compilación en la raíz, y
las ediciones temporales en `ProjectsView.tsx`, `ProjectsToolbar.tsx` y
`projects-ui.classes.test.ts` (restauradas y verificadas por `md5sum` contra la copia
previa).

`git status --porcelain` final = exactamente los 12 archivos del lote, ni uno más.

---
---

# RE-REVIEW — RONDA 2

**Veredicto: CAMBIOS REQUERIDOS**

Los **cuatro bloqueantes de la ronda 1 están cerrados**, y uno de ellos mejor de lo
que yo pedí (ver §1: **me corrigió con medición y tenía razón**). El punto 8 también.
Lo que impide aprobar es que, buscando formas nuevas como se me pidió, **el gate
volvió a dar verde con una clase inerte en el DOM por otros dos caminos**. Son de la
misma especie que los dos de la ronda 1 y el arreglo es del mismo tamaño que el que
ya escribió para el punto 8: **denunciar en vez de callar**.

## Lo que medí yo en esta ronda

`bash ./init.sh`:

```
INIT EXIT=0
[OK]    lint verde
[OK]    typecheck verde
 Test Files  78 passed | 3 skipped (81)
      Tests  1348 passed | 13 skipped (1361)
   Duration  119.69s
```

**Aritmética, contada por mí:**

| Archivo | `it(` antes de esta ronda | ahora | Delta |
|---|---|---|---|
| `DashboardView.test.tsx` | 32 | 32 | 0 |
| `SegmentedControl.test.tsx` | 12 | 12 | 0 |
| `projects-ui.classes.test.ts` | 4 estáticos + 3 del bucle = **7** | 5 estáticos + 3 del bucle = **8** | **+1** |

`1347 + 1 = 1348` OK · `78 + 0 = 78` OK. El **8** no lo deduje: lo vi en las
ejecuciones aisladas del archivo (`Tests 8 passed (8)`, y `1 failed | 7 passed (8)`
en cada control positivo). Cero `skip` / `todo` / `only` / `xit`; `git diff
--name-status HEAD` sobre los tests sigue sin listar ni un borrado.

**Residuo de sus andamiajes: ninguno.** No existen `__probe-helper.ts` ni ningún
`.mjs` en la raíz, y `ProjectCard.tsx` y `ProjectsView.tsx` **no aparecen** en
`git status --porcelain`, o sea que las ediciones temporales volvieron byte a byte.

---

## 1. Me corrigió a mí, y **tiene razón**. Dictamen y deuda nueva

Le mandé igualar la técnica del precedente. **Hice mal en mandarlo sin medirlo**, y él
hizo bien en medirlo antes de obedecer. Lo comprobé compilando `globals.css` y pasando
cada nombre por las tres comparaciones (script de un solo uso en la **raíz**, que
Tailwind no escanea — `globals.css:15` acota con `source("../")` —, borrado después;
los nombres se arman por concatenación, no literales):

```
CSS bytes: 37616
name               substring   precedent   boundary
items-en           true        true        false
items-end          true        true        true
flex-co            true        true        false
flex-col           true        true        true
text-f             true        true        false
text-fg            true        true        true
inline             true        true        false
grid               true        true        true
gap-(--space-)     false       false       false
gap-(--space-5)    true        true        true
```

- Columna **precedent** = el anclado de `segmented-control.tokens.test.ts:126-131`.
  Da **true** para `items-en`, `flex-co` y `text-f`, que **no existen en el CSS**. Su
  argumento es exacto: el `[^{,]*` del anclado se traga las letras que faltan y la
  regla de la clase larga hace de coartada. **Copiar el precedente habría dejado el
  bloqueante 146-A abierto.**
- Columna **boundary** = su `emitsRule`. Es la única que distingue. Y la fila `inline`
  con `boundary=false` es, de paso, la confirmación independiente de que la regla que
  la prosa metía en el CSS **ya no existe**.

### Dictamen sobre el precedente: **SÍ da para ficha nueva** (no lo arreglé, sólo dictamino)

`segmented-control.tokens.test.ts` tiene **hoy** el defecto 146-A, en dos sitios
distintos:

1. **Comprobación de existencia por subcadena pura**, líneas ~152-156 y ~161-165:
   `expect(css, ...).toContain(selectorFor(className))`. Es literalmente lo que
   bloqueé en la ronda 1, en el archivo que servía de modelo. El leader lo vio bien.
2. **`ruleBody`, líneas 124-137**, con el anclado que la tabla de arriba demuestra
   que tampoco pone frontera: para una utilidad recortada devolvería **el cuerpo de la
   regla de otra clase**, así que las aserciones de forma del segmentado (borde
   divisor, radio, foco, target táctil) podrían estar midiendo la regla equivocada y
   pasando en verde.

**Por qué importa y no es teórico:** ese gate deriva sus nombres de
`segmented-control.variants.ts`, que es donde un dedazo produciría exactamente una
utilidad recortada — el caso que el gate existe para cazar. **Propongo ficha nueva**
con el arreglo obvio: reusar la frontera de `emitsRule` (o extraerla a un sitio
compartido) en los dos puntos. No es urgente —hoy las clases del primitivo son
correctas—, pero es la misma deuda que acabo de hacer pagar aquí y sería incoherente
dejarla sin nombre.

---

## 2. Los dos controles positivos, rehechos por mí en archivos distintos a los suyos

### Clase recortada — **cierra**

Él usó `items-en` en `ProjectsToolbar.tsx`. Yo usé **otra clase en otro archivo**:
`justify-between` recortada a `justify-betwee` en `ProjectCard.tsx:106`.

```
AssertionError: estas clases de ProjectCard.tsx no generan ninguna regla:
  se quedan inertes en el atributo: expected [ 'justify-betwee' ] to deeply equal []
 Test Files  1 failed (1) · Tests  1 failed | 7 passed (8)
```

**Bloqueante 146-A: CERRADO.**

### Helper importado con argumento resoluble — **cierra, y nombra al culpable**

Mi propio caso de la ronda 1, esta vez en `ProjectsView.tsx:386`, con un helper que
devuelve una clase inexistente y recibe un argumento que sí resuelve:

```
AssertionError: expected [ 'className', 'inputClasses', ...(1) ] to deeply equal
                         [ 'className', 'inputClasses' ]
+   "revClasses"
 Test Files  1 failed (1) · Tests  1 failed | 7 passed (8)
```

**Bloqueante 146-B: CERRADO**, y el mensaje del rojo dice qué función hay que decidir,
que era la mejora que él añadió por su cuenta.

### La tercera forma que se me pidió buscar: encontré **dos**, y las dos dan verde falso

El contrato que el archivo se pone a sí mismo es explícito: *"se recogen **todos** los
`className`"* (JSDoc, líneas 34-41) y *"sabe seguir todas las formas de expresión que
aparecen"* (test de la línea 406). Estas dos formas **se lo saltan entero** —ni
`unhandled`, ni `external`, ni `emptyAttributes`, ni `ambiguous`— con la clase inerte
llegando al DOM.

#### NUEVO-A (bloqueante) — un `className` entregado por un **spread de JSX** es invisible

En `ProjectsView.tsx:386`, cambiando el atributo por un spread con la misma clase
recortada dentro:

```tsx
<div {...{ className: "flex flex-wrap justify-cente gap-(--space-3)" }}>
```

```
 Test Files  1 passed (1)
      Tests  8 passed (8)
```

`justify-cente` **no existe** en el CSS y el gate no dice nada. `visit` sólo mira
`ts.isJsxAttribute` con nombre `className` (líneas 313-318), y el contraste contra el
texto crudo busca `className\s*=` (línea 399), que **tampoco** casa con `className:`.
Las dos redes tienen el mismo agujero. Y no es una forma exótica: `{...props}` /
`{...rest}` es idiomático en React —el propio `SegmentedControl.tsx:113` lo hace— y en
cuanto uno de esos objetos lleve clases, este gate deja de cubrir el archivo **sin
avisar de que dejó de cubrirlo**.

#### NUEVO-B (bloqueante) — clases acumuladas con `let` + `+=` se pierden en silencio

Esta es la peor de las dos, porque las clases están escritas **dentro del archivo**,
en TypeScript corriente, y aun así se pierden. En `ProjectsView.tsx`:

```tsx
let revCls = "flex flex-wrap";
revCls += " justify-cente";
...
<div className={revCls}>
```

```
 Test Files  1 passed (1)
      Tests  8 passed (8)
```

`resolve` de un identificador devuelve **sólo el inicializador** de la declaración
(líneas 243-255): toda reasignación posterior es invisible. Otra vez, `justify-cente`
inerte en el DOM y ocho tests verdes.

#### Por qué lo bloqueo, y por qué NO es una meta que se mueve

**No pido que el extractor lo entienda todo** —eso sería pedir medio compilador, y él
ya argumentó bien que no toca—. Pido lo único que el gate promete: **que denuncie en
vez de callar**. Y el arreglo tiene exactamente la forma del que él ya escribió para
el punto 8, y **queda verde con el código de hoy** porque hoy no hay ninguno de los
dos casos:

1. **Spread:** si aparece un `JsxSpreadAttribute` en el árbol (o una propiedad
   `className` dentro de un literal de objeto), registrarlo y denunciarlo. Hoy: cero
   ocurrencias en los tres archivos, así que el test nace verde.
2. **Reasignación:** si un nombre que está en `locals` es destino de una asignación
   (`=`, `+=`) en cualquier punto del archivo y encima se usa para resolver un
   `className`, mandarlo a `ambiguous`. Es el mismo mecanismo, la misma lista, el
   mismo test. Hoy: cero ocurrencias.

Con eso, la promesa *"lo que no entiendo lo digo"* pasa a ser cierta, que es lo único
que hace que un gate valga. Y sugiero, ya que se toca, **bajar el absoluto del JSDoc**
(líneas 34-41): que diga qué caminos cubre y cuáles denuncia, en vez de "todos".

---

## 3. Bloqueante 3 — **CERRADO**, con su prueba, reproducida por mí

Compilé `globals.css` con el archivo de test en su sitio y con el archivo movido fuera
de `src/`:

```
--- CON el archivo en src/ ---     CSS bytes: 37616
--- CON el archivo FUERA de src/ --- CSS bytes: 37616
```

**Byte a byte idéntico: aporta cero CSS.** Es, como dice, una prueba más fuerte que
revisar palabra por palabra, y la acepto como tal.

Y la regla que la prosa metía en la ronda 1 **desapareció**: en la tabla de §1, esa
utilidad de flujo sale `boundary=false`, o sea que ya no hay ninguna regla suya en el
CSS. (En la ronda 1 la medí presente y la medí desaparecer al reescribir la palabra;
ahora está desaparecida sola.)

Barrido propio de control sobre el archivo buscando utilidades de una sola palabra del
núcleo: aparecen `w` (dentro de una clase de caracteres de una expresión regular),
`filter` (el método de array) y `left`/`right` (propiedades del AST). Ninguna es
candidata válida a utilidad por sí sola, y **la identidad de bytes lo zanja**.
Archivo restaurado en su sitio, comprobado.

---

## 4. Bloqueante 4 y punto 8 — **CERRADOS**

### 148 — no encontré ninguna afirmación más sin sostén

Releí `SegmentedControl.tsx` entero buscando absolutos, que es donde se me escapó uno
la vez anterior:

- La enumeración de "lo que no cierra ninguno de los dos" (líneas 82-92) **encabeza**
  con el caso de `options` anotado con el parámetro por defecto, dice que **no** es
  "llamar sin tipos", que lo usa el propio archivo de test, y da la salida.
- Las dos frases absolutas quedan condicionadas: la de la prop `value` gana el párrafo
  *"Con una condición, y conviene saberla"* (líneas 47-51) y la de la enumeración dice
  **"siempre que `TValue` se infiera"** (línea 76).
- El JSDoc de `options` (líneas 53-58) añade *"mientras se deje inferir"*.
- **La afirmación nueva la probé, no la leí:** *"o se anota con su unión"*. Con
  `readonly SegmentedControlOption<"active" | "inactive">[]` y un `@ts-expect-error`
  sobre un `value` ajeno, `pnpm typecheck` sale **EXIT 0** — o sea que la directiva
  tiene un error real que esperar y **la unión anotada sí protege**. La afirmación se
  sostiene.
- **Más de lo que pedí, y bien:** el test del `ref` pasa a `INFERRED_OPTIONS` y la
  constante `OPTIONS` lleva encima el aviso de que **no está protegida**. Era el único
  sitio donde se pasaba un `value` sin protección sin que se notara al leerlo.

### Punto 8 — el test de colisión **muerde**

Metí dos `const revBase` en funciones distintas de `ProjectsToolbar.tsx` (una en una
función suelta, otra dentro del componente) y usé una para un `className`:

```
AssertionError: ProjectsToolbar.tsx: expected [ 'revBase' ] to deeply equal []
+   "revBase"
 Test Files  1 failed (1) · Tests  1 failed | 7 passed (8)
```

Denuncia y nombra. La decisión de **detectar** la colisión en vez de resolver el
ámbito es la correcta: resolver ámbitos es medio compilador y el objetivo era no
elegir a ciegas.

---

## 5. Estado de los cuatro bloqueantes de la ronda 1

| # | Bloqueante | Estado | Evidencia **mía** |
|---|---|---|---|
| 1 | 146-A — comparación por subcadena | **CERRADO** | `justify-betwee` en `ProjectCard.tsx:106` -> rojo. Y la tabla de §1: la técnica que yo mandé copiar **también** daba verde falso; su frontera es la única que distingue |
| 2 | 146-B — función externa se traga las clases | **CERRADO** | helper importado en `ProjectsView.tsx:386` -> rojo nombrando `revClasses` |
| 3 | 146-C — clase literal que emite CSS | **CERRADO** | 37616 bytes con y sin el archivo en `src/`, idénticos; la utilidad de flujo sale `boundary=false` |
| 4 | 148 — afirmación sin sostén en el tipo | **CERRADO** | enumeración y frases condicionadas; la afirmación nueva ("o se anota con su unión") probada con `tsc` |
| 8 (no bloq.) | colisión de nombres en `locals` | **CERRADO** | dos `const revBase` en `ProjectsToolbar.tsx` -> rojo nombrando `revBase` |
| 5,6,7 (no bloq.) | `.md` renombrado / "misma técnica" / duración de la suite | **ATENDIDOS** | cabecera del `_r2.md` declara los 5 renglones y la valla como único añadido; la corrección de "misma técnica" está en el informe y en la ficha; la duración queda marcada como ruido |

---

## Checkpoints (ronda 2)

- **C1:** [x] — `bash ./init.sh` **EXIT 0** medido por mí.
- **C2:** [x] — `feature_list.json` intacto (33; 0 `in_progress`).
- **C3:** [x] — sólo tests, JSDoc y comentarios; ningún componente renderizado cambió.
- **C4:** [ ] <- **Razón:** los 1348 tests están verdes, pero el gate de la deuda 146
  **sigue devolviendo verde con una clase inerte en el DOM** por dos caminos nuevos
  (spread de JSX y acumulación con `let` + `+=`), medidos arriba. Los dos que bloqueé
  en la ronda 1 están cerrados; éstos no.
- **C5:** [x] — sin residuo de andamiajes (suyos ni míos); `history.md` con su entrada.

## El eje visible — **SIGUE SIN VERIFICAR**

Esta ronda **no toca ni un componente renderizado**: son un archivo de test, dos JSDoc
y comentarios. Lo confirmé (`ProjectCard.tsx` y `ProjectsView.tsx` sin modificar; el
único `.tsx` de app tocado en todo el lote sigue siendo `DashboardView.tsx` por la
copia de 147, más el `ProjectsToolbar.tsx` de la ronda 1). Sigue en pie lo de la ronda
1: **el texto nuevo del vacío del Dashboard no lo ha mirado nadie en pantalla**, ni el
implementer ni yo. REGLA 4 del leader antes de cerrar. Las deudas **137** y **142**
siguen abiertas y este lote no las toca.

---

## Cambios requeridos (ronda 2) — BLOQUEANTES

1. **`projects-ui.classes.test.ts:313-318 y 399` — el `className` que llega por un
   spread de JSX es invisible.** Detectar `JsxSpreadAttribute` (y/o una propiedad
   `className` dentro de un literal de objeto) y **denunciarlo**, como se hace con
   `ambiguous`. Hoy no hay ninguno en los tres archivos, así que el test nace verde.
   **Control positivo obligatorio:** `<div {...{ className: "<utilidad recortada>" }}>`
   hoy pasa en verde con la clase inerte en el DOM; tiene que ponerse rojo.
2. **`projects-ui.classes.test.ts:243-255` — las clases añadidas por reasignación se
   pierden.** Si un nombre de `locals` es destino de una asignación (`=`, `+=`) en
   cualquier punto del archivo y se usa para resolver un `className`, mandarlo a
   `ambiguous`. Hoy no hay ninguno. **Control positivo obligatorio:**
   `let c = "<clase real>"; c += " <utilidad recortada>"; <div className={c}>` hoy pasa
   en verde; tiene que ponerse rojo.
3. **Bajar el absoluto del JSDoc (líneas 34-41) y del título del test de la línea
   406.** Decir qué caminos cubre y cuáles denuncia, en vez de *"todos los
   `className`"* / *"todas las formas de expresión"*. Es la misma clase de brecha
   comentario/código que la deuda 148, en el archivo que la denuncia.

## No bloqueantes

4. **Ficha nueva propuesta (dictamen del punto 1, NO lo arreglé):**
   `segmented-control.tokens.test.ts` tiene hoy el defecto 146-A por partida doble —
   `toContain(selectorFor(...))` en las líneas ~152-156 y ~161-165 (subcadena pura), y
   `ruleBody` en las líneas 124-137, cuyo anclado **también** da verde falso para una
   utilidad recortada (medido en la tabla de §1, columna `precedent`). Consecuencia
   peor que en el gate nuevo: `ruleBody` puede devolver **el cuerpo de otra regla**, y
   sobre eso se asientan las aserciones de forma del segmentado. Arreglo obvio:
   compartir la frontera de `emitsRule`. **La decide el leader.**
5. **La deuda propuesta por el implementer** (el gate cubre 3 de ~20 archivos) sigue
   siendo correcta y sigue debiendo ir **después** de cerrar los verdes falsos.
6. **Reconocimiento explícito, porque cuenta:** en el punto 1 el implementer **midió
   antes de obedecer una instrucción mía equivocada** y la refutó con salida real. Es
   exactamente el comportamiento que este arnés quiere y merece quedar escrito.

---
---

# RE-REVIEW — RONDA 3

**Veredicto: APROBADO**

Los dos verdes falsos que encontré en la ronda 2 están cerrados, cada uno medido por
mí en **el archivo que él no usó** y en las **dos direcciones** (rojo con el arreglo,
verde con la lógica anterior y la misma clase inerte puesta). Busqué una cuarta vía
como se me pidió y **encontré una**, pero la dictamino **no bloqueante** por un motivo
concreto que explico abajo: no es "un `className` que el barrido se traga", es **otro
mecanismo**, y el que sí podría colarse **lo caza `tsc` una puerta antes**.

## Lo que medí yo

```
INIT EXIT=0
[OK]    lint verde
[OK]    typecheck verde
 Test Files  78 passed | 3 skipped (81)
      Tests  1349 passed | 13 skipped (1362)
   Duration  144.53s
```

**Aritmética, contada por mí:**

| Archivo | antes de esta ronda | ahora | Delta |
|---|---|---|---|
| `DashboardView.test.tsx` | 32 | 32 | 0 |
| `SegmentedControl.test.tsx` | 12 | 12 | 0 |
| `projects-ui.classes.test.ts` | 5 estáticos + 3 del bucle = **8** | 6 estáticos + 3 del bucle = **9** | **+1** |

`1348 + 1 = 1349` OK · `78 + 0 = 78` OK. El **9** lo vi en ejecución
(`Tests 9 passed (9)`, y `1 failed | 8 passed (9)` en cada control positivo), no lo
deduje. Confirmo la explicación del +1: el camino no atravesado añade un test
(`bypassed`) y la reasignación **reusa** el cajón `ambiguous` con el test renombrado —
lo comprobé: el rojo de mi control de reasignación cae en
*"no resuelve ninguna clase por un nombre pisado ni reasignado"*, no en uno nuevo.

Cero `skip` / `todo` / `only` / `xit`. Ningún test borrado ni movido.
**`segmented-control.tokens.test.ts` NO se tocó** (`git diff --stat` vacío), como se le
prohibió. Sin residuo de andamiajes: `ProjectCard.tsx` y `ProjectsView.tsx` no aparecen
en `git status --porcelain`, y `ProjectsToolbar.tsx` coincide por `md5sum` con su estado
previo a mis pruebas.

---

## 1. Los dos controles positivos, en mis términos y en otros archivos

### Spread de JSX — él lo probó en `ProjectsView.tsx`; yo en `ProjectsToolbar.tsx:119`

Utilidad de ajuste de línea recortada a `flex-wra`, entregada por un spread:

```tsx
<div {...{ className: "flex flex-wra items-end gap-(--space-6)" }}>
```

**Con el arreglo -> rojo**, y en el test correcto:

```
FAIL ... > ningún className llega por un camino que el barrido no atraviesa
AssertionError: ProjectsToolbar.tsx: expected [ ...(2) ] to deeply equal []
 Tests  1 failed | 8 passed (9)
```

**Con la lógica de la ronda 2** (anulando los dos registros de `bypassed` y devolviendo
la cuenta cruda a sólo el igual), **la misma clase inerte puesta**:

```
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

Verde con la clase inerte en el DOM, rojo con el arreglo. **CERRADO.** Y confirmo su
diagnóstico de diseño: el arreglo tenía que ser en **las dos capas**, porque la segunda
red fallaba exactamente donde fallaba la primera.

### Reasignación — él lo probó en `ProjectCard.tsx`; yo en `ProjectsView.tsx`

Con una clase que **no existe** en el CSS y que ni siquiera es subcadena de una real
(la medí en la ronda 2: `gap-(--space-)` sale `false` por las tres comparaciones):

```tsx
let revAcc = "flex flex-wrap";
revAcc += " justify-center gap-(--space-)";
<div className={revAcc}>
```

**Con el arreglo -> rojo, nombrando la variable:**

```
FAIL ... > no resuelve ninguna clase por un nombre pisado ni reasignado
AssertionError: ProjectsView.tsx: expected [ 'revAcc' ] to deeply equal []
 Tests  1 failed | 8 passed (9)
```

**Sin el arreglo** (quitando sólo `reassigned.has(node.text)` de la línea 298):

```
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

**CERRADO.** La forma elegida es la que pedí —denunciar, no interpretar el programa— y
reusar el cajón `ambiguous` es correcto: el motivo es el mismo (el inicializador no es
lo que el nombre vale).

---

## 2. ¿Hay una cuarta vía? **Sí, y la dictamino NO bloqueante.** Con el porqué

Encontré una, y la medí entera antes de opinar. Una clase puede llegar al DOM desde
uno de estos tres archivos **sin pasar por ningún `className`**:

**(a) El atributo `class` a secas.** React 19 lo renderiza tal cual — lo comprobé
montando un `div` en un test propio: `<div class="rev-probe-uno" data-t="a"></div>`
sale literal en el DOM. Metido en `ProjectsToolbar.tsx:119` con una utilidad recortada,
**el gate no dice nada**: `Tests 9 passed (9)`.

**(b) `classList.add(...)` desde un `ref`.** También llega:
`<div data-t="b" class="rev-probe-dos"></div>`. Invisible para el gate por definición:
no hay ningún `className` en el fuente.

### Por qué NO bloqueo, y este juicio es mío y explícito

1. **La vía (a) la caza `tsc`, una puerta antes que este gate.** Con `class=` puesto en
   `ProjectsToolbar.tsx`, `pnpm run typecheck` sale **EXIT 2**:

   ```
   src/features/projects/ui/ProjectsToolbar.tsx(119,14): error TS2322:
     Property 'class' does not exist on type 'DetailedHTMLProps<...>'.
     Did you mean 'className'?
   ```

   `init.sh` corre el typecheck **antes** que los tests, así que **el arnés en conjunto
   no se traga esta vía**: no puede aterrizar en el repo. Es distinto de los tres
   agujeros anteriores, que pasaban lint, typecheck y los 1348 tests.
2. **La vía (b) es otro mecanismo, no un `className` que el barrido pierde.** Los tres
   defectos que bloqueé eran todos **la misma cosa**: una clase escrita como `className`
   en el archivo, que el extractor dejaba caer sin decirlo. Ésta es DOM imperativo.
   Cubrirla no es "denunciar mejor": es cambiar la herramienta por una que observe el
   DOM en runtime. Pedirlo sería mover la portería, y yo pedí explícitamente
   **denunciar, no ser completo**.
3. **El gate ya no miente sobre su alcance**, que es la condición que puse. El JSDoc
   (líneas 44-58) dice literalmente que lo que promete **no es entenderlo todo, es no
   callarse**, enumera los cuatro cajones y deja escrito que tres nacieron de verdes
   falsos medidos. Bajo ese contrato, el DOM imperativo está fuera de alcance por
   construcción, no por omisión.
4. **Cero ocurrencias hoy** de cualquiera de las dos en los tres archivos, y ninguna es
   idiomática en este repo (la convención manda tokens y `cn()`, no `classList`).

Queda **escrito como residuo**, no como deuda bloqueante. Sugerencia no bloqueante:
una línea en el JSDoc diciendo que **una clase puesta imperativamente** (`classList`,
`setAttribute`) queda fuera del alcance, para que el día que alguien la escriba sepa
que este gate no la cubre. Es media línea y cierra el último absoluto que le queda al
título del test de `bypassed`.

---

## 3. Bloqueante 3 (los absolutos) — **CERRADO**

Repasé el archivo entero buscando lo que promete de más, que es lo que se me escapó
una vez:

- **Fuera el "todos".** El JSDoc (líneas 34-42) ya no dice *"se recogen todos los
  `className`"*: dice qué **recorre** (los que aparecen como atributo) y qué
  **resuelve** (cadenas, plantillas, constantes y funciones del propio archivo, arrays
  con `join`, ternarios y concatenaciones). Cotejado contra `resolve`: la lista es
  exacta, ni sobra ni falta un caso.
- **La promesa está declarada y es la correcta** (líneas 44-58): *"lo que el gate
  promete NO es entenderlo todo: es no callarse"*, con los cuatro cajones
  (`unhandled`, `external`, `ambiguous`, `bypassed`) y la nota de que los tres últimos
  **nacieron de verdes falsos medidos**. Verifiqué que los cuatro existen en el código
  y que los cuatro tienen un test que los exige vacíos (líneas 496, 516, 537, 548).
- **Títulos de test.** *"sabe seguir todas las formas"* pasó a *"no queda ninguna forma
  de expresión sin seguir ni sin denunciar"*, y el de colisión a *"no resuelve ninguna
  clase por un nombre pisado ni reasignado"*. Los dos describen lo que el código hace;
  el segundo lo comprobé mordiendo.
- **Ningún absoluto nuevo introducido.** El único que queda rozando es el título
  *"ningún `className` llega por un camino que el barrido no atraviesa"*, cierto
  **dentro del alcance declarado** pero que no cubre el DOM imperativo. De ahí la
  sugerencia de media línea del §2. No bloquea.
- **La restricción de Tailwind sigue cumplida tras reescribir la prosa**, que era el
  bloqueante 146-C: recompilé `globals.css` con el archivo en `src/` y con el archivo
  movido fuera -> **37616 bytes en los dos casos**, idénticos y el mismo número que en
  la ronda 2. Barrido propio de utilidades de una palabra: sólo `filter` (método de
  array) y `left`/`right` (propiedades del AST). **Cero CSS aportado.**

---

## 4. Un defecto que encontré de paso — **no bloqueante, dirección segura**

En `projects-ui.classes.test.ts:478`, el patrón de la cuenta cruda se arma dentro de
una plantilla y la secuencia "barra invertida + s" **no es un escape reconocido en una
plantilla: se pierde**. El patrón que se construye de verdad no es el que está escrito.
Lo medí imprimiendo el `source` de las dos expresiones:

```
regex source ACTUAL     : classNames*[=:]
regex source PRETENDIDO : className + (espacios opcionales) + [=:]

"className=..."      actual: true    pretendido: true
"className =..."     actual: false   pretendido: true
"className : ..."    actual: false   pretendido: true
"classNames: 1"      actual: true    pretendido: false
```

O sea: nombre, **cero o más letras eses**, y luego igual o dos puntos.

**Por qué NO bloquea:** las dos desviaciones empujan la cuenta en la dirección que
produce **falso ROJO**, nunca falso verde. Si alguien escribe el nombre con un espacio
antes del igual, el AST **sí** lo cuenta y **sí** lo resuelve, así que la clase se
comprueba igual y lo único que pasa es que el contraste de cuentas no cuadra y el gate
se pone rojo. Si aparece un identificador en plural seguido de dos puntos, la cuenta
cruda sube y también sale rojo. En ningún camino se pierde una clase.

**Aun así hay que arreglarlo** (es una barra invertida), porque hoy el código no hace
lo que su propio texto dice — que es, literalmente, la especie de la deuda 148 en el
archivo que existe para cazarla. Y anotarlo: **el lint no lo vio**
(`no-useless-escape` no marcó la plantilla), así que no hay quien avise.

---

## 5. Estado final de todo lo que bloqueé en las tres rondas

| Ronda | Bloqueante | Estado | Evidencia **mía** |
|---|---|---|---|
| 1 | 146-A — comparación por subcadena | **CERRADO** | `justify-betwee` en `ProjectCard.tsx` -> rojo; y la tabla donde mi propia instrucción (el anclado del precedente) daba verde falso |
| 1 | 146-B — función externa se traga las clases | **CERRADO** | helper importado en `ProjectsView.tsx` -> rojo nombrando `revClasses` |
| 1 | 146-C — clase literal que emite CSS | **CERRADO** | 37616 bytes con y sin el archivo en `src/`, re-medido tras reescribir la prosa |
| 1 | 148 — afirmación sin sostén en el tipo | **CERRADO** | enumeración y frases condicionadas; *"o se anota con su unión"* probado con `tsc` |
| 2 | NUEVO-A — spread de JSX | **CERRADO** | `ProjectsToolbar.tsx:119`: rojo con el arreglo / verde con la lógica vieja |
| 2 | NUEVO-B — reasignación con let y mas-igual | **CERRADO** | `ProjectsView.tsx`: rojo nombrando `revAcc` / verde con la lógica vieja |
| 2 | Absolutos del JSDoc y los títulos | **CERRADO** | §3 |
| 1 (no bloq.) | punto 8 — colisión de nombres | **CERRADO** | rojo nombrando `revBase` |

---

## Checkpoints (finales)

- **C1:** [x] — `bash ./init.sh` **EXIT 0**, medido por mí en las tres rondas.
- **C2:** [x] — `feature_list.json` intacto (33 features, 0 `in_progress`); no son features.
- **C3:** [x] — sólo `shared/ui` (presentación pura), `features/*/ui` y tests. Sin DB,
  sin lógica en UI, sin `console.log`, sin dependencias nuevas.
- **C4:** [x] — lint, typecheck y 1349 tests verdes, **y ahora la verificación es real**:
  las cuatro vías de verde falso que medí están cerradas y cada una tiene su control
  positivo reproducido por mí en un archivo distinto al del implementer.
- **C5:** [x] — sin residuo de andamiajes (suyos ni míos); `history.md` con su entrada;
  ningún estado de feature tocado.

---

## RESIDUO con el que se cierra (lo que queda vivo, escrito para que no se pierda)

1. **EL EJE VISIBLE SIGUE SIN MEDIR, y es del leader.** Nadie ha mirado ninguna
   pantalla en las tres rondas. Lo único visible que cambia en todo el lote es la copia
   del vacío del Dashboard (deuda 147); ninguna clase de CSS cambió —el propio gate lo
   demuestra: las mismas clases, todas emitiendo regla, y el CSS compilado pesando los
   mismos 37616 bytes—. **REGLA 4 antes de cerrar la sesión.** No lo apruebo por
   omisión: lo dejo escrito como **no verificado**.
2. **Deudas 137 y 142 siguen abiertas** y este lote no las toca (aviso que sólo vive en
   `sr-only`; segmentado y toggles con el mismo peso visual uno al lado del otro).
3. **Cuarta vía, dictaminada no bloqueante** (§2): una clase puede llegar al DOM por el
   atributo `class` a secas —que **`tsc` caza**, medido— o por `classList` desde un
   `ref` —que typechequea y el gate no ve, por estar fuera de su alcance declarado—.
   Cero ocurrencias hoy. Sugerencia de media línea en el JSDoc.
4. **La barra invertida perdida de la línea 478** (§4): fail-safe, pero el código no
   hace lo que dice y el lint no avisa.
5. **`segmented-control.tokens.test.ts` tiene el defecto 146-A**, por partida doble
   (subcadena en la comprobación de existencia; y un `ruleBody` cuyo anclado puede
   devolver **el cuerpo de otra regla**, sobre el que se asientan sus aserciones de
   forma). **Confirmado por medición en la ronda 2** y **no tocado**, como se le
   prohibió. La ficha la abre el leader.
6. **El gate cubre 3 archivos de los ~20 que pintan clases.** Ahora con cuatro cajones
   de denuncia, así que extenderlo por directorio ya no multiplicaría un verde falso
   conocido. Deuda que decide el leader.
7. **Nota práctica para quien toque estos tres archivos:** `EXTERNAL_SOURCES` es una
   lista **exacta**, así que adoptar el `cn()` que la convención manda (hoy ninguno de
   los tres lo llama) pondrá el gate **rojo** hasta que se añada `cn` a la lista. Es el
   comportamiento diseñado —obliga a decidir—, pero conviene saberlo antes de que
   sorprenda.

## Nota de método, porque cuenta

Este lote se cerró en tres rondas y **las cuatro vías de verde falso aparecieron
probando, no leyendo** — dos las encontré yo buscándolas a propósito después de que el
implementer ya hubiera cerrado la anterior. Y en la ronda 2 el implementer **midió una
instrucción mía equivocada y la refutó con salida real** en vez de obedecerla. Las dos
cosas son la razón por la que este gate hoy vale algo, y las dos merecen quedar
escritas.

# Review — lote de deuda técnica 117 · 118 · 119 (RFC-01 §3, enmienda E12 a–e)

**Fecha:** 2026-08-11 · **Revisor:** reviewer · **NO es una feature de `feature_list.json`**
(no se esperaban ni se encontraron cambios de estado ahí).

## VEREDICTO: **APROBADO**

**Bloqueantes: 0.** Cosméticos: 3. Deuda nueva detectada: 4 fichas (§7).

Convención: **[MEDIDO]** = lo ejecuté yo y pego la salida. **[VERIFICADO]** = cotejo de fuente.
**No he dado por buena ni una sola cifra del informe del implementer**: todas las que cito abajo las
volví a producir con mis propias mutaciones, distintas de las suyas.

---

## 0. Estado del árbol al terminar esta revisión — restauración verificada

Muté seis veces el árbol para probar el gate. **Todo quedó restaurado.** Sumas de control al cerrar
**[MEDIDO]**, idénticas a las de partida (y a las que declara el implementer en su §6):

```
4589cb95bfa582d6307ff752cf528837 *src/app/(auth)/login/page.tsx
a73f291245d9100b10d4dddfe4f972c5 *src/app/(auth)/register/page.tsx
b06c2f744d680e9004b297892b6ba5ae *src/app/globals.css
4f3b16cb8c504acd8f7a6fd75e08aba8 *src/app/yarn-host-responsive.test.ts
8dda0bf2b93062f280557d24caec6f8b *src/features/dashboard/ui/DashboardHero.tsx
c1f3c186744d254df337bfe2f33c8ea7 *src/shared/ui/layout/app-shell/AppShell.tsx
```

`git status --porcelain -- src/` al cerrar **[MEDIDO]** — exactamente los 6 archivos del encargo,
ni uno más:

```
 M src/app/(auth)/auth-pages.test.tsx
 M src/app/(auth)/layout.tsx
 M src/app/(auth)/login/page.tsx
 M src/app/(auth)/register/page.tsx
 M src/app/globals.css
?? src/app/yarn-host-responsive.test.ts
```

La página sonda que creé para el experimento del §1.3 (`src/app/(auth)/probe/`) está **borrada**:
`ls src/app/(auth)/` devuelve sólo `auth-pages.test.tsx`, `layout.tsx`, `login/`, `register/`.
`git diff --stat` acotado a `login/page.tsx`, `register/page.tsx`, `DashboardHero.tsx` y
`AppShell.tsx` da 50 inserciones / 19 borrados repartidos **sólo** en las dos páginas de auth;
`DashboardHero.tsx` y `AppShell.tsx` no aparecen: intactos.

El árbol sucio restante (`docs/`, `progress/`, `feature_list.json`, `.gitignore`,
`auth-pages.test.tsx` de la sesión anterior) es el que el líder declaró a propósito. No lo cuento
como defecto.

---

## 1. EL GATE NUEVO — `src/app/yarn-host-responsive.test.ts`

Es lo que más importa del lote y es donde más apreté. **Aguanta.**

### 1.1 Descubrimiento roto → ROJO. Confirmado, y con más red de la anunciada

El implementer declara **dos** anclas anti-descubrimiento-roto. **Hay cuatro asertos que caen**, y lo
comprobé con una mutación mía distinta de la suya: en vez de borrar un `<AsciiYarn />` (lo que él
hizo), **rompí el recorrido de archivos en la raíz** — `collectSourceFiles` pasa de casar la
extensión `.tsx` a casar una extensión inexistente, así que **no se descubre ni un solo archivo** y
`HOSTS` queda vacío. Es el colapso total, el caso peor: dos conjuntos vacíos son iguales entre sí y
un gate mal escrito sale verde.

**[MEDIDO]**

```
 × … encuentra los cuatro ovillos que hay hoy y a quién los aloja
 × … clasifica tres anfitriones en el flujo y uno fuera de él
 × … hay variantes de tablet que comprobar
 × … las páginas de auth lo consumen sólo desde --bp-tablet

AssertionError: expected [] to deeply equal [ …(4) ]
AssertionError: expected [] to deeply equal [ 'app/(auth)/login/page.tsx', …(2) ]
AssertionError: expected 0 to be greater than 0
AssertionError: expected 0 to be greater than 0

 Test Files  1 failed (1)
      Tests  4 failed | 3 passed (7)
VITEST_EXIT=1
```

El total baja de 20 a **7** (los 13 casos generados por bucle desaparecen) y el archivo **se pone
rojo**, que es lo único que importa. Además de las dos anclas del §5.5 del informe, disparan dos
guardas de no-vacío que el informe no presume y que están bien puestas:
`expect(variants.length).toBeGreaterThan(0)` (`:520`) y
`expect(uses.length, "nadie consume --auth-inset-inline").toBeGreaterThan(0)` (`:564`).
**El fallo clásico no está.**

### 1.2 Mordida por separado: el `8 failed | 12 passed` es real

Reproduje la mutación clave con mis manos: comentar `--breakpoint-tablet: 768px;` en `globals.css`
(línea 324, dentro de `@theme`), **sin tocar una sola clase del JSX**. Salida literal **[MEDIDO]**:

```
 ✓ encuentra los cuatro ovillos que hay hoy y a quién los aloja
 ✓ clasifica tres anfitriones en el flujo y uno fuera de él
 ✓ app/(auth)/login/page.tsx:73 apaga su hueco
 ✓ app/(auth)/register/page.tsx:35 apaga su hueco
 ✓ features/dashboard/ui/DashboardHero.tsx:59 apaga su hueco
 ✓ app/(auth)/login/page.tsx:73 no tiene su hueco en un contenedor de dos columnas en la base
 ✓ app/(auth)/register/page.tsx:35 no tiene su hueco en un contenedor de dos columnas en la base
 ✓ features/dashboard/ui/DashboardHero.tsx:59 no tiene su hueco en un contenedor de dos columnas en la base
 × la media query de tablet se emite con el ancho de --bp-tablet
 ✓ apagar el hueco compila de verdad a display:none
 ✓ hay variantes de tablet que comprobar
 × tablet:aspect-square genera una regla dentro de la media query de tablet
 × tablet:block …
 × tablet:flex-row …
 × tablet:grid-cols-2 …
 × tablet:items-center …
 × tablet:justify-between …
 × tablet:px-(--auth-inset-inline) …
 ✓ el token existe en globals.css y llega al CSS compilado
 ✓ las páginas de auth lo consumen sólo desde --bp-tablet

 Test Files  1 failed (1)
      Tests  8 failed | 12 passed (20)
VITEST_EXIT=1
```

**Confirmado tal cual: `8 failed | 12 passed`.** Y confirmado lo que ese número demuestra: con la
capa responsive de la app entera muerta, **los seis asertos que leen nombres de clase siguen verdes**
(los tres "apaga su hueco" + los tres "no tiene su hueco en un contenedor de dos columnas"), más las
dos anclas. **Un gate que sólo mirara clases habría certificado como sana una app rota.** La mitad
que compila con postcss es la que ve el fallo. Esto justifica el encargo entero y **es cierto**.

Mordida individual, con dos mutaciones **mías** (el implementer mutó login; yo muté register y
después el otro flanco en login), una cosa por vez:

| mi mutación | archivo | resultado **[MEDIDO]** |
|---|---|---|
| quitar `hidden` del anfitrión, dejando `tablet:block` | `register/page.tsx` | `1 failed / 19 passed` — cae **sólo** "app/(auth)/register/page.tsx:35 apaga su hueco", con el mensaje `expected [ 'tablet:block' ] to include 'hidden'`. Login y Dashboard **siguen verdes**: cada anfitrión se juzga por separado, no hay contagio. |
| quitar el prefijo `tablet:` del inset lateral | `login/page.tsx` | `1 failed / 19 passed` — cae **sólo** "las páginas de auth lo consumen sólo desde --bp-tablet". |
| volver al valor crudo `tablet:px-20` en **las dos** páginas | ambas | `1 failed / 19 passed` en el gate (`nadie consume --auth-inset-inline: expected 0 to be greater than 0`) **y `no-hardcode.test.ts` + `canonical-tailwind-classes.test.ts` siguen VERDES** (`472 passed` entre los tres archivos, menos el rojo). Es la prueba en vivo de la premisa de E12(c): **ningún guardrail preexistente ve el valor crudo**, y el gate nuevo sí. |

### 1.3 La exención de `AppShell.tsx:52` — **derivada, pero SÍ se puede esquivar**

La pregunta del encargo era: ¿exención derivada o allowlist disfrazada? Respuesta medida: **las dos
cosas a la vez, y conviene fichar la segunda mitad.**

Lo que es cierto del informe: **no hay lista de nombres perdonados**. `outOfFlow` sale de
`hostClasses.some(name => OUT_OF_FLOW.includes(name))` con `OUT_OF_FLOW = ["fixed", "absolute"]`
(`:83`, `:319`). Si mañana alguien mete la capa del `AppShell` en el flujo, cambia la clasificación y
el ancla `:425` cae. Eso es derivación honesta.

Lo que **no** dice el informe, y lo comprobé con una página sonda propia
(`src/app/(auth)/probe/page.tsx`): un ovillo dentro de un contenedor `grid-cols-2` **sin ninguna
variante responsive**, con el anfitrión en `className="absolute inset-0"`.

- Con la sonda puesta, **sólo caen las dos anclas** (`2 failed | 18 passed`). El total **sigue siendo
  20**: para ese anfitrión **no se genera ni un caso** de "apaga su hueco" ni de "no tiene su hueco en
  un contenedor de dos columnas".
- Acto seguido hice **lo que el propio JSDoc del gate le pide al desarrollador** (`:401`: *"Si añades
  un ovillo nuevo, este test cae: añádelo a la lista"*): añadí la sonda a los dos inventarios.
  Resultado **[MEDIDO]**: `Test Files 1 passed (1) · Tests 20 passed (20)`, **EXIT=0**. Verde, con una
  página que reparte el ancho en dos columnas en la base y un ovillo cuyo hueco no se apaga nunca.

**Conclusión que hay que fichar:** sí, alguien puede esquivar los dos asertos de fondo escribiendo
`fixed` o `absolute` en el anfitrión de una página nueva. El ancla **obliga a que un humano pase por
ahí** —no es un agujero silencioso, y ésa es la diferencia real con una allowlist—, pero el mensaje
que ese humano lee le pide hacer **a mano** justo la comprobación que el gate acaba de saltarse. Es
la misma familia que el "agujero conocido" ya escrito para E11(c) / deuda 52.

Y hay un matiz **lógico**, no sólo de proceso: la exención se justifica con "un anfitrión fuera de
flujo no reserva espacio" — cierto **para el anfitrión**. Pero el segundo aserto no juzga al
anfitrión: juzga **al contenedor** (`grid-cols-2` en la base). Un `grid-cols-2` sigue partiendo el
ancho en dos pistas aunque su segundo hijo esté fuera de flujo, así que el daño de la 118 sigue en
pie y el gate lo exime igual. La exención es **más ancha que su motivo**. → deuda nueva **D-a** (§7).

**No es bloqueante**: hoy el único exento es `AppShell.tsx:52`, que es el caso correcto, y el ancla
lo fija.

### 1.4 Lo demás del gate, revisado

- **Falla cerrado, no abierto.** Si el anfitrión no tiene `className` literal, `discoverHosts`
  **lanza** (`:303-310`) en vez de saltárselo. Si el ovillo se entrega por prop y no se puede resolver
  el archivo dueño ni dónde se pinta, **lanza** (`:236`, `:255`, `:265`, `:275`). Bien.
- **Resolución a través de la prop del caparazón** (`AppShellClient.tsx` → `AppShell.tsx`): funciona
  y está anclada por nombre de archivo en `:415`. Es la parte más frágil del recorrido y es la que el
  ancla protege mejor.
- **Base de línea verde**, verificada por mí antes de mutar nada **[MEDIDO]**:
  `Test Files 1 passed (1) · Tests 20 passed (20)`, EXIT=0, con los 20 nombres tal cual los lista el
  informe en su §6 mutación 5. **Coinciden uno a uno.**
- Ubicación en `src/app/` en vez de `src/shared/ui/`: tiene el precedente exacto de
  `src/app/globals-css.test.ts` y el implementer lo ficha él mismo (§9.3). Aceptado.

---

## 2. E12(c) — la restricción dura: de `--bp-tablet` para arriba **nada cambió**

Verificado por mí, sin fiarme del cotejo del implementer, y cruzado con las mediciones de navegador
del líder.

**Cotejo propiedad por propiedad [VERIFICADO sobre el fuente y el CSS compilado]:**

| propiedad | antes (`HEAD`) | ahora | ¿igual ≥768px? |
|---|---|---|---|
| contenedor | `grid grid-cols-2 px-20` | `grid grid-cols-1 tablet:grid-cols-2 tablet:px-(--auth-inset-inline)` | sí |
| celda del ovillo | `<div className="">` | `<div className="hidden tablet:block">` | sí (`block` en ambos) |
| separación entre columnas | ninguna | ninguna (sin `gap`) | sí |
| relleno lateral | `px-20` = 80px | `--auth-inset-inline` = 80px (`globals.css:134`) | sí |

`grep -rn "px-20" src` **[MEDIDO]: cero apariciones.** Era su único consumidor en todo el repo.

**Cruce con tus mediciones de navegador:** cuadran con el fuente sin excepción.

- `padding-inline: 80px` desde 768px y `0px` por debajo ⇒ es exactamente
  `tablet:px-(--auth-inset-inline)` con el token a `80px`.
- **Una** pista de `340.462px` a 390px y a 767px, con la celda del ovillo en `display: none` ⇒
  `grid-cols-1` + `hidden`, las dos mitades del arreglo funcionando a la vez.
- `280px 280px` a 768px y `536px 536px` a 1280px, y sobre todo **`column-gap: normal` a 1280px** ⇒
  **confirma que no se coló ningún `gap`**, que es la mitad más fácil de romper de la restricción
  dura y la que el cotejo estático no puede demostrar del todo.
- **`[data-slot="bg-3d"]` ya no existe en ninguna de las dos páginas de auth** ⇒ E12(d) llegó al DOM
  servido, no sólo al fuente.
- Sin scroll horizontal en ningún viewport, y campos de 297px / 267px con botón de 45px (≥44px de
  `--touch-target`) a 390px ⇒ el aplastamiento silencioso de 91px/47px que reproduciste del estado
  anterior está efectivamente eliminado.

El cotejo del implementer (su §3.3), incluida la comprobación de orden en el CSS compilado (las
variantes se emiten después, así que ganan a igual especificidad), **es correcto**. No cambió un
píxel por encima de `--bp-tablet`.

---

## 3. Ningún gate preexistente se debilitó

**Los 3 del caparazón [MEDIDO]:** `git status --porcelain` sobre
`src/shared/ui/layout/layout.test.tsx`, `src/app/(app)/dashboard-page.test.tsx`,
`src/shared/ui/layout/app-shell/AppShell.tsx` y `src/features/dashboard/ui/DashboardHero.tsx`
devuelve **vacío**: los cuatro archivos **no se tocaron**. Los tres asertos siguen ahí y siguen
mirando `bg-3d` (`layout.test.tsx:42`, `dashboard-page.test.tsx:125` y `:145`), y `AppShell.tsx:54`
conserva su `data-slot="bg-3d"`. Corrida conjunta con `auth-pages.test.tsx`:
**`3 passed (3) · 50 passed (50)`, EXIT=0.**

**Los de auth: ajustados, NO recortados.** Cotejo contra
`git show HEAD:"src/app/(auth)/auth-pages.test.tsx"` **[MEDIDO]** — el inventario de nombres es 1:1,
mismos 10 bloques `it(` en el mismo orden, más el `it.each` de `:162` intacto (14 casos en total, no
12; el archivo corre `14 passed (14)`):

| # | HEAD | ahora |
|---|---|---|
| 2 | "monta el ovillo ASCII de fondo, decorativo y detrás del contenido" | "monta el ovillo ASCII como hero de la página, decorativo" |
| 8 | "no monta el ovillo ASCII" | "monta el ovillo ASCII, decorativo (revierte la decisión de #31, 2026-08-07)" |

Los otros 8 nombres son **idénticos byte a byte**. `git diff` sobre el archivo tiene **exactamente
dos hunks**, los de esos dos tests. Ninguno se borró, comentó ni saltó:
`grep -nE '\.(skip|todo|only)\('` sobre el archivo y sobre el gate nuevo devuelve **cero**.

Y **la fuerza no bajó, subió**: el de register pasa de dos asertos negativos
(`not.toBeInTheDocument()` + `toBeNull()`) a tres positivos (presencia del ovillo, slot no nulo y
`aria-hidden="true"`). El de login cambia sólo el valor del selector. El cambio del test de register
es trabajo de la sesión anterior (deuda 116, `impl_fix_register_ovillo.md`); lo que aporta **este**
lote en los dos es el renombrado del `data-slot`. Correcto en ambos casos.

---

## 4. E12 está implementada ENTERA — las cinco letras

| letra | qué exige | estado |
|---|---|---|
| **E12 (a)** | rejilla mobile-first: 1 columna en la base, 2 desde `--bp-tablet`, celda del ovillo apagada por CSS | **cumplido**. `grid grid-cols-1 tablet:grid-cols-2` + `hidden tablet:block`, idéntico en las dos páginas (`login/page.tsx:71-73`, `register/page.tsx:33-35`). Patrón de `DashboardHero.tsx:58` copiado, no reinventado. |
| **E12 (b)** | dejar escrito que las variantes son MIN-WIDTH | **cumplido**. Está en el RFC y repetido en el JSDoc del gate (`:36-44`). **Verificado por mí**: `grep -rn "@custom-variant" src` devuelve **cero declaraciones** (las dos apariciones son prosa del propio gate). El gate lo ata además al runtime leyendo `--bp-tablet` de `globals.css` en vez de escribir `768px` a mano (`:346`). |
| **E12 (c)** | conservar los 80px en tablet/desktop, tokenizarlos y quitarlos en móvil | **cumplido**. Token `--auth-inset-inline: 80px` en `globals.css:134`, dentro de `@theme`, junto a la familia `--nav-*-inset-*` que es su precedente declarado, con 15 líneas de motivo escrito (por qué no cabe en la escala, por qué `no-hardcode` no lo veía, por qué sólo rige desde tablet). `px-20` erradicado de `src/`. |
| **E12 (d)** | renombrar el `data-slot` de auth, no tocar el del `AppShell`, **conservar el `aria-hidden` con el motivo escrito** y reescribir los comentarios huérfanos | **cumplido, incluida la parte poco glamurosa.** `data-slot="auth-hero"` en las dos páginas; `AppShell.tsx:54` intacto. El `aria-hidden` **se queda**, con un comentario de 7 líneas junto al atributo en `login/page.tsx:65-71`, versión corta en `register` que remite a él, y repetido en el JSDoc del gate de login. Los **tres** comentarios huérfanos reescritos, verificados uno a uno en el diff (ver debajo). |
| **E12 (e)** | el gate, y que llegue al CSS compilado | **cumplido**. §1 de este informe. |

**Los tres comentarios huérfanos, verificados en el diff:**

1. `register/page.tsx:11` decía *"Sin ovillo de fondo: el RFC-01 §2 lo reserva para login"*
   —**tres líneas antes de montarlo**—. Ahora dice que **sí** lo lleva, que la asimetría de #31 quedó
   derogada por `bdb11b0`, que no es capa de fondo sino celda de rejilla, y cómo es la rejilla.
2. `login/page.tsx:18-21` decía *"sin capturar el puntero y por detrás del contenido"*, las dos cosas
   falsas desde `bdb11b0`. Ahora dice que **sí** captura el puntero y por qué eso no le roba clics al
   formulario (vive en otra columna), y por qué el slot se llama `auth-hero`.
3. `(auth)/layout.tsx:8-9` decía que el `relative` es *"de quien se cuelga el ovillo ASCII"*. Ahora
   dice que **ya no ancla nada** y por qué se conserva igualmente.

**Extra verificado:** RFC-01 §2 quedó corregido con la línea vieja **tachada y no borrada**
(`~~ovillo ASCII de fondo solo en login~~` + nota de derogación), que es lo que E12 pide y la misma
política que se usó en `feature_list.json` #31.

---

## 5. REGLA 1 y forma canónica

- **Cero clases inventadas o con comodines** en los seis archivos tocados **y en el informe del
  implementer** **[MEDIDO]**. Barrí patrones tipo `algo-<asterisco>`, `variante:algo-<asterisco>` y
  backtick seguido de asterisco. Los dos únicos aciertos (`globals.css:7` y `:26`) son **prosa
  preexistente sobre familias de tokens CSS**, no clases de Tailwind, y este lote no los tocó.
- Todas las clases citadas en el informe son **reales y existen en el repo**: `grid-cols-1`,
  `grid-cols-2`, `hidden`, `tablet:block`, `tablet:grid-cols-2`, `tablet:aspect-square`,
  `tablet:flex-row`, `tablet:items-center`, `tablet:px-(--auth-inset-inline)`, `px-20`, `h-full`,
  `w-full`, `max-w-sm`, `shrink-0`, `absolute`, `fixed`.
- **Forma canónica: correcta.** `px-(--auth-inset-inline)` es la forma corta de paréntesis que manda
  `docs/harness/conventions.md` y vigila `canonical-tailwind-classes.test.ts`. Encaja con los ~45
  consumidores del repo (`gap-(--space-4)`, `z-(--z-bg-3d)`, `min-h-(--touch-target)`, `px-(--space-4)`).
  No se introdujo ninguna forma larga `[var(--…)]`.
- Riesgo de escaneo de Tailwind sobre los comentarios nuevos: revisado. Todo lo que parece clase en
  los JSDoc nuevos es una clase real. `globals-css.test.ts` verde.

---

## 6. Verificación ejecutada por mí

### `bash ./init.sh` — **sin tubería** (redirigido a archivo; el EXIT es el del script)

```
[OK]    lint verde
[OK]    typecheck verde

 Test Files  70 passed | 3 skipped (73)
      Tests  1220 passed | 13 skipped (1233)
   Duration  116.05s

[OK]    Entorno listo. Puedes empezar a trabajar.
EXIT=0
```

**Confirmo los números del implementer al dígito**: `70 passed | 3 skipped (73)` archivos y
`1220 passed | 13 skipped (1233)` tests. Contra la baseline declarada (69/72 y 1200/1213): **+1
archivo y +20 tests**, que son exactamente los 20 del gate nuevo — verificado corriéndolo aislado
(`20 passed (20)`). **Cero regresiones, cero tests silenciados.** La baseline en sí no la re-medí
(exigiría revertir el árbol); la aritmética cierra sola con el conteo del gate.

### `pnpm build`

```
BUILD_EXIT=0
```

**27 rutas [MEDIDO]**. `/login` sigue dinámica (`ƒ`), `/register` sigue estática (`○`), igual que
antes: el cambio es de clases y de un `data-slot`, no de estrategia de render.
`git status --porcelain` **después** del build: no reaparece `next-env.d.ts` como archivo sin
trackear (lo tapa el `.gitignore` nuevo) y no hay artefactos sueltos.

---

## 6bis. Deuda 119 (del líder) — revisada, correcta

| comprobación | resultado |
|---|---|
| el archivo sigue en disco | **sí** [MEDIDO]: `-rw-r--r-- … 257 next-env.d.ts` |
| destrackeado | **sí**: `git ls-files next-env.d.ts` devuelve 0; `git status` lo muestra como `D` en el índice |
| `tsconfig.json` intacto y lo sigue listando en `include` | **sí**: `git status` no lo marca modificado y `include` empieza por `"next-env.d.ts"` (`tsconfig.json:34`) |
| lo regenera el build sin ensuciar el árbol | **sí**: tras `pnpm build` sigue en disco y no aparece en `git status` |

**El comentario del `.gitignore` NO exagera ni tergiversa.** Lo contrasté contra la fuente empaquetada
(`next@16.2.10`), no contra memoria:

- *"la doc … dice literalmente «Add it to .gitignore. If your project already tracks the file, remove
  it from Git»"* → **literal exacto**, en
  `node_modules/next/dist/docs/01-app/03-api-reference/05-config/02-typescript.md:91`.
- *"lo clasifica junto a `.env` como «should not be tracked»"* → **cierto**, en
  `node_modules/next/dist/docs/01-app/01-getting-started/02-project-structure.md:47`
  (*"TypeScript declaration file for Next.js (should not be tracked by version control)"*), misma
  tabla y misma fórmula literal que las cuatro filas de `.env` (`:41-44`).
- *"Lo regeneran solos `next build`, `next dev` y `next typegen`"* → **cierto**, `02-typescript.md:87`.
- *"`tsconfig.json` DEBE seguir listándolo en `include`"* → **cierto**, `02-typescript.md:92`
  (*"The file must be in your `tsconfig.json` `include` array"*).

Las cuatro afirmaciones se sostienen palabra por palabra; el comentario cita la doc con precisión y
no le atribuye nada que no diga. La única frase no verificable desde la doc —*"su import apunta a una
ruta distinta en modo dev y en modo build"*— viene de la medición del explorador y el comentario la
presenta como observación propia del repo, no como cita de Next. Correcto.

---

## 7. Deuda nueva detectada en esta revisión

**D-a — La exención por "fuera de flujo" del gate nuevo es más ancha que su motivo, y es esquivable.**
`yarn-host-responsive.test.ts:83` + `:319`. Un anfitrión con `fixed` o `absolute` queda exento de
**los dos** asertos de fondo, incluido el que juzga **al contenedor** (`grid-cols-2` en la base) — y
un `grid-cols-2` sigue partiendo el ancho en dos pistas aunque su segundo hijo esté fuera de flujo,
que es el daño exacto de la 118. Medido con una página sonda: `absolute` + `grid-cols-2` sin
variantes ⇒ sólo caen las dos anclas; añadiendo la sonda a los inventarios (que es lo que el JSDoc
`:401` le pide al desarrollador) ⇒ **`20 passed (20)`, EXIT=0**. Arreglo barato: aplicar el aserto del
contenedor **también** a los anfitriones exentos, o exigir que la exención venga acompañada de
`inset-0`. Misma familia que el agujero conocido de E11(c) / deuda 52. **Prioridad alta la próxima
vez que se toque el gate.**

**D-b — El inventario del ancla es un punto de fuga por diseño.** Es el precio conocido de un ancla de
pertenencia y no hay alternativa mejor, pero conviene que la ficha exista: quien la actualiza recibe
la instrucción de verificar **a mano** el invariante del caso que añade. Sugerencia barata: que el
mensaje de fallo del ancla nombre explícitamente qué hay que comprobar cuando el anfitrión nuevo es
`fixed`/`absolute`.

**D-c — El lector de JSX del gate depende de Prettier.** Ya lo ficha el implementer (§9.4) y lo
confirmo: `parseTags` (`:128`) asume una etiqueta de apertura por línea. Es cierto hoy y las anclas lo
cazan si deja de serlo, pero el arreglo el día que caiga será reescribir el lector, no tocar una
línea.

**D-d — `data-slot` sigue sin fila en `docs/harness/conventions.md`.** Verificado:
`grep -n "data-slot" docs/harness/conventions.md` devuelve **cero**. Este lote acaba de renombrar uno
y de establecer un eje conceptual (`bg-3d` = capa fija decorativa / `auth-hero` = pieza en el flujo e
interactiva) que hoy sólo vive en comentarios de código. Carril de documentación.

**Fuera de alcance, no computa como defecto de este lote:** `postcss` como dependencia fantasma
(deuda 120). Confirmo el dato del implementer: son ya **3** los archivos de `src/` que la importan
sin declararla (`globals-css.test.ts`, `skeleton.tokens.test.ts` y el gate nuevo);
`package.json:19` sólo declara `@tailwindcss/postcss`. La gravedad **sube** con este lote —un clon
limpio ahora rompe en tres sitios en vez de dos— pero el líder lo excluyó a propósito y el arreglo es
una línea en `package.json`.

---

## 8. Cosmético (no bloqueante)

1. `impl_deudas_117_118.md` §1 y §4.1 citan `AppShell.tsx:54` y §5.6 cita `AppShell.tsx:52`. Los dos
   son correctos pero nombran cosas distintas (`:52` es el `<div>` anfitrión, `:54` la línea del
   `data-slot`). Confunde al leerlo seguido.
2. El encargo hablaba de "los 12 casos de `auth-pages.test.tsx`"; son **14** (10 bloques `it` más un
   `it.each` de 5). No cambia nada del veredicto: el inventario está 1:1 y los dos ajustados son
   exactamente los dos que el contrato nombraba.
3. El gate vive en `src/app/` y mide `src/features/` y `src/shared/`. Tiene precedente
   (`globals-css.test.ts`) y está fichado por el propio implementer (§9.3); si algún día se ordenan
   los guardrails, su sitio natural es `src/shared/ui/`.

---

## 9. CHECKPOINTS.md

- **C1 — El arnés está completo:** `[x]`
  Los 4 archivos base y los 3 docs de `docs/harness/` existen (`init.sh` los verifica uno a uno) y
  `bash ./init.sh` termina con **exit code 0** [MEDIDO].
- **C2 — El estado es coherente:** `[x]`
  Es un lote de deuda: `feature_list.json` no cambia de estado por él y valida (33 features). Ninguna
  feature quedó en `in_progress` por este trabajo, y toda feature `done` sigue con sus tests verdes
  (`1220 passed`). `progress/current.md` describe la sesión activa y sus reglas vigentes, sin basura
  de sesiones anteriores.
- **C3 — El código respeta la arquitectura:** `[x]`
  Cambio de capa de presentación puro: `src/app/(auth)/**` (dos páginas y el layout),
  `src/app/globals.css` y un test. **Cero acceso a DB, cero lógica de negocio, cero route handlers
  tocados**, así que el scoping por `userId` y la delegación a `features/<x>/api` no entran en juego
  aquí y no se han degradado en ningún sitio. Estructura feature-first respetada
  (`src/{app,features,shared}`); las páginas no importan nada de `shared/db`. **Ninguna dependencia
  nueva** (`package.json` intacto; la fantasma `postcss` es preexistente, deuda 120). Sin
  `console.log` sueltos. Sin TODOs sin contexto: cada comentario nuevo cita RFC-01 §3 / E12 y la
  medición que lo respalda. Sin secretos hardcodeados.
- **C4 — La verificación es real:** `[x]`
  `pnpm lint` y el typecheck **verdes** dentro de `init.sh`; `1220 passed | 13 skipped`, **cero
  rojos**; `pnpm build` EXIT=0. Cada pieza del cambio tiene su test: la rejilla y el apagado del
  hueco → los 6 asertos de clases del gate nuevo; que esas clases compilen de verdad → los 10 del CSS
  compilado; el token → los 2 del inset; el `data-slot` → los 2 de `auth-pages.test.tsx`. Condición
  doble ejecutada **por el revisor** con seis mutaciones propias (§1.1, §1.2, §1.3), en las dos
  direcciones y con restauración verificada por suma de control.
- **C5 — La sesión se cerró bien:** `[x]`
  Sin `*.tmp` ni artefactos de build fuera del `.gitignore`; los únicos archivos sin trackear son
  informes de `progress/reports/` y el gate nuevo. `next-env.d.ts` deja de ensuciar el árbol (deuda
  119) y `pnpm build` no lo resucita. El estado de features no aplica: este lote no cierra ninguna.
  **Pendiente del líder, no del implementer:** la entrada en `progress/history.md`, marcar 117/118/119
  en `progress/deudas.md` y el informe de cierre en `progress/informs/`.

---

## 10. Cambios requeridos

**Ninguno. Cero bloqueantes.** El lote se aprueba tal como está.

Los cuatro puntos del §7 son **fichas de deuda**, no correcciones de este trabajo. **D-a** es el único
con arreglo técnico concreto y merece prioridad alta la próxima vez que se toque el gate, porque es
la grieta por la que el invariante se puede vaciar.

**Lo que sostiene el APROBADO, en una línea:** el guardrail nuevo se puso rojo en las **seis**
mutaciones que le hice yo, cada aserto muerde por separado, el `8 failed | 12 passed` que justificaba
el encargo es cierto y reproducible, ningún gate preexistente se debilitó, las cinco letras de E12
están implementadas —incluidos el `aria-hidden` con su motivo y los tres comentarios huérfanos—, la
deuda 119 cita la doc de Next con exactitud, y `init.sh` y `pnpm build` terminan en verde con los
números exactos que se declararon.

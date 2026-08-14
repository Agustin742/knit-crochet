# Impl — deudas 117 y 118 (RFC-01 §3, enmienda E12 a–e)

**Fecha:** 2026-08-11 · **Tipo:** lote de deuda técnica (NO es una feature de `feature_list.json`;
ese archivo no se ha tocado y nada se ha marcado `done`).

Convención de honestidad: **[MEDIDO]** = ejecuté algo y pego la salida literal. **[LEÍDO]** = lectura
de código. **[NO MEDIDO]** = no lo comprobé y lo digo.

---

## 0. Baseline, medido por mí antes de tocar nada

`bash ./init.sh` **sin tubería** (redirigido a archivo; el código de salida es el del script, no el de
un `tail`).

```
EXIT=0

 Test Files  69 passed | 3 skipped (72)
      Tests  1200 passed | 13 skipped (1213)
   Duration  116.76s
```

**Coincide exactamente con lo que midió el líder.** No contradigo ningún dato de los dos informes de
exploración; todo lo que reutilizo de ellos está citado y todo lo que añado lo vuelvo a medir aquí.

---

## 1. Archivos tocados

| Archivo | Qué |
|---|---|
| `src/app/globals.css` | **+1 token**: `--auth-inset-inline: 80px`, con su motivo escrito (E12 c). |
| `src/app/(auth)/login/page.tsx` | Rejilla mobile-first, celda del ovillo apagada por CSS, `data-slot` renombrado, `className=""` fuera, JSDoc reescrito. |
| `src/app/(auth)/register/page.tsx` | Lo mismo, más la línea en blanco suelta que había tras la apertura de la rejilla. |
| `src/app/(auth)/layout.tsx` | JSDoc reescrito (el `relative` ya no sostiene nada). |
| `src/app/(auth)/auth-pages.test.tsx` | Los **2** asertos que agarraban por `[data-slot="bg-3d"]` pasan a `auth-hero`; JSDoc de los dos gates actualizado. |
| `src/app/yarn-host-responsive.test.ts` | **NUEVO.** El gate de E12(e). |

**No tocados, a propósito:** `src/shared/ui/**` (incluido `AppShell.tsx:54`, que conserva su
`data-slot="bg-3d"`), `src/features/dashboard/ui/DashboardHero.tsx`, `package.json`, `feature_list.json`,
`progress/current.md`, `progress/deudas.md`, `next-env.d.ts`, `.gitignore`.

`git status --porcelain -- src/` al terminar **[MEDIDO]**:

```
 M src/app/(auth)/auth-pages.test.tsx
 M src/app/(auth)/layout.tsx
 M src/app/(auth)/login/page.tsx
 M src/app/(auth)/register/page.tsx
 M src/app/globals.css
?? src/app/yarn-host-responsive.test.ts
```

---

## 2. A) Deuda 118 — la rejilla responsive (E12 a, b)

### 2.1 Qué quedó escrito

Las dos páginas, idénticas en su envoltorio:

- Contenedor: `grid grid-cols-1 tablet:grid-cols-2 tablet:px-(--auth-inset-inline)`
- Celda del ovillo: `hidden tablet:block`

Es el patrón de `DashboardHero.tsx:58` **copiado, no reinventado**: base de una columna + variante
`tablet:` que añade la segunda, y el hueco apagado con la misma condición de ancho.

### 2.2 Las dos piezas, y por qué hacen falta las dos — con una precisión

El informe de exploración dice que sólo con una columna la celda vacía *"se apila debajo del
formulario"*. Cierto. Pero la relación es más fuerte de lo que sugiere, y conviene dejarlo escrito
porque es lo que justifica que el gate tenga **dos asertos independientes**:

- **`hidden` solo no basta.** `display: none` saca al hijo del layout, pero **no borra la pista**:
  `grid-template-columns: repeat(2, minmax(0, 1fr))` sigue partiendo el ancho en dos con la segunda
  vacía. El formulario seguiría a la mitad. **[LEÍDO — especificación CSS Grid]**
- **`grid-cols-1` solo no basta.** La celda deja de robar ancho, pero sigue siendo una caja en el
  flujo debajo del formulario.

Son dos defectos distintos con dos remedios distintos, y por eso el gate los mide por separado (§5,
mutaciones 1 y 2, que caen en asertos diferentes).

### 2.3 `tablet:aspect-square`: comprobado, y NO se copia

En `DashboardHero.tsx:58` existe porque el host del ovillo es `h-full` dentro de un contenedor
`flex ... tablet:items-center`: el ítem no se estira, su altura sería la del contenido (cero) y el
`h-full` no tendría contra qué resolver.

En auth el caso es el otro: es una **celda de rejilla** con un formulario al lado, y el
`align-items` por defecto de un contenedor de rejilla es `stretch`, así que la altura la da la fila
(la tarjeta del formulario). El `h-full` resuelve solo. **Añadir `tablet:aspect-square` cambiaría la
altura de la celda respecto a lo que hay hoy**, que es exactamente lo que la restricción dura
prohíbe. No se copia. **[LEÍDO]**

### 2.4 El `gap`: decidido que NO, y por qué

Las tres rejillas del Dashboard llevan `gap-(--space-4)`. Estas dos no llevan ninguno, y **se quedan
sin él**:

- **De `--bp-tablet` para arriba**, meter un `gap` separaría las dos columnas, que hoy se tocan.
  Eso **cambiaría el diseño que hizo el usuario a mano**, y la restricción dura del encargo dice que
  ahí el resultado tiene que ser idéntico. Un `gap` no es una tokenización, es un cambio de diseño.
- **Por debajo** sólo hay un hijo visible (la celda del ovillo está en `display: none`), así que un
  `gap` no separaría nada de nada.

Conclusión: no aporta en ningún régimen y rompe la restricción en uno. Queda escrito en el JSDoc de
`login/page.tsx` para que no parezca un olvido.

---

## 3. B) `px-20` → token (E12 c)

### 3.1 El token nuevo

`src/app/globals.css`, junto a los demás tokens de layout con motivo propio (el precedente es
`--nav-tab-inset-start`, `globals.css:100`):

```css
  --auth-inset-inline: 80px;
```

Con un comentario de 15 líneas encima que explica: qué es (lo que separa la pareja formulario+ovillo
de los bordes de la ventana en `(auth)`), **por qué no cabe en la escala** (`--space-*` termina en
`--space-12: 48px`), por qué ningún guardrail veía el valor crudo (`PX_LITERAL` busca `<dígitos>px`
y en la utilidad que lo escribía el `px` va delante y significa *padding-inline*) y **por qué sólo
rige desde `--bp-tablet`**.

**Nombre:** nombra lo que significa —el inset lateral de la pantalla de auth—, no su valor.
Encaja con la familia que ya existe: `--nav-account-inset-inline`, `--nav-tab-inset-start`,
`--nav-tab-inset-end`.

### 3.2 Comprobado antes de añadirlo: ¿algún test descubre tokens por regex?

**Sí, uno, y NO le afecta.** `src/shared/ui/breakpoint-tokens.test.ts:45-50` descubre por
`^\s*--<prefijo>-([a-z0-9-]+)\s*:` con los prefijos `bp` y `breakpoint`. `--auth-inset-inline` no
empieza por ninguno de los dos, así que no entra en el inventario literal de
`breakpoint-tokens.test.ts:79-82` y **no hay nada que actualizar ahí**.

Barrido de los otros candidatos **[MEDIDO]** — los cuatro `*.tokens.test.ts`
(`account-band`, `archive-nav`, `dialog.portal`, `skeleton`) usan regex **por nombre exacto**
(`^\s*${name}:\s*([^;]+);`), no por prefijo: leen tokens que nombran, no descubren inventarios.
`no-hardcode.test.ts` **no lee `.css`** (`:52` filtra `\.tsx?$`), así que declarar `80px` en
`globals.css` es exactamente donde el propio guardrail dice que los valores tienen que vivir
(`:10-11`: *"Los VALORES viven sólo en `globals.css`"*).

`canonical-tailwind-classes.test.ts` sí barre `.css` y `.tsx`, y la forma que uso
—`tablet:px-(--auth-inset-inline)`, paréntesis— es la canónica: pasa. **[MEDIDO]**

### 3.3 La restricción dura: idéntico de `--bp-tablet` para arriba

Compilé `globals.css` con postcss + `@tailwindcss/postcss` (misma técnica que
`skeleton.tokens.test.ts` y `globals-css.test.ts`) y comparé las reglas **[MEDIDO]**:

```
.grid-cols-1                          ->  grid-template-columns: repeat(1, minmax(0, 1fr));
.hidden                               ->  display: none;
.tablet\:grid-cols-2                  ->  grid-template-columns: repeat(2, minmax(0, 1fr));
.tablet\:block                        ->  display: block;
.tablet\:px-\(--auth-inset-inline\)   ->  padding-inline: var(--auth-inset-inline);
.grid-cols-2                          ->  grid-template-columns: repeat(2, minmax(0, 1fr));
.px-20                                ->  NO EMITIDO
token --auth-inset-inline             ->  80px
```

Y el orden en el fuente compilado, que es lo que decide quién gana (misma especificidad, un solo
selector de clase cada uno) **[MEDIDO]**:

```
.hidden {                 índice 11560
.grid-cols-1 {            índice 13332
.tablet\:block {          índice 29751
.tablet\:grid-cols-2 {    índice 29862
```

Las variantes van **después**, así que a partir de 768px ganan.

**Cotejo a `>= --bp-tablet`, propiedad por propiedad:**

| propiedad | antes | ahora | ¿igual? |
|---|---|---|---|
| `grid-template-columns` | `repeat(2, minmax(0, 1fr))` (`grid-cols-2`) | `repeat(2, minmax(0, 1fr))` (`tablet:grid-cols-2`) | **sí** |
| `padding-inline` | `calc(var(--spacing) * 20)` = 80px (`px-20`) | `var(--auth-inset-inline)` = 80px | **sí** |
| `display` de la celda | `block` (un `<div>` sin clases) | `block` (`tablet:block`) | **sí** |
| separación entre columnas | ninguna | ninguna (sin `gap`, §2.4) | **sí** |

**Nada me obligó a cambiar el diseño por encima de `--bp-tablet`.** No hay nada que reportar en este
punto. `.px-20` ya no se emite: era su único consumidor en todo el repo.

**[NO MEDIDO]** nada de esto se ha visto en un navegador. Sigue siendo la familia de la regla 4 que
declara la ficha 118: la confirmación visual en móvil real está pendiente y este informe no la
sustituye. Lo que sí queda cerrado es el DOM y el CSS.

---

## 4. C) Deuda 117 — el `data-slot`, y D) los comentarios que mentían

### 4.1 El nombre: `auth-hero`

Adopto la recomendación del explorador **sin cambiarla**, y por sus tres razones, que compruebo:

1. **Es verdad hoy**: media pantalla, en el flujo, junto al formulario, arrastrable
   (`interactive={true}`). Eso es un hero, no un fondo.
2. **Vocabulario ya asentado** (`DashboardHero`, `HERO_PATHS`), y **restaura el eje conceptual**
   *hero = ovillo en el flujo e interactivo* frente a *`bg-3d` = capa fija, decorativa, detrás*.
3. **Desambigua el grep**, y esto lo verifiqué después del cambio **[MEDIDO]** — `data-slot="bg-3d"`
   como selector vivo en `src/` queda **sólo** en `AppShell.tsx:54` y en sus 3 asertos
   (`layout.test.tsx:42`, `dashboard-page.test.tsx:125` y `:145`). Las demás apariciones de la cadena
   en `(auth)` son prosa de comentarios que explican precisamente la distinción.

`AppShell.tsx:54` **no se tocó** y sus 3 asertos **siguen verdes sin haberlos tocado** (§6).

### 4.2 El `aria-hidden` SE QUEDA, y el motivo está en el código

Escrito junto al atributo en `login/page.tsx:65-71` (y en corto en `register/page.tsx`, remitiendo a
él), y repetido en el JSDoc del gate de login en `auth-pages.test.tsx`:

> `AsciiYarn` ya es `aria-hidden` incondicional (`AsciiYarn.tsx:59`), pero en `auth-pages.test.tsx`
> el componente está doblado por un `<span>` pelado que no reproduce ninguno de sus atributos, así
> que el `aria-hidden` del envoltorio es **el único asidero que el gate tiene** para comprobar que la
> pieza es decorativa. Quitarlo pondría 2 gates en rojo **por artefacto del doble, no por
> accesibilidad**.

Es la opción (a) del §3.3 del `explore_deuda117`, no la (b) que el explorador recomendaba. **La
decisión es del líder y está en el encargo**; lo que aporto es dejar el motivo escrito donde se lee,
que era el riesgo real (que alguien lo "limpie" dentro de tres meses).

También fuera el `className=""` de las dos páginas: una prop que sólo emitía `class=""`.

### 4.3 Los tres comentarios huérfanos, reescritos citando E12

| Archivo | Decía | Dice ahora |
|---|---|---|
| `register/page.tsx:11` | *"Sin ovillo de fondo: el RFC-01 §2 lo reserva para login"* — **tres líneas antes de montarlo** | Que **sí** lleva ovillo, que la asimetría de #31 quedó derogada por `bdb11b0`, que no es capa de fondo sino celda de rejilla (E12 d) y cómo es la rejilla (E12 a, b) |
| `login/page.tsx:18-21` | *"decorativo, fuera del árbol accesible, **sin capturar el puntero** y **por detrás del contenido**"* | Que es una celda en el flujo, que **sí** captura el puntero y por qué eso no le roba clics al formulario (vive en otra columna), y por qué el slot se llama `auth-hero` |
| `(auth)/layout.tsx:8-9` | *"quien declara el posicionamiento relativo del que se cuelga el ovillo ASCII"* | Que el `relative` **ya no ancla nada** desde `bdb11b0`, que se conserva como contexto de posicionamiento del `main`, y que el inset lateral es cosa de las páginas |

---

## 5. E) EL GATE — `src/app/yarn-host-responsive.test.ts`

### 5.1 Dónde vive y por qué ahí

Los guardrails transversales del repo viven en `src/shared/ui/` (`no-hardcode`, `breakpoint-tokens`,
`canonical-tailwind-classes`), **pero ese árbol está fuera del alcance de este encargo**. El
precedente que sí puedo usar es `src/app/globals-css.test.ts`: un guardrail de repo entero, que
compila `globals.css` con postcss, y que vive en `src/app/`. Sigo ese.

### 5.2 El invariante

> **Todo sitio que aloje un ovillo apaga su hueco por debajo de `--bp-tablet`**, y el contenedor de
> ese hueco no le reserva una pista propia a ese ancho.

### 5.3 Requisito 1 — llega al CSS compilado, no se queda en los nombres de clase

Se compila `globals.css` con `postcss([tailwindcss()])` en un `beforeAll` (timeout explícito de
120s, como los dos precedentes) y se asierta sobre la salida:

- La media query se emite, y **su ancho no se escribe a mano**: se lee `--bp-tablet` de
  `globals.css` y se arma el preludio. Es el **mismo token** que `useViewportSupports3d` consulta con
  `matchMedia`, así que el gate ata el CSS al runtime.
- `hidden` compila de verdad a `display: none`.
- **Cada variante `tablet:` que usan los anfitriones descubiertos y sus contenedores** tiene que
  aparecer dentro del cuerpo de esa media query. Las clases **no se enumeran**: salen del
  descubrimiento (hoy son 7, y una de ellas —`tablet:aspect-square`— viene del Dashboard, no de auth).

Esto es la REGLA 7 y es lo que la mutación 5 demuestra que hacía falta.

### 5.4 Requisito 2 — los consumidores se descubren

Recorrido de `src/**/*.tsx` (sin tests). Para cada `<AsciiYarn` se resuelve **el elemento que lo
aloja** leyendo la estructura JSX con una pila de etiquetas. Dos casos:

- **Anfitrión en el mismo archivo** (login, register, DashboardHero): el elemento que lo envuelve.
- **Entrega por prop** (`AppShellClient.tsx:82` pasa `background={<AsciiYarn />}` a `<AppShell>`):
  el gate detecta que el ovillo cae **dentro de las props de un componente**, lee **por qué prop** se
  entrega, abre el archivo de ese componente y busca dónde pinta la prop. Resuelve a
  `AppShell.tsx:52-58`. Si cualquiera de esos pasos falla, **lanza** — no pasa de largo en verde.

**Exención por estar fuera del flujo, y por qué no es una allowlist.** El invariante habla de
espacio reservado. Un anfitrión posicionado `fixed`/`absolute` no reserva ni un píxel, así que no
puede dejar hueco. La exención **se deriva de sus clases reales**, exactamente como
`account-band.tokens.test.ts` decide si la banda va en el flujo o superpuesta (corrección a E11(c)).
No hay ninguna lista de nombres perdonados: el día que alguien meta la capa del `AppShell` en el
flujo, cae aquí sola.

### 5.5 Requisito 3 — ancla anti-descubrimiento-roto

Molde de `breakpoint-tokens.test.ts:79-82`. Dos anclas, porque hay dos formas de colapsar en verde:

```ts
expect(HOSTS.map(h => `${h.siteFile} → ${h.hostFile} <${h.hostTag}>`)).toEqual([
  "app/(auth)/login/page.tsx → app/(auth)/login/page.tsx <div>",
  "app/(auth)/register/page.tsx → app/(auth)/register/page.tsx <div>",
  "features/auth/ui/AppShellClient.tsx → shared/ui/layout/app-shell/AppShell.tsx <div>",
  "features/dashboard/ui/DashboardHero.tsx → features/dashboard/ui/DashboardHero.tsx <div>",
]);
```

…y una segunda que ancla **la clasificación** (3 en el flujo, 1 fuera): si la lectura de clases
dejara de funcionar, todos caerían del mismo lado y no quedaría ni un caso que comprobar.

**Sin números de línea a propósito**: un comentario de más no debe poner el ancla en rojo. Lo que se
protege es *qué archivos alojan un ovillo y quién resulta ser el anfitrión*, incluida la resolución a
través de la prop del caparazón, que es la parte más frágil del recorrido.

### 5.6 Requisito 4 — ¿algún consumidor NO conforme?

**No. Ninguno.** Los cuatro consumidores descubiertos cumplen:

| Consumidor | Anfitrión | Veredicto |
|---|---|---|
| `app/(auth)/login/page.tsx` | su propio `<div>`, `hidden tablet:block` | conforme (este encargo) |
| `app/(auth)/register/page.tsx` | su propio `<div>`, `hidden tablet:block` | conforme (este encargo) |
| `features/dashboard/ui/DashboardHero.tsx` | su propio `<div>`, `hidden … tablet:block tablet:aspect-square` | **ya era conforme** — sólo que nada lo vigilaba |
| `features/auth/ui/AppShellClient.tsx` | `AppShell.tsx:52`, `pointer-events-none fixed inset-0 …` | **fuera de flujo**: no reserva espacio |

Y los tres contenedores de huecos en el flujo pasan la comprobación de "no reparte el ancho en la
base": los dos de auth son `grid-cols-1` y el del Dashboard es `flex flex-col` (su `tablet:flex-row`
sí está bajo variante). **No hice falta parar: no hay nada que reportar por este flanco.**

---

## 6. REGLA 3 — condición doble, seis mutaciones, una cosa por vez

**Método** (copiado de `impl_fix_register_ovillo.md` §3): copia byte a byte al scratchpad **antes**
de mutar, con suma de control; mutación en sitio con un sustituidor literal que **aborta si el texto
buscado no aparece exactamente una vez**; restauración desde la copia; verificación por `md5sum` +
`cmp` + `git diff` **acotado** (el árbol venía sucio de partida, así que un `git diff` global no
prueba nada).

Sumas de control de partida **[MEDIDO]**:

```
4589cb95bfa582d6307ff752cf528837 *src/app/(auth)/login/page.tsx
a73f291245d9100b10d4dddfe4f972c5 *src/app/(auth)/register/page.tsx
8dda0bf2b93062f280557d24caec6f8b *src/features/dashboard/ui/DashboardHero.tsx
b06c2f744d680e9004b297892b6ba5ae *src/app/globals.css
```
(idénticas a las cuatro copias del scratchpad.)

### Mutación 1 — login pierde el apagado del hueco

`className="hidden tablet:block"` → `className=""` (el estado exacto de antes del arreglo).

```
     × app/(auth)/login/page.tsx:73 apaga su hueco 5ms
AssertionError: el anfitrión de app/(auth)/login/page.tsx:73 (app/(auth)/login/page.tsx) no se apaga
por debajo de --bp-tablet: el ovillo no se monta ahí, pero su hueco se queda.: expected [] to include 'hidden'

 Test Files  1 failed (1)
      Tests  1 failed | 19 passed (20)
VITEST_EXIT=1
```

### Mutación 2 — la rejilla de login vuelve a dos columnas en la base

`grid-cols-1 tablet:grid-cols-2` → `grid-cols-2` (con la celda **todavía** `hidden tablet:block`).

```
     × app/(auth)/login/page.tsx:73 no tiene su hueco en un contenedor de dos columnas en la base 8ms
AssertionError: el contenedor del hueco de app/(auth)/login/page.tsx:73 reparte el ancho ya en la base:
por debajo de --bp-tablet el ovillo no está, pero su mitad sí.: expected [ 'grid-cols-2' ] to deeply equal []

 Test Files  1 failed (1)
      Tests  1 failed | 19 passed (20)
VITEST_EXIT=1
```

> **1 y 2 juntas son la prueba de §2.2**: cae un aserto **distinto** en cada una. Los dos remedios se
> miden por separado y ninguno viaja de gorra detrás del otro.

### Mutación 3 — el precedente sin gate: `DashboardHero` pierde su variante

`hidden w-full max-w-sm shrink-0 tablet:block tablet:aspect-square` → `w-full max-w-sm shrink-0`.
Es **exactamente el borrado que hoy dejaba la suite entera verde**.

```
     × features/dashboard/ui/DashboardHero.tsx:59 apaga su hueco 3ms
AssertionError: el anfitrión de features/dashboard/ui/DashboardHero.tsx:59 …: expected
[ 'w-full', 'max-w-sm', 'shrink-0' ] to include 'hidden'

 Test Files  1 failed (1)
      Tests  1 failed | 18 passed (19)
VITEST_EXIT=1
```

> Nótese que el total baja de 20 a **19**: al desaparecer `tablet:aspect-square` del código, el bucle
> genera un caso menos. Es la prueba en vivo de que **la lista de variantes se descubre y no se
> enumera** (§5.3).
>
> Y es el resultado que más importa del lote: **el gate cubre el Dashboard sin nombrarlo.**
> Se descubre solo porque aloja un ovillo. El archivo `DashboardHero.tsx` **no se modificó**
> (`git diff --stat` acotado, vacío).

### Mutación 4 — el inset lateral vuelve a regir también en móvil

`tablet:px-(--auth-inset-inline)` → `px-(--auth-inset-inline)` en register.

```
     × las páginas de auth lo consumen sólo desde --bp-tablet 6ms
AssertionError: el inset lateral de auth se aplica también por debajo de --bp-tablet: …

 Test Files  1 failed (1)
      Tests  1 failed | 19 passed (20)
VITEST_EXIT=1
```

### Mutación 5 — REGLA 7: las clases quedan intactas y dejan de compilar

Se comenta `--breakpoint-tablet: 768px;` en `globals.css`. **Ni una sola clase del JSX cambia.**
Es la simulación exacta del error que describe E12(b): la variante existe escrita y no genera nada.

```
 Test Files  1 failed (1)
      Tests  8 failed | 12 passed (20)
VITEST_EXIT=1
```

Reparto literal de los 20, con `--reporter=verbose` **[MEDIDO]**:

```
 ✓ … encuentra los cuatro ovillos que hay hoy y a quién los aloja
 ✓ … clasifica tres anfitriones en el flujo y uno fuera de él
 ✓ … app/(auth)/login/page.tsx:73 apaga su hueco
 ✓ … app/(auth)/register/page.tsx:35 apaga su hueco
 ✓ … features/dashboard/ui/DashboardHero.tsx:59 apaga su hueco
 ✓ … app/(auth)/login/page.tsx:73 no tiene su hueco en un contenedor de dos columnas en la base
 ✓ … app/(auth)/register/page.tsx:35 no tiene su hueco en un contenedor de dos columnas en la base
 ✓ … features/dashboard/ui/DashboardHero.tsx:59 no tiene su hueco en un contenedor de dos columnas en la base
 × … la media query de tablet se emite con el ancho de --bp-tablet
 ✓ … apagar el hueco compila de verdad a display:none
 ✓ … hay variantes de tablet que comprobar
 × … tablet:aspect-square genera una regla dentro de la media query de tablet
 × … tablet:block genera una regla dentro de la media query de tablet
 × … tablet:flex-row genera una regla dentro de la media query de tablet
 × … tablet:grid-cols-2 genera una regla dentro de la media query de tablet
 × … tablet:items-center genera una regla dentro de la media query de tablet
 × … tablet:justify-between genera una regla dentro de la media query de tablet
 × … tablet:px-(--auth-inset-inline) genera una regla dentro de la media query de tablet
 ✓ … el token existe en globals.css y llega al CSS compilado
 ✓ … las páginas de auth lo consumen sólo desde --bp-tablet
```

> **Éste es el resultado que justifica el requisito 1 del encargo.** Con la capa responsive de la app
> entera muerta, los **seis** asertos que leen nombres de clase siguen en **verde**. Un gate que se
> hubiera quedado en los nombres de clase habría certificado como sana una app rota. Sólo la mitad
> que mide el CSS compilado ve el fallo.
>
> (Este cambio también pondría en rojo `breakpoint-tokens.test.ts`, que es otro archivo y no forma
> parte de esta cuenta: la corrí en aislamiento a propósito.)

### Mutación 6 — el ancla anti-descubrimiento-roto

Se borra la línea `<AsciiYarn interactive={true} />` de register (el envoltorio se queda).

```
     × encuentra los cuatro ovillos que hay hoy y a quién los aloja 9ms
     × clasifica tres anfitriones en el flujo y uno fuera de él 1ms

 Test Files  1 failed (1)
      Tests  2 failed | 16 passed (18)
VITEST_EXIT=1
```

> El total baja de 20 a **18** —dos casos generados de menos— y son **exactamente** los dos que
> desaparecerían en silencio si no existiera el ancla. Sin ella, un descubrimiento que se rompiera
> del todo daría 0 casos y **verde**.

### Restauración, verificada

```
CMP_OK identico: src/app/(auth)/login/page.tsx
CMP_OK identico: src/app/(auth)/register/page.tsx
CMP_OK identico: src/features/dashboard/ui/DashboardHero.tsx
CMP_OK identico: src/app/globals.css
--- git diff acotado a DashboardHero (debe estar vacio) ---
(vacío)
```

**Verde de vuelta, con todo restaurado [MEDIDO]:** `Test Files 1 passed (1) · Tests 20 passed (20)`.

---

## 7. Que los gates del caparazón siguen verdes SIN tocarlos

`pnpm vitest run` sobre los tres archivos que agarran por `data-slot`, más los cuatro guardrails que
podía haber movido **[MEDIDO]**:

```
$ pnpm vitest run "src/app/(auth)/auth-pages.test.tsx" "src/shared/ui/layout/layout.test.tsx" \
    "src/app/(app)/dashboard-page.test.tsx" src/shared/ui/no-hardcode.test.ts \
    src/shared/ui/canonical-tailwind-classes.test.ts src/shared/ui/breakpoint-tokens.test.ts \
    src/app/globals-css.test.ts

 Test Files  7 passed (7)
      Tests  515 passed (515)
EXIT=0
```

`layout.test.tsx:42`, `dashboard-page.test.tsx:125` y `:145` **no se editaron** y pasan.

---

## 8. Verificación final

### `bash ./init.sh` — sin tubería

```
EXIT=0

[OK]    lint verde
[OK]    typecheck verde

 Test Files  70 passed | 3 skipped (73)
      Tests  1220 passed | 13 skipped (1233)
   Duration  62.71s

[OK]    Entorno listo. Puedes empezar a trabajar.
```

| | baseline | final | delta |
|---|---|---|---|
| archivos de test | 69 passed / 3 skipped (72) | 70 passed / 3 skipped (73) | **+1** (el gate) |
| tests | 1200 passed / 13 skipped (1213) | 1220 passed / 13 skipped (1233) | **+20** |
| exit | 0 | 0 | — |

Los +20 son exactamente los del gate nuevo. **Cero regresiones, cero tests silenciados.**

### `pnpm build`

```
BUILD_EXIT=0
```

Las 27 rutas compilan. `/login` sigue dinámica (`ƒ`) y `/register` estática (`○`), igual que antes:
el cambio es de clases y de un `data-slot`, no de estrategia de render.

`git status` tras el build **[MEDIDO]**: no aparecen archivos nuevos ni `next-env.d.ts` reescrito en
el árbol de trabajo (`D next-env.d.ts` staged es la deuda 119, del líder, y no la toqué).

---

## 9. Lo que dejo abierto

1. **La pantalla delante, que sigue sin verse.** Todo lo de arriba es DOM y CSS compilado. **[NO
   MEDIDO]** en navegador: no comprobé visualmente el resultado a 390px ni que a 768px+ el diseño sea
   pixel a pixel el de hoy. La ficha 118 es de la familia de la regla 4 y ese requisito sigue vivo.
   El cotejo propiedad-por-propiedad de §3.3 es lo más cerca que se puede llegar sin abrir un
   navegador, y no es lo mismo.
2. **`postcss` sigue siendo dependencia fantasma.** Mi gate es el **tercer** archivo de `src/` que la
   importa sin que esté declarada en `package.json`. Está fichado y explícitamente fuera de este
   encargo, así que no lo toqué — pero **he subido de dos a tres los archivos que se caen en un clon
   limpio**. Conviene saberlo al priorizar esa ficha.
3. **El gate vive en `src/app/`, no con sus hermanos.** Es un guardrail transversal (mide el
   Dashboard) alojado bajo `src/app/` porque `src/shared/ui/**` estaba fuera de alcance. Tiene el
   precedente de `globals-css.test.ts`, pero si alguien reordena los guardrails, su sitio natural
   probablemente sea `src/shared/ui/`.
4. **El lector de JSX del gate no es un parser.** Se apoya en que el fuente pasa por Prettier (toda
   etiqueta de apertura empieza una línea, su `>` termina otra). Es una suposición cierta hoy y
   verificada por las dos anclas, pero es una suposición. Si algún día el formateo cambia, el ancla
   caerá — que es el comportamiento correcto, pero el arreglo será reescribir el lector.
5. **`interactive={true}` en el ovillo de auth sigue sin vigilancia.** E12 lo deja fuera a propósito
   y lo ficha. Mi gate no lo mide.
6. **Los cuatro breakpoints de fábrica de Tailwind siguen disponibles** (`40rem`…`96rem`, medidos de
   nuevo hoy en los preludios del compilado). Nadie los usa, pero nada impide escribir uno y saltarse
   el sistema de tokens. No es de este lote; queda anotado por segunda vez.
7. **Los tres paneles del Dashboard** (`ActiveProjectsPanel.tsx:112` y `:148`,
   `MetricsPanel.tsx:89`) siguen **sin gate**: mi invariante sólo alcanza a los contenedores que
   alojan un ovillo, y esos no alojan ninguno. Son rejillas responsive conformes hoy y borrables sin
   que nada avise. Es el mismo hueco de método un piso más allá, y no cabía en este encargo.
8. **Una fila para `data-slot` en `docs/harness/conventions.md`** (kebab-case, nombra la pieza, lo
   pone el componente dueño) sigue sin escribirse. El explorador de la 117 la recomendaba como
   oportunidad barata; es carril de documentación, no mío.

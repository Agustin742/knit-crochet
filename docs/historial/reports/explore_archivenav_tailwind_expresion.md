# explore — cómo expresar el modelo "fichero" (D4) en Tailwind v4 + tokens, sin hardcode

> **Método:** compilación real con `postcss` + `@tailwindcss/postcss@4.3.3` (el mismo paquete que usa
> `src/app/globals-css.test.ts`), vía `@import "tailwindcss" source(none)` + `@source inline("<clase>")`.
> Los archivos de prueba vivieron fuera de `src/**` (raíz del repo, prefijo `_scratch_`) y en el
> scratchpad de esta sesión; **se borraron todos** al terminar (`git status` verificado limpio).
> No se editó ningún archivo de `src/**`.

---

## 0. Corrección de partida: sólo hacen falta 2 ejes por índice, no 3

El encargo pedía verificar z-index, offset-x y "posiblemente un tono" por índice de hoja (0..5). Releyendo
D4 con cuidado, el **tono queda derogado**: la invariante 9 dice explícitamente *"la profundidad la da la
sombra hacia arriba, **no un escalón tonal** ni un borde"*, y la tabla de comparación de
`explore_softglossary_register.md` §6 confirma que la referencia no tiene escalón tonal (`--folder-tone-1..6`
es precisamente lo que hoy sobra). Así que por índice sólo hacen falta:

1. **z-index** (activa/primera = más alto, decrece hacia arriba).
2. **offset horizontal de la pestaña** (x creciente, sin solape).

La altura de la hoja (10px) y la sombra son **iguales para las 6** (no varían por índice); sólo cambian
entre estado base/hover.

---

## 1. Sintaxis canónica confirmada (tabla + CSS emitido real)

Todas las formas de abajo se compilaron. Tokens de prueba declarados en un `@theme` aislado (no en
`globals.css` real) para no depender de que existan todavía.

| Intención | Clase a escribir | ¿Convertible/paréntesis? | CSS emitido (verbatim) |
|---|---|---|---|
| z-index por token | `z-(--z-nav-leaf-1)` | Sí, ya en uso en el repo | `z-index: var(--z-nav-leaf-1);` |
| height por token | `h-(--nav-leaf-height)` | Sí | `height: var(--nav-leaf-height);` |
| margin-bottom por token | `mb-(--nav-leaf-gap)` | Sí | `margin-bottom: var(--nav-leaf-gap);` |
| margin-left por token | `ml-(--nav-tab-offset-2)` | Sí | `margin-left: var(--nav-tab-offset-2);` |
| variante hover + token | `hover:h-(--nav-leaf-height)` | Sí | `@media (hover: hover) { .hover\:h-(...):hover { height: var(--nav-leaf-height); } }` |
| order por índice | `order-1` … `order-6` | Ya literal (core), sin token | `order: 1;` … `order: 6;` |
| grid, 6 columnas | `grid` + `grid-cols-6` | Ya literal (core) | `display:grid;` / `grid-template-columns: repeat(6, minmax(0, 1fr));` |
| columna por índice | `col-start-1` … `col-start-6` | Ya literal (core), sin token | `grid-column-start: 1;` … `6;` |
| duración por token | `duration-(--dur-base)` | Sí (ya en uso) | `--tw-duration: var(--dur-base); transition-duration: var(--dur-base);` |
| easing por token con namespace propio | `ease-entrance` | **Literal directo**, no `ease-(--x)` | `--tw-ease: var(--ease-entrance); transition-timing-function: var(--ease-entrance);` |
| lista de propiedades a transicionar | `transition-[height,margin-bottom]` | Propiedad arbitraria (no hay var, no aplica la regla canónica) | `transition-property: height,margin-bottom; transition-timing-function: var(--tw-ease, ...); transition-duration: var(--tw-duration, ...);` |
| drop-shadow con offsets por token | `[filter:drop-shadow(var(--shadow-nav-leaf))]` | **Excepción ya documentada** (variable envuelta en función) | `filter: drop-shadow(var(--shadow-nav-leaf));` |

`ease-entrance` no es un caso especial: Tailwind v4 genera utilidades literales `ease-*` directamente desde
las claves `--ease-*` de `@theme` (mismo mecanismo que `--font-*` → `font-*`). Por eso ya aparece como clase
literal en `folderVariants` actual sin corchetes ni paréntesis — no hace falta "inventar" nada nuevo, sólo
mantener el patrón.

---

## 2. El hallazgo más valioso: `drop-shadow-(--token)` **no es equivalente** a la forma actual

Confirmado compilando ambas formas una al lado de la otra con el mismo token:

```css
/* drop-shadow-(--shadow-nav-leaf)  ← utilidad "canónica" de Tailwind */
.drop-shadow-\(--shadow-nav-leaf\) {
  --tw-drop-shadow-size: drop-shadow(var(--shadow-nav-leaf));
  --tw-drop-shadow: var(--tw-drop-shadow-size);
  filter: var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,)
    var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,) var(--tw-drop-shadow,);
}

/* [filter:drop-shadow(var(--shadow-nav-leaf))]  ← propiedad arbitraria */
.\[filter\:drop-shadow\(var\(--shadow-nav-leaf\)\)\] {
  filter: drop-shadow(var(--shadow-nav-leaf));
}
```

**No conviertas** `[filter:drop-shadow(var(--token))]` a `drop-shadow-(--token)`: cambia por completo la
declaración `filter` (de una función sola a una cadena de 9 variables internas de Tailwind). Esto coincide
con lo que ya había verificado `impl_canonical_tailwind_syntax.md` §5 para `--shadow-paper` — lo confirmo
aquí de nuevo con el token nuevo (`--shadow-nav-leaf`) para no "opinar sin probar". **Sigue el patrón que ya
usa `folderVariants`**: `[filter:drop-shadow(var(--token))]` en base, `hover:[filter:drop-shadow(var(--token))]`
en hover. El guardrail `canonical-tailwind-classes.test.ts` ya tiene esta forma exacta en su tabla de
excepciones ("variable envuelta en una función CSS"), así que no la va a marcar.

---

## 3. El hallazgo #2: `order` **no** es paint-order — no reemplaza al z-index

Esto es lo que hace inservible copiar literalmente `.register-card-1 { order: 2; z-index: 40 }` de la
referencia (y es justo lo que `explore_softglossary_register.md` §5.1 ya advertía sin explicar el porqué
técnico). Verificación:

- `order` en flex/grid **sólo cambia la posición de layout**. No afecta el orden de pintado.
- El orden de pintado de hermanos con `z-index: auto` sigue siendo **el orden del DOM**, sin importar `order`.

Consecuencia práctica: si usás `order-N` para acomodar las 6 hojas visualmente pero dejás el DOM en el
orden natural del array `NAV_ITEMS`, **el z-index correcto no sale gratis** — vas a necesitar igual un
z-index explícito por hoja. La reordenación por `order` y la profundidad por z-index son **dos problemas
independientes**; la referencia los resuelve por separado (por eso tiene ambas reglas), y nosotros también
deberíamos.

### Corolario con más jugo: si NO usás `order` y en cambio invertís el DOM, el z-index sale gratis

Como cada hoja va a llevar `filter: drop-shadow(...)` **siempre** (invariante 9: la sombra está puesta en
todo momento, no sólo en hover), cada hoja **ya es su propio stacking context** (`filter` crea uno). Entre
stacking contexts hermanos con `z-index: auto`, el orden de pintado es el orden del DOM. Si el contenedor es
`flex-direction: column` (normal, sin `order`) y el DOM se recorre **en orden inverso** (`items.slice().reverse()`,
o sea la hoja activa/índice 0 es el **último** hijo del DOM), entonces:

- Visualmente el índice 0 queda **abajo** (último hijo de una columna) — correcto.
- Al ser el último en el DOM, **pinta encima de los demás sin ningún z-index autorizado** — correcto.

Esto elimina por completo la necesidad de tokens de z-index por índice. Lo dejo documentado como **opción
A** (cero tokens, depende de un detalle de CSS no obvio, hay que comentarlo en el código si se usa) frente a
la **opción B**: un mapa `cva` de 6 z-index literales (ver §5), que es más explícito/depurable y sigue al
pie de la letra el patrón que ya existe en `folderSurfaceVariants`. D4 deja la decisión al implementer
("consíguelo como sea más limpio en nuestro markup"); documento ambas, verificadas.

---

## 4. Offset horizontal de la pestaña: Grid vs. mapa de tokens

Dos formas verificadas, ambas canónicas:

**Opción A — CSS Grid (recomendada, cero tokens nuevos).** El contenedor de pestañas usa `grid grid-cols-6`
y cada pestaña se coloca con `col-start-{index+1}` (literal, ya confirmado arriba). El ancho de cada columna
sale de dividir el ancho disponible entre 6 automáticamente — es "derivado", no 6 números a mano (invariante
7), y no exige declarar ni un solo token de offset. Alineación dentro de cada columna con `justify-self-*`
(también literal, confirmado: `justify-self-start` → `justify-self: flex-start;`).

**Opción B — mapa de 6 tokens de `margin-left`,** igual que `folderSurfaceVariants` hace con el tono:

```ts
export const tabOffsetVariants = cva("", {
  variants: {
    index: {
      1: "ml-(--nav-tab-offset-1)",
      2: "ml-(--nav-tab-offset-2)",
      // … hasta 6
    },
  },
});
```

Ambas compilan limpio (`ml-(--nav-tab-offset-2)` → `margin-left: var(--nav-tab-offset-2);`, verificado en
§1). La opción B es más manual (6 tokens nuevos con valores en px que alguien tiene que calcular para que
no se toquen) y menos "derivado de tokens" en espíritu que la opción A. Recomiendo A; dejo B documentada
porque sigue el precedente literal de `folderTone` que el repo ya usa y podría preferirse por consistencia
de patrón.

---

## 5. `style={{ ... }}` inline: no hace falta, y no hay precedente

Grep de `style={{` en `src/**`: **cero resultados**. `no-hardcode.test.ts` no prohíbe `style` explícitamente
(sólo barre regex de hex/rgb/px crudos), pero **todo lo que hace falta expresar (z-index, height,
margin-bottom, margin-left, drop-shadow, order/col-start) tiene forma canónica de clase de Tailwind
verificada arriba**. No hay ningún valor que *sólo* se pueda expresar con `style` + custom property. Dado
que `conventions.md` exige `cva` para variantes ("nada de concatenar strings de clases a mano") y que un
mapa `cva` de 6 entradas literales es exactamente el patrón que ya usa `folderSurfaceVariants`/`folderTone`,
**la recomendación es no introducir `style` inline**: mantiene el componente auditable por los guardrails
existentes (`no-hardcode.test.ts`, `canonical-tailwind-classes.test.ts`), que sólo saben leer `className`.

---

## 6. Hover sin reflow: combinación verificada

```
h-(--nav-leaf-height) mb-0
transition-[height,margin-bottom] duration-(--dur-base) ease-entrance
hover:h-(--nav-leaf-height-hover) hover:mb-(--nav-leaf-gap-hover)
```

Con `--nav-leaf-height: 10px`, `--nav-leaf-height-hover: 2px`, `--nav-leaf-gap-hover: 8px`: 2 + 8 = 10, el
alto total no cambia (invariante 8). Todos los valores son literales (sin `calc()`, sin signo), así que caen
en el caso simple ya verificado (§1) — nada de esto activa las excepciones de `calc()`.

**Orden de las declaraciones importa y ya está resuelto por Tailwind.** Compilé las 4 clases juntas: en la
salida, `.duration-(--dur-base)` y `.ease-entrance` aparecen **después** de
`.transition-[height,margin-bottom]` en la capa `@layer utilities`, así que su `transition-duration`/
`transition-timing-function` (declarados directo, no vía `--tw-duration`) ganan por orden de cascada sobre
los defaults que pone la clase de `transition-property`. No hace falta preocuparse por el orden en que se
escriben las clases en el `className` (Tailwind ordena la capa de utilidades de forma determinista, no por
orden de aparición en el string).

**Degradación con `prefers-reduced-motion`:** no hace falta nada especial en el componente. `globals.css`
línea 226-234 ya tiene la regla global:

```css
@media (prefers-reduced-motion: reduce) {
  *, ::before, ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

`!important` sobre `transition-duration` aplasta cualquier duración por token que pongamos, exactamente
igual que ya degrada el hover de `folderVariants` hoy. Cero trabajo adicional, mismo mecanismo.

---

## 7. Tokens nuevos propuestos para `@theme` (`src/app/globals.css`)

| Token nuevo | Valor sugerido | Por qué |
|---|---|---|
| `--nav-leaf-height` | `10px` | Canto visible de cada hoja en reposo. Medido 1:1 de la referencia (§3 de `explore_softglossary_register.md`); 6×10px + tab ≈ 100px cabe en `--nav-height: 104px` (sin cambiarlo). |
| `--nav-leaf-height-hover` | `2px` | Alto de la hoja al pasar el mouse (se adelgaza). |
| `--nav-leaf-gap-hover` | `8px` | `margin-bottom` que aparece en hover; compensa exactamente con el delta de altura (10 − 2 = 8) para hover sin reflow. |
| `--shadow-nav-leaf` | `6px -5px 7px rgba(0, 0, 0, 0.06)` | Sombra hacia **arriba** (y negativa) y muy tenue, medida literal de la referencia (§2). Sustituye a `--shadow-folder-hover`, que tiene el signo de `y` invertido (`7px`, no `-5px`) y alpha demasiado alta (`.5` vs `.06`) — es justo el bug que documenta §6 de `explore_softglossary_register.md`. |
| `--z-nav-leaf-1` … `--z-nav-leaf-6` | `6, 5, 4, 3, 2, 1` (local a la stacking context del `<header>`, que ya tiene `z-(--z-nav)`) | Sólo si se elige la **opción B** de z-index explícito (§3). Si se elige la opción A (DOM invertido), no hacen falta. |
| `--nav-tab-offset-1` … `--nav-tab-offset-6` | 6 valores en `rem`/`px` que reparten el ancho disponible | Sólo si se elige la **opción B** de offset (§4). Con la opción A (`grid-cols-6` + `col-start-N`) no hacen falta — recomendado por eso. |

### Tokens que quedan obsoletos (D4 los deroga)

| Token actual | Por qué queda obsoleto |
|---|---|
| `--folder-tone-1` … `--folder-tone-6` | Invariante 9: la profundidad la da la sombra, no un escalón tonal. Confirmado además que el delta entre tonos era "invisible" (`explore_softglossary_register.md` §6). |
| `--folder-overlap` (`16px`) | Era el `margin-left` negativo del modelo de fila solapada (`.kc-folder + .kc-folder`), derogado por D4. |
| `--folder-lift` (`6px`) | Era el `translateY` del hover viejo; D4 exige `height`+`margin-bottom`, no `translateY` (invariante 8). |
| `--folder-body-height` / `--folder-body-height-active` (`22px`/`34px`) | Dos alturas por estado activo/inactivo del modelo de fila; el modelo fichero tiene una sola altura de hoja (10px) igual para las 6, y un estado hover (2px) también igual para las 6 — no depende de si es la activa. |
| `--shadow-folder-hover` | Signo de sombra invertido respecto a la referencia medida (ver tabla de arriba); se reemplaza por `--shadow-nav-leaf`. |

`--shadow-paper` (sombra base actual, `4px 2px 4px rgba(0,0,0,.35)`) también tiene el mismo problema de
signo/alpha que `--shadow-folder-hover` — probablemente conviene unificar ambos estados (base y hover) bajo
`--shadow-nav-leaf` con una segunda variable `--shadow-nav-leaf-hover` si se quiere una sombra ligeramente
distinta al pasar el mouse, o reutilizar el mismo token para ambos estados si no. Dejo la decisión de si hay
uno o dos tokens de sombra al implementer; lo que sí está verificado es que **el signo de `y` tiene que ser
negativo** y el `filter` tiene que escribirse como propiedad arbitraria (`[filter:drop-shadow(var(--token))]`),
nunca como `drop-shadow-(--token)` (§2).

---

## 8. Resumen accionable

1. **z-index por índice:** mapa `cva` de 6 entradas `z-(--z-nav-leaf-N)` (patrón `folderTone`) **o** invertir
   el orden del DOM y no declarar z-index en absoluto (ambas verificadas; ver §3).
2. **offset de pestaña por índice:** `grid grid-cols-6` + `col-start-{index+1}` (cero tokens, recomendado) **o**
   mapa `cva` de 6 `ml-(--nav-tab-offset-N)` (ver §4).
3. **Tono por índice:** no hace falta — D4 lo deroga explícitamente.
4. **Sombra:** siempre `[filter:drop-shadow(var(--token))]`, nunca `drop-shadow-(--token)` (§2, verificado
   que NO son equivalentes).
5. **Hover sin reflow:** `h-(--nav-leaf-height) mb-0` → `hover:h-(--nav-leaf-height-hover)
   hover:mb-(--nav-leaf-gap-hover)`, con `transition-[height,margin-bottom] duration-(--dur-base)
   ease-entrance`. Degrada solo vía la regla global de `prefers-reduced-motion` ya existente.
6. **`style` inline:** no hace falta y no hay precedente; todo tiene forma de clase canónica.
7. **`--nav-height: 104px` no cambia** — la cuenta ya cierra (6×10px + pestaña ≈ 100px).

Ningún archivo de `src/**` fue modificado. No quedan archivos temporales (verificado con `git status`).

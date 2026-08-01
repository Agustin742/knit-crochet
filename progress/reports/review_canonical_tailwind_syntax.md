# Review — refactor "sintaxis canónica de variables en Tailwind v4"

> No es una feature de `feature_list.json`. Verificado que **ningún `status` cambió** por este
> trabajo (14 `done` / 17 `pending` / 0 `in_progress`; el único diff de `feature_list.json` vs.
> HEAD es el cierre de #14 `ascii_yarn`, de la sesión anterior).

**Veredicto: APPROVED**

El riesgo específico del encargo —que una conversión mal hecha emita **CSS distinto o ningún CSS,
en silencio**— **no se materializó**. Lo verifiqué por mi cuenta con tres pruebas independientes
(clase por clase contra el CSS emitido, par viejo/nuevo en aislamiento, y compilación completa
antes/después), más el bundle de producción. Todos los hallazgos de abajo son menores y **ninguno
bloquea**.

---

## 1. Verificación propia (no me apoyé en la del implementer)

Herramienta: `postcss` + `@tailwindcss/postcss` sobre `src/app/globals.css`, la misma técnica de
`src/app/globals-css.test.ts`. Scripts temporales fuera del repo; **no se editó código de la app**
y no quedaron artefactos (`git status` limpio de temporales, `.next` no se borró).

### 1.1 Toda clase convertida emite la declaración esperada (45/45)

Barrí `src/**` (excluyendo el propio guardrail), extraje **45 clases canónicas distintas** y busqué
cada una en el CSS compilado. **0 ausencias.** Muestra de la salida (la regla tal como sale
compilada, con el escape de Tailwind ya quitado para poder leerla):

```
OK  .bg-(image:--texture-dots-dark) { background-image: var(--texture-dots-dark);
OK  .border-(length:--border-width) { border-style: var(--tw-border-style); border-width: var(--border-width);
OK  .border-t-(length:--border-width) { border-top-style: var(--tw-border-style); border-top-width: var(--border-width);
OK  .duration-(--dur-fast) { --tw-duration: var(--dur-fast); transition-duration: var(--dur-fast);
OK  .focus-visible:outline-(color:--focus):focus-visible { outline-color: var(--focus);
OK  .focus-visible:outline-(length:--border-width-heavy):focus-visible { outline-style: var(--tw-outline-style); outline-width: var(--border-width-heavy);
OK  .rounded-(--radius-tab) { border-radius: var(--radius-tab);
OK  .shadow-(--shadow-folder-tab) { --tw-shadow: var(--shadow-folder-tab); box-shadow: ...;
OK  .text-(color:--folder-prefix) { color: var(--folder-prefix);
OK  .text-shadow-(--shadow-glow) { text-shadow: var(--shadow-glow);
OK  .z-(--z-base) { z-index: var(--z-base);
OK  .z-(--z-bg-3d) { z-index: var(--z-bg-3d);
OK  .z-(--z-nav) { z-index: var(--z-nav);
...
clases canonicas distintas: 45 | sin regla en CSS: 0
```

Esto descarta el modo de fallo "la clase se escribió mal y Tailwind no emite nada": **las 45
existen y aplican la propiedad correcta**.

### 1.2 Par viejo → nuevo en aislamiento (56 pares, harness propio)

Compilé cada clase sola con `@import "tailwindcss" source(none)` + `@source inline(...)` + el
`@theme` real del proyecto, y comparé el **conjunto de declaraciones** de la capa `utilities`
(ignorando el selector, que por definición cambia, y conservando el pseudo `:focus-visible`).

```
SAME=50  DIFF=6
```

- **45 pares** derivados mecánicamente de las clases realmente presentes en `src/**` → **todos SAME**.
- **5 pares del "Caso 3"**, los originales de propiedad arbitraria (los que más fácil se rompen) →
  **todos SAME**:

| Forma original (antes) | Forma actual | Declaración emitida por ambas |
|---|---|---|
| `[z-index:var(--z-nav)]` | `z-(--z-nav)` | `z-index: var(--z-nav)` |
| `[z-index:var(--z-base)]` | `z-(--z-base)` | `z-index: var(--z-base)` |
| `[z-index:var(--z-bg-3d)]` | `z-(--z-bg-3d)` | `z-index: var(--z-bg-3d)` |
| `[background-image:var(--texture-dots-dark)]` | `bg-(image:--texture-dots-dark)` | `background-image: var(--texture-dots-dark)` |
| `[text-shadow:var(--shadow-glow)]` | `text-shadow-(--shadow-glow)` | `text-shadow: var(--shadow-glow)` |

- **6 controles negativos** (las excepciones que el informe dice NO haber convertido) → **todos
  DIFF**, con la pérdida exacta que predice el informe. Confirma que no convertirlas fue correcto:

```
DIFF  [background-size:var(--space-4)_var(--space-4)] -> bg-(length:--space-4)
   old  background-size: var(--space-4) var(--space-4)      new  background-size: var(--space-4)
DIFF  shadow-[var(--border-width)_var(--border-width)_0_var(--border)] -> shadow-(--border-width)
   old  --tw-shadow: var(--border-width) var(--border-width) 0 var(--border)
   new  --tw-shadow: var(--border-width)
DIFF  mb-[calc(-1*var(--border-width))] -> mb-(--border-width)
   old  margin-bottom: calc(-1 * var(--border-width))       new  margin-bottom: var(--border-width)
DIFF  [outline-offset:calc(-1*var(--border-width-heavy))] -> outline-offset-(--border-width-heavy)
DIFF  [margin-left:calc(-1*var(--folder-overlap))] -> ml-(--folder-overlap)
DIFF  [filter:drop-shadow(var(--shadow-paper))] -> drop-shadow-(--shadow-paper)
   old  filter: drop-shadow(var(--shadow-paper))
   new  --tw-drop-shadow-size: ...; --tw-drop-shadow: ...; filter: var(--tw-blur,) var(--tw-brightness,) ... (cadena de 9)
```

### 1.3 Proyecto completo, antes vs. después (reconstruí el "antes" yo mismo)

Como el árbol de trabajo mezcla trabajo sin commitear de features anteriores, no sirve `git stash`
para aislar el "antes". Lo reconstruí mecánicamente: copié `src/` fuera del repo, revertí ahí las
**70 ocurrencias** canónicas a la forma larga, compilé ese `globals.css` y comparé contra el CSS
actual **indexando cada regla por (contexto de at-rules + pseudo + lista de declaraciones) con
multiplicidad**, ignorando el nombre de la clase:

```
bloques distintos before=204 after=204 | diferencias=0
```

**Cero diferencias**: ninguna declaración desapareció, cambió de valor ni cambió de contexto
(`@media`, `@layer`, `@supports`). Concuerda con el §4.2 del informe (la única diferencia que
reporta el implementer, las dos reglas de `z-index` deduplicadas, es justo la que mi "antes"
reconstruido no puede mostrar, porque revierte ambas grafías a la misma).

### 1.4 `text-shadow`: la diferencia residual es realmente inerte

Confirmado: el bloque `@layer properties` gana `--tw-text-shadow-color: initial` y
`--tw-text-shadow-alpha: 100%`. Verifiqué que **nadie las consume**: en todo el CSS compilado hay
4 menciones a `--tw-text-shadow*` (dos `@property` + dos inicializaciones en el `@supports`) y
**cero** `var(--tw-text-shadow...)`. No hay efecto visual.

### 1.5 Bundle de producción

Sin `pnpm dev` del usuario corriendo (`netstat`: nada escuchando en 3000-3009, comprobado antes y
después) y **sin borrar `.next`**. `pnpm build` OK, 24 rutas. En
`.next/static/chunks/3cmdp23cgoa_-.css`:

```
1  text-shadow:var(--shadow-glow)              1  padding:var(--space-6)
1  z-index:var(--z-nav)                        1  border-top-width:var(--border-width)
1  z-index:var(--z-base)                       1  color:var(--folder-prefix)
1  z-index:var(--z-bg-3d)                      1  background-color:var(--folder-tone-6)
2  background-image:var(--texture-dots-dark)   1  outline-color:var(--focus)
1  height:var(--nav-height)
```

### 1.6 `bash ./init.sh`

```
[OK]    lint verde
[OK]    typecheck verde
 Test Files  39 passed | 1 skipped (40)
      Tests  385 passed | 6 skipped (391)
   Duration  30.30s
[OK]    Entorno listo. Puedes empezar a trabajar.
```

Coincide con la baseline declarada (**385 passed | 6 skipped**), exit code 0.

---

## 2. Los otros cuatro puntos del encargo

### 2.1 Las NO convertidas siguen intactas (punto 3)

Barrido de la forma larga superviviente en `src/**`: **12 líneas, exactamente las 9 entradas del
§5 del informe**, ninguna convertida por error.

| Archivo:línea | Ocurrencia | Motivo |
|---|---|---|
| `button.variants.ts:11` | `active:shadow-[var(--border-width)_var(--border-width)_0_var(--border)]` | compuesto |
| `button.variants.ts:8,10` | `hover:` / `active:[transform:translate(...)]` | compuesto + `calc()` |
| `button.variants.ts:21,25` | `transition-[transform,box-shadow]`, `disabled:[transform:none]` | sin variable suelta |
| `ArchiveNav.tsx:47`, `BottomNav.tsx:28` | `[background-size:var(--space-4)_var(--space-4)]` | compuesto |
| `ArchiveNav.tsx:88` | `mb-[calc(-1*var(--border-width))]` | `calc()` |
| `archive-nav.variants.ts:10,13` | `[margin-left:calc(...)]`, `hover:[transform:translateY(calc(...))]` | `calc()` |
| `archive-nav.variants.ts:11,14` | `[filter:drop-shadow(var(--shadow-paper))]` y su `hover:` | no equivalente (§1.2) |
| `bottom-nav.variants.ts:12` | `focus-visible:[outline-offset:calc(-1*var(--border-width-heavy))]` | `calc()` |
| `Input.tsx:17` | `aria-[invalid=true]:shadow-[0_0_0_var(--border-width-heavy)_color-mix(...)]` | compuesto |

### 2.2 `twMerge` (punto 4)

Reconstruí **17 cadenas reales** (las que produce de verdad cada `cva`/`cn()`: Input, Button
primary md, Button icon, Card raised, header de ArchiveNav, pestaña activa e inactiva con su
`folderSurfaceVariants`, cuerpo de carpeta, prefijo, `folderVariants` activa, nav e item del
BottomNav, AsciiYarn con `glow`, slot 3D y `main` del AppShell, Field, page) y comparé
`twMerge(cadena_canónica)` contra `twMerge(cadena_revertida)`, mapeando posición a posición qué
clase descarta cada versión:

```
cadenas con cambio de comportamiento en twMerge: 0 / 17
```

Ningún colapso nuevo. Se conservan los dos casos delicados:
`border-(length:--border-width)` **no** es tragada por `border-border` / `border-solid` (Input,
Card, Button), y `bg-(--folder-tone-N)` sigue siendo pisada por `bg-bg` en la carpeta activa, que
es el comportamiento **buscado** y documentado en `archive-nav.variants.ts:29-31`.

### 2.3 El guardrail nuevo (punto 5)

**No pasa en verde por vacío.** Ejecuté su regex y su recorrido de directorios por separado:

```
sobre el src ACTUAL:                  archivos barridos=201 | ofensores=0
sobre el estado PREVIO reconstruido:  archivos barridos=201 | ofensores=70
```

Es decir: **habría marcado las 70 ocurrencias** que este refactor eliminó, con archivo, línea y
reemplazo propuesto. Además tiene su propio test de barrido (más de 20 archivos + 3 rutas
conocidas), que es la defensa correcta contra el walker roto.

**Falsos positivos:** cero sobre el código actual y sobre los 9 casos de excepción.

**Falsos negativos** (probados uno a uno; ninguno presente hoy en el repo, así que son deuda y no
defecto):

| Muestra | Marca | Comentario |
|---|---|---|
| `-mt-[var(--space-2)]` (utilidad **negativa**) | no | el lookbehind corta con el guion inicial; `-mt-(--space-2)` sí es canónica en v4 |
| `[z-index:var(--z-nav)]` (propiedad arbitraria) | no | **fuera de alcance a propósito** y documentado; implica que la incoherencia recién saldada puede volver sin que nadie se entere |
| `p-[VAR(--x)]` o token con mayúsculas | no | irrelevante: los tokens son `--kebab-case` por convención |

`data-[state=open]:p-[var(--x)]`, `tablet:px-[var(--x)]` y `p-[var( --x )]` sí se marcan.
La auto-exclusión (`if (full === SELF) continue`) funciona y además es redundante: el archivo no
contiene ninguna clase literal.

### 2.4 Contaminación del CSS por los tests (punto 6): limpio, verificado más allá de lo pedido

No basta con leer el archivo: compilé el CSS **con y sin** el guardrail, y después **con y sin los
40 archivos de test del repo**, comparando el mapa completo selector → declaraciones:

```
con guardrail=207 reglas   sin guardrail=207 reglas   utilidades fantasma=0
con los 40 tests=207       sin los 40 tests=207       utilidades fantasma por tests=0
```

**Ni una sola utilidad del CSS de producción proviene de un archivo de test.** La técnica de armar
las muestras por concatenación funciona, y el comentario de cabecera describe las utilidades en
prosa sin citarlas. El modo de fallo del informe 6 está efectivamente cerrado.

### 2.5 Asserts de tests (punto 7)

`ascii-yarn.test.tsx:195` quedó consistente con `AsciiYarn.tsx:65` (`text-shadow-(--shadow-glow)`;
el test pasa y la clase existe en el CSS, §1.1). Busqué en **todos** los `*.test.*` del repo los
asserts de clase (`toHaveClass`, `toContain`, `className.`, `classList`): el resto sólo asserta
clases que este refactor **no tocó** (`text-accent`, `pointer-events-none`, `font-mono`, `text-xs`,
`leading-ascii`, `bg-surface-raised`, `shadow-hard-lg`, `custom-class`, `opacity-40`,
`transition-`). **No quedó ningún assert desactualizado.**

---

## 3. Hallazgos por severidad

### Bloqueantes

Ninguno.

### Menores (no bloquean el cierre; para el leader)

1. **Documentación desactualizada por el propio refactor.** `progress/current.md:126` (deuda
   técnica 11) sigue citando la forma vieja: *"el `glow` ya existe: prop `glow` de `<AsciiYarn />`
   → `[text-shadow:var(--shadow-glow)]`"*. Hoy el componente usa `text-shadow-(--shadow-glow)`. Es
   un archivo del arnés (dominio del leader) y no hay riesgo de CSS porque `progress/` está fuera
   del escaneo, pero contradice al código.
2. **`no-hardcode.test.ts:12-15`** (comentario añadido en la feature anterior, no en este refactor)
   cita clases literales dentro de un comentario, justo lo que prohíbe `conventions.md:98-104`.
   Verificado inocuo hoy (§2.4: cero utilidades fantasma, porque son clases que los componentes ya
   usan), pero es la misma familia de bug que tumbó la app.

### Deuda a registrar (nace de esta revisión)

- **D-A. El guardrail no ve las utilidades negativas.** `-mt-[var(--space-2)]` y similares no se
  marcan por el lookbehind. Hoy no hay ninguna en `src/**` (los negativos del proyecto se escriben
  con `calc(-1*...)`, que es excepción legítima). Al primer negativo con variable suelta, ampliar
  el patrón para admitir el guion inicial.
- **D-B. La forma de propiedad arbitraria puede reaparecer sin ruido.** `[z-index:var(--z-nav)]`
  está fuera del alcance del guardrail por decisión documentada (requiere verificar caso a caso si
  existe utilidad de core). Consecuencia concreta: la incoherencia que este refactor acaba de
  eliminar (dos grafías para la misma intención de z-index) puede volver a entrar. Opción barata:
  una lista corta de propiedades con utilidad de core ya probada (`z-index`, `background-image`,
  `text-shadow`) que sí se marquen.
- **D-C. Colapsos de `twMerge` preexistentes** (detectados de paso; **no** los causa este refactor,
  se dan idénticos antes y después): `focus-visible:outline` es descartada por
  `focus-visible:outline-(length:...)` en Input, Button, ArchiveNav y BottomNav (inocuo: ambas
  fijan `outline-style: var(--tw-outline-style)`), y `leading-tight` es descartada en
  `buttonVariants` por el `text-base` de la variante de tamaño (**este sí cambia el interlineado
  del botón**). Revisar al tocar `button.variants.ts`.

---

## 4. Checkpoints (`CHECKPOINTS.md`)

- **C1 - El arnés está completo: [x]**
  Archivos base y los 3 docs presentes; `bash ./init.sh` termina con exit code 0 (ejecutado por mí).
- **C2 - El estado es coherente: [x]**
  0 features en `in_progress` (14 `done`, 17 `pending`); ninguna cambió de estado por este
  refactor; `progress/current.md` describe la sesión activa (tarea en curso, plan y estado "lista
  para review"), sin basura de sesiones anteriores.
- **C3 - El código respeta la arquitectura: [x]**
  Refactor puramente presentacional: no toca capas, ni `features/<x>/api`, ni route handlers, ni
  Drizzle, ni validación. Estructura feature-first intacta; el guardrail nuevo vive en
  `src/shared/ui/`, junto a los otros guardrails de UI. Sin dependencias nuevas. Sin `console.log`,
  `TODO` ni `FIXME` en `src/**` fuera de tests. Sin secretos.
- **C4 - La verificación es real: [x]**
  `pnpm lint` y typecheck verdes; **385 passed | 6 skipped**, +17 = exactamente los del guardrail
  nuevo, ningún test previo cambió de resultado. El guardrail no es decorativo: demostrado que
  marca 70/70 sobre el estado previo (§2.3).
- **C5 - La sesión se cerró bien: [x]**
  Sin archivos `*.tmp` ni artefactos de build sin trackear (mis temporales se generaron fuera del
  repo y se eliminaron; `git status` verificado antes y después). `progress/history.md` tiene la
  entrada de la última sesión. Ninguna feature cambió de estado, que es lo correcto para un
  refactor mecánico. (Sigue vigente la deuda preexistente 4: `tsconfig.tsbuildinfo` trackeado.)

---

## 5. Cambios requeridos

Ninguno para aprobar. Dos ajustes de arnés recomendados para el leader al cerrar:

1. Actualizar `progress/current.md:126` (deuda 11): reemplazar `[text-shadow:var(--shadow-glow)]`
   por la forma vigente o describir el halo en prosa.
2. Registrar **D-A**, **D-B** y **D-C** en la lista de deuda técnica de `progress/current.md`.

# impl — Sintaxis canónica de variables en Tailwind v4

> Refactor mecánico (NO es una feature de `feature_list.json`; ningún `status` fue tocado).
> Regla de referencia: `docs/harness/conventions.md` → "Sintaxis canónica de variables en Tailwind v4".

## 1. Resumen

Se migró todo `src/**` de la forma larga con corchetes + `var()` a la forma corta canónica
con paréntesis. **60 ocurrencias en 12 archivos** convertidas, **9 ocurrencias NO convertidas**
(excepciones legítimas, justificadas abajo con evidencia), **1 assert de test** actualizado y
**1 test guardrail nuevo** que barre `src/**` por glob.

El criterio de corrección fue **equivalencia del CSS generado**, verificada de dos maneras
independientes (§4): par por par en aislamiento, y comparando la compilación completa del
proyecto antes vs. después.

## 2. Archivos creados / modificados

### Nuevo

| Archivo | Qué es |
|---|---|
| `src/shared/ui/canonical-tailwind-classes.test.ts` | Guardrail: barre `src/**` por recorrido de directorios y falla si reaparece la forma no canónica inequívocamente convertible. 17 tests. |

### Modificados (código)

| Archivo | Conversiones |
|---|---|
| `src/app/(app)/page.tsx` | 2 |
| `src/app/(auth)/layout.tsx` | 1 |
| `src/shared/ui/primitives/field/Input.tsx` | 7 |
| `src/shared/ui/primitives/field/Field.tsx` | 1 |
| `src/shared/ui/primitives/card/card.variants.ts` | 2 |
| `src/shared/ui/primitives/button/button.variants.ts` | 11 |
| `src/shared/ui/layout/app-shell/AppShell.tsx` | 2 |
| `src/shared/ui/layout/archive-nav/ArchiveNav.tsx` | 20 |
| `src/shared/ui/layout/archive-nav/archive-nav.variants.ts` | 10 |
| `src/shared/ui/layout/bottom-nav/BottomNav.tsx` | 3 |
| `src/shared/ui/layout/bottom-nav/bottom-nav.variants.ts` | 8 |
| `src/shared/ui/three/ascii-yarn/AsciiYarn.tsx` | 1 |

### Modificados (tests)

| Archivo | Cambio |
|---|---|
| `src/shared/ui/three/ascii-yarn/ascii-yarn.test.tsx:195` | Assert de clase literal: `[text-shadow:var(--shadow-glow)]` → `text-shadow-(--shadow-glow)` |

### Modificados (arnés)

- `progress/current.md` — nota de tarea en curso + plan (protocolo del implementer).

## 3. Tabla de conversiones aplicadas

Barrido propio con dos regex (`-\[var\(--` y `\[[a-z-]+:var\(--`, más `\[--` para
variables-como-valor) sobre **todo** `src/**`, no solo la lista del inventario. No apareció
ningún caso fuera de la lista del líder.

### Caso 1 — valor arbitrario simple (`utilidad-[var(--x)]` → `utilidad-(--x)`)

| Archivo | Antes → Después |
|---|---|
| `(app)/page.tsx:5,7` | `p-[var(--space-6)]` → `p-(--space-6)` · `mt-[var(--space-2)]` → `mt-(--space-2)` |
| `(auth)/layout.tsx:9` | `p-[var(--space-6)]` → `p-(--space-6)` |
| `Input.tsx:9,10,15` | `min-h-[var(--touch-target)]`, `px-[var(--space-4)]`, `py-[var(--space-2)]`, `outline-offset-[var(--border-width)]` |
| `Field.tsx:54` | `gap-[var(--space-2)]` → `gap-(--space-2)` |
| `card.variants.ts:8` | `p-[var(--space-5)]` → `p-(--space-5)` |
| `button.variants.ts:16,17,21,23,37,38` | `gap-[var(--space-2)]`, `min-h-[var(--touch-target)]`, `duration-[var(--dur-fast)]`, `outline-offset-[var(--border-width-heavy)]`, `px-[var(--space-6)]`, `py-[var(--space-3)]`, `min-w-[var(--touch-target)]` |
| `ArchiveNav.tsx:45,46,52,62,87,88,89,90,113,115,116,125` | `gap-[var(--space-3)]`, `h-[var(--nav-height)]`, `px-[var(--space-6)]`, `pr-[var(--space-3)]`, `mt-[var(--space-1)]`, `gap-[var(--space-1)]`, `mx-[var(--space-4)]`, `rounded-[var(--radius-tab)]`, `px-[var(--space-4)]`, `pt-[var(--space-3)]`, `pb-[var(--space-2)]`, `shadow-[var(--shadow-folder-tab)]`, `shadow-[var(--shadow-folder-body)]`, `h-[var(--folder-body-height-active)]`, `h-[var(--folder-body-height)]`, `gap-[var(--space-4)]` |
| `archive-nav.variants.ts:12,16,35-40` | `duration-[var(--dur-base)]`, `outline-offset-[var(--border-width)]`, `bg-[var(--folder-tone-1..6)]` → `bg-(--folder-tone-1..6)` |
| `bottom-nav.variants.ts:7,8,10` | `min-h-`/`min-w-[var(--touch-target)]`, `gap-[var(--space-1)]`, `px-[var(--space-1)]`, `py-[var(--space-2)]`, `duration-[var(--dur-fast)]` |

### Caso 2 — con data-type hint (`utilidad-[tipo:var(--x)]` → `utilidad-(tipo:--x)`)

| Archivo | Antes → Después |
|---|---|
| `Input.tsx:12,14,15` | `border-[length:var(--border-width)]` → `border-(length:--border-width)` · `outline-[length:var(--border-width-heavy)]` → `outline-(length:--border-width-heavy)` · `outline-[color:var(--focus)]` → `outline-(color:--focus)` |
| `card.variants.ts:7` | `border-[length:var(--border-width)]` → `border-(length:--border-width)` |
| `button.variants.ts:19,22,23` | `border-[length:...]`, `outline-[length:...]`, `outline-[color:...]` |
| `archive-nav.variants.ts:15,16` | `outline-[length:...]`, `outline-[color:...]` |
| `bottom-nav.variants.ts:11,12` | `outline-[length:...]`, `outline-[color:...]` |
| `BottomNav.tsx:27` | `border-t-[length:var(--border-width)]` → `border-t-(length:--border-width)` |
| `ArchiveNav.tsx:97` | `text-[color:var(--folder-prefix)]` → `text-(color:--folder-prefix)` |

### Caso 3 — propiedad arbitraria con utilidad de core equivalente

**Cada una verificada individualmente contra el CSS generado**, no convertida a ciegas.

| Archivo | Antes → Después | CSS emitido (idéntico en ambas formas) |
|---|---|---|
| `AppShell.tsx:48` | `[z-index:var(--z-bg-3d)]` → `z-(--z-bg-3d)` | `z-index: var(--z-bg-3d)` |
| `AppShell.tsx:55` | `[z-index:var(--z-base)]` → `z-(--z-base)` | `z-index: var(--z-base)` |
| `ArchiveNav.tsx:48` | `[z-index:var(--z-nav)]` → `z-(--z-nav)` | `z-index: var(--z-nav)` |
| `ArchiveNav.tsx:87` | `z-[var(--z-base)]` → `z-(--z-base)` | `z-index: var(--z-base)` |
| `archive-nav.variants.ts:21` | `z-[var(--z-nav)]` → `z-(--z-nav)` | `z-index: var(--z-nav)` |
| `BottomNav.tsx:29` | `[z-index:var(--z-nav)]` → `z-(--z-nav)` | `z-index: var(--z-nav)` |
| `ArchiveNav.tsx:47`, `BottomNav.tsx:28` | `[background-image:var(--texture-dots-dark)]` → `bg-(image:--texture-dots-dark)` | `background-image: var(--texture-dots-dark)` |

**Incoherencia existente saldada:** `ArchiveNav.tsx:87` usaba `z-[var(--z-base)]` y
`AppShell.tsx:48` usaba `[z-index:var(--z-bg-3d)]` para exactamente la misma intención. Ahora
las 6 ocurrencias de z-index del proyecto usan la misma forma `z-(--token)`. Efecto medible: el
CSS pasó de **2 reglas duplicadas** por cada valor de z-index a **1** (ver §4.2).

### Caso 4 — `text-shadow` (verificado explícitamente, como pedía el encargo)

Tailwind **4.3.3 sí tiene** la familia `text-shadow-*` y acepta la forma de paréntesis.
Compilado en aislamiento, ambas formas emiten exactamente la misma regla:

```
.\[text-shadow\:var\(--shadow-glow\)\] { text-shadow: var(--shadow-glow); }
.text-shadow-\(--shadow-glow\)        { text-shadow: var(--shadow-glow); }
```

→ **Convertida**: `AsciiYarn.tsx:65` `[text-shadow:var(--shadow-glow)]` → `text-shadow-(--shadow-glow)`.
Único efecto colateral, inerte, documentado en §4.3.

También se comprobó que `twMerge` no cambia de comportamiento: en la cadena real de `AsciiYarn`
(`font-mono text-xs text-accent leading-ascii …`) ni la forma vieja ni la nueva se colapsan
contra `text-xs`/`text-accent`. Lo mismo se comprobó para `bg-bg` + `bg-(image:…)` y para
`z-(--z-base)` en `ArchiveNav`.

## 4. Verificación de equivalencia del CSS (lo importante)

### 4.1 Par por par, en aislamiento

Se compiló cada candidato solo (con el `@theme` real del proyecto) vía
`@import "tailwindcss" source(none)` + `@source inline("<clase>")` y se comparó el conjunto de
declaraciones del `@layer utilities`. **47 pares probados**: los 43 convertibles dieron `SAME`;
los 4 controles negativos (las excepciones) dieron `DIFF`, confirmando que NO se pueden convertir:

```
SAME  p-[var(--space-6)]            SAME  border-[length:var(--border-width)]
SAME  min-h-[var(--touch-target)]   SAME  outline-[color:var(--focus)]
SAME  rounded-[var(--radius-tab)]   SAME  text-[color:var(--folder-prefix)]
SAME  shadow-[var(--shadow-folder-tab)]   SAME  bg-[var(--folder-tone-1)]
SAME  [z-index:var(--z-nav)]        SAME  z-[var(--z-base)]
SAME  [background-image:var(--texture-dots-dark)]
SAME  [text-shadow:var(--shadow-glow)]
… (43/43 SAME)

DIFF  [background-size:var(--space-4)_var(--space-4)]
   old => background-size: var(--space-4) var(--space-4)
   new => background-size: var(--space-4)                    ← pierde un valor
DIFF  shadow-[var(--border-width)_var(--border-width)_0_var(--border)]
   old => --tw-shadow: var(--border-width) var(--border-width) 0 var(--border)
   new => --tw-shadow: var(--border-width)                   ← pierde 3 valores
DIFF  mb-[calc(-1*var(--border-width))]
   old => margin-bottom: calc(-1 * var(--border-width))
   new => margin-bottom: var(--border-width)                 ← pierde el signo
DIFF  [outline-offset:calc(-1*var(--border-width-heavy))]
   old => outline-offset: calc(-1 * var(--border-width-heavy))
   new => outline-offset: var(--border-width-heavy)          ← pierde el signo
```

### 4.2 Proyecto completo, antes vs. después

Se compiló `src/app/globals.css` con `postcss` + `@tailwindcss/postcss` **antes de tocar nada**
(`before.css`, 28 641 bytes) y otra vez al terminar (`after.css`, 28 431 bytes). Se indexó cada
regla por *(contexto de at-rules) + (lista de declaraciones)*, ignorando el nombre de clase (que
por definición cambia) y el orden.

```
bloques de declaraciones   antes: 204   después: 204
=== solo ANTES  (1) ===  @layer properties  (bloque de registro de custom properties)
=== solo DESPUÉS(1) ===  @layer properties  (mismo bloque, ver §4.3)
```

Comparando **solo la capa de utilidades** por multiset de declaraciones:

```
reglas de utilidades   antes: 168   después: 166

  x2 -> x1   z-index: var(--z-base)
     sel antes  : .[z-index:var(--z-base)] , .z-[var(--z-base)]
     sel después: .z-(--z-base)
  x2 -> x1   z-index: var(--z-nav)
     sel antes  : .[z-index:var(--z-nav)] , .z-[var(--z-nav)]
     sel después: .z-(--z-nav)
```

**Las únicas 2 diferencias son la desduplicación esperada de la incoherencia de z-index**: donde
antes se emitían dos reglas con la misma declaración (porque la misma intención estaba escrita de
dos formas), ahora se emite una. **Ninguna declaración desapareció ni cambió de valor.** El resto
del multiset es idéntico.

### 4.3 Única diferencia residual (inerte, documentada)

En el bloque `@layer properties` (el `@supports` de fallback donde Tailwind registra sus custom
properties internas) aparecen **dos declaraciones nuevas**:

```
solo ANTES  : []
solo DESPUÉS: [ '--tw-text-shadow-color: initial', '--tw-text-shadow-alpha: 100%' ]
(las otras 34 declaraciones del bloque son idénticas)
```

Es la contabilidad interna que Tailwind registra al usar la familia real `text-shadow-*` en vez
de una propiedad arbitraria. **No tiene efecto visual**: la regla emitida
(`text-shadow: var(--shadow-glow)`) no referencia ninguna de las dos, y ambas se inicializan a
valores neutros. No se revirtió por esto.

### 4.4 Bundle de producción

`pnpm build` OK. Verificado que el CSS emitido (`.next/static/chunks/3cmdp23cgoa_-.css`) contiene
las declaraciones esperadas:

```
2 background-image:var(--texture-dots-dark)     (regla base de body + utilidad)
2 background-size:var(--space-4) var(--space-4) (regla base de body + utilidad)
1 padding:var(--space-6)
1 text-shadow:var(--shadow-glow)
1 z-index:var(--z-base)
1 z-index:var(--z-bg-3d)
1 z-index:var(--z-nav)
```

## 5. Lo que NO se convirtió, y por qué

| Ocurrencia | Archivo | Motivo |
|---|---|---|
| `shadow-[var(--border-width)_var(--border-width)_0_var(--border)]` | `button.variants.ts:11` | **Compuesto**: 4 valores. La forma de paréntesis solo acepta una variable → perdería 3 (probado, §4.1). |
| `[background-size:var(--space-4)_var(--space-4)]` ×2 | `ArchiveNav.tsx:47`, `BottomNav.tsx:28` | **Compuesto**: 2 valores. `bg-(length:--space-4)` emite uno solo (probado, §4.1). |
| `mb-[calc(-1*var(--border-width))]` | `ArchiveNav.tsx:88` | **`calc()`**: el valor no es una variable pelada; convertirlo perdería el signo negativo. |
| `[outline-offset:calc(-1*var(--border-width-heavy))]` | `bottom-nav.variants.ts:12` | **`calc()`**, ídem. |
| `[margin-left:calc(-1*var(--folder-overlap))]` | `archive-nav.variants.ts:10` | **`calc()`**, ídem. |
| `hover:[transform:translateY(calc(-1*var(--folder-lift)))]` | `archive-nav.variants.ts:13` | **`calc()`** dentro de una función. |
| `hover:[transform:translate(calc(…),calc(…))]`, `active:[transform:translate(var(--border-width),var(--border-width))]` | `button.variants.ts:8,10` | **Compuesto** + `calc()`. |
| `[filter:drop-shadow(var(--shadow-paper))]`, `hover:[filter:drop-shadow(var(--shadow-folder-hover))]` | `archive-nav.variants.ts:11,14` | **NO equivalente**, verificado: `drop-shadow-(--shadow-paper)` emite `--tw-drop-shadow-size` + `--tw-drop-shadow` + una `filter:` con toda la cadena de 9 variables (`var(--tw-blur,) var(--tw-brightness,) …`), mientras la forma actual emite `filter: drop-shadow(var(--shadow-paper))` a secas. Cambiaría el CSS. |
| `[transform:none]`, `transition-[transform,filter]`, `transition-[transform,box-shadow]`, `aria-[invalid=true]:shadow-[0_0_0_…color-mix(…)]` | varios | No contienen una variable suelta: no aplica la regla. |

Ninguna conversión hubo que revertir: se descartaron **antes** de aplicarlas gracias a la prueba
par-por-par de §4.1.

## 6. El guardrail nuevo

`src/shared/ui/canonical-tailwind-classes.test.ts` (17 tests).

**Cobertura por recorrido, no por lista.** A diferencia de `no-hardcode.test.ts` (que tiene un
array fijo `COMPONENT_FILES` y hay que acordarse de ampliarlo), este recorre recursivamente
`src/**` con `readdirSync` y toma todo `.ts .tsx .js .jsx .mjs .css`. Un archivo nuevo queda
cubierto solo. Un test aparte verifica que el barrido no está roto (≥ 20 archivos y presencia de
tres rutas conocidas), para que un walker defectuoso no pase en verde por vacío.

**Regex, construido por partes para que se lea:**

```
UTILITY    = [a-z][a-z0-9]*(?:-[a-z0-9]+)*     nombre de utilidad con o sin guiones
TYPE_HINT  = (?:[a-z-]+:)?                     data-type hint opcional
SINGLE_VAR = var\(\s*--[a-z0-9-]+\s*\)         EXACTAMENTE una variable
patrón     = (?<![\w-]) UTILITY -\[ TYPE_HINT SINGLE_VAR \]
```

Al exigir que el `]` cierre **inmediatamente** después del `)` de la variable, el patrón es ciego
a los compuestos; al exigir `var(` justo después del `[`, es ciego a `calc(`. Las propiedades
arbitrarias (`[prop:var(--x)]`) tampoco se marcan a propósito: esas requieren verificar caso a
caso si existe utilidad de core equivalente (ver §5, `drop-shadow`), así que no son mecánicas.

**Anti-falsos-positivos con test propio.** 14 de los 17 tests son una tabla de muestras: 5 que el
patrón **debe** marcar y 9 que **no debe** marcar (compuestos, `calc()`, propiedad arbitraria,
variable envuelta en función, sin variables, y las dos formas ya canónicas). Si alguien endurece
el regex de más, esos tests avisan.

**Mensaje de error accionable**: reporta `archivo:línea  clase-vieja → clase-canónica`. Verificado
reintroduciendo a mano la forma larga en `(app)/page.tsx` (y revirtiendo después):

```
- []
+ [ "app\\(app)\\page.tsx:5  p-[var(--space-6)] → p-(--space-6)" ]
 Tests  1 failed | 16 passed (17)
```

**Detalle no obvio (§7).** El archivo no escribe ni un solo nombre de clase literal: las muestras
se arman por concatenación en runtime.

## 7. Decisiones no obvias

1. **El propio test guardrail contaminaba el CSS.** Tailwind escanea `src/**` **incluidos los
   `.test.ts`**. La primera versión del archivo escribía las muestras literales y el CSS compilado
   creció con tres utilidades fantasma que ningún componente usa: `.border`, `.transition` y
   `.shadow-paper` (esta última porque el string `"shadow-paper"` suelto es un candidato válido).
   Es exactamente la familia de bug que ya tumbó la app (`var(--dur-*)`, ver
   `progress/informs/6.informe-bugfix-tailwind_source_guardrail.md`). Solución: las muestras se
   arman por concatenación (`frag("bor","der")`, tokens pasados con sus `--` delante, que no son
   candidatos) y el comentario de cabecera describe las utilidades en prosa en lugar de citarlas.
   Se re-compiló hasta que el diff de CSS quedó limpio. **Regla derivada para quien siga: en un
   test que hable de clases, no escribas la clase literal en el fuente ni en sus comentarios.**
2. **El test se excluye a sí mismo del barrido** (`if (full === SELF) continue`): si no, se
   marcaría a sí mismo al construir muestras.
3. **`text-shadow` sí se convirtió.** El encargo dejaba abierto revertirlo si no era equivalente.
   Lo es (§4.4 del bundle y §4.1). El único delta es el registro inerte de §4.3.
4. **Ubicación del archivo** en `src/shared/ui/` (junto a los otros guardrails de UI) aunque su
   alcance sea todo `src/**`: la regla que vigila es una convención de UI/Tailwind.
5. **No se tocó `globals.css`** ni el alcance de escaneo: no hacía falta y habría movido la
   baseline de `globals-css.test.ts`.
6. **No se convirtió nada dentro de `template/`, `docs/` ni `progress/`**: están fuera del escaneo
   de Tailwind por diseño y no son código de la app.

## 8. Verificación

**Sin `pnpm dev` activo** (comprobado con `netstat` antes de compilar: nada escuchando en
3000-3009) y **sin borrar `.next`**.

### `bash ./init.sh`

```
── 1. Verificando entorno ─────────────────────────────
[OK]    node -> v24.11.1
[OK]    pnpm -> 11.9.0

── 2. Verificando archivos base del arnés ──────────────
[OK]    Existe AGENTS.md
[OK]    Existe feature_list.json
[OK]    Existe progress/current.md
[OK]    Existe docs/harness/architecture.md
[OK]    Existe docs/harness/conventions.md
[OK]    Existe docs/harness/verification.md
[OK]    Existe CHECKPOINTS.md

── 3. Validando feature_list.json ──────────────────────
[OK]    feature_list.json válido (31 features)

── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  39 passed | 1 skipped (40)
      Tests  385 passed | 6 skipped (391)
   Start at  21:18:08
   Duration  40.64s

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

Baseline **368 passed | 6 skipped** → ahora **385 passed | 6 skipped**. Delta **+17 = exactamente
los 17 tests del guardrail nuevo**; ningún test previo cambió de resultado.

### `pnpm build`

```
✓ Generating static pages using 3 workers (12/12) in 327ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/auth/login
…  (24 rutas, sin cambios respecto de la baseline)
ƒ Proxy (Middleware)
```

### Comparación de CSS antes/después

Ver §4. Resultado: **equivalente** — mismas 204 declaraciones, misma capa de utilidades salvo la
desduplicación intencional de 2 reglas de z-index, más 2 registros inertes de custom properties.

## 9. Estado

- No se modificó ningún `status` de `feature_list.json`.
- No quedan archivos temporales en el repo.
- Pendiente: **review**.

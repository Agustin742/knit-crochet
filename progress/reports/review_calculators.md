# Review — feature #11 `calculators`

**Veredicto:** APROBADO

## Verificación ejecutada por el reviewer (no del informe)
- `bash ./init.sh` → **VERDE**. `lint verde`, `typecheck verde`,
  `Test Files 30 passed | 1 skipped`, `Tests 281 passed | 6 skipped`.
  Base declarada 266 → 281 (**+15 nuevos**, 0 rotos; los 6 skipped son el smoke
  Neon, sin cambios).
- `pnpm build` → exit 0. El listado de rutas NO incluye ninguna ruta de
  calculators (confirmado: feature de lógica pura, sin Route Handlers).
- Se usó **pnpm** en todo momento (nunca npm/npx).

## Auditoría punto por punto

1. **String canónico EXACTO (P=40, A=6):** correcto al carácter.
   `increases.test.ts:7-13` fija con `toBe(...)` el literal
   `"Teje 7 p, aumenta 1 (×4); luego teje 6 p, aumenta 1 (×2). Total: 46 p."`
   Verificado por node que el `×` tanto en `increases.ts` como en el test es
   **U+00D7** (símbolo multiplicación), no la letra `x`. Mayúscula inicial vía
   `capitalize` (`increases.ts:18-20,68`), `; luego` (`increases.ts:65`),
   `Total: ` con dos puntos y espacio + punto final (`increases.ts:68`).
   `total = p + a = 46` (`increases.ts:57`). Test extra `increases.test.ts:15-19`
   asegura `×` presente y ausencia de `(x`.

2. **Algoritmo:** `base = Math.floor(p/a)`, `remainder = p % a`
   (`increases.ts:55-56`). Reparte `remainder` tramos de `(base+1)` +
   `(a-remainder)` tramos de `base` (`increases.ts:62-66`). Invariante de conteo
   comprobada algebraicamente: `remainder*(base+1) + (a-remainder)*base + a =
   (base*a + remainder) + a = P + A`; y el código emite `total = p + a`. Cuadra.

3. **Casos borde con fraseo coherente y test cada uno:**
   - `remainder=0` (P=42,A=6): un solo tramo, sin `(base+1)` ni `(×0)` ni
     `luego` — `increases.ts:60-61`, test `increases.test.ts:21-27`.
   - `P<A` / `base=0` (P=4,A=6): omite "teje 0 p" en el tramo de aumentos
     consecutivos — `formatSegment` `increases.ts:12-14`, test `:29-36`. El
     primer tramo siempre es `base+1 ≥ 1`, nunca arranca con "aumenta".
   - Singular `(×1)`: emitido siempre como `(×count)` por consistencia. Cubierto
     para `remainder=1` (P=7, test `:38-45`) y `A-remainder=1` (P=41, test `:47-54`).

4. **Validación con error NOMBRADO:** `InvalidCalculatorInputError extends Error`
   con `name` propio (`errors.ts:8-13`), no `Error` genérico ni string.
   Aumentos: `P<=0`/`A<=0` (`increases.ts:49-53`, tests `:56-72`) y no-enteros
   (`increases.ts:44-48`, test `:74-81`). Regla de 3: `lengthA<=0` incl. 0
   (división por cero) (`rule-of-three.ts:24-28`, test `:32-39`), `lengthB<=0`
   (`:29-33`, test `:41-45`), `skeinsA<=0`/no-entero (`:19-23`, test `:47-57`).

5. **Regla de 3:** `Math.ceil((skeinsA * lengthB) / lengthA)`
   (`rule-of-three.ts:35`). Redondeo hacia arriba decisivo cubierto:
   `4×250.5/200 = 5.01 → 6` (`rule-of-three.test.ts:25-30`) y
   `3×250/200 = 3.75 → 4` (`:19-22`).

6. **Alcance / capas:** feature de lógica pura. No hay `api/`, `schema.ts`, ni
   rutas en `src/app/`. `grep` sobre `src/features/calculators/` no encuentra
   ningún import de `@/shared/db`, Drizzle ni schema. `git status` confirma que
   los únicos cambios de código son `src/features/calculators/` (nuevo); el resto
   (`feature_list.json`, `progress/**`, `tsconfig.tsbuildinfo`, el propio informe)
   es arnés/estado ajeno a la lógica de esta feature.

## Convenciones y arquitectura
- Código en inglés, prosa/UI en español (PRD §4). Comillas dobles, template
  literals, `Number.isInteger`/`Number.isFinite` para validación en el borde.
- Feature-first autocontenida con barrel `index.ts`. Imports por alias `@/...`.
- Sin `console.log`, sin `any`, sin secretos, sin dependencias nuevas.
- Tests co-ubicados con camino feliz + caminos de error (conventions §Tests).

## Checkpoints (relativos a esta feature)
- C1: [x] arnés completo, `init.sh` exit 0.
- C2: [x] estado coherente; #11 `done` con tests que pasan.
- C3: [x] respeta arquitectura (lógica pura en `features/calculators`, sin DB/UI/rutas).
- C4: [x] tests por módulo (feliz + error), lint y typecheck verdes.
- C5: [x] sin artefactos sospechosos; feature en estado correcto.

## Cambios requeridos
Ninguno.

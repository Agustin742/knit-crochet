# Informe de implementación — #11 `calculators`

**Feature:** #11 `calculators` (Calculadoras: aumentos + regla de 3) · PRD §7, §6.5
**Estado:** implementada y verificada en verde. `feature_list.json` #11 → `done`.

## Alcance
Dos calculadoras de **lógica pura**: sin DB, sin endpoints, sin Route Handlers, sin
store ni schema. Feature autocontenida en `src/features/calculators/**` como
funciones puras + tests co-ubicados. Resultados efímeros (se ejecutan en cliente).

## Archivos creados
- `src/features/calculators/errors.ts` — `InvalidCalculatorInputError` (clase de
  Error nombrada, estilo del repo; acepta `message`).
- `src/features/calculators/types.ts` — `IncreasesInput`, `RuleOfThreeInput`.
- `src/features/calculators/increases.ts` — `calculateIncreases(input): string`.
- `src/features/calculators/rule-of-three.ts` — `calculateRuleOfThree(input): number`.
- `src/features/calculators/index.ts` — barrel (errors + funciones + types).
- `src/features/calculators/increases.test.ts` — 9 tests.
- `src/features/calculators/rule-of-three.test.ts` — 6 tests.

No se creó `api/`, `schema.ts` ni rutas en `src/app/`. `pnpm build` confirma que no
se añadieron rutas nuevas.

## Aumentos (§7.1) — algoritmo y fraseo
`base = floor(P/A)`, `remainder = P mod A`, `total = P + A` (cada aumento suma 1 punto).
Salida = `{capitalize(body)}. Total: {total} p.`, con `body` construido por tramos.

Caso canónico verificado **al carácter**:
`P=40, A=6` → `"Teje 7 p, aumenta 1 (×4); luego teje 6 p, aumenta 1 (×2). Total: 46 p."`
(símbolo `×` U+00D7, no la letra `x`; un test lo asegura explícitamente).

### Decisiones de fraseo de casos borde (documentadas y cubiertas)
- **`remainder = 0` (P múltiplo de A):** un único tramo de `base` p, sin el tramo
  `(base+1)` y sin `(×0)`. Ej. `P=42, A=6` → `"Teje 7 p, aumenta 1 (×6). Total: 48 p."`
  El test comprueba además que NO aparece `×0` ni `luego`.
- **`P < A` (`base = 0`):** el algoritmo produce tramos de "0 p" (aumentos
  consecutivos sin puntos intermedios). Decisión: `formatSegment` **omite** el
  "teje 0 p" sin sentido y deja solo `"aumenta 1 (×count)"`. Ej. `P=4, A=6` →
  `"Teje 1 p, aumenta 1 (×4); luego aumenta 1 (×2). Total: 10 p."` (el primer tramo
  siempre es `base+1 ≥ 1`, así que nunca empieza con un "aumenta" descapitalizado).
- **Singular/plural `(×1)`:** decisión de **consistencia**: el multiplicador se
  emite SIEMPRE como `(×count)`, también para `count = 1` (no se pluraliza ni se
  elide). Cubierto para `remainder=1` (`P=7,A=6`) y para `A-remainder=1` (`P=41,A=6`).

### Validación (aumentos)
- `P <= 0` o `A <= 0` → `InvalidCalculatorInputError` (no `Error` genérico).
- **No-enteros:** decisión de exigir **enteros positivos** (puntos y aumentos son
  discretos). `P` o `A` no enteros → `InvalidCalculatorInputError`. Cubierto.

## Regla de 3 (§7.2)
`skeinsB = ceil(skeinsA × lengthB / lengthA)` con `Math.ceil` (redondeo **hacia
arriba**: un fraccionario obliga a comprar el ovillo siguiente completo).

### Validación (regla de 3)
- `skeinsA`: entero positivo (ovillos enteros).
- `lengthA`: finito y `> 0` (no puede ser 0 → división por cero, documentado).
- `lengthB`: finito y `> 0`.
- Cualquier violación → `InvalidCalculatorInputError`. Todas cubiertas.
- **Metrajes no enteros permitidos** (p. ej. 250.5 m); test dedicado donde el
  redondeo hacia arriba importa (`4×250.5/200 = 5.01 → 6`).

## Verificación
`bash ./init.sh` → **VERDE** (lint + typecheck + tests):

```
── 4. Verificación estática y tests (Node) ──
[OK]    lint verde
[OK]    typecheck verde
 Test Files  30 passed | 1 skipped (31)
      Tests  281 passed | 6 skipped (287)
[OK]    tests verdes
── 5. Resumen ──
[OK]    Entorno listo. Puedes empezar a trabajar.
```

- Antes: 266 tests. Después: **281 passed** (+15 nuevos, 0 rotos). Los 6 skipped son
  el smoke contra Neon (requiere flag `SMOKE_NEON=1`), sin cambios.
- `pnpm build` → **OK**. No añade rutas nuevas (confirmado en el listado de rutas).
- Se usó **pnpm** en todo momento (nunca npm/npx).

## Notas para el reviewer / leader
- El caso canónico está fijado por un test que compara el string completo con
  `toBe(...)`, incluido el símbolo `×` (U+00D7).
- Todas las decisiones de fraseo de casos borde tienen su test correspondiente; si
  el reviewer prefiere otra redacción para `P < A`, el punto de cambio único es
  `formatSegment` en `increases.ts`.

# Review — bugfix `isDuplicateColorCode` (feature #8 `yarns_catalogs`, reabierta)

**Veredicto:** APPROVED

## Resumen
El fix corrige que `isDuplicateColorCode` no reconocía la violación
`UNIQUE(brandId, colorCode)` del driver Neon real, donde el `NeonDbError`
(`code "23505"`, `constraint "yarns_brand_color_code_unique"`) viaja en
`error.cause` y no en el nivel superior. El BFF daría 500 en vez de 409 en
`createYarn`/`updateYarn`. La corrección es mínima, quirúrgica y correcta.

## Verificación propia
- `bash ./init.sh` → exit 0. lint verde, typecheck verde.
  `Test Files 26 passed | 1 skipped (27)` · `Tests 249 passed | 6 skipped (255)`.
  242 → 249 (+7), coincide con lo declarado. El smoke queda **skipped** sin
  `SMOKE_NEON` (1 archivo skipped, 6 tests skipped): confirmado que no abre
  conexión en la corrida hermética.
- No re-corrí el smoke real contra Neon (evito abrir red a la DB de
  producción). Me baso en `progress/reports/smoke_neon.md` (6/6, DB limpia) y,
  sobre todo, en el test hermético anidado, que es el guardián no tautológico.

## Diff de `src/features/yarns/api/store.ts` (store.ts:79-121)
- `isDuplicateColorCode` recorre la cadena `.cause` con **bucle acotado**
  (`for depth = 0..MAX_CAUSE_DEPTH`, `MAX_CAUSE_DEPTH = 5`). Sin recursión: un
  `cause` autorreferente termina al agotar la guarda de profundidad, no cuelga
  (verificado por test y por lectura: el bucle no puede iterar de más).
- Conserva el **match plano** (compat con otros entornos) porque evalúa el
  nivel superior en la primera iteración (`depth = 0`).
- Usa la constante única `COLOR_CODE_CONSTRAINT` (store.ts:77); **no** hay
  literal duplicado del nombre de constraint en producción. La lógica de match
  se extrajo a `matchesDuplicateColorCode(error)` sin cambiar los criterios
  (`code === "23505"` | `constraint === COLOR_CODE_CONSTRAINT` |
  `message.includes(COLOR_CODE_CONSTRAINT)`).
- **Sin cambio de firma pública** ni efectos colaterales: el diff toca solo el
  bloque de la heurística; el resto del store (queries, `createYarn`/`updateYarn`
  cuerpos, scoping por `userId`) queda idéntico.

## Cobertura de `updateYarn`
Confirmado: `updateYarn` (store.ts:278-293) llama a la MISMA
`isDuplicateColorCode` en su `catch` (store.ts:287), igual que `createYarn`
(store.ts:266). El fix cubre ambos, no solo create. Test dedicado presente.

## Tests herméticos (`src/features/yarns/api/store.test.ts`, 7 casos)
- Forma **anidada real** `{ message, cause: { code, constraint } }` en
  `createYarn` (test 1): el doble en memoria no reproduce esta forma; sería
  ROJO sin el fix (el `message` "Failed query: insert into yarns" no contiene el
  nombre de constraint y el nivel superior no tiene `code`/`constraint`) → **no
  tautológico**, guardián de regresión válido.
- Profundidad (`cause.cause.code`), constraint anidado sin `code`, forma plana,
  **passthrough** de error no relacionado (`rejects.toBe(unrelated)`),
  `updateYarn` anidado, y **cause cíclico** (`rejects.toBe(cyclic)` sin colgar).
  Cubre todo lo pedido.

## Scope (confirmado por `git diff` / `git status`)
- Producción: SOLO `src/features/yarns/api/store.ts`. Test nuevo:
  `src/features/yarns/api/store.test.ts`.
- `src/__smoke__/neon.smoke.test.ts` NO modificado por este fix (permanece como
  guardia viva). Sin cambios en schema, migraciones ni otros features.

## Estado de la feature
`feature_list.json`: la feature #8 `yarns_catalogs` sigue **`in_progress`**
(no fue marcada `done` por el implementer). Correcto.

## Checkpoints
- C1: [x]  Arnés completo; `bash ./init.sh` exit 0.
- C2: [x]  Una sola feature `in_progress` (#8); features `done` con tests verdes.
- C3: [x]  Lógica en `features/yarns/api`; sin literal duplicado; sin capas nuevas.
- C4: [x]  Módulo con lógica no trivial cubierto por test real; lint+typecheck+tests verdes.
- C5: [x]  Sin artefactos sospechosos; informe presente; feature en estado correcto (`in_progress`).

## Cambios requeridos
Ninguno.

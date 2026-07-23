# Bugfix — detección de UNIQUE `(brandId, colorCode)` contra el driver Neon real

Feature **#8 `yarns_catalogs`** (reabierta `in_progress`). Bug destapado por el
smoke real contra Neon (`progress/reports/smoke_neon.md` §"❌ Discrepancia (#4)").

## El cambio exacto en `isDuplicateColorCode`

`src/features/yarns/api/store.ts`. Antes, la heurística solo inspeccionaba el
**nivel superior** del error (`.code`/`.constraint`/`.message`). Contra
`drizzle-orm/neon-http` la violación llega como un `DrizzleQueryError` con
`.code`/`.constraint` `undefined`; el `NeonDbError` real (`code: "23505"`,
`constraint: "yarns_brand_color_code_unique"`) viaja en **`error.cause`** → la
heurística devolvía `false` → el error crudo se propagaba → el BFF habría
respondido **500 en vez de 409**.

Fix mínimo y quirúrgico:

- Se extrajo el match de un nivel a `matchesDuplicateColorCode(error)` (misma
  lógica de antes: `code === "23505"`, o `constraint === COLOR_CODE_CONSTRAINT`,
  o `message.includes(COLOR_CODE_CONSTRAINT)`).
- `isDuplicateColorCode` ahora **recorre la cadena `.cause`** con guarda de
  profundidad (`MAX_CAUSE_DEPTH = 5`) mediante un bucle acotado. El bucle acotado
  también rompe cualquier ciclo `.cause` autorreferencial (no hay recursión
  infinita).
- Se **conserva** la constante existente `COLOR_CODE_CONSTRAINT` como fuente
  única del nombre de la constraint, y se **mantiene** el match plano (por si
  algún entorno entrega el error sin envolver).
- **Sin cambios** en la firma pública ni en el comportamiento de
  `createYarn`/`updateYarn`: siguen traduciendo a `DuplicateColorCodeError` vía
  la misma `isDuplicateColorCode`. `updateYarn` queda cubierto por el mismo fix
  porque comparte exactamente la heurística (ver test dedicado abajo). No se tocó
  schema, migraciones ni ningún otro fichero de producción.

## Test(s) hermético(s) añadido(s)

Nuevo archivo `src/features/yarns/api/store.test.ts`. Inyecta un **doble de
driver** en `createYarnStore(fakeDb)` cuyo `.returning()` lanza el error
suministrado, imitando la cadena de Drizzle (`insert().values().returning()` /
`update().set().where().returning()`). Casos:

1. `createYarn` traduce la forma **ANIDADA real** capturada en el smoke:
   `{ message: "Failed query: insert into \"yarns\" ...", cause: { code: "23505", constraint } }`.
   Este es el caso que el doble en memoria **no puede** reproducir (imita la
   forma plana) → guardia de regresión hermética.
2. `createYarn` traduce una cadena `.cause` **más profunda**
   (`{ cause: { cause: { code: "23505" } } }`).
3. `createYarn` reconoce el `constraint` anidado sin `code`.
4. `createYarn` sigue traduciendo la forma **PLANA** (otros entornos).
5. `updateYarn` traduce la forma **ANIDADA** (confirma que la misma corrección
   cubre update).
6. Un error no relacionado (`connection reset`) se **propaga tal cual** (no se
   traga por error).
7. Una cadena `.cause` **autorreferencial** no cuelga: se propaga tras agotar la
   guarda de profundidad.

Los tests existentes del doble (forma plana) siguen verdes sin cambios.

## Verificación real — `bash ./init.sh`

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
 Test Files  26 passed | 1 skipped (27)
      Tests  249 passed | 6 skipped (255)
[OK]    tests verdes
── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

242 → **249 tests** (+7 nuevos). El smoke sigue **skipped** sin el flag.

## Verificación contra la DB real — smoke `SMOKE_NEON=1` (cierra el loop)

`SMOKE_NEON=1 pnpm vitest run src/__smoke__/neon.smoke.test.ts` (con
`DATABASE_URL` exportado desde `.env`):

```
 Test Files  1 passed (1)
      Tests  6 passed (6)
   Duration  23.39s
```

El assert #4 (`UNIQUE (brandId, colorCode) → DuplicateColorCodeError desde el
driver real`) pasa a **verde**: **6/6 passed**. No se modificó
`src/__smoke__/neon.smoke.test.ts` (guardia viva); solo se re-corrió.

DB limpia tras el teardown (consulta directa a Neon):

```
users           0
projects        0
patterns        0
brands          0
yarn_types      0
yarns           0
project_yarns   0
craft_sessions  0
leftover smoke users: []
```

## Archivos

- **Modificado:** `src/features/yarns/api/store.ts` (solo `isDuplicateColorCode`
  + helper `matchesDuplicateColorCode` + constante `MAX_CAUSE_DEPTH`).
- **Creado:** `src/features/yarns/api/store.test.ts` (7 tests herméticos).

## Decisión no obvia

El doble de driver se tipa con `as unknown as NeonHttpDatabase` porque las rutas
bajo prueba solo usan `insert`/`update`; reproducir el contrato completo de
`NeonHttpDatabase` sería ruido. La forma del error anidado se copió literal del
smoke (`progress/reports/smoke_neon.md`), que es la fuente empírica del bug.

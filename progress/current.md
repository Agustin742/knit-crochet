# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** _ninguna_ (última cerrada: #3 `db_schemas` → done)
- **Inicio:** _—_
- **Agente:** _—_

## Plan

_Describe en 3-5 bullets qué vas a hacer antes de tocar código._

## Bitácora

- #1 `project_scaffold`, migración pnpm, #2 `db_setup_drizzle_neon` y #3 `db_schemas` cerradas (ver `history.md`).
- #3 hecha: enums en `shared/config`, 8 schemas Drizzle feature-first, migración `drizzle/0000_cold_marrow.sql`.

## Próximo paso

- Siguiente en cola: **#4 `auth_jwt`** (register/login/logout/me, password hasheado,
  JWT en cookie httpOnly, `src/proxy.ts` protegiendo rutas privadas, helper de sesión
  en `shared/lib`). Depende de los schemas de #3 (`User` en `features/auth/schema.ts`).
  A la espera de luz verde del usuario.

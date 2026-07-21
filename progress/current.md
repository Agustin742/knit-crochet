# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** _ninguna_ (última cerrada: #4 `auth_jwt` → done)
- **Inicio:** _—_
- **Agente:** _—_

## Plan

_Describe en 3-5 bullets qué vas a hacer antes de tocar código._

## Bitácora

- #1-#4 cerradas (ver `history.md`). Base lista: scaffold, Drizzle+Neon, 8 schemas, auth JWT.
- `bash ./init.sh` verde: lint, typecheck, **60 tests** en 10 archivos.
- Nota del entorno: **context7 no está disponible**; para research usar el código fuente
  instalado en `node_modules/` + doc oficial + verificación empírica (funcionó bien en #4).

## Próximo paso

- Siguiente en cola: **#5 `cloudinary_upload`** (helper en `shared/lib/cloudinary`,
  upload → devuelve URL, solo la URL se persiste, error de upload explícito, test con
  el cliente mockeado en el borde). Feature pequeña y aislada.
- **Deuda a saldar al arrancar #6** (anotada por el reviewer de #4, no bloqueante):
  reexportar `InvalidSessionError` desde `shared/lib/auth/session.ts` y añadir
  `withSession(handler)` / `sessionErrorResponse(error)` en `shared/lib/http.ts`,
  para no repetir `try/catch → 401` en los ~25 endpoints privados de #6-#10.

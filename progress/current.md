# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** _ninguna_ (última cerrada: #5 `cloudinary_upload` → done)
- **Inicio:** _—_
- **Agente:** _—_

## Plan

_Describe en 3-5 bullets qué vas a hacer antes de tocar código._

## Bitácora

- #1-#5 cerradas (ver `history.md`). Base completa: scaffold, Drizzle+Neon, 8 schemas,
  auth JWT + `proxy.ts`, y helper de Cloudinary. Toda la infraestructura está lista.
- `bash ./init.sh` verde: lint, typecheck, **70 tests** en 12 archivos.
- Nota del entorno: **context7 no está disponible**; para research usar el código fuente
  instalado en `node_modules/` + doc oficial + verificación empírica.

## Próximo paso

- Siguiente en cola: **#6 `projects_crud`** — la feature más grande del PRD (CRUD +
  `progress` calculado + `rounds` + `completedSteps` + enlace N:N con lanas, ~10 endpoints).
  Candidata a dividir en sub-tareas según la tabla de escalado del leader.

## Deuda técnica acumulada (a saldar al arrancar #6)

1. **Boilerplate de sesión** (de #4): reexportar `InvalidSessionError` desde
   `shared/lib/auth/session.ts` y añadir `withSession(handler)` /
   `sessionErrorResponse(error)` en `shared/lib/http.ts`, para no repetir
   `try/catch → 401` en los ~25 endpoints privados de #6-#10.
2. **Orden de firma de Cloudinary** (de #5): `upload.ts:59` usa `localeCompare`
   (sensible a locale/ICU). Correcto con las claves actuales; migrar a comparador
   binario si #6/#8/#9 añaden más params firmables.
3. **Sanitización al cablear Cloudinary** (de #5): `folder`/`publicId` deben venir de
   constantes o del `userId` del JWT, validados con zod, **nunca del body crudo**.
4. **`tsconfig.tsbuildinfo` está trackeado en git** (pre-existente): es artefacto de
   build, añadir a `.gitignore` y dejar de versionarlo.

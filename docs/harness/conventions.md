# Convenciones de código

> Homogeneidad extrema. La IA predice mejor cuando el repositorio se parece
> a sí mismo en todas partes.

## Idioma (regla del PRD §4)

- **El código está en inglés:** nombres de tablas, clases, atributos, enums,
  rutas de API y archivos.
- **La UI y la prosa van en español.**

## TypeScript / React

- **TypeScript estricto:** `strict: true`. Prohibido `any` salvo justificación
  documentada. Prefiere `unknown` + narrowing.
- **Server vs Client:** por defecto Server Component. `"use client"` solo cuando
  necesites estado/efectos/eventos del navegador.
- **Imports:** externos primero, luego internos con alias (`@/...`). Cada feature
  expone su API pública desde un `index.ts`; consume otros features por su
  `index.ts`, no por rutas internas.
- **Strings:** comillas dobles `"..."`. Template literals para interpolación.
- **Async:** `async/await`, nada de cadenas de `.then()`.

## Nombres

| Tipo                        | Convención        | Ejemplo                  |
|-----------------------------|-------------------|--------------------------|
| Componentes / archivo       | `PascalCase.tsx`  | `ProjectCard.tsx`        |
| Hooks                       | `useCamelCase`    | `useAuth`                |
| Funciones / variables       | `camelCase`       | `getProjectById`         |
| Tipos / interfaces / enums  | `PascalCase`      | `Project`, `CraftType`   |
| Constantes                  | `UPPER_SNAKE`     | `JWT_COOKIE_NAME`        |
| Route Handlers              | `route.ts`        | `app/api/projects/route.ts` |
| Tablas / columnas Drizzle   | `snake_case`      | `used_quantity`          |
| Features (carpeta)          | `kebab-case`      | `time-tracking`          |

## Dónde va cada cosa (feature-first)

- Schema Drizzle de la entidad → `features/<x>/schema.ts`.
- Lógica / servicios → `features/<x>/api/`.
- Validación de entrada → `features/<x>/validation.ts` (zod), un esquema por endpoint.
- Estado de cliente → `features/<x>/store.ts` (zustand).
- Utilidades compartidas (jwt, hashing, cloudinary, fetch) → `shared/lib`.
- Enums y constantes (`CraftType`, `ColorFamily`, comparativas) → `shared/config`.
- Cliente Drizzle + conexión Neon → `shared/db`.

## Manejo de errores

- Errores de dominio nombrados (p. ej. `class AuthError extends Error`) en la
  capa del feature o en `shared/lib`.
- Los Route Handlers capturan, loguean del lado servidor y responden con el
  status HTTP correcto + JSON `{ error: string }`. Nunca propagan stack traces.
- Códigos usados en el PRD: `401` (no auth), `404` (no existe), `409` (borrado
  de lana referenciada; requiere `?force=true`).

## Validación

- **Zod** en cada endpoint. Valida `body`, `params` y `query` antes de la lógica.

## Comentarios

Por defecto **no** se escriben. Solo cuando explican un *por qué* no obvio
(workaround documentado, invariante sutil). Los nombres hacen el resto.

## Tests

- Un test por servicio/endpoint con lógica no trivial: camino feliz + al menos
  un camino de error.
- Colócalos junto al feature (`features/<x>/**/*.test.ts`) o en `__tests__/`,
  de forma consistente en todo el repo.
- Nada de mocks de DB/fs donde puedas usar un doble real acotado (DB de test).

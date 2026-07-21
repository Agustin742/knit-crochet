# Research: setup Drizzle + Neon (feature #2 `db_setup_drizzle_neon`)

> Fuente: **context7** (docs oficiales `/drizzle-team/drizzle-orm-docs` y driver
> `/neondatabase/serverless`), consultado el 2026-07-20 contra el stack real del
> proyecto: Next 16.2, React 19, TS 5.9 strict, ESM (`"type": "module"`), pnpm 11.9.

## Paquetes a instalar (con **pnpm**, nunca npm)

```bash
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit
```

- `drizzle-orm` → ORM + adaptador `drizzle-orm/neon-http`.
- `@neondatabase/serverless` → driver HTTP de Neon (bajo latencia, edge/serverless).
- `drizzle-kit` (dev) → genera/aplica migraciones.

## Cliente Drizzle (va en `src/shared/db/`, NO en `src/db`)

Patrón recomendado por las docs (permite pasar `schema` más adelante en #3):

```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle({ client: sql });
```

Notas:
- El driver `neon-http` es **lazy**: crear el cliente NO abre conexión (la primera
  query sí). Por eso el test puede construir el cliente sin red.
- Requisito de capas (architecture.md regla 3 + acceptance): el acceso a Drizzle
  vive SOLO en `shared/db` + schemas/servicios de features. Ningún componente lo
  importa.
- **Env obligatoria:** `DATABASE_URL` (formato
  `postgres://user:pass@host.neon.tech/db`). El módulo `shared/db` debe **fallar
  con un error nombrado y claro** si `DATABASE_URL` no está definida (regla:
  errores explícitos, secretos por entorno). No hardcodear la URL.

## drizzle.config.ts (raíz del proyecto)

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/features/**/schema.ts", // feature-first: cada entidad en su feature (#3)
  out: "./drizzle",                       // carpeta de migraciones versionadas
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- `schema` como **glob feature-first** (los schemas reales llegan en la feature #3).
  Alternativa válida: un barrel `./src/shared/db/schema.ts` que reexporte los
  schemas de features. Elegir una y ser consistente.
- `out: "./drizzle"` → añadir a `.gitignore`? NO: las migraciones SÍ se versionan.
  Añadir `./drizzle` al control de versiones (no ignorar).

## Comandos drizzle-kit (con **pnpm exec**, nunca npx)

```bash
pnpm exec drizzle-kit generate   # genera SQL de migración desde el schema
pnpm exec drizzle-kit migrate    # aplica migraciones a la DB
pnpm exec drizzle-kit push       # (dev) empuja el schema sin migración versionada
```

Recomendado: añadir scripts a `package.json` (NO cambies los ya existentes):
`"db:generate": "drizzle-kit generate"`, `"db:migrate": "drizzle-kit migrate"`.

## Alcance de la feature #2 (NO invadir #3)

- #2 = **plumbing**: cliente en `shared/db`, `drizzle.config.ts`, drizzle-kit
  operativo, `DATABASE_URL` en `.env.example`, y test del cliente.
- Las **entidades reales** (User, Project, Yarn, …) y la **migración inicial
  aplicable** son la **feature #3** (`db_schemas`). NO crear esas tablas aquí.
- "drizzle-kit genera migraciones a partir del schema" se demuestra dejando el
  pipeline funcional; con schemas aún vacíos `generate` no produce tablas (es
  esperado). No inventar tablas placeholder salvo que sea imprescindible para
  probar el comando, y si se hace, dejarlo mínimo y claramente temporal.

## Test (acceptance bullet 4)

- Verificar que el cliente `db` se inicializa con la env correcta: setear
  `process.env.DATABASE_URL` y comprobar que el `db` exportado se construye sin
  error (no hace red por ser lazy).
- Camino de error: sin `DATABASE_URL` → el módulo lanza el error nombrado.
- Runner: **Vitest** (ya configurado). Ubicar el test junto a `shared/db` o en
  `__tests__/`, consistente con el repo.

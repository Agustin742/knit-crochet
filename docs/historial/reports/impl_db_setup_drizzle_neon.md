# Informe de implementación — Feature #2 `db_setup_drizzle_neon`

Estado: **implementada, lista para review** (no marcada `done`).

## Alcance cubierto (acceptance)

1. `shared/db` expone el cliente Drizzle configurado desde `DATABASE_URL`, con
   error nombrado `MissingDatabaseUrlError` si falta la env. Nunca se hardcodea
   la URL.
2. `drizzle.config.ts` listo (`dialect: postgresql`, `schema` barrel, `out: ./drizzle`,
   `dbCredentials.url` desde env). `drizzle-kit generate` corre sin error.
3. Ningún componente importa Drizzle: el acceso vive solo en `src/shared/db`.
4. Test Vitest con camino feliz (cliente se inicializa con env) y de error
   (sin `DATABASE_URL` → error nombrado).
5. `DATABASE_URL` ya estaba en `.env.example` (formato Neon). Migraciones en
   `./drizzle` versionadas (no ignoradas en `.gitignore`).

## Archivos creados

- `src/shared/db/index.ts` — cliente Drizzle (`neon-http`) + `createDbClient()`
  factory + `MissingDatabaseUrlError`. `db` se inicializa de forma perezosa vía
  Proxy: importar el módulo no abre conexión ni lanza; el error nombrado aparece
  en el primer uso real (compatible serverless/edge y testeable sin red).
- `src/shared/db/schema.ts` — barrel de schemas (vacío por ahora; la feature #3
  re-exportará cada `features/<x>/schema.ts` aquí).
- `src/shared/db/index.test.ts` — 4 tests: cliente configurado con env, string de
  conexión explícito, `createDbClient` lanza `MissingDatabaseUrlError` sin env, y
  fallo perezoso nombrado en el primer uso de `db`.
- `drizzle.config.ts` — config de drizzle-kit.

## Archivos modificados

- `package.json` — dependencias `drizzle-orm@0.45.2`, `@neondatabase/serverless@1.1.0`,
  devDep `drizzle-kit@0.31.10`; scripts nuevos `db:generate` y `db:migrate`
  (sin tocar los scripts existentes).
- `pnpm-workspace.yaml` — añadido `esbuild` a `onlyBuiltDependencies` y
  `allowBuilds: {esbuild,sharp,unrs-resolver}: true` (ver "Decisiones / tooling").
- `src/shared/db/.gitkeep` — eliminado (el directorio ya tiene archivos reales).

## Artefactos generados

- `drizzle/meta/_journal.json` (`{"version":"7","dialect":"postgresql","entries":[]}`),
  correcto para 0 tablas. Se versiona.

## Versiones instaladas

- drizzle-orm 0.45.2
- @neondatabase/serverless 1.1.0
- drizzle-kit 0.31.10 (dev)

## Salida real de la verificación

`bash ./init.sh` → **VERDE**:

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
 Test Files  2 passed (2)
      Tests  6 passed (6)
[OK]    tests verdes
── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
INIT_EXIT=0
```

`pnpm exec drizzle-kit generate` → **EXIT 0**:

```
Reading config file 'drizzle.config.ts'
0 tables
No schema changes, nothing to migrate 😴
```

## Decisiones no obvias

- **Barrel vs glob para `schema`.** El research proponía glob feature-first
  (`./src/features/**/schema.ts`) o barrel como alternativa válida. Con cero
  schemas (la feature #3 crea las entidades), el glob matchea 0 archivos y
  drizzle-kit **falla** con "No schema files found". Elegí el barrel
  `./src/shared/db/schema.ts` (vacío, `export {}`): mantiene feature-first (solo
  re-exportará los `features/<x>/schema.ts`) y deja el pipeline **operativo ya**
  sin inventar tablas placeholder. La feature #3 solo tiene que poblar el barrel.
- **`db` perezoso vía Proxy.** Permite testear el camino de error por import sin
  que el módulo lance al cargarse, y evita abrir conexión en import (mejor para
  serverless). El driver `neon-http` ya es lazy; el Proxy solo difiere la
  construcción del cliente y bindea métodos al cliente real.
- **Mensaje de error en español** (prosa dev-facing); el nombre de la clase de
  error va en inglés (`MissingDatabaseUrlError`) según convenciones de código.

## Tooling / bloqueo resuelto (pnpm, NO npm en ningún momento)

`drizzle-kit` arrastra `esbuild`, que trae build scripts. pnpm 11 los bloquea por
defecto. Esto provocaba que `verify-deps-before-run` hiciera fallar
(`ERR_PNPM_IGNORED_BUILDS`, exit 1) a **todo** `pnpm run`/`pnpm exec` (lint,
typecheck, test, drizzle-kit) por drift de config. La aprobación en
`pnpm-workspace.yaml` requería dos cosas en esta versión: listar `esbuild` en
`onlyBuiltDependencies` **y** poner `allowBuilds: {esbuild: true, sharp: true,
unrs-resolver: true}` (la plantilla "set this to true or false" que pnpm
auto-escribe). Con eso, `ignoredBuilds` quedó vacío y toda la verificación pasó.
No se usó npm/npx en ningún comando.

## Riesgos / notas para el reviewer

- No se ejecutó ninguna query real contra Neon (no hay credenciales ni tablas);
  la conexión se prueba solo a nivel de construcción del cliente (el driver es
  lazy). El smoke real contra Neon llegará con datos/migraciones de la #3.
- El barrel `src/shared/db/schema.ts` está vacío a propósito; NO crea entidades
  (eso es la #3). Si el reviewer prefiere el glob feature-first, habría que crear
  un primer schema real, lo cual invade la #3.
- `pnpm-workspace.yaml` `allowBuilds` es gestionado/auto-escrito por pnpm cuando
  hay builds sin aprobar; quedó en `true` y estable tras la última verificación.

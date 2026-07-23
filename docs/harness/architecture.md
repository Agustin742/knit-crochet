# Arquitectura — Qué significa "hacer un buen trabajo"

> Este documento define el estándar de calidad. Los agentes revisores
> evalúan código contra este archivo. Si no está aquí, no es un requisito.
>
> La **fuente única de verdad funcional** (qué construir) es
> `docs/product/PRD-01-estructura-funcional.md`. Este archivo define **cómo**
> construirlo. Ante conflicto de alcance, manda el PRD.

## Stack

| Capa | Elección |
|---|---|
| Framework | Next.js 16+ (App Router) + TypeScript (strict) |
| Protección de rutas | `src/proxy.ts` (Next.js 16, reemplaza a `middleware.ts`) |
| Estado cliente | Zustand |
| BFF | Route Handlers (`src/app/api/**/route.ts`) |
| DB | Neon (Postgres serverless) |
| ORM | Drizzle ORM + drizzle-kit (migraciones) |
| Validación | Zod (un esquema por endpoint) |
| Auth | JWT propio (password hasheado + cookie httpOnly, `SameSite=Lax`) |
| Imágenes | Cloudinary (se guarda **solo la URL** en la DB) |
| Deploy | Vercel |
| 3D / estilos | Three.js y Tailwind → **fuera del alcance del PRD-01** |

## Principio rector: Feature-First

Organización **por feature**, no por tipo técnico. Cada feature es
autocontenido. `src/app/` queda fino: solo rutea y compone. La estructura de
referencia (del PRD §3) es:

```
src/
├── app/                    # App Router (thin: routing + composición)
│   ├── (auth)/ (app)/      # grupos de rutas
│   └── api/**/route.ts     # BFF: parsea, valida (zod), llama al servicio, serializa
├── proxy.ts                # protección de rutas vía JWT
├── features/
│   └── <feature>/
│       ├── api/            # servicios (la lógica vive aquí)
│       ├── schema.ts       # tabla(s) Drizzle
│       ├── types.ts
│       ├── validation.ts   # esquemas zod
│       ├── store.ts        # zustand (si aplica)
│       ├── hooks/
│       └── index.ts        # API pública del feature
└── shared/
    ├── db/                 # cliente Drizzle + conexión Neon + migraciones
    ├── lib/                # jwt, hashing, cloudinary, fetch client, utils
    ├── config/             # enums, comparativas, familias de color
    └── ui/                 # componentes compartidos (fase visual)
```

> La estructura es una **base**, no un dogma (el PRD lo dice explícitamente).
> Pero las reglas de capas de abajo **sí** son obligatorias.

## Reglas de capas (obligatorias)

1. **La UI no accede a la DB.** Ningún componente ni página importa Drizzle.
   Los datos se obtienen vía Route Handler o props desde un Server Component.

2. **La lógica vive en `features/<x>/api/`.** Los Route Handlers son finos:
   parsean el request, validan con **zod**, llaman al servicio del feature y
   serializan la respuesta. Nada de lógica de negocio dentro del `route.ts`.

3. **El acceso a Drizzle vive en la capa de datos** (`shared/db` +
   `features/<x>/schema.ts` + servicios del feature). No en componentes.

4. **Todo recurso es por usuario.** Cada query hace scoping por `userId`
   extraído del JWT. Aislamiento total entre usuarios.

5. **Validación en el borde.** Todo input externo (body, params, query) se
   valida con zod antes de tocar la lógica de dominio.

6. **Errores explícitos y tipados.** Nada de `any`. Las funciones que pueden
   fallar lanzan errores nombrados. Los Route Handlers responden con el status
   HTTP correcto (400/401/404/409/500) + JSON `{ error }`, nunca stack traces.

7. **Campos calculados en el servicio.** P. ej. `Project.progress` se recalcula
   en el servicio al mutar `rounds`/`targetRounds` (ver PRD §4.2).

8. **Secretos por entorno.** Neon, Cloudinary y JWT viven en variables de
   entorno, nunca en el código.

## Capa de schema

> Decisión de arquitectura tomada tras cerrar #7 (2026-07-22), con el usuario.
> Motivo: el reviewer de #7 detectó un ciclo de imports entre features y el
> `ProjectStore` acumulando limpieza de tablas ajenas. Ambos síntomas tenían la
> misma raíz, y #8/#9 los habrían multiplicado.

**S1. Un `schema.ts` importa solo `schema.ts`.** Las tablas de otro feature se
importan por su ruta directa (`@/features/yarns/schema`), nunca por el `index.ts`.
El barrel arrastra `./api`, que llega al store, que importa el schema → ciclo.
El grafo de FKs es un DAG; la capa de schema debe reflejarlo y quedar **por
debajo** de la capa de servicios, sin conocerla.

**S2. La cascada de borrado la declara la FK, no el servicio.** El `onDelete` de
cada FK expresa la relación real, distinguiendo **posesión** de **referencia**:

| FK | `onDelete` | Por qué |
|---|---|---|
| `project_yarns → projects` | `cascade` | El enlace pertenece al proyecto |
| `craft_sessions → projects` | `cascade` | La sesión pertenece al proyecto |
| `project_yarns → yarns` | `no action` | La lana es referenciada, no poseída: el PRD §4.5 exige 409 + `?force=true` |
| `projects → patterns` | `set null` | `patternId` es nullable y el patrón se comparte (1→N) |
| `yarn_types → brands` | `no action` | Borrar una marca con tipos → **409** (decisión de producto, #8) |
| `yarns → brands` / `yarns → yarn_types` | `no action` | Íd.: no se destruye inventario por cascada |

Corolario: **no se escriben métodos de limpieza manual en los stores** (el
patrón `removeYarnLinks` / `removeCraftSessions` queda obsoleto). Si un borrado
necesita lógica —advertencia, `?force=true`, recálculo de un cache como
`Project.time`— eso sí vive en el servicio; el barrido de filas poseídas lo hace
Postgres.

> Precedente que lo motiva: la FK `no action` indiscriminada causó el rechazo de
> #6 (`DELETE` de proyecto con lanas → 500) y amenazaba a #7 y #8. Se corrigió
> cuando aún no se había aplicado ninguna migración a Neon, es decir, a coste cero.

## Qué NO hacer

- Consultar Drizzle desde un componente de React.
- Meter lógica de negocio en un `route.ts`.
- Devolver stack traces al cliente.
- Guardar imágenes como blobs — solo la URL de Cloudinary.
- Descontar stock de lana al enlazarla a un proyecto (ver PRD §4.5: `quantity`
  la gestiona el usuario; `usedQuantity` es un contador aparte).
- Añadir una dependencia pesada sin justificarla en `feature_list.json`.
- Introducir capas nuevas (repos genéricos, DDD) sin razón documentada.

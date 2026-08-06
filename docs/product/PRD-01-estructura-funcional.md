# PRD 01 — Knit&Crochet · Estructura Funcional

> **Alcance de este PRD:** define la **estructura funcional** de la aplicación: modelo de datos,
> entidades, relaciones, endpoints (BFF), y la lógica de cronómetro, métricas y calculadoras.
> **Fuera de alcance (etapa posterior):** toda la UI/estilos, componentes visuales, y Three.js.
>
> **Este documento es la fuente única de verdad del proyecto.** (`specs.md` fue solo el insumo
> inicial para redactarlo y no debe consultarse como referencia.) Idioma del producto: **español**.

---

## 0. Proceso de implementación (entorno de agentes)

Este proyecto se construye con un **arnés multi-agente** de Claude Code
(líder → implementador → revisor). Cómo trabaja el equipo de agentes:

- **Fuente de verdad → alcance ejecutable:** cada entregable de este PRD (§12)
  está desglosado en `feature_list.json`, con criterios de `acceptance`
  verificables. El campo `prd_ref` de cada feature apunta a la sección exacta
  de este documento.
- **Una feature a la vez.** El `implementer` toma una feature `pending`, escribe
  código **y tests**, y se autoverifica con `bash ./init.sh`. El `reviewer` la
  aprueba/rechaza contra `docs/harness/` y `CHECKPOINTS.md` antes de cerrarla.
- **Cómo construir (arquitectura y convenciones):** ver `docs/harness/`
  (`architecture.md`, `conventions.md`, `verification.md`). La estructura
  feature-first de §3 y las reglas de capas son obligatorias.
- **Qué construir:** manda **este PRD**. Ante conflicto entre el harness y el
  PRD sobre el alcance funcional, gana el PRD.

> Nota de idioma/estructura: §3 (estructura de carpetas) usa `src/features`,
> `src/shared` y `src/proxy.ts`; el harness ya está alineado a eso.

---

## 1. Objetivo

Aplicación web con persistencia directa en base de datos para gestionar proyectos de tejido
(**dos agujas** y **crochet**), inventario de lanas, patrones, estadísticas, cronómetro por
proyecto y calculadoras de utilidad.

La distinción **Dos Agujas ↔ Crochet** es transversal y **crítica**: implica campos, filtros y
lógica diferenciada (no es solo una etiqueta). Un proyecto/patrón es de **un único tipo** (no mixto).

---

## 2. Stack técnico

| Capa | Elección |
|---|---|
| Framework | **Next.js 16+** (App Router) + **TypeScript** · protección de rutas con `proxy.ts` (ex-`middleware.ts`) |
| Estilos | Tailwind *(fase visual posterior)* |
| Estado cliente | **Zustand** |
| BFF | **Route Handlers** (`app/api/**`) |
| DB | **Neon** (PostgreSQL serverless) |
| ORM | **Drizzle ORM** |
| Auth | **JWT** propio (password + hash) |
| Imágenes | **Cloudinary** (se guarda la URL en DB) |
| Iconos | lucide-react *(fase visual)* |
| 3D | Three.js → **fuera de alcance por ahora** |
| Deploy | **Vercel** |
| Tests | **Sí** (incluidos en este PRD) |

---

## 3. Arquitectura — Feature First

Organización por **feature**, no por tipo técnico. Cada feature es autocontenido (schema, tipos,
validación, servicios, store, hooks, componentes). `app/` queda fino: solo rutea y compone. No debes atarte a esta estructura, es solo a manera de ejemplo y como base

```
src/
├── app/                          # Next.js App Router (thin: routing + composición)
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (app)/
│   │   ├── page.tsx              # Principal / Dashboard
│   │   ├── projects/page.tsx
│   │   ├── yarns/page.tsx
│   │   ├── patterns/page.tsx
│   │   └── calculators/page.tsx
│   ├── api/                      # Route Handlers → delegan en features
│   │   ├── auth/**
│   │   ├── projects/**
│   │   ├── yarns/**
│   │   ├── brands/**
│   │   ├── patterns/**
│   │   ├── sessions/**
│   │   └── dashboard/**
│   └── layout.tsx
│
├── proxy.ts                      # protección de rutas vía JWT (Next.js 16: reemplaza middleware.ts)
│
├── features/
│   ├── auth/
│   │   ├── api/                  # servicios (register, login, verify)
│   │   ├── schema.ts             # tabla drizzle: usuarios
│   │   ├── types.ts
│   │   ├── validation.ts         # zod
│   │   ├── store.ts              # zustand (sesión cliente)
│   │   └── hooks/
│   ├── projects/                 # proyectos + join proyecto-lana + pasos completados
│   ├── yarns/                    # lanas + marcas + tipos de lana
│   ├── patterns/
│   ├── time-tracking/            # cronómetro + sesiones de tejido
│   ├── calculators/             # aumentos + regla de 3 (lógica pura, sin DB)
│   └── dashboard/                # agregación de métricas
│
└── shared/
    ├── db/                       # cliente drizzle + conexión Neon + migraciones
    ├── lib/                      # jwt, hashing, cloudinary, fetch client, utils
    ├── config/                   # constantes (enums, comparativas, familias de color)
    └── ui/                       # componentes compartidos (fase visual)
```

**Convenciones:**
- Cada feature expone su API pública desde un `index.ts`.
- Los Route Handlers en `app/api/**` son finos: parsean request, llaman al servicio del feature,
  serializan respuesta. La lógica vive en `features/<x>/api/`.
- Validación de entrada con **zod** en cada endpoint.
- Todos los recursos son **por usuario** (scoping por `userId` en cada query).

---

## 4. Modelo de datos

> **Convención de idioma:** el **código está en inglés** (nombres de tablas/clases, atributos, enums,
> rutas de API y archivos). La **UI y la prosa** van en español. Abajo, entre paréntesis, el término de
> dominio en español para referencia.

Enums globales (`shared/config`):

- `CraftType = 'knitting' | 'crochet'`  *(tipo de tejido: dos agujas / crochet)*
- `ProjectStatus = 'in_progress' | 'paused' | 'finished' | 'abandoned'`
  - Un proyecto se considera **activo** si `status ∈ { in_progress, paused }`.
- `ColorFamily = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'violet' | 'pink' | 'brown' | 'gray' | 'black' | 'white' | 'neutral' | 'multicolor'`

### 4.1 User (usuario)

```ts
User {
  id: uuid (pk)
  email: string (unique)
  passwordHash: string
  name: string
  createdAt: timestamp
  updatedAt: timestamp
}
```

### 4.2 Project (proyecto)

```ts
Project {
  id: uuid (pk)
  userId: uuid (fk → User)
  name: string
  image: string | null           // URL Cloudinary (una sola foto)
  type: CraftType                // ← transversal (dos agujas / crochet)
  status: ProjectStatus          // reemplaza el boolean `activo`
  rounds: number                 // contador actual (vueltas)
  targetRounds: number           // meta de vueltas (para calcular progreso)
  progress: number               // CALCULADO = round(rounds / targetRounds * 100), clamp 0..100
  needles: number[]              // medidas en mm; puede ser varias (agujas).
                                 //   label en UI según type: "agujas" (knitting) / "ganchillo" (crochet)
  startDate: timestamp           // fecha de inicio
  endDate: timestamp | null      // fecha final; null hasta terminar
  time: number                   // segundos acumulados (derivado de CraftSession; cache)
  patternId: uuid | null         // fk → Pattern (1 patrón puede estar en N proyectos)
  completedSteps: number[]       // índices de instrucciones del patrón completadas EN ESTE proyecto
  notes: string                  // notas
  createdAt: timestamp
  updatedAt: timestamp
}
```

> **`progress`** es campo calculado. Se recalcula en el servicio al mutar `rounds`/`targetRounds`.
> Si `targetRounds = 0` → `progress = 0`.

### 4.3 Pattern (patrón)

```ts
Pattern {
  id: uuid (pk)
  userId: uuid (fk → User)
  name: string
  image: string | null           // URL Cloudinary
  type: CraftType                // dos agujas / crochet
  instructions: { key: string, value: string }[]   // pasos ordenados clave-valor
                                 //   (ej: key = "Paso 1" / nombre de vuelta, value = la instrucción)
                                 //   el "completado" se guarda por proyecto (índices del array)
  metadata: { key: string, value: string }[]        // clave-valor flexible (size, muestra, largo…)
  inLibrary: boolean             // true = aparece en la lista global de Patrones
                                 // false = patrón EMBEBIDO, creado dentro de un proyecto
  createdAt: timestamp
  updatedAt: timestamp
}
```

> **Embebido vs biblioteca:** un patrón puede vivir solo dentro de un proyecto
> (`inLibrary = false`) o publicarse a la biblioteca (`inLibrary = true`) para reusarlo en
> otros proyectos. Un patrón de biblioteca puede enlazarse desde varios proyectos (1 → N).

### 4.4 Brand y YarnType (marca / tipo — catálogos jerárquicos)

Filtro de lanas: **brand → type**. Se modelan como catálogos gestionables por usuario.

```ts
Brand {
  id: uuid (pk)
  userId: uuid (fk → User)
  name: string
}

YarnType {
  id: uuid (pk)
  brandId: uuid (fk → Brand)     // el tipo pertenece a una marca
  name: string
}
```

### 4.5 Yarn (lana)

Cada fila representa un **grupo de ovillos individuales** de una combinación concreta
(brand · type · color · lot). Ejemplo: 3 ovillos de marca X / tipo T / color Z, y
aparte 2 ovillos de marca X / tipo T / color B → **dos filas**.

```ts
Yarn {
  id: uuid (pk)
  userId: uuid (fk → User)
  image: string | null           // URL Cloudinary
  brandId: uuid (fk → Brand)
  typeId: uuid (fk → YarnType)
  colorName: string              // nombre del color
  colorCode: string              // código alfanumérico, ÚNICO POR MARCA (brandId)
  colorFamily: ColorFamily       // lista fija (para filtrar)
  quantity: number               // stock en OVILLOS — gestionado manualmente por el usuario
  usedQuantity: number           // ovillos consumidos (métricas), INDEPENDIENTE del stock
  length: number                 // metros por ovillo (largo)
  fiber: string                  // fibra
  recommendedNeedle: { min: number, max: number }   // rango en mm (aguja recomendada)
  thickness: number              // grosor
  lot: timestamp                 // fecha de lote (más fácil de filtrar)
  createdAt: timestamp
  updatedAt: timestamp
}
```

> **Constraint:** `(brandId, colorCode)` único.
> **Stock vs consumo:** `quantity` la administra el usuario a mano; enlazar una lana a un
> proyecto **no** descuenta stock. `usedQuantity` es un contador aparte, solo para métricas.

### 4.6 ProjectYarn (relación N:N — solo referencia)

```ts
ProjectYarn {
  projectId: uuid (fk → Project)
  yarnId: uuid (fk → Yarn)
  // PK compuesta (projectId, yarnId). Sin cantidad: es solo referencia.
}
```

> **Advertencia:** al borrar una lana (`Yarn`) referenciada por algún proyecto, el
> endpoint responde con advertencia/confirmación explícita antes de proceder.

### 4.7 CraftSession (sesión de tejido — cronómetro en vivo)

```ts
CraftSession {
  id: uuid (pk)
  userId: uuid (fk → User)
  projectId: uuid (fk → Project)
  start: timestamp               // inicio
  end: timestamp | null          // fin; null mientras el timer corre
  duration: number               // segundos (se calcula al detener)
}
```

> El **timer en vivo** crea una `CraftSession` al arrancar (`end = null`). Al detener se setea
> `end` y `duration`. `Project.time` se mantiene como suma cacheada de `duration`.
> Las sesiones con fecha permiten las **métricas por año**.

---

## 5. Relaciones (resumen)

- `User` **1—N** `Project`, `Yarn`, `Pattern`, `Brand`, `CraftSession`.
- `Brand` **1—N** `YarnType`.
- `Brand`/`YarnType` **1—N** `Yarn`.
- `Project` **N—N** `Yarn` (vía `ProjectYarn`, solo referencia).
- `Pattern` **1—N** `Project` (un patrón reusable en varios proyectos; `patternId` nullable).
- `Project` **1—N** `CraftSession`.

---

## 6. Páginas y navegación

Menú principal: **Principal · Proyectos · Lanas · Patrones · Calculadora**.
(No hay página "Stash" separada: sería redundante.)

### 6.1 Principal (Dashboard)
- Métricas de cuánto se tejió, con **filtro por año** y **filtro por tipo** (dos agujas/crochet).
- Métrica conmutable entre **horas**, **cantidad de proyectos** y **metros de lana**.
- **Comparativas graciosas** sobre los metros de lana (lista fija — ver §8).
- Dos botones: **crear proyecto Dos Agujas** / **crear proyecto Crochet**.
- Lista de **proyectos activos** (`status ∈ {in_progress, paused}`).

### 6.2 Proyectos
- Filtros: **activo/no-activo** (aparte) + varios (tipo, aguja, lana usada, rango de fechas).
- Toggle de vista por tipo (dos agujas / crochet).
- CRUD completo. Cada item: foto, nombre, barra de progreso, tiempo total.
- Al abrir un item: detalle ver/editar según mutabilidad del objeto.

### 6.3 Lanas
- Filtros: **marca → tipo** (jerárquico) + familia de color.
- CRUD completo. Cada item: icono, marca · tipo · color, cantidad (stock).

### 6.4 Patrones
- Filtros: por **tipo** (dos agujas/crochet) + metadata. *(Nota: los patrones **no** tienen estado
  activo/no-activo; ese filtro aplica solo a Proyectos. A confirmar si se desea añadir.)*
- Toggle de vista por tipo. CRUD completo. Cada item: foto, nombre.

### 6.5 Calculadora
- Aumentos + Regla de 3 (ver §7). Resultados **efímeros** (no se persisten).

---

## 7. Calculadoras (lógica pura, sin DB)

### 7.1 Aumentos
Aplica igual para dos agujas y crochet. Distribuye aumentos de forma pareja.

**Entrada:** `currentStitches (P)`, `stitchesToAdd (A)`
**Salida:** instrucción legible (en español, para la UI).

Algoritmo (distribución uniforme del remanente):
```
si A <= 0 o P <= 0 → error de validación
base      = floor(P / A)       // puntos entre aumentos
remainder = P mod A            // aumentos que llevan un punto extra antes
// resultado: `remainder` tramos de (base+1) puntos + aumento, luego (A - remainder) tramos de base puntos + aumento
```
Ejemplo `P=40, A=6` → base=6, remainder=4 →
`"Teje 7 p, aumenta 1 (×4); luego teje 6 p, aumenta 1 (×2). Total: 46 p."`

### 7.2 Regla de 3
**Entrada:** `skeinsA`, `lengthA` (metros), `lengthB` (metros)
**Salida:** `skeinsB = ceil(skeinsA * lengthB / lengthA)`

---

## 8. Métricas del Dashboard

Filtros: **año** + **tipo**. Métrica conmutable:

| Métrica | Cálculo | Filtrable por año |
|---|---|---|
| **Horas de tejido** | `Σ CraftSession.duration` con `start` en el año | ✅ (por `start` de sesión) |
| **Cantidad de proyectos** | proyectos iniciados y/o terminados en el año | ✅ (`startDate` / `endDate`) |
| **Metros de lana** | `Σ (Yarn.usedQuantity × Yarn.length)` | ⚠️ agregado global (ver nota) |

> **Nota metros/año:** como el consumo (`usedQuantity`) no está fechado por sesión, la métrica de
> metros se presenta como **agregado total (lifetime)**. Si más adelante se quiere metros por año,
> habría que fechar el consumo (decisión diferida).

**Comparativas graciosas** (lista fija, `shared/config`, sobre metros de lana). Semilla:

| Referencia | Metros |
|---|---|
| Un colectivo | 12 |
| El Obelisco | 67.5 |
| La Torre Eiffel | 330 |
| Un campo de fútbol | 105 |
| El Everest | 8849 |

Ej: "Tejiste 700 m ≈ 2 Obeliscos 🗼". La lista es editable en config.

### 8.1 Comparativas para las **tres** métricas (decidido 2026-08-05, feature #16)

El texto de arriba sólo cubría metros. **RFC-02 §1** decide que las comparativas son **para las tres
métricas**, así que esta sección extiende el contrato. Decisiones cerradas por el usuario, **no se reabren**:

- **`comparison` pasa de objeto suelto a MAPA por métrica.** La clave `comparison` de §9 se conserva; cambia
  su contenido: `comparison: { hours, projects, yarnMeters }`, una entrada por métrica.
- **`referenceMeters` se renombra a `referenceValue`.** El nombre viejo estaba atado a metros y no sirve para
  horas ni proyectos. Cada entrada es `{ label, referenceValue, times }`.
- **Es un cambio de forma (breaking) y se hace AHORA a propósito:** hoy no lo consume nadie (`#19
  dashboard_ui` está `pending`, no hay UI). Hacerlo después obliga a tocar backend y UI a la vez.
- **`referenceValue` viaja en la MISMA unidad que su métrica**, para que `times` sea un cociente puro:
  **segundos** para `hours` (que es la unidad almacenada, ver §9 y el docstring de `DashboardMetrics.hours`),
  **unidades** para `projects`, **metros** para `yarnMeters`.
- **Las listas de referencia de horas y proyectos** (semilla nueva; la de metros no cambia):

| Horas | Valor |
|---|---|
| Un partido de fútbol | 1,5 h |
| Un vuelo a Bariloche | 2,3 h |
| El Señor de los Anillos (extendida) | 11,4 h |
| Un vuelo a Madrid | 12,5 h |
| Una semana laboral | 45 h |
| Un mes de trabajo | 180 h |

| Proyectos | Valor |
|---|---|
| Un par | 2 |
| Un equipo de fútbol | 11 |
| Una docena | 12 |
| Un aula | 30 |
| Un colectivo lleno | 60 |

Las tres listas viven en `shared/config` como **listas fijas y editables**, igual que `YARN_COMPARISONS`.
**Nunca hardcodeadas en el servicio.**

> ⚠️ **Trampa de unidades, fichada aquí porque muerde en silencio:** la lista de horas se escribe **en horas**
> porque es lo que lee un humano que la edite, pero la métrica `hours` está **en segundos**. La conversión va
> por una constante nombrada, nunca por un `3600` suelto, y tiene que haber un test que distinga las dos
> unidades — un cruce aquí da un `times` equivocado por un factor de 3600 **sin romper ningún tipo**.

---

## 9. Endpoints (BFF · Route Handlers)

Todos requieren JWT válido (salvo `register`/`login`) y hacen scoping por `userId`.

### Auth
- `POST /api/auth/register` — { email, password, name } → crea usuario + JWT (cookie httpOnly)
- `POST /api/auth/login` — { email, password } → JWT
- `POST /api/auth/logout`
- `GET  /api/auth/me` — usuario actual

### Projects (proyectos)
- `GET    /api/projects` — filtros: `?active=&type=&needle=&yarnId=&patternId=&from=&to=`
  (`patternId` = **"en qué proyectos se usa este patrón"**, ver **§9.2**, feature #18)
- `POST   /api/projects`
- `GET    /api/projects/:id` — responde `{ project, yarns }` con las lanas enlazadas (ver **§9.1**, feature #17)
- `PATCH  /api/projects/:id` — recalcula `progress` si cambia `rounds`/`targetRounds`
- `DELETE /api/projects/:id`
- `POST   /api/projects/:id/rounds` — incrementa/decrementa contador ({ delta })
- `PATCH  /api/projects/:id/steps` — marca pasos completados ({ completedSteps })
- `POST   /api/projects/:id/yarns` / `DELETE /api/projects/:id/yarns/:yarnId` — enlace N:N

#### 9.1 `GET /api/projects/:id` incluye las lanas enlazadas (decidido 2026-08-06, feature #17)

Salda la **deuda técnica 5**. Decisiones cerradas por el usuario, **no se reabren**:

- **Las lanas cuelgan de una clave HERMANA, no de dentro de `project`:** la respuesta pasa de `{ project }` a
  **`{ project, yarns }`**. `project` queda **byte a byte como hoy** y sigue siendo exactamente un
  `ProjectRecord` (la fila de la tabla), sin mentir en los tipos. Es además el estilo que ya usa la sub-ruta
  hermana `POST /api/projects/:id/yarns`, que devuelve `{ yarnIds }` al mismo nivel. **Es puramente
  aditivo:** nada de lo que hoy lee `project` se entera del cambio.
- **Cada lana lleva exactamente cinco campos, planos:**
  `{ id, colorName, colorFamily, brandName, typeName }`.
  - `colorFamily` es lo que pinta el **swatch** de RFC-03 §2; `brandName`, `typeName` y `colorName` son el
    texto *"marca·tipo·colorName"* de esa misma sección.
  - **`id` va porque sin él la UI no puede desenlazar** (`DELETE /api/projects/:id/yarns/:yarnId`).
  - **`brandName` y `typeName` no están en la fila de `yarns`**: son FKs a `brands` y `yarn_types`, así que
    esto **exige un JOIN**. Es el motivo de que la deuda 5 siguiera abierta.
  - Se descartó a propósito incluir `colorCode` e `image`: el RFC no los pide y añadirlos hoy sería alcance
    inventado. **Añadir un campo después es aditivo y barato**; quitarlo, no.
- **Sin lanas enlazadas, `yarns` es una lista vacía**, nunca `null` ni ausente.
- **`GET /api/projects` (la lista) NO las lleva.** La ficha habla sólo de `:id`, y RFC-03 §1 fija que la card
  es *"solo foto, nombre, progress, tiempo"*.

#### 9.2 "En qué proyectos se usa este patrón" (decidido 2026-08-06, feature #18)

RFC-05 §3 dejaba la forma **abierta al slice de backend** ("vía filtro `?patternId=` en `GET /api/projects`,
o `usedBy` en `GET /api/patterns/:id`"). Decisión cerrada por el usuario, **no se reabre**:

- **Se expone como filtro: `GET /api/projects?patternId=<id>`.** `GET /api/patterns/:id` **no cambia**: sigue
  respondiendo `{ pattern }`.
- **Por qué el filtro y no `usedBy`:**
  - Es **el mismo mecanismo ya probado** que `?yarnId=`, que contesta la pregunta **idéntica** para lanas.
    Con `usedBy` la app respondería *la misma pregunta de dos maneras distintas* según la entidad, que es la
    asimetría que después nadie recuerda.
  - **Respeta la dirección del grafo de FKs**, que la arquitectura obliga a tratar como un DAG
    (`architecture.md` §S1): `projects.patternId → patterns`, o sea **projects depende de patterns**. Con
    `usedBy`, el `PatternStore` tendría que consultar la tabla `projects` e invertir esa dirección — que es
    **exactamente la forma que la regla S1 salió a prohibir** tras el ciclo que destapó el reviewer de #7.
  - **No inventa contrato:** devuelve proyectos con la forma que ya tienen.
- **Precio aceptado a propósito:** el drawer de detalle del patrón hace **dos peticiones** (el patrón y sus
  proyectos) en vez de una. Se prefirió eso a invertir una dependencia entre features.
- **Scoping por `userId`**, como todos los filtros. Un patrón ajeno no puede usarse para descubrir proyectos.
- **Patrón sin uso → lista vacía**, nunca error.

### Sessions (cronómetro)
- `POST  /api/projects/:id/sessions/start` — crea sesión (`end = null`)
- `PATCH /api/projects/:id/sessions/stop` — cierra sesión activa, recalcula `time`
- `GET   /api/projects/:id/sessions` — historial

### Yarns + catálogos
- `GET/POST /api/brands`, `DELETE /api/brands/:id`
- `GET/POST /api/brands/:id/types`, `DELETE /api/brands/:id/types/:typeId` (jerárquico)
  - `DELETE` de marca con tipos/lanas, o de tipo con lanas → **`409` (bloquear)**: no hay
    cascada ni `?force`; el usuario debe vaciar los hijos primero (ver §11.8).
- `GET  /api/yarns` — filtros: `?brandId=&typeId=&colorFamily=`
- `POST/GET/PATCH/DELETE /api/yarns[/:id]`
  - `DELETE` con lana referenciada por un proyecto → responde `409` + advertencia; requiere `?force=true`

### Patterns (patrones)
- `GET  /api/patterns` — filtros: `?type=&inLibrary=`
- `POST/GET/PATCH/DELETE /api/patterns[/:id]`

### Dashboard
- `GET /api/dashboard/metrics` — `?year=&type=` → { hours, projects, yarnMeters, comparison }
  donde `comparison` es un **mapa por métrica** `{ hours, projects, yarnMeters }` y cada entrada es
  `{ label, referenceValue, times }` (ver **§8.1**, feature #16).

### Calculators (calculadoras)
- Sin endpoints: lógica pura en `features/calculators`, se ejecuta en cliente (resultados efímeros).

---

## 10. Auth (JWT)

- Registro/login con **password hasheado** (bcrypt/argon2).
- JWT firmado, guardado en **cookie httpOnly** (`SameSite=Lax`).
- **`proxy.ts`** (Next.js 16, reemplaza al antiguo `middleware.ts`) protege `(app)/**` y `/api/**`
  (excepto auth público). Exporta la función `proxy(request: NextRequest)` y vive en la raíz de `src/`.
- Cada servicio filtra por `userId` extraído del token (aislamiento total entre usuarios).

---

## 11. Supuestos / decisiones tomadas

1. `Pattern` **sin** estado activo; se filtra por `type`.
2. Métrica de **metros de lana** (`yarnMeters`) es agregado lifetime (el consumo no está fechado).
3. Catálogos **`Brand`/`YarnType` por usuario** (no compartidos globalmente).
4. `needles` como `number[]` (mm); el label agujas/ganchillo se deriva de `type`.
5. `completedSteps` vive en el **`Project`** (el patrón es compartido, el avance es por proyecto).
6. Timestamps (`createdAt`/`updatedAt`) en todas las entidades para orden y auditoría.
7. **Cableado de Cloudinary — diferido a la fase de UI, como endpoint de subida único.**
   El helper de subida (`shared/lib/cloudinary`) ya existe (feature 5), pero el **cableado**
   real (recibir un archivo → subirlo → devolver la URL) se implementa recién en la fase de
   UI, no en la etapa funcional de este PRD. Las entidades con imagen (`Project`, `Yarn`,
   `Pattern`) guardan `image` como **URL string** y eso es suficiente para el alcance datos/
   BFF/lógica: sin formulario no hay archivo (`Blob`) que subir. Cuando se cablee, será un
   **único endpoint compartido** (p. ej. `POST /api/uploads/image`), no uno por entidad, y
   deberá derivar `folder`/`publicId` del `userId` del JWT validados con zod, **nunca** del
   body crudo (deuda técnica 3 del harness). *(Decisión tomada el 2026-07-22.)*
8. **Borrado de catálogos (`Brand`/`YarnType`) = `409` bloqueante, sin `?force` ni cascada.**
   Borrar una marca con tipos o lanas, o un tipo con lanas, se **bloquea** con `409`: el
   usuario debe vaciar los hijos antes. Es intencionalmente **distinto** del borrado de una
   `Yarn` referenciada por un proyecto (que sí admite `?force=true` para forzar). Por eso las
   FKs `yarn_types→brands`, `yarns→brands`, `yarns→yarn_types` son `ON DELETE no action` a
   propósito, y el `409` se comprueba **antes** de borrar. *(Decisión tomada el 2026-07-22.)*
9. **Contrato de `POST /api/uploads/image`: lista blanca de tipos, tope de tamaño y
   `publicId` único por subida.** Resuelve lo que el punto 7 dejó abierto al cablear el
   endpoint (feature 15). Tres decisiones:
   - **Tipos aceptados:** `image/jpeg`, `image/png`, `image/webp`. Cualquier otro → `400`.
     Es una **lista blanca**, no una lista negra: lo no enumerado se rechaza.
   - **Tamaño máximo: 4 MB.** Cubre una foto de móvil sin dejar el endpoint abierto. **El valor
     está atado a la plataforma, no elegido al gusto:** el deploy es Vercel, y sus funciones
     tienen un límite de cuerpo de petición de **4,5 MB** aplicado **a nivel de infraestructura**
     — no se puede subir desde `vercel.json` ni desde el código, y lo que lo excede muere con un
     **413 `FUNCTION_PAYLOAD_TOO_LARGE`** de la plataforma, **antes** de que nuestro handler
     exista, así que el cliente recibiría un error que no es nuestro `{ error }`. Los 4 MB dejan
     margen para el sobrecoste del `multipart` (límites de campo y cabeceras). *(Se cerró primero
     en 5 MB el 2026-08-04 y se corrigió a 4 MB el 2026-08-05, cuando el reviewer de la feature 15
     detectó el choque y se verificó contra la documentación de Vercel. **Quien suba este tope
     tiene que resolver antes el límite de la plataforma**, típicamente subiendo del navegador
     directo a Cloudinary con una firma en vez de pasar el binario por la función.)*
   - **Las dos se comprueban ANTES de llamar a Cloudinary**, no después. Un archivo que no
     pasa el filtro no debe consumir red ni cuota: el rechazo es local y barato.
   - **`publicId` único por subida** (no determinista por usuario ni por entidad). Motivo: las
     entidades guardan la **URL**, y un `publicId` determinista haría que la segunda foto de un
     usuario **sobrescribiera** la primera en Cloudinary, rompiendo en silencio las URLs ya
     persistidas en filas anteriores. El PRD no contempla borrado de imágenes, así que la
     colisión no tendría quien la repare. El `folder` **sí** es determinista por `userId`.
   *(Decisión tomada el 2026-08-04. Tipos y tamaño los eligió el usuario; el `publicId` único
   lo decidió el leader por la razón de arriba y queda aquí registrado, no implícito.)*

---

## 12. Entregables de este PRD (checklist de implementación)

> El **estado real** de cada entregable se rastrea en `feature_list.json`
> (`pending` / `in_progress` / `done`), no en estos checkboxes. Abajo, el mapeo
> entregable → feature del arnés. Los tests **no** son una feature aparte: son
> parte del `acceptance` de cada una (`require_tests_to_close`).

- [ ] **feature 1** · Setup Next.js 16 + TS + estructura feature-first (Tailwind es fase visual, fuera de este PRD).
- [ ] **feature 2** · Conexión Neon + Drizzle + migraciones.
- [ ] **feature 3** · Schemas Drizzle de todas las entidades (§4): `User`, `Project`, `Pattern`, `Brand`, `YarnType`, `Yarn`, `ProjectYarn`, `CraftSession` + enums.
- [ ] **feature 4** · Auth JWT (register/login/me/logout + `proxy.ts`).
- [ ] **feature 5** · Integración Cloudinary (upload → guardar URL).
- [ ] **feature 6** · CRUD `Project` + `progress` calculado + `rounds` + `completedSteps` + enlace `Yarn`.
- [ ] **feature 7** · Cronómetro (`CraftSession` start/stop) + cache `time`.
- [ ] **feature 8** · CRUD `Yarn` + catálogos `Brand`/`YarnType` + advertencia de borrado.
- [ ] **feature 9** · CRUD `Pattern` (biblioteca / embebido).
- [ ] **feature 10** · Métricas dashboard (`hours`/`projects`/`yarnMeters` + comparativas).
- [ ] **feature 11** · Calculadoras (aumentos + regla de 3).
- [ ] _(transversal)_ Tests de servicios y endpoints → incluidos en el `acceptance` de cada feature.

# Inventario de arranque de **#22 `projects_form_ui`**

> **Fecha:** 2026-08-25 · **Autor:** subagente de exploración (sólo lectura) · **Transcrito por:** leader
> (el explorador corre sin herramienta de escritura).
> **Para qué sirve esto:** el paso 2 del protocolo de arranque — *comprobar qué piezas da por hechas la
> ficha y NO existen*. Ya evitó dos arranques en falso (#19 y #21).

---

## Tabla de veredicto

| Pieza que la ficha #22 da por hecha | ¿Existe? | Evidencia |
|---|---|---|
| `POST /api/uploads/image` (feature 15) | **SÍ** | `src/app/api/uploads/image/route.ts:28` |
| **Consumidor de UI de ese endpoint** | **NO** | cero `type="file"` y cero `FormData` en todo `src/` |
| `GET /api/patterns` (listar biblioteca) | **SÍ** | `src/app/api/patterns/route.ts:16-27` → 200 `{ patterns }` |
| `POST /api/patterns` | **SÍ** | `src/app/api/patterns/route.ts:29-40` → 201 `{ pattern }` |
| **Cliente de navegador para LISTAR patrones** | **NO** | sólo `getPattern(id)` en `projects-client.ts:425` |
| **Campo de "patrón embebido" en el proyecto** | **NO** | `projects` sólo tiene `patternId` FK (`schema.ts:33-35`) |
| `createProject` / `updateProject` / `deleteProject` de **servidor** | **SÍ** | `api/create-project.ts:11`, `api/update-project.ts:13`, `api/delete-project.ts:13` |
| `DELETE /api/projects/:id` | **SÍ** | `src/app/api/projects/[id]/route.ts:74-91` → **204 sin cuerpo** |
| **`deleteProject` de CLIENTE** | **NO** | no existe en ningún archivo de cliente |
| **`createProject` / `updateProject` de cliente para el form completo** | **NO** | el del Dashboard acepta **sólo `{name, type}`** (`dashboard-client.ts:152`) |
| `Field`, `Input`, `Dialog`, `Button`, `Card`, `Tabs`, `Toggle`… | **SÍ** | `shared/ui/primitives/index.ts:1-9` |
| **`Select`** | **NO** | hoy se hace a mano: `<select className={inputClasses}>` en `ProjectsToolbar.tsx:174` y `:196` |
| **`Textarea`** | **NO** | cero coincidencias; `notes` acepta **5000 caracteres** sin control |
| **Input de archivo / uploader** | **NO** | cero `type="file"` en `src/` |
| **Confirm dialog** | **NO** | lo único preparado es `dismissOnScrimClick` de `Dialog` (`Dialog.tsx:74-75`) |
| **Control para `needles: number[]`** (hasta 20) | **NO** | `schema.ts:29`, `validation.ts:7-9` |
| **Los dos botones de creación rápida en `/proyectos`** | **NO** | hoy son dos `<Link href="/">` **sólo en el estado vacío** (`ProjectsView.tsx:400-411`) |

---

## 1. Subida de foto (feature 15)

**El endpoint existe y su contrato está fijado.** `src/app/api/uploads/image/route.ts:28`.

- Acepta **`multipart/form-data`** y lee **sólo el campo `file`** (`route.ts:37`).
- Valida **antes** de tocar Cloudinary: `Blob` no vacío, mime en `image/jpeg|image/png|image/webp`
  (`src/features/uploads/validation.ts:8-12`), máximo **4 MB** (`validation.ts:24`, atado al límite de
  payload de Vercel).
- **Devuelve `201` con `{ url }`** (`route.ts:44`). Errores: `401` (`:33`), `400` de validación (`:39`),
  **`502` si Cloudinary falla** (`:48-51`), `500` si falta configuración (`:54`).
- La carpeta y el `publicId` **se derivan del JWT**: ningún campo del cuerpo influye
  (`src/features/uploads/api/upload-user-image.ts:44`).

> ⚠️ **Aviso con ficha (deuda 60, `progress/deudas.md:923`):** el contrato es **201**, campo **`file`**,
> respuesta **`{ url }`**. **Asumir 200 rompe en el navegador y no en los tests.** #22 es el **primer
> consumidor real desde navegador** de este endpoint (deuda 64, `deudas.md:984`).

## 2. Patrones — "elegir de biblioteca o embebido"

**Lo "embebido" NO es un campo del proyecto.** Vive en la **tabla de patrones**: `inLibrary: boolean`
(`src/features/patterns/schema.ts:18`), documentado en `patterns/types.ts:22` como
*"`true` = biblioteca (reusable en N proyectos); `false` = embebido"*.

**Por lo tanto, embeber un patrón son DOS peticiones:** `POST /api/patterns` con `inLibrary: false`, y
después fijar `projects.patternId`. Hoy **no hay cliente ni UI para ninguna de las dos**.

Campos reales de `projects` (`schema.ts:17-40`): `id, userId, name, image, type, status, rounds,
targetRounds, progress, needles, startDate, endDate, time, patternId, completedSteps, notes, createdAt,
updatedAt`. El único enganche con patrón es
`patternId: uuid(...).references(patterns.id, { onDelete: "set null" })`.

## 3. Crear / editar / borrar

**Servidor completo.** `POST /api/projects` → 201 `{ project }`; `PATCH /api/projects/:id` → 200
`{ project }`; **`DELETE /api/projects/:id` → 204 sin cuerpo**, 404 si no existe o el id no es uuid.

**Cliente: existe todo menos el CRUD del formulario.** Hay `getProjects`, `getProjectDetail`,
`addProjectRounds`, `updateProjectTargetRounds` (**PATCH con un solo campo**), `setProjectSteps`,
`linkProjectYarn`, `unlinkProjectYarn`, `getProjectSessions`, `startCraftSession`, `stopCraftSession`,
`getPattern`. **Faltan** un `createProject` completo, un `updateProject(id, patch)` genérico y
**`deleteProject`**.

**Pieza ya construida y reutilizable para el borrado:** `requestWithoutBody(url, init)`
(`projects-client.ts:278`), escrita justo porque `response.json()` revienta sobre un 204.

> ⚠️ **Aviso con ficha (deuda 129, `deudas.md:1790-1803`):** el cliente HTTP de navegador va por su
> **tercer clon**, y la ficha dice que *"el momento natural de extraerlo es **antes de #22**"*.

## 4. Primitivos

**Existen:** `Field` (cablea `id`, `aria-invalid`, `aria-describedby` al hijo,
`primitives/field/Field.tsx:41`), `Input` con `inputClasses` exportado (`field/Input.tsx:23` y `:8`),
`Dialog` con portal, jaula de foco, `Escape`, bloqueo de scroll y devolución de foco (`dialog/Dialog.tsx:134`)
y **`placement="center"` = modal** (`dialog.variants.ts:30-33`), más `Button`, `Card`, `ProgressBar`,
`SegmentedControl`, `Skeleton`, `Tabs`, `Toggle`/`ToggleGroup`.

**No existen y #22 los necesita:** `Select`, `Textarea`, input de archivo, confirm dialog y un control
para `needles: number[]`.

## 5. Los dos botones de creación rápida

**En `/proyectos` no son botones de crear:** son dos `<Link href="/">` al Dashboard, y **sólo dentro del
estado vacío** (`ProjectsView.tsx:400-411`, etiquetas en `:85-88`). El propio código lo anticipa en
`:490-493`: *"el formulario de alta es la feature #22… Cuando #22 exista, esto se cambia por el modal sin
tocar nada más."*

**En el Dashboard sí existen y ya preseleccionan el tipo** — ése es el precedente exacto:
`DashboardView.tsx:305-311` (`onClick={() => setNewProjectType(candidate)}`), estado en `:116`, modal
montado condicionalmente en `:356-364`. **Hoy el único punto de entrada a "crear proyecto" es la ruta `/`.**

## 6. De qué copiar

**Para el modal con formulario, el precedente es `NewProjectDialog.tsx` del Dashboard** (más cercano que
el drawer de #21):

- `initialFocusRef` al primer campo (`:95` + ref en `:54`), soportado por `Dialog` (`Dialog.tsx:88`).
- `<form noValidate method="post">` con el motivo escrito (`:97-104`).
- **Valida en cliente con el MISMO schema del endpoint** (`createProjectSchema`, `:64`), importado **por
  ruta interna** `@/features/projects/validation` y **no por el barrel**: el porqué está en `:5-12` — el
  barrel arrastra Drizzle al bundle del navegador.
- Al fallar la validación **mueve el foco al campo inválido** (`:72`, deuda 38); el error de formulario va
  en un `<p role="alert">` (`:106-113`); el submit usa `<Button loading={pending}>` (`:125`).

**Para el ciclo de vida del diálogo, el precedente es `ProjectDetailDrawer.tsx` de #21:**

- **El hijo no tiene estado `open`**: renderiza `<Dialog open …>` y **devuelve `null` si no hay dato**
  (`:198-200`, `:238-245`). El dueño es el padre, que guarda **el id y no el objeto** (`ProjectsView.tsx:173`,
  con el razonamiento en `:170-172`).
- **El estado pendiente se DERIVA, no se guarda un booleano**: `requestKey = id|reloadToken` (`:112`),
  `settled = loaded?.key === requestKey` (`:117`). El reintento es un **contador** (`:108`, `:150`) porque
  un booleano no dispara dos peticiones seguidas.
- Errores de carga con `ErrorState` + `onRetry` (`:264-270`); errores de acción con `ActionError`
  (`role="alert"`, **sólo se monta si hay mensaje**, `DetailTabParts.tsx:57-66`).
- La copia vive en **constantes exportadas** (`project-detail.ts`) y **los tests importan esas constantes**
  en lugar de reescribir los strings.

# RFC-05 — Patrones

- **Alcance:** lista + filtros + CRUD de patrones (biblioteca/embebido) con editor de instrucciones/metadata.
- **Estado:** borrador. Depende de **RFC-01**.
- **Proceso / arnés:** ver **[RFC-00](RFC-00-proceso.md)** (entorno de agentes, jerarquía de verdad, mapeo a `feature_list.json`).
- **Estética:** template adaptable.

---

## 1. Decisiones que fija este RFC

- **Sin estado activo/inactivo** (revertido): el filtro es **toggle Biblioteca/Embebidos** (`inLibrary`) **+ tipo** (agujas/crochet). **Sin cambio de modelo.**
- **Detalle en drawer**; **crear/editar en modal**; **ver/editar por separado**.
- **Card = foto y nombre solamente.**
- **Editor de `instructions` y `metadata`:** filas con **agregar / reordenar (drag) / borrar**; `metadata` como **tabla clave-valor libre**.
- **La página lista todos** (biblioteca + embebidos); se **puede publicar a biblioteca** desde la UI.
- **En el detalle se muestra en qué proyectos se está usando** el patrón.

## 2. Estructura y componentes

- **Toolbar:** toggle Biblioteca/Embebidos + botones de tipo (`kc-btn`) + buscar.
- **Lista:** grilla de cards: **foto + nombre** (sin más). Tap → drawer.
- **Drawer de detalle:** nombre, foto, tipo, `inLibrary`; **instrucciones** (lista ordenada clave-valor, solo lectura) + **metadata**; **"usado en" (proyectos)**; acciones: Editar (modal), Publicar a biblioteca.
- **Modal crear/editar:** form + foto (upload) + tipo + **editor de instrucciones** (filas ordenadas, drag para reordenar, agregar/borrar) + **editor de metadata** (tabla clave-valor).

## 3. Datos / backend

- `GET/POST/PATCH/DELETE /api/patterns` (filtros `?type=&inLibrary=`). Publicar a biblioteca = `PATCH { inLibrary: true }`.
- **"Usado en proyectos": DECIDIDO (2026-08-06, feature #18) → filtro `GET /api/projects?patternId=<id>`.** `GET /api/patterns/:id` **no cambia**. Se descartó `usedBy` porque invertiría la dirección del grafo de FKs (`projects.patternId → patterns`), que `architecture.md` §S1 obliga a tratar como un DAG, y porque `?yarnId=` ya contesta la pregunta idéntica para lanas. **Precio aceptado:** el drawer hace dos peticiones. Contrato completo en **PRD §9.2**.
- Borrado: `DELETE /api/patterns/:id` → 204; los proyectos que lo usaban quedan con `patternId=null` (FK `set null`, ya resuelto). **NO** 409, **NO** force.
- **Cambio de backend (nuevo):** parte del `POST /api/uploads/image` para la foto del patrón.

## 4. Estados

- **Vacío:** `kc-empty` → "Todavía no hay patrones" + "Crear patrón".
- **Error:** `kc-error` → "Se soltó un punto" + reintentar.
- **Loading:** `kc-skeleton`.
- **Borrado:** confirmación (`kc-dialog`); aviso de que los proyectos que lo usan quedarán sin patrón enlazado.

## 5. Accesibilidad

- Editor de filas operable por teclado (reordenar con teclas, no solo drag); toggle con `aria-pressed`.

## 6. Fuera de alcance

- El completado de pasos vive en el **proyecto** (RFC-03), no en el patrón.

## 7. Adaptación al harness

- Página `src/app/(app)/patrones/`. UI en `src/features/patterns/ui/`.
- Verificación: RTL (editor de instrucciones drag/keyboard, filtros, publicar, usado-en) + axe + smoke + build.

## 8. Slices de implementación (→ `feature_list.json`)

IDs reales en `feature_list.json` (mapeo en [RFC-00 §4](RFC-00-proceso.md)):

- **feature 18 `patterns_used_by`** (backend) — "usado en proyectos" (filtro `?patternId=` o `usedBy`, +tests).
- **feature 15 `uploads_image`** (backend, **compartido** con RFC-03/04) — `POST /api/uploads/image`
  (foto de patrón); **un endpoint único**, no uno por entidad.
- **feature 26 `patterns_list_ui`** — toggle Biblioteca/Embebidos + tipo + grilla de cards (foto+nombre).
- **feature 27 `patterns_detail_ui`** (drawer) — instrucciones/metadata (lectura) + usado-en + publicar a biblioteca.
- **feature 28 `patterns_form_ui`** (modal) — editor de instrucciones (drag/keyboard) + editor de metadata + foto.

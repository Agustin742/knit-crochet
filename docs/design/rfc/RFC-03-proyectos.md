# RFC-03 — Proyectos

- **Alcance:** lista + filtros + CRUD + detalle (con progreso, rounds, pasos, lanas, patrón y cronómetro).
- **Estado:** borrador. Depende de **RFC-01**.
- **Proceso / arnés:** ver **[RFC-00](RFC-00-proceso.md)** (entorno de agentes, jerarquía de verdad, mapeo a `feature_list.json`).
- **Estética:** template adaptable.

---

## 1. Decisiones que fija este RFC

- **Detalle en drawer lateral**; **crear/editar en modal**; **ver y editar por separado** (el drawer abre en modo ver; "editar" abre el modal).
- **Filtros principales:** activo/inactivo, tipo, rango de fechas. **Resto** (aguja, lana usada) en **"más filtros"**.
- **Activo/inactivo** = toggle **segmentado aparte**, default **activos**.
- **Botones de tipo** (agujas/crochet) **filtran** la lista.
- **Card = solo** foto, nombre, `kc-progress`, tiempo total (los detalles se ven al abrir).
- **Detalle en tabs:** General · Progreso · Lanas · Sesiones.
- **Rounds** con controles **+/−**.
- **Pasos (checklist):** si el proyecto **no** tiene patrón, **se ocultan** y se ofrece **"crear patrón"**.
- **Cronómetro:** Start/Stop + tiempo en vivo + histórico; **quick-start desde la card**.
- **Lanas enlazadas:** buscador/selector del inventario; se muestra el **color de la lana** + marca + tipo.
- **Patrón:** se puede **elegir de biblioteca** o **crear embebido** (ambas opciones).

## 2. Estructura y componentes

- **Toolbar:** segmentado activo/inactivo (`kc-tabs`/toggle) + botones de tipo (`kc-btn`) + "más filtros" (desplegable) + buscar.
- **Lista:** grilla de cards de proyecto: foto, nombre, `kc-progress`, tiempo, y **quick-start** de cronómetro (`kc-btn--icon`). Tap → drawer.
- **Drawer de detalle** (`kc-tabs`):
  - **General:** nombre, foto, tipo, status, needles, fechas, notas. Botón "Editar" → modal.
  - **Progreso:** rounds (+/−) + `targetRounds` (editable) → `kc-progress` recalculado; pasos (checklist si hay patrón; si no, "crear patrón").
  - **Lanas:** lista de lanas enlazadas (swatch de color + marca·tipo·colorName) + buscador para enlazar/desenlazar.
  - **Sesiones:** cronómetro Start/Stop (tiempo en vivo, tick client) + histórico de sesiones.
- **Modal crear/editar:** form (`kc-field`/`kc-input`) con foto (upload), tipo, targetRounds, needles, patrón (elegir/embebido).

## 3. Datos / backend

- `GET /api/projects` (filtros `?active=&type=&needle=&yarnId=&from=&to=`), `POST`, `GET/PATCH/DELETE /:id`.
- Acciones: `POST /:id/rounds` ({delta}), `PATCH /:id/steps` ({completedSteps}), `POST/DELETE /:id/yarns[/:yarnId]`.
- Cronómetro: `POST /:id/sessions/start`, `PATCH /:id/sessions/stop`, `GET /:id/sessions`.
- **Cambios de backend (nuevos):**
  - **`GET /:id` debe devolver las lanas enlazadas** (deuda 5) — hoy no las trae.
  - **Cloudinary incremental:** parte del `POST /api/uploads/image` para la foto del proyecto.

## 4. Estados

- **Loading:** `kc-skeleton` en las cards.
- **Vacío:** `kc-empty` → "Tu cesto está vacío — empezá un proyecto" + los 2 botones de crear.
- **Error:** `kc-error` → "Se soltó un punto" + reintentar.
- **Borrado:** confirmación siempre (`kc-dialog`); si el proyecto tiene lanas/sesiones, la cascada la maneja la FK (ya resuelto en backend).

## 5. Accesibilidad

- Segmentado con `aria-pressed`; rounds +/− con labels; cronómetro con `aria-live` para el tiempo; drawer con foco atrapado y `aria-modal`.

## 6. Fuera de alcance

- CRUD de lanas (RFC-04) y de patrones (RFC-05); acá solo se **enlazan**.

## 7. Adaptación al harness

- Página `src/app/(app)/proyectos/`. UI en `src/features/projects/ui/`.
- Verificación: RTL (filtros, rounds, enlazar lana, cronómetro start/stop) + axe + smoke + build.

## 8. Slices de implementación (→ `feature_list.json`)

IDs reales en `feature_list.json` (mapeo en [RFC-00 §4](RFC-00-proceso.md)):

- **feature 17 `projects_detail_yarns`** (backend) — `GET /:id` incluye lanas enlazadas (+tests).
- **feature 15 `uploads_image`** (backend, **compartido** con RFC-04/05) — `POST /api/uploads/image`
  (foto); **un endpoint único**, no uno por entidad.
- **feature 20 `projects_list_ui`** — toolbar (segmentado activo/inactivo, tipo, más filtros) + grilla
  de cards + quick-start.
- **feature 21 `projects_detail_ui`** (drawer + tabs) — General / Progreso (rounds, pasos) / Lanas
  (enlazar) / Sesiones (cronómetro).
- **feature 22 `projects_form_ui`** (modal) — form + foto + patrón (elegir/embebido).

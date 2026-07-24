# RFC-04 — Lanas

- **Alcance:** lista + filtro jerárquico marca→tipo + familia de color + CRUD de lanas + gestión de catálogos (marcas/tipos).
- **Estado:** borrador. Depende de **RFC-01**.
- **Proceso / arnés:** ver **[RFC-00](RFC-00-proceso.md)** (entorno de agentes, jerarquía de verdad, mapeo a `feature_list.json`).
- **Estética:** template adaptable.

---

## 1. Decisiones que fija este RFC

- **Detalle en drawer**; **crear/editar en modal**; **ver/editar por separado**.
- **Filtro marca→tipo = árbol/acordeón** (elegir marca despliega sus tipos).
- **Familia de color = swatches** clickeables.
- **Card = solo stock** (`quantity`); **icono = un ícono con el color de la lana** (no swatch de marca — la marca no tiene color, el color es de la lana).
- **`usedQuantity`** (consumido, para métricas) **NO va en el form de crear**: se edita en el **detalle** como **stepper aparte** (+/−).
- **Catálogos (marcas/tipos) se gestionan en la misma página**; desde el form de lana se puede **crear o elegir** marca/tipo si falta (para que sea user-friendly).
- **Form de lana en tabs** (son muchos campos).
- **Borrado siempre con confirmación explícita** (`kc-dialog`).

## 2. Estructura y componentes

- **Sidebar/acordeón de filtro:** árbol marca → tipo + fila de **swatches** de familia de color.
- **Lista:** grilla de cards: **ícono coloreado con el color de la lana** + `marca · tipo · colorName` + **stock** (`quantity`). Tap → drawer.
- **Drawer de detalle:** datos de la lana + **stepper de `usedQuantity`** (consumido) + botón "Editar" → modal.
- **Modal crear/editar (tabs):**
  - **Identidad:** marca (elegir/crear), tipo (elegir/crear, dependiente de la marca), colorName, `colorCode`, `colorFamily` (swatches), image (upload).
  - **Ficha técnica:** length, fiber, recommendedNeedle {min,max}, thickness, lot, quantity (stock).
- **Gestión de catálogos:** panel en la misma página (crear/borrar marca y tipo).

## 3. Datos / backend

- Lanas: `GET/POST /api/yarns` (filtros `?brandId=&typeId=&colorFamily=`), `GET/PATCH/DELETE /api/yarns/:id?force=`.
- Catálogos: `GET/POST/DELETE /api/brands[/:id]`, `GET/POST /api/brands/:id/types`, `DELETE /api/brands/:id/types/:typeId`.
- **Errores a mostrar:**
  - `colorCode` único por marca → **409** en create/update (mostrar en el campo, `kc-field.has-error`).
  - Borrar **lana referenciada** por proyectos → **409 + aviso**; requiere `?force=true` (dialog "está en N proyectos, ¿borrar igual?").
  - Borrar **marca/tipo con hijos** → **409 bloqueante, sin force** (dialog de aviso "tiene lanas/tipos; no se puede borrar").
- **Cambio de backend (nuevo):** parte del `POST /api/uploads/image` para la foto de la lana.

## 4. Estados

- **Vacío:** `kc-empty` → "Sin lanas en el stash todavía" + "Agregar lana".
- **Error:** `kc-error` → "Se enredó la madeja" + reintentar.
- **Loading:** `kc-skeleton`.

## 5. Accesibilidad

- Árbol de filtro navegable por teclado; swatches con `aria-label` del color; steppers con labels; dialogs con foco atrapado.

## 6. Fuera de alcance

- El enlace lana↔proyecto se gestiona desde Proyectos (RFC-03).

## 7. Adaptación al harness

- Página `src/app/(app)/lanas/`. UI en `src/features/yarns/ui/`.
- Verificación: RTL (filtro árbol, swatches, stepper usedQuantity, 409 colorCode, borrado force/bloqueante) + axe + smoke + build.

## 8. Slices de implementación (→ `feature_list.json`)

IDs reales en `feature_list.json` (mapeo en [RFC-00 §4](RFC-00-proceso.md)):

- **feature 15 `uploads_image`** (backend, **compartido** con RFC-03/05) — `POST /api/uploads/image`
  (foto de lana); **un endpoint único**, no uno por entidad.
- **feature 23 `yarns_list_ui`** — árbol marca→tipo + swatches + grilla de cards (ícono coloreado + stock).
- **feature 24 `yarns_detail_catalogs_ui`** — drawer con stepper `usedQuantity` + panel de gestión de
  marcas/tipos (con 409 bloqueante).
- **feature 25 `yarns_form_ui`** (modal, tabs) — identidad + ficha técnica, con crear/elegir marca-tipo
  inline y manejo de 409 de `colorCode`.

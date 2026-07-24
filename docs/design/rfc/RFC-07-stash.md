# RFC-07 — Stash (hub)

- **Alcance:** página-hub que enlaza a las funcionalidades de la app y a accesos directos de creación.
- **Estado:** borrador. Depende de **RFC-01**.
- **Proceso / arnés:** ver **[RFC-00](RFC-00-proceso.md)** (entorno de agentes, jerarquía de verdad, mapeo a `feature_list.json`).
- **Estética:** template adaptable.

---

## 1. Decisiones que fija este RFC

- **Stash = hub/menú** (no es el inventario de lanas). El término "6 tools" del specs fue un error; el contenido lo define este RFC.
- Lista **las herramientas** de la app **+ accesos directos a creación**.
- Formato: **cards grandes** (2 o 3 por fila) con **ícono + tipo**.

## 2. Estructura y componentes

- **Grilla de cards grandes** (`kc-card`, 2–3 por fila, responsive): cada una con ícono/motivo, título y una etiqueta de tipo (`kc-badge`).
- **Contenido propuesto** (a confirmar por el usuario):
  - **Herramientas/secciones:** Calculadoras, Proyectos, Lanas, Patrones, Dashboard.
  - **Accesos directos de creación:** "Nuevo proyecto (dos agujas)", "Nuevo proyecto (crochet)", "Nueva lana", "Nuevo patrón".
- Los accesos de creación abren el **modal** correspondiente (mismo de cada página); las secciones **navegan** a su página.

## 3. Datos / backend

- **Ninguno** (es navegación + disparadores de modales de creación). Sin cambios de backend.

## 4. Estados

- Sin loading/empty/error de red. Página estática de accesos.

## 5. Accesibilidad

- Cards como enlaces/botones con `aria-label` claro; grilla navegable por teclado; targets ≥ 44px.

## 6. Fuera de alcance

- La lógica de cada creación vive en el RFC de su página; acá solo se dispara.

## 7. Adaptación al harness

- Página `src/app/(app)/stash/`. UI en `src/features/stash/ui/` (o `shared/ui` si es puramente navegación).
- Verificación: RTL (los accesos navegan/abren el modal correcto) + axe + smoke + build.

## 8. Slice de implementación (→ `feature_list.json`)

ID real en `feature_list.json` (mapeo en [RFC-00 §4](RFC-00-proceso.md)):

- **feature 30 `stash_ui`** — grilla de cards grandes con secciones + accesos de creación (que reusan
  los modales de cada página). **Bloqueada** hasta confirmar §9 (ver RFC-00 §6).

## 9. Pendiente de confirmar

- La **lista exacta** de cards (secciones + accesos): ¿la propuesta de §2 va, o querés sumar/quitar?
  Mientras no se confirme, la feature 30 **no sale de `pending`** (RFC-00 §6).

# RFC-02 — Dashboard (Principal)

- **Alcance:** la página de inicio post-login. Métricas del año + comparativas + crear proyecto + activos + ovillo hero.
- **Estado:** borrador. Depende de **RFC-01 (shell)**.
- **Proceso / arnés:** ver **[RFC-00](RFC-00-proceso.md)** (entorno de agentes, jerarquía de verdad, mapeo a `feature_list.json`).
- **Estética:** template como insumo adaptable; ovillo ASCII fijo.

---

## 1. Decisiones que fija este RFC

- **Métrica conmutable** (horas / proyectos / metros) **y superponible** (se pueden ver combinadas, no solo una). **Default: horas.**
- **Comparativas graciosas siempre visibles**, y **para las 3 métricas** (no solo metros).
- **Filtro de año:** rango libre, abre en el **año actual**.
- **Filtro de tipo:** dos botones (agujas / crochet) que **se combinan**.
- **Lista de activos:** tope **N ≈ 15** con "ver todos"; orden default **último tejido**, cambiable desde la UI.
- **Dos botones de crear** (dos agujas / crochet) → abren el **modal de creación** con el `type` preseleccionado.
- **Ovillo ASCII de hero**: gira solo y se arrastra.

## 2. Estructura y componentes

- **Hero:** `<ascii-yarn>` (de RFC-01) + wordmark/saludo. En `kc-focusframe` para el encuadre luminoso.
- **Selector de métrica:** control conmutable/superponible (chips o `kc-toggle` múltiples) horas/proyectos/metros.
- **Panel de métricas:** `kc-card` por métrica activa, con el número grande (`--font-display`) + su **comparativa** (`--font-mono`, ej. "≈ 2 Torres Eiffel 🗼"). `kc-emphasis` en la comparativa.
- **Filtros:** selector de año (input/stepper, rango libre) + dos botones de tipo combinables (`kc-btn` con estado activo).
- **Botones crear:** `kc-btn--primary` ×2 ("Nuevo dos agujas", "Nuevo crochet").
- **Lista de activos:** `kc-card` compacta reutilizando la card de Proyectos (RFC-03): foto, nombre, `kc-progress`, tiempo. Control de orden (dropdown) + "ver todos" → Proyectos.

## 3. Datos / backend

- Consume `GET /api/dashboard/metrics?year=&type=` → `{ hours, projects, yarnMeters, comparison }`.
- Lista de activos: `GET /api/projects?active=true` (limit/orden en cliente; la lista es chica, ~15).
- **Orden "último tejido" (Q14):** el `ProjectRecord` **no** trae timestamp de la última sesión. Dos caminos: **(a)** aproximar con `updatedAt` (que ya se bumpea al parar una sesión, `store.ts` `setProjectTime`) — **sin cambio de backend**; **(b)** exponer un timestamp preciso de última sesión por proyecto — **cambio de backend**. Decisión pendiente (recomiendo (a) para no tocar backend).
- **Cambio de backend (nuevo):** extender `comparison` para dar comparativas de **horas y proyectos**, no solo metros (hoy `pickComparison` solo cubre `yarnMeters`). Añadir listas de referencia en `shared/config` para las 3 métricas.

## 4. Estados

- **Loading:** ovillo ASCII como loader + `kc-skeleton` en las cards de métrica.
- **Vacío (sin datos ese año):** `kc-empty` → "Todavía no tejiste nada en {año}" + botones de crear.
- **Error:** `kc-error` → "Se enredó la madeja" + reintentar.

## 5. Accesibilidad

- Los botones de tipo y el selector de métrica con `aria-pressed`. Año con label. Comparativas con texto real (no solo emoji).

## 6. Fuera de alcance

- El CRUD completo de proyectos (RFC-03); acá solo el modal de creación rápida y la lista de activos.

## 7. Adaptación al harness

- Página en `src/app/(app)/page.tsx` (o `/dashboard`). UI en `src/features/dashboard/ui/`.
- Reusa la card de proyecto de `src/features/projects/ui/`.
- Verificación: RTL (conmutar/superponer métrica, filtros, orden) + axe + smoke + build.

## 8. Slices de implementación (→ `feature_list.json`)

IDs reales en `feature_list.json` (mapeo en [RFC-00 §4](RFC-00-proceso.md)):

- **feature 16 `dashboard_comparison_3metrics`** (backend) — extender `comparison` a las 3 métricas
  (+ referencias en `shared/config`, +tests).
- **feature 19 `dashboard_ui`** — página Dashboard (hero + selector conmutable/superponible + métricas
  + comparativas + filtros año/tipo + activos con orden/ver-todos + modal de creación con type).

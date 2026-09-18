# RFC-00 — Proceso y mapa de la familia de RFC (fase de UI/diseño)

> **Qué es este documento.** El **índice y el encuadre de proceso** de todos los RFC de la app
> (`RFC-01`…`RFC-07`). Es al conjunto de RFC lo que el §0 es al PRD: define **cómo** se construye
> esta fase con el proceso SDD, **quién manda** ante un conflicto de alcance, y **cómo** cada
> slice de UI aterriza en el backlog de UI (`docs/product/backlog-ui.md`). Los RFC de página **no
> repiten** este encuadre: lo referencian.
>
> **Fase.** El PRD (`docs/product/PRD-01-estructura-funcional.md`) cubrió la **estructura funcional**
> (datos, BFF, lógica) — features 1-11, ya entregadas. Estos RFC cubren la **fase de UI/diseño**:
> shell, navegación, páginas, capa 3D, y los **pequeños enablers de backend** que la UI necesita y
> que el PRD dejó diferidos.

---

## 1. Proceso de construcción (cómo se construye esta fase)

Esta fase se construye con el proceso **SDD** (*Spec-Driven Development*) de gentle-ai, gobernado
por `openspec/config.yaml`. Cada trabajo abre un cambio en `openspec/changes/<slug>/` con sus
artefactos (`proposal.md`, spec, `design.md`, `tasks.md`, `apply-progress.md`):

- **Una slice a la vez.** Cada slice de UI de un RFC es **un cambio SDD**, exactamente como una
  feature de backend: la fase de *apply* escribe código **y tests**, y la fase de *verify* comprueba
  la implementación contra la spec, el diseño y las tareas, además de `docs/harness/`
  (`verification.md` para los criterios de verificación, `architecture.md` para los de capas).
- **El estado real no vive en los RFC.** La cola de trabajo pendiente está en
  `docs/product/backlog-ui.md`; el estado de lo que está en curso vive en el cambio SDD activo
  (`openspec/changes/<slug>/tasks.md` y `apply-progress.md`). Cada entrada del backlog apunta de
  vuelta a la sección exacta de su RFC (el análogo de `prd_ref`). El mapeo completo está en §4.
- **Cómo construir (arquitectura y convenciones):** manda `docs/harness/`
  (`architecture.md`, `conventions.md`, `verification.md`). La estructura feature-first es
  obligatoria también para la UI: las páginas viven en `src/app/**` (finas: rutean y componen) y la
  lógica/estado de cada feature en `src/features/<x>/ui/`; el design system portable en
  `src/shared/ui/`.
- **Verificación (definición de "done") de una slice de UI** = lo que fija el **SDD-01 §9** (el
  *Software Design Document* del design system, no el proceso SDD de esta sección): RTL
  (comportamiento + a11y, no píxeles) + smoke de render + `axe` en primitivos + `pnpm lint`,
  `pnpm typecheck` y `pnpm test` en verde + `pnpm build` OK + **cero valores hardcodeados** (todo
  por token). La **fidelidad visual** contra el mockup es **revisión humana**, no test automático.

> Gestor de paquetes: **pnpm**, siempre. Nunca `npm`/`npx`.

## 2. Jerarquía de fuentes de verdad (quién gana ante un conflicto)

Tres documentos gobiernan esta fase, cada uno con su dominio:

| Documento | Dominio | Gana cuando el conflicto es sobre… |
|---|---|---|
| **PRD-01** (`docs/product/`) | Estructura funcional: datos, BFF, lógica. | …**alcance funcional** (qué endpoint existe, qué campo hay, qué regla aplica). |
| **SDD-01** (`docs/design/SDD-01-design-system.md`) | **Contrato** del design system portable: nombres de tokens, estructura, API de componentes, capa 3D, verificación. | …el **contrato del template** (cómo se llama un token, qué API tiene un componente, aislamiento del 3D). |
| **RFC-01…07** (este directorio) | **Wiring** del template a *esta* app: rutas, fetch de datos, estado, qué pantalla usa qué motivo, decisiones de página. | …**cómo se arma una página concreta** de Knit&Crochet. |

Regla práctica: **el template (SDD) no conoce la app**; el **RFC** es quien lo cablea a rutas y
datos; y si un RFC pidiera algo que contradice el **alcance funcional**, manda el **PRD**.

## 3. Índice de la familia y dependencias

| RFC | Alcance | Depende de |
|---|---|---|
| **RFC-00** (este) | Proceso, jerarquía de verdad, mapeo al backlog de UI. | — |
| **SDD-01** | Design system portable (contrato + inventario de componentes + capa 3D). | — |
| **RFC-01** | Shell & navegación (base de estilos, `AppShell`, `ArchiveNav`/`BottomNav`, capa 3D, route groups). | SDD-01 |
| **RFC-02** | Dashboard (métricas + comparativas + activos + ovillo hero). | RFC-01 |
| **RFC-03** | Proyectos (lista + filtros + CRUD + detalle con cronómetro). | RFC-01 |
| **RFC-04** | Lanas (lista + filtro jerárquico + CRUD + catálogos). | RFC-01 |
| **RFC-05** | Patrones (lista + filtros + CRUD + editor de instrucciones). | RFC-01 |
| **RFC-06** | Calculadoras (aumentos + regla de 3; lógica ya existe). | RFC-01 |
| **RFC-07** | Stash (hub de navegación + accesos de creación). | RFC-01 |

**Orden de implementación:** primero el shell (RFC-01, features 12-14), porque todo lo demás cuelga
de él; luego los **enablers de backend** que la UI necesita (features 15-18); después las páginas
(features 19-30). El orden fino se respeta por el `id` de la tabla del §4.

## 4. Mapeo RFC → slices de UI (la capa ejecutable)

Cada slice de los RFC es un trabajo real de la fase de UI (`id ≥ 12`), con su RFC de referencia.
Los `id` 12-21 ya están entregados; los `id` 22-30 siguen abiertos y son las entradas de
`docs/product/backlog-ui.md`, desde donde se abre su cambio SDD. Enablers de backend compartidos
**no se duplican**: el endpoint de subida es **uno solo** (decisión PRD §11.7), referenciado por
RFC-03/04/05.

| id | feature | RFC | Tipo |
|---|---|---|---|
| 12 | `ui_foundation` | RFC-01 §9 | Shell |
| 13 | `ui_shell_nav` | RFC-01 §9 | Shell |
| 14 | `ascii_yarn` | RFC-01 §9 | Shell (3D) |
| 15 | `uploads_image` | RFC-03/04/05 · PRD §11.7 | Backend (compartido) |
| 16 | `dashboard_comparison_3metrics` | RFC-02 §8 | Backend |
| 17 | `projects_detail_yarns` | RFC-03 §8 | Backend (deuda 5) |
| 18 | `patterns_used_by` | RFC-05 §8 | Backend |
| 19 | `dashboard_ui` | RFC-02 §8 | Página |
| 20 | `projects_list_ui` | RFC-03 §8 | Página |
| 21 | `projects_detail_ui` | RFC-03 §8 | Página |
| 22 | `projects_form_ui` | RFC-03 §8 | Página |
| 23 | `yarns_list_ui` | RFC-04 §8 | Página |
| 24 | `yarns_detail_catalogs_ui` | RFC-04 §8 | Página |
| 25 | `yarns_form_ui` | RFC-04 §8 | Página |
| 26 | `patterns_list_ui` | RFC-05 §8 | Página |
| 27 | `patterns_detail_ui` | RFC-05 §8 | Página |
| 28 | `patterns_form_ui` | RFC-05 §8 | Página |
| 29 | `calculators_ui` | RFC-06 §8 | Página (sin backend) |
| 30 | `stash_ui` | RFC-07 §8 | Página (sin backend) |
| 31 | `auth_ui` | RFC-01 §2, §3 | Shell (páginas login/register en `(auth)`) |

> **Nota sobre #31 `auth_ui`:** añadida tras cerrar #13 (el grupo `(auth)` quedó con layout pero sin
> páginas). Su id es el mayor por no renumerar el resto, pero su **orden de build es temprano** (slice
> fundacional del shell: sin login el flujo real no es usable) — se justifica salir del orden por id
> (RFC-00 §1 "en orden de id salvo que se justifique").

## 5. Convención de cada RFC de página

Todos los RFC de página siguen la misma anatomía y **cierran** con dos secciones fijas que conectan
con el proceso (por eso este RFC-00 existe: para no repetir el encuadre en cada uno):

- **§ Adaptación al harness** — dónde vive el código (rutas `src/app/**`, feature `src/features/<x>/ui/`)
  y qué verifica (remite a la definición de "done" del §1 de este RFC-00 / SDD-01 §9).
- **§ Slices de implementación (→ backlog de UI)** — el desglose en slices, **con los `id`
  reales** de la tabla §4 (no IDs inventados).

## 6. Estado "borrador" y decisiones abiertas

Los RFC están en **borrador**. Una entrada del backlog **no se convierte en un cambio SDD** hasta
que su RFC tenga resueltas las decisiones abiertas que la afectan. Pendientes vivos hoy:

- **RFC-02** — orden "último tejido": aproximar con `updatedAt` (sin tocar backend) **vs.** exponer
  timestamp preciso de última sesión (cambio de backend). Recomendación del RFC: `updatedAt`.
- **RFC-07** — lista exacta de cards del hub (secciones + accesos de creación) a confirmar con el
  usuario.

Estos puntos se resuelven —o se elevan al usuario— **antes** de abrir el cambio SDD correspondiente.
La entrada 30 (`stash-ui`) del backlog está marcada como bloqueada por el segundo de ellos.

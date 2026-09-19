# RFC-04 — Lanas

- **Alcance:** lista + filtro jerárquico marca→tipo + familia de color + CRUD de lanas + gestión de catálogos (marcas/tipos).
- **Estado:** borrador. Depende de **RFC-01**.
- **Proceso:** ver **[RFC-00](RFC-00-proceso.md)** (proceso SDD, jerarquía de verdad, mapeo al backlog de UI).
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

## 7-bis. Enmienda E1 — tres puntos que #23 cerró sobre lo que este RFC no fijaba (2026-09-19)

> Registrada al cerrar el cambio SDD `yarns-list-ui` (entrada 23 del backlog de UI). No son decisiones
> de producto nuevas: es el registro de cómo el código real resolvió tres huecos entre lo que este RFC
> dice y lo que hizo falta implementar. El detalle por rebanada está en
> `openspec/changes/yarns-list-ui/`.

### E1(a) — `GET /api/yarns` devuelve `brandName`/`typeName` de forma aditiva

§3 no menciona estos dos campos. El backend de #23 (slice S1) los suma con un `innerJoin` sobre `brands`
y `yarn_types`; ningún consumidor existente cambia — `POST`, `GET/PATCH/DELETE /:id` y `getYarnOptions`
siguen devolviendo la fila cruda, sin ellos. La extensión es puramente aditiva.

### E1(b) — el «ícono» de §1/§2 es el `Swatch` genérico, no un asset nuevo

§1 y §2 hablan de un «ícono coloreado con el color de la lana». No es una ilustración nueva: es el
`Swatch` genérico del design system (deuda 168 saldada en S2), en tamaño de tarjeta, teñido por el mapa
app-side `yarnSwatchClass` según la familia de color de la lana.

### E1(c) — el tap de la card es un no-op hasta que #24 exista

§2 dice "tap → drawer", pero el drawer es la entrada **24** (`yarns_detail_catalogs_ui`), que no existe
todavía cuando se implementa #23. Igual que #20 con su propia card (RFC-03, E1(f)), la card de #23 monta
un control real y alcanzable por teclado cuyo tap es un no-op documentado (deuda 192), no un `div`
decorado a la espera del drawer.

## 7-ter. Enmienda E2 — el detalle de una lana, y dónde vive el catálogo (2026-09-20)

> Registrada al cerrar las rebanadas del cambio SDD `yarns-detail-catalogs-ui` (entrada 24 del backlog
> de UI). Las letras se escriben **en el orden en que entran las rebanadas**, no agrupadas por tema,
> para que este documento nunca describa código que todavía no existe. El detalle por rebanada está en
> `openspec/changes/yarns-detail-catalogs-ui/`.

### E2(a) — el stepper de `usedQuantity` es un primitivo genérico, no una pieza de lanas

§2 pide «stepper de `usedQuantity`» en el cajón de detalle. Se resuelve con un primitivo `Stepper` del
design system: controlado, sin estado propio y sin saber qué cuenta. **Controlado a propósito:** un
valor que se persiste en el servidor no puede tener una segunda fuente de verdad, porque un `PATCH`
rechazado dejaría el número mostrando algo que nunca se guardó. El `Disclosure` sí puede ser dual,
porque abierto/cerrado es efímero; esto no.

El piso en `0` y la **ausencia de techo** son decisión de quien lo consume, no del primitivo: salen de
que el PRD-01 §4.5 define `usedQuantity` como **independiente** de `quantity` —enlazar una lana a un
proyecto no descuenta stock—, así que el consumo no tiene tope contra el inventario.

### E2(b) — el botón «Editar» del cajón es un no-op hasta que exista la entrada 25

§2 pone un botón «Editar» en el cajón que abre el modal de edición, pero ese modal es la entrada **25**
(`yarns_form_ui`), que no existe cuando entra la 24. Igual que el tap de la tarjeta en E1(c), el botón
se monta como **control real y alcanzable por teclado** cuyo manejador es un no-op documentado (deuda
199), en vez de un `div` decorado esperando. Cuando entre la 25, el mismo control pasa a abrir el
modal: ya está puesto y ya es accesible, sólo falta cablearlo.

### E2(c) — el panel de catálogo vive en la columna del filtro, no en una pantalla propia

§1 y §5 hablan del catálogo de marcas y tipos sin decir dónde se gestiona. Se resuelve como una
sección más dentro del `Card` del panel de filtros: bajo el árbol marca→tipo y la fila de color,
como último hijo de la MISMA superficie (deuda 196 no se repite: el panel nunca se monta suelto
sobre el fondo de la página). Reutiliza el `Disclosure` genérico —el mismo primitivo del árbol y de
la enmienda E1 de #22— tanto para la sección entera («Catálogos») como para cada marca dentro de
ella, así que no suma ningún criterio visual nuevo al design system.

## 8. Slices de implementación (→ backlog de UI)

IDs reales en la tabla de [RFC-00 §4](RFC-00-proceso.md); las entradas que siguen abiertas están en `docs/product/backlog-ui.md`:

- **feature 15 `uploads_image`** (backend, **compartido** con RFC-03/05) — `POST /api/uploads/image`
  (foto de lana); **un endpoint único**, no uno por entidad.
- **feature 23 `yarns_list_ui`** — árbol marca→tipo + swatches + grilla de cards (ícono coloreado + stock).
- **feature 24 `yarns_detail_catalogs_ui`** — drawer con stepper `usedQuantity` + panel de gestión de
  marcas/tipos (con 409 bloqueante).
- **feature 25 `yarns_form_ui`** (modal, tabs) — identidad + ficha técnica, con crear/elegir marca-tipo
  inline y manejo de 409 de `colorCode`.

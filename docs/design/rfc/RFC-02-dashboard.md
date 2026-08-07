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

## 7-bis. Enmienda E1 — las cinco decisiones de #19, cerradas (2026-08-06)

> La ficha de #19 arrastraba **tres** decisiones heredadas de #14 y del proxy, y #16 dejó **dos** más.
> Las cinco las cerró el usuario **antes de empezar**, como manda RFC-00 §6. **No se reabren.**

**E1.1 — `/` pasa a ser PRIVADA, y no hay landing pública.** Se quita `/` de `PUBLIC_PAGES` en
`src/proxy.ts`. Sin sesión, `/` redirige a `/login?next=/` — mecanismo que el proxy **ya tiene montado y
probado**. Con sesión, `/login` sigue redirigiendo a `/`, así que el circuito cierra solo. Quedan públicas
**sólo** `/login` y `/register`. **Salda las deudas 1 y 13.** Se descartó una landing pública aparte: ningún
RFC la pide, y RFC-02 define el Dashboard como "la página de inicio post-login" **en `/`**.

**E1.2 — El hero REEMPLAZA al fondo global en `/`; nunca dos ovillos vivos.** Hoy `AppShellClient` monta
`<AsciiYarn />` como fondo de **todo** el grupo `(app)`. En `/`, ese fondo **no se monta**: el único ovillo es
el hero, `interactive` y arrastrable (RFC-02 §1). En el resto de rutas sigue el fondo de siempre.
**Coste aceptado:** hay que dar al caparazón una forma de que la ruta decida su fondo, y hoy lo fija el
layout. Es fontanería acotada, y se paga una vez. Se descartó la segunda instancia porque **dos efectos ASCII
simultáneos duplican el coste de CPU** del bucle de asciificación, justo en la página que más se abre.

**E1.3 — El hero NO será operable por teclado, y es a propósito.** Es una **pieza decorativa de marca**: no
transmite información ni habilita ninguna acción, así que quien no pueda arrastrarlo **no se pierde nada**.
Sigue `aria-hidden` con el canvas no enfocable, así que **axe pasa**. Se descartó hacerlo enfocable porque
obligaría a sacarlo del árbol accesible oculto y darle nombre, rol e instrucciones — anunciarle a un lector de
pantalla un adorno que no lleva a ninguna parte. **Debe quedar documentado en el código** para que nadie lo
"arregle" por error.

**E1.4 — Formato de comparativa: `≈ 2,1 veces <etiqueta>`.** Las etiquetas de `shared/config` están escritas
como frases con artículo (`"El Obelisco"`, `"Un colectivo"`, `"Una semana laboral"`), así que **concatenar un
número delante produce texto roto** (*"≈ 2,1 El Obelisco"*). Anteponer **"veces"** funciona con **las once**
etiquetas de las tres listas, es español natural y **no toca ni un dato**.
- **`times < 1`** → frase propia: *"todavía no llegás a El Obelisco"*.
- **`times = 0`** → **no se pinta comparativa**. El número grande ya dice cero, y una comparativa de cero no
  informa de nada — además evita que una cuenta recién creada, que es la primera impresión de la app, muestre
  tres comparativas en cero y parezca rota.
- Se descartó pluralizar las etiquetas en config: reabriría el contrato cerrado en #16, obligaría a reescribir
  las tres listas y sus tres anclas, y **varias no tienen plural natural** (*"El Señor de los Anillos
  (extendida)"*).
- **Consecuencia: el ejemplo del PRD §8 (*"≈ 2 Obeliscos"*) dejó de ser literal y se corrigió allí**, para que
  el PRD no mienta. **Salda la deuda 69.**

**E1.5 — La tarjeta de metros lleva una marca visible de "total histórico".** Los metros son agregado
*lifetime* y **no se mueven** con el filtro de año ni de tipo (PRD §11.2), mientras las otras dos sí. Sin la
marca, el usuario cambia el año, ve **moverse dos comparativas y quedarse una**, y parece un bug. Se resuelve
**en la UI**, no en el payload: no toca el contrato de `/api/dashboard/metrics`, cerrado en #16, cuyo único
consumidor es esta misma página. **Salda la deuda 66.**

## 8. Slices de implementación (→ `feature_list.json`)

IDs reales en `feature_list.json` (mapeo en [RFC-00 §4](RFC-00-proceso.md)):

- **feature 16 `dashboard_comparison_3metrics`** (backend) — extender `comparison` a las 3 métricas
  (+ referencias en `shared/config`, +tests). **`done` (2026-08-05).**
- **feature 33 `ui_primitives_2`** (design system, **slice nueva del 2026-08-06**) — **PRERREQUISITO de #19.**
  Entrega las seis piezas del SDD §6 que esta página necesita y que **no existían**: barra de progreso,
  skeleton, estado vacío, estado de error, toggle conmutable/superponible y modal. Salieron a slice propia
  porque **las necesitan todas las páginas #19-#30**, no sólo el Dashboard.
- **feature 19 `dashboard_ui`** — página Dashboard (hero + selector conmutable/superponible + métricas
  + comparativas + filtros año/tipo + activos con orden/ver-todos + modal de creación con type).
  **Sus cinco decisiones de scope están cerradas en la enmienda E1 (§7-bis).**

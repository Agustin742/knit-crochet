# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

## ✅ CERRADO: lote de deudas 🟠 **165 + 166**. ▶️ SIGUIENTE: **#22 `projects_form_ui`**

**Orden elegido por el usuario:** saldar lo visible primero, meter la feature encima con el terreno limpio.

**Cierre:** `init.sh` **EXIT 0** · **1613 passed | 13 skipped** (venía de 1587).
Reviewer **APROBADO sin bloqueantes** (probó el gate nuevo con **once mutaciones propias**: diez rojas).
**REGLA 4 completada** por el leader: los tres puntos que el reviewer dejó abiertos, cerrados con medición.
Informe de cierre: `progress/informs/29.informe-deudas_165_166.md`.

### Lo que la verificación en navegador devolvió (y no estaba en ninguna ficha)

- **La técnica que desbloqueó el móvil: un `iframe` de 500 px.** Tiene **su propio viewport para media
  queries**, así que el navegador aplica **las reglas reales** sin falsear un solo estilo, y **no depende
  de que el usuario coloque su ventana**. `resize_window` **volvió a mentir** (dijo `500x750`, `innerWidth`
  siguió en **1536**) — **comprobá siempre `innerWidth` después de pedir un resize**.
  **Su límite:** el iframe **no reproduce áreas seguras**, así que **no sirve** para cerrar la 172.
- **Cuatro rutas dan 404** (`/lanas`, `/patrones`, `/calculadoras`, `/stash`): **no existen todavía**, son
  #23-#30. Y el **Dashboard vive en `/`, no en `/dashboard`** — eso fue error de ruta del leader.

### Fichas nuevas: 172, 173, 174, 175 — **ninguna la produjo el lote**

- **172 🟠** — el área segura está **cableada y hoy vale `0px`**: falta decidir `viewport-fit`. **Decisión
  del usuario: se ficha, no se añade a ciegas.** Ver corrección de **E14 (b)** en RFC-01.
- **173 🟠** — los **rótulos de la barra se solapan** al ancho en el que por fin se la ve
  (`Calculadoras`: **105.2 px de texto en caja de 80.8**; solape de **6.3 px** con `Patrones`).
  **Preexistente; el arreglo de la 165 lo DESTAPA.** No se abre bajo la moratoria: las cajas táctiles no
  se solapan, lo que se pisa es el texto. Decisión de diseño → RFC-01.
- **174 ⚪ / 175 ⚪** — cobertura de gates, fichadas por el reviewer.

> **La lección del lote:** *arreglar algo que estaba escondido destapa lo que se escondía con ello, y eso
> NO es una regresión.* Segunda vez en dos sesiones (165 → 173). **Decirlo al fichar**, o el próximo
> review lo lee como *"el lote rompió la barra"* y busca un culpable que no existe.

**Arranque verificado:** `init.sh` **EXIT 0** · `1587 passed | 13 skipped (1600)`.
`feature_list.json`: **24 `done` · 0 `in_progress` · 9 `pending`** sobre 33.
**Backend completo. Faltan 9 páginas para el MVP.**

### Decisiones cerradas ANTES de tocar código (regla 3 del protocolo)

- **RFC-01 → enmienda E14** (deuda 165). La barra móvil va **`sticky bottom-0`, no `fixed`** —no sale del
  flujo, así que no hay que compensar con padding ni puede tapar el final del contenido— más
  `env(safe-area-inset-bottom)` sin números crudos, más **gate sobre CSS compilado**. La causa medida:
  `BottomNav.tsx` declaraba `z-(--z-nav)` **y ninguna `position`**, y un z-index sobre un elemento estático
  es inerte. **No cambia** el interior de la barra ni el `ArchiveNav`.
- **RFC-03 → enmienda E5** (deuda 166), **decidida por el usuario**: sin meta **no hay denominador**, se lee
  **`3 vueltas`**. Con meta no cambia nada (`3 / 40`). El `0%` sin meta **se deja como está** y queda
  escrito para que nadie lo redescubra. El caso `targetRounds === 0` —que es el **estado inicial de todo
  proyecto nuevo**— va a test: no había ninguno, y por eso existió la deuda.

**Implementer lanzado** con las dos enmiendas como contrato, strict TDD e informe incremental en
`progress/reports/impl_deudas_165_166.md`.

### ⚖️ MORATORIA DE GATES (sigue en vigor)

> ***Una deuda sólo interrumpe una feature si un usuario puede verla.***

⚪ y **no se abren**: **160**, **161**, **164**, **167**, **168**, **169**, **170**, **171**.

### 🧭 REGLAS DE MÉTODO para la verificación en navegador (REGLA 4)

Nacidas de **dos falsos positivos en una sola sesión** (2026-08-25):

1. **Las coordenadas de `computer` NO son fiables sin comprobación.** Van en px **físicos** mientras
   `getBoundingClientRect` da px **CSS**, y **el factor no es estable entre capturas**. **Antes de
   reportar cualquier cosa medida con clics: confirma DÓNDE CAYÓ el puntero** con una escucha de
   `mousemove` en captura (cuatro líneas). Un clic desviado **imita perfectamente a un bug real**.
2. **Antes de culpar a la app, descarta el entorno.** Un `500` resultó ser el `next dev` **degradado**
   por el arnés. Con servidor limpio: `200`.
3. **Si sólo quieres VER un panel, cambia de pestaña por código** — es más honesto que fingir una
   medición de *hit-testing* que no estás haciendo.
4. **No midas la pantalla mientras otro agente muta el árbol.**
5. **Si arrancas un cronómetro para probar, PÁRALO.** En el historial del usuario hay una sesión de
   **281 h** de la verificación de #20, que se dejó corriendo.

### El móvil: cómo se desbloqueó y qué falta

**Lo desbloquea el usuario**, no un agente: la ventana de Chrome tiene que estar **restaurada (ni
maximizada ni minimizada) y en primer plano**. Con eso se llegó a **502 px** — Chrome impone un mínimo
de ~500 px y `resize_window` **informa éxito aunque no cambie nada**. **El móvil real (≤390 px) sigue
fuera de alcance por esta vía**; haría falta emulación por CDP.

### Deudas VISIBLES pendientes (🟠 — un usuario las ve)

- **165** — la **navegación móvil no está pegada abajo**: en angosto sólo aparece scrolleando hasta el
  fondo, y es la única navegación que hay. **Preexistente.**
- **166** — el tab Progreso muestra **`1 / 0`** cuando no hay meta de vueltas.
- **155**, **159**, **162**, **163** — de sesiones anteriores.

### 🔐 RDD ENCENDIDO (2026-08-25) — cambia cómo se entrega

`gentle-ai review mode status` → **`on (decided by global)`**. Lo pidió el usuario.

- **Alcance GLOBAL**, no clone: aplica a TODOS los repos de la máquina. Se apaga con
  `gentle-ai review mode disable --scope global`.
- **BUG de gentle-ai 2.4.0**: `review mode enable --scope clone` **sale EXIT 0, emite
  `operation: enable` y NO PERSISTE NADA**. Reproducido en un `git init` vacío → no es este
  repo. `review status` responde sano, así que el subsistema vive. **Sólo el scope `global`
  escribe** (en `~/.gentle-ai/state.json`). Si alguna vez ves `clone-local: unset` tras un
  `enable`, no es tu invocación: es el bug. **No reportado** (el usuario no lo pidió).
- **RDD NO reemplaza el arnés.** `leader → implementer → reviewer` + `feature_list.json`
  sigue siendo la ruta de implementación. RDD se apila encima: consentimiento por candidato
  en cambios medium/high, y `pre-commit`/`pre-push` validan recibo.
- Pendiente menor: **`.atl/` sigue untracked** (lo genera el hook `skill-registry refresh` en
  cada prompt, con `--no-gitignore`). Añadir a `.gitignore`.

### Al arrancar la siguiente feature

1. `bash ./init.sh`.
2. **Comprueba qué piezas da por hechas la ficha y NO existen** — este control ha pagado en #19 y en #21.
3. Si el RFC tiene decisiones abiertas: **resolverlas con el usuario y escribirlas en el RFC ANTES de
   tocar código**. Es lo que ha funcionado en E13, E4 (RFC-02) y E3 (RFC-03).
4. **REGLA 4 antes de cerrar**, con el árbol quieto.

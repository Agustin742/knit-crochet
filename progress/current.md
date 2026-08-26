# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

## 🛑 CIERRE DE SESIÓN (2026-08-26) — LEER ESTO PRIMERO

**Estado:** `init.sh` **EXIT 0** · **1838 passed | 13 skipped (1851)**. Todo lo de abajo está commiteado.

### Lo ÚNICO pendiente de decisión

- **#22 sigue en `in_progress`.** El ciclo está **completo** (implementer → reviewer aprobado → REGLA 4
  con los 8 puntos verificados) y el informe de cierre es `progress/informs/30.…`. **El leader no marca
  `done` por regla del repo**: lo cierra el usuario. Se le preguntó y la sesión siguió por otro camino.
- **Ficha 191 (dato del usuario):** una tarjeta marca **`281 h 25 min`** — el cronómetro que quedó
  corriendo en la verificación de #20. **Tocarlo escribe en sus datos: se pregunta antes.**

### ⚠️ ANTES DE INVESTIGAR CUALQUIER 404: leé la ficha 189

**Dos veces en esta sesión** el `next dev` devolvió **404 `text/html`** en rutas anidadas que **el build
compila perfectamente**, y las dos imitaron a una regresión recién introducida.
**`pnpm build` es el discriminador**: si lista la ruta y dev responde 404, **el código está sano**.
Borrá `.next` y reiniciá; si insiste, **verificá contra `pnpm start`** (así se completó la REGLA 4 de E7).

---

## ✅ CERRADO HOY (3): deudas 165+166 · **#22 `projects_form_ui`** · lote **E7**

| | Commit | Tests | Informe |
|---|---|---|---|
| Deudas **165 + 166** | `7c49a8f` | 1587 → **1613** | `29.informe-deudas_165_166.md` |
| **#22 `projects_form_ui`** | (este) | 1613 → **1792** | `30.informe-22_projects_form_ui.md` |
| Lote **E7** | (este) | 1792 → **1838** | `31.informe-e7-alta-y-cronometro.md` |

### El lote E7 salió de que el usuario USÓ la app

Reportó tres cosas. **Una no era de la app** (la 189, Turbopack). Las otras dos:

- **185** — el alta estaba **partida en dos**: Dashboard con **un** campo, `/proyectos` con **seis**, mismo
  título. **Agujero de la enmienda E6**, que definió "el" formulario y **no enumeró todos los sitios desde
  los que se crea**. Ya no: el Dashboard monta el mismo modal y `NewProjectDialog` está **borrado**.
- **186** — el cronómetro **existía y estaba encerrado** en el cajón. Ahora el botón **se transforma**
  (mismo nodo, **misma caja 44×44 medida en los dos estados**), el reloj se ve en la tarjeta, y
  **`GET /api/projects` trae la sesión abierta** — lo que **deroga en parte E2.2 de RFC-02**.
  **Verificado donde dolía: tras un F5 el botón dice «Parar», no «Empezar».**

### La lección del día: un test ausente sobre código CORRECTO merece rechazo

El reviewer probó **diez garantías por mutación**; **nueve murieron y una sobrevivió**
(`handleSaved` conserva `activeSession`, `ProjectsView.tsx:459`: forzarlo a `null` dejaba **66/66 verdes**).
El código estaba bien; faltaba **la red**. Y por ahí **volvía a entrar la deuda 186** desde el modal de
edición. Se cerró con **un test y cero líneas de producción**, con la mutación repetida **por el propio
reviewer** y comprobando que **el test no es vacuo**.

### Fichas abiertas hoy

**176** ⚪ · **177-181** · **182 🟠 el acento de TODA la app da 3,02:1 y AA exige 4,5** (preexistente, nadie
lo había medido; → RFC-01) · **183 🟠 el foco se cae al `body` al COMPLETAR una acción, no al cancelarla** ·
**184 🟠 la vista previa de foto vacía** (ahora en **las dos** páginas) · **185/186** (cerradas por E7) ·
**187/188** 🟡 · **189 🟠 entorno** · **190 ⚪ falta lector de pantalla real** · **191 🟡 las 281 h**.

---

## Histórico de la sesión (detalle)

**Commit del lote anterior:** `7c49a8f`. Árbol limpio al arrancar #22.

### El inventario dijo que la ficha era optimista (tercera vez que este control paga)

`progress/reports/explore_22_inventario.md`. **El backend está entero; falta casi toda la mitad de
navegador.** Y el hallazgo que decidió el tamaño:

> **El "patrón embebido" NO es un campo del proyecto.** Vive en la tabla de patrones como
> `inLibrary: false`. Embeber son **dos peticiones** y no hay cliente ni UI para ninguna.

### Contrato: RFC-03 → enmienda **E6**

- **(a) Alcance, decidido por el usuario:** entra el modal completo, la **foto real**, **elegir** patrón de
  biblioteca, los dos botones de creación rápida y el borrado con confirmación. **Fuera: CREAR patrón
  embebido** (es material de RFC-05; meter autoría de patrones dentro del alta de un proyecto mezcla dos
  dominios). Se ficha.
- **(b)** `Select` y `Textarea` **se crean como primitivos**. **(c)** el input de archivo se parte: el
  primitivo es tonto, la subida vive en la feature (frontera de la deuda 168). **(d)** `ConfirmDialog`
  sobre el `Dialog` existente, con **`dismissOnScrimClick` apagado**. **(e)** el control de agujas es de la
  feature, no del design system.
- **(f) Deuda 129** (cliente HTTP en su tercer clon): **bajo la moratoria NO interrumpe**, pero **no se
  empeora** — el CRUD nuevo va dentro de `projects-client.ts`, ni un cuarto clon.
- **(g) DOS TANDAS.** T1: primitivos + cliente. T2: modal, botones, foto cableada y borrado.
- **(h)** contrato de subida al pie de la letra: **`multipart/form-data`, campo `file`, `201` con
  `{ url }`** — la deuda 60 avisa de que *asumir 200 rompe en el navegador y no en los tests*, y #22 es el
  **primer consumidor real desde navegador**.

### ✅ TANDA 1 ENTREGADA (pendiente de reviewer y de REGLA 4)

**Feature en curso:** #22 `projects_form_ui` — tanda 1 (cimientos).
**Plan ejecutado (seis piezas, test primero en cada una):**

- `Select` y `Textarea` como primitivos, derivando la piel de `inputClasses` y componiendo con `Field`.
- `FileInput` **tonto** (input real oculto pero enfocable + disparador `aria-hidden`), con gate de frontera
  que lee el fuente: la subida no sube al design system (deuda 168).
- `ConfirmDialog` sobre `Dialog`, con **`dismissOnScrimClick` apagado y no expuesto** y foco inicial en
  «Cancelar»; las dos garantías probadas por mutación.
- Barrels + nueve nombres nuevos anclados en `public-api.test.ts` + **un** gate de CSS compilado para las
  cuatro piezas.
- CRUD de cliente dentro de `projects-client.ts` (E6 f): `createProject`, `updateProject`, `deleteProject`
  (204 sin cuerpo), `getPatterns`, `uploadProjectImage` (**201**, `multipart`, campo `file`).

**Verificación:** `bash ./init.sh` **EXIT 0** · **1707 passed | 13 skipped** (venía de 1613) → **+94 tests**.
**Informe:** `progress/reports/impl_22_t1.md`, con lo que **no** se pudo verificar (ningún navegador en esa
sesión; nada está cableado todavía, así que no hay pantalla nueva que mirar hasta T2).

### 🔴 TANDA 2 INTERRUMPIDA a media pieza — estado MEDIDO, no supuesto (2026-08-26)

**Segunda muerte por límite de cuenta en esta sesión** (reset 4:20am). **No es un fallo del código.**
Esta vez sí había trabajo hecho, y **el informe incremental lo salvó**: `progress/reports/impl_22_t2.md`
tiene el plan de siete piezas, la bitácora de las cerradas y las decisiones ya justificadas.

**La suite está ROJA, y es rojo de TDD, no daño:** `init.sh` **EXIT 1** · **11 failed | 1779 passed**.
Los 11 fallos están **todos** en `ProjectsView.test.tsx`, bloque
`describe("ProjectsView — crear, editar y borrar (#22)")` (desde `:1063`). O sea: **los tests de la pieza 5
están escritos en rojo y falta el código que los pone en verde.** Esos tests **son la especificación**.

| # | Pieza | Estado medido |
|---|---|---|
| 1 | `project-form.ts` — copia y helpers puros (20 tests) | ✅ cerrada |
| 2 | `NeedlesField` — agujas, en la feature (E6 e) | ✅ cerrada |
| 3 | `ProjectFormDialog` — el modal crear/editar | ✅ cerrada |
| 4 | Entradas "editar"/"borrar" en el cajón | ✅ cerrada (`ProjectDetailDrawer.tsx` con `onEdit`/`onDelete`; copia en `project-detail.ts:373-392`) |
| 5 | **Cablear `ProjectsView.tsx`** | 🔴 **a medias — tests en rojo, falta el código** |
| 6 | Gate de clases ampliado | ⏳ pendiente |
| 7 | Deuda **176** (el comentario que promete lo que no mide) | ⏳ pendiente |

**Relanzada como CONTINUACIÓN, no desde cero** — rehacer tiraría las cuatro piezas buenas.

**Decisiones que ya tomó T2 y hay que respetar** (están razonadas en su informe):
- **La foto se sube al ELEGIRLA, no al guardar**: el endpoint falla de tres maneras (400 formato o >4 MB,
  401 sesión, 502 proveedor) y descubrirlo tras rellenar el formulario entero tira el trabajo. Además deja
  el envío como **una sola petición** en vez de dos encadenadas con fallo a mitad.
- **`projectPatch` manda SÓLO lo que cambió**, para no pisar con el formulario un campo que otra pantalla
  haya tocado mientras el modal estaba abierto.
- **Si la biblioteca de patrones no se puede traer, el campo no se ofrece** y `patternId` no viaja en el
  parche: editar un proyecto con patrón **no lo pierde**.

### ⚠️ Un intento anterior de T1 murió por LÍMITE DE SESIÓN de la cuenta (no por código)

Verificado antes de relanzar: **no escribió nada** —ni informe ni primitivos—, árbol limpio, cero trabajo
perdido. **Relanzada.** Si vuelve a cortarse, el estado real está acá y en
`progress/reports/impl_22_t1.md` (informe incremental, escrito antes de empezar).

---

## ✅ CERRADO ANTES EN ESTA SESIÓN: lote de deudas 🟠 **165 + 166**

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

---

## ▶️ TANDA 2 de #22 en curso (implementer)

**Feature en curso:** #22 `projects_form_ui` — tanda 2 (cableado).
**Plan:** (1) copia y helpers puros `project-form.ts`; (2) `NeedlesField` en la feature (E6 e);
(3) `ProjectFormDialog` crear/editar con foto real y patrón de biblioteca; (4) entradas "Editar" y
"Borrar" en el cajón (E3 d, aditivo); (5) cableado en `ProjectsView` (dos botones de creación rápida,
borrado con confirmación, lista coherente sin recargar); (6) gate de clases ampliado; (7) deuda **176**
(comentario de `FileInput.test.tsx:126`).
**Informe incremental:** `progress/reports/impl_22_t2.md` (escrito ANTES de tocar código).

### ⏸️→▶️ TANDA 2 RETOMADA tras corte por límite de cuenta — **ENTREGADA**

La sesión anterior murió con las piezas 1-4 cerradas y **los 11 tests de la pieza 5 escritos en rojo**. Se
retomó desde ahí, **sin rehacer nada**: esos tests fueron la especificación.

**Cerrado en esta sesión:** pieza **5** (cableado de `ProjectsView`: crear con los dos botones que
preseleccionan el tipo, editar desde el cajón, borrar con confirmación y lista coherente sin recargar),
pieza **6** (gate de clases ampliado a `ProjectFormDialog` y `NeedlesField`) y pieza **7** (deuda **176**,
sólo el comentario).

**Decisión que quedaba abierta — la entrada a "crear" con el cesto NO vacío:** va **en la cabecera de la
página**, y **sólo cuando el panel de cesto vacío no se está pintando**, para que nunca haya dos parejas de
botones iguales en la misma pantalla (deuda 142). Antes de esto, quien ya tenía proyectos **no tenía ninguna
forma de crear otro desde `/proyectos`**.

**Hallazgo grave del arnés de test, cazado por mutación:** `listUrls()` filtraba **sólo por URL**, y el alta
es un `POST` a la URL pelada de la lista — o sea que **el propio alta se contaba como "volvió a pedir la
lista"** y el test que exige la recarga salía verde sin ella. Corregido filtrando también por método.
Segunda vez que ese helper se queda corto por mirar sólo la URL.

**Y `lint` y `typecheck` estaban EN ROJO al retomar**: la tanda anterior no llegó a correr `init.sh`
(`set-state-in-effect` en `ProjectFormDialog.tsx` + dos errores de tipos en su test). Arreglados los tres.

**Verificación:** `bash ./init.sh` **EXIT 0** · **1792 passed | 13 skipped (1805)** (venía de 1707) →
**+85 tests**.
**Informe:** `progress/reports/impl_22_t2.md`.

⚠️ **REGLA 4 SIN HACER:** esta sesión **no tuvo herramientas de navegador**. Los tres puntos que dejó el
reviewer de T1 —anillo de foco del disparador de archivo, flecha nativa del `Select`, contraste del botón
`danger`— siguen **abiertos**; en el informe hay lo único medible desde acá (el `danger` da **4.69:1** por
aritmética sobre tokens, y `selectClasses` no lleva `appearance-none`), que **no** sustituye a mirar la
pantalla.

---

## ▶️ EN CURSO: lote **E7** — el alta partida en dos y el cronómetro encerrado (2026-08-26)

**Feature en curso:** ninguna de `feature_list.json` (el lote son las fichas **185** y **186**, reportadas
por el usuario probando la app tras #22). **No se tocó ningún estado del `feature_list.json`.**

**Contrato:** `docs/design/rfc/RFC-03-proyectos.md` → **§7-octies, enmienda E7**.

**Plan ejecutado (test primero en cada pieza):**

1. **B3 — el dato.** `GET /api/projects` devuelve, por proyecto, su sesión abierta o `null`. Único cambio
   de backend del lote; **deroga en parte E2.2 de RFC-02**.
2. **B1 — el botón se transforma** (mismo control, misma caja): parado ofrece empezar, corriendo ofrece
   parar. Nunca hay dos botones (deuda 142).
3. **B2 — el reloj en la tarjeta**, contado desde el arranque real del servidor. Sin `aria-live` en los
   segundos (E4 a).
4. **B4 — muere `QUICK_START_NOTES`.** El aviso de acción por `role="status"` se queda.
5. **A — el alta es UNA.** El Dashboard monta `ProjectFormDialog`; se borran `NewProjectDialog.tsx` y el
   `createProject` de `dashboard-client.ts`; sus cinco tests **se migran**, no se tiran.
6. **Extra necesario:** el cajón avisa hacia arriba (`onRunningChange`) cuando arranca o para, para que la
   tarjeta de detrás no quede afirmando lo contrario al cerrarlo.

**Verificación:** `bash ./init.sh` → **EXIT 0** · **1837 passed | 13 skipped** (venía de 1792) → **+45**.
`pnpm build` compila las 28 rutas.

**Deudas nuevas:** **187** (el Dashboard no enseña el cronómetro) y **188** (el tiempo tejido de la
tarjeta se queda viejo si se para desde el cajón). **185** y **186** quedan **pendientes de que el
reviewer las dé por saldadas**.

**Aviso de entorno confirmado otra vez:** el `typecheck` arrancó **rojo** por
`.next/dev/types/validator.ts` —caché de Turbopack—; `rm -rf .next` y verde. **No es del código.**

**Informe:** `progress/reports/impl_e7_alta_y_cronometro.md`.

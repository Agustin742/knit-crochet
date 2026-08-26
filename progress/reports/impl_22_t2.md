✅ |✅ |✅ |✅ |✅ |✅ |# impl #22 `projects_form_ui` — TANDA 2 (cableado)

> **Informe incremental anti-congelación.** Se escribe ANTES de tocar código y se actualiza al cerrar
> cada pieza, no al final. Si la sesión se corta, esto es lo único que sobrevive.

**Contrato:** RFC-03 §7-septies, enmienda **E6** (a), (e), (h) + lo que T1 dejó listo.
**Lo que T1 entregó y NO se rehace:** `Select`, `Textarea`, `FileInput`, `ConfirmDialog` (primitivos) y
`createProject` / `updateProject` / `deleteProject` / `getPatterns` / `uploadProjectImage` dentro de
`projects-client.ts`. Ver `progress/reports/impl_22_t1.md` y `review_22_t1.md`.
**Fuera de alcance:** crear patrón embebido (E6 a), migrar `ProjectsToolbar` (E6 b), y **el backend
entero** (ni endpoint, ni esquema, ni validación de servidor).

**Partida:** `1707 passed | 13 skipped`.

---

## Plan (siete piezas, test primero en cada una)

| # | Pieza | Dónde | Estado |
|---|---|---|---|
| 1 | Copia y helpers puros del formulario | `features/projects/ui/project-form.ts` | ✅ |
| 2 | `NeedlesField` — el control de agujas, **en la feature** (E6 e) | `features/projects/ui/NeedlesField.tsx` | ✅ |
| 3 | `ProjectFormDialog` — el modal crear/editar, con foto y patrón | `features/projects/ui/ProjectFormDialog.tsx` | ✅ |
| 4 | Entradas a "editar" y "borrar" en el cajón (E3 d, aditivo) | `ProjectDetailDrawer.tsx`, `project-detail.ts` | ✅ |
| 5 | Cableado en la página: crear, editar, borrar con confirmación | `ProjectsView.tsx` | ✅ |
| 6 | Gate de clases de `/proyectos` ampliado a las piezas nuevas | `projects-ui.classes.test.ts` | ✅ |
| 7 | Deuda **176**: el comentario que promete lo que no mide | `FileInput.test.tsx:126` | ✅ |

## Decisiones tomadas antes de escribir

*(se detallan y se justifican abajo, según se van cerrando)*

- **La foto se sube al ELEGIRLA, no al guardar.** El endpoint falla de tres maneras distintas (400 formato
  o >4 MB, 401 sesión, 502 proveedor) y descubrirlo después de rellenar el formulario entero tira el
  trabajo. Subir primero además deja el envío del formulario como **una sola petición**, en vez de dos
  encadenadas con su fallo a mitad — que es exactamente lo que E6 (a) descartó para el patrón embebido.
- **La entrada a "crear" con el cesto NO vacío**: la sección dedicada quedó sin escribir cuando la sesión se
  cortó. **La decisión está en la bitácora de la pieza 5**, con su argumento: va en la cabecera, y sólo
  cuando el panel de cesto vacío no se está pintando.
- **El patrón sólo se ELIGE de biblioteca** (E6 a). Si la biblioteca no se puede traer, el campo **no se
  ofrece** y `patternId` no viaja en el parche, así que editar un proyecto con patrón **no lo pierde**.

---

## Bitácora por pieza

*(se rellena al cerrar cada una)*
### 1. `project-form.ts` — copia y helpers puros ✅

**Archivos:** `src/features/projects/ui/project-form.ts`, `project-form.test.ts` (**20 tests**).

Molde de `project-detail.ts` y `project-filters.ts`: datos y funciones puras, probadas sin montar nada, y
los tests **importan los textos en vez de reescribirlos**. `UpdateProjectPayload` se importa **como tipo y
por ruta interna** (el barrel arrastra Drizzle al navegador).

Contiene: las siete etiquetas del formulario, los títulos de alta y edición, la copia de agujas/foto/patrón,
`parseTargetRounds`, `emptyFields`/`fieldsOf`, `addNeedle`/`removeNeedle`/`needleChoices` y `projectPatch`.

**Decisiones no obvias:**

- **`projectPatch` manda SÓLO lo que cambió.** El endpoint aceptaría el formulario entero, pero eso pisaría
  con el valor del formulario cualquier campo que otra pantalla haya tocado mientras el modal estaba
  abierto — y el tab Progreso mueve `targetRounds` **desde el mismo cajón que hay detrás**. El nulo **sí**
  viaja: quitar la foto o el patrón es un cambio a `null`, y omitirlo dejaría el valor viejo.
- **Un parche vacío no sale a la red.** El endpoint responde **400** ("No hay nada que actualizar."), así
  que "guardar sin tocar nada" tiene que cerrar el modal, no enseñar un error.
- **Vacío en la meta es cero, no un error**: un proyecto sin meta es el caso normal (es el default de la
  tabla). Se valida con la misma regla que el campo del tab Progreso, antes de salir.
- **La lista de patrones NO se filtra por el tipo elegido**: el tipo se puede cambiar con el modal abierto y
  filtrar haría desaparecer en silencio el patrón ya elegido. Por eso la etiqueta lleva la clase de tejido.

**Hallazgo: un verde-falso propio, cazado por mutación antes de entregarlo.** El test del tope de agujas
construía la lista llena con `[...NEEDLE_SIZES].slice(0, MAX_NEEDLES)`. **El catálogo tiene diecisiete
medidas y el tope son veinte**, así que el corte devolvía diecisiete y el aserto pasaba por el camino
equivocado —la medida añadida ya estaba dentro—, **sin comprobar el tope ni una vez**. Corregido: la lista
se construye a mano y se comprueba que la medida no esté. Y de ahí sale un corolario que ahora está escrito
en el código: **por la interfaz el tope es inalcanzable**, porque sólo se elige del catálogo cerrado y sin
repetir. Por eso el cartel dice *"Ya anotaste todas las medidas"* y no *"el máximo"*: nombrar un límite que
nadie puede tocar es mentir en pantalla.

### 2. `NeedlesField` — el control de agujas, en la feature (E6 e) ✅

**Archivos:** `src/features/projects/ui/NeedlesField.tsx`, `NeedlesField.test.tsx` (**11 tests**).

**Es un grupo (`fieldset`/`legend`), no un campo**: dentro hay varios controles —la lista de lo anotado y el
par elegir/añadir— y una sola etiqueta no puede nombrarlos a todos. Cada botón de quitar **nombra su
medida** (mismo tratamiento que `unlinkYarnLabel`).

**Se elige de un catálogo cerrado, no se teclea**, y es el **mismo** que ofrece "más filtros": una medida
fuera de esa lista quedaría anotada y **nunca encontrable**. Lo ya anotado desaparece del desplegable
(criterio de `linkableYarns`).

**Añadir es un botón aparte y no el propio `onChange` del desplegable**: en un `<select>` nativo, moverse
con las flechas dispara `change` **en cada paso**, así que añadir al cambiar anotaría media lista a quien
navegue por teclado.

**El valor pendiente se DERIVA**, no se sincroniza con un efecto: al añadir, la medida elegida desaparece de
las opciones y el repliegue es la primera que quede.

**Qué mide el test (11):** que es un grupo nombrado; que la ausencia se dice en vez de dejar un hueco; que
lista lo anotado con su unidad; que añade y avisa; que no ofrece lo ya anotado; que quita lo pedido; que
cada botón de quitar nombra su medida; que **sin medidas por ofrecer** el par de añadir desaparece con su
explicación; que **con veinte medidas de fuera del catálogo** tampoco deja añadir (el único camino por el
que el tope del esquema es alcanzable, y llega por prop, no por la pantalla); que desactivado no deja ni
añadir ni quitar; y `axe`.

**Probado por mutación (4, todas revertidas, todas rojas):** quitar la guarda del tope en el componente
(**1 failed**); quitarla en `addNeedle` (**1 failed**); ofrecer el catálogo entero sin descontar lo anotado
(**3 failed**); mandar la foto en el parche siempre (**5 failed**).

### 3. `ProjectFormDialog` — el modal de crear/editar ✅

**Archivos:** `src/features/projects/ui/ProjectFormDialog.tsx`, `ProjectFormDialog.test.tsx` (**31 tests**),
`project-form.ts` (+2 constantes de la biblioteca).

**Del precedente, sin inventar nada:** `initialFocusRef` al nombre, `<form noValidate method="post">`
(deudas 39 y 43), validación en cliente **con el mismo schema del endpoint** importado **por ruta interna**,
foco al campo inválido (deuda 38), `<Button loading={pending}>`. Del cajón de #21: el hijo **no tiene estado
`open`** y devuelve `null` sin objetivo, **el padre guarda el id**, el pendiente **se deriva**, y los errores
de acción van por **`ActionError`** — que además está medido sobre **esta misma superficie**
(`bg-surface-raised` es la del panel del `Dialog` y la del cajón; 5.35:1).

**Decisiones no obvias:**

- **El formulario se REMONTA en cada apertura** (`key` sobre el objetivo). Sin eso, abrir "editar" sobre otro
  proyecto arrancaría con lo que quedó escrito en el anterior; sincronizar estado con props en un efecto es
  exactamente el sitio donde eso se rompe.
- **La foto se sube al ELEGIRLA.** Dos motivos concretos: los tres fallos del endpoint (400 formato o peso,
  401 sesión, 502 proveedor) tienen que verse **antes** de rellenar el formulario entero, y subir primero
  deja el envío como **una sola petición** en vez de dos encadenadas con su fallo a mitad — que es justo lo
  que E6 (a) descartó para el patrón embebido.
- **El archivo se valida en cliente con `uploadImageInputSchema`, el MISMO del endpoint.** Un archivo de más
  de 4 MB **no sale a la red** y el mensaje que se lee es literalmente el del servidor. Los repliegues por
  status de T1 siguen cubriendo lo que el esquema no puede saber (401, 502, y un 400 que el navegador no
  anticipó).
- **La vista previa reusa `ProjectPhoto`**, la misma pieza de la tarjeta: lo que se ve al elegir la foto es
  exactamente lo que se va a ver en la lista, en vez de dos encuadres distintos.
- **El foco tras un error de subida se pide para DESPUÉS del render.** Medido: el selector de archivo está
  desactivado mientras sube, las actualizaciones que siguen a un `await` se agrupan, y un `focus()` sobre un
  control que en el DOM sigue desactivado **no hace nada y no avisa** — el foco se quedaba en el cuerpo del
  documento. Es un hallazgo real de esta tanda, no una precaución.
- **El desplegable de patrones tiene TRES estados distintos** porque no dicen lo mismo: cargando (silueta +
  región viva), **vacía** e **imposible de traer**. Y lo que de verdad importa: con la biblioteca caída,
  `patternId` **no viaja en el parche**, así que un fallo de la biblioteca **no le borra el patrón a nadie**.
  Hay test.

**Qué mide el test (31):** que sin objetivo no pinta nada **ni pide nada**; los siete campos; el título del
alta con su clase de tejido y el tipo preseleccionado; el foco inicial; el alta completa con su **cuerpo
exacto**; la meta vacía como cero; el error del servidor visible sin cerrar; nombre vacío y meta no entera
sin salir a la red y con el foco en su campo; la edición rellena; el **PATCH con sólo lo tocado**; guardar
sin tocar nada **sin salir a la red**; quitar la foto mandando `null`; la subida **multipart sin cabecera
propia** y su URL guardada en el alta; el estado "subiendo" **visible además de anunciado**; el **400 con el
motivo del servidor**, el **401** y el **502** con el suyo; el archivo grande rechazado **sin red**; el foco
devuelto al selector tras el fallo; que sin foto no se ofrece quitarla; que la biblioteca se pide **sólo de
biblioteca** y se ofrece con la clase de tejido; el patrón elegido en el cuerpo; biblioteca vacía y
biblioteca caída (y que editar **no pierde el patrón**); que el tipo **no filtra** la biblioteca; cancelar y
`Escape`; y `axe` en alta y en edición (sobre `baseElement`: el modal vive en un portal).

**Probado por mutación (6, todas revertidas, todas rojas):** mandar el formulario entero en el parche
(**4 failed**); quitar la guarda del parche vacío (**1 failed**); quitar `initialFocusRef` (**1 failed**);
quitar la validación previa del archivo (**1 failed**); pedir la biblioteca sin el filtro `inLibrary`
(**1 failed**); no pedir el foco tras un error de subida (**1 failed**).

### 5. Cableado en `ProjectsView` — crear, editar y borrar ✅

**Archivos:** `src/features/projects/ui/ProjectsView.tsx`, `ProjectsView.test.tsx` (los **11 tests** que la
sesión anterior dejó escritos en rojo; ahora en verde, **54/54** en ese archivo).

> **Contexto:** la sesión anterior murió por límite de cuenta con los tests de esta pieza ya escritos y sin
> el código que los pone en verde. Esta tanda **no los reescribió**: los usó como especificación.

**Lo que se cableó:** los dos botones de creación rápida (que **preseleccionan el tipo**), la edición desde
el cajón, y el borrado con confirmación que **deja la lista coherente sin recargar la página**.

**DECISIÓN: la entrada a "crear" con el cesto NO vacío.** El informe la dejó abierta ("ver la sección
dedicada al final") y esa sección nunca se escribió, así que se resuelve acá.

- **Va en la cabecera de la página, junto al `h1`, y sólo cuando el panel de cesto vacío NO se está
  pintando.** Antes de #22 la única entrada vivía dentro del estado vacío: quien ya tenía proyectos **no
  tenía ninguna forma de crear otro desde `/proyectos`** —tenía que irse al inicio—, y eso es un callejón.
- **Nunca hay dos parejas a la vez.** Con el cesto vacío la llamada a la acción es la del panel (es de lo
  que vive ese panel) y la cabecera se calla; con proyectos, al revés. Cuatro botones idénticos repartidos
  por la misma pantalla es el defecto que dejó fichado la **deuda 142**. La condición se calcula **una sola
  vez** (`emptyBasketShown`) y la usan los dos sitios, para que no puedan discrepar.
- **Los dos botones son primarios y del mismo peso**, y son `Button` y no enlaces. Son la misma acción con
  distinta clase de tejido —una elección entre iguales, no entre principal y alternativa—, y es **la forma
  exacta que ya usa el Dashboard** para esta misma pareja (`DashboardView.tsx`, `variant="primary"` ×2). El
  estado vacío usaba **enlaces de texto subrayado** al Dashboard: eran enlaces porque el modal no existía, y
  el propio código lo dejó anticipado por escrito. Ahora abren el modal, así que son botones.
- **La cabecera va en un `div`, no en un `<header>`**: esta vista se monta suelta en varios tests y un
  `<header>` fuera de `<main>` se convierte en landmark `banner`, que ya tiene dueño en el shell.

**Las otras decisiones no obvias:**

- **Alta → se vuelve a pedir la lista. Edición → se reemplaza en el sitio y NO se recarga.** No es
  incoherencia: dónde cae un proyecto **nuevo** lo deciden el orden del servidor y los filtros puestos, y
  eso no se puede adivinar desde el navegador. En cambio, en la edición **el cajón sigue abierto detrás del
  modal**, y una recarga puede devolver una lista en la que el proyecto ya no entra —basta cambiarle el tipo
  con el filtro de tipo puesto—; entonces el cajón se cerraría solo justo después de guardar, echando al
  usuario de lo que estaba mirando. **Límite conocido y asumido:** un proyecto que dejó de pasar el filtro
  sigue en la rejilla hasta la próxima carga. Es exactamente lo que esta lista ya hace hoy mientras llega un
  cambio de filtro (los datos viejos sobreviven a propósito), no un caso nuevo.
- **El cajón sí se entera de la edición**, vía `refreshToken`: tiene sesiones, pasos y lanas que la lista no
  trae, y sin eso seguiría enseñando el nombre viejo del proyecto recién renombrado.
- **Borrar quita la tarjeta del estado local y no vuelve a pedir la lista.** Acá sí se puede y en el alta no
  porque **quitar** no necesita saber ni el orden ni si pasa los filtros: el elemento ya estaba. El `DELETE`
  responde **204 sin cuerpo**, que es donde un cliente escrito con `response.json()` reventaría (lo cubre
  `requestWithoutBody`, de T1).
- **Si el borrado falla no se toca nada** y el motivo se lee **dentro de la propia confirmación**
  (`ActionError`), que es donde está mirando quien acaba de pulsar. Cerrar y avisar en otro sitio dejaría al
  usuario buscando qué pasó.
- **Editar y borrar guardan el id, no el objeto** (`FormRequest`), igual que `detailId` en #21. Y
  `toFormTarget` devuelve `null` —modal cerrado— si el proyecto a editar ya no está en la lista.
- **La confirmación se monta sólo cuando hay algo que borrar**, porque su pregunta nombra el proyecto. El
  foco vuelve igual: `Dialog` lo restituye en la **limpieza del efecto**, que corre también al desmontar
  (verificado leyendo `Dialog.tsx`, no supuesto).

**Un verde-falso cazado por mutación, y es del arnés de test, no del código.** Quitando la recarga posterior
al alta, el test que la exige **seguía verde**: `listUrls()` filtraba **sólo por URL**, y el alta es un
`POST` a la URL pelada de la lista —la misma cadena exacta—, así que **la propia alta se contaba como "volvió
a pedir la lista"**. Corregido: el helper filtra también por método (`GET`). Es la **segunda vez** que este
helper se queda corto por mirar sólo la URL; su JSDoc ya contaba la primera.

**Dos asertos del test ajustados (no relajados), y por qué.** `cancelar la confirmación no borra nada` y
`un borrado que falla ... no quita la tarjeta` hacían `screen.getByRole("heading", { name: BUFANDA.name })`,
y eso **no fallaba: se volvía ambiguo**, porque con el cajón abierto hay **dos** encabezados con ese nombre
(el `h3` de la tarjeta y el `h2` del cajón, que es su nombre accesible). El error era "found multiple
elements", que no dice nada de lo que el test quiere medir. Se acotan a la sección de la lista con un helper
nuevo (`listHeading`): el cajón vive en un portal colgado de `body`, así que queda fuera sin trucos. El
aserto **mide más** que antes, no menos: ahora afirma que **la tarjeta** sigue ahí, que es lo que dice el
nombre del test.

**Probado por mutación (6, todas revertidas):** la cabecera enseña los botones siempre (**5 failed**); el
alta no recarga la lista (**1 failed** — *sólo después de arreglar el helper*; antes: **0**); la edición no
refresca el detalle (**1**); tras borrar recarga la lista en vez de quitar la tarjeta (**1**); un borrado
fallido quita la tarjeta igual (**1**); borrar sin preguntar (**3**).

### Bonus no planificado: lint y typecheck estaban EN ROJO al retomar

La tanda anterior murió sin llegar a correr `init.sh`, y dejó tres fallos que **no eran de tests**:

- **`lint`**: `react-hooks/set-state-in-effect` en `ProjectFormDialog.tsx` — el efecto que lleva el foco
  limpiaba su propia petición con un `setState` dentro del cuerpo del efecto. Arreglado sin perder el
  comportamiento: **el campo pendiente pasa a una referencia y lo que dispara el efecto es un contador**, así
  que el efecto **consume** la petición sin encadenar otra ronda de render. Los cuatro sitios que la pedían
  ahora llaman a `requestFocus`.
- **`typecheck`** en `ProjectFormDialog.test.tsx`, dos errores:
  1. `fetchSpy.mock.calls` es `any[][]` y se desestructuraba como tupla de dos (`[string, RequestInit?]`);
     una lista de longitud desconocida no encaja. Se lee por índice y se tipa lo leído.
  2. `resolveUpload` estrechado a `never`: TypeScript no sigue una asignación hecha dentro de una función que
     todavía no corrió, así que la variable se quedaba en `null` y llamarla no compilaba. Se guarda en una
     **lista**, que además **conserva el modo de fallo**: si la subida nunca sale, el test revienta en vez de
     pasar de largo con un `?.`.

### 6. Gate de clases de `/proyectos`, ampliado ✅

**Archivo:** `src/features/projects/ui/projects-ui.classes.test.ts` (**14 → 16 tests**).

Entran **`ProjectFormDialog.tsx`** y **`NeedlesField.tsx`** a la lista de componentes cubiertos. Los
primitivos de la tanda 1 —`Select`, `Textarea`, `FileInput`, `ConfirmDialog`— **no van acá**: viven en el
design system y los cubre el gate de esa capa (`form-primitives.tokens.test.ts`).

No hizo falta tocar nada más: las dos piezas nuevas se resuelven enteras (ni `unhandled`, ni `bypassed`, ni
`ambiguous`, ni fuentes externas nuevas), así que los seis tests compartidos siguen exigiendo lo mismo.

**Sobre la advertencia de las variantes min-width:** no aplica acá, y está comprobado en vez de supuesto —
**ninguno de los dos archivos nuevos usa una sola variante de breakpoint**. No hay ninguna regla escrita
"para que aplique sólo hacia abajo" que pudiera compilar a nada y dejar el gate verde sobre el vacío.

**Probado por mutación (2, las dos revertidas, las dos rojas):** una clase inerte en `ProjectFormDialog.tsx`
(**1 failed**, y el mensaje la nombra) y otra en `NeedlesField.tsx` (**1 failed**). O sea: el gate mide de
verdad los dos archivos nuevos, no sólo los lista.

### 7. Deuda 176 — el comentario que prometía lo que no mide ✅

**Archivo:** `src/shared/ui/primitives/file-input/FileInput.test.tsx` (**sólo el comentario**; el test no se
toca, como pedía el encargo).

Decía *"el invariante que rompería esconder el input con `display:none`"* y **no lo guarda**. Verificado por
mí, no heredado de la ficha: poniendo `hidden` en el `<input>` real, ese archivo **sale 11/11 verde**
(mutación aplicada y revertida). `happy-dom` no aplica hojas de estilo al orden de foco, así que ahí ese
invariante no se puede medir.

El comentario nuevo dice **lo que el test sí mide** —marcado: ni `tabIndex={-1}` ni `disabled`, y que el foco
cae en el input y no en el disparador— y **remite al sitio donde el invariante real sí se mide**, sobre CSS
compilado: `form-primitives.tokens.test.ts` → *"la utilidad que lo esconde recorta y posiciona, pero no lo
apaga"*, que exige `position: absolute` y prohíbe `display: none` y `visibility: hidden`.

---

## Verificación

```
bash ./init.sh   →   EXIT 0
[OK]    lint verde
[OK]    typecheck verde
 Test Files  98 passed | 3 skipped (101)
      Tests  1792 passed | 13 skipped (1805)
[OK]    Entorno listo. Puedes empezar a trabajar.
```

Partida de la tanda: `1707 passed | 13 skipped`. Cierre: **1792 passed | 13 skipped** → **+85 tests**.

> El encargo apuntaba a 1803. Son **1805** porque la pieza 6 añade **dos** tests al gate de clases (uno por
> componente nuevo), que no estaban contados.

## Lo que NO pude verificar

- **NO tengo herramientas de navegador en esta sesión.** No hay ni una captura, ni una medición de layout,
  ni un `getBoundingClientRect`. **Nada de lo que sigue es una verificación visual**, y no doy por bueno el
  aspecto de ninguna pantalla nueva. Los tres puntos que dejó abiertos el reviewer de T1 siguen **abiertos**;
  lo único que puedo aportar es lo que se mide desde el fuente y el CSS compilado:
  1. **El anillo de foco del disparador de archivo.** El invariante está gateado
     (`form-primitives.tokens.test.ts`: el input oculto conserva `position: absolute` y no se apaga, y el
     anillo se dibuja en el hermano visible). Lo que **no** puedo decir es si en pantalla **se ve** y dónde
     cae. Es la pieza frágil y hay que mirarla.
  2. **La flecha nativa del `Select`.** Leído en el fuente: `selectClasses` **no** lleva `appearance-none`,
     así que la flecha la pinta el navegador. Que **contraste** contra la superficie del control sólo lo dice
     un navegador.
  3. **El contraste del botón `danger`.** Calculado sobre los tokens: `--danger` `#c6432f` contra
     `--accent-fg` `#fff8ee` = **4.69:1**. Pasa AA para texto normal (4.5:1) y el rótulo va en negrita. Es
     aritmética sobre los tokens, **no** una medición de la pantalla real: no dice nada del borde, de la
     sombra dura ni del estado `hover`.
- **El modal en móvil real (≤390 px)**: fuera de alcance por la vía de siempre (Chrome no baja de ~500 px);
  el formulario es la pantalla más alta de la app hasta hoy y ahí es donde más importa.

## Deuda candidata que deja esta tanda

- **La edición no recarga la lista.** Un proyecto al que se le cambia el tipo con el filtro de tipo puesto
  sigue en la rejilla hasta la próxima carga. Es **deliberado** (recargar cerraría el cajón que sigue abierto
  detrás del modal) y está argumentado arriba, pero es una incoherencia observable y merece ficha ⚪.

## Archivos que tocó ESTA sesión (la continuación de la tanda 2)

Modificados:

- `src/features/projects/ui/ProjectsView.tsx` — pieza 5 entera (cabecera con la pareja de crear, modal,
  confirmación de borrado, `handleSaved`, `confirmDelete`, `toFormTarget`; fuera el enlace al Dashboard y sus
  clases ad-hoc).
- `src/features/projects/ui/ProjectsView.test.tsx` — `listUrls()` filtra también por método (verde-falso
  cazado por mutación); helper `listHeading`; dos asertos desambiguados.
- `src/features/projects/ui/ProjectFormDialog.tsx` — el foco pendiente pasa de estado a referencia +
  contador (arregla `lint` en rojo).
- `src/features/projects/ui/ProjectFormDialog.test.tsx` — dos errores de `typecheck` en rojo.
- `src/features/projects/ui/projects-ui.classes.test.ts` — pieza 6.
- `src/shared/ui/primitives/file-input/FileInput.test.tsx` — pieza 7, **sólo el comentario**.
- `progress/reports/impl_22_t2.md` — este informe.

Sin tocar: el backend entero (endpoint, esquema y validación de servidor), `ProjectDetailDrawer.tsx` y
`project-detail.ts` (la pieza 4 ya estaba cerrada por la sesión anterior).

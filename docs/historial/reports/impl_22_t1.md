# impl #22 `projects_form_ui` — TANDA 1 (cimientos)

> **Informe incremental anti-congelación.** Se escribe ANTES de tocar código y se actualiza al cerrar
> cada pieza, no al final. Si la sesión se corta, esto es lo único que sobrevive.

**Contrato:** RFC-03 §7-septies, enmienda **E6** (b), (c), (d), (f), (g), (h).
**Inventario de partida:** `progress/reports/explore_22_inventario.md`.
**Fuera de alcance de T1:** el modal, los botones de creación rápida, el borrado cableado, la migración de
`ProjectsToolbar` y el patrón embebido.

---

## Plan (seis piezas, cada una con su test primero)

| # | Pieza | Dónde | Estado |
|---|---|---|---|
| 1 | `Select` — primitivo, compone con `Field` | `src/shared/ui/primitives/select/` | ✅ 8 tests verdes |
| 2 | `Textarea` — primitivo, compone con `Field` | `src/shared/ui/primitives/textarea/` | ✅ 9 tests verdes |
| 3 | `FileInput` — primitivo **tonto** (elige y muestra) | `src/shared/ui/primitives/file-input/` | ✅ 13 tests verdes |
| 4 | `ConfirmDialog` — sobre `Dialog`, sin cierre por velo | `src/shared/ui/primitives/confirm-dialog/` | ✅ 14 tests verdes |
| 5 | Barrels + ancla de superficie pública | `primitives/index.ts`, `public-api.test.ts` | ✅ 5 + 12 tests verdes |
| 6 | CRUD de cliente + `getPatterns` + `uploadProjectImage` | `src/features/projects/ui/projects-client.ts` | ✅ 17 tests verdes |

### Decisiones tomadas antes de escribir

- **Los cuatro primitivos siguen el molde de `field/`**: variantes con `cva` en `<name>.variants.ts`,
  componente aparte, `cn()` para fusionar `className`, cero números crudos, tokens en forma canónica de
  paréntesis. `Select` y `Textarea` **reutilizan `inputClasses`** en vez de clonar la piel del control de
  texto: son el mismo control con otra caja, y clonar las clases es cómo se desincronizan.
- **`Select` y `Textarea` reenvían la ref y aceptan las props nativas**, para que `Field` les pueda cablear
  `id`/`aria-invalid`/`aria-describedby` por `cloneElement` exactamente igual que a `Input`, y para que el
  modal de T2 pueda pedir el foco inicial con `initialFocusRef`.
- **`FileInput` no sabe nada de subidas** (E6 c, deuda 168): recibe `accept`, `onFileChange` y el nombre
  del archivo elegido a mostrar; no habla con ningún endpoint.
- **`ConfirmDialog` fija `dismissOnScrimClick={false}`** (E6 d) y **no expone la prop**: si se pudiera
  volver a encender, el gate no protegería nada.
- **El cliente va dentro de `projects-client.ts`** (E6 f, deuda 129): ni un cuarto clon del cliente HTTP.
- **`uploadProjectImage` trata `201` como el éxito** (E6 h, deuda 60) y no `response.ok`.

---

## Bitácora por pieza

### 1. `Select` ✅

**Archivos:** `src/shared/ui/primitives/select/{Select.tsx,Select.test.tsx,index.ts}`.

`<select>` nativo envuelto, `forwardRef`, props nativas completas. `selectClasses` **se deriva de
`inputClasses`** (`[inputClasses, "cursor-pointer"].join(" ")`) en vez de clonar la lista: son el mismo
control con otra caja y clonarla es cómo se desincronizan.

**La flecha la sigue pintando el navegador.** Quitarla con `appearance-none` obliga a redibujar la única
señal de "esto despliega" y a sincronizarla con el estado abierto/cerrado, que el CSS no ve. Es lo que ya
hace hoy `ProjectsToolbar`, así que no cambia nada visualmente respecto a lo que hay en pantalla. **Un
indicador propio sería una decisión de RFC, no de este archivo** — lo digo explícitamente para que nadie
lea el primitivo como "el desplegable ya está resuelto del todo".

**Qué mide el test (8):** que es un `<select>` de verdad; que se puede elegir una opción y avisa; que
**`Field` le cablea `id`/`aria-invalid`/`aria-describedby`** por `cloneElement` igual que a `Input` (el
corazón de E6 b); que reenvía la ref (T2 la necesita para `initialFocusRef`); que hereda entera la piel del
control de texto; que añade algo propio por encima; que `cn()` deja sobreescribir desde fuera; y `axe`
sobre el estado válido y el de error.

**Hallazgo medido, ajeno a #22:** `cn(inputClasses)` **descarta `focus-visible:outline`** — `twMerge` lo
funde con `focus-visible:outline-(length:--border-width-heavy)`. Le pasa **igual a `Input`** hoy, así que
no es algo que introduzca `Select`. Por eso el test compara contra `cn(inputClasses)` y no contra la
constante cruda: la cruda no describe lo que ningún control renderiza. **Queda medido en el gate de CSS
compilado de la pieza 5** (si Tailwind emite `outline-style` con la forma de longitud, no hay defecto
visible; si no, hay ficha). No se toca `Input` desde acá: es una feature cerrada y no es el alcance de T1.

### 2. `Textarea` ✅

**Archivos:** `src/shared/ui/primitives/textarea/{Textarea.tsx,Textarea.test.tsx,index.ts}`.

Mismo trato que `Select`: `<textarea>` nativo, `forwardRef`, `textareaClasses` derivado de `inputClasses`
más `resize-y`.

**La altura se pide con `rows`, no con CSS.** El sistema **no tiene un token de "alto de área de texto"**, y
declarar una longitud suelta habría sido exactamente el número crudo que la regla token-first prohíbe.
`rows` cuenta LÍNEAS, así que la caja crece con la tipografía y el interlineado del sistema sin que el
componente sepa cuánto miden. `TEXTAREA_DEFAULT_ROWS = 4` se exporta y el test lo importa.

**Sólo se redimensiona en vertical**: dejarlo crecer a lo ancho rompería la columna del formulario y el
tope de contenido de la app (RFC-01, E13).

**Qué mide el test (9):** que es un `<textarea>`; que acepta varias líneas de verdad (se teclea un salto de
línea y se comprueba el `\n` en el valor); que nace con más de una línea de alto y que `rows` se puede
cambiar; el cableado de `Field`; la ref; que hereda la piel del control de texto; que añade lo suyo; el
override por `cn()`; y `axe` en válido y con error.

### 3. `FileInput` ✅

**Archivos:** `src/shared/ui/primitives/file-input/{FileInput.tsx,file-input.variants.ts,
FileInput.test.tsx,file-input.boundary.test.ts,index.ts}`.

**La forma, y por qué no es la obvia.** El control es un `<input type="file">` **real**, invisible
(`sr-only`) pero **enfocable**, más un disparador visible marcado `aria-hidden` que le reenvía el clic. Es
la única forma que deja **un solo control** en el árbol de accesibilidad. Las dos alternativas obvias están
descartadas por motivos concretos, no por gusto:

- un disparador que además fuera `<label>` le daría **dos etiquetas** al mismo input (la de `Field` y la
  suya) y el nombre accesible sería la concatenación;
- esconderlo con `display:none` lo sacaría del orden de tabulación y dejaría a quien navega por teclado
  **sin ninguna forma de abrir el selector**.

**El precio, pagado:** con el input invisible, el foco cae en él y el anillo hay que dibujarlo en el
hermano visible (`peer-focus-visible:` en `file-input.variants.ts`). Eso va **medido en el gate de CSS
compilado** de la pieza 5: una utilidad que Tailwind no genera es una cadena inerte, y un anillo que no se
pinta es un control sin foco visible.

**Jerarquía, decidida antes que las clases:** dentro de un formulario, elegir la foto es **secundario** (el
primario es guardar), así que el disparador toma la piel del botón `secondary` **reusando `buttonVariants`,
no clonándolo**; el nombre del archivo va en la voz monoespaciada pequeña, la misma que `Field` usa para
sus mensajes, porque es un dato de estado y no un título.

**El nombre lo manda el llamador** (`fileName`), no se guarda dentro: quien elige el archivo ya lo tiene en
su estado —lo necesita para subirlo— y una segunda copia serían dos fuentes de verdad que se desincronizan
al limpiar el formulario.

**Qué mide el test (11 de comportamiento + 2 de frontera):** que es un `input[type=file]`; que `accept`
llega; que avisa **con el `File` elegido** (`user.upload`); que sin archivo dice que está vacío; que con
archivo muestra el nombre y quita el aviso; que **el disparador dispara un clic sobre el input** (medido con
una escucha real, no supuesto); que el disparador está `aria-hidden`; que **el input sigue siendo parada de
tabulación** (`user.tab()` → foco en el input); el cableado de `Field`; la ref; y `axe` con y sin archivo.

**La frontera de E6 (c) va en su propio archivo y en entorno Node**: `happy-dom` no resuelve
`import.meta.url` como URL de archivo (medido: *"The URL must be of scheme file"*), así que `readFileSync`
no puede correr en el test de DOM. El gate lee `FileInput.tsx` y comprueba que no menciona ni red ni
endpoint ni proveedor, **con su propio seguro** (si el archivo se leyera vacío habría cero infracciones, o
sea verde falso: se comprueba que se leyó de verdad).

### 4. `ConfirmDialog` ✅

**Archivos:** `src/shared/ui/primitives/confirm-dialog/{ConfirmDialog.tsx,confirm-dialog.variants.ts,
ConfirmDialog.test.tsx,index.ts}`.

**Se construye SOBRE `Dialog`, no en paralelo.** Los cuatro invariantes de un modal —foco atrapado,
`Escape`, foco devuelto a quien abrió, fondo sin scroll— ya están implementados y probados uno a uno ahí.
Este primitivo sólo añade las dos cosas sin las cuales una confirmación no confirma nada:

1. **`dismissOnScrimClick` fijado a `false` y NO expuesto como prop.** Si se pudiera volver a encender desde
   fuera, la garantía sería una sugerencia. La prop existía en `Dialog` desde el principio, documentada
   literalmente como *"se puede apagar para un flujo destructivo"*, y **nunca se había usado**.
2. **El foco inicial cae en «Cancelar».** El defecto de `Dialog` es el panel (correcto para un aviso); acá
   lo correcto es la salida segura, para que un Enter por inercia al abrir **no borre nada**.

`Escape` **sigue cerrando** y sale por `onCancel`: apagar el velo no puede llevarse por delante la salida
por teclado, que es la que usa quien no puede apuntar con un ratón. Hay test.

**El tono por defecto es `danger`, y es deliberado** (`confirm-dialog.variants.ts`): el primitivo nace para
el borrado. Si el defecto fuese el neutro, el caso peligroso sería el que hay que acordarse de pedir y
olvidarse saldría silencioso y bonito; al revés, un olvido pinta de rojo una confirmación inocua, que es un
error **visible y barato**. La piel se toma de `buttonVariants`, no se clona.

**Qué mide el test (14):** cerrado no pinta nada; abierto muestra pregunta, detalle y las dos salidas;
confirmar avisa y no cancela; cancelar avisa y no confirma; **el clic en el velo ni cierra ni decide** (las
tres direcciones); `Escape` cancela; el aspa cancela; **el foco inicial está en cancelar**; confirmar lleva
la piel de peligro y cancelar **no comparte ni una** de sus clases exclusivas; `tone="default"` la cambia;
`loading` deshabilita y marca `aria-busy`; admite contenido propio (el error de la acción de T2); admite
etiquetas propias; y `axe`.

**Los dos tests que sostienen E6 (d) se probaron por mutación, no se supusieron:**

- `dismissOnScrimClick={false}` → `dismissOnScrimClick` (encendido): **1 failed | 13 passed**.
- quitar `initialFocusRef={cancelRef}`: **1 failed | 13 passed**.

Los dos revertidos inmediatamente. Sin esa comprobación, un aserto que no puede fallar se lee igual de
verde (deudas 160, 167, 174).

### 5. Barrels, ancla de superficie pública y gate de CSS compilado ✅

**Archivos:** `src/shared/ui/primitives/index.ts` (+ los cuatro `index.ts` de carpeta),
`src/shared/ui/public-api.test.ts`, `src/shared/ui/primitives/form-primitives.tokens.test.ts` (nuevo).

**Nueve nombres nuevos en la API pública**, anclados al literal en `public-api.test.ts` (que compara con
`toEqual` sobre la lista ordenada, así que falla en las dos direcciones): `Select`, `Textarea`, `FileInput`,
`FILE_INPUT_BUTTON_LABEL`, `FILE_INPUT_EMPTY_LABEL`, `ConfirmDialog`, `CONFIRM_DIALOG_CONFIRM_LABEL`,
`CONFIRM_DIALOG_CANCEL_LABEL`, `CONFIRM_DIALOG_TONES`. Más un test nuevo: **los cuatro controles llegan por
el barrel raíz** (un primitivo que existe pero no se reexporta es un primitivo que nadie puede usar).

**Decisión de tamaño de API:** `selectClasses` y `textareaClasses` **NO se exportan** por el barrel.
`inputClasses` está publicado porque antes había que pintar controles a mano; publicar sus gemelos
invitaría exactamente al `<select>` escrito a mano que estos primitivos vienen a sustituir. Siguen
exportados desde su módulo para que los tests deriven de ellos.

**El gate de CSS compilado va en UN archivo, no en cuatro.** Compilar el CSS de la app cuesta segundos y
cada archivo de test lo recompila entero; cuatro gates separados pagarían cuatro veces la misma factura.
Es la única desviación del `<componente>.tokens.test.ts` de los vecinos, y está escrita en el encabezado.

**Qué mide (12):** que Tailwind genera **cada** utilidad de las cuatro piezas (una clase que no genera regla
es una cadena inerte); que la utilidad que esconde el input de archivo **posiciona y recorta pero no
declara `display:none` ni `visibility:hidden`** —el invariante que lo mantiene enfocable, y que `happy-dom`
**no puede medir** porque no aplica estilos al orden de foco—; que las utilidades del anillo apuntan al
**hermano** (selector con `~`); que el anillo usa `--focus`, el grosor `--border-width-heavy` y se dibuja
hacia fuera; que el desplegable declara `cursor: pointer`; que el área de texto es `resize: vertical`; y que
la fila de salidas de la confirmación separa con `--space-3`.

**Probado por mutación (3, todas revertidas):**

- `--focus` → `--focuss` en el anillo del hermano: **1 failed**.
- `sr-only` → `hidden` en el input de archivo: **1 failed**.
- (las dos de la pieza 4, arriba).

#### La pregunta que abrió la pieza 1, cerrada con medición

`cn()` descarta `focus-visible:outline` al fundirlo con `focus-visible:outline-(length:…)`. **No hay
defecto visible, y ahora está medido:** la forma de longitud declara `outline-style: var(--tw-outline-style)`
por su cuenta, y esa variable llega al CSS compilado con `@property … initial-value: solid`. O sea que el
anillo se pinta igual — ni acá ni en `Input`. **No se abre ficha.** El gate lo comprueba a partir de la
variable real, no de un `solid` escrito a mano, así que si Tailwind cambiara ese valor por defecto, el test
lo diría.

### 6. El CRUD de cliente, `getPatterns` y `uploadProjectImage` ✅

**Archivos:** `src/features/projects/ui/projects-client.ts` (ampliado),
`src/features/projects/ui/types.ts` (+ `PatternListPayload`),
`src/features/projects/ui/projects-client.test.ts` (nuevo).

**Todo dentro de `projects-client.ts`, como manda E6 (f).** La deuda 129 dice que el cliente HTTP de
navegador va por su tercer clon; bajo la moratoria no interrumpe, pero abrir un archivo nuevo habría sido un
**cuarto clon a cambio de nada**.

| Función | Contrato | Cómo se respeta |
|---|---|---|
| `createProject(input)` | `POST /api/projects` → **201** `{ project }` | Reusa `projectMutation`. Manda el formulario **entero**; el del Dashboard acepta sólo `{name, type}`. |
| `updateProject(id, patch)` | `PATCH /api/projects/:id` → **200** `{ project }` | Parche **genérico**; el que había mandaba un solo campo. |
| `deleteProject(id)` | `DELETE /api/projects/:id` → **204 SIN CUERPO** | **`requestWithoutBody`**, que existe justo porque `response.json()` lanza sobre un 204. |
| `getPatterns(filtros?)` | `GET /api/patterns` → **200** `{ patterns }` | Filtros `type` e `inLibrary` como **cadenas literales** (el esquema es un enumerado con transformación: un 1 responde 400). |
| `uploadProjectImage(file)` | `POST /api/uploads/image`, multipart, campo `file` → **201** `{ url }` | Ver abajo. |

**Los tipos de entrada se importan como TIPOS desde `@/features/projects/validation`**, por ruta interna y
no por el barrel del feature (el barrel arrastra `./api` → Drizzle al bundle del navegador). `import type` se
borra en la compilación, así que no cuesta un byte y **si el esquema del endpoint gana un campo, el cliente
lo gana también**.

#### La subida, que es donde estaba la trampa (E6 h, deuda 60)

- **Éxito comparado contra `201`, no contra `response.ok`.** Un cliente escrito con `response.ok` funde 200 y
  201 y **ningún test que devuelva 201 lo delata**: por eso hay un caso que manda **200 con una URL válida** y
  exige que el cliente **no** lo acepte.
- **No se fija la cabecera de tipo de contenido.** El navegador tiene que poner la suya **con la frontera del
  multipart**, que sólo él conoce; fijarla a mano deja al servidor sin frontera y el 400 resultante *parece*
  del archivo. Hay test de que no se manda ninguna cabecera.
- **Tres repliegues por status** para cuando el cuerpo no se puede leer (400 formato/tamaño, 401 sesión, 502
  proveedor caído). Cuando el servidor **sí** manda su `{ error }`, gana el suyo: es más preciso (dice si
  falló el formato o el peso). Los formatos y los MB del mensaje **se derivan de
  `@/features/uploads/validation`**, no se reescriben, para que el cartel no se separe de la regla.
- `readErrorMessage` gana un parámetro de repliegue opcional. Es el único retoque a código existente y es
  aditivo: los cinco llamadores anteriores siguen recibiendo el mensaje genérico.

**Qué mide el test (17):** el alta completa con su cuerpo exacto y su 201; el error del servidor; la caída de
red como `status: 0`; el PATCH genérico con sólo los campos tocados; su 404; **el 204 sin cuerpo tratado como
éxito** (con una `Response` de 204 de verdad); el 404 del borrado; la lista de patrones desenvuelta; los dos
filtros como cadenas; que un filtro sin poner no viaja; el **201** de la subida; que **un 200 no se acepta**;
el `FormData` con el campo `file` y sin cabecera; el motivo del servidor en un 400; los tres repliegues por
status con cuerpo ilegible; que el mensaje de rechazo nombra los formatos y los MB **reales**; y la caída de
red de la subida.

**Probado por mutación (3, todas revertidas):**

- `response.status !== UPLOAD_CREATED_STATUS` → `!response.ok`: **1 failed | 16 passed**.
- añadir la cabecera de tipo de contenido al multipart: **1 failed | 16 passed**.
- `requestWithoutBody` → `request` en el borrado: **1 failed | 16 passed**.

---

## Verificación

```
$ bash ./init.sh
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
 Test Files  95 passed | 3 skipped (98)
      Tests  1707 passed | 13 skipped (1720)
   Duration  98.67s
[OK]    tests verdes
── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.

EXIT: 0
```

**Partida:** 1613 passed | 13 skipped. **Cierre:** 1707 passed | 13 skipped → **+94 tests**, cero
regresiones.

Reparto: `Select` 8 · `Textarea` 9 · `FileInput` 11 + 2 de frontera · `ConfirmDialog` 14 · `public-api` +2
(5 en total) · gate de CSS compilado 12 · cliente 17.

---

## Lo que NO pude verificar (dicho, no simulado)

1. **NO he visto ninguna de las cuatro piezas en un navegador.** No tengo herramientas de navegador en esta
   sesión. Los tests verdes **no son evidencia de que se vea bien**: en este repo ya se cerraron dos
   pantallas visiblemente rotas con la suite entera en verde (deudas 118 y 141). Lo que sí está medido es que
   **cada utilidad que nombran genera CSS de verdad** y qué declara (gate de CSS compilado). Lo que falta es
   el juicio visual, y es de la REGLA 4 del leader. Atenúa el riesgo que las cuatro piezas estén **sin
   cablear**: hoy no hay ninguna pantalla que las muestre, así que lo mirable de verdad llega con T2.
2. **Lo que `happy-dom` no puede medir, y por eso está en el gate de CSS y no fingido con un aserto:**
   `happy-dom` **no maqueta ni aplica hojas de estilo al orden de foco**. En concreto, **no puede demostrar
   que el input del selector de archivo siga siendo enfocable por estar oculto con `sr-only` y no con
   `display:none`**: ahí es enfocable en los dos casos, así que un test de tabulación saldría verde **incluso
   con el defecto puesto**. Por eso ese invariante se mide leyendo el CSS compilado. Igual el anillo de foco
   del hermano: `axe` no ve píxeles y su regla de contraste sale siempre `incomplete`.
3. **El disparador del selector de archivo no abre ningún selector real en los tests**: `happy-dom` no tiene
   diálogo de archivos. Se mide lo único medible sin mentir: que **el clic llega al input** (escucha real de
   `click`), que es la decisión que toma el componente. Que el navegador abra el selector al recibir ese clic
   es contrato del navegador, no nuestro.
4. **El `201` de la subida está medido contra un doble, no contra el endpoint real.** El contrato se leyó del
   Route Handler (`app/api/uploads/image/route.ts:44`) y el test lo replica. **La primera subida de verdad
   ocurre en T2**; si el endpoint mintiera, se vería ahí. Es la naturaleza de la deuda 60 y no se cierra desde
   T1.
5. **La flecha del desplegable es la del navegador**, así que cambia de aspecto entre navegadores y sistemas.
   No es un apaño escondido —es la afordancia nativa y es lo que ya hace hoy `ProjectsToolbar`—, pero lo digo
   para que nadie lea el primitivo como "el desplegable ya está resuelto del todo": un indicador propio es una
   decisión de RFC.

---

## Notas para quien siga (T2 y el reviewer)

- **Nada de esto está cableado todavía.** `/proyectos` sigue exactamente igual: los cuatro primitivos existen
  y nadie los usa, y el CRUD nuevo no tiene llamador. Es lo que E6 (g) pedía de T1.
- **`ProjectsToolbar` NO se migró** a `Select` (E6 b lo deja fuera de #22 explícitamente, para no mezclar una
  refactorización con una feature). Sus dos `<select>` a mano siguen ahí con `inputClasses`. **Ficha
  pendiente**, ya prevista en la enmienda.
- Para T2: `ConfirmDialog` acepta `children` (ahí va el error de la acción cuando el borrado falla) y
  `loading` (bloquea el segundo clic solo). `FileInput` es **controlado** en el nombre: quien sube guarda el
  `File` y le pasa `fileName`. `Select`, `Textarea` y `FileInput` reenvían la ref, así que sirven para el
  `initialFocusRef` del modal.
- **Ninguna deuda nueva se abre desde T1.** La única sospecha —`cn()` descartando la utilidad de trazo pelada—
  se midió y **no es un defecto**: la forma de longitud declara el estilo de trazo por su cuenta y su variable
  llega al CSS con `solid` como valor inicial.

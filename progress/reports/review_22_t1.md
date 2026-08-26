# Review — feature #22 `projects_form_ui`, TANDA 1 (cimientos)

**Veredicto: APROBADO**

**`bash ./init.sh` -> EXIT 0** · `Test Files 95 passed | 3 skipped (98)` ·
**`Tests 1707 passed | 13 skipped (1720)`** · duracion 194,38 s.
Coincide **exactamente** con lo que declara el implementer (`impl_22_t1.md`, seccion Verificacion).
Lint verde, typecheck verde.

**Alcance revisado:** solo T1. **El modal es T2 y no se le reclama.** Confirmado que nada esta cableado:
`/proyectos` no cambio, los cuatro primitivos no tienen ningun llamador y el CRUD nuevo tampoco.

---

## Checkpoints

- **C1 — El arnes esta completo: [x]** Los siete archivos base existen (los verifica el propio `init.sh`,
  pasos 2 y 3) y `bash ./init.sh` termina en **0**.
- **C2 — El estado es coherente: [x]** Una sola feature `in_progress` (la #22, `feature_list.json:350`).
  Toda pieza nueva trae test. `progress/current.md` describe la sesion activa, con la T1 marcada como
  entregada y pendiente de review, y sin basura de sesiones anteriores.
- **C3 — El codigo respeta la arquitectura: [x]** Ver seccion "Arquitectura" abajo. Sin `console.log`, sin
  `TODO` ni `FIXME`, sin secretos, sin numeros crudos (px/rem/arbitrary values) en las cuatro variantes
  nuevas.
- **C4 — La verificacion es real: [x]** Y **no me fio de que sea verde: lo rompi yo.** Ver seccion
  "Mutaciones".
- **C5 — La sesion se cerro bien: [ ] — NO PROCEDE TODAVIA.** Es T1 de 2: la feature sigue abierta y el
  cierre (entrada en `history.md`, vaciado de `current.md`, estado final) es del cierre de #22, no de esta
  tanda. Dos apuntes de higiene abajo, ninguno bloqueante.

---

## Mutaciones: comprobe las seis garantias yo mismo, rompiendo el codigo

El implementer declara seis pruebas por mutacion. **Las repeti todas** (este repo lleva cuatro fichas por
asertos estructuralmente incapaces de fallar en `happy-dom` — deudas 160, 167, 174), y anadi dos propias.
Cada mutacion se revirtio y verifique que no quedo residuo (grep + `git status`).

| # | Mutacion | Resultado | Mata? |
|---|---|---|---|
| M1 | `dismissOnScrimClick={false}` a `{true}` | 1 failed / 13 passed — "el clic en el velo NO cierra ni decide nada" | SI |
| M2 | quitar `initialFocusRef={cancelRef}` | 1 failed / 13 passed — "el foco inicial cae en cancelar" | SI |
| M3 | `peer sr-only` a `peer hidden` | 1 failed / 11 passed — "la utilidad que lo esconde recorta y posiciona, pero no lo apaga" | SI |
| M4 | `outline-(color:--focus)` a `--focuss` | 1 failed / 11 passed — "el anillo usa el color de foco del sistema" | SI |
| M5 | `response.status !== UPLOAD_CREATED_STATUS` a `!response.ok` | 1 failed / 16 passed — "un 200 no se acepta como subida hecha" | SI |
| M6 | `requestWithoutBody` a `request<null>` en el borrado | 1 failed / 16 passed — "borra y trata el 204 sin cuerpo como exito" | SI |
| M7 | `peer sr-only` a `peer hidden`, corriendo **solo** `FileInput.test.tsx` | **11 passed — VERDE con el defecto puesto** | NO |
| M8 | `tabIndex={-1}` en el input real | 1 failed / 10 passed | SI |

**Las seis que el implementer declaro, son ciertas.** Ninguna es un verde falso.

**M7 y M8 son mias y aclaran el matiz que abre la unica ficha nueva.** El test de comportamiento
"el input sigue siendo parada de tabulacion" (`FileInput.test.tsx:127`) lleva encima el comentario
"El invariante que romperia esconder el input con display:none" — y **no puede romperse por eso**:
con `hidden` puesto sale verde igual (M7), porque `happy-dom` no aplica hojas de estilo al orden de foco.
Lo que si detecta es sacar el input del orden de tabulacion por otra via (M8), o sea que **no es inerte,
pero el comentario le atribuye una cobertura que no tiene**. **No hay agujero real**: el invariante de
verdad lo mide el gate de CSS compilado y **ese si muere** (M3). Y el implementer lo declaro el mismo en
`impl_22_t1.md`, seccion "Lo que NO pude verificar", punto 2. Es un comentario desactualizado, no un
engano: ficha blanca, no bloqueante.

---

## El punto de mayor riesgo del lote: `uploadProjectImage` (E6 h / deuda 60)

Contrastado **contra el Route Handler real**, no contra el informe:

| Exigencia | Donde se verifica | Veredicto |
|---|---|---|
| Exito = **201**, no `response.ok` | compara contra `UPLOAD_CREATED_STATUS = 201`; hay un caso que manda **200 con URL valida** y exige rechazo | OK, y **M5 lo mata** |
| Campo **`file`** | `body.append(UPLOAD_FILE_FIELD, file)` con `UPLOAD_FILE_FIELD = "file"`; el endpoint lee `form?.get("file")` (`app/api/uploads/image/route.ts:36`) | OK |
| `multipart/form-data` de verdad | `FormData` **sin fijar content-type** (el navegador tiene que poner la frontera); test: `expect(init?.headers).toBeUndefined()` | OK |
| Repliegue **400** (mime o mas de 4 MB) | `UPLOAD_IMAGE_REJECTED_MESSAGE`, y **nombra los formatos y los MB derivados de `@/features/uploads/validation`**, no reescritos | OK |
| Repliegue **401** | `UPLOAD_UNAUTHORIZED_MESSAGE` | OK |
| Repliegue **502** (Cloudinary caido) | `UPLOAD_PROVIDER_DOWN_MESSAGE`; el handler responde 502 en `ImageUploadFailedError` (`route.ts:47-51`) | OK |

Los tres repliegues solo entran **cuando el cuerpo no se puede leer**; si el servidor manda su `{ error }`,
gana el suyo, que es mas preciso. Correcto: es la unica forma de que el usuario sepa si fallo el **formato**
o el **peso**. `readErrorMessage` gana un parametro con valor por defecto, asi que los cinco llamadores
previos no cambian de comportamiento.

**`deleteProject`** va por `requestWithoutBody` (`projects-client.ts:278`), el test manda una `Response`
de **204 real sin cuerpo**, y **M6 confirma que el helper equivocado se detecta**. No rompe en el navegador.

---

## Contrato E6, punto por punto

- **E6 (b) — `ProjectsToolbar` NO se migro: CUMPLIDO.** Verificado en `git status`: el archivo **ni
  aparece** entre los modificados. Sin desviacion de contrato.
- **E6 (b) — composicion con `Field`: OK.** `Select` y `Textarea` son `forwardRef` con las props nativas
  completas, asi que el `cloneElement` de `Field.tsx:59-63` les cablea `id`, `aria-invalid` y
  `aria-describedby` **exactamente igual que a `Input`**. Ambos tienen test que lo mide de punta a punta
  (`getByLabelText`, luego `aria-invalid="true"`, luego el `id` del mensaje coincide con
  `aria-describedby`), mas `axe` en estado valido y en error.
- **E6 (c) — frontera del `FileInput`: OK.** Lei `FileInput.tsx` entero: **cero** menciones a
  `/api/uploads/image`, a Cloudinary, a `FormData` o a `fetch`. Ademas hay un gate propio
  (`file-input.boundary.test.ts`) que lo mide sobre el fuente **con su propio seguro** contra el archivo
  vacio (`SOURCE.length > 500`), que es justo lo que convierte "cero infracciones" en una medicion y no en
  un verde por omision.
- **E6 (c) — el input sigue enfocable: OK.** Esta oculto con `sr-only`, **no** con `display:none`, y el gate
  de CSS compilado lo afirma sobre la regla emitida por Tailwind (`position: absolute`, y `not.toContain`
  para `display: none` y `visibility: hidden`). **M3 lo mata.** El anillo de foco se dibuja en el hermano
  visible (`peer-focus-visible:`) y el gate comprueba que el selector lleva el combinador de hermano y que
  el color sale de `var(--focus)`. **M4 lo mata.**
- **E6 (d) — `dismissOnScrimClick` apagado: OK, y mejor que lo pedido.** No solo esta en `false`
  (`ConfirmDialog.tsx:84`): **no se expone como prop**, asi que no se puede volver a encender desde fuera.
  El test lo mide en las **tres** direcciones (ni cierra, ni confirma, ni cancela). Y `Escape` **sigue
  cerrando** por `onCancel`, con test: apagar el velo no se lleva por delante la salida por teclado.
- **E6 (f) — nada de archivos de cliente nuevos: OK.** El CRUD entero vive en `projects-client.ts`. El unico
  archivo nuevo en `features/projects/ui/` es `projects-client.test.ts`, que es su test. **No hay cuarto
  clon del cliente HTTP.**
- **E6 (h):** ver la tabla de la subida, arriba.

---

## Arquitectura y convenciones

- **UI sin DB: OK.** Los cuatro primitivos son design system puro. El cliente solo habla `fetch`.
- **Sin arrastrar Drizzle al navegador: OK, y hecho con cuidado.** Los tipos de entrada se importan
  **como tipos** y **por ruta interna** (`@/features/projects/validation`, `@/features/uploads/validation`),
  nunca por el barrel del feature, que es el que arrastra `./api` y con el Drizzle. Verifique los dos
  modulos destino: `projects/validation.ts` importa `zod` mas `@/shared/config`, y `uploads/validation.ts`
  solo `zod`. Cero riesgo de ciclo y cero bytes en el bundle.
- **Derivar en vez de clonar: OK.** `selectClasses` y `textareaClasses` salen de `inputClasses`; el
  disparador del `FileInput` y los botones del `ConfirmDialog` salen de `buttonVariants`. Nada de listas
  de clases copiadas que se desincronizan.
- **Tamano de la API publica: OK y bien argumentado.** Nueve nombres nuevos anclados en `public-api.test.ts`
  con `toEqual` sobre la lista ordenada (falla en las dos direcciones), mas un test de que los cuatro
  controles llegan por el barrel raiz. `selectClasses` y `textareaClasses` **no** se publican, para no
  invitar al select escrito a mano que estos primitivos vienen a sustituir.
- **Un solo gate de CSS compilado en vez de cuatro:** es la unica desviacion del patron
  `<componente>.tokens.test.ts` de los vecinos. **Aceptada**: esta declarada en el encabezado del archivo,
  el motivo es de coste real (cada archivo de test recompila el CSS entero) y **la cobertura no se
  resiente** — mide las cuatro piezas, y las dos mutaciones que le lance lo ponen rojo.

---

## Eje visible (bloque UI del contrato de revision)

- **Hay jerarquia visual, o todo pesa lo mismo?** Hay jerarquia, y **decidida antes que las clases**, no a
  posteriori. En `FileInput`, elegir la foto es **secundario** (el primario es guardar), asi que el
  disparador toma la piel `secondary` y no la del acento, que competiria con el submit; y el nombre del
  archivo va en la voz monoespaciada pequena porque es **estado**, no titulo. En `ConfirmDialog`, la fila
  de salidas se alinea al final del eje en linea y envuelve en pantalla angosta en vez de encoger por
  debajo del objetivo tactil.
- **Dos controles con comportamiento distinto renderizados igual? NO — y hay test que lo prohibe.**
  Es la leccion de la **deuda 142** y esta atendida explicitamente: confirmar destruye y cancelar no, asi
  que confirmar lleva la piel `danger` y cancelar la `secondary`, y el test exige que cancelar **no comparta
  ni una** de las clases exclusivas de confirmar. Las clases se derivan de `buttonVariants`, no se copian.
  Ademas el tono por defecto es `danger` **a proposito**: un olvido pinta de rojo algo inocuo (error visible
  y barato) en vez de dejar salir el caso destructivo silencioso y bonito. Razonamiento correcto.
- **Alguna decision visual justificada por el coste del arnes? NINGUNA — y verifique lo contrario.**
  El implementer **creo las cuatro piezas en `shared/ui/primitives/` y pago el ancla de
  `public-api.test.ts`**, dejando escrito en el propio test que esconder la pieza en `features/` para no
  tocar esa lista es justo el antipatron que la regla "el template es un SUELO" prohibe. Es lo contrario
  del apano. La unica desviacion (un gate en vez de cuatro) es organizativa, no visual, esta declarada y no
  reduce cobertura.
- **Toda accion con efecto tiene feedback VISIBLE?** Si, en lo que T1 entrega: el nombre del archivo
  elegido es **texto visible** en la caja del control (con `aria-live="polite"` **encima**, no en su lugar),
  y el estado vacio tambien se ve. **No hay ningun `sr-only` haciendo de unico aviso**: no se repite la
  deuda **137**.
- **EL ASPECTO QUEDA SIN VERIFICAR, y lo escribo en vez de aprobarlo por omision** (deuda **141**:
  ningun gate de este repo mide el eje visible). **No he visto ninguna de las cuatro piezas en un
  navegador.** Lo que **atenua** el riesgo, y por eso no bloquea: **T1 no cableo nada**, asi que hoy no
  existe ninguna pantalla que muestre estos controles y no hay nada que mirar. Lo que si esta medido es que
  cada utilidad que nombran **genera CSS de verdad** y que declara. **La REGLA 4 (juicio visual en
  navegador) es exigible en T2, cuando el modal exista, y ahi hay que mirar en concreto: el anillo de foco
  del disparador de archivo (la pieza mas fragil de este lote, porque el foco cae en un elemento
  invisible), la flecha nativa del `Select` y el contraste del boton `danger`.**

---

## Deuda nueva que ficho

**176. (blanca) Un comentario de test promete una cobertura que ese test no puede dar (`FileInput`).**
Fichada por el reviewer. `FileInput.test.tsx:126` rotula el caso "el input sigue siendo parada de
tabulacion" como "El invariante que romperia esconder el input con display:none". **Medido: es falso.**
Con `fileInputControlVariants` mutado de `peer sr-only` a `peer hidden`, ese archivo sale **11 passed,
verde entero** (M7), porque `happy-dom` no aplica hojas de estilo al orden de foco. **No hay defecto y no
hay agujero de cobertura**: el invariante real lo mide `form-primitives.tokens.test.ts` sobre el CSS
compilado y **ese si se pone rojo** con la misma mutacion (M3); el test de comportamiento si detecta perder
la parada de tabulacion por otra via, p. ej. `tabIndex={-1}` (M8). **El defecto es el comentario**, y
emparenta con las deudas **160, 167 y 174**: un rotulo que atribuye a un aserto una garantia que no tiene es
como el proximo lector deja de mirar donde hay que mirar. **Arreglo: una linea** — que el comentario diga
que mide de verdad y apunte al gate de CSS para el caso `display:none`. El implementer ya declaro la
limitacion en `impl_22_t1.md`; lo que falta es que el comentario diga lo mismo que el informe.

## Apuntes de higiene (no bloqueantes, para el cierre de #22)

1. **`feature_list.json` perdio el salto de linea final** ("No newline at end of file" en el diff). Es
   ruido de diff en un archivo que se toca en cada feature; conviene devolverselo al cerrar.
2. **`.atl/` y `.windsurf/` estan sin trackear y sin ignorar.** **No son de este lote** (ya estaban al
   arrancar la sesion) y no son artefactos de build, pero cuentan para C5 y el cierre de #22 los va a
   encontrar. O se ignoran, o se decide que son.
3. `progress/history.md` todavia no tiene entrada de esta sesion: correcto, la feature sigue abierta.

---

## Cambios requeridos

**Ninguno bloqueante.** La tanda 1 entra tal cual.

Lo unico pendiente es de una linea y **no justifica devolver el lote**: corregir el comentario de
`FileInput.test.tsx:126` (deuda 176). Puede ir en T2, en el mismo archivo que ya se va a tocar.

---

## Nota de metodo (para el leader)

Las ocho mutaciones se aplicaron sobre el arbol de trabajo y **se revirtieron una por una**, verificando
despues con grep y `git status` que no quedo residuo. El arbol esta exactamente como lo dejo el
implementer: ningun archivo de aplicacion fue editado por el reviewer.

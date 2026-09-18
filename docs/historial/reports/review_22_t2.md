# Review — feature #22 `projects_form_ui`, TANDA 2 (cableado) — CIERRE DE LA FEATURE

**Veredicto: APROBADO**

**`bash ./init.sh` → EXIT 0** · `lint verde` · `typecheck verde` ·
`Test Files 98 passed | 3 skipped (101)` · **`Tests 1792 passed | 13 skipped (1805)`** · 203,13 s.
**Coincide exactamente** con lo que declara `impl_22_t2.md` (sección "Verificación"), incluida la
explicación del desvío 1803 → 1805 (los dos tests que la pieza 6 añade al gate de clases).

**Alcance revisado:** T2 entera (piezas 1-7), **más las costuras** entre la sesión que se cortó y la que la
continuó. T1 no se revisa otra vez (`review_22_t1.md`, aprobada).

**El árbol quedó como lo dejó el implementer.** Las siete mutaciones y las dos sondas se aplicaron sobre el
árbol de trabajo y se revirtieron una a una; verificado con `md5sum -c` contra copias tomadas antes de
empezar y con `git status`. **Ningún archivo de aplicación fue editado por el reviewer.**

---

## Checkpoints

- **C1 — El arnés está completo: [x]** Los siete archivos base existen (lo verifica el propio `init.sh`,
  pasos 2 y 3) y `bash ./init.sh` termina en **0**.
- **C2 — El estado es coherente: [x]** Una sola feature `in_progress` (#22). Toda pieza nueva trae test.
  `progress/current.md` describe la sesión activa (T2 entregada, T1 aprobada) y no arrastra basura.
- **C3 — El código respeta la arquitectura: [x]** Ver "Arquitectura" abajo. **El backend está intacto**:
  `git status` no lista ni un `src/app/api/**`, ni un `features/*/api`, ni `schema.ts`, ni
  `validation.ts`. Sin `console.log`, sin `TODO`/`FIXME`, sin secretos, sin Drizzle en `ui/`, sin barrel
  de feature en cliente.
- **C4 — La verificación es real: [x]** Y no me fío de que sea verde: **lo rompí yo, siete veces** (tabla
  abajo). Las garantías que declara el informe **son ciertas**. Con dos matices, que son fichas.
- **C5 — La sesión se cerró bien: [ ] — NO PROCEDE TODAVÍA.** Es del cierre del leader, no de esta tanda:
  falta la entrada en `progress/history.md`, pasar #22 a `done`, y decidir qué son `.atl/` y `.windsurf/`
  (sin trackear y sin ignorar, ya venían de antes). `feature_list.json` **sigue sin salto de línea final**
  ("No newline at end of file"), apuntado ya en el review de T1 y todavía sin devolver.

---

## Mutaciones: rompí el código yo mismo (7, todas revertidas)

| # | Mutación | Resultado | ¿Mata? |
|---|---|---|---|
| M1 | La cabecera enseña la pareja de crear **siempre** (`emptyBasketShown` → `false`) | **5 failed / 49 passed** en `ProjectsView.test.tsx` | SÍ |
| M2 | Tras borrar, `reload()` en vez de quitar la tarjeta del estado local | **1 failed** — "confirmar borra… sin recargar la lista" | SÍ |
| M3 | Con la biblioteca caída, `patternId` viaja como `null` en el parche | **1 failed** — "una biblioteca que falló se dice, y editar no pierde el patrón" | SÍ |
| M4 | `projectPatch` devuelve el formulario entero | **9 failed** en dos archivos (5 en `project-form.test.ts`, 4 en el del modal) | SÍ |
| M5 | Un fallo de subida no escribe el mensaje (sólo pide el foco) | **3 failed** — exactamente **400**, **401** y **502** | SÍ |
| M6 | `deleteProject` por `request<null>` en vez de `requestWithoutBody` | **1 failed** — y **a nivel de página**, no sólo en el test del cliente | SÍ |
| M7 | Clase inerte en `ProjectFormDialog.tsx` | **1 failed** en el gate de clases, **y el mensaje nombra el archivo** | SÍ |

**Conclusión de M1-M7:** las garantías que el informe declara para las piezas 5-7 son ciertas, y las tres
que el encargo señalaba como críticas —**"nunca las dos" parejas**, **el borrado coherente sin recargar** y
**editar con la biblioteca caída no pierde el patrón**— **están medidas de verdad**.

### El verde-falso que el implementer cazó: verificado, y el arreglo es correcto

`listUrls()` filtraba **sólo por URL**, y el alta es un `POST` a la cadena exacta de la lista: la propia
alta se contaba como "volvió a pedir la lista". El arreglo (filtrar también por método `GET`) es el
correcto y **M2 lo confirma indirectamente**: con el helper arreglado, quitar la recarga se detecta.
**Busqué hermanos de ese defecto en los tests nuevos y en los ajenos que se tocaron:**

- `saveCalls()` (modal) **sí** filtra por método (`POST`/`PATCH`). Correcto.
- `deleteCalls()` y `detailCalls(method)` (`ProjectsView.test.tsx`) **sí** filtran por método. Correcto;
  `detailCalls` compara además la URL con igualdad exacta, no con prefijo.
- `calls(prefix)` (modal) usa prefijo, pero los tres en juego —`/api/projects`, `/api/patterns`,
  `/api/uploads/image`— **no se solapan**. Sin defecto.

**Los dos asertos "ajustados" de la pieza 5 los comprobé uno por uno:** `listHeading()` acota a la región
de la lista y el cajón vive en un portal colgado de `body`, así que efectivamente queda fuera. El aserto
**mide más** que antes (afirma que la **tarjeta** sigue), no menos. Correcto y bien argumentado.

---

## Dos sondas que SOBREVIVIERON: agujeros de medición (no defectos de hoy)

Las declaro porque son exactamente la familia **160 / 167 / 174 / 176**: un rótulo que promete una
cobertura que el aserto no tiene.

**H1 — El SITIO de la pareja de botones no está medido.** Mutación combinada: la cabecera enseña los
botones **siempre** *y* el panel de cesto vacío se queda **sin ninguna acción**. Resultado:
`ProjectsView.test.tsx` **54/54 VERDE**. Los tres tests que hablan de sitio —"cada botón **del cesto
vacío**", "con el cesto lleno la entrada sigue estando, **en la cabecera**" y "hay exactamente una pareja
**en cada estado**"— consultan la pantalla entera sin acotar, así que miden **cuántos hay**, no **dónde
están**. El invariante "nunca las dos" **sí** está medido (M1, 5 failed); lo que no lo está es que el panel
vacío conserve su llamada a la acción. Arreglo: acotar con `within(...)`. **Ficha 177.**

**H2 — El aviso "Subiendo la foto…" sobrevive a hacerse invisible.** El test dice medir que el estado "**se
ve** además de anunciarse", y lo hace comprobando que la lista de clases de la región no contiene la
utilidad de sólo-lector. Como la clase real es la **variante de vacío** de esa utilidad, el aserto sólo caza
la versión pelada. Sustituyendo la lista de clases por una que empieza por la utilidad que apaga el
elemento —o sea, con el texto dentro pero sin pintar— el archivo sale **31/31 VERDE**, y el gate de clases
también pasa, porque esa utilidad es legítima. **El código de hoy es correcto**; lo débil es la medición, y
es el eje exacto de la **deuda 137**. **Ficha 178.**

---

## Los cinco puntos que el encargo pedía mirar con lupa

1. **La entrada a "crear": "nunca las dos".** Cumplido, y la condición es **exacta**, no aproximada:
   `emptyBasketShown` sale de las mismas tres condiciones con las que se elige el panel de cesto vacío (la
   cuarta, "la lista ya llegó", la implica que la lista esté vacía). Se calcula **una sola vez** y la usan
   los dos sitios, así que no pueden discrepar. Medido por **M1**. **Salvedad H1.**
2. **El borrado.** `DELETE` por `requestWithoutBody` → **204 sin cuerpo**; **M6 lo mata desde la página**,
   no sólo desde el test del cliente. La lista queda coherente **sin recargar**: `confirmDelete` filtra el
   estado local y la cuenta de peticiones de lista no crece (**M2 lo mata**). **No hay recarga escondida**:
   el único `reload()` del camino de guardado es el del **alta**, y está argumentado. Si falla, no se toca
   nada y el motivo se lee **dentro** de la confirmación, en un `role="alert"` **visible** (`ActionError`,
   color de peligro sobre superficie elevada = **4,86:1**, pasa AA).
3. **Los tres fallos de la subida.** **400 con el motivo del servidor**, **401** y **502** llegan al
   `Field`, que los pinta en un elemento **visible** con `aria-describedby` cableado — **no** en un
   sólo-lector. **M5 mata los tres a la vez.** El **>4 MB** se rechaza **sin salir a la red**, con el
   mensaje literal del servidor (`uploadImageInputSchema`, el mismo esquema del endpoint), y hay test que
   exige cero llamadas. **No queda ningún fallo mudo en este camino.**
4. **`projectPatch` manda sólo lo que cambió**, el nulo viaja, y el parche vacío **no sale a la red**
   (**M4: 9 failed**). Y lo importante: **con la biblioteca caída el campo no se ofrece y `patternId` se
   queda como estaba** (`ProjectFormDialog.tsx:290-293`); **M3 lo mata**. Editar un proyecto con patrón
   **no le pierde el patrón**, y está medido.
5. **Validación de cliente y foco.** `createProjectSchema`, `updateProjectSchema` y
   `uploadImageInputSchema` importados **por ruta interna**, nunca por el barrel; comprobado que no hay ni
   un import del barrel del feature en toda la carpeta `ui/`. Foco al campo inválido en **orden de
   pantalla** (deuda 38), y el foco tras un error de subida se pide **para después del render**: el
   hallazgo del control desactivado es real y está bien resuelto (referencia + contador, que además es lo
   que saca a `lint` del rojo sin perder comportamiento).

**Ciclo de vida de los diálogos (el molde de #21): cumplido.** El hijo no tiene estado `open` y devuelve
`null` sin objetivo; el padre guarda **el id** (`FormRequest`, `deleteId`) y resuelve contra la lista en
cada render; el estado pendiente **se deriva**; `toFormTarget` devuelve `null` si el proyecto ya no está.
El formulario se **remonta** por `key`, que es lo correcto en vez de sincronizar props con un efecto.

---

## Las costuras entre las dos sesiones

Es donde una continuación suele dejar incoherencias. Lo que encontré:

- **Los 11 tests en rojo se usaron como especificación y no se reescribieron.** Verificado en el diff: los
  únicos cambios en `ProjectsView.test.tsx` de la sesión de continuación son el helper `listUrls()`, el
  helper `listHeading()` y los dos asertos desambiguados. **Ninguno relaja lo que se exige.**
- **`lint` y `typecheck` estaban en rojo y ahora están verdes**, y los tres arreglos son de fondo, no
  silenciados: no hay ni un `eslint-disable` ni un `@ts-expect-error` nuevo en los archivos tocados.
- **La pieza 4 (cajón) es de la primera sesión y encaja con la 5 de la segunda:** `onEdit`/`onDelete` se
  pintan **sólo si llegan** (E3 d sigue vivo en su forma exacta) y hay test de las dos direcciones, más dos
  tests de `refreshToken` (cambia → repide; no cambia → no repide).
- **Sin residuos de la sesión cortada:** ningún archivo huérfano, ningún import muerto, y `DASHBOARD_ROUTE`
  + `CREATE_LINK_CLASSES` se **borraron** al dejar de usarse en vez de quedarse colgando.

---

## Contrato E6, punto por punto

- **(a) Patrón embebido fuera: CUMPLIDO.** El desplegable **sólo elige**; no hay ni un `POST /api/patterns`
  en toda la feature.
- **(b) `ProjectsToolbar` sin migrar: CUMPLIDO.** El archivo **ni aparece** en `git status`.
- **(c) `FileInput` sigue tonto: CUMPLIDO.** La subida vive en la feature (`handleFile` +
  `uploadProjectImage`); el primitivo no menciona endpoint, Cloudinary ni `FormData`, y su gate de frontera
  sigue verde.
- **(d) `dismissOnScrimClick` apagado en el borrado: CUMPLIDO** (y ni siquiera se expone como prop).
- **(e) Agujas en la feature: CUMPLIDO.** `NeedlesField.tsx` vive en `features/projects/ui/`.
- **(f) Ningún archivo de cliente nuevo: CUMPLIDO.** Todo el CRUD sigue dentro de `projects-client.ts`;
  `project-form.ts` es copia y helpers puros, no un cliente.
- **(h) Contrato de subida: CUMPLIDO** (201 / `multipart` / campo `file`, sin cabecera propia). Revisado en
  T1 y confirmado acá desde el **consumidor real**.
- **El backend intacto: CUMPLIDO**, comprobado sobre `git status`, no sobre el informe.

---

## Arquitectura y convenciones

- **UI sin DB, lógica fuera del componente:** el modal no toca Drizzle ni conoce el ORM; los helpers puros
  viven aparte y se prueban sin montar nada. Los tipos de entrada entran como `import type`.
- **Token-first y sintaxis canónica:** el gate de clases de `/proyectos` cubre ahora las dos piezas nuevas,
  y **M7 confirma que las mide de verdad**, sobre **CSS compilado**.
- **La advertencia de las variantes min-width no aplica, y lo comprobé yo:** barrido de variantes de
  breakpoint sobre `ProjectFormDialog.tsx` y `NeedlesField.tsx` → **cero coincidencias**. No hay ninguna
  regla escrita "para que aplique sólo hacia abajo" que pudiera dejar el gate verde sobre nada.
- **Deuda 176 cerrada de verdad:** el comentario de `FileInput.test.tsx` ahora dice **lo que mide** y
  remite al gate de CSS compilado para el invariante real. Leído; correcto.
- **Nombres, comillas, español en la UI, comentarios sólo para el porqué:** conformes.

---

## Eje visible

**NO VERIFICADO. Lo escribo en vez de aprobarlo por omisión** (deuda **141**: ningún gate de este repo mide
el eje visible). **No tengo herramientas de navegador en esta sesión**: ni captura, ni medición de layout,
ni geometría. Lo que sigue es lo que se puede afirmar desde el fuente, y lo que **hay que mirar en pantalla
antes de dar #22 por cerrada**.

**Lo que sí puedo afirmar leyendo:**

- **Jerarquía decidida antes que las clases, no después.** En el modal: guardar es primario con acento,
  cancelar secundario, el par de agujas y "quitar la foto" secundarios, el chip de aguja sin relleno
  sólido, y el nombre del archivo en voz monoespaciada porque es **estado**. En el cajón la jerarquía es
  **deliberadamente asimétrica**: editar con acento sólido, borrar en piel fantasma con color de peligro y
  empujado al extremo opuesto de la fila; el rojo sólido se reserva para la confirmación. Bien razonado.
- **Controles distintos que se vean distintos (deuda 142):** en las piezas nuevas no encuentro dos
  controles de comportamiento distinto con la misma primitiva y el mismo peso. Los dos botones de crear
  **sí** son iguales entre sí, y **eso es correcto**: son la misma acción con distinta clase de tejido.
- **Ninguna decisión visual justificada por el coste del arnés.** Repasé el informe entero buscando la
  frase: no está. Al revés — T1 pagó el ancla de la API pública creando los cuatro primitivos, y T2 metió
  las dos piezas nuevas **dentro** del gate de clases en vez de esquivarlo.
- **Feedback visible en todo lo que tiene efecto:** el mensaje de subida se ve (no vive sólo en un
  sólo-lector); los errores de campo se ven; el error del alta y el del borrado se ven en `role="alert"`.
  **No se repite la deuda 137** — con la salvedad **H2**, que es del test, no del código.
- **El panel del `Dialog` lleva alto máximo y desbordamiento con scroll** (`dialog.variants.ts:84`), así
  que el formulario más alto de la app **scrollea** y el botón de guardar no queda inalcanzable.
- **Aritmética de contraste (no es una medición de pantalla):** color de peligro `#c6432f` sobre superficie
  elevada `#fffdf6` = **4,86:1**. (El 4,69 del informe está calculado contra el primer plano del acento, o
  sea el botón sólido; el texto fantasma del cajón y el `ActionError` van contra la superficie elevada.)
  Pasa AA para texto normal, **con poco margen**.

**Qué hay que mirar en el navegador, en concreto. Los tres de T1 siguen abiertos y añado cinco:**

1. **El anillo de foco del disparador de archivo** (T1, abierto). El foco cae en un elemento invisible y el
   anillo lo dibuja el hermano visible: hay que ver **si se ve y dónde cae**.
2. **La flecha nativa del `Select`** (T1, abierto). No lleva la utilidad que quita la apariencia nativa,
   así que la pinta el navegador: sólo un navegador dice si **contrasta** contra la superficie del control.
3. **El contraste real del botón de peligro** (T1, abierto), incluidos **borde, sombra dura y `hover`**,
   que la aritmética no cubre.
4. **NUEVO — La cabecera de `/proyectos` con el cesto lleno.** Dos botones primarios junto al `h1` y, justo
   debajo, la fila de cuatro controles de 44 px de `ProjectsToolbar` que dejó fichada la **deuda 142**:
   ahora hay **seis** superficies pulsables apiladas en el tercio superior. Hay que mirar si el título
   sigue mandando o si la pantalla se convierte en una botonera.
5. **NUEVO — El modal entero, que es la pantalla más alta de la app.** Sale con el tamaño mediano del
   `Dialog` (≈448 px de ancho) para **siete campos + vista previa de foto + chips de agujas**. Hay que ver
   si ese ancho es el correcto o si pide el grande, y dónde queda el par cancelar/guardar al hacer scroll.
6. **NUEVO — El chip de aguja.** Lleva relleno sólo a la izquierda porque el botón de quitar es de tamaño
   icono: hay que comprobar que el conjunto llega a **44×44** y que no queda descentrado.
7. **NUEVO — La vista previa de la foto vacía.** `ProjectPhoto` se pinta **siempre**, también en el alta:
   hay que ver si el marcador de posición ayuda o si mete un ladrillo inútil en lo alto del formulario.
8. **NUEVO — Dónde queda el foco después de borrar** (ver ficha 179).

---

## Deudas nuevas que ficho

**177. ⚪ El SITIO de la pareja de botones de crear no está medido, sólo la cantidad.** Con la cabecera
enseñando los botones siempre **y** el panel de cesto vacío sin ninguna acción, `ProjectsView.test.tsx`
sale **54/54 verde**. Los tres tests que hablan de sitio consultan la pantalla entera sin acotar. **No hay
defecto hoy** —el código es correcto y M1 lo demuestra—, pero el rótulo promete una garantía que el aserto
no da, y es justo el invariante que se rompe al primer cambio de layout. Arreglo: acotar con `within()` al
panel vacío y a la cabecera. Familia: **160, 167, 174, 176**.

**178. ⚪ El aviso de "subiendo la foto" sobrevive a hacerse invisible.** El test que dice medir que el
estado "se ve además de anunciarse" comprueba que la lista de clases no contiene la utilidad de
sólo-lector; como la clase real es la **variante de vacío** de esa utilidad, sólo caza la versión pelada.
Con la región apagada del todo, el archivo sale **31/31 verde** y el gate de clases también pasa. **El
código de hoy es correcto**; lo débil es la medición, en el eje exacto de la **deuda 137**.

**179. 🟠 El foco se pierde después de borrar un proyecto.** `Dialog` devuelve el foco al disparador en la
limpieza del efecto, pero sólo si ese disparador **sigue conectado** (`Dialog.tsx:181-185`). Al confirmar
el borrado se desmontan **a la vez** la confirmación y el cajón, y el disparador de las dos —el botón
"Borrar" del cajón, y antes la tarjeta del proyecto— **ya no está en el DOM**: el foco cae al `body` y
quien navega por teclado vuelve a empezar desde arriba. **Ningún test lo mide.** No se ve con ratón; **sí**
se sufre con teclado. Arreglo probable: llevar el foco a la cabecera de la lista tras un borrado con éxito.

**180. ⚪ Dos caminos de error mudos en el formulario.** `reportIssues` puede marcar `needles` y
`patternId` como inválidos, pero **ninguno de los dos se pinta**: no hay `error=` para esos dos campos en
`ProjectFormDialog.tsx`. Y el mapa de foco manda `needles` a la referencia del **selector de archivo**
(`ProjectFormDialog.tsx:234`). Hoy es inalcanzable —el catálogo tiene 17 medidas y el tope son 20, y el
`patternId` siempre sale de la biblioteca—, así que no es un defecto observable; pero es un fallo
silencioso esperando a que el catálogo crezca.

**181. ⚪ La edición no recarga la lista** (la que propone el propio implementer). Un proyecto al que se le
cambia el tipo con el filtro de tipo puesto sigue en la rejilla hasta la próxima carga. **Es deliberado y
está bien argumentado** —recargar cerraría el cajón que sigue abierto detrás del modal—, pero es una
incoherencia observable y merece ficha.

---

## Cambios requeridos

**Ninguno bloqueante. La tanda 2 entra tal cual.** Lo que sigue es del **cierre** de #22, no del código:

1. **Fichar en `progress/deudas.md` las dos deudas que la propia E6 dice que abre** y que hoy **no están
   escritas ahí** (comprobado): el **patrón embebido** fuera de alcance (E6 a) y la **migración de los
   selects escritos a mano de `ProjectsToolbar`** (E6 b, *"se ficha, para no mezclar una refactorización
   con una feature"*). La enmienda promete la ficha; sin ella, el apaño queda sin rastro. Es la regla del
   suelo/techo aplicada al pie de la letra.
2. **Escribir en el RFC la decisión de la entrada a "crear".** E6 dice literalmente que *"`/proyectos` no
   cambia de estructura"*, y T2 **le añade una pareja de botones a la cabecera** — con buen motivo (antes
   de esto, quien ya tenía proyectos no podía crear otro desde esa página), pero eso es exactamente lo que
   el proceso manda subir al RFC como enmienda o como párrafo de E6, no dejar sólo en el informe y en
   `current.md`.
3. **Fichar las cinco deudas de arriba (177-181)** y cerrar C5: entrada en `progress/history.md`, #22 a
   `done`, el salto de línea final de `feature_list.json`, y decidir qué son `.atl/` y `.windsurf/`.
4. **REGLA 4: mirar la pantalla** antes de cerrar, con la lista de ocho puntos de "Eje visible". **Tres de
   ellos llevan abiertos desde T1**, y esta tanda es la primera en la que existe algo que mirar.

---

## Nota de método

Siete mutaciones y dos sondas, cada una aplicada y revertida por separado. Antes de empezar copié los cinco
archivos de aplicación en juego y guardé sus sumas; al terminar, la comprobación devuelve **OK en los
cinco** y `git status` es idéntico al de partida. **El árbol está exactamente como lo dejó el
implementer.**

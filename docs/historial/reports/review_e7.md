# Review — lote E7 (alta única + cronómetro en la tarjeta)

**Veredicto: RECHAZADO** — un solo bloqueante, barato, y el código de producción **es correcto**.
Lo que falla es que una garantía **declarada en el informe** no tiene test y **sobrevive a la mutación**.
Todo lo demás del lote está verificado, y la mayor parte **por mutación**, no por lectura.

## 0. `bash ./init.sh` — EXIT real

```
[OK]    lint verde
[OK]    typecheck verde
 Test Files  98 passed | 3 skipped (101)
      Tests  1837 passed | 13 skipped (1850)
[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**EXIT 0.** Coincide **exactamente** con lo que declara `progress/reports/impl_e7_alta_y_cronometro.md`
(**1837 passed | 13 skipped**). No hizo falta borrar `.next`: lint y typecheck salieron verdes a la
primera, así que el fantasma de Turbopack no apareció en esta pasada.

## 1. Checkpoints

- **C1:** [x] arnés completo, `init.sh` EXIT 0.
- **C2:** [x] una sola feature `in_progress` (**#22**); `current.md` describe la sesión viva.
  *(Nit, no bloqueante: `feature_list.json` perdió el salto de línea final — el diff marca
  "No newline at end of file".)*
- **C3:** [x] capas respetadas. Detalle en §3.8.
- **C4:** [x] lint + typecheck + tests verdes; cada pieza nueva tiene test. **Salvo la del bloqueante.**
- **C5:** [ ] `progress/history.md` **todavía no tiene la entrada de esta sesión** — la escribe el leader
  al cerrar, así que no es imputable al implementer, pero el cierre no está hecho.
  *(Aparte: `.atl/` y `.windsurf/` están sin trackear y **sin ignorar**. No son de este lote, pero
  conviene decidir si van al `.gitignore`.)*

---

## 2. BLOQUEANTE

### B1 — "handleSaved conserva activeSession": declarado, correcto… y **sin una sola red debajo**

El informe lo lista como **decisión no obvia nº 8** y le dedica un comentario de cinco líneas en
`ProjectsView.tsx:447-450`. **No tiene test.** Medido por mutación:

```
ProjectsView.tsx:459
-  ? { ...saved, activeSession: entry.activeSession }
+  ? { ...saved, activeSession: null }
```

`pnpm vitest run src/features/projects/ui/ProjectsView.test.tsx` → **66 passed (66). VERDE.**

Es el **séptimo verde falso** de este repo (van 160, 167, 174, 176 y las dos del review de T2), y esta vez
protege **justo el defecto que el lote vino a matar**. Camino de usuario, entero:

> Bufanda con el cronómetro corriendo → tap en la tarjeta → cajón → **Editar** → cambia el nombre →
> **Guardar cambios**. El `PATCH /:id` responde el proyecto **sin activeSession** (bien: ese dato lo cuelga
> sólo la lista, E7 b3). Sin la conservación, la tarjeta **apaga el reloj y el botón vuelve a decir
> «Empezar a tejer»** con la sesión abierta en el servidor.

Eso es **la ficha 186 literal, por una tercera puerta** — ni la tarjeta (b1) ni el cajón (pieza 6), sino el
modal de edición. El implementer lo vio y lo resolvió bien; lo que falta es que **algo lo sostenga mañana**.

**Cambio requerido (uno, y el andamio ya existe):** un test en `ProjectsView.test.tsx` que abra el cajón de
un proyecto **con activeSession**, edite y guarde, y compruebe que la tarjeta **sigue** ofreciendo
`quickStopLabel(...)` y **sigue** pintando el reloj. El bloque *"crear, editar y borrar (#22)"* ya tiene
"editar desde el cajón manda el parche y refresca el detalle" y el bloque de E7 ya tiene `openSession(...)`:
es cruzar los dos. **Y comprobarlo por mutación antes de darlo por hecho** — que es de lo que va esta ficha.

---

## 3. Lo que SÍ está verificado (y cómo)

Todo lo de abajo se comprobó **rompiéndolo a propósito** y restaurando el archivo después
(checksums confirmados; árbol intacto, cero residuos de mutación).

| # | Garantía declarada | Mutación aplicada | Resultado |
|---|---|---|---|
| M1 | El nombre accesible **cambia con el estado** (b1) | etiqueta congelada en la de "empezar" | **3 rojos** OK |
| M2 | El reloj **NO** es región viva (E4 a) | región viva añadida al reloj | **1 rojo** OK |
| M3 | **Un** botón que se transforma, nunca dos (b1 / deuda 142) | segundo botón de parar al lado | **4 rojos** OK |
| M4 | La sesión abierta viaja con la lista (b3) | sesión activa forzada a nula | **5 rojos** OK |
| M5 | El puente del cajón (pieza 6) | quitados los dos avisos hacia arriba | **5 rojos** OK |
| M6 | **Foco al campo inválido** (deuda 38) tras borrar el modal viejo | quitada la petición de foco | **2 rojos** OK |
| M7 | El error del servidor **no cierra** el modal | cierre añadido en el camino de error | **2 rojos** OK |
| M8 | Parar aplica el tiempo recalculado | parcheo sin el tiempo | **1 rojo** OK |
| M9 | Un 409 al parar **no** borra el estado local | parchea igual en el camino de fallo | **1 rojo** OK |
| **M10** | **El guardado conserva la sesión activa** | sesión activa forzada a nula | **VERDE — §2** FALLA |

### 3.1 El BORRADO de NewProjectDialog.tsx, campo por campo

Comparado contra la versión en HEAD del archivo borrado. **No se perdió nada:**

| Lo que tenía el viejo | Dónde está | Verificado por |
|---|---|---|
| El schema del endpoint **por ruta interna**, no por el barrel | `ProjectFormDialog.tsx:18-21`, mismo comentario y mismo motivo | lectura + el sub-barrel de UI no arrastra la capa de datos |
| **Foco al campo inválido** (deuda 38) | `reportIssues()` + `FOCUS_ORDER`, y ahora **en orden de pantalla** (7 campos, no 1) | **M6** |
| Formulario sin validación nativa y con método POST declarado (deudas 39 y 43) | `ProjectFormDialog.tsx:393-396`, idéntico | lectura |
| Foco inicial al primer campo | `:388` | test migrado (el del foco de vuelta al cerrar) |
| Error del servidor **sin cerrar** el modal | `ActionError` + salida temprana en los dos caminos | **M7** |
| Botón de envío con estado de carga | `:533` | lectura |
| Título por tipo | `createFormTitle()` — **el mismo texto exacto** que el del modal viejo | lectura comparada |

**Los cinco tests se migraron de verdad**, no se tiraron: tipo preseleccionado + foco inicial + foco de
vuelta / cuerpo del POST / recarga tras el alta / campo vacío con foco (deuda 38) / error sin cerrar.
Lo único reescrito es el cuerpo del POST, que ahora lleva los siete campos — **y eso es el cambio, no una
pérdida**. Se añade además el gate de la ficha 185 (el modal del Dashboard ofrece el formulario entero),
que con el modal viejo era imposible de escribir.

### 3.2 El contrato de GET /api/projects — el endpoint más usado

- **Route handler intacto y fino** (`src/app/api/projects/route.ts`): parsea, valida con zod, delega en
  `listProjects`. Cero lógica. **C3 limpio.**
- **Sin N+1 y sin JOIN**: `store.listActiveSessions(userId)` es **una** consulta para toda la lista
  (`store.ts:135-152`), y el índice se arma en memoria en `list-projects.ts:21-31`. Anclado en
  `store.test.ts` con el interceptor de SQL: proyección de tres columnas, filtro por dueño **y** por
  sesión sin fin en el mismo WHERE, orden descendente por arranque, y un aserto explícito de que
  **no hay JOIN**.
- **Scoping por usuario**: la tabla de sesiones tiene dueño propio y el WHERE lo usa — no depende de la
  query de proyectos. Probado a los dos niveles (servicio y ruta).
- **Nulo limpio sin sesión**: probado tres veces — nunca tuvo sesión, todas cerradas, y sesión de otro.
- **Serialización**: el test de ruta comprueba que el arranque cruza como **cadena ISO** y que el objeto
  lleva **exactamente dos claves**. Buen ancla.
- **El detalle NO cambia**: las claves del payload siguen ancladas y el proyecto no gana el campo nuevo.
- **Consumidores existentes**: los dos (el del Dashboard y el de la lista) siguen verdes; el cambio es
  **aditivo** (una clave más), typecheck verde y las pruebas del Dashboard pasan sin tocar.
- *Nit, no bloqueante:* la optimización "con lista vacía no se piden sesiones" (`list-projects.ts:54-56`)
  **no tiene test**. Es rendimiento, no corrección — no bloquea.

### 3.3 La invariante de los VARIOS cronómetros

**No se asumió uno solo. Está modelada y medida en tres capas:**

- **Modelo**: la sesión activa cuelga de **cada** proyecto (`types.ts`), no de la respuesta. El JSDoc dice
  explícitamente "no una por usuario".
- **Servicio**: tres proyectos, dos corriendo; comprueba que el tercero da nulo y que **ninguno se lleva el
  del vecino**.
- **Ruta**: cada proyecto recibe el suyo con dos corriendo a la vez.
- **Vista**: dos cronómetros a la vez, cada uno con su tiempo.
- Y el reloj monta **su propio intervalo por tarjeta**, así que N cronómetros son N intervalos
  independientes — medido con el contador de temporizadores: **0 parado, 1 corriendo, 0 tras desmontar**.

### 3.4 E7 (b1): el botón se transforma, y la etiqueta no miente

- **Mismo nodo del DOM**: identidad comprobada tras volver a renderizar. **M3 lo mata**, así que el aserto
  no es incapaz de fallar. En el JSX el botón ocupa **la misma ranura** y el reloj entra como hermano en la
  ranura anterior (que vale nulo con el cronómetro parado), así que React lo reusa en su sitio.
- **Misma caja táctil, verificado en el fuente**: tamaño de icono en **los dos** estados;
  `button.variants.ts` pone la altura mínima del token de objetivo táctil en las clases base y el ancho
  mínimo en el tamaño de icono. Lo único que cambia es la variante (secundaria a primaria), que **sólo toca
  piel y color**. La caja no puede cambiar con el estado. *(Los píxeles reales siguen sin medirse — §4.)*
- **La etiqueta accesible cambia**: de "Empezar a tejer X" a "Parar el cronómetro de X", ambas con el
  nombre del proyecto. **M1 lo mata (3 rojos).** El defecto original —ofrecer «Empezar a tejer» con el
  cronómetro corriendo— **no puede volver sin ponerse rojo**.
- **Y no puede existir "corriendo sin forma de parar"**: la prop del cronómetro es **un objeto** con la
  sesión y las dos acciones juntas. Es la ficha 186 hecha **irrepresentable en el tipo**, no sólo evitada.
  Buena decisión, y bien argumentada.

### 3.5 E4 (a): la región viva NO se reabrió en el reloj

Confirmado. El reloj de la tarjeta **no monta ninguna región viva**; los dígitos están ocultos al árbol
accesible y lo legible es un texto sólo-lector en **grano de minuto**. El test barre las tres formas de
región viva en el contenedor y **M2 lo mata**. El razonamiento del implementer además **mejora** la
enmienda: en una rejilla serían **N metrónomos**, no uno. Los cambios de estado se anuncian en la **única**
región de página, que vive en la vista.

### 3.6 Timers en tests: cero dependencia del reloj real

Relojes falsos con una lista corta y explícita de intervenidos (fecha, alta y baja de intervalo), hora del
sistema fijada, y la librería de eventos configurada para avanzar esos relojes y no colgarse. Por eso el
contador de temporizadores cuenta **sólo** los del componente. **No queda ningún test que espere segundos
de verdad.** Es la forma correcta.

### 3.7 El puente de vuelta desde el cajón (alcance de más) — **JUSTIFICADO, y hay que decirlo**

**Es necesario.** Sin él: cronómetro parado desde el cajón, cerrar, y **la tarjeta sigue diciendo «Parar»**
con la sesión ya cerrada. Es la ficha 186 por otra puerta, y es un camino que recorre **cualquiera que
pruebe esta misma feature** — o sea, el usuario que abrió las fichas.

**Está acotado.** El tab avisa; el cajón **lo pasa hacia arriba sin usarlo**; la vista lo conecta al
parcheo en el sitio. Es **exactamente** el camino que ya recorría el aviso del tiempo total, en el mismo
componente y por el mismo motivo. **Nada de lo que se ve en el cajón cambia**, que es lo que la valla del
encargo protegía. Y sólo se llama con confirmación del servidor: un 409 no anuncia nada.

**Tiene test.** 3 en `SessionsTab.test.tsx` + 2 de integración en `ProjectsView.test.tsx`, y **M5 los mata
(5 rojos)**.

**Veredicto sobre el alcance: dentro de la valla, bien argumentado y bien probado. No se ficha como apaño.**
Además la prop es **obligatoria** en el tab (no opcional), así que nadie puede montarlo olvidándose de
cablearla. Eso es la decisión correcta.

### 3.8 Arquitectura y convenciones

- El store importa la tabla de sesiones **por su schema directo** con el motivo escrito —regla **S1** de
  `architecture.md`—. Correcto: la misma puerta que usa la feature de tiempo en sentido contrario, sin ciclo.
- El formulario importa el esquema zod **por ruta interna** para no meter el ORM en el bundle del
  navegador. Correcto y comentado.
- El Dashboard consume el sub-barrel de UI de proyectos, no el barrel raíz del feature. Correcto y
  coherente con lo que ya hacía antes de este lote.
- UI sin DB, lógica en `features/projects/api`, zod en el borde, scoping por usuario en toda query. Sin
  trazas de depuración, sin tipos sueltos, sin secretos, sin TODOs sin contexto.
- `ProjectCard.tsx` está en la lista del gate de CSS compilado, así que las clases nuevas del reloj se
  comprueban contra el CSS real. Token-first respetado.
- El filtro por nombre pasa a ser genérico: bien visto — un retorno fijo **recortaba la sesión activa justo
  antes de pintarla**, y habría sido un fallo sutil e invisible.

### 3.9 Jerarquía visual (lo que se puede juzgar sin navegador)

- **No hay dos controles con comportamiento distinto renderizados igual.** Es literalmente lo contrario:
  **un** control que cambia de papel. La deuda 142 no se repite; se evita a propósito y con la cita puesta.
- **Hay jerarquía y cambia con el estado**: parado, variante secundaria (piel de superficie); corriendo,
  variante primaria (acento sólido) más el reloj en color de acierto. Lo vivo pesa más que lo quieto.
- **La acción con efecto tiene feedback VISIBLE, no sólo para lector de pantalla** — esto es la deuda 137 y
  hay que mirarlo explícitamente: el aviso de la vista tiene **borde, superficie elevada, relleno y color de
  tono**, y sólo se repliega a sólo-lector **cuando está vacío** (la variante de vacío gana en
  especificidad). Con mensaje, **se ve**, y hay test dedicado. **La 137 no se reabre.**
- **Ninguna decisión visual se justifica por el coste del arnés.** Revisado uno por uno: no hay ni un
  "no lo hice porque tocaría el gate de API pública" en este lote. Al contrario — se **ampliaron** el
  barrel y ese gate para sacar el formulario del feature, que es la dirección correcta: el template como
  **suelo**.

---

## 4. EL EJE VISIBLE: **NO VERIFICADO** — y esto es lo que hay que mirar

**Esta sesión de review no tiene navegador** (ni Playwright ni MCP): sólo archivos y consola.
**No apruebo el aspecto por omisión.** Este lote nace de que el usuario vio en pantalla algo que ningún
gate medía, así que la lista de abajo **pesa más que el resto del informe**. El entorno de test no maqueta
ni mide cajas: **nada de esto lo puede contestar un test**.

> **Antes de medir: borrá `.next` y reiniciá el servidor.** Si aparece un 404 con `text/html` en las
> subrutas anidadas del proyecto, es la caché de Turbopack, **no la app** (REGLA 2).

1. **¿El botón ocupa el MISMO sitio en los dos estados?** Es la promesa literal de E7 (b1). Del fuente
   **se deduce** que sí (fila con reparto a los extremos, bloque del cronómetro sin encogerse y en último
   lugar, así que el reloj crece **hacia la izquierda** y el botón se queda clavado a la derecha) — pero
   **es una deducción, no una medida**. Medí el rectángulo del botón parado y corriendo: **tienen que
   coincidir**.
2. **Caja táctil real de 44x44 como mínimo** con el reloj al lado, en móvil (360 px).
3. **Nombre largo + reloj en la misma fila.** El ancho mínimo cero del encabezado promete que el nombre
   **se parte** en vez de empujar al reloj fuera. Probá con un nombre de unos 40 caracteres a 360 px:
   ¿se parte, o desborda?
4. **Contraste del reloj**: el color de acierto sobre la superficie **de la tarjeta** (el informe afirma
   4.83:1 sobre superficie elevada). Confirmalo **sobre la tarjeta**, que es donde se monta.
5. **Dos cifras monoespaciadas por tarjeta.** Arriba a la derecha, el reloj corriendo (más grande, color de
   acierto); abajo a la derecha, el **tiempo tejido** total (más chico, apagado). ¿Se leen como **dos cosas
   distintas**, o como una pareja confusa? Es el riesgo visual número 1 del lote.
6. **Varias tarjetas corriendo a la vez** en la rejilla (2 o 3 en pantalla): varios botones de acento
   sólido más varios relojes verdes. ¿Sigue habiendo jerarquía, o se convierte en un árbol de Navidad?
   Es un estado **nuevo** que antes era imposible de alcanzar.
7. **El aviso de acción**: que aparezca **visible** al arrancar y al parar, y que al aparecer o desaparecer
   **no salte la rejilla** (entra y sale del flujo según esté vacío).
8. **El modal del Dashboard, que ahora tiene SEIS campos** donde tenía uno. ¿Cabe? ¿Hace scroll? ¿La fila
   de Cancelar / Crear proyecto queda **alcanzable** en una ventana de portátil? Es exactamente la trampa
   que ya midió el cajón (la foto ocupaba el 47 % del alto y empujaba los datos al pliegue).
9. **La vista previa de la foto vacía dentro de ese modal** (encuadre de detalle, 3:1): la **ficha 184**
   dice que en el alta no comunica nada. Ahora se ve **también desde el inicio** — comprobá si la 184
   empeora al multiplicarse el sitio donde aparece.
10. **Lectura con lector de pantalla real** (NVDA/VoiceOver) sobre una tarjeta corriendo: que diga el
    estado y los minutos, y **que no recite segundos**.

---

## 5. Deudas

- **185** y **186**: las doy por **saldadas en su parte medible**. La 186 queda saldada **de verdad** sólo
  cuando se cierre **B1** (si no, entra por la puerta del modal de edición) y cuando la REGLA 4 confirme
  los puntos 1 a 7 de §4.
- **187** y **188**: correctamente abiertas, con escenario concreto y con el motivo de por qué no se saldan
  ahora. Ambas amarillas, ninguna interrumpe. De acuerdo con las dos.
- **Deuda nueva propuesta (blanca):** `feature_list.json` perdió el salto de línea final. Trivial.
- **Deuda nueva propuesta (blanca):** `.atl/` y `.windsurf/` sin trackear y sin ignorar. No es de este lote.

---

## 6. Cambios requeridos

1. **Un test** en `src/features/projects/ui/ProjectsView.test.tsx`: proyecto con sesión activa, abrir el
   cajón, **Editar**, guardar, y comprobar que la tarjeta **sigue** ofreciendo parar y **sigue** pintando el
   reloj. **Comprobalo por mutación** (forzar la sesión activa a nula en `ProjectsView.tsx:459` **tiene que
   ponerlo rojo**); hoy ese cambio deja **66 de 66 verdes**.

Nada más. Con eso, **APROBADO** — a reserva de la REGLA 4, que sigue siendo la que decide si esto está bien.

---

# Cierre de B1 — segunda pasada (2026-08-26)

**Veredicto: APROBADO.** El bloqueante está cerrado, y cerrado **de la forma correcta**: con un test que
mata la mutación, sin tocar una línea de producción, y con el camino hermano descartado con motivo
verificable en el fuente.

Repetí las cuatro comprobaciones que se me pidieron. **Ninguna se da por buena de palabra.**

## 1. `bash ./init.sh` — EXIT real

```
[OK]    lint verde
[OK]    typecheck verde
 Test Files  98 passed | 3 skipped (101)
      Tests  1838 passed | 13 skipped (1851)
[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
EXIT=0
```

**EXIT 0.** **1838 passed** — exactamente **+1** sobre las 1837 que medí en la primera pasada. Coincide con
lo declarado. Un test añadido, un test más en el total: la aritmética no deja sitio para nada más.

## 2. La mutación, repetida por mí, en las dos direcciones

**Dirección A — mutado** (`ProjectsView.tsx:459`, `activeSession: entry.activeSession` → `activeSession: null`):

```
 × guardar una edición no apaga el cronómetro de la tarjeta 1866ms
 Tests  1 failed | 66 passed (67)
```

**El único rojo ES el test nuevo.** Ninguno cae de rebote: los otros 66 siguen verdes, así que el test
nuevo no está apoyado en nada que la mutación rompa por su cuenta.

**Dirección B — restaurado** (md5 `b2942595a245bb9d6c069315ca987521`, el declarado):

```
 Tests  67 passed (67)
```

## 3. ¿Falla por lo que dice, o por otra cosa que pasa por casualidad?

Ésta era la pregunta que importaba, porque un test puede ponerse rojo por el motivo equivocado y parecer
que ancla algo que no ancla. **Falla por la sesión perdida.** Evidencia, no lectura:

El mensaje del rojo es `Unable to find ... role "button" and name "Parar el cronómetro de **Bufanda
corta**"`. Y en el DOM que la mutación deja montado, contado sobre el volcado real:

| Texto en el DOM bajo mutación | Veces |
|---|---|
| `Bufanda corta` | 3 |
| `Empezar a tejer Bufanda corta` | 2 |
| `Ver detalle de Bufanda corta` | 1 |

O sea: **la tarjeta se renderizó**, **el nombre nuevo se aplicó en todas partes** (encabezado, capa del tap
y botón), y **lo único que cambió es que el control volvió a ofrecer «Empezar»**.

- **No falla por el nombre**: el nombre editado está presente, y además el aserto lo *usa* (`quickStopLabel(NOMBRE_EDITADO)`),
  así que un nombre sin actualizar también lo pondría rojo. Cubre las dos cosas, no una.
- **No falla por el renderizado**: hay tarjeta, hay botón y hay capa de tap.
- **Falla porque se perdió la sesión.** Que es la tercera puerta de la ficha 186, y es lo que se pedía anclar.

**Y el doble de red es fiel** (REGLA 7), que es lo que impide que el test sea vacuo:
`bareProject()` (`ProjectsView.test.tsx:185-188`) **quita `activeSession`** del payload del `PATCH`, igual
que hace producción — el dato lo cuelga sólo la lista (E7 b3). Si el doble lo hubiera servido en el parche,
el test estaría midiendo un estado que el backend no puede producir. No es el caso.

Dos apuntes a favor del test, que valen la pena decirse:

- Cierra el cajón **por su botón y no con `Escape`**, con el motivo escrito: el modal se acaba de desmontar
  y el foco todavía no está dentro del cajón. Es la clase de detalle que, mal resuelto, produce un test
  intermitente.
- Vive **dentro del bloque de relojes falsos**, así que el `formatClock(65)` del final es determinista y no
  depende del reloj real.

## 4. El "no aplica" del Dashboard — las tres razones, verificadas en el fuente

**Se sostienen las tres, y son independientes entre sí:**

| # | Razón declarada | Comprobación | Resultado |
|---|---|---|---|
| R1 | Sólo monta el modal en alta | `DashboardView.tsx:372` es `{ mode: "create", type: newProjectType }`, y **no hay ni un `mode: "edit"` ni un `ProjectFormTarget` en todo `src/features/dashboard/`** | se sostiene |
| R2 | Su `onSaved` recarga del servidor | `DashboardView.tsx:375-378`: **descarta el proyecto que recibe** (no usa el parámetro) y llama a `reload()`, que incrementa el token y vuelve a pedir la lista | se sostiene |
| R3 | Sus tarjetas van sin la prop del cronómetro | `ActiveProjectsPanel.tsx:119` es `<ProjectCard project={project} />` a secas, y **la palabra `timer` no aparece en producción del Dashboard** | se sostiene |

**R2 es la que de verdad cierra el asunto**, y conviene decirlo porque es la más robusta: en el Dashboard
**no existe ningún camino de mezcla local** — no hay un `handleSaved` que reemplace el proyecto en el
estado, hay una recarga. No hay dónde perder `activeSession`, porque el dato se vuelve a pedir al servidor,
que es de donde sale. Aunque mañana se salde la **ficha 187** y las tarjetas del inicio estrenen reloj (R3
deja de valer), **R1 y R2 siguen en pie**. El "no aplica" no es frágil.

## 5. No se tocó producción — probado, no declarado

- `ProjectsView.tsx` → md5 **`b2942595a245bb9d6c069315ca987521`**, el mismo que declara el implementer **y
  el mismo que respaldé en la primera pasada**. Idéntico byte a byte.
- Los otros cuatro archivos de producción que había respaldado (`ProjectCard.tsx`, `SessionsTab.tsx`,
  `ProjectFormDialog.tsx`, `list-projects.ts`) → **idénticos** a mis copias de la primera pasada.
- **La aritmética lo cierra para TODO `src/`**, sin depender de qué archivos respaldé: `git diff --stat`
  sigue dando **27 archivos** y **442 deletions** (idéntico a mi primera pasada), con **+68 insertions**;
  y `ProjectsView.test.tsx` pasó de **+803** a **+871**, o sea **+68**. Las líneas añadidas están
  **todas** en el archivo de test. **Cero producción, y no queda margen aritmético para otra cosa.**
- Sin residuos de mis mutaciones: la conservación está intacta en `ProjectsView.tsx:459` y no hay ningún
  `activeSession: null` espurio.

## 6. Estado de las fichas

- **185** — **saldada**.
- **186** — **saldada en todo lo medible**: las tres puertas están cerradas y cada una tiene su mutación
  que la mata (la tarjeta, el puente del cajón, y ahora el modal de edición).
- **187** y **188** — abiertas, correctas, ninguna interrumpe.

## 7. Lo que sigue SIN verificar, y no cambia

**El eje visible sigue NO VERIFICADO.** Esta segunda pasada tampoco tiene navegador, y el cierre de B1 no
toca nada de lo que se ve — es un test. **Los diez puntos de §4 siguen vigentes tal cual**, y siguen siendo
lo que decide si esto está bien. La REGLA 4 es del leader, y este lote nació precisamente de algo que
ningún gate medía.

---

**Veredicto final del lote E7: APROBADO**, a reserva de la verificación en navegador (§4).

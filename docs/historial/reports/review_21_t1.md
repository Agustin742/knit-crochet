# Review — feature 21 `projects_detail_ui`, TANDA 1 (drawer + tabs + tab General + tap en la card)

**Estado:** EN CURSO — escrito por bloques. El veredicto final está al final.
**Fecha:** 2026-08-24 · La feature sigue `in_progress`: **esto NO cierra #21**, queda la tanda 2.

## 0. Progreso
- [x] RFC-03 E3 (§7-quater), informe del implementer, verificación de navegador del leader
- [x] `bash ./init.sh` + aritmética de tests
- [x] Clases inertes (verificado por mí, no por el informe)
- [x] `cn()` / orden de utilidades en la variante lateral
- [ ] Tabs: a11y real + API pública + una sola pestaña
- [ ] Dialog centrado: regresión
- [ ] REGLA 7 en los tests nuevos (dobles + fechas)
- [ ] E3 (d)

---

## BLOQUE A — Gates duros

### A.1 `bash ./init.sh` → **EXIT 0** ✅
Corrido por mí, en solitario (el `pnpm dev` del leader no interfiere), 276.77 s.

```
[OK] lint verde
[OK] typecheck verde
 Test Files  84 passed | 3 skipped (87)
      Tests  1485 passed | 13 skipped (1498)
[OK] tests verdes
EXIT=0
```

### A.2 La aritmética cierra ✅
Partida `1426 passed | 13 skipped (1439)` → medido `1485 passed | 13 skipped (1498)`.
**1439 + 59 = 1498.** Sin residuo. El desglose del informe (§5) cuadra con los archivos que veo en
`git status`: 3 archivos nuevos de test + 6 archivos de test tocados + los 10 que `no-hardcode.test.ts`
genera solo (5 fuentes nuevas × 2).

### A.3 Cero clases inertes — **verificado por mí, no deducido** ✅
El informe dice haberlo comprobado con un archivo temporal que borró. No lo di por bueno: compilé
`src/app/globals.css` con el **mismo** compilador de la app (`postcss` + `@tailwindcss/postcss`) y apliqué
el mismo criterio de `emitsRule` (frontera de fin de nombre) sobre **todos** los literales de cadena de
`tabs.variants.ts`, `dialog.variants.ts`, `Tabs.tsx` y `ProjectDetailDrawer.tsx`, extraídos del fuente en
tiempo de ejecución (sin escribir ni un nombre de clase en mi script, para no contaminar el escaneo).

Resultado: **ninguna utilidad inerte**. Lo único que no emite regla son rutas de import, claves de
variante (`center`, `md`, `lg`, `side`), `role`s y copy en castellano — o sea, cadenas que no son clases.
El script se borró después de correr.

### A.4 `cn()` y el orden de utilidades en la variante lateral — ⚪ **el informe dice algo que NO es cierto**
Informe §7: *"Los conflictos de utilidades los resuelve `cn()`/`twMerge` en el orden correcto: en la
colocación lateral, el radio nulo gana al redondeado **y la sombra nula a la sombra dura**."*

Medido con `tailwind-merge@3.6.0`, el que usa `cn()`:

| entrada | salida de `twMerge` |
|---|---|
| `rounded-md rounded-none` | `rounded-none` ✅ (sí lo resuelve) |
| `shadow-hard-lg shadow-none` | **`shadow-hard-lg shadow-none`** ❌ (NO lo resuelve: `shadow-hard-lg` no está en ningún grupo que `tailwind-merge` conozca, así que **las dos clases sobreviven en el atributo**) |

Quién gana entonces la sombra lo decide el **orden en el CSS compilado**, no el orden en el atributo.
Medido: `.shadow-hard-lg` está en el índice 24292 y `.shadow-none` en el 24522 → **`shadow-none` gana**,
que es el resultado que se quería. **Y encima es invisible**: la sombra dura es `6px 6px 0` (abajo-derecha)
y el panel está pegado al borde derecho y al inferior, así que caería fuera de la ventana igual.

**No es bloqueante** (no hay nada que un usuario pueda ver mal hoy), pero **la frase del informe es falsa
y es peligrosa como precedente**: deja escrito que `cn()` desconflicta las sombras del design system, y no
lo hace con ninguna sombra de nombre propio (`shadow-hard`, `shadow-hard-lg`, …). El día que alguien
apague una sombra confiando en esa frase, el resultado dependerá de un orden de compilación que nadie
controla. **Corregir la frase del informe** (`§7`) para que diga lo que se midió.

---

## BLOQUE B — `Tabs`, la primitiva nueva

### B.1 El patrón ARIA está completo ✅
`src/shared/ui/primitives/tabs/Tabs.tsx`, leído línea a línea:

| lo que exige el patrón | dónde | veredicto |
|---|---|---|
| `role="tablist"` con nombre | l.135-136 (`aria-label={label}`) | ✅ |
| `role="tab"` + `aria-selected` en **todos** | l.150-152 | ✅ (`index === selectedIndex`, así que las no elegidas dicen `"false"`, no se omite) |
| `role="tabpanel"` etiquetado por su pestaña | l.165-168 (`aria-labelledby={tabId(selectedIndex)}`) | ✅ |
| `aria-controls` que apunta a algo que **existe** | l.153: sólo la elegida lo lleva | ✅ **y es la decisión correcta**: sólo se monta un panel, así que un `aria-controls` en las demás apuntaría a un `id` inexistente (ARIA inválido) |
| `tabindex` rotatorio (una parada por carril) | l.154 | ✅ |
| Flechas ←/→ con **vuelta** en los extremos | l.108-115 | ✅ |
| `Home` / `End` | l.116-123 | ✅ |
| `preventDefault` en las cinco teclas | sí | ✅ (sin él, `Home`/`End` scrollean la página) |

Y la red de seguridad que no le pedía nadie: `focusIndex = selectedIndex === -1 ? 0 : selectedIndex`
(l.87). Con un `value` que no case con ninguna pestaña **todas** valdrían `tabindex=-1` y el carril
quedaría inalcanzable por teclado. Está previsto y comentado.

### B.2 El contrato de la API pública (REGLA 2a) — pagado ✅
`public-api.test.ts` l.44 añade `"Tabs"` a la lista literal, y l.26 `"DIALOG_PLACEMENTS"`. El test compara
con `toEqual` sobre la lista ordenada, o sea **falla en las dos direcciones**. `Tabs` se exporta por
`primitives/index.ts` (`export * from "./tabs"`) → llega al barrel raíz → el test "el barrel raíz
reexporta todo lo de sus capas" (derivado, no copiado) lo cubre.

**`DIALOG_PLACEMENTS` deriva de verdad**, como `DIALOG_SIZES`: `Object.keys(dialogPlacements)`
(`dialog.variants.ts` l.37-39), anclado al literal en `Dialog.test.tsx` (`toEqual(["center","side"])`).
Y la geometría del panel va en un `Record<DialogPlacement, string>` aparte: **añadir una colocación sin
su geometría no compila**. Es el patrón bueno, no una imitación del nombre.

### B.3 Con UNA sola pestaña — no se rompe, pero **no está medido en el primitivo** ⚪
Repasé el código con `tabs.length === 1`, que es **el único estado que producción renderiza hoy**
(`DETAIL_TABS = ["general"]`):
`last = 0` → `ArrowRight`/`ArrowLeft`/`Home`/`End` llaman todos a `select(0)`, que re-enfoca la misma
pestaña y dispara `onValueChange("general")` con el valor que ya estaba. `setTab` con el mismo valor →
React descarta el render. **Nada se rompe.**

Pero: **`Tabs.test.tsx` monta SIEMPRE tres pestañas** (`SECTIONS`, l.16-20). La forma que la aplicación
sí pinta hoy no la mide el primitivo; sólo la roza `ProjectDetailDrawer.test.tsx` ("monta el carril de
pestañas con la que ya tiene contenido"). No es un bloqueante —el camino está razonado y el drawer lo
cubre de refilón— pero es un `it` de tres líneas que falta.

### B.4 Un detalle real que conviene dejar escrito antes de la tanda 2 ⚪
`Dialog.FOCUSABLE_SELECTOR` (`Dialog.tsx` l.35-42) incluye `button:not([disabled])` **sin mirar el
`tabindex`**. Las pestañas NO elegidas son `<button tabindex="-1">`: el navegador **no** para en ellas,
pero la jaula de foco del `Dialog` **sí las cuenta**. Hoy y en la tanda 2 da igual —`first` es "Cerrar" y
`last` es el `tabpanel`, y el ciclo sólo usa los extremos—, así que **no es un bloqueante**. Pero es una
lista de "enfocable" que ya no coincide con la del navegador, y el propio JSDoc del `Dialog` presume de
derivar el foco inicial *de esa misma lista* (l.168-173). Vale la pena arreglarlo (`[tabindex='-1']` como
exclusión general) antes de que un `Tabs` con 4 pestañas lo ponga a prueba de verdad.

---

## BLOQUE C — Los tests: REGLA 7 y fixtures

### C.1 Los dobles: producción **sí** puede producirlos, verificado contra el backend ✅

**`ProjectDetailDrawer.test.tsx`** era el de más riesgo, porque hay **dos caminos hacia el mismo dato**:
la tarjeta pone el título y la petición pone el contenido.

- `renderDrawer(data, scenario)` (l.165-168) sirve `{ project: data, yarns: [] }` **y** monta
  `DrawerHarness data={data}`, que deriva la tarjeta con `card(from)` (l.79-88). **Es el mismo objeto por
  los dos caminos.** Servir dos payloads distintos para el mismo id sería justo el estado que producción
  no puede alcanzar. ✅
- El disparador es un botón de verdad y el cajón nace **cerrado** (l.143, `useState(false)`): el foco
  tiene a dónde volver. Un doble que lo montara "ya abierto" no mediría la devolución del foco. ✅
- **El estado de carga se mide con una respuesta retenida** (`serveLater`, l.120-133), no con un mock
  instantáneo. Sin eso el fotograma de carga no existe y el aserto pasa por accidente. ✅ Es exactamente
  la corrección que la REGLA 7 pide, y el implementer dice que fue su primer rojo real.

**Contrastado contra el backend real, no contra el informe:**

- `src/app/api/projects/[id]/route.ts` l.38-39 responde `NextResponse.json({ project, yarns })`: el doble
  sirve la **misma forma**, y `SerializedProjectDetail` la describe entera. ✅
- `src/features/projects/schema.ts`: `needles` es `notNull().default([])` (l.29), `notes` es
  `notNull().default("")` (l.37), `endDate` es nullable (l.31). El test *"un proyecto sin agujas, sin fin
  y sin notas"* (l.292-300) monta `needles: []`, `endDate: null`, `notes: ""` → **son los defectos de la
  tabla**, no un doble inventado. ✅ Y como `notes` no puede ser `null`, el `project.notes.trim()` del
  componente (l.194) no puede explotar con un payload real.

**`ProjectsView.test.tsx`** — el doble responde el detalle **desde la misma lista que sirvió**
(l.152-163) y devuelve **404** si el id no está. Es lo que haría el BFF. ✅

**`ProjectCard.test.tsx`** — sin dobles de red; mide marcado. El aserto que vale es que ninguno de los
dos controles contiene al otro, **comprobado en las dos direcciones**. ✅

### C.2 Las fechas: deuda 164 respetada donde se afirma una fecha ✅

- `ProjectDetailDrawer.test.tsx` l.41-45: `LAST_YEAR = String(new Date().getUTCFullYear() - 1)`, y con él
  se componen los ISO **y los textos esperados**. El día y el mes sí son del fixture, que es lo que se
  afirma. **Ni un año escrito a mano.** ✅
- `format.test.ts`: `const YEAR = new Date().getUTCFullYear()`, con el caso que hace obligatorio el UTC
  (medianoche del 1 de enero → "1 de enero", no "31 de diciembre"). ✅
- `ProjectsView.test.tsx` l.93-100 **sí** tiene un año literal, pero es **fixture preexistente que este
  cambio no toca**, y **ningún test nuevo afirma una fecha formateada a partir de él** (el test del
  segundo proyecto compara el campo *Tipo*). No miente. Bajo moratoria ⚪.

### C.3 Un test que no puede fallar por lo que dice medir ⚪

`Dialog.test.tsx`, *"el cajón lateral cambia la geometría del velo y del panel"*: el valor esperado se
deriva de **las mismas** `dialogPanelVariants` / `dialogScrimVariants` que usa el componente. Prueba que
`Dialog` **enhebra** la prop `placement` hasta el velo y el panel —eso es real y vale— pero **no dice
nada sobre si la geometría es la correcta**. Si `side` significara "centrado", seguiría verde.

Lo que tapa ese hueco es la medición del leader en Chrome (`x=864, 672x730`), no un gate.
**Observación**, no bloqueante: el hueco está cubierto hoy, por una fuente que no es un test.

### C.4 Regresión del `Dialog` centrado: **NO hay** ✅ (comprobado, no deducido)

Dos evidencias independientes:

1. **El diff**: las clases del velo centrado (`items-center justify-center` + el relleno) sólo **se
   mudaron** de la lista base a `dialogPlacements.center`, con `defaultVariants: placement center`. El
   panel centrado recibe la cadena vacía. La salida para un diálogo centrado es la **misma**, y no hay
   conflicto de utilidades que un reordenamiento pudiera alterar.
2. **La suite**: `Dialog.test.tsx` entero está verde en la corrida de `init.sh` que hice yo, y ningún
   test previo cambió de resultado (1426 → 1485: todos añadidos, ninguno movido).

### C.5 El gate que este cambio dejó desafinado ⚪

`ProjectsView.test.tsx` l.193-201, `listUrls()`, filtra por "empieza por el endpoint de proyectos y no
lleva el segmento de arranque de sesión". Desde este cambio **la URL del detalle también pasa ese
filtro** y se cuenta como "URL de lista".

El implementer **vio** la colisión en `serve()` —lo dice el comentario de l.147-151, *"va ANTES que la
lista porque su URL también empieza por ella"*— y **no la trasladó a `listUrls()`**.

Hoy no rompe nada: ninguno de sus cuatro usos abre el cajón. Pero el día que la tanda 2 escriba *"abrir
el cajón no vuelve a pedir la lista"*, ese test será **verde y falso**. ⚪ observación, arreglo de dos
líneas.

### C.6 Otro estado sucio, hoy inalcanzable ⚪

`ProjectsView.tsx` pasa al cajón el proyecto **buscado por id en la lista**. Si desapareciera de la lista
(recarga, filtro), el cajón se desmontaría **sin limpiar `detailId`**. Hoy es inalcanzable —con el cajón
abierto el foco está atrapado y el scroll bloqueado, y no hay recarga automática—, pero conviene que la
tanda 2 no lo herede a ciegas.

---

## BLOQUE D — E3(d), el eje visible y los checkpoints

### D.1 E3(d): **no se coló nada** ✅

Barrido de `ProjectDetailDrawer.tsx`, `project-detail.ts`, `ProjectCard.tsx` y `primitives/tabs/` con el
patrón `Editar | crear patrón | próximamente | TODO | FIXME | console.log`: **cero coincidencias en
código**. Las tres únicas apariciones son **prosa de un JSDoc** que explica por qué no están
(`ProjectDetailDrawer.tsx` l.77-79).

Y no queda en la palabra del implementer: `ProjectDetailDrawer.test.tsx` l.303-321 ancla que **el único
botón del cajón es "Cerrar"**, comparando la lista **EXACTA** con `toEqual`, así que cae también el día
que alguien añada uno; y que **no hay ningún enlace** dentro del panel. Un botón **deshabilitado también
caería**, porque `getAllByRole("button")` los devuelve igual.

Revisado también que no se pintan las pestañas de la tanda 2: `DETAIL_TABS` vale `["general"]` y tiene
test que lo ancla. ✅ **E3(d) cumplida en sus dos mitades** (botones y pestañas).

### D.2 El eje visible: lo que verifiqué y lo que NO

- **Jerarquía visual**: el cajón distingue título (`font-display text-xl`), etiquetas (`font-mono
  text-xs`) y valores (`font-body text-base`). Se hace por **familia y tamaño**, no bajando contraste.
  Comprobé el par que estaba en duda porque el propio implementer lo cita: `--fg-muted #7a6753` sobre
  `--surface-raised #fffdf6` da **5.30:1**, o sea que **pasa AA incluso para texto chico**. No hay trampa
  de contraste, ni en el `<dl>` ni en la pestaña no elegida que llegará con la tanda 2.
- **Dos controles distintos renderizados igual** (precedente deuda **142**): la pestaña rellena de
  acento se parece al `SegmentedControl` **y a un `Button` primario**. Lo miré en serio: la pestaña no
  lleva sombra dura, pierde el borde inferior, redondea sólo arriba y usa `text-sm`; el botón primario
  lleva `shadow-hard`, redondeo completo, `text-base` y el gesto de hover que levanta el bloque. Son
  formas distintas. Y los dos controles que **sí** comparten el relleno de acento —pestaña y
  segmentado— **son los dos excluyentes**, que es exactamente lo que la deuda 142 pide. ✅
- **Feedback visible** (precedente deuda **137**): la carga del cajón **no** vive sólo en el
  `role="status"` con `sr-only`. Hay un `GeneralTabSkeleton` visible con el marco de la foto y las filas
  de datos (l.279-290), colocado donde van a caer los datos de verdad. El aviso oculto es el
  **complemento** para lectores de pantalla, no el único. ✅ **No se repite la 137.**
- 🟠 **El hueco de la foto** — hallazgo del leader, no lo redescubro. Mi aporte sobre **cómo** arreglarlo
  está en D.4.
- ⚪ **Una sola pestaña** — fichada por el implementer (su deuda 2) y consecuencia directa de **E3(a)**,
  que decidió el usuario. **No la reabro.**
- ⛔ **SIN VERIFICAR — lo escribo en vez de aprobarlo por omisión:**
  1. **El orden de pintado del quick-start sobre la capa del tap, en un navegador real.** El razonamiento
     CSS es correcto y lo comprobé pieza por pieza: la capa y el botón están en la **misma** pila, los
     dos posicionados con `z-index:auto`, y el quick-start va **después** en el DOM, así que pinta encima
     y captura el puntero. Comprobé además que ni `card.variants.ts` ni `button.variants.ts` traen
     posicionamiento propio, y que `ProjectPhoto` y `ProgressBar` **no** se posicionan (si lo hicieran,
     pintarían por encima de la capa y el tap sobre la foto no funcionaría). Pero **nadie hizo clic en el
     botón de arranque con la capa puesta**: `happy-dom` no hace hit-testing, así que el test que dice
     que tocar el cronómetro no abre el detalle pasaría igual aunque en Chrome no pasara. Riesgo bajo,
     medición cero.
  2. **El móvil.** Sexta sesión sin medir. Concretamente sin ver: el `<dl>` con `grid-cols-2` **sin
     variante responsive** a 375 px, y el carril de pestañas en angosto.

### D.3 Checkpoints

- **C1:** [x] — arnés completo; `bash ./init.sh` **EXIT 0**, corrido por mí.
- **C2:** [x] — exactamente **una** feature `in_progress` (#21), `feature_list.json` intacto.
  `progress/current.md` describe la sesión activa. #21 **NO** está marcada `done`, que es lo correcto.
- **C3:** [x] — feature-first respetado. La UI no toca la DB: el cajón pide por
  `features/projects/ui/projects-client.ts`, que **se reusó** en vez de abrir un cuarto clon, y el
  **backend no se tocó en absoluto**. Sin dependencias nuevas, sin `console.log`, sin TODOs, sin secretos.
- **C4:** [x] — lint y typecheck verdes; 1485 passed | 13 skipped. Cada pieza nueva tiene su test:
  `Tabs`, el cajón, `project-detail`, `formatDate`, el tap de la tarjeta y la integración en la vista.
- **C5:** [x] (en lo que aplica: la sesión no cierra aquí) — `git status` sin artefactos sospechosos;
  mis scripts temporales de verificación **están borrados**. `history.md` tiene la entrada de la última
  sesión cerrada; la de ésta se escribe al cerrar #21 entera.

### D.4 Cómo arreglar el hueco de la foto **sin romper E2(g)** — lo que el leader pidió que añadiera

E2(g) dice, literal: **"La proporción NO cambia"**, y da el motivo: *para que la rejilla no quede dentada
cuando convivan tarjetas con foto y sin foto*. **Ese motivo es de la REJILLA.** En el cajón hay **una**
foto y **no hay rejilla**: la razón por la que la proporción es intocable **no aplica ahí**. Lo que E2(g)
sí exige y hay que conservar es que el hueco **se lea como algo puesto a propósito** (la inicial en
tamaño de display y la clase de tejido nombrada). Eso vive en el **contenido**, no en el `aspect-video`.

**La forma que recomiendo, y la que NO:**

- ❌ **No** darle a `ProjectPhoto` una prop `className` libre. Dentro de `ProjectCard.tsx` ese valor
  vendría de fuera del archivo, `EXTERNAL_SOURCES` de `projects-ui.classes.test.ts` crecería, y ese gate
  **compara la lista EXACTA** → rojo. Peor: las clases del marco dejarían de comprobarse contra el CSS
  compilado. Es la misma pared con la que el implementer ya chocó.
- ✅ **Sí** una prop de **tamaño con valores nombrados** (un `size` con dos valores, tarjeta y detalle)
  resuelta con un objeto **dentro del archivo**. El resolvedor del gate sigue constantes y objetos del
  propio fuente, así que las clases de **las dos** variantes se siguen comprobando y la lista de fuentes
  externas no se mueve.
- ✅ Igual de válido: mover `ProjectPhoto` a su propio módulo y **añadirlo a `COMPONENTS`** en el gate —
  es una línea. Lo que no vale es hacerlo por `className`.
- **Encuadre**: a 612 px de ancho, `aspect-video` da 344 px de alto. Con los datos **al lado** en el
  cajón ancho, o con un marco más bajo, el `<dl>` deja de nacer en el pliegue. Cuál de las dos, **lo
  decide el leader, no yo**.

---

# VEREDICTO — feature 21, tanda 1

**APROBADO.** La tanda 1 se cierra; **#21 sigue `in_progress`** y **no se marca `done`**.

Los gates duros están verdes y **verificados por mí, no leídos del informe**: `init.sh` EXIT 0, la
aritmética cierra exacta (1439 + 59 = 1498), y **cero clases inertes** compilando `globals.css` con el
compilador real de la app. El patrón ARIA de `Tabs` está completo de verdad —no sólo los roles: flechas
con vuelta, `Home`/`End`, `tabindex` rotatorio y `aria-controls` sólo donde el panel existe—, el ancla de
contrato de la API pública se pagó por las dos piezas (`Tabs` y `DIALOG_PLACEMENTS`, esta última
**derivada** con `Object.keys`, como manda la REGLA 2a), **E3(d) se cumple y está anclada con una lista
exacta**, el `Dialog` centrado **no** tiene regresión, y **no encontré ni un test que monte un estado que
producción no pueda producir**: el estado de carga se mide con una respuesta retenida, los dobles sirven
el mismo objeto por los dos caminos, y los años se derivan del reloj.

## Bloqueantes

**Ninguno.** No hay nada 🔴. Lo único 🟠 —el hueco de la foto— ya lo fichó el leader y **se salda en la
tanda 2, no aquí**: es visible pero no impide nada, y #21 no se cierra en esta tanda.

## Condición para poder cerrar #21 (tanda 2)

1. 🟠 **El hueco de la foto vacía en el cajón** (la deuda E2(g) reapareciendo). **#21 no se puede marcar
   `done` con esto abierto.** Criterio de arreglo en D.4.

## Observaciones (⚪ — ninguna la ve un usuario; no bloquean)

1. **El informe del implementer, §7, afirma algo falso.** `cn()`/`twMerge` **no** resuelve
   `shadow-hard-lg` contra `shadow-none`: medido con `tailwind-merge@3.6.0`, **sobreviven las dos**. Gana
   `shadow-none` por **orden en el CSS compilado**, no por `cn()`. El resultado es el correcto, y encima
   la sombra caería fuera de pantalla — pero **la frase hay que corregirla**, porque deja escrito un
   precedente falso sobre el design system entero. Ver A.4.
2. **`listUrls()` en `ProjectsView.test.tsx` ahora también captura la URL del detalle.** Verde hoy, falso
   mañana. Dos líneas. Ver C.5.
3. **`Tabs.test.tsx` nunca monta UNA sola pestaña**, que es la única forma que producción pinta hoy.
   Repasado a mano: no se rompe. Falta el `it`. Ver B.3.
4. **`Dialog.FOCUSABLE_SELECTOR` cuenta los botones con `tabindex` negativo**, o sea las pestañas no
   elegidas. Inocuo hoy y en la tanda 2; conviene arreglarlo antes de que un carril de 4 pestañas lo
   ponga a prueba. Ver B.4.
5. **El test de geometría del cajón se deriva de la misma fuente que prueba**: enhebra la prop, no valida
   la geometría. Lo que cubre ese hueco es la medición en Chrome del leader. Ver C.3.
6. **`detailId` puede quedar sucio** si el proyecto desaparece de la lista. Inalcanzable hoy. Ver C.6.
7. **Falta el gate de CSS compilado en `shared/ui/`** (deuda 1 del implementer). Es **observación**, no
   bloqueante: lo comprobé a mano y hoy no hay ni una clase inerte. Bajo moratoria de gates.

## Sin verificar (lo digo en vez de aprobarlo por omisión)

- El **hit-testing** del quick-start sobre la capa del tap en un navegador real. El CSS dice que está
  bien y comprobé cada pieza que podría romperlo; nadie hizo el clic.
- El **móvil**: sexta sesión. El `<dl>` con `grid-cols-2` sin variante responsive y el carril de pestañas
  en angosto siguen sin ojos encima.

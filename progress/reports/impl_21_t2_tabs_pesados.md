# impl 21 — TANDA 2: tabs pesados (Progreso, Lanas, Sesiones) + arreglo del hueco de foto

> Informe incremental. Se escribe ANTES de empezar y se actualiza POR TANDA.
> Estado inicial: T1 aprobada y commiteada en `41643fd`. #21 sigue `in_progress`.

## Estado

- [x] Tanda A — lectura de docs y plan cerrado
- [x] Tanda B — arreglo del hueco de foto (E2(g) aplicado al cajón, `size` nombrado)
- [x] Tanda C — tab Progreso (rounds +/-, targetRounds editable, checklist de pasos condicional)
- [x] Tanda D — tab Lanas (swatch + marca/tipo/colorName, enlazar/desenlazar)
- [x] Tanda E — tab Sesiones (cronómetro start/stop, tiempo en vivo, histórico)
- [x] Tanda F — verificación `bash ./init.sh` EXIT 0 + aritmética de tests

## Plan (previo a leer)

1. Leer RFC-03 §1-§5 + E3 (§7-quater) + E2(g), review_21_t1.md §D.4,
   verificacion_navegador_21_t1.md, SDD §9, conventions.md.
2. Arreglar el hueco de la foto con un `size` de valores nombrados resuelto
   DENTRO del archivo del componente (nada de prop `className`).
3. Implementar los tres tabs reusando `projects-client.ts` (sin cuarto clon HTTP).
4. Tests RTL + axe con reloj falso para el cronómetro; sin años hardcodeados.
5. `bash ./init.sh` y cuadrar 1485 passed + N nuevos.

## Registro

Cerrado: `bash ./init.sh` EXIT 0 con `1587 passed | 13 skipped (1600)`. El detalle
de cada tanda y la aritmética están más abajo.

---

## Tanda A — lectura y plan cerrado (hecha)

Leído: RFC-03 entero (§1-§5, E1, E2, E3), `review_21_t1.md`,
`verificacion_navegador_21_t1.md`, SDD §9, `conventions.md`, y el código:
`ProjectDetailDrawer.tsx`, `ProjectCard.tsx`, `projects-client.ts`, `types.ts`,
`project-detail.ts`, `Tabs.tsx`, los gates (`no-hardcode`, `projects-ui.classes`,
`canonical-tailwind-classes`, `public-api`, `globals-css`) y **todos** los
endpoints implicados.

### Decisiones tomadas (con su motivo)

1. **Hueco de la foto (🟠 que cierra #21).** `ProjectPhoto` gana un `size` de
   **valores nombrados** (`card` | `detail`) resuelto con un objeto **dentro de
   `ProjectCard.tsx`** → el resolvedor del gate de clases lo sigue y
   `EXTERNAL_SOURCES` no se mueve. **Nada de prop `className`** (D.4).
   Encuadre elegido: **marco más bajo en el cajón**, no "datos al lado".
   Motivo: E2(g) conserva la proporción **por la rejilla**, y en el cajón no hay
   rejilla; la disposición en dos columnas exigiría variantes responsive que
   **nadie ha podido medir en móvil** (sexta sesión sin medir), así que
   introducirla a ciegas es peor.
2. **Swatch de lana.** No existe ningún token de color por familia de lana y las
   13 familias no caben en la paleta de marca. Se **crean los tokens**
   (`--yarn-*` + alias `--color-yarn-*`) en `globals.css`, que es donde viven los
   valores. Es "el template es un SUELO": la pieza no existe → se crea. RFC-04
   (CRUD de lanas) va a necesitar exactamente esto.
3. **Inventario de lanas para enlazar.** `GET /api/yarns` **ya lo pide
   `ProjectsView`** para el filtro del toolbar. Se le pasa al cajón por prop en
   vez de abrir una segunda petición idéntica.
4. **Pasos.** `GET /api/projects/:id` **no** trae el patrón, y los pasos son
   `pattern.instructions`. Se piden a `GET /api/patterns/:id` **sólo si
   `project.patternId !== null`**. Sin patrón: la sección **no se pinta** y **no
   hay botón "crear patrón"** (E3(d)).
5. **Sincronía tras mutar.** `rounds`, `targetRounds` y `steps` responden
   `{project}` → se aplica al estado del cajón sin volver a pedir nada.
   `POST /yarns` responde **sólo ids** (sin marca/tipo) → tras enlazar se
   refresca el detalle en silencio; **desenlazar** (204) se aplica en local.
   `stop` responde `{session, time}` → el `time` del proyecto se refresca solo.
6. **Cronómetro.** El estado "corriendo" se **aprende de `GET /:id/sessions`**
   (la sesión abierta es la que tiene `end === null`), que es lo único que hay:
   en la LISTA no se puede saber (E1(e)), pero en el detalle **sí**.

---

## Tandas B-E — código escrito (hecho, sin sus tests todavía)

### Archivos creados

- `src/features/projects/ui/DetailTabParts.tsx` — `TabSection` (bloque con `h3`
  visible) y `ActionError` (`role="alert"` visible; E2(d)).
- `src/features/projects/ui/ProgressTab.tsx`
- `src/features/projects/ui/YarnsTab.tsx`
- `src/features/projects/ui/SessionsTab.tsx`

### Archivos modificados

- `src/app/globals.css` — 13 tokens `--yarn-*` + 12 alias `--color-yarn-*`.
  **Comprobado compilando** con `postcss` + `@tailwindcss/postcss`: las doce
  `bg-yarn-*` emiten regla, `aspect-3/1`, `size-(--space-5)`,
  `min-w-(--space-12)`, `border-t-(length:--border-width)` y
  `bg-(image:--yarn-multicolor)` también.
- `src/shared/config/index.ts` — `MILLISECONDS_PER_SECOND`, tercer puente de
  unidades (para no escribir `1000` suelto en el cronómetro).
- `src/shared/lib/format.ts` — `formatDateTime` (instante, hora local, 24 h) y
  `formatClock` (cronómetro con segundos).
- `src/features/projects/ui/ProjectCard.tsx` — `ProjectPhoto` gana `size`
  (`card` | `detail`) resuelto con un **ternario sobre constantes del archivo**;
  el objeto indexado NO sirve (el resolvedor del gate no sigue
  `ElementAccessExpression` y el test `unhandled === []` caería).
- `src/features/projects/ui/ProjectDetailDrawer.tsx` — las cuatro pestañas,
  `applyProject` / `refreshDetail` / `removeYarn`, foto `size="detail"`.
- `src/features/projects/ui/ProjectsView.tsx` — pasa el inventario de lanas y si
  falló al traerlo.
- `src/features/projects/ui/project-detail.ts` — cuatro pestañas, copy de los
  tres tabs y las funciones puras.
- `src/features/projects/ui/project-filters.ts` — `YarnChoice` gana
  `colorFamily` (el swatch lo necesita).
- `src/features/projects/ui/projects-client.ts` — siete acciones nuevas +
  `requestWithoutBody` (el 204 del desenlace rompía el camino feliz de
  `request`, que llama a `response.json()`).
- `src/features/projects/ui/types.ts` — payloads de sesiones, patrón y enlace.
- `src/features/projects/ui/projects-ui.classes.test.ts` — los 4 componentes
  nuevos entran al gate.

### Hallazgos que cambiaron el diseño

1. **`react-hooks/set-state-in-effect`** (lint) prohíbe `setState` síncrono
   dentro de un efecto. Obligó a **derivar** el estado de carga de los tabs
   comparando clave pedida contra clave llegada —el patrón que ya usaban el
   cajón y la lista—, y a **quitar el `setNow` inicial** del cronómetro. Este
   último resultó ser mejor: con el reloj atrasado la resta sale negativa y se
   acota a 0, o sea "00:00", que es justo lo que una sesión recién arrancada
   debe mostrar. Nunca puede exagerar.
2. **El gate de clases exigía >5 atributos y >15 clases por componente.**
   `DetailTabParts.tsx` tiene 3. El umbral se bajó a **>0 por archivo** con su
   motivo escrito: lo que ata el barrido a la realidad es el test de al lado,
   que compara con los atributos **escritos en el fuente**, no una cifra
   inventada que hay que rebajar cada vez que entra un componente chico.

---

## Tanda F — tests escritos

### Archivos de test creados

- `src/features/projects/ui/ProgressTab.test.tsx` (13)
- `src/features/projects/ui/YarnsTab.test.tsx` (16)
- `src/features/projects/ui/SessionsTab.test.tsx` (15)

### Archivos de test modificados

- `project-detail.test.ts` (7 → 32): las nueve funciones puras nuevas.
- `format.test.ts` (16 → 23): `formatClock` y `formatDateTime`.
- `ProjectCard.test.tsx` (26 → 29): el encuadre de la foto según dónde se monta.
- `ProjectDetailDrawer.test.tsx` (12 → 22): las cuatro pestañas juntas + el
  intervalo del cronómetro al cerrar el cajón y al cambiar de pestaña.
- `ProjectsView.test.tsx` (42 → 44): el inventario llega al cajón y "no se pudo
  traer" no se pinta como "no tenés".
- `project-filters.test.ts`: `colorFamily` en el `toEqual` de `toYarnChoices`.
- `projects-ui.classes.test.ts`: 4 componentes más (+4 `it` derivados).

### El descubrimiento que costó dos tests colgados (y que dejo escrito)

`vi.useFakeTimers()` **a secas rompe `user-event` y `waitFor`**: los dos usan
`setTimeout` y nadie los adelanta mientras un clic está a medias, así que el test
agota su tope de 10 s sin hacer nada. Medido con un caso mínimo aislado.

**La salida es intervenir SÓLO lo que el cronómetro usa**:
`vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] })`. La
interacción y las esperas siguen con el reloj de verdad; lo único bajo control es
lo que el cronómetro mide. **De regalo**, `vi.getTimerCount()` pasa a contar
exclusivamente el intervalo del componente, así que "hay UN intervalo y se suelta
al desmontar" se puede **medir** en vez de deducirlo del código.

### REGLA 7 — qué hicieron los dobles para poder medir producción

Los tres dobles nuevos **implementan las reglas del backend**, no devuelven lo que
al test le conviene:

- **sesiones**: arrancar es idempotente (201 crea / 200 reutiliza), parar sin nada
  corriendo responde **409**, y la sesión abierta es la de `end` nulo;
- **progreso**: el porcentaje lo recalcula `calculateProgress` **importada del
  backend**, no una copia escrita en el test — si el doble reimplementara la
  fórmula, el test podría dar por bueno un porcentaje que producción no devuelve;
- **lanas**: enlazar devuelve **sólo ids** (sin marca ni tipo) y desenlazar
  responde **204 sin cuerpo** — justo el caso que rompía el camino feliz del
  cliente HTTP.

---

## Verificación

### `bash ./init.sh` -> **EXIT 0** (salida real, pegada)

```
-- 4. Verificacion estatica y tests (Node) --
[OK]    lint verde
[OK]    typecheck verde
$ vitest run --silent

 RUN  v4.1.10 C:/_dev/projects/knit-crochet


 Test Files  87 passed | 3 skipped (90)
      Tests  1587 passed | 13 skipped (1600)
   Start at  13:53:20
   Duration  150.67s

[OK]    tests verdes

-- 5. Resumen --
[OK]    Entorno listo. Puedes empezar a trabajar.
EXIT=0
```

### `pnpm build` -> **EXIT 0**

Compila y rutea las 23 rutas, incluidas las siete de acciones de proyecto que
consume este trabajo.

### La aritmética cierra **sin residuo**

Partida: `1485 passed | 13 skipped (1498)`, **87** archivos (84 + 3 saltados).
Medido: `1587 passed | 13 skipped (1600)`, **90** archivos (87 + 3 saltados).

**1498 + 102 = 1600.** Los 102, contados uno a uno (`HEAD` contra el árbol de
trabajo, no de memoria):

| archivo | antes | ahora | delta |
|---|---:|---:|---:|
| `ProgressTab.test.tsx` (nuevo) | 0 | 13 | **+13** |
| `YarnsTab.test.tsx` (nuevo) | 0 | 16 | **+16** |
| `SessionsTab.test.tsx` (nuevo) | 0 | 15 | **+15** |
| `project-detail.test.ts` | 7 | 32 | **+25** |
| `format.test.ts` | 16 | 23 | **+7** |
| `ProjectDetailDrawer.test.tsx` | 13 | 22 | **+9** |
| `ProjectCard.test.tsx` | 26 | 29 | **+3** |
| `ProjectsView.test.tsx` | 42 | 44 | **+2** |
| `projects-ui.classes.test.ts` (uno por componente, derivado) | 10 | 14 | **+4** |
| `no-hardcode.test.ts` (dos por fuente nueva, derivado) | - | - | **+8** |
| **total** | | | **+102** |

`project-filters.test.ts` no cambia de número: sus dos `toEqual` ganaron el campo
`colorFamily`, que es el mismo test comprobando una cosa más.

**Archivos: 87 -> 90**, exactamente los tres de test nuevos. `DetailTabParts.tsx`
no estrena archivo propio: sus dos piezas se ejercitan desde los tres tabs que
las montan, que es donde se puede comprobar que hacen lo que prometen.

**Corrí la suite en solitario**: ningún otro agente en el árbol, sin `pnpm dev`
levantado. Ningún test se acercó a su tope.

---

## Decisiones no obvias (y lo que se descartó)

### 1. El encuadre de la foto: **franja en el cajón**, no "datos al lado"

D.4 del review dejaba las dos opciones. Elegí la **franja** (marco más bajo) y el
motivo es de riesgo, no de gusto: la disposición en dos columnas exige variantes
responsive, y **el móvil lleva seis sesiones sin que nadie lo mida**. Meter una
rejilla de dos columnas en un cajón de 672 px sin poder verla en angosto es
cambiar un defecto medido por uno no medido.

Lo que E2(g) exige **se conserva entero**: el hueco vacío sigue leyéndose como
algo puesto a propósito (inicial en tamaño de titular + clase de tejido nombrada),
y **en la tarjeta la proporción sigue sin cambiar** con foto y sin ella, que es lo
que la rejilla necesita. Hay un test para cada mitad, y **la utilidad del encuadre
se deriva** —es la única clase que difiere entre los dos sitios— en vez de
escribirse al literal, que además tiene precio conocido acá: Tailwind escanea los
archivos de test.

### 2. Trece tokens de color de lana nuevos

RFC-03 §2 pide un **swatch de color** y `ColorFamily` tiene trece valores contra
seis de la paleta de marca: no había forma de pintarlo sin inventarse el valor
dentro del componente. **La pieza no existía, así que se creó y se pagó** (el
template es un SUELO). Los valores viven en `globals.css`, que es su sitio; se
apoyan en la escala de marca donde la familia coincide y sólo aportan valor nuevo
donde la marca no llega. "Multicolor" no es un color plano —una lana jaspeada no
tiene UNO— y se dibuja como rueda de los que ya existen, sin valores nuevos.

**Comprobado compilando el CSS de verdad**, no deducido: las doce utilidades de
color y la de imagen del multicolor emiten regla.

### 3. El swatch vive en `features/`, no en `shared/ui/`

Y **esto es una limitación, no una virtud**: un selector de color de lana lo va a
necesitar RFC-04 igual que aquí. No sube al design system porque **`ColorFamily`
es config de la app** y el SDD §2 es explícito en que el template no conoce
ninguna aplicación concreta: un primitivo tipado contra ese enum rompería la
portabilidad. La salida buena el día que RFC-04 lo pida son dos piezas —una
genérica que reciba el color por prop y una traducción fina en `features/`—.
**Fichado abajo como deuda D1**, no escondido.

### 4. El inventario de lanas llega **por prop**

`GET /api/yarns` ya lo pide la página para el filtro del toolbar. Pedirlo otra vez
al abrir un cajón sería la misma respuesta dos veces en la misma pantalla. Va con
su bandera de "no se pudo traer" —dos líneas en la vista— para que el tab no le
diga "no tenés lanas" a quien tiene cincuenta, que es la mentira que **E2(e)**
corrigió en el estado vacío de la lista.

### 5. Los pasos **sí** abren una petición, y sólo si hay patrón

`GET /api/projects/:id` trae `patternId`, **no el patrón**: las instrucciones viven
en la tabla de patrones y nadie las aplana en el detalle. Sin patrón no se pide
nada y **no se pinta ningún "crear patrón"** (E3(d): su destino es #26-28). Si el
patrón no se puede traer, la checklist se calla y **el resto del tab sigue
funcionando**: no poder leer los pasos no es motivo para tapar las vueltas.

### 6. Sincronía sin peticiones de más

Vueltas, meta y pasos responden **el proyecto entero ya recalculado**, así que el
cajón lo guarda y el porcentaje **no se recalcula nunca en el navegador** — una
segunda copia de la fórmula es cómo se desincronizan las dos mitades. Parar el
cronómetro responde el `time` del proyecto y también se aplica. **Sólo enlazar una
lana obliga a refrescar el detalle**, porque su endpoint devuelve ids pelados y los
nombres de marca y tipo salen de un JOIN; desenlazar no lo necesita.

### 7. La región viva del cronómetro es de grano de MINUTO

RFC-03 §5 pide `aria-live` para el tiempo. Un aviso por segundo convierte un lector
de pantalla en un metrónomo y tapa todo lo demás. Lo que se **ve** lleva segundos;
lo que se **anuncia** cambia sesenta veces menos. Hay un test que lo mide en las
dos direcciones.

### 8. La meta quedó DENTRO del bloque de vueltas

Primero la escribí como bloque suelto entre dos secciones tituladas, y leyéndola
así no decía de qué hablaba. Es la otra mitad de la misma cuenta —lo tejido contra
lo que falta—, así que vive dentro de "Vueltas". El tab tiene ahora exactamente
dos bloques: vueltas (contador + meta) y pasos.

---

## Lo que NO pude verificar (lo escribo en vez de darlo por bueno)

**No tengo herramientas de navegador en esta sesión.** No hay ninguna captura ni
medición mía de cómo se ve esto en Chrome: los tests verdes **no son evidencia de
que se vea bien** —en este repo ya se cerraron dos pantallas visiblemente rotas
con la suite entera en verde (deudas 118 y 141)—. Lo único que puedo afirmar es la
aritmética del encuadre: a los ~612 px de ancho útil que midió el leader, el marco
del cajón pasa de **344 px** a **~204 px**, así que el bloque de datos deja de
nacer en el pliegue. **La REGLA 4 sigue debiéndose y me consta.**

Concretamente sin ojos encima:

1. **Los tres tabs nuevos en una ventana real**, a cualquier ancho.
2. **El móvil.** Séptima sesión. La lista de datos de General con dos columnas sin
   variante responsive sigue sin medirse, y ahora se le suma el carril de
   **cuatro** pestañas en angosto —tres más que cuando se midió—, que es el
   candidato número uno a partirse en dos filas.
3. **El contraste real de los trece swatches** sobre la superficie del cajón. Los
   colores llevan el borde del sistema para que un blanco o un crudo conserven
   silueta, pero eso es razonamiento, no medición.

---

## Deuda nueva (fichada acá, **no** volcada a `progress/deudas.md`)

### D1 (naranja) — El swatch de color de lana no es reutilizable, y RFC-04 lo va a necesitar

**Qué ve un usuario:** hoy, nada. Lo verá cuando el CRUD de lanas (RFC-04) pinte
sus propios swatches y **no coincidan** con los del cajón de proyectos: dos sitios
de la misma app diciendo de dos maneras de qué color es la misma lana.

**Escenario de fallo:** quien implemente RFC-04 encuentra la traducción familia ->
color dentro de `YarnsTab.tsx` —un archivo de la feature *proyectos*— y tiene dos
salidas malas: importarla cruzando features por una ruta interna, o copiar el
`switch` de trece casos. La segunda es la que suele ganar, y a partir de ahí las
dos copias divergen en cuanto alguien añada una familia.

**Medición:** trece casos, 26 líneas, en un archivo cuyo `index.ts` no lo exporta.
Los tokens sí son compartidos y viven en `globals.css`, así que **lo duplicable es
la traducción, no el color**.

**Por qué no se hace ahora:** el arreglo bueno son dos piezas (una genérica en
`shared/ui/` y una traducción en `features/`), o sea una slice de design system,
no de #21.

### D2 (blanca) — Un inventario de lanas que falló no se puede reintentar sin recargar

**Qué ve un usuario:** abre el tab Lanas, lee "No pudimos traer tu inventario", y
**no hay ningún botón** para volver a intentarlo: tiene que recargar la página. El
texto lo dice, así que no engaña, pero es un callejón.

**Escenario de fallo:** un corte de red de dos segundos justo al cargar
`/proyectos` deja el enlace de lanas inutilizable durante toda la sesión de
navegación, aunque la red ya haya vuelto.

**Medición:** el fallo se guarda en `ProjectsView` (`yarnChoicesFailed`) y sólo se
reintenta al remontar la vista. Es **la misma limitación que el filtro de "lana
usada" del toolbar ya tenía** desde #20 — no la introduce esta tanda, la hereda, y
ahora se nota más porque el cajón sí ofrece una acción sobre esa lista.

### D3 (blanca) — Falta el gate de CSS compilado en `shared/ui/`

Ya la fichó el implementer de T1 (su deuda 1) y el reviewer la confirmó como
observación. Sigue viva: el gate de clases cubre los **ocho** componentes de
`/proyectos`, y el design system —donde vive `Tabs`— no tiene su equivalente.
**Bajo moratoria de gates: no la abro.**

### Gates que noté que faltan (fichados, y sigo, por la moratoria)

- **Nada obliga a que un componente que programa un intervalo demuestre que lo
  suelta.** Lo escribí a mano en dos sitios contando los temporizadores vivos, y el
  día que otro componente monte uno, nada le va a exigir lo mismo.
- **Nada obliga a que una región viva nueva tenga nombre propio** (deuda 114). Ya
  van seis regiones en la app y la convención sólo vive en los JSDoc.

---

## Alcance: lo que NO toqué

- **El backend, ni una línea.** `git status` no tiene ni un archivo de
  `src/features/**/api/`, `src/app/api/**` ni `src/features/**/schema.ts`.
- **`feature_list.json`.** #21 sigue `in_progress`: **no la marco `done`**, eso
  pasa después de la review.
- **`progress/deudas.md`.** La deuda nueva se queda en este informe, como se pidió.
- **No abrí un cuarto clon de cliente HTTP** (E1(h)): las siete acciones nuevas
  viven en `projects-client.ts`, con el molde que ya tenía.

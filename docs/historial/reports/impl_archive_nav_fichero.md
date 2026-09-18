# impl — `ArchiveNav` al modelo fichero (corrección de la feature #13 `ui_shell_nav`, RFC-01 §3 D4)

> **Estado de la feature:** #13 sigue `done` en `feature_list.json`. **No se tocó ese archivo**
> (mismo precedente que la corrección de #14 `ascii_yarn`).
> **Nota de higiene:** en este informe no se escribe ni una sola clase de Tailwind literal —
> las utilidades se describen en palabras (ver `progress/informs/6.informe-bugfix-tailwind_source_guardrail.md`).

---

## 1. Qué cambié y dónde

| Archivo | Qué |
|---|---|
| `src/app/globals.css` | Retirados los tokens del modelo de fila; declarados los del fichero; rampa de profundidad en el bloque de z-index. |
| `src/shared/ui/layout/archive-nav/archive-nav.variants.ts` | Reescrito entero: hoja, superficie de la hoja, carril de pestañas, pestaña y superficie compartida. |
| `src/shared/ui/layout/archive-nav/ArchiveNav.tsx` | Reescrito el markup: banda superior (wordmark + utils) + cajón full-bleed de 6 hojas apiladas. Firma pública intacta. |
| `src/shared/ui/layout/archive-nav/archive-nav.tokens.test.ts` | **Nuevo.** Verifica los invariantes geométricos y **mide el contraste de verdad** (12 tests). |
| `src/shared/ui/layout/layout.test.tsx` | 2 tests nuevos + 1 reescrito (el del `transition`, que ahora vive en otro nodo). |
| `progress/current.md` | Anotación de la sesión (protocolo del arnés). |

No se tocó: `BottomNav`, `nav-items.ts`, `isRouteActive`, `template/**`, `--nav-height`, `--z-nav`,
`AppShell`, ni los dos guardrails (`no-hardcode.test.ts`, `canonical-tailwind-classes.test.ts`).

### Estructura resultante (los 10 invariantes de D4)

```
header  (alto = --nav-height, posicionado, sin recorte)
├── banda superior  (absoluta arriba, no captura el puntero salvo en sus extremos)
│   ├── wordmark          (izquierda)
│   └── utils             (derecha, ancho reservado por token: usuario + "Salir")
└── nav  (absoluta abajo, a todo el ancho, columna INVERTIDA)
    └── a  ×6  = la HOJA           ← caja fija de un canto; profundidad por token
        └── span = la SUPERFICIE   ← adelgaza y se despega en hover; sombra hacia arriba
            └── span = el CARRIL   ← rejilla de 6 columnas entre los dos márgenes
                └── span = la PESTAÑA  ← cuelga hacia arriba, lockup en dos líneas
```

| # | Invariante D4 | Cómo se cumple |
|---|---|---|
| 1 | contenedor en columna | el `nav` es una columna (invertida, ver §3.2) |
| 2 | hojas full-bleed | el `nav` está anclado a los dos lados del shell y cada hoja ocupa el 100% |
| 3 | canto de altura fija por token | `--nav-leaf-height` = 10px; 6×10 + 44 de pestaña = **104** = `--nav-height` exacto (test) |
| 4 | escalonado por apilamiento | ningún desplazamiento por ítem: el escalón *es* la suma de los cantos |
| 5 | primera hoja abajo, z decreciente hacia arriba | columna invertida + `--z-nav-leaf-1..6` (6→1) (test) |
| 6 | la pestaña cuelga del canto | la superficie alinea su contenido al final y la pestaña (44px) desborda hacia arriba |
| 7 | pestañas a x creciente, sin tocarse, rampa derivada | rejilla de 6 columnas iguales sobre el ancho disponible; cada pestaña arranca en la suya y **no puede** salirse de ella |
| 8 | hover sin reflow | la superficie pierde 8px de alto y gana 8px de hueco: el stack mide siempre lo mismo (test) |
| 9 | profundidad por sombra hacia arriba | `--shadow-nav-leaf` con la `y` **negativa** (test) + dos pistas de apoyo, ver §3.1 |
| 10 | la activa se funde con la página | la activa cae al tono `--bg` y lleva `aria-current="page"` |

---

## 2. Tokens: creados, retirados, resignificados

**Creados** (todos en `@theme` de `globals.css`):

| Token | Valor | Para qué |
|---|---|---|
| `--nav-leaf-face` | `var(--brand-brown)` | cara de las 6 hojas. **Cero colores nuevos**: reusa la paleta |
| `--nav-leaf-edge` | cream al 42% | filo superior del canto (la pista que hace legible el apilado) |
| `--nav-tab-prefix` | el hex que antes se llamaba `--folder-prefix` | color del prefijo del lockup (renombrado, mismo valor) |
| `--nav-leaf-height` | `10px` | canto visible en reposo (medido 1:1 de la referencia) |
| `--nav-leaf-height-hover` | `2px` | alto de la hoja al salir del cajón |
| `--nav-leaf-gap-hover` | `8px` | hueco que compensa exactamente ese adelgazamiento |
| `--nav-utils-width` | `168px` | ancho reservado a usuario + "Salir" |
| `--nav-tab-inset-end` | `calc(--nav-utils-width + --space-6)` | fin de la rampa de pestañas. **Derivado**, no escrito a mano |
| `--shadow-nav-leaf` | `6px -5px 7px` negro al 55% | sombra hacia **arriba** (mecánica de la referencia, valor calibrado) |
| `--shadow-nav-leaf-edge` | filo interior superior de 1px con `--nav-leaf-edge` | el filo, como sombra interior (sigue el redondeo de la pestaña) |
| `--z-nav-leaf-1..6` | `6,5,4,3,2,1` | rampa de profundidad dentro del contexto del nav |
| `--z-nav-band` | `7` | la banda de wordmark/utils, por delante de las 6 hojas |

**Retirados** (los derogaba D4 y nadie más los consumía — verificado en
`explore_archivenav_blast_radius.md` §2): la rampa tonal de 6 pasos, el solape horizontal, la
elevación del hover viejo, las dos alturas de cuerpo de carpeta, las dos sombras de relieve
(`tab`/`body`), sus dos colores de relieve y la sombra de hover de carpeta.

**Resignificado:** `--folder-prefix` → `--nav-tab-prefix` (mismo valor; el prefijo `.knit` sigue
siendo el mismo lockup, sólo cambia de familia de nombres).

**Queda vivo pero sin consumidor:** `--shadow-paper`. Es un token general del SDD (sección de
sombras, no de navbar) y su signo/alfa también apuntan al modelo viejo; no lo borro porque no me
pertenece — lo dejo anotado como deuda menor.

---

## 3. Las tres decisiones que me tocaba resolver

### 3.1 La sombra sobre fondo oscuro — **por qué la sombra sola es imposible, con números**

Medí (no “a ojo de código”) con la fórmula de luminancia relativa de WCAG, componiendo alfa sobre
el color de debajo. Script reproducible: la misma matemática está dentro de
`archive-nav.tokens.test.ts`, así que los números se re-verifican en cada `bash ./init.sh`.

| medición | ratio |
|---|---|
| **negro OPACO sobre `--bg`** | **1.408** ← *techo teórico de cualquier sombra negra* |
| sombra de la referencia (negro al 6%) sobre la cara | 1.069 |
| rampa tonal actual (`#382a1e` vs `#423427`) | 1.154 |
| **cara de la hoja vs. página** (nuevo) | **1.604** |
| **filo superior sobre la cara** (nuevo) | **2.791** |
| filo superior sobre la página | 3.491 |
| **núcleo de la sombra sobre la cara** (nuevo) | **1.755** |

La lectura es contundente: `--bg` (#33241a) tiene una luminancia relativa de **0.0204**, tan baja
que **oscurecerla no puede pasar de 1.41:1 ni con negro opaco**. Portar el 6% de la referencia da
1.07 — indistinguible, exactamente el riesgo que se me señalaba. Y la rampa tonal vieja daba 1.15,
o sea también invisible: retirarla no pierde nada.

**Solución adoptada: se porta la mecánica, se reparte la profundidad en tres pistas.**

1. **Dirección y forma de la sombra: idénticas a la referencia** (mismo desplazamiento `6px -5px`,
   mismo desenfoque `7px`, hacia arriba, sin bordes duros). Sólo se sube la opacidad del 6% al 55%,
   que es lo que hace falta para dar 1.755 sobre la cara.
2. **Filo superior de 1px** en cada canto (lo que el encargo autorizaba explícitamente): cream al
   42%, **2.79:1** contra la cara. Es la pista que de verdad separa una hoja de la siguiente. Nace
   del token que ya existía para el relieve, sólo que aquel estaba al 12% (≈1.4:1, invisible).
3. **Una sola tonalidad de cara para las 6**, no una rampa: `--brand-brown`, que ya está en la
   paleta. **1.60:1** contra la página, lo que hace dos cosas de una vez: el cajón se lee como
   material sobre la página, y la hoja activa —que cae a `--bg`— se distingue clarísimo de las
   otras cinco sin necesidad de acento adicional.

Esto respeta el SDD §0 (“Soft Glossary aporta estructura e interacción, **no** su minimalismo
B/N”): la mecánica es de la referencia, la piel es Hill House y **no se inventó ni un color**.
Se aparta de la letra del invariante 9 (“ni un borde”) en el punto 2, que es precisamente la
desviación que el encargo autorizaba por escrito; los tres ratios quedan clavados en tests para que
nadie los baje sin enterarse.

### 3.2 z-index y offset por índice

**z-index: opción B (rampa explícita de tokens), y no por gusto de ser explícito — por a11y.**
La opción A (invertir el orden del DOM y dejar que el contexto de apilamiento del filtro haga el
resto) funciona, pero el orden del DOM **es** el orden de lectura de un lector de pantalla y el
orden de tabulación: invertirlo dejaría el nav recorriéndose de Stash a Dashboard. En su lugar el
DOM va en el orden de la lista y la columna se invierte por CSS (la primera hoja cae abajo), con la
profundidad declarada aparte por token. Hay un test que fija el orden del DOM, así que si alguien
vuelve a la opción A el guardrail salta.

La profundidad **no es decorativa**: la pestaña de cada hoja cruza por encima de los cantos de las
hojas que tiene arriba, así que sin la rampa el efecto de carpeta se rompe.

**Offset horizontal: opción A (rejilla de columnas), cero tokens de offset.** El carril reparte el
ancho disponible en tantas columnas como páginas y cada pestaña ocupa la suya.
> **Errata (segunda ronda).** En la primera ronda esto era falso: el carril fijaba **siempre** seis
> columnas y la posición se calculaba con un módulo, así que con más de seis ítems dos pestañas
> caían en la misma columna. Corregido en §8.3; la frase de arriba ya describe el código real. Es literalmente
“derivado”, no seis números a mano, y **por construcción una pestaña no puede invadir la columna
vecina** (se recorta antes). Descarté el mapa de seis márgenes: son seis valores que alguien tiene
que recalcular a mano cada vez que cambia una etiqueta o el ancho reservado.

### 3.3 Colisión de la pestaña más alta con los utils

Resuelto **por padding derivado de token, no por números**: el carril arranca tras el margen del
shell y termina en `--nav-tab-inset-end`, que es literalmente `ancho de los utils + margen`. Como
la caja de los utils usa **ese mismo** `--nav-utils-width`, el final del carril y el principio de
los utils **coinciden por construcción a cualquier ancho de ventana**: no hay forma de que se
solapen aunque se cambie el token.

Dos cosas más que salieron al medirlo:

- **El wordmark no necesita reserva.** La pestaña de la primera hoja es la más baja (su borde
  inferior toca el fondo del nav) y las que suben hasta la altura del wordmark están ya en la mitad
  derecha del carril. Reservarle ancho a la izquierda habría malgastado ~190px de rampa. Lo único
  que hacía falta era **acortar el wordmark en tablet**: su segunda línea (la de mono) sólo aparece
  en desktop, y así en 768px la banda superior queda 11px por encima de la pestaña más alta que
  pasa por ahí.
- **“CALCULADORAS”** (la más larga) entra entera con el lockup **en dos líneas** —prefijo en serif
  itálica arriba, palabra en sans mayúscula debajo—, que es además la forma que tiene la pestaña en
  la referencia (una columna centrada). En una sola línea no entraba: pedía ~152px de columna y en
  1180px sólo hay ~160px, sin margen. En dos pide ~124px. La pestaña mide exactamente un objetivo
  táctil de alto, lo que de paso cierra el presupuesto vertical en 104px clavados.

---

## 4. Tests

**Preservados sin tocar** (comportamiento y a11y): landmark con nombre, 6 enlaces, `aria-current`
por ruta incluidas subrutas, raíz sólo con coincidencia exacta, nombre de usuario visible, "Salir"
dispara el callback, y los tres de `axe` (ArchiveNav, BottomNav, AppShell).

**Reescrito (1):** el test de que la transición es CSS declarativa. Antes miraba la caja del enlace;
ahora el hover vive en la superficie de dentro (ver §5), así que mira ese nodo. La intención del
test es la misma y el literal que busca es idéntico al de antes (no introduje ningún nombre de
clase nuevo en un archivo de test).

**Nuevos en `layout.test.tsx` (2):** una hoja por página **en el orden de la lista** (fija la
decisión de a11y de §3.2) y una pestaña por hoja con su etiqueta.

**Nuevo archivo `archive-nav.tokens.test.ts` (12):** los invariantes que son de tokens, no de
píxeles — la sombra apunta hacia arriba, el hover compensa exacto, el presupuesto vertical entra en
el alto del nav, la pestaña llega al objetivo táctil, la reserva de los utils está derivada, hay una
profundidad por página, la rampa decrece estrictamente, la banda va por delante, y **los tres
contrastes de §3.1**, más un test que deja constancia de que una sombra negra sola no llegaría a
1.5:1 sobre este fondo. Es la respuesta a “verificá el contraste de verdad”: si alguien baja el filo
o aclara el fondo, el test cae.

Balance: **385 → 399** tests. **No eliminé ninguno.**

---

## 5. Decisiones no obvias (para el reviewer)

1. **El enlace no cambia de tamaño; cambia la superficie de dentro.** La referencia aplica el
   adelgazamiento al mismo elemento que recibe el puntero, y eso tiene un defecto: al encoger, el
   borde inferior se escapa de debajo del ratón, el hover se apaga, el elemento vuelve a crecer y
   se enciende otra vez (parpadeo). Aquí la caja del enlace mide siempre un canto —el área sensible
   nunca cambia— y quien adelgaza y se despega es una superficie interior. El resultado en pantalla
   es idéntico al medido en la referencia (el borde superior se queda quieto, la pestaña sube 8px,
   el stack no se mueve) y la mecánica del invariante 8 se mantiene tal cual: alto que baja + hueco
   que sube, compensados.
2. **⚠️ El orden del cajón NO se reordena por ruta.** D4 dice “la hoja activa/**primera** va abajo”,
   y el párrafo de wordmark/utils da por hecho que la pestaña activa es la más baja y la más a la
   izquierda. Eso es cierto en la referencia porque su activa siempre es la primera. Con 6 rutas
   reales, llevar la activa al fondo obligaría a reordenar el cajón en cada navegación: las 6
   pestañas cambiarían de sitio al cambiar de página, que es justo lo que un nav no debe hacer
   (memoria espacial). **Implementé el orden estable**: la posición la fija la lista de páginas y la
   activa se marca por tono (`--bg`, fundida con la página), color de acento en la etiqueta y
   `aria-current`. La geometría no sufre: la pestaña de cada hoja sólo cruza sobre las hojas que
   tiene *encima*, así que el efecto carpeta se sostiene esté donde esté la activa. **Es la única
   desviación de la letra de D4 y quiero que el reviewer/leader la confirme explícitamente.**
3. **La banda superior no captura el puntero** salvo en sus dos extremos (wordmark y utils), para
   que las pestañas altas que pasan por debajo sigan siendo clicables.
4. **El foco visible se dibuja sobre la pestaña, no sobre el canto.** El enlace es una tira de 10px
   a todo el ancho: un contorno ahí sería una raya inútil. El contorno lo pinta la pestaña cuando su
   enlace recibe el foco por teclado, con los mismos tokens de foco de siempre.
5. **Corrección de paso: el botón "Salir" era ilegible.** El botón fantasma pinta su texto con el
   color de primer plano *claro* (para superficies crema), y el archivero es espresso: texto
   espresso sobre espresso. Se le pasa el color inverso desde el nav. Es un defecto real
   preexistente dentro del componente que estaba reescribiendo, no un cambio de alcance.

---

## 6. Verificación (salida literal)

`bash ./init.sh`:

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  40 passed | 1 skipped (41)
      Tests  399 passed | 6 skipped (405)
   Start at  16:57:24
   Duration  106.08s

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

Baseline 385 passed | 6 skipped → **399 passed | 6 skipped** (+2 de comportamiento, +12 de tokens).
Ningún test eliminado.

`pnpm build`:

```
✓ Compiled successfully in 26.7s
✓ Generating static pages using 3 workers (12/12) in 1014ms
```

**Guardrails, corridos aparte y sin tocarlos** (`globals-css.test.ts` es obligatorio tras tocar
tokens; es el que atrapó el bug que tumbó la app):

```
$ vitest run globals-css.test.ts no-hardcode.test.ts canonical-tailwind-classes.test.ts
                archive-nav.tokens.test.ts layout.test.tsx
 Test Files  5 passed (5)
      Tests  83 passed (83)
```

**Comprobación del CSS emitido** (build de producción, `.next/static/chunks/*.css`): las utilidades
nuevas existen y emiten exactamente la declaración esperada — profundidad por token ×6, alto y
fondo de la hoja, filo como sombra interior, sombra como propiedad de filtro (**no** convertida a la
utilidad de sombra proyectada: no son equivalentes, §2 del informe de expresión en Tailwind), las
dos variantes de hover, la lista de propiedades a transicionar, la columna de la pestaña y el
relleno derecho derivado. Los tokens del modelo de fila **no aparecen** en el CSS (0 ocurrencias).

---

## 7. Deuda y dudas abiertas

1. **Confirmar la decisión §5.2** (orden estable del cajón vs. la letra de D4). Es lo único donde me
   aparté del contrato.
2. **Entre 768 y ~1000px de ancho, la etiqueta más larga se recorta.** Con wordmark + utils + 6
   etiquetas en 104px de alto no hay ancho para todo: por debajo de ~1000px la columna de cada
   pestaña cae por debajo de lo que pide “CALCULADORAS”. Degrada limpio (nunca se solapan, se
   recorta con puntos suspensivos y se completa sola al ensanchar), pero tablet es co-primario en
   RFC-01 §2, así que lo dejo señalado. Si molesta, la palanca barata es reducir el wordmark a un
   monograma por debajo de desktop: libera ~110px de rampa.
3. **`--shadow-paper` queda sin consumidor** y con el signo de sombra del modelo viejo. No lo toqué
   por no pertenecer al archivero.
4. **La fidelidad visual sigue siendo revisión humana** (SDD §9): aquí se verificó comportamiento,
   a11y, tokens, contraste calculado y CSS emitido. Los píxeles los valida el leader en el navegador.

---

# 8. Segunda ronda — correcciones tras la review

> Entrada: `progress/reports/review_archive_nav_fichero.md` (rechazo **por contrato**, no por
> calidad) + las enmiendas **E1/E2/E3** que el leader añadió a `RFC-01-shell.md` §3 D4.
> Lo aprobado en la primera ronda —calibración del contraste, aritmética del hover, rampa de
> profundidad, reparto del carril entre márgenes, presupuesto vertical y los tests nuevos— **no se
> tocó**. Las secciones 1-7 de arriba se conservan tal cual, salvo la errata marcada en §3.2.

## 8.1 E1 — la activa se marca en su sitio (invariantes 5 y 10)

El orden estable quedó **confirmado** por el usuario, pero eso invalidaba cómo marcaba yo la activa:
pintar la **hoja** entera del tono de la página sólo se lee como “fundida” cuando la activa es la de
más abajo; en las otras cinco rutas era un agujero en mitad del cajón.

**Qué cambié:** la cara de las seis hojas es ahora siempre la misma —también la de la ruta activa— y
la marca se mudó a la **pestaña**: tono de página + etiqueta en acento + `aria-current`. En el
código eso es la desaparición de la superficie compartida entre canto y pestaña: el canto lleva su
cara fija y la variante de activa vive sólo en la pestaña y en la etiqueta.

**La decisión que se me pedía justificar —tono de página vs. filo de acento— la resolvió el
contraste, no el gusto:**

| medición | ratio | lectura |
|---|---|---|
| etiqueta en acento sobre **tono de página** (lo implementado) | **4.684** | pasa el mínimo de texto normal (4.5) |
| etiqueta en acento sobre la **cara de la hoja** (la alternativa del filo) | **2.920** | **no** lo pasa |
| tono de página vs. cara de la hoja | 1.604 | la pestaña activa se distingue de las otras cinco |
| etiqueta inactiva (crema) sobre la cara | 7.998 | referencia: las inactivas van sobradas |

O sea: la alternativa “acento + filo de acento conservando la cara” **degradaba la accesibilidad del
único ítem que importa**, la página en la que estás. Con el tono de página en la pestaña, el acento
sube a 4.68 y cumple. Los tres números están clavados en tests (uno de ellos afirma explícitamente
que sobre la cara **no** llegaría: es la razón de la decisión, escrita como test).

Sobre el riesgo que señalaba el encargo (que la pestaña activa se vuelva invisible contra la banda,
que también es oscura): pasa sólo en la mitad alta del cajón, y ahí la pestaña sigue perfectamente
delineada por su **filo superior** (3.49:1 contra el tono de página) y por su sombra; además la
etiqueta en acento está dentro. En la mitad baja —donde la pestaña se recorta sobre hojas marrones—
el efecto es justo el buscado: un hueco abierto hasta la página.

**Test nuevo:** renderiza dos veces la misma ruta-no-activa/activa y compara: la **pestaña** de esa
hoja cambia de clase, la **hoja** no, y las seis hojas siguen siendo idénticas entre sí. No cita ni
una clase: compara dos renders.

## 8.2 E2 — las 6 etiquetas enteras desde 768px

Ya no es deuda. Apliqué las tres palancas que eligió el usuario y cerré la cuenta **por derivación
de tokens**, con test:

1. **Nombre de usuario oculto por debajo de desktop** (queda sólo "Salir") y **botón con relleno
   reducido** en tablet: la reserva de los utils pasa de 168px a **72px** por debajo de desktop.
   Es la palanca que de verdad devuelve ancho al carril: **+96px**, 16px por columna.
2. **Monograma en vez de wordmark completo** por debajo de desktop. Honestidad: en este layout el
   wordmark **no** reserva ancho de carril (el carril arranca en el margen del shell, porque la
   pestaña más baja pasa por debajo del wordmark), así que el monograma **no da ancho**: lo que da
   es holgura **vertical**, que es lo que evita que las pestañas de las columnas 2-3 rocen la banda
   en tablet. Lo implementé igual porque es decisión del usuario y porque esa holgura es real.
3. **Etiqueta más chica y con menos interletrado sólo en tablet, por token**: dos tokens nuevos
   (un tamaño un punto por debajo del menor de la escala y un interletrado a la mitad del de
   etiqueta), que en desktop se sustituyen por los de la escala normal mediante la variante
   responsive.

**La cuenta, rehecha por el test a partir de los mismos tokens que consume el componente** (reserva
de utils, márgenes del carril, relleno de la pestaña, tamaño y tracking de la etiqueta) y del texto
real de `NAV_ITEMS`:

| | carril útil | columna | texto por pestaña | necesita la etiqueta más larga | holgura |
|---|---|---|---|---|---|
| **768px (tablet)** | 648px | 108.0px | **100.0px** | **92.4px** | **+7.6px** |
| **1180px (desktop)** | 964px | 160.7px | 136.7px | 107.0px | +29.6px |

El “necesita” usa una **cota superior conservadora** del avance de una mayúscula (0.72 em) porque un
test sin motor de fuentes no puede medir el ancho real; está documentado en el test como la palanca
a revisar si cambia la tipografía. Al ser cota superior, si el test pasa el texto entra.

**Ancho mínimo garantizado: `--bp-tablet` (768px)**, que es exactamente donde nace el archivero —o
sea, en todo el rango en el que el componente existe. Por debajo manda el `BottomNav`. La garantía
no es un número afinado a ojo: sale de dividir el carril entre los ítems y compararlo con las
etiquetas reales, así que **cae sola** si alguien ensancha los utils, agranda la etiqueta o añade
una página de nombre más largo. El recorte de la etiqueta sigue en el código como red de seguridad
para consumidores con etiquetas arbitrarias, pero con los tokens actuales no llega a dispararse.

## 8.3 La rejilla ya no miente sobre `items`

El carril declara ahora **una columna por hoja montada** (no seis fijas) y la posición ya no se
calcula con un módulo. El cajón tiene un número finito de **ranuras** —constante exportada y
documentada— porque la geometría entera está derivada para ese número: el presupuesto vertical, la
rampa de profundidad y el ancho de columna. Con más ítems que ranuras se montan los primeros; con
menos, el carril se reparte entre los que hay. En ningún caso dos pestañas comparten columna ni dos
hojas comparten profundidad.

Mantuve la **firma pública intacta** (sigue aceptando una lista de cualquier longitud): cerrarla por
tipo a una tupla de seis habría obligado a cambiar también el tipo de `AppShell`, que está fuera de
alcance. Cada hoja publica su posición y el carril su número de columnas como atributos de datos,
así que el contrato es observable desde fuera y desde los tests.

**Tests nuevos (2):** con nueve ítems se montan seis hojas con posiciones 1..6 **todas distintas**;
con tres ítems el carril declara tres columnas.

## 8.4 El comentario que explicaba mal el mecanismo

Corregido: el filtro que crea contexto de apilamiento está en la **superficie interior**, no en la
hoja, así que la frase que lo daba como motivo desapareció. El comentario conserva el motivo real y
suficiente para no invertir el DOM: **ese orden es el de lectura y el de tabulación**, y el nav tiene
que recorrerse en el orden de la lista de páginas.

## 8.5 E3 — sin cambios

El filo de 1px se queda tal cual. D4 ya está enmendado (la profundidad la reparten la sombra hacia
arriba **y** el filo; lo prohibido es el escalón tonal **entre hojas**). No deshice nada.

## 8.6 Verificación de la segunda ronda

`bash ./init.sh`:

```
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  40 passed | 1 skipped (41)
      Tests  408 passed | 6 skipped (414)
   Start at  20:05:35
   Duration  61.50s

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

Baseline de esta ronda 399 → **408 passed | 6 skipped**. **+9, ninguno eliminado**: 3 de
comportamiento (activa marcada en su pestaña, ítems de más, ítems de menos) y 6 de tokens (3 del
presupuesto horizontal de E2, 3 del criterio de contraste de E1).

`pnpm build`:

```
✓ Compiled successfully in 16.9s
✓ Generating static pages using 3 workers (12/12) in 940ms
```

Guardrails **intactos y verdes sin tocarlos**. Un apunte: `no-hardcode.test.ts` me **cazó en
caliente** durante esta ronda —había escrito el ancho de tablet como medida literal dentro de un
comentario del archivo de variantes—; lo reescribí en palabras y volvió a verde. El guardrail hace
su trabajo.

**CSS emitido, verificado en el build de producción:** las dos utilidades tipográficas nuevas
existen y emiten lo que deben (tamaño de fuente e interletrado desde su token, no una clase muerta
—esto era el riesgo real de la solución de E2: una clase que no compila dejaría la garantía de
ancho en una mentira), el relleno del carril sale de los tokens de reserva en sus dos variantes, y
todas las variantes de desktop caen dentro de la media query del breakpoint de desktop.

## 8.7 Qué queda abierto tras esta ronda

- La deuda 7.2 de la primera ronda (**recorte en tablet**) queda **cerrada** por E2.
- Siguen vivas, y el leader las registra en el estado de la sesión: `--shadow-paper` sin consumidor
  y la variante fantasma del `Button` ilegible sobre superficies oscuras (aquí sólo está parcheada
  desde el nav).
- Nuevo, menor: con el nombre de usuario oculto por debajo de desktop, en tablet los utils son sólo
  el botón de salir. Es la decisión del usuario para E2, pero conviene que quien diseñe el menú de
  cuenta más adelante sepa que el nombre no está visible en ese rango.
- La validación visual en navegador sigue pendiente y sigue siendo del leader.

---

# 9. Tercera ronda — los 5 defectos de la revisión visual (E4-E7)

> Entrada: 5 defectos reportados por el usuario en el navegador y reproducidos por el leader con el
> MCP de Chrome, más la segunda tanda de enmiendas del RFC (**E4-E7** + invariantes **8** reescrito y
> **8-bis** nuevo). Secciones 1-8 se conservan; esto es lo que cambia sobre ellas.

## 9.1 El área sensible (invariante 8-bis) — la causa raíz

El carril de pestañas era un `grid` **a todo el ancho y tan alto como la pestaña** que capturaba el
puntero en sus **5 columnas vacías**. Como la profundidad decrece hacia arriba, el carril de la
primera hoja (el de mayor profundidad) se comía la franja inferior entera: apuntar a cualquier
pestaña activaba *Dashboard*.

**Arreglo:** el carril deja de recibir el puntero; lo recibe **la pestaña**. Es un cambio de dos
clases, pero la causa merece quedar escrita: **un contenedor de rejilla es un rectángulo, no la
silueta de su contenido**, y con 5 de 6 celdas vacías ese rectángulo era casi todo el nav.

Quién recibe el puntero ahora, en orden de pintado: la **pestaña** (arriba del todo en su columna) y
el **canto de 10px de su propia hoja**. El canto lo permite el invariante 8-bis explícitamente, y lo
mantengo a propósito por lo que explico en 9.2. Ninguna zona vacía activa nada: donde antes había
carril vacío, ahora el impacto cae en el canto de la hoja que **de verdad** está en esa `y`.

**Test:** recorre las 6 hojas y exige que el carril lleve la utilidad que **desactiva** el puntero y
la pestaña la que lo **reactiva**. Sin motor de layout no hay `elementFromPoint` posible, así que se
verifica el contrato que produce el comportamiento; los nombres de clase se **arman por
concatenación** para no sembrar utilidades reales en el CSS desde un test.

## 9.2 E5 — en el hover sube sólo la pestaña

El canto ya no encoge: eso abría un hueco de 8px que enseñaba la textura del fondo a todo el ancho.
La referencia puede hacerlo porque su hoja es **transparente sobre página blanca**; la nuestra es
**opaca**, así que el mismo gesto producía un agujero en vez de una ficha levantada.

Ahora la pestaña sube un salto por token y el canto no se mueve. La propiedad de **cero reflow** pasa
a ser trivial (nada en el flujo cambia de tamaño: el desplazamiento es puramente de pintado) y la
degradación con movimiento reducido sigue saliendo gratis de la media global.

**Detalle no obvio que fija un test:** el salto tiene que ser **menor o igual que el canto**. Al
subir, la pestaña libera una franja en su parte baja; si esa franja quedara por debajo del canto de
su hoja, no habría nada que reciba el puntero, el hover se apagaría solo y la pestaña volvería a
bajar — parpadeo infinito. Con el salto ≤ canto, la franja liberada cae **dentro** del canto, que sí
recibe el puntero. Por eso el canto sigue siendo sensible (9.1).

## 9.3 E6 + E4 — etiqueta grande y el ancho al que nace el archivero

Son **el mismo problema**: el tamaño de la etiqueta *determina* el ancho mínimo, porque 6 columnas
iguales tienen que dar cabida a la etiqueta más larga.

| tamaño de etiqueta | ancho mínimo del shell para las 6 enteras |
|---|---|
| 11px (lo que había) | ~700px |
| **18px (implementado)** | **~1132px → nace en 1180** |
| 24px | ~1344px |
| 32px | ~1750px |

Elegí **18px**: es el tamaño **de la escala** (no un valor inventado) que hace nacer el archivero en
**1180px**, o sea en cualquier desktop. Con 24px el archivero desaparecería de los portátiles de
1280-1366px, que se quedarían con un nav de móvil: me pareció un precio demasiado alto para un ítem
que no me toca decidir a mí. **Es una palanca de dos tokens** (el tamaño y el ancho de nacimiento) y
el test exige que se muevan juntos, así que subirlo a 24px es un cambio de dos líneas — con el coste
de arriba, que dejo explícito para que lo decida quien corresponda.

Cuentas finales, todas rehechas por el test desde los tokens: carril **1132px** → columna **188.7px**
→ texto disponible **172.7px** contra **167.5px** que pide "CALCULADORAS" con la cota conservadora de
avance. A 768px ese mismo cálculo da **104px** disponibles contra los mismos 167.5: por eso el
archivero **no puede** nacer ahí, y hay un test que lo afirma.

**Impacto de E4 (lo que se me pidió investigar antes de aplicar): contenido.**

- **Tokens de breakpoint:** añadí el par nuevo **en los dos juegos** (`--bp-archive` para leer desde
  JS/tests y `--breakpoint-archive` para generar la variante responsive). Son dos porque las media
  queries no resuelven variables — es exactamente la deuda 18. **No toqué `--bp-tablet`**: sigue en
  768px y sigue siendo lo que usa la capa 3D para decidir si monta la escena, que no tiene nada que
  ver con el nav. Hay un test nuevo que exige que el par nuevo esté sincronizado.
- **`BottomNav`:** una sola clase, su gate de visibilidad, y su comentario de cabecera. Su interior
  no se tocó.
- **Tests que dependían del ancho:** ninguno. Ningún test asertaba las clases de breakpoint de los
  navs; el único que lee un breakpoint es el de la capa 3D, que usa el de tablet y no cambia.
- **Efecto colateral aceptado:** entre 768 y 1180px ahora manda el `BottomNav`. Es lo que decide E4,
  y §2 del RFC queda acotado por la propia enmienda.

## 9.4 E7(a) — el wordmark se aparta, las hojas no se recortan

Las hojas son full-bleed y eso no se negocia, así que el que se mueve es el wordmark: **una sola
línea, entera por encima de la hoja más alta**. Descarté darle superficie propia que ocluya porque
añade una placa opaca en mitad del cajón para tapar un problema que se resuelve con geometría — y
porque la ocultación por z-index es frágil: cualquier futuro cambio de profundidad la rompe, mientras
que "no ocupar esa `y`" no se puede romper por accidente.

Cae con ello el subtítulo en mono (era justo el que cruzaba) y el monograma de la segunda ronda
(existía para ganar holgura en tablet, y en tablet ya no hay archivero). **Test:** la caja del
wordmark —respiro + una línea de display con su interlineado— tiene que caber en la banda que queda
libre por encima del stack.

## 9.5 E7(b) — fuera los utils

Se ofrecía "Salir" sin sesión abierta. El bloque entero sale del nav.

**Qué hice con las props (se me pedía elegir y justificar):** las **mantengo en la firma, ignoradas y
documentadas** como reservadas para #31, en vez de quitarlas propagando el cambio a `AppShell` y al
cableado de auth. Motivo: quitarlas obliga a desmontar también el `AppShellClient` (el fetch del
usuario y el logout), que es trabajo **de** #31 y que habría que rehacer entero dentro de dos
features. Y para que "ignoradas" no sea otra vez un contrato que miente, **lo fija un test**: se le
pasan `user` y `onLogout` y se exige que no aparezca ni el nombre ni el botón, y que el callback no
se invoque.

**Bajas de tests (las autorizadas, y ninguna más):** los dos que verificaban el nombre de usuario y
el click en "Salir" **a través del nav**. Pero el mismo par existía también en
`src/features/auth/ui/AppShellClient.test.tsx`, verificando la costura con el backend a través del
DOM del nav. En vez de borrarlos ahí también —lo que habría dejado el fetch de `/api/auth/me` y el
logout **sin ninguna cobertura**— los reescribí contra un **doble del shell**: siguen probando lo
que importa (que el usuario que llega del endpoint se le entrega al shell, y que el cierre de sesión
llama al endpoint y redirige), sin depender de que el nav lo pinte. El día que #31 muestre los utils,
esa lógica sigue viva y probada.

## 9.6 Verificación de la tercera ronda

`bash ./init.sh`:

```
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  40 passed | 1 skipped (41)
      Tests  411 passed | 6 skipped (417)
   Start at  22:00:19
   Duration  38.56s

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

Baseline 408 → **411 passed | 6 skipped**. **Saldo neto por archivo:** los tests de comportamiento del
shell quedan igual en número (bajan los 2 autorizados de utils, entran 2 nuevos: utils ignorados y
área sensible del puntero); los de tokens suben de 18 a 21 (bajan el de la compensación del hover
—esa mecánica ya no existe— y los dos del régimen tipográfico doble de la segunda ronda; entran los
del salto del hover, la pestaña más alta con hover puesto, el wordmark sobre el stack, el carril
simétrico, el presupuesto a `--bp-archive`, el tamaño grande, la sincronía de breakpoints y el
"a 768 no cabría"). **Ningún archivo de test perdido.**

`pnpm build`:

```
✓ Compiled successfully in 9.2s
✓ Generating static pages using 3 workers (12/12) in 293ms
```

**CSS emitido, verificado en el build de producción** (esto era crítico: tres de los cambios son
clases nuevas que, si no compilaran, dejarían el arreglo en nada): el salto del hover emite un
desplazamiento **negativo** calculado desde su token; las dos utilidades del gate nuevo existen y
viven dentro de la media query del ancho correcto; las utilidades de captura del puntero están
emitidas; el tamaño de la etiqueta sale de su token. Además: **cero referencias huérfanas** a los
tokens retirados en todo `src/**`, y **ninguna variante de desktop queda en el nav**, así que no hay
empate de orden entre dos breakpoints del mismo valor.

Guardrails intactos y verdes sin tocarlos.

## 9.7 Qué queda abierto

- **El tamaño de etiqueta contra el ancho de nacimiento** (9.3) es la decisión que más conviene
  confirmar con el usuario: hoy 18px/1180px; ir a 24px sube el nacimiento a ~1344px y deja los
  portátiles de 1280-1366px con el `BottomNav`.
- **Entre 768 y 1180px ahora hay bottom-nav.** Es lo que dicta E4, pero conviene que la validación
  visual mire ese rango: es un tamaño de tablet en horizontal muy común.
- Siguen vivas las deudas ya conocidas: `--shadow-paper` sin consumidor y la variante fantasma del
  `Button` (que en esta ronda deja de estar parcheada desde el nav, porque el botón salió del nav:
  el defecto del primitivo sigue igual de vivo para el próximo consumidor).
- La validación visual en navegador sigue siendo del leader.

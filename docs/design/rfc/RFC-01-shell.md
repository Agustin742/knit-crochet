# RFC-01 — Shell & Navegación

- **Alcance:** el caparazón de la app (layout global, nav, capa de fondo, base de estilos). Todo lo demás cuelga de acá.
- **Estado:** borrador.
- **Proceso / arnés:** ver **[RFC-00](RFC-00-proceso.md)** (entorno de agentes, jerarquía de verdad, mapeo a `feature_list.json`). No se repite acá.
- **Fuente de verdad:** este RFC + el **contrato del template** (SDD-01). La estética sale del template (`template/`) como **insumo adaptable**, no como ley; lo único fijo "tal cual" es el **ovillo ASCII**.

---

## 1. Objetivo

Montar el shell sobre el que viven todas las páginas: base de estilos (tokens → Tailwind + fuentes),
`AppShell`, navegación **archivero** en tablet/desktop, **bottom-nav** en mobile, la **capa de fondo**
(textura + ovillo ASCII) y los **route groups** público/privado.

## 2. Decisiones que fija este RFC (de las 40 respuestas)

- **Nav = 6 páginas** en este orden: Dashboard · Proyectos · Lanas · Patrones · Calculadoras · **Stash** (hub).
- **Tablet + desktop = archivero**; **mobile = bottom-nav** (co-primarios tablet/desktop, mobile secundario).
- **Landing post-login = Dashboard.**
- **Auth = pantalla limpia, sin archivero**; ~~ovillo ASCII de fondo **solo en login** (no en register)~~
  → **DEROGADO el 2026-08-07 por el rediseño del usuario (`bdb11b0`), registrado en la enmienda E12.**
  Las **dos** páginas montan el ovillo, y **no como fondo**: es una **celda de una rejilla de dos
  columnas, en el flujo**, junto al formulario. La asimetría deliberada entre login y register **ya no
  existe**. Se tacha en vez de borrarse para que nadie lea la versión vieja dentro de tres meses y lo
  "arregle" al revés — el gate que la fijaba ya se reescribió a conciencia (deuda 116) y lleva el mismo
  aviso dentro. Comportamiento responsive de esa rejilla: **E12 (a)**.
- **Ovillo ASCII** = hero (Dashboard) + loader global. Gira solo **y** se puede arrastrar.

## 3. Estructura y componentes

**Base de estilos**
- Portar `template/tokens.css` a **Tailwind v4** vía `@theme` en `src/app/globals.css` (los tokens son
  la fuente única; los componentes no hardcodean).
- Fuentes self-hosted con `next/font`: **Instrument Serif** (`--font-display`/`--font-emphasis`),
  **Archivo** (`--font-body`), **IBM Plex Mono** (`--font-mono`).
- Fondo app: espresso (`--bg`) + `--texture-dots-dark`; superficies de contenido en crema + `--texture-paper`.

**Componentes (en `src/shared/ui/`)**
- `AppShell` — header (tablet/desktop) + `main` + `BottomNav` (mobile) + slot de capa 3D detrás (`--z-bg-3d`).
- `ArchiveNav` (≥ `--bp-tablet`) — 6 hojas dark-on-dark en **stack vertical de fichero** (ver **D4**;
  el modelo de pestañas en fila que describía este RFC y que implementa `.kc-folder` queda **derogado**).
  **La activa se determina por la RUTA actual** (no por scroll-spy como el template) y se funde con el
  contenido. Hover: la hoja sale del cajón. Wordmark a la izquierda; a la derecha, utils
  (usuario + logout).
- `BottomNav` (< `--bp-tablet`) — 6 accesos táctiles ≥ `--touch-target` (44px), con la activa por ruta.
- `TextureLayer` — capa de textura de fondo por token.
- Helper `cn()` (`twMerge(clsx())`).

**Capa 3D — `AsciiYarn` (`src/shared/ui/three/`)**
- Componente **React client-only** (no web component — ver decisión D1), montado con `dynamic` `ssr:false`.
  Ovillo + agujas, auto-rota y se arrastra. Va detrás del contenido (`--z-bg-3d`), `pointer-events:none`
  salvo cuando es hero interactivo.
- Con `prefers-reduced-motion` **congela la auto-rotación pero el arrastre sigue disponible** (D3).
  Se usa como **hero** (Dashboard) y **loader** global.

**Decisiones cerradas (resueltas con el usuario)**

| # | Decisión | Por qué |
|---|---|---|
| **D1** | **Componente React `AsciiYarn`**, no custom element. El nombre `<ascii-yarn>` del template queda como referencia histórica del prototipo HTML. | `AsciiEffect` **reemplaza el DOM del canvas** por su propio nodo de texto, así que el custom element no aporta nada; con Shadow DOM se perderían los tokens de Tailwind y sin él sería un elemento vacío. Además encaja con `cn()`/`cva`/RTL/`axe` del arnés. |
| **D2** | ~~`three` + R3F + `drei` con `<AsciiRenderer />`~~ → **REVISADA (ver D2-bis)**. | Decidida cuando `template/ascii-yarn.js` no existía en el repo. |
| **D2-bis** | **`three` puro**, portando el algoritmo de **`template/ascii-yarn.js`**: render a un `WebGLRenderTarget` de `cols × rows` (**1 píxel = 1 carácter**), `readRenderTargetPixels`, luminancia → rampa, y escritura a un `<pre>`. **No** se usa `AsciiEffect` ni `drei`. | El usuario entregó `template/ascii-yarn.js`, la implementación de referencia que faltaba. `AsciiEffect` promedia bloques a resolución completa y emite una `<table>` con `letter-spacing` propio: **por construcción no puede dar el mismo resultado**. RFC-01 l.6 dice que "lo único fijo tal cual es el ovillo ASCII", así que manda la referencia. Bonus: con `prefers-reduced-motion` no se arranca el `requestAnimationFrame` (un frame y listo), lo que **elimina la deuda del `frameloop="always"`**. |
| **D3** | Con `prefers-reduced-motion`: se apaga la **auto-rotación** (movimiento no solicitado), **el arrastre sigue** (movimiento pedido explícitamente por la persona). | Preserva la pieza como elemento interactivo de marca sin violar la preferencia. |
| **D4** | El `ArchiveNav` es un **stack vertical de hojas full-bleed** (modelo "fichero"), **no** una fila de pestañas solapadas. Deroga el `.kc-folder` del template para `src/**`. | Corrección de la feature **#13** tras inspeccionar **en vivo** el CSS de `softglossary.space` con el MCP de Chrome. El SDD §0 admite que esa referencia *"no respondió al fetch"* y se reconstruyó de capturas: el modelo de fila era una **inferencia equivocada**, y el template la heredó. Medición de primera mano en `progress/reports/explore_softglossary_register.md`. |

### D4 — contrato del `ArchiveNav` (modelo fichero)

Mecánica medida y números exactos: **`progress/reports/explore_softglossary_register.md`**
(leer antes de implementar; manda sobre cualquier descripción en prosa de este RFC o del SDD).

**Invariantes** (esto es lo que hay que cumplir; el *cómo* lo decide el implementer):

1. **Contenedor en columna.** Las 6 rutas son 6 **hojas apiladas verticalmente**, no una fila.
2. **Hojas full-bleed**: cada hoja ocupa el ancho completo del shell. Es lo que hace que se lea
   como un cajón de archivo y no como fichas sueltas.
3. **De cada hoja asoma un canto** de altura fija por token (paso del escalonado). Ojo a la distinción,
   porque es la trampa de este invariante: hay **6 ranuras** y se dibujan **5 cantos**. La hoja activa
   ocupa su ranura igual que las demás —no pierde alto— y lo único que no monta es la **cara** del canto
   (enmienda **E10** + su ajuste). Por eso el presupuesto vertical se cuenta en ranuras: 6 pasos + alto
   de pestaña = 6×10 + 44 = **104px exactos** = `--nav-height`. **La holgura es CERO**: no hay aire que
   repartir, y quien suba el alto del canto o de la pestaña revienta el nav y además se come el margen
   de 7.6px que E7 deja entre la pestaña de la columna 1 y el wordmark.
4. **Escalonado por apilamiento, no dibujado a mano.** El SDD §0 pide "alturas escalonadas": salen
   del stack, no de un `margin-top` por ítem.
5. **Profundidad invertida respecto a la pantalla:** la hoja de más abajo (pegada al contenido) lleva
   el **z-index más alto**; la profundidad decrece hacia arriba. **Abajo del todo va siempre la hoja
   ACTIVA**, y las otras 5 se apilan encima en el orden de la lista (enmienda **E10**, que deroga E1).
   **La columna horizontal de cada pestaña NO se reordena**: la fija el índice de la página en la
   lista, no su posición en el stack. Sólo cambia el orden vertical.
6. **La pestaña cuelga del canto de su hoja** (desborda hacia arriba) y lleva el lockup ya existente
   (prefijo `.knit` en serif itálica + palabra en sans mayúscula).
7. **Las pestañas no se solapan ni se tocan**: cada una a una **x creciente**, repartidas por el ancho
   disponible. Las 6 etiquetas se leen enteras a la vez, **desde `--bp-tablet` (768px) hacia arriba** —
   tablet es co-primario con desktop (§2), así que el invariante rige en todo el rango en el que vive
   el archivero, no sólo en desktop (enmienda E2). La rampa de offsets se **deriva de tokens**,
   nunca son 6 números a mano.
8. **Hover = sacar la ficha del cajón**: **el canto de la hoja NO cambia; sube sólo la pestaña**
   (enmienda E5). El alto del stack no cambia y **nada hace reflow**. Degrada solo con
   `prefers-reduced-motion`. **Al subir, la pestaña sigue ATADA a su hoja** (enmienda **E9**): no
   puede quedar ninguna arista visible entre la pestaña levantada y el canto del que sale.
8-bis. **El puntero lo captura la pestaña, y SÓLO la pestaña** (enmienda **E8**, que endurece E5).
   El canto a todo el ancho es **decoración inerte**: ni reacciona al hover ni navega al clic.
   Nada fuera del recuadro con el título es interactivo.
9. **La profundidad la da la sombra hacia arriba + un filo superior de 1px**, nunca un escalón tonal
   entre hojas: cada hoja proyecta sobre la que tiene detrás (y por tanto **encima** en pantalla), así
   que la `y` de la sombra es **negativa**. El filo es obligatorio sobre fondo oscuro (enmienda E3).
10. **La activa es la hoja ABIERTA: no dibuja canto y baja al fondo del cajón** (enmienda **E10**,
    que deroga E1). Su cara es el **área de contenido** de la página, que queda justo debajo. Se
    marca además con acento en la etiqueta + tono de página en su pestaña, y `aria-current="page"`.
    Conserva su columna horizontal: baja de altura, no de x.

**Wordmark y utils.** La referencia no tiene wordmark en la fila (sólo `INFO`/`IMPRINT` arriba a la
derecha), pero §3 de este RFC sí lo exige. Resolución: **wordmark arriba a la izquierda y utils
(usuario + logout) arriba a la derecha**, ambos en la banda superior; la **rampa de x de las pestañas
se reparte entre esos dos márgenes**, de modo que la pestaña más alta (la última, la más a la derecha)
no colisione con los utils. La pestaña de la **primera** hoja es la más baja y más a la izquierda, así
que queda por debajo del wordmark y no compite con él.

### Enmiendas a D4 (posteriores a la primera implementación)

Las tres nacen de la review de `progress/reports/review_archive_nav_fichero.md`. **El texto de arriba ya
está enmendado**; esta tabla explica el porqué para que nadie las "corrija" de vuelta.

| # | Qué cambia | Por qué |
|---|---|---|
| **E1** | **Invariantes 5 y 10.** El cajón **no se reordena al navegar**: el orden de las 6 hojas es fijo y la activa se marca **en su sitio** (acento + tono de página en la pestaña), no bajando al fondo. | Decisión del usuario. Reordenar el stack en cada navegación mueve las 6 pestañas de altura **y de columna** en cada clic: destruye la memoria espacial, que es justo lo que un nav no puede romper. El coste aceptado es perder el "se funde con la página sin costura", que sólo funciona cuando la activa es la de más abajo. Ojo: con orden estable **no** se puede pintar la hoja entera en `--bg`, porque una hoja del tono de la página en medio del cajón se lee como un agujero, no como la activa — el tono de página va en la **pestaña**. |
| **E2** | **Invariante 7.** "Las 6 etiquetas enteras" rige **desde 768px**, no sólo en desktop. | §2 fija tablet y desktop como **co-primarios**, y `--bp-tablet` es exactamente el ancho donde el archivero se enciende: dejarlo incumplido ahí sería nacer roto en uno de los dos tamaños principales. La review midió que a 768px se recortan **3 de las 6** etiquetas, no una. |
| **E3** | **Invariante 9.** La profundidad la reparten la sombra hacia arriba **y un filo superior de 1px**; lo que sigue prohibido es el **escalón tonal entre hojas**. | Sobre nuestro espresso, una sombra negra **opaca** techa en 1.41:1 de contraste — ninguna sombra sola separa hoja de hoja. El filo lo lleva a 2.79:1. La referencia no lo necesita porque es blanco-sobre-blanco (SDD §0: aporta "estructura e interacción, **no** su minimalismo B/N"). Los ratios mínimos están clavados en `archive-nav.tokens.test.ts`. |

### Segunda tanda de enmiendas (E4-E7) — de la revisión visual del usuario

Las cuatro nacen de defectos reportados por el usuario y **reproducidos en el navegador** por el leader.
Tres de ellas **contradicen invariantes que este mismo RFC había fijado**: están enmendadas arriba, y la
razón es siempre la misma — la referencia es **blanco sobre blanco y con 3 ítems**, y hay mecánicas suyas
que sobre una superficie **opaca, oscura y con 6 ítems** producen el efecto contrario al buscado.

| # | Qué cambia | Por qué |
|---|---|---|
| **E4** | **Invariante 7 + §2.** El archivero **deja de nacer en 768px**. Arranca al ancho al que las 6 etiquetas entren enteras **con el tamaño tipográfico nuevo de E6**; por debajo va el `BottomNav`. La garantía de "las 6 enteras" rige desde ese ancho, no desde 768. | El usuario pidió etiquetas mucho más grandes (E6) y eso es **incompatible** con meter 6 pestañas en 552px de carril útil. Entre las dos cosas eligió el tamaño. Deja **parcialmente sin efecto a E2**: la garantía no desaparece, se mueve de ancho. **Afecta a §2** ("tablet + desktop = archivero"), que queda acotado. |
| **E5** | **Invariante 8** reescrito y **8-bis nuevo.** El hover **ya no encoge la hoja**: sube sólo la pestaña. Y el área sensible es la **pestaña**, nunca una franja a todo el ancho. | Dos defectos reales, ambos reproducidos. (a) La referencia puede encoger su hoja porque su tarjeta es **transparente** sobre página blanca; la nuestra tiene **cara opaca**, así que al encoger abre un hueco que deja ver la textura de puntos — se lee como un agujero, no como una ficha que se levanta. (b) El área sensible era un **carril de rejilla de 1442×44px con 5 columnas vacías igualmente clicables**: como la profundidad decrece hacia arriba, la hoja de z-index más alto se tragaba casi todo el nav, y apuntar a una pestaña activaba **otra**. Medido con `elementFromPoint`. |
| **E6** | **Nuevo invariante tipográfico.** La etiqueta de la pestaña es **grande**, no una etiqueta de sistema. | Estaba en **11px** contra los **36px** de la referencia: menos de un tercio. El archivero perdía toda su presencia. Es el motor de E4. |
| **E7** | **Wordmark y utils.** (a) Las hojas **no pueden cruzar por debajo del wordmark**. (b) Los utils (usuario + logout) **salen del nav** hasta la feature **#31 `auth_ui`**. | (a) Las hojas de las dos últimas rutas pasaban por debajo del subtítulo del wordmark. **El invariante 2 (full-bleed) no se negocia**: se resuelve dando al wordmark superficie propia o reubicándolo por encima del stack, no recortando las hojas. (b) Se mostraba un botón "Salir" **sin ninguna sesión abierta**: se ofrecía cerrar sesión a un visitante anónimo. Los utils vuelven cuando exista la pantalla de auth que los justifica. **→ Esa condición se cumplió con #31; la vuelta la ejecuta E11, y NO al `nav`: ahí ya no caben.** |

### Tercera tanda de enmiendas (E8-E10) — de la segunda revisión visual del usuario

Las tres nacen de defectos reportados por el usuario y **reproducidos y medidos en el navegador** por el
leader (MCP de Chrome, viewport 1536px, `getBoundingClientRect` sobre cada hoja/canto/pestaña).
**E10 deroga E1**, que era una decisión explícita del usuario: se revierte por decisión del mismo usuario,
con el coste asumido y documentado abajo.

| # | Qué cambia | Por qué |
|---|---|---|
| **E8** | **Invariante 8-bis endurecido.** El hover **y el clic** son de la **pestaña y sólo la pestaña**. El canto full-bleed pasa a decoración inerte. Cae la coletilla de E5 que permitía "más, si se quiere, el canto de 10px". | E5 dejó el canto como área sensible **opcional** y la implementación se la tomó entera: el `group` quedó en la hoja completa (1536×10px a todo el ancho) y el lift de la pestaña colgaba de `group-hover`. Resultado medido: pasar el puntero por **cualquier punto de la franja horizontal** levantaba la pestaña de esa hoja, aunque el puntero estuviera a 1400px de ella. Además la franja entera navegaba, o sea un enlace invisible sin ninguna señal visual. |
| **E9** | **Invariante 8 completado.** Al levantarse, la pestaña debe seguir **atada** a su hoja: ninguna arista visible entre la pestaña y su canto. | Defecto reproducido en Dashboard. Geometría medida: la pestaña va de y=60 a y=104 y su propio canto de y=94 a y=104, o sea **en reposo la pestaña tapa su canto entero**. Al subir los 8px de `--nav-tab-lift` destapa la franja 94–104 y con ella aparece el **filo claro de 1px** del canto (`--shadow-nav-leaf-edge`, un `inset 0 1px 0` al 42%) cruzando justo por debajo de la pestaña. Esa raya que antes no estaba es lo que la hace leerse como "flotando suelta". |
| **E10** | **Invariantes 3, 5 y 10 (deroga E1).** Se dibujan **5 cantos, no 6**: la hoja **activa** no dibuja canto y **baja al fondo** del cajón, apoyada en el contenido. El área de contenido **es su cara**. La **columna horizontal** de cada pestaña queda fija por el índice de la página en la lista: sólo cambia el orden **vertical**. | Decisión del usuario. El área de contenido ya se lee como una hoja más, así que con 6 cantos el cajón muestra **7 hojas para 6 páginas** — el usuario lo reportó como "hay un canto de más, sin título". Verificado que **no** había una 7ª caja: hay exactamente 6 barras opacas full-width, una por página; el sobrante es el propio contenido. Quitarle el canto a la activa y bajarla al fondo hace que la metáfora "el contenido es la hoja abierta" funcione en **las 6 rutas**, no sólo en `/`. **Coste asumido:** se pierde el orden estable que protegía E1. Se acota fijando la **x por índice de lista**, que es lo que sostiene la memoria espacial — E1 temía que las pestañas cambiaran "de altura **y de columna**" en cada clic; con E10 cambian sólo de altura. |

### Cuarta tanda — E11 (vuelta de los utils): el menú de cuenta sale del archivero

**Qué la motiva.** E7(b) sacó los utils del nav "hasta que exista la pantalla de auth que los justifica".
Esa pantalla ya existe (**#31 `auth_ui`**, cerrada), así que la condición de vuelta se cumplió — pero la
vuelta **no se puede ejecutar como estaba escrita**, porque entre E4 y E6 el archivero se comió el
presupuesto horizontal que la banda de utils ocupaba. E11 decide **con qué geometría vuelven**, que es
justo lo que E7(b) dejó sin escribir. Sin esta enmienda, E7 quedaría contradicha sin registro.

**La medida que fuerza la decisión** (de `progress/reports/explore_auth_shell_blast_radius.md`, derivada
de `globals.css` con los mismos tokens que usa `archive-nav.tokens.test.ts`):

| magnitud | valor |
|---|---|
| holgura horizontal total convertible en margen derecho | **30.88px** |
| lo que reservaba la banda de utils histórica | **168px** (72px en tablet) |
| relleno lateral de un `Button` tamaño `md` del design system | **48px** (24 por lado) |

**No cabe por ningún camino.** Recuperar los 168px exigiría subir `--bp-archive` de 1180px a ≈1317px, lo
que **reabriría la decisión cerrada** del tamaño de etiqueta (`progress/informs/9.informe-deudas_21_17_13_04.md`):
el archivero desaparecería de los portátiles de 1280-1366px. Descartado por el usuario.

| # | Qué cambia | Por qué |
|---|---|---|
| **E11 (a)** | **El control de cuenta (usuario + cerrar sesión) NO vuelve al `ArchiveNav`.** Vive en una **banda propia del `AppShell`, fuera del elemento `nav`**. El archivero queda **intacto**: no se reserva ancho, no se rompe la simetría del carril, `--nav-tab-inset-end` sigue derivado de `--nav-tab-inset-start`. | Decisión del usuario, sobre la medida de arriba. Es la única de las tres opciones que **no consume presupuesto** de las 6 etiquetas y **no reabre** el ancho de nacimiento. Además salva dos gates que de otro modo habría que reescribir: `archive-nav.tokens.test.ts:213` (simetría del carril) y `layout.test.tsx:230` (todo enlace dentro del `nav` es una pestaña) — este último **sólo** si el control es un `button` o vive fuera del `nav`, y ambas cosas se cumplen aquí. |
| **E11 (b)** | **La banda propia rige en TODOS los anchos**, de 320px a desktop. No se toca `BottomNav`: no gana props de sesión ni una séptima ranura. | Decisión del usuario. Hoy, entre 320px y 1179px, **no existe ninguna superficie de shell capaz de alojar usuario ni logout** (el archivero no se monta por debajo de `--bp-archive` y `BottomNav` no declara esas props): cablear la sesión "en el shell" habría producido UI **sólo a partir de 1180px**. Un séptimo elemento en `BottomNav` rompería el reparto a partes iguales de los 6 accesos táctiles y obligaría a recalcular su geometría entera. Con un anfitrión único e independiente del nav, el problema **no se plantea**: la misma banda sirve en los dos regímenes. Esto **corrige la deuda 19**, que describía el hueco como "en tablet no se muestra el nombre" cuando en realidad no hay superficie ninguna. |
| **E11 (c)** | **Gate obligatorio del extremo derecho de la banda**, gemelo del que ya existe para el wordmark (`archive-nav.tokens.test.ts:192`) pero **con la ranura 6 como peor caso**. Sin ese gate, E11 no se considera implementada. | Es el riesgo real de este encargo, y **no es un test que caiga: es uno que no existe**. Los invariantes verticales de la banda sólo están asertados para la **izquierda** (wordmark contra la columna 1, que sólo puede caer en ranura 1 o 2). La **columna 6 sí puede caer en la ranura 6**, y ahí el borde superior de su pestaña está en **10px en reposo y 2px con el puntero encima**; un control de 44px de alto táctil con 8px de respiro ocupa y=8..52 y **se solapa en 4 de las 6 rutas**. Es el patrón exacto de la deuda 23 reproducido en el otro extremo, y es exactamente cómo nacieron E5, E8, E9 y E10: entregado con todo verde y descubierto por el usuario en pantalla. **Aunque (a) saque el control del `nav`, el gate sigue siendo obligatorio**: la banda se superpone al archivero, así que la colisión es geométrica y no depende del árbol del DOM. |

**Consecuencia sobre el invariante 2 (full-bleed):** ninguna. El control no vive en el cajón.

> **⚠️ Corrección a E11(c), escrita al cerrar #32 (2026-08-03).** El texto de (c) daba por supuesto que la
> banda **se superpondría** al archivero, y de ahí sacaba que la colisión era geométrica. **La implementación
> demostró que esa premisa era inviable**, no opinable: el techo libre sobre la pestaña de la columna 6 en la
> ranura 6 es de **10px en reposo y 2px con el puntero encima**, y la banda necesita **60px** (objetivo
> táctil + dos respiros). **No hay forma de meter 60 en 2.**
>
> Por eso la banda va **EN EL FLUJO**: es un hijo del `AppShell` que va **antes** del `header`, y el archivero
> empieza donde ella acaba. La colisión deja de ser posible **por construcción**, que es la única forma
> honesta de cumplir un invariante cuyo margen real es de 2px.
>
> **El gate (c) sigue siendo obligatorio y sigue existiendo** — pero ahora lo que asegura es que **la banda
> permanezca en el flujo**: deriva de las clases reales del `cva` si está en flujo o superpuesta, y exige que
> su borde inferior quede por encima del techo del cajón. Si alguien la saca del flujo, cae en rojo.
> Detalle y condición doble en `progress/reports/impl_account_menu.md` §4.1.
> **Agujero conocido de ese gate:** sólo mira las clases **propias** de la banda, así que se la puede
> superponer **desde fuera** (vía `className` o un contenedor posicionado en `AppShell`) y seguiría verde →
> **deuda 52**.

### Quinta tanda — E12 (el rediseño de auth del usuario, `bdb11b0`): la rejilla entra en el RFC

**Qué la motiva.** El 2026-08-07 el usuario rediseñó a mano `login` y `register` (commit `bdb11b0`)
pasándolas a una **rejilla de dos columnas** con el formulario en una celda y el ovillo ASCII en la otra.
El cambio es legítimo y se mantiene, pero dejó tres agujeros de registro (deudas **116**, **117**, **118**)
y uno de método que es el que fuerza esta enmienda:

> **Medido** (`progress/reports/explore_deuda118_responsive_auth.md` §5.2, discrepancia 3): **no hay ni una
> línea en RFC-01 ni en SDD-01 que describa un layout de dos columnas para auth.** Es una decisión de
> producto tomada a mano, **sin fuente de verdad escrita**. Consecuencia práctica: *no hay documento contra
> el que validar cuál es el comportamiento responsive correcto*. Hay que elegirlo, y elegirlo es una
> decisión que tiene que quedar escrita — que es lo que hace E12.

**Las tres medidas que fuerzan las decisiones** (todas de los informes de exploración citados abajo, y
todas **[MEDIDO]**, no argumentadas):

| magnitud | valor | de dónde sale |
|---|---|---|
| lo que le queda al formulario a 390px de ancho | **47px** de ancho útil, con **91px** de columna vacía al lado | aritmética con tokens medidos, `explore_deuda118` §2.4 |
| qué devuelve `AsciiYarn` por debajo de `--bp-tablet` | **NO devuelve `null`**: devuelve siempre su host `h-full w-full` con la escena vacía dentro | sonda de DOM con `--bp-tablet` forzado, `explore_deuda118` §2.3 |
| utilidades de espaciado de todo `src/` que no salen de un token | **1 de 55**, y es `px-20`, exactamente en estas dos páginas | inventario completo, `explore_deuda118` §4.3 |

| # | Qué cambia | Por qué |
|---|---|---|
| **E12 (a)** | **La rejilla de dos columnas de auth queda ESPECIFICADA**, mobile-first: **una columna en la base, dos a partir de `--bp-tablet`**, y la celda del ovillo **apagada por CSS** por debajo de ese ancho. Cierra la **deuda 118**. | La ficha 118 acertaba y **se quedaba corta**: no es que el ovillo no se monte, es que **el hueco no desaparece**. `AsciiYarn` devuelve siempre su host, así que la segunda pista `1fr` existe y **reclama su mitad del ancho** aunque esté vacía — y `minmax(0, 1fr)` deja que la pista baje por debajo de su contenido mínimo, así que **no hay scroll horizontal que avise: simplemente se aplasta**. El JS quita la escena; **el CSS tiene que quitar el hueco**. Es exactamente lo que ya hace `DashboardHero.tsx:58`, el gemelo literal del problema, con la misma condición de ancho. |
| **E12 (b)** | **Las variantes son MIN-WIDTH.** Queda escrito aquí porque no está en ningún `docs/harness/*.md`: no hay ni un `@custom-variant` en `src/`, y `tablet:` compila a `@media (width >= 768px)`. | **Medido sobre el CSS compilado.** El SDD §6 dice *"tablet-first"* como **prioridad de diseño** (qué pantalla se diseña primero), no como mecánica, y es fácil leerlo y escribir `grid-cols-2` en la base creyendo que una variante quitará la segunda columna hacia abajo. **Eso no compila a nada.** El explorador sospecha que **ese malentendido es el origen de la 118**, y dejarlo sin escribir invita a repetirlo. |
| **E12 (c)** | **El relleno lateral de 80px se CONSERVA tal cual en tablet y desktop, pero se tokeniza y deja de aplicarse en móvil.** El diseño del usuario no se toca donde él lo mira; el valor crudo `px-20` desaparece de `src/`. | Dos cosas a la vez. Una: `px-20` es **el único valor de espaciado crudo de todo el repo** (1 de 55) y **ningún guardrail puede verlo** — `PX_LITERAL` busca `<dígitos>px` y aquí el `px` va delante y significa *padding-inline*. Es un rojo latente probado, no una sospecha. Dos: aporta **160 de los ~208px** que se pierden en móvil, o sea que es **la mitad del daño**. Como ningún token de la escala llega a 80px (el tope es `--space-12: 48px`), hace falta **declarar uno con su motivo escrito**, con el precedente exacto de `--nav-tab-inset-start` (`globals.css:100`). Aplicarlo desde `tablet:` resuelve las dos mitades sin cambiar un píxel de lo que el usuario diseñó. |
| **E12 (d)** | **El `data-slot="bg-3d"` de las dos páginas de auth se renombra a lo que la pieza ES HOY.** El del `AppShell` **NO se toca**. Cierra la **deuda 117**. | Ese nombre significa *"la capa de fondo 3D"* y describía la pieza del caparazón: fija a los cuatro lados, `--z-bg-3d`, sin captura de puntero. Tras `bdb11b0` el ovillo de auth es **una celda de una rejilla, en el flujo y con captura de puntero**: es un **cambio de categoría, no de estilo**. Y el nombre no es decorativo — **es la manija por la que los tests agarran la pieza**. Medido que renombrar es barato y seguro: son **dos manijas homónimas en árboles que nunca coexisten** (las rutas `(auth)` no montan `AppShell`), `data-slot` no aparece **ni una vez** en `docs/` ni en `template/`, y el ancla de superficie pública sólo cubre nombres de export. Coste total: 2 líneas de producción + 2 asertos. |
| **E12 (e)** | **Sin gate, E12 no se considera implementada** — y el gate tiene que llegar **hasta el CSS compilado**, no quedarse en las clases. | Es el hallazgo de método del encargo, y es incómodo: **cero gates se rompen al arreglar la 118 porque cero gates miden lo que la 118 denuncia**. Hoy se puede borrar la variante responsive de `DashboardHero.tsx:58` y de los tres paneles del Dashboard y **la suite entera sale verde**. Peor: como todo el hueco es `aria-hidden`, **`axe` tampoco lo ve** — el agujero es invisible para todos los gates que existen. Un gate que sólo mire nombres de clase no basta, porque una clase puede existir en el JSX y **no compilar a ninguna media query** (es justo el error que E12(b) describe). Precedente ya escrito en el repo: `skeleton.tokens.test.ts` y `globals-css.test.ts` compilan `globals.css` con postcss y asiertan sobre el resultado (**REGLA 7**: un gate que sólo corre sobre la réplica no mide producción). |

**Sobre RFC-01 §2, que quedó mintiendo.** La línea *"ovillo ASCII de fondo **solo en login** (no en
register)"* **está derogada desde `bdb11b0`** y se corrige en el propio §2, con la reversión anotada y no
borrada (misma política que se siguió en `feature_list.json` #31 al saldar la deuda 116). Igual quedan
derogadas, por E12(d), las dos palabras *"de fondo"*: el ovillo de auth ya no es una capa de fondo.

**Lo que E12 NO decide, a propósito:** si el ovillo de auth debe seguir siendo `interactive={true}`. El
rediseño lo cambió (antes era el valor por defecto) y **nada lo vigila**; no hay regresión de solapamiento
porque vive en otra columna de la rejilla, así que se deja como está y se ficha.

**Deudas que cierra:** **117** (E12 d) y **118** (E12 a + c). La **116** ya estaba saldada.
**Fuentes medidas:** `progress/reports/explore_deuda117_data_slot.md` y
`progress/reports/explore_deuda118_responsive_auth.md`.

**Lo que NO cambia:** la paleta, las texturas, las tipografías y el lockup de etiqueta. Se porta la
**mecánica** de la referencia, no su estética blanco-sobre-blanco — el SDD §0 es explícito en que
Soft Glossary aporta "estructura e interacción, **no** su minimalismo B/N", y que Hill House manda
sobre la piel. El `BottomNav` (mobile) **queda fuera de alcance**.

**`template/template-src.html` no se toca** (decisión del usuario): conserva el `.kc-folder` en fila
como referencia histórica del prototipo, igual que `<ascii-yarn>` en D1. Para `src/**` manda D4.

**Route groups (`src/app/`)**
- `(app)/**` privado, envuelto por `AppShell`; `(auth)/**` público (login/register), pantalla limpia sin nav.
  Protegidos por `src/proxy.ts` (ya existe).

## 4. Datos / backend

- Consume `GET /api/auth/me` (usuario para el nav) y `POST /api/auth/logout`. **Sin otros datos.**
- **Cambios de backend: ninguno.**

## 5. Estados

- **Loading global:** el ovillo ASCII como loader.
- El nav es estructural (sin empty/error).

## 6. Accesibilidad

- `nav` como landmark; `aria-current="page"` en la carpeta/ítem activo; foco visible (`--focus`).
- `prefers-reduced-motion` respetado por el hover del nav y por el ovillo.

## 7. Fuera de alcance (va en otros RFC)

- El contenido de cada página (su propio RFC).
- El afinado fino del ovillo 3D (se prototipa acá; se pule aparte si hace falta).

## 8. Adaptación al harness

**Capas / archivos**
- `src/app/globals.css` (`@theme` desde tokens), `src/app/layout.tsx` (fuentes, providers).
- `src/app/(app)/layout.tsx` (AppShell) y `src/app/(auth)/layout.tsx` (limpio).
- Design system en `src/shared/ui/` (`layout/`, `three/`, `primitives/`, `lib/cn.ts`).

**Stack nuevo a instalar** (confirmar): Tailwind v4, `class-variance-authority` + `tailwind-merge` +
`clsx`, `three` (+ `AsciiEffect`), `next/font`. Testing: `@testing-library/react` + `user-event` +
`happy-dom` + `axe`.

**Verificación (definición de done):** RTL (comportamiento/a11y) + smoke de render + `axe` + `bash ./init.sh`
verde + `pnpm build` OK.

## 9. Slices de implementación (→ `feature_list.json`)

Cada slice es una implementación (implementer → reviewer), como el backend. IDs reales en
`feature_list.json` (mapeo en [RFC-00 §4](RFC-00-proceso.md)):

- **feature 12 `ui_foundation`** — tokens → `@theme`, fuentes `next/font`, `globals.css`, `layout.tsx`
  raíz, `cn()`, y los primitivos base portados del template (`Button`, `Field`/`Input`, `Card`).
- **feature 13 `ui_shell_nav`** — `AppShell` + `ArchiveNav` (6 rutas, activa por ruta) + `BottomNav`
  mobile + route groups `(app)`/`(auth)` + consumo de `/auth/me` y logout.
- **feature 14 `ascii_yarn`** — web component `<ascii-yarn>` (three.js `AsciiEffect`, client-only,
  reduced-motion) integrado como hero/loader.

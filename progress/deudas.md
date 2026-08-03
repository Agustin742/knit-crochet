# Deuda técnica acumulada (vigente)

> ## ⚠️ ESTE ARCHIVO NO SE VACÍA AL CERRAR LA SESIÓN
>
> Es el **libro mayor** de la deuda técnica del proyecto y es **acumulativo**. A diferencia de
> `progress/current.md` —que sí se vacía en cada cierre y se vuelca en `progress/history.md`—, aquí no se
> borra nada al terminar una sesión.
>
> **Por qué existe como archivo aparte:** hasta la sesión del 2026-07-30 esta lista vivía dentro de
> `current.md`, o sea dentro del único archivo que el protocolo de cierre manda vaciar
> (`AGENTS.md` §5). Las deudas 1-20 sobrevivieron porque alguien las fue arrastrando **a mano** en cada
> cierre, no porque el arnés las protegiera: bastaba un cierre hecho al pie de la letra para perderlas
> todas. Sacarlas de ahí elimina esa dependencia de la memoria de quien cierre.

## Cómo se usa

- **Añadir:** número secuencial al final, sin reciclar números de deudas saldadas (las referencias
  cruzadas de los informes apuntan a ellos). Deja escrito **el escenario concreto de fallo**, no sólo el
  síntoma: qué entrada o qué cambio produce qué resultado incorrecto.
- **Saldar:** **no la borres.** Tachá el título con `~~…~~` y escribí debajo **cómo** se saldó y **dónde**
  quedó la prueba (test, commit, informe). Una deuda tachada explica por qué algo está como está; una
  deuda borrada deja un agujero.
- **Corregir una ficha:** si resulta que la deuda decía menos —o algo distinto— de lo que pasa, corregí la
  ficha y dejá el texto original marcado, como en la 18 y la 20. Que una ficha mienta es peor que no
  tenerla.
- **Referencias:** las deudas se citan por número desde `progress/informs/`, desde los `reports/` de los
  subagentes y desde los encargos a los implementers ("fuera de alcance: deudas 13, 15, 16…").

---

1. ~~**`src/proxy.ts` `/` público vs. Dashboard privado** (#13)~~ → **convertida en trabajo rastreable**:
   nota de scope + criterio de aceptación en la feature **#19 `dashboard_ui`** (quitar `/` de PUBLIC_PAGES,
   Dashboard privado en `/`, test del proxy actualizado). Se resuelve al construir el Dashboard.
2. ~~**Sin feature para páginas login/register** (#13)~~ → **convertida en feature**: nueva **#31 `auth_ui`**
   (login + register en el grupo `(auth)`). `rfc_ref` RFC-01 §2/§3.
3. **Sanitización al cablear Cloudinary** (#5, PRD §11.7): `folder`/`publicId` desde el `userId` del JWT
   validados con zod. **Aplica en #15 `uploads_image` — la siguiente.**
4. ~~**`tsconfig.tsbuildinfo` trackeado en git** (pre-existente): añadir a `.gitignore`.~~ → **SALDADA**
   (lote de higiene 2026-07-31). `.gitignore` ignora ahora `tsconfig.tsbuildinfo` y `*.tsbuildinfo`
   (la caché incremental de `tsc`, que cambia en cada typecheck y ensuciaba el diff), y el archivo salió
   del índice con `git rm --cached tsconfig.tsbuildinfo` **sin borrarlo del disco**. Prueba:
   `git ls-files | grep tsbuildinfo` ya no devuelve nada. **Ojo al commitear:** el `git rm --cached` deja
   una **eliminación preparada en el índice** (`D ` en `git status`), que es lo que registra el
   destrackeo. Informe: `progress/reports/impl_deudas_21_17_13_04.md`.
5. **`GET /api/projects/:id` no devuelve las lanas enlazadas** (#6): **la salda #17 `projects_detail_yarns`**.
6. **Orden de firma de Cloudinary** (#5): `localeCompare`; migrar a comparador binario si se firman más params.
7. **`sum()`/agregados → `numeric` (string por el driver):** `Number(...)` en cualquier agregado nuevo.
8. ~~**`frameloop="always"` en el ovillo** (#14)~~ → **SALDADA** por el port de D2-bis: con
   `prefers-reduced-motion` se dibuja **un solo frame** y **no se arranca el `requestAnimationFrame`**
   (el arrastre redibuja a demanda). Sin la preferencia el bucle sigue a rAF pleno, como el template.
   Verificado por test (`raf` no llamado + exactamente 1 render).
9. **Tres decisiones que #19 `dashboard_ui` debe tomar antes de empezar** (#14): (a) el hero reemplaza al
   fondo global o monta una segunda escena — dos escenas duplican el coste del bucle; (b) a11y del
   modo `interactive`: no habrá rotación por teclado, decidirlo a propósito y no por omisión; (c) evaluar el
   fps del punto 8. **Ya escritas en el `description` de #19.**
10. **`three` y `@types/three` pinneados a 0.185.1 sin peer dependency que avise**: actualizarlos siempre
    juntos.
11. **Ajuste fino visual del ovillo**: ya **no** es ajuste libre — el motor es un port 1:1 de
    `template/ascii-yarn.js` (RFC-01 §3 D2-bis), así que los números son contrato, no preferencia. Queda
    sólo la **validación visual humana** en el navegador (RFC-01 §7). El `glow` ya existe como prop
    `glow` de `<AsciiYarn />`, que aplica la utilidad de sombra de texto por token (apagado por
    defecto, como el template).
12. **`src/app/globals-css.test.ts` importa `postcss` sin declararlo en `package.json`** (bugfix del
    guardrail de Tailwind): es dependencia dura de Next y Vite, hoisteada y pinneada por el `overrides` de
    `pnpm-workspace.yaml`, así que hoy resuelve estable. Si algún día falla con "Cannot find package
    'postcss'", añadirlo como `devDependency` explícita.
13. ~~**⚠️ DEFECTO REAL (no teórico): `leading-tight` se pierde en `buttonVariants`.** `twMerge` la descarta
    porque el `text-base` de la variante de tamaño ya trae su propio `line-height` — **el interlineado del
    botón no es el que dice el código**. Es **preexistente**, no lo introdujo el refactor canónico; lo
    destapó el reviewer al auditar `twMerge`. Revisar al tocar `button.variants.ts` (o antes, si algún
    botón se ve con el alto raro).~~ → **SALDADA** (lote de higiene 2026-07-31).
    **Confirmada empíricamente antes de tocar nada**, en dos niveles: `twMerge` devolvía la cadena **sin**
    el interlineado suelto, y el CSS compilado de `globals.css` dejaba al botón con el interlineado del
    tamaño (**1.5** en `md` y ~**1.556** en `icon`, contra el **1.1** que declaraba el código: 24px y 28px
    de alto de línea en vez de 17.6 y 19.8). **Arreglo:** el interlineado deja las clases base y viaja
    **pegado al tamaño en la misma clase** (la forma de Tailwind v4 que fija tamaño e interlineado juntos),
    en las dos variantes de tamaño; así ninguna reordenación puede separarlos. Verificado en el CSS
    compilado: las dos utilidades emiten `line-height: var(--leading-tight)`, y siguen emitiéndose **antes**
    que las utilidades de interlineado sueltas, de modo que un llamador puede seguir sobreescribirlo desde
    `className`. **Prueba:** `src/shared/ui/primitives/button/button.variants.test.ts` → describe
    "interlineado del botón (deuda 13)", que asierta sobre la salida real de `cn()` (no sobre el string de
    `cva`, que es donde el defecto se escondía) e incluye un test que reproduce la pérdida con el orden
    antiguo. El barrido de tamaños es un `Record` sobre el tipo de la variante: **añadir un tamaño sin
    registrarlo rompe el typecheck**.
14. **El guardrail canónico tiene dos puntos ciegos conocidos** (`canonical-tailwind-classes.test.ts`):
    (a) no marca **utilidades negativas** (`-mt-[var(--space-2)]`) por el lookbehind del regex — hoy no hay
    ninguna en `src/**` porque los negativos se escriben con `calc(-1*…)`, que es excepción legítima;
    ampliar el patrón al primer caso que aparezca. (b) no marca la forma de **propiedad arbitraria**
    (`[z-index:var(--z-nav)]`), que está fuera de alcance a propósito porque requiere verificar caso a caso
    si existe utilidad de core equivalente — implica que la incoherencia de z-index recién saldada **puede
    volver sin que nadie se entere**.
15. **`no-hardcode.test.ts:12-15` cita clases literales en un comentario**, justo lo que ahora prohíbe
    `conventions.md`. Sin daño medible hoy (el reviewer compiló con y sin los tests: 207 reglas en ambos
    casos), pero conviene reescribirlo en prosa al próximo toque de ese archivo.
16. **`--shadow-paper` quedó sin ningún consumidor en `src/**`** (lo destapó la review del archivero
    fichero): su única aparición es la propia declaración en `globals.css`. Además arrastra el signo de
    sombra del modelo de fila derogado (proyecta hacia abajo). Borrarlo o resignificarlo al próximo toque
    de sombras.
17. ~~**⚠️ DEFECTO REAL: la variante fantasma de `Button` es ilegible sobre superficies oscuras.**~~ →
    **FICHA CORREGIDA Y SALDADA** (lote de higiene 2026-07-31).
    **(a) La ficha mentía en dos puntos**, verificado antes de tocar nada:
    - Decía que `ArchiveNav` lo parcheaba desde fuera pasándole el color inverso para el botón "Salir".
      **Ya no**: la enmienda **E7** de D4 quitó los utils del nav, así que ese parche no existe y hoy
      `variant="ghost"` **no tiene ningún consumidor real** en `src/**` — su única aparición era
      `Button.test.tsx`. Arreglo sin riesgo de regresión, por tanto.
    - Decía "ilegible". Era **peor**: el primer plano que fijaba (`--fg`) y el fondo de la app (`--bg`)
      **son el mismo tono de la escala de marca**, así que el contraste medido es **1.000** — el botón no
      es poco legible, es literalmente **invisible** sobre el shell.

    **(b) Cómo se saldó:** en el primitivo, con la opción de **herencia** (la variante fantasma deja de
    fijar primer plano y adopta el de la superficie que la contiene, vía `currentColor`), no partiéndola en
    dos variantes. Motivo: partirla habría institucionalizado justo lo que la deuda quería quitar —que cada
    llamador sepa sobre qué fondo está y elija— y habría que duplicar la decisión en cada variante futura.
    El **borde que aparece con el puntero encima** hereda igual (antes fijaba el color de borde oscuro, o
    sea el mismo defecto en el borde). El **anillo de foco** ya era visible sobre el fondo oscuro (3:1 se
    supera con holgura: **4.68**) y se queda como estaba, ahora con gate.
    **Prueba:** `src/shared/ui/primitives/button/button.variants.test.ts` → describes "variante fantasma
    legible sobre cualquier superficie" y "contraste real de lo que hereda la variante fantasma", que miden
    el contraste con la fórmula de WCAG leyendo los tokens de `globals.css`.

    **(c) SEGUNDA VUELTA — no bastaba con lo anterior: se cierra JUNTO CON LA DEUDA 32.** La review midió
    las cuatro superficies y destapó que el arreglo, tal y como se entregó en la primera vuelta, **movía el
    defecto en vez de quitarlo**: antes el botón fantasma era invisible sobre **1** superficie de 4 (el
    fondo oscuro, 1.00) y pasaba a serlo sobre **3** de 4 (las claras: **1.14** en la tarjeta elevada,
    **1.08** en la plana, **1.13** en la hundida), porque heredaba el crema que el `body` propaga y ninguna
    superficie clara declaraba primer plano. Que un párrafo suelto dentro de una tarjeta fuera ilegible sí
    era preexistente (deuda 32); que **el botón fantasma dentro de una tarjeta** lo fuera **no**: antes se
    leía a 14.65:1, o sea era una **regresión introducida por el propio arreglo**. Cerrado como manda la
    lógica de la solución elegida —heredar exige que haya de dónde heredar— **declarando el primer plano de
    `Card` junto a su fondo** (`card.variants.ts`, base), que es exactamente lo que salda la **deuda 32**.
    Las dos fichas se cierran a la vez y por el mismo cambio.
18. ~~**Los dos juegos de tokens de breakpoint no están sincronizados por ningún test.**~~ → **FICHA
    DESACTUALIZADA, corregida por la review r4.** (a) El assert que esta deuda pedía **ya existe** y está
    verde (`archive-nav.tokens.test.ts`, compara los dos juegos de breakpoints). (b) **No era "la única
    grieta"** de "cerrado por construcción": quedan al menos dos del mismo patrón y sobre garantías **más
    ajustadas** (deudas 22 y 23). **El patrón a vigilar es "el test mide tokens, el layout consume
    clases"**, no el par de breakpoints concreto. Texto original abajo, conservado por contexto:
    **Los dos juegos de tokens de breakpoint no están sincronizados por ningún test.** La garantía de que
    las 6 etiquetas del archivero entran enteras se calcula leyendo un juego de tokens, pero la media
    query real la genera el otro. Hoy coinciden (768 y 1180) y hay un comentario en `globals.css` que lo
    advierte, pero si alguien toca uno solo **el test seguiría verde con el layout roto**. Es la única
    grieta de "cerrado por construcción"; se tapa con un assert de igualdad en `globals-css.test.ts`.
    La duplicación es preexistente, pero ahora sostiene una garantía que antes no existía.
19. **En tablet no se muestra el nombre de usuario** (consecuencia de la palanca elegida para E2: ocultarlo
    libera el ancho que necesitan las 6 etiquetas). Quien diseñe el menú de cuenta tiene que saberlo.
20. **La garantía de ancho del archivero cubre las 6 páginas de la app**, no a un consumidor que pase su
    propia lista de `items`; para ése la red de seguridad es el recorte con elipsis, no el test.
    **Ampliada por la review r4: tampoco cubre bien a las 6 páginas propias** — ver deuda 24, con la que
    conviene fusionarla.

## Deudas nuevas — de la review r4 del `ArchiveNav` (`review_archive_nav_fichero_r4.md`)

Ninguna bloquea. Están ordenadas como el reviewer las taparía. Detalle y escenarios de fallo concretos en
su informe; síntesis en `progress/informs/8.informe-archive_nav_e8_e10.md`.

21. ~~**⚠️ DEFECTO REAL: `AppShell` promete algo que no hace, y cuesta una petición HTTP por carga.**
    `src/features/auth/ui/AppShellClient.tsx` pide `/api/auth/me` en cada carga de cualquier página de
    `(app)`, guarda el resultado en estado (**re-renderiza el shell entero**) y `ArchiveNav` lo **descarta**;
    `handleLogout` es **código inalcanzable**. Y el JSDoc de `AppShell.tsx:19` afirma "Usuario mostrado en el
    archivero", que es **falso**.~~ → **SALDADA** (lote de higiene 2026-07-31). Las tres mitades:
    - **JSDoc**: `AppShell.tsx` dice ahora la verdad — `user`/`onLogout` están **RESERVADAS para #31**, se
      aceptan y se propagan al `ArchiveNav`, **que hoy las ignora a propósito** (E7), así que pasar un
      usuario **no pinta nada**. La **firma pública no cambió**: es contrato del design system.
    - **La petición**: fuera el `useEffect` con `fetch("/api/auth/me")` y fuera el `useState`.
      `AppShellClient` queda en una sola expresión. **El endpoint NO se tocó** (sigue con sus 9 tests
      verdes; lo usa #31). Gate nuevo de regresión: *"fires no HTTP request at all when mounted"* en
      `src/features/auth/ui/AppShellClient.test.tsx`.
    - **`handleLogout`**: **borrado**, no conservado como andamiaje. Motivo: era inalcanzable y su test sólo
      pasaba porque el doble del shell **se fabricaba su propio botón "Salir"**, que el shell real no tiene
      desde E7 — cobertura de un camino que ningún usuario podía recorrer. Además, **dónde** vive el menú de
      cuenta es una decisión de #31, y dejarlo escrito aquí la daba por tomada. Reponerlo son seis líneas.
      Queda anotado en el JSDoc del propio `AppShellClient.tsx` y como **deuda 29**.
22. **El gate del margen más estrecho de todo el nav se burla editando el componente.** El test del wordmark
    calcula su borde inferior leyendo **tokens**, pero el wordmark lleva sus clases escritas a mano en
    `ArchiveNav.tsx`. Subirle un escalón el tamaño ahí da 43.2 contra los 42 de la pestaña de la columna 1
    levantada → **solapan 1.2px y el wordmark pinta encima**, con los 420 tests en verde. Se tapa asertando
    también las clases del componente (o moviéndolas a una variante `cva`).
23. **La mitad HORIZONTAL del invariante del wordmark no tiene gate ninguno**, y de ella depende que 5 de las
    6 columnas no lo pisen. Lo único que lo impide son ~27.7px de distancia sin asertar. Y no es holgura
    cómoda: desde E10 columna y ranura están desacopladas, así que **en 4 de las 6 rutas la pestaña de la
    columna 2 con el puntero encima entra 2.4px** en la banda de línea del wordmark. Alargar el wordmark
    (p. ej. a "Knit&Crochet Studio") lo pone encima de una etiqueta sin que ningún test se entere.
24. **La constante de avance tipográfico no es la cota superior que dice ser: cuenta caracteres, no glifos.**
    El test que garantiza "las 6 etiquetas enteras" multiplica por `label.length`, así que **renombrar una
    etiqueta a otra de igual largo pero con letras más anchas la desborda sin que el test se entere** (una de
    12 caracteres con varias M o W puede sacar ~34px de más). La medición empírica del leader lo delata: 165px
    reales sobre 12 glifos = 0.708 em de **media**, así que hay glifos por encima del 0.72 que el test usa
    como "cota". Protege bien contra subir el tamaño y contra bajar el ancho de nacimiento (su motivo de
    existir), **no** contra cambiar las etiquetas — el cambio más probable de los tres. La red real ahí es el
    recorte con elipsis, que es **degradación, no cumplimiento** del invariante 7. Fusionar con la deuda 20.
25. **La costura de la ficha abierta con el contenido coincide en TONO pero no en TEXTURA.** La ranura sin
    cara muestra el fondo del header, que lleva la textura de puntos; el área de contenido no la lleva
    (`AppShell` pinta un color opaco que tapa la del `body`). Es sutil (puntos al 8%) y a ojo pasa, pero la
    metáfora que justifica E10 —el contenido **es** su cara— descansa en que las dos superficies sean la
    misma. Vigilar antes de que alguien suba la opacidad de esa textura.
26. **⚠️ NO VERIFICADO EN PANTALLA: el diente de la escalera en las 5 rutas que no son `/`.** Con Dashboard
    activa las bases van 104/94/84/74/64/54, escalera limpia — y es lo único validado, porque `/` es **la
    única ruta que existe hoy**. Con Lanas activa serían 94/84/**104**/74/64/54: un **diente**, porque la
    activa baja al fondo y las dos columnas a su izquierda quedan por encima de ella. Es **inherente a E10**,
    no un fallo de la implementación (los tests asertan el array de profundidades, que es correcto, no la
    lectura de la escalera). La 5ª vuelta se hizo entera para que la escalera no arrancara plana y ese
    resultado sólo está verificado en el único caso en el que E10 la deja monótona. **Es lo primero que tiene
    que mirar el usuario cuando exista una segunda ruta; si el diente no gusta, lo que se rediscute es E10.**
27. **La casilla "verificado en navegador" de los 7.6px de E7 está marcada por otra pestaña.** El margen que
    el gate modela es la **columna 1 en ranura 2**, y hoy **no es observable**: en `/` Dashboard es siempre la
    ficha abierta, así que siempre está en la ranura 1 (tope y=52, 17.6px de sobra). Lo que el leader midió
    fue la ranura 2 ocupada por **Proyectos, columna 2**, que no comparte x con el wordmark. El número
    vertical es correcto y coincide con el gate; lo que falta es la configuración real. Se cierra con la
    segunda ruta.
28. **`--nav-tab-lift` significa dos cosas distintas y en ningún sitio lo avisa.** La pestaña centra su
    contenido, así que crecer 8px mueve el **borde** 8px pero el **texto** sólo 4px. Quien suba el token
    buscando un movimiento de texto concreto obtendrá la mitad — y se comerá **el doble** del margen de la
    deuda 22. Merece una línea junto al token en `globals.css`.

## Deudas nuevas — del lote de higiene 21/17/13/4 (`impl_deudas_21_17_13_04.md`)

Ninguna bloquea. Las tres primeras son consecuencias directas y conscientes de lo que se saldó; las dos
últimas son hallazgos colaterales, verificados empíricamente, del mismo mecanismo de la deuda 13.

29. **#31 `auth_ui` tiene que VOLVER A CABLEAR el usuario y el logout del shell.** Al saldar la deuda 21 se
    borró el `fetch("/api/auth/me")` y el `handleLogout` de `AppShellClient`, y hoy nadie alimenta las props
    `user`/`onLogout` de `AppShell` (que siguen en la firma). **Escenario de fallo:** #31 monta el menú de
    cuenta dentro del `ArchiveNav`, lo cablea a `onLogout` y **el botón "Salir" no hace nada** y el nombre
    del usuario sale vacío, porque la cadena está cortada dos capas más arriba y **ningún test lo delata**:
    el gate vigente asierta justo lo contrario (que el shell no pide nada y no recibe usuario), así que #31
    tiene que **reescribir ese gate**, no sólo añadir código. Lo que hay que reponer: `GET /api/auth/me`
    (endpoint vivo y probado) y `POST /api/auth/logout` + redirección a `/login`. Está escrito también en el
    JSDoc de `src/features/auth/ui/AppShellClient.tsx`.
30. **`AppShellClient` conserva `"use client"` sin usar ya ninguna capacidad de cliente.** Se quedó sin
    estado, sin efectos y sin manejadores: hoy es un envoltorio que devuelve un elemento. **Escenario de
    fallo (de coste, no de corrección):** la directiva marca el límite del árbol de cliente, así que
    `AppShell` y `BottomNav` —que no tienen directiva propia— entran en el bundle del navegador sin
    necesitarlo, en **todas** las páginas del grupo `(app)`; `ArchiveNav` y `AsciiYarn` sí la llevan por su
    cuenta y no dependen de ésta. No se quitó en el lote de higiene porque quitarla obliga a renombrar el
    módulo (el nombre pasaría a mentir) y a repuntar sus tres importadores más la documentación que lo cita.
    **Decidirlo en #31**, que es quien sabe si el módulo vuelve a tener estado.
31. **El anillo de foco no llega al mínimo de 3:1 sobre DOS de las tres superficies claras.** `--focus`
    (rosa de marca) mide **4.68:1** contra el fondo oscuro de la app —de ahí que la deuda 17 se cerrara sin
    tocarlo— y, sobre las claras: **3.13:1** en `--surface-raised` (**pasa** el umbral), **2.95:1** en
    `--surface` y **2.41:1** en `--surface-sunken` (**no pasan**). *(Alcance corregido por la review r1: la
    primera redacción daba las tres por rotas y omitía el 3.13. Importa porque `--surface-raised` es la
    variante **por defecto** de `Card`, o sea el caso más común, y ahí el anillo cumple.)*
    **Escenario de fallo:** un `Input` deshabilitado —o cualquier control sobre la superficie hundida— o un
    control sobre una tarjeta **plana** recibe el foco por teclado y el anillo apenas se distingue del
    fondo; incumple el criterio de contraste de componentes de interfaz, que la convención lista como parte
    de "done". Se arregla en el token (un tono de foco más oscuro, o un anillo de dos colores), no en cada
    componente — y **sin mover el rosa a ciegas**, que sí cumple en el caso más frecuente. Verificado con la
    misma fórmula de WCAG que usa `button.variants.test.ts`.
32. ~~**`Card` declara superficie clara pero NO declara primer plano, así que hereda el claro del `body`.**
    `globals.css` pone `color: var(--fg-inverse)` (crema) en el `body` porque la app es oscura; las
    variantes de `Card` sólo fijan el color de fondo. **Escenario de fallo concreto:**
    `<Card><p>texto</p></Card>` pinta crema sobre `--surface-raised` → contraste **1.14:1**, texto
    invisible.~~ → **SALDADA en la segunda vuelta del lote de higiene**, junto con la **deuda 17** y por el
    mismo cambio: `cardVariants` declara ahora **su primer plano en la base**, junto al fondo que ya
    declaraba, así que las dos variantes pasan de 1.14 y 1.08 a **14.65** y **13.84**. Nació registrada como
    deuda separada (era preexistente y no era el encargo), pero la review demostró que **no se podía dejar
    abierta sin dejar mintiendo a la 17**: desde que la variante fantasma hereda, la tarjeta es justamente
    de donde hereda. **Prueba:** `button.variants.test.ts` mide el contraste de cada variante de `Card`
    **derivando el par de las clases que la propia `cardVariants` declara** —si la tarjeta dejara de
    declarar primer plano, el test vuelve solo al crema del `body` y cae; comprobado quitando la clase, da
    1.142 y 1.079 en rojo— y `Card.test.tsx` → *"declares its own foreground next to its surface"* fija que
    la clase no se pierda. **Regla que deja escrita:** una superficie que elige su fondo elige también su
    primer plano; los dos van juntos en la misma capa.
33. **El mismo mecanismo de la deuda 13 amenaza al tamaño de la etiqueta del archivero.** Para `twMerge`,
    `text-nav-tab` **no es un tamaño**: no sigue el patrón de tallas que reconoce, así que lo clasifica como
    **color de texto** — y `tabLabelVariants` añade después el color de la variante activa. **Escenario de
    fallo, comprobado ejecutando `twMerge`:** pasar la salida de `tabLabelVariants` por `cn()` devuelve la
    cadena **sin `text-nav-tab`**, y las 6 etiquetas del nav caen del tamaño grande de la enmienda E6 al
    heredado, con el test de presupuesto horizontal en verde porque mide **tokens**, no clases (el patrón de
    la deuda 18). Hoy no ocurre porque `ArchiveNav` usa la salida de `cva` **directa**, sin `cn()`: basta que
    alguien la envuelva para permitir un `className`, o que se configure `cva` con `twMerge`, para
    dispararlo. Se tapa dando a la utilidad un nombre que `twMerge` reconozca como tamaño, o registrando la
    escala en una configuración de `twMerge` propia.
    **⚠️ ACOPLADA CON LA DEUDA 13 — leer antes de taparla** (lo encontró la review r1 y lo verificó
    ejecutando `twMerge`): esa misma clasificación errónea es **hoy lo que PROTEGE el interlineado de la
    etiqueta**. Como el tamaño de etiqueta no cuenta como talla, no entra en conflicto con el interlineado
    de `tabLabelVariants` y la etiqueta conserva el suyo. **Escenario de fallo del arreglo ingenuo:** quien
    tape esta deuda renombrando la utilidad a una talla que `twMerge` sí reconozca, **hace caer la etiqueta
    en la deuda 13 en el mismo movimiento** —pierde el interlineado en silencio— y encima con el test de
    esta deuda en verde. Se tapa usando la forma que lleva **tamaño e interlineado unidos en una sola
    clase**, la misma con la que se saldó la 13, no sólo renombrando.
34. **El gate de la deuda 13 no cubre el eje del llamador.** El interlineado del botón está atado al tamaño
    dentro de `buttonVariants`, pero `Button.tsx` hace `cn(buttonVariants({ variant, size }), className)`:
    lo que llegue por `className` se fusiona **después**. **Escenario de fallo concreto:** un consumidor
    escribe un botón con un tamaño de texto suelto en `className` para agrandarlo; `twMerge` resuelve el
    conflicto a favor de esa clase y **se lleva por delante tamaño e interlineado de la variante** →
    exactamente la deuda 13, ahora desde el sitio de llamada, con los 13 tests del primitivo en verde
    porque miden la salida de `buttonVariants` sin `className`. Con #15-#31 instanciando botones en masa es
    cuestión de tiempo. Vigilar: el `className` de un llamador es un override legítimo (no se puede
    prohibir), así que lo que cabe es **un gate que avise** —un test que pase tamaños por `className` y
    exija que el interlineado siga presente— o documentar en el primitivo que un tamaño de texto pasado
    desde fuera debe escribirse con la forma unida. *(El otro agujero que levantó la review —que el barrido
    de combinaciones asertaba la ausencia de lo malo en vez de la presencia de lo bueno, con lo que un
    `compoundVariants` con un tamaño dentro se llevaba el interlineado con todo en verde— **no llegó a
    ficha: se cerró en la segunda vuelta** invirtiendo la aserción.)*
35. **Dos reglas de `features/auth/validation.ts` no llevan mensaje, y desde #31 esos mensajes se LEEN en
    pantalla.** `emailSchema` limita a 255 caracteres y el nombre de `registerSchema` a 120, las dos con
    `.max(...)` **sin segundo argumento**, así que zod emite su texto por defecto **en inglés**. Hasta ahora
    daba igual: sólo viajaba dentro del `{ error }` de un 400 que nadie pintaba. Desde #31 los formularios
    validan en cliente con **estos mismos schemas** y pintan `issue.message` debajo del campo.
    **Escenario de fallo concreto:** alguien pega en "Nombre" un texto de más de 120 caracteres (o un email
    larguísimo) y el formulario, íntegramente en español, le responde con el mensaje por defecto de zod en
    inglés bajo el campo. Se tapa poniendo el mensaje en español en los dos `.max(...)`; es un cambio en el
    contrato de mensajes del endpoint (`auth-routes.test.ts` no los asierta hoy), así que conviene hacerlo
    en la misma slice que revise los textos de auth. No se hizo en #31 por no tocar el contrato del
    servidor desde una feature de UI.
36. **Un usuario ya autenticado puede entrar a `/login` y `/register`, y nadie lo devuelve al Dashboard.**
    `src/proxy.ts:11-14` declara las dos rutas públicas por igualdad exacta y **no mira la cookie**: la
    allowlist sólo decide si se exige sesión, nunca si sobra. **Escenario de fallo concreto:** un usuario con
    sesión abierta abre su marcador de `/login`, ve el formulario vacío, escribe mal la contraseña y recibe
    "Email o contraseña incorrectos." **estando ya dentro de la app** — o, peor, se registra una segunda
    cuenta desde `/register` y la sesión anterior se sustituye en silencio, porque el endpoint sobrescribe la
    cookie sin preguntar. Se tapa en el proxy (si hay cookie válida y el destino es una ruta de auth →
    redirigir a `/`), que es la única capa que ve la cookie `httpOnly` antes de renderizar; **#31 no lo hizo
    porque `src/proxy.ts` quedó explícitamente fuera de su alcance**.
    **➜ COLGADA DE LA FEATURE #32 `account_menu`** en el cierre de #31 (decisión del reviewer): el arreglo
    sólo existe en el proxy, así que no conviene dejarla suelta esperando a que alguien pase por ahí — vive
    en la `acceptance` de la slice que vuelve a tocar sesión.
37. ~~**El HTML preestático de `/login` no contiene el formulario: la pantalla de entrada de la app llega
    vacía hasta que hidrata.** `LoginForm` lee el destino con el lector de parámetros de búsqueda, lo que
    obliga a envolverlo en una frontera de Suspense; el relleno de esa frontera es **nulo**, así que el
    prerender de la ruta emite el hueco vacío. **Medido en build limpio:** el HTML generado de `/register`
    trae su elemento de formulario y el de `/login` **no trae ninguno**.
    **Escenario de fallo concreto:** a alguien lo desvía el proxy a `/login` desde el móvil, con cache fría y
    red lenta; ve **pantalla en blanco** hasta que descarga y ejecuta el JS — y en móvil ni siquiera aparece
    el ovillo de fondo, porque por debajo del umbral de tablet la escena no se monta (`useViewportSupports3d`).
    Sin JS no hay formulario **nunca**, y es la puerta de entrada a toda la app.~~
    → **SALDADA** (ronda de arreglo posterior al cierre de #31, decisión del usuario) por la **salida (b)**:
    el destino se lee **en el Server Component** —`src/app/(auth)/login/page.tsx` recibe `searchParams`, lo
    sanea con `resolveNextPath` y lo entrega al formulario por la prop `next`— y `LoginForm` deja de usar el
    hook de parámetros de búsqueda, con lo que **desaparece la frontera de Suspense**. Se eligió (b) y no el
    esqueleto porque el esqueleto arregla la percepción pero deja el HTML sin formulario: sin JS seguiría sin
    haber pantalla de acceso. **Precio aceptado:** `/login` pasa de estática a dinámica (`ƒ` en la salida del
    build); `/register` sigue estática.
    **Prueba, medida en las dos direcciones sobre builds limpios** (`.next` borrado, `pnpm build`):
    **antes** —página estática con la frontera de relleno nulo— `.next/server/app/login.html` tenía **0**
    elementos de formulario y `register.html` **1**; **después**, la respuesta de `GET /login` trae **1**
    formulario con sus dos controles y su botón de envío. Además, con `?next=//evil.example` la prop que
    cruza a cliente es `"/"` (las apariciones de `evil` en el HTML son de la carga de navegación de Next, que
    repite la URL pedida, no del valor entregado al formulario). **Gate automático:**
    `src/app/(auth)/auth-pages.test.tsx` → *"no esconde el formulario tras una frontera de Suspense con
    relleno nulo"*, que recorre el árbol que devuelve la página; visto caer en rojo al reponer la frontera y
    volver a verde al quitarla. Ese gate mide la composición, no el HTML final: la comprobación del HTML es
    la del párrafo anterior y vive en `progress/reports/impl_auth_ui_deudas_37_38.md`.
38. ~~**Los errores tardíos que van al campo no se anuncian ni mueven el foco.** `AuthFormError`
    (`features/auth/ui/`) sí es región viva y cubre bien el 401 del login, el 500 y la red caída. Lo que no
    cubre es lo que se pinta con `Field`: (a) los errores de validación en cliente de los **dos**
    formularios y (b) el **409** de register. El mensaje de `Field` es un `span` asociado por
    `aria-describedby`, o sea que **no se anuncia** al aparecer tras el envío si el foco no está en ese
    campo. Detalle que agrava la ficha: `src/features/auth/ui/RegisterForm.test.tsx:149` **fija con un test
    que la región viva queda vacía** en el 409 — el silencio está protegido por un gate, así que taparlo
    obliga a revisar ese test conscientemente.
    **Escenario de fallo concreto:** alguien con lector de pantalla se da de alta con un email ya
    registrado, pulsa "Crear cuenta", el botón se desactiva y se vuelve a activar, y **no se anuncia nada**;
    tiene que recorrer el formulario campo por campo para descubrir qué pasó.~~
    → **SALDADA** en la misma ronda: `src/features/auth/ui/focus-first-invalid.ts` mueve el foco al **primer
    control inválido en orden visual** tras un envío fallido, y los dos formularios lo llaman en sus tres
    caminos de error de campo (validación en cliente de login, validación en cliente de register y **409**
    de register). No se duplica el texto en ninguna región nueva: al enfocar, el lector anuncia etiqueta,
    invalidez y mensaje, porque eso ya lo cablea `Field`. **Cero cambios en `shared/ui`.**
    **El test que protegía el silencio se reescribió, no se borró:** `RegisterForm.test.tsx` →
    *"maps a 409 onto the email field and takes the focus there"* **conserva** la garantía original (el 409
    no se duplica a nivel de formulario: la región viva sigue asertada como vacía) y le **añade** la que
    faltaba (el foco está en el campo del error). Su JSDoc explica el cambio. **Condición doble:** anulando
    `focusFirstInvalid` caen **4** tests —los dos de login, el del 409 y el de la validación de register— y
    al restaurarlo vuelven los 21 del par de archivos a verde.
39. **El acceso sigue dependiendo de JavaScript: el formulario se ve, pero sin JS no funciona.** Desde que se
    saldó la 37, el HTML de `/login` ya trae la pantalla; el envío, en cambio, lo hace `fetch` desde el
    manejador de React. Si el JS no ha hidratado todavía (red lenta, cache fría, móvil modesto) o no llega
    nunca (error de carga del chunk, JS bloqueado), lo que ocurre al pulsar Enter es el **envío nativo del
    navegador**, que no habla con `/api/auth/login`: va contra la propia página.
    **Escenario de fallo concreto:** alguien escribe email y contraseña en cuanto ve el formulario y pulsa
    Enter antes de que hidrate; el navegador manda las credenciales a `/login`, el servidor responde **200**
    con la misma pantalla en blanco de datos, y el usuario ve que "no pasó nada" **sin ningún mensaje de
    error**. Vuelve a escribirlo todo. En el peor caso lo repite varias veces antes de que hidrate.
    **Lo que el arreglo mínimo SÍ tapó** (misma ronda; evidencia en
    `progress/reports/impl_auth_forms_post.md`): el formulario declara ahora
    `method="post"`, así que ese envío nativo manda las credenciales en el **cuerpo** y no en la URL. Eso
    cierra la fuga (CWE-598), que era lo irreversible —una URL con la contraseña queda escrita en el
    historial, en el `Referer` y en los registros de proxies y CDN, sitios que no controlamos— pero **no**
    hace que el acceso funcione: el envío sigue sin llegar a ningún sitio útil.
    **Salida completa:** convertir el envío en **Server Action** (`action={...}` en el formulario). Cierra
    las dos cosas de raíz: sin JS el envío llega al servidor y autentica de verdad, y con JS React lo
    intercepta igual. Implica mover la llamada a `loginUser`/`registerUser` fuera del `fetch` de cliente y
    replantear dónde se pintan los errores (hoy vienen del cuerpo de la respuesta). **Es trabajo de una slice
    propia, no de un parche.** Verificación obligatoria de esa slice: pedir la página **con el JavaScript
    desactivado** y comprobar que el acceso se completa.
    ⚠️ **Ojo con la 37 al hacerla:** existe una tercera vía que devolvería `/login` a estática —leer el
    destino en el manejador del envío en vez de en el servidor— pero **reintroduce** la dependencia del JS
    que esta ficha quiere quitar. Las dos no se pueden tener a la vez; si alguien la persigue, que sea
    sabiendo que compra velocidad de servido con el acceso sin JS.
40. **El gate de la deuda 37 no ve dentro de los componentes cliente: el mismo agujero, un nivel más abajo.**
    `src/app/(auth)/auth-pages.test.tsx` → *"no esconde el formulario tras una frontera de Suspense con
    relleno nulo"* recorre el árbol de elementos que **devuelve la página**, y ahí `LoginForm` es una hoja:
    lo que haya dentro de ese componente, o de `AuthPanel`, es invisible para el gate.
    **Escenario de fallo concreto:** alguien envuelve el formulario —o un trozo suyo— en una frontera de
    relleno nulo **dentro** de `LoginForm` o de `AuthPanel` para cargar algo en diferido (un selector, un
    aviso, cualquier cosa con `dynamic`); el HTML de la puerta de entrada de la app vuelve a salir sin
    formulario, exactamente como en la deuda 37, y **el gate sigue verde**. Es la misma clase de defecto que
    ya arrastran las fichas 18, 22, 23 y 33: el test mide una capa y el fallo vive en otra.
    **Propuesta (de la review):** prohibir el relleno nulo en **todo** el subárbol de `(auth)` y de
    `features/auth/ui/` con un barrido por recorrido de directorios, como hace
    `src/shared/ui/canonical-tailwind-classes.test.ts`, para que un archivo nuevo quede cubierto sin tener
    que acordarse de registrarlo. **No se implementó en esta ronda**: el encargo era el arreglo mínimo del
    envío, y un guardarraíl de fuente nuevo necesita su propia condición doble y decidir qué hacer con las
    fronteras legítimas (una con esqueleto sí debe pasar).
41. **El foco se mueve antes de que el DOM tenga puestos los atributos del error: dependencia de
    temporización no medida.** `focusFirstInvalid` se llama **inmediatamente después** de `setFieldErrors`,
    en el mismo manejador. React aplica ese estado en un commit posterior, así que en el instante del
    `focus()` el control **todavía no** tiene `aria-invalid` ni `aria-describedby` apuntando al mensaje: los
    gana un momento después.
    **Escenario de fallo concreto:** un lector de pantalla que compone el anuncio en el instante en que
    recibe el foco —y no vuelve a mirar el nodo— leería "Email, editable" sin la parte de "inválido" ni el
    mensaje, que es justo lo que la deuda 38 quería arreglar. Los tests actuales **no lo detectan**: asertan
    el foco y los atributos por separado y después del commit, cuando ya está todo puesto.
    **No está medido con un lector real** (lo levantó la review razonando, y lo firmo: es una hipótesis
    fundada, no una observación). Antes de tocar nada hay que **reproducirlo con un lector de verdad**; si se
    confirma, la forma de arreglarlo es mover el foco en un efecto posterior al pintado del error, no en el
    manejador.
42. **`focus-first-invalid.ts` no tiene test propio y devuelve un valor que nadie consume.** Su
    comportamiento se prueba sólo a través de los dos formularios (4 tests), así que el orden —"el primer
    inválido en orden visual"— se verifica con los campos concretos de esos formularios y no como regla.
    Además la función devuelve un booleano ("¿movió el foco?") que **ningún llamador lee ni comprueba
    ningún test**: es API muerta.
    **Escenario de fallo concreto:** alguien reordena los campos de un formulario futuro y espera que el
    foco siga el orden visual; la función recorre el array que le pasen, así que si el array no coincide con
    el orden del DOM el foco salta al campo equivocado — y no hay ningún test de la unidad que lo diga,
    porque los que existen usan formularios donde ambos órdenes coinciden. Se tapa con un test de la unidad
    (orden, ausencia de errores, referencia sin montar) y decidiendo si el retorno se usa o se quita.

43. **⚠️ TERCERA APARICIÓN DEL MISMO PATRÓN: el guardarraíl del método de envío protege dos formularios
    *por nombre*, pero el defecto era *de clase*.** `auth-forms.test.tsx:39-42` itera sobre una **lista fija**
    de dos componentes importados a mano. Hoy la cobertura es del **100%** —sólo existen esos dos formularios
    en todo `src/**`, verificado por el reviewer—, así que **no hay nada abierto ahora mismo**. El problema es
    el mañana: el defecto original no era "a `LoginForm` le falta un atributo", era "**un formulario sin
    método declarado envía por GET**", y la lista fija no protege contra esa clase.
    **Escenario de fallo concreto:** llega la pantalla de recuperar contraseña, o la de cambiarla desde el
    perfil. Alguien copia la estructura de `RegisterForm` pero no el atributo del método — es lo primero que
    se pierde al copiar, porque parece redundante cuando el envío lo hace `fetch`. El control lleva
    `name="password"`, el HTML se sirve sin método, y en la ventana previa a la hidratación **vuelve la
    contraseña a la URL** (deuda 39 y su motivo original). Los 481 tests siguen verdes, porque el formulario
    nuevo no está en la lista.
    **Arreglo:** convertirlo en un **barrido por recorrido de directorios sobre `src/**`** — el patrón que ya
    usa `src/shared/ui/canonical-tailwind-classes.test.ts`, elegido precisamente "para que un archivo nuevo
    quede cubierto solo" — asertando que todo elemento de formulario del repositorio declara su método.
    **Es la misma medicina que pide la ficha 40, sobre otro síntoma: conviene taparlas juntas.**
    **Por qué merece atención pese a no estar abierta:** es la **tercera** aparición de "lista fija" en este
    repositorio (ya está fichada en `no-hardcode.test.ts`), y la primera en la que lo que se escapa por el
    agujero es una **credencial**. Detectada por el reviewer en `review_auth_forms_post.md` (NB-1).

> ### Corrección al registro (2026-08-01), para que no sobreviva por inercia
>
> Un encargo del leader —y una review previa— afirmaron que declarar el método POST convertía el peor caso
> en "**un 405 inofensivo**". **Es falso.** En Next 16 una página del App Router responde **200** a un POST:
> el implementer lo midió, lo declaró y corrigió al reviewer, que lo reprodujo y lo aceptó. La conclusión de
> **seguridad no cambia** —el secreto sale de la URL igual, que era lo irreversible— pero la de **experiencia
> sí**: no hay error visible, hay **silencio** (la pantalla se repinta vacía y sin mensaje). Eso es la
> **deuda 39**, no un 405. Registrado porque la caracterización errónea salió de este arnés, no del código.

---

## Reportadas por el usuario probando la app en el navegador (2026-08-01, tras cerrar #31)

> **Cómo llegaron:** el usuario abrió la app y probó el alta y el acceso a mano. **Ninguna está
> diagnosticada**: se registran tal como se observaron, con la hipótesis de partida y el primer paso de
> diagnóstico. **Se arreglan en la siguiente sesión, por decisión suya.**
>
> **Dos de los cuatro síntomas que reportó YA estaban fichados** — no se duplican, se confirman:
> - *"puedo estar en el dashboard sin estar logueado"* → es la **deuda 1**, ya convertida en criterio de
>   aceptación de **#19 `dashboard_ui`** (sacar `/` de las páginas públicas). **Confirmada en pantalla.**
> - *"puedo entrar a login y register aunque ya inicié sesión"* → es la **deuda 36**, colgada de **#32**.
>   **Confirmada en pantalla.**

44. **⚠️ REPORTADO EN PANTALLA: al crear una cuenta no se llega al Dashboard "con la sesión iniciada".**
    El usuario reporta que tras registrarse *"no me redirige a dashboard con mi cuenta y validando"*.
    **Hay dos causas posibles y hay que separarlas antes de tocar nada**, porque llevan a arreglos distintos:
    - **(a) No redirige de verdad.** El alta responde 201 y setea la cookie (`register/route.ts:24`), y el
      formulario debería navegar a `/` o al destino guardado. Si la navegación no ocurre, es un defecto de
      `RegisterForm`.
    - **(b) Redirige, pero no se nota.** `/` es **pública** (deuda 1), así que se ve igual con sesión y sin
      ella; y **el caparazón no muestra el usuario por ningún lado** porque el menú de cuenta es la **#32**.
      O sea: aunque la sesión se haya creado bien, **no hay ni un solo elemento en pantalla que lo diga**.
    **Primer paso de diagnóstico:** mirar si existe la cookie `kc_session` en el navegador después del alta.
    Si está, es (b) y esto no es un bug nuevo sino la suma de las deudas 1 y la ausencia de #32 — y lo que
    corresponde es **priorizar #32**, no parchear el formulario.

45. **⚠️ REPORTADO EN PANTALLA: el alta no rechaza un email ya registrado.**
    El usuario reporta que *"no se valida si ya hay un mail creado"*. **Si se confirma, es un defecto de
    producción**, porque el camino está cubierto por tests y aun así falla en el navegador — exactamente el
    patrón que este proyecto ya sufrió una vez.
    **Por qué los tests no lo veían:** todos los tests de los formularios de auth **doblan `fetch`**
    (`vi.stubGlobal`), así que verifican que *"si el servidor devuelve 409, el error se pinta en el campo
    email"* — nunca que **el servidor devuelva 409 de verdad** contra Postgres real. La cadena completa
    (constraint único → traducción del error → 409) **no la ha ejercitado nadie**.
    **Precedente directo, y es el que da la hipótesis:** el smoke test real contra Neon de la fase 1 destapó
    un bug en `isDuplicateColorCode`, la función que traduce el error UNIQUE de Postgres para las lanas.
    **La sospecha número uno es que la traducción equivalente para el email esté fallando** y el alta acabe
    en un 500 —o en un 201 espurio— en vez de en el 409 que el formulario sabe pintar.
    **Primer paso de diagnóstico:** dar de alta dos veces el mismo email contra la base real y **mirar el
    código de estado y el cuerpo** que devuelve `POST /api/auth/register`. Con eso se sabe si el fallo está en
    el servidor (traducción del error) o en el cliente (mapeo del status).

46. **La cadena de auth completa nunca se ha ejercitado contra la base real** — es la deuda de método detrás
    de la 45, y merece ficha propia porque va a volver a morder.
    `src/app/api/auth/auth-routes.test.ts` dobla el **borde de datos** (`vi.mock` sobre el store) y los tests
    de UI doblan **`fetch`**. Entre los dos no queda ni un test que recorra *navegador → route handler →
    Drizzle → Postgres*. Todo lo que dependa de cómo se comporta **Postgres de verdad** (constraints únicos,
    errores del driver, tipos que el driver devuelve como texto) es **invisible** para la suite.
    **Escenario de fallo concreto:** cualquier violación de constraint que el código traduzca mal se entrega
    con los 481 tests en verde y sólo aparece cuando una persona lo prueba a mano — que es literalmente lo que
    acaba de pasar.
    **Arreglo:** un smoke test real de la cadena de auth contra Neon, como el que ya se hizo para las lanas.
    **Conviene hacerlo ANTES de arreglar la 45**, porque es lo que dice dónde está el fallo.

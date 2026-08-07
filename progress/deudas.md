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

1. ~~**`src/proxy.ts` `/` público vs. Dashboard privado** (#13)~~ → **SALDADA por #19** (2026-08-07,
   enmienda **E1.1** del RFC-02). `PUBLIC_PAGES` pasa a `["/login", "/register"]`: **una línea**. Quedó
   **verificado contra servidor real**, no sólo en test: sin sesión, `GET /` responde
   `307` con `location: /login?next=%2F`; con sesión, `200`.
   **Lo que la salda de verdad no es la línea, es el gate POSITIVO** que se escribió con ella (sin token,
   `/` → 307 con `pathname` `/login` y `next` `/`). El reviewer lo midió: devolviendo `"/"` a la lista, el
   test que **enumera** páginas públicas **sigue verde** —no detecta lo que sobra— y sólo cae el positivo.
   Sin él, la deuda se habría saldado **sin dejar guardia viva**.
   El test viejo se **reescribió, no se recortó** (deuda 29): conserva el invariante de que la puerta de
   entrada se pueda abrir sin sesión. `PUBLIC_PAGES` y `AUTH_PAGES` quedan **sin fusionar** a propósito,
   aunque hoy coincidan: una decide si la sesión es **obligatoria** y la otra si **sobra**.
   **La opción "landing pública aparte" queda DESCARTADA** por E1.1: ningún RFC la pide.
   ⚠️ **OJO — no tachar la deuda 13 por esto.** El `(#13)` del título de arriba es **el id de la FEATURE
   donde se detectó** (convención de este libro; la deuda 2 lleva el mismo `(#13)` y trata de otra cosa),
   **no** un número de deuda. La enmienda E1.1 lo leyó mal y escribió "salda las deudas 1 y 13";
   **corregido el 2026-08-07** en el RFC y en las dos apariciones de `feature_list.json` #19. La deuda 13
   real es el interlineado del botón, **saldada el 2026-07-31** por otro motivo.
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
5. ~~**`GET /api/projects/:id` no devuelve las lanas enlazadas**~~ (#6) → **SALDADA** el 2026-08-06 por
   **#17 `projects_detail_yarns`**. El endpoint responde `{ project, yarns }` (clave **hermana**: `project`
   queda byte a byte como estaba y sigue siendo un `ProjectRecord`), con cada lana en **cinco campos planos**
   `{ id, colorName, colorFamily, brandName, typeName }` y `[]` cuando no hay enlaces. Contrato en **PRD
   §9.1**. `brandName`/`typeName` **exigen un JOIN** (son FKs a `brands`/`yarn_types`): eso era lo que
   mantenía la ficha abierta. **Una sola consulta**, sin N+1, con `WHERE` por `projectId` **y** por
   `yarns.userId`, y `ORDER BY` **total** (marca → tipo → colorName → id como desempate).
   Lo que eleva el saldo: no se confió en el doble en memoria. Se añadió
   `src/features/projects/api/store.test.ts`, que asierta el **SQL realmente emitido** por Drizzle, así que
   las cinco columnas, el `WHERE` del scoping, el `ORDER BY` y el tipo de JOIN quedan fijados **sobre
   producción**, no sobre la réplica. Es la lección de la **deuda 6** aplicada por adelantado.
   Pruebas: `progress/reports/impl_17_projects_detail_yarns.md` y `review_17_projects_detail_yarns.md`.
   Informe: `progress/informs/15.informe-projects_detail_yarns.md`.
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
19. ~~**En tablet no se muestra el nombre de usuario** (consecuencia de la palanca elegida para E2: ocultarlo
    libera el ancho que necesitan las 6 etiquetas). Quien diseñe el menú de cuenta tiene que saberlo.~~
    → **FICHA CORREGIDA Y SALDADA** (#32 `account_menu`, 2026-08-03). **La ficha se quedaba corta y por eso
    engañaba:** desde **E4** el archivero **no existe** por debajo de `--bp-archive` (`ArchiveNav.tsx` lo
    esconde y `BottomNav` lo sustituye), así que el problema no era "en tablet no se ve el nombre" sino que
    **entre 320 y 1179 de ancho no había NINGUNA superficie de shell capaz de alojar la sesión**: `AppShell`
    no le pasaba nada al `BottomNav` y `BottomNav` ni siquiera declaraba esas props. Enunciada como estaba,
    invitaba a la conclusión falsa de que bastaba con volver a enseñar el nombre en el archivero.
    **Cómo se saldó:** la enmienda **E11 b** decide que el control de cuenta vive en una **banda propia del
    `AppShell`**, fuera del `nav` y **sin ninguna variante responsive**, así que rige en los dos regímenes con
    un solo anfitrión y **`BottomNav` no se toca** (ni props de sesión, ni una séptima ranura que rompería el
    reparto a partes iguales de sus 6 accesos táctiles). **Prueba:**
    `src/shared/ui/layout/account-band/account-band.tokens.test.ts` → *"rige de 320px a desktop: sin variante
    responsive y sin ocultarse (E11 b)"*, que recorre las clases reales de la banda y falla si alguna lleva
    prefijo de variante o la esconde.
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
    **RECALIBRADA por #32 (2026-08-03): sigue abierta y sigue siendo la misma, pero ya no es el único
    ejemplar de su especie con solución conocida.** El gate nuevo del extremo derecho
    (`account-band.tokens.test.ts`) es de la misma familia —geometría de la banda contra la pestaña del peor
    caso— y **sí** deriva su posición de las **clases reales** del componente (las lee del `cva` pasado por
    `cn()`, que es lo que acaba en el atributo), no sólo de tokens. Esa es exactamente la técnica que esta
    ficha pide para el wordmark: **hay precedente ejecutable en el repo, cópialo**. Lo que #32 **no** hizo fue
    aplicarla al wordmark, porque tocar `ArchiveNav` estaba fuera de su alcance (E11 a lo deja intacto).
23. **La mitad HORIZONTAL del invariante del wordmark no tiene gate ninguno**, y de ella depende que 5 de las
    6 columnas no lo pisen. Lo único que lo impide son ~27.7px de distancia sin asertar. Y no es holgura
    cómoda: desde E10 columna y ranura están desacopladas, así que **en 4 de las 6 rutas la pestaña de la
    columna 2 con el puntero encima entra 2.4px** en la banda de línea del wordmark. Alargar el wordmark
    (p. ej. a "Knit&Crochet Studio") lo pone encima de una etiqueta sin que ningún test se entere.
    **RECALIBRADA por #32 (2026-08-03): el gemelo VERTICAL del otro extremo ya existe y esta mitad sigue sin
    cubrirse.** E11 c obligó a escribir el gate del extremo derecho, que es el que faltaba en el eje vertical
    (la columna 6 puede caer en la ranura 6 y ahí quedan 2 de techo con el puntero encima, contra los 42 que
    protegen a la columna 1). **Lo que esta ficha describe es lo que sigue destapado: el eje HORIZONTAL.**
    Sigue sin gate para el wordmark, y ahora hay una segunda pieza en la misma banda —el control de cuenta,
    pegado al borde derecho— cuyo ancho tampoco está asertado contra nada. Hoy no colisiona con ninguna
    pestaña porque la banda va **en el flujo**, encima del cajón y no superpuesta a él, así que la separación
    es vertical y total; **si alguien alguna vez la superpone, este eje pasa a importar** y el gate vertical
    ya lo impediría antes (ver el segundo test de `account-band.tokens.test.ts`).
24. **La constante de avance tipográfico no es la cota superior que dice ser: cuenta caracteres, no glifos.**
    El test que garantiza "las 6 etiquetas enteras" multiplica por `label.length`, así que **renombrar una
    etiqueta a otra de igual largo pero con letras más anchas la desborda sin que el test se entere** (una de
    12 caracteres con varias M o W puede sacar ~34px de más). La medición empírica del leader lo delata: 165px
    reales sobre 12 glifos = 0.708 em de **media**, así que hay glifos por encima del 0.72 que el test usa
    como "cota". Protege bien contra subir el tamaño y contra bajar el ancho de nacimiento (su motivo de
    existir), **no** contra cambiar las etiquetas — el cambio más probable de los tres. La red real ahí es el
    recorte con elipsis, que es **degradación, no cumplimiento** del invariante 7. Fusionar con la deuda 20.
    **RECALIBRADA por #32 (2026-08-03): sigue abierta, intacta y ahora es MÁS barata de tapar de lo que la
    ficha sugiere.** #32 no tocó el presupuesto horizontal —E11 a deja el carril como estaba y hay un test
    nuevo que lo fija (*"no toca el presupuesto horizontal del carril"*, que exige que `--nav-tab-inset-end`
    siga derivándose de su gemelo)—, así que **el margen sobre el que esta ficha razona no se movió ni un
    milímetro**: las 6 etiquetas siguen con los mismos 5.15 de holgura por columna. Lo que cambia es que ya
    **no hay ninguna feature pendiente que quiera comerse ese ancho**: el menú de cuenta, que era la
    candidata, se fue a otra superficie. La ficha deja de ser urgente y pasa a ser higiene.
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

29. ~~**#31 `auth_ui` tiene que VOLVER A CABLEAR el usuario y el logout del shell.**~~ → **SALDADA** por
    **#32 `account_menu`** (2026-08-03), que es la slice a la que se acabó colgando (no #31). La cadena está
    entera y **medida en las dos direcciones**:
    - **El usuario** lo resuelve `getSessionUser()` (`src/features/auth/api/session-user.ts`) en el **layout
      servidor** de `(app)`, que lo baja por props hasta `AppShell` → `AccountBand`. Se eligió el servidor
      justo por lo que esta ficha avisaba: era la única salida que **no obliga a invertir** el gate de coste
      ("montar el shell no dispara ninguna petición") — sigue siendo verdad y sigue vigilándolo, ahora con la
      contrapartida explícita de que la única petición que sale del caparazón es la del logout.
    - **El logout** es `POST /api/auth/logout` desde `AppShellClient` y navega a `/login` **sólo si el
      servidor confirma** que borró la cookie.
    - **Los dos gates que esta ficha decía que había que reescribir se reescribieron, no se borraron**
      (`AppShellClient.test.tsx`, con su JSDoc explicando el cambio), y el tercero
      (`layout.test.tsx`, *"acepta user/onLogout pero NO los renderiza"*) también: conserva su invariante
      —**el archivero no aloja el control de cuenta**— y le añade dónde vive ahora.
    - **El escenario de fallo concreto que describía —un botón "Salir" que no hace nada— ya no se puede
      montar:** `AccountBand` no renderiza nada si le falta el usuario **o** el callback, con test propio
      (*"con usuario pero sin cableado tampoco: media sesión no se ofrece"*). Que el control desaparezca es
      visible; que aparezca muerto no lo era.
    **Condición doble del gate de coste:** reponiendo un `fetch` en un efecto de montaje caen **3** tests de
    `AppShellClient.test.tsx` (`fires no HTTP request when mounted…`, `posts to the logout endpoint…` y
    `costs one request per press, and none per mount`) y al quitarlo vuelven los **9** a verde. Salida cruda
    en `progress/reports/impl_account_menu.md`.
    Texto original de la ficha, conservado porque explica por qué el cableado estuvo cortado:
    **#31 `auth_ui` tiene que VOLVER A CABLEAR el usuario y el logout del shell.** Al saldar la deuda 21 se
    borró el `fetch("/api/auth/me")` y el `handleLogout` de `AppShellClient`, y hoy nadie alimenta las props
    `user`/`onLogout` de `AppShell` (que siguen en la firma). **Escenario de fallo:** #31 monta el menú de
    cuenta dentro del `ArchiveNav`, lo cablea a `onLogout` y **el botón "Salir" no hace nada** y el nombre
    del usuario sale vacío, porque la cadena está cortada dos capas más arriba y **ningún test lo delata**:
    el gate vigente asierta justo lo contrario (que el shell no pide nada y no recibe usuario), así que #31
    tiene que **reescribir ese gate**, no sólo añadir código. Lo que hay que reponer: `GET /api/auth/me`
    (endpoint vivo y probado) y `POST /api/auth/logout` + redirección a `/login`. Está escrito también en el
    JSDoc de `src/features/auth/ui/AppShellClient.tsx`.
30. ~~**`AppShellClient` conserva `"use client"` sin usar ya ninguna capacidad de cliente.**~~ → **SALDADA
    SOLA** por **#32** (2026-08-03), que es la de las dos salidas que la propia ficha anticipaba: **el módulo
    recuperó estado de cliente**, así que la directiva dejó de mentir y no hubo que renombrar nada ni repuntar
    a sus tres importadores. Hoy usa `useRouter` y un manejador (`useCallback`) para el logout, que son
    capacidades de cliente por definición: sin la directiva no compilaría.
    **Lo que NO recuperó, a propósito:** el `useState` y el `useEffect` que pedían el usuario. Ese trozo se
    resuelve en el servidor (deuda 29), así que el límite del árbol de cliente que la ficha señalaba como
    coste —`AppShell` y `BottomNav` entrando al bundle del navegador— **sigue existiendo pero ahora se paga
    por algo**: el manejador de logout tiene que vivir en el cliente y cuelga de `AppShell`.
    Texto original de la ficha:
    **`AppShellClient` conserva `"use client"` sin usar ya ninguna capacidad de cliente.** Se quedó sin
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
36. ~~**Un usuario ya autenticado puede entrar a `/login` y `/register`, y nadie lo devuelve al Dashboard.**~~
    → **SALDADA** por **#32 `account_menu`** (2026-08-03), la slice de la que colgaba. `src/proxy.ts` mira
    ahora la cookie **antes** de resolver la allowlist: si la sesión es válida y el destino es una página de
    auth, responde un redirect a `/`. La allowlist seguía decidiendo sólo si la sesión es **obligatoria**; le
    faltaba la mitad que decide si **sobra**.
    **Tres decisiones de alcance, escritas para que nadie las deshaga por inercia:**
    - **Sólo páginas, nunca los endpoints.** Redirigir un `POST /api/auth/login` rompería el propio acceso, y
      que el alta reemplace la sesión es una decisión del endpoint, no del proxy. Hay test.
    - **El destino es siempre `/`, sin honrar el `?next=`.** Ese parámetro lo escribe el propio proxy para
      volver **después** de autenticarse; hacerle caso aquí convertiría una ruta pública en un redirector.
      Hay test con un valor hostil.
    - **Con cookie inválida o caducada la pantalla sigue accesible**, que es justo cuando hace falta. Hay test.
    **Condición doble:** anulando la condición del redirect caen **2** tests de `src/proxy.test.ts` y al
    restaurarla vuelven los **13** a verde. **Medido además contra un servidor real** (`pnpm build` +
    `pnpm start` + `curl` con una cookie firmada con los mismos claims que `signSessionToken`):
    `GET /login` con sesión → **307** con `location: /`, y `POST /api/auth/logout` con esa misma sesión →
    **200**. Salidas crudas en `progress/reports/impl_account_menu.md`.
    Texto original de la ficha:
    **Un usuario ya autenticado puede entrar a `/login` y `/register`, y nadie lo devuelve al Dashboard.**
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
    **Confirmación de campo (#32, 2026-08-03):** al añadir el componente nuevo de la banda de cuenta hubo que
    **acordarse a mano** de registrar sus dos archivos en la lista de `no-hardcode.test.ts` — y de hecho el
    guardrail sólo los vio porque se registraron: recién entonces marcó en rojo tres comentarios con valores
    en píxeles que se habían colado en las explicaciones. Funcionó, pero **funcionó por memoria**, que es
    justo lo que esta ficha dice que no escala. El contraste está en el mismo repositorio:
    `canonical-tailwind-classes.test.ts` cubrió los archivos nuevos **sin que nadie hiciera nada**.

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

45. **⚠️ REPORTADO EN PANTALLA: el alta no rechaza un email ya registrado.** → **RECALIFICADA el
    2026-08-03 como DEUDA DE PRESENTACIÓN, no de datos.** El servidor está medido y devuelve 409; lo que
    no está medido es si ese 409 **se ve**. Por decisión del usuario se da por buena la evidencia y no se
    hace la comprobación en navegador. **Enunciado vigente de la ficha:** *el rechazo del email duplicado
    llega al cliente y se pinta bajo el campo email, pero no hay evidencia de que sea perceptible* —
    candidatos: el texto queda por debajo del campo en tamaño pequeño, el foco pudo no moverse de forma
    visible, y `setFieldErrors({})` al reenviar hace que el mensaje **parpadee** (desaparece y reaparece),
    lo que puede leerse como *"no valida"*. **Cómo cerrarla:** repetir el alta duplicada mirando la
    pestaña Network (si es 409, es esto; si es 500, es la deuda 47). **Se resuelve de verdad revisando la
    prominencia del error de campo en el formulario de alta**, no tocando el servidor.
    Texto original de la ficha, conservado porque la hipótesis que contiene se investigó a fondo:
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

    ### ⬆️ CORRECCIÓN DE LA FICHA (2026-08-03) — la hipótesis de arriba está DESCARTADA

    > El texto anterior se conserva porque explica el razonamiento que llevó al smoke, pero **su hipótesis
    > era falsa**. Se hizo el primer paso de diagnóstico que él mismo pedía (deuda 46) y esto es lo que
    > salió, medido contra Neon real:

    - **`POST /api/auth/register` con un email ya registrado devuelve `409`** con cuerpo
      `{"error":"Ya existe una cuenta con ese email."}`. También con **distinta caja** y con **espacios**
      alrededor. En la base queda **una sola fila**. Salida cruda en
      `progress/reports/impl_smoke_auth_neon.md`.
    - **El paralelo con `isDuplicateColorCode` no aplicaba:** `registerUser` **no depende del error del
      driver**. Hace `findByEmail` **antes** de insertar y lanza `EmailAlreadyRegisteredError`, así que el
      camino nunca llega al `DrizzleQueryError` envuelto que rompía en las lanas. (Lo que sí quedó de ahí
      es la deuda **47**, que es ese mismo agujero pero latente.)
    - **La normalización del email tampoco era:** `emailSchema` (`src/features/auth/validation.ts`) hace
      `.trim().toLowerCase()` **antes** de validar el formato, es el mismo objeto para alta y login, y
      existe desde el commit original de auth — así que **no hay filas legacy sin normalizar creadas por la
      app**. Verificado ejecutando el schema y confirmado contra la base.
    - **El cliente tampoco:** `RegisterForm` mapea el 409 **por status, no por texto**, y la clave `error`
      que lee `auth-client.ts` es exactamente la que emite `errorResponse`. Detalle en
      `progress/reports/explore_auth_register_client.md`.
    - **La constraint UNIQUE existe de verdad en la base** (`users_email_unique`), no sólo en el schema
      Drizzle.

    **Dato de la base que acota el síntoma:** tras el reporte había **una sola fila** en `users` (la cuenta
    `"Agus"` creada a mano el 2026-08-02). Si el alta duplicada hubiera devuelto un 201 espurio, habría
    **dos**. Eso **descarta el 201 espurio**, pero *no* descarta un 500 — las dos cosas dejan una sola fila.

    **Qué queda por medir, y es lo único que puede cerrar la ficha:** qué ocurrió **en la pantalla**.
    Ningún test automático puede darlo. Repetir el alta duplicada con la pestaña **Network** abierta:
    - status **409** → el defecto es de **presentación** (el mensaje se pinta bajo el campo email; pudo
      pasar desapercibido, o el foco no se movió de forma perceptible) y la ficha hay que **reescribirla en
      esos términos**, que son los de una deuda de UI, no de datos.
    - status **500** → aplica la deuda **47** y probablemente la **48**.
    - status **no-409 distinto** → difiere el entorno de ejecución (otro build, otra `DATABASE_URL`), no la
      lógica: tercera línea de investigación.

46. ~~**La cadena de auth completa nunca se ha ejercitado contra la base real**~~ — **SALDADA** el
    2026-08-03. Existe `src/__smoke__/auth.smoke.test.ts`, guardado por el mismo flag `SMOKE_NEON` que el
    smoke de las lanas: en la corrida hermética queda **skipped y sin abrir conexión**. Ejercita los
    **Route Handlers reales** con un `Request` real (no dobla el store ni `fetch`), así que recorre
    *route handler → zod → servicio → Drizzle → Neon* **y** la respuesta HTTP (status, cuerpo, `set-cookie`).
    Cubre alta feliz, alta duplicada, normalización de caja/espacios, los tres caminos del login y la
    existencia real de la constraint UNIQUE en la base. **5/5 en verde.** Prueba:
    `progress/reports/impl_smoke_auth_neon.md`. Queda como guardia viva.
    Texto original de la ficha, conservado porque explica por qué se hizo: era la deuda de método detrás
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
    *(Se hizo, y acertó: dijo que el fallo NO estaba en el servidor. Ver la corrección de la ficha 45.)*

47. **`createAuthUserStore(...).create` no traduce la violación UNIQUE `users_email_unique` (23505).**
    Encontrada leyendo el código durante el diagnóstico de la 45; **no reproducida**, porque el
    pre-chequeo de `registerUser` la tapa en el caso secuencial.
    **Escenario concreto de fallo:** si el insert llega a chocar con la constraint, `store.create`
    (`src/features/auth/api/store.ts`) deja escapar el error crudo del driver y el route handler responde
    **500 "Error interno del servidor."** en vez del **409** accionable que el formulario sabe pintar bajo
    el campo email.
    Es **el mismo agujero que el smoke destapó en `isDuplicateColorCode`** (lanas), por una puerta distinta:
    el driver `neon-http` envuelve el error de Postgres en un `DrizzleQueryError` cuyos `.code`/`.constraint`
    son `undefined`, y el `NeonDbError` con `code: "23505"` viaja en **`.cause`**. El fix tiene la misma
    forma que el que ya se aplicó en `src/features/yarns/api/store.ts`: recorrer la cadena de `.cause` con
    guarda de profundidad. **Se puede reutilizar esa heurística en vez de duplicarla** — candidata a subir a
    `shared/`. Debe llevar test de la forma **anidada**, no sólo de la plana (fue exactamente lo que dejó
    verde el bug de las lanas).

48. **`registerUser` es un *check-then-act* no atómico: ventana de carrera entre `findByEmail` y el insert.**
    `src/features/auth/api/register.ts`. La ventana está **ensanchada a propósito** por el
    `await hashPassword(...)` que va en medio: bcrypt con coste 12 tarda decenas o centenas de milisegundos.
    **Escenario concreto de fallo:** dos altas **simultáneas** del mismo email (doble clic que burle el
    `disabled`, dos pestañas, un reintento de red) pasan las dos el `findByEmail`; una inserta y la otra
    choca con el UNIQUE → y por la deuda **47**, eso sale como **500**, no como 409.
    El smoke de la 46 es **secuencial y no lo reproduce**; queda documentado, no medido.
    **Orden de arreglo:** la 47 primero. Con la traducción del 23505 puesta, esta carrera degrada a un 409
    correcto y la 48 deja de ser un fallo visible (la constraint de la base es la que decide, que es lo
    correcto). Sin la 47, es un 500 en la cara del usuario.

## Deudas nuevas — de la feature #32 `account_menu` (`impl_account_menu.md`)

Ninguna bloquea. Las dos primeras son consecuencias conscientes de decisiones que se tomaron con su motivo;
la tercera es un hallazgo colateral, medido.

49. **Si el cierre de sesión falla, no se lo decimos a nadie: el botón simplemente no hace nada.**
    `AppShellClient` navega a `/login` **sólo** cuando `POST /api/auth/logout` confirma que borró la cookie,
    que es lo correcto (navegar sin confirmación deja al usuario en la pantalla de acceso **con la sesión
    viva**, y el proxy lo devuelve de rebote al Dashboard desde que se saldó la deuda 36). Lo que falta es la
    otra mitad: **cuando no confirma, no se pinta ningún mensaje**.
    **Escenario de fallo concreto:** alguien pulsa "Salir" con la red caída o con el servidor devolviendo un
    500. La petición se va, vuelve mal, y en pantalla **no pasa absolutamente nada**: ni mensaje, ni spinner
    que se apague, ni cambio de foco. La lectura natural es "el botón está roto", y lo más probable es que lo
    pulse otra vez, y otra. Es **la misma clase de silencio** que la deuda 39 describe para el envío de los
    formularios sin JS: el peor resultado no es el error, es la ausencia de error.
    **Está cubierto por dos tests** (`does not navigate if the server did not clear the session` y
    `does not navigate if the request never left`), así que la **decisión** de no navegar está protegida; lo
    que no existe es la **señal** al usuario.
    **Arreglo:** ya hay pieza para ello y no habría que inventar nada — `AuthFormError`
    (`features/auth/ui/`) es un bloque de error con región viva, y está fichado como candidato a promover a
    `shared/ui` en cuanto tenga un segundo consumidor. Este es ese segundo consumidor. No se hizo en #32
    porque promover un componente del feature al design system es un cambio de contrato del template, no un
    detalle del cableado, y el alcance de la slice era el menú de cuenta.

50. **`/` pasó de estática a dinámica, y cada carga de una página de `(app)` cuesta una lectura de la base.**
    Medido en dos builds limpios: **antes** el listado del build marcaba `/` como estática (`○`), **después**
    como dinámica (`ƒ`). Es la consecuencia inevitable —y aceptada— de que el caparazón muestre quién está
    dentro: el layout de `(app)` lee la cookie, y leer la cookie hace la ruta dinámica. Es exactamente el
    mismo precio que se pagó en la deuda 37 para `/login`.
    **Lo que sí conviene tener en el radar:** el layout llama a `getSessionUser()`, que hace **un `findById`
    contra Neon por carga de página**. No es por navegación (un layout compartido no se vuelve a renderizar
    en la navegación de cliente del App Router), pero sí por carga completa y por `router.refresh()`.
    **Escenario de fallo concreto:** cuando existan las 6 páginas y alguien navegue con recargas duras, cada
    una arranca con una consulta a la base cuyo resultado es siempre el mismo durante los 7 días que vive la
    cookie. Con Neon serverless eso es latencia en el camino crítico del primer render.
    **Cuándo importa de verdad:** cuando `/` deje de ser pública (deuda 1, criterio de aceptación de **#19**)
    la mitad "estática vs dinámica" deja de tener sentido —una página privada no se prerenderiza— y queda
    sólo la lectura. **Arreglo natural si molesta:** meter el nombre en el propio JWT al firmarlo, y así el
    caparazón no necesita la base para pintar la banda. No se hizo en #32 porque cambia el contenido del
    token, o sea el contrato de sesión de toda la app, y eso no cabe en una slice de UI.

51. **La banda de cuenta sólo se ha visto en una ruta, porque sólo existe una ruta.** El caparazón se
    verificó con tests de comportamiento (RTL sobre el marcado real) y con el gate de geometría, y contra un
    **servidor real** se comprobó el caso anónimo (la banda **no** sale) y el redirect de la deuda 36. Lo que
    **no** se ha visto es la banda con una sesión de verdad en pantalla, porque para eso hace falta una fila
    real en `users` y esta slice tenía prohibido tocar la base.
    **Se solapa con la deuda 26 y conviene mirarlas juntas** en la primera validación visual: 26 pide
    comprobar la escalera del archivero en las 6 rutas (hoy imposible: 5 no existen) y esto pide comprobar en
    esas mismas 6 que la banda no se lleva por delante nada del cajón. Como la banda va **en el flujo**, la
    predicción es que empuje el archivero hacia abajo y no lo toque en ninguna ruta; **eso es una predicción
    derivada de tokens, no una observación**.

52. **El gate de E11(c) sólo mira las clases PROPIAS de la banda: se la puede superponer desde fuera y
    seguiría verde.** La levantó el reviewer de #32 (NB-1 de `progress/reports/review_account_menu.md`).
    `src/shared/ui/layout/account-band/account-band.tokens.test.ts:208-215` deriva el desplazamiento de las
    clases del `cva` de la banda — que es lo correcto, y es lo que hace que el gate **no** sea de los que
    miden un par elegido a mano. El agujero está una capa más arriba.
    **Escenario de fallo concreto:** `AccountBand` acepta un `className` (`AccountBand.tsx:16, 50`) y
    `AppShell.tsx:63` podría envolverla en un contenedor posicionado. En cualquiera de los dos casos la banda
    **queda superpuesta al cajón** —exactamente la colisión que E11(c) existe para impedir, con la pestaña de
    la columna 6 a 2px del techo con el puntero encima— **y el gate sigue en verde**, porque las clases del
    `cva` no han cambiado. El test de orden del DOM (`layout.test.tsx:227-247`) tampoco lo ve: **el orden de
    los nodos no cambia al posicionar en absoluto.**
    Es la misma familia que las deudas **22 y 40**: *el gate no ve dentro de la capa que de verdad decide.*
    **Arreglo:** asertar además que `AppShell` no pasa clases de posicionamiento a la banda y que su
    contenedor no lleva utilidades de fuera de flujo; o —mejor— subir la comprobación al `AppShell` ya
    renderizado, que es la única capa donde la geometría final es observable.

53. **La banda de cuenta no tiene nombre accesible propio ni landmark.** NB-6 del mismo review.
    `AccountBand.tsx:48-61` es un contenedor con `data-slot`, un `span` con el nombre y el botón de salida.
    **Escenario de fallo concreto:** un lector de pantalla anuncia el nombre de la persona **suelto**, sin
    ningún contexto que diga que eso es la cuenta con la sesión abierta; queda como un texto huérfano entre
    el wordmark y el archivero. `axe` **no lo marca** porque no es una violación — es justo el tipo de hueco
    que un barrido automático no puede ver.
    **Arreglo:** un `aria-label` en el contenedor, o hacer que el nombre sea el nombre accesible del bloque.
    **Mirala junto a la 51 y la 26** en la primera validación visual: son las tres cosas que sólo se cierran
    con una pantalla delante.

54. **`GET /api/auth/me` se ha quedado sin ningún consumidor en producción.** NB-5 del mismo review,
    verificado con búsqueda en `src`: hoy sólo lo nombran comentarios y un test del proxy.
    **No es un defecto de #32** — el `acceptance` pedía dos cosas incompatibles (cablear el endpoint *y*
    tomar la opción de menor radio, que era resolver el usuario en el layout servidor) y se eligió la
    preferida con el motivo escrito. Pero deja un **endpoint público sin llamadores**, y eso es superficie
    que hay que mantener y proteger sin que nadie la use.
    **Decisión pendiente (de producto, no técnica):** o se le da consumidor —el candidato natural es un
    refresco de la banda en cliente— o se retira con sus tests. **No la dejes en el limbo**: un endpoint sin
    dueño es el que nadie actualiza cuando cambia el contrato de sesión.

55. ~~**El tope de subida de 5 MB no cabe en el límite de cuerpo de petición de Vercel.**~~
    **SALDADA en el acto, el 2026-08-05, antes de cerrar la feature 15.** La levantó el reviewer de #15
    (O2 de `progress/reports/review_uploads_image.md`) contra el tope de **5 MB** que el usuario había
    cerrado horas antes, y la marcó como la más importante de las suyas. Tenía razón.
    **El hecho, verificado contra la documentación de Vercel y no de memoria:** las funciones limitan el
    cuerpo de petición a **4,5 MB**, el límite se aplica **a nivel de infraestructura** —no se puede subir
    desde `vercel.json` ni desde el código— y lo que lo excede muere con un **413
    `FUNCTION_PAYLOAD_TOO_LARGE`** de la plataforma, **antes de que el handler exista**.
    **Escenario de fallo que se evitó:** con el tope en 5 MB, el test `accepts a file sitting exactly on
    the size limit` certificaba en verde un caso que en producción **siempre** falla, y el usuario que
    subiera una foto grande habría recibido un error de plataforma que no es nuestro `{ error }` y que la
    UI no sabe pintar. No lo habría visto nadie hasta el primer deploy con tráfico real.
    **Cómo se saldó:** el leader lo elevó al usuario en vez de enterrarlo como ficha —contradecía una
    decisión que él acababa de tomar con información incompleta— y el usuario **bajó el tope a 4 MB**.
    Registrado en **PRD §11.9** con el porqué, para que quien lo suba en el futuro sepa que primero tiene
    que resolver el límite de la plataforma (subida directa del navegador a Cloudinary con firma).
    **La lección de método, que es lo que conviene recordar:** el defecto no estaba en el código, estaba en
    el **contrato**. Ningún test podía encontrarlo, porque los tests miden el código contra el contrato y
    aquí lo que fallaba era el contrato contra la plataforma. Lo encontró un reviewer que fue a comprobar
    un valor cerrado contra el entorno de despliegue real.

56. **El cuerpo entero se carga en memoria antes de comprobar el tamaño.** O3 del mismo review.
    `readFormData` (`src/shared/lib/http.ts`) llama a `request.formData()`, que **bufferiza el archivo
    completo**, y sólo después zod mira `file.size`.
    **Escenario de fallo concreto:** una petición de 500 MB se materializa en RAM antes de que el endpoint
    devuelva su 400. El contrato del PRD §11.9 ("las comprobaciones ocurren **antes de llamar a
    Cloudinary**") **se cumple** —no se gasta ni red ni cuota de Cloudinary—, pero el rechazo no es tan
    barato como la frase sugiere: cuesta memoria del servidor.
    **Muy mitigada por la 55:** el límite de 4,5 MB de Vercel corta el cuerpo antes de llegar. Importa de
    verdad **si algún día se deja de desplegar en Vercel**, o en desarrollo local, donde no hay ese corte.
    **Arreglo natural:** mirar el `Content-Length` de la cabecera antes de leer el cuerpo.

57. **La rama de `ImageUploadUnavailableError` del handler es redundante y ningún test la distingue.**
    O1 del mismo review, **medido**: anular la rama con una condición falsa deja la suite en **19/19 verde**.
    `src/app/api/uploads/image/route.ts` traduce `ImageUploadUnavailableError` a un 500 con `console.error`
    — que es **exactamente** lo que ya produce el catch-all de `withSession` (`src/shared/lib/http.ts`).
    **No es un defecto:** el acceptance pedía que las dos excepciones de Cloudinary estuvieran capturadas y
    traducidas, y lo están; ésta simplemente se cumple dos veces.
    **Escenario de fallo concreto, que es a futuro:** si mañana alguien borra la rama por "código muerto",
    ningún test se entera; y si mañana se quiere un mensaje propio para "el servicio de imágenes no está
    configurado" —que es información distinta de "error interno"— hoy no hay nada que lo proteja.
    **Arreglo:** o se elimina por redundante, o se le da un comportamiento propio que un test pueda
    distinguir del camino genérico.

58. **El endpoint confía en el `Content-Type` que declara el cliente; no mira el contenido real.**
    O4 del mismo review, y coincide con la deuda que el propio implementer se auto-fichó.
    `file.type` lo escribe quien sube: la lista blanca de PRD §11.9 filtra una **declaración**, no un hecho.
    **Escenario de fallo concreto:** un binario cualquiera renombrado y enviado con
    `Content-Type: image/jpeg` pasa el filtro local y llega a Cloudinary. El daño real es limitado —
    Cloudinary valida por su cuenta y rechaza lo que no sea una imagen, y ese rechazo ya está traducido a un
    502— pero significa que **nuestra** primera línea de defensa es declarativa.
    **Correctamente NO implementado:** inspeccionar los *magic bytes* está fuera del contrato cerrado y
    habría sido alcance inventado. Queda fichado con dueño.
    **MATIZ (2026-08-05, al saldar la 59): la segunda línea de defensa quedó MEDIDA UNA VEZ, no GUARDADA
    POR UN TEST.** Bytes que no son imagen declarados `image/png` llegaron a Cloudinary y **Cloudinary los
    rechazó de verdad** (`Invalid image file`, status 400 del proveedor), y ese rechazo salió traducido al
    502 que la ficha prometía. Pero eso lo verificó **el ojo humano leyendo el `console.error`**, no un
    `expect`: el caso 2 del smoke no distingue ese rechazo de cualquier otro fallo (ficha **63**). Un test
    no guarda lo que una persona leyó una vez. **La ficha sigue viva y con el mismo dueño.**

59. ~~**Nadie ha subido todavía un archivo real a una cuenta real de Cloudinary.**~~ — **SALDADA** el
    2026-08-05. Existe `src/__smoke__/cloudinary.smoke.test.ts`, guardado por su **flag propio
    `SMOKE_CLOUDINARY`** (no reutiliza `SMOKE_NEON`: esta cadena **no toca la DB**, el `userId` sólo tiene
    que ser un uuid válido, no existir en `users`). En la corrida hermética queda **skipped sin tocar red ni
    leer `.env`** — verificado por el reviewer lanzando Vitest desde un cwd sin `.env`.
    **Las dos preguntas de la ficha quedan respondidas, y las dos por medición:**
    (a) *¿la firma es la que Cloudinary espera?* **Sí, y funcionó a la primera.** Un PNG real subió por la
    cadena completa (Route Handler real → `uploadUserImage` → `uploadImage` → `fetch` real) → **201**.
    (b) *¿la respuesta trae `secure_url` con la forma que asume `extractSecureUrl`?* **Sí:** la URL es
    `https:` (que es justo lo que distingue `secure_url` de `url`) y **el `fetch(url)` devolvió 200
    `image/png` con los mismos bytes subidos**. Sin ese `fetch` la deuda no estaría saldada.
    El teardown borra lo subido con `/destroy` firmado por el mismo `buildUploadSignature`, así que la firma
    queda ejercitada **por dos caminos distintos**.
    **Condición doble ejecutada (regla 3):** con `.join("&")` → `.join(",")` en `buildUploadSignature`, el
    caso 1 cae en rojo con `401 Invalid Signature` de Cloudinary; restaurado, verde. **Sólo el caso 1 es
    sensible a la firma** — ver la ficha **63**.
    **A diferencia de su hermana la deuda 6, NO destapó ningún bug de producción.** El único cambio en `src/`
    es exportar `CLOUDINARY_API_BASE` para que el teardown no hardcodee la URL.
    Pruebas: `progress/reports/impl_deuda59_cloudinary_smoke.md` y
    `progress/reports/review_deuda59_cloudinary_smoke.md`. Informe: `progress/informs/13.informe-deuda59-smoke_cloudinary.md`.
    Texto original de la ficha, conservado porque explica por qué se hizo: O5 del mismo review.
    Todo está medido contra `fetch` mockeado en el borde, que es la técnica correcta para tests unitarios,
    pero deja en pie la **regla 4** de `current.md`: *para lo que se sirve al navegador, medí contra un
    servidor real*. Es la misma regla que en #31 destapó los dos defectos más serios, que ningún test vio.
    **Lo que nadie ha comprobado:** que la firma que construye `buildUploadSignature` sea la que Cloudinary
    espera de verdad, y que la respuesta real tenga la forma que `extractSecureUrl` asume.
    **Cuándo se cierra:** con los formularios #22/#25/#28, o antes con un `curl` manual con cookie de sesión.
    Es la hermana de la deuda 6, que se saldó exactamente así contra Neon — y que al hacerlo **destapó un
    bug de producción**.

60. **El contrato de respuesta del endpoint no está asentado donde lo vean sus tres consumidores.**
    O6 del mismo review. `POST /api/uploads/image` responde **201** (no 200) con `{ url }`; el campo del
    formulario se llama **`file`**; los errores son `{ error }` con 400/401/502/500.
    **Escenario de fallo concreto:** #22 (Project), #25 (Yarn) y #28 (Pattern) son **tres slices distintas,
    en tres sesiones distintas**, y cada una va a cablear la subida por su cuenta. La primera que asuma
    `200` porque "un POST que devuelve datos responde 200" se romperá, y lo hará en el navegador y no en un
    test, porque el mock lo escribirá quien escriba el consumidor.
    **Arreglo:** queda asentado en las "Notas para consumidores del design system" de `current.md` en el
    cierre de esta feature. Verificar que sobrevive al volcado a `history.md`.

61. **Ninguna imagen se borra nunca de Cloudinary.** O7 del mismo review.
    Es **consecuencia directa del contrato**, no un defecto de la implementación: el `publicId` es único por
    subida (PRD §11.9) precisamente para que una foto nueva no sobrescriba a la anterior y no rompa las URLs
    ya persistidas en filas anteriores.
    **Escenario de fallo concreto:** cada vez que alguien reemplace la foto de un proyecto, de una lana o de
    un patrón, la imagen anterior queda **huérfana para siempre** en Cloudinary. Nadie la referencia y nadie
    la borra. Con el tiempo es cuota pagada por archivos que no se sirven.
    **Sin dueño hoy, y a propósito:** el PRD no contempla borrado de imágenes. Cuando se contemple, esta
    ficha es el punto de partida.

62. **Sin límite de frecuencia ni de volumen de subida por usuario.** O8 del mismo review.
    Con una sesión válida se puede subir sin tope: N peticiones de hasta 4 MB, sin cuenta ni ventana.
    **Contrapartida deliberada del `publicId` único** — con un `publicId` determinista el mismo usuario se
    sobrescribiría a sí mismo y el consumo estaría acotado por construcción, pero eso es justo lo que la
    decisión del PRD §11.9 prohíbe, y por buenas razones (ver 61).
    **Escenario de fallo concreto:** una cuenta comprometida, o simplemente un bucle en un formulario, agota
    la cuota de Cloudinary del proyecto entero. Es la superficie de abuso que el endpoint abre por diseño.

---

## Nuevas del saldo de la deuda 59 (smoke real de Cloudinary, 2026-08-05)

63. **El caso 2 del smoke de Cloudinary es un embudo: pasa aunque la petición nunca llegue a Cloudinary.**
    Levantada por el implementer y **agravada por el reviewer**, que fue el que midió su alcance real. Se
    asienta con la redacción del reviewer, no con la del informe: *"no distingue por qué falló"* suena a
    matiz cuando lo cierto es más duro.
    `src/__smoke__/cloudinary.smoke.test.ts` caso 2 asierta tres cosas (status 502, el mensaje exacto, y que
    no venga `url`). El problema es que **cualquier** fallo aguas arriba desemboca en ese mismo 502: red
    caída, credenciales equivocadas, firma rota, DNS, proveedor caído. **Medido:** con
    `buildUploadSignature` rota a propósito, el caso 2 **siguió verde**.
    **Escenario de fallo concreto:** el caso 2 no prueba ni siquiera que se haya contactado al proveedor, así
    que **no guarda nada del rechazo de contenido de la deuda 58** — esa medición fue manual. Y como guardián
    de regresión sólo cubre el contrato del endpoint (*algo falló arriba → 502 con este mensaje y sin `url`*),
    que **ya está cubierto** sin gastar red en `src/app/api/uploads/uploads-routes.test.ts:310`. Gasta una
    llamada a la cuenta real a cambio de nada que no estuviera cubierto.
    **El único caso sensible a la firma es el 1.**
    **Arreglo (barato, para quien vuelva a tocar el archivo):** asertar sobre el `reason` de
    `CloudinaryUploadError` (`"rejected"`, no `"network"`) o sobre el mensaje del proveedor, para que deje de
    ser un embudo. En la misma pasada: `expect(bytes).toBe(png.size)` en vez de `toBeGreaterThan(0)` — el
    valor exacto es derivable y gratis (`png.size`), y convertiría en invariante ejecutable la frase del
    informe que hoy sólo verificó un `console.log`. Es la **regla 5** aplicada.

64. **Nadie mide todavía "cookie del navegador → `userId`" en una ruta privada.**
    Levantada por el implementer del smoke de Cloudinary. Para construir la petición del smoke hubo que
    doblar `cookies()` de `next/headers` con `vi.mock`, porque fuera del runtime de Next no existe. Es lo
    correcto para ese test, pero deja al descubierto que **ese eslabón nunca se ejercita de verdad en
    ninguna ruta privada**: la cookie que fabrica el login y la que lee `withSession` se verifican por
    separado, nunca la una contra la otra a través del navegador.
    **Escenario de fallo concreto:** un cambio en los atributos de la cookie (nombre, `path`, `sameSite`,
    `secure`) puede dejar la suite entera en verde y aun así hacer que el navegador **no mande la cookie** en
    la petición de subida — el usuario vería un 401 en un formulario recién logueado. Es de la familia de la
    **regla 4**: lo que se sirve al navegador se mide contra un servidor real.
    **Cuándo se cierra:** con el primer formulario que suba una foto de verdad desde el navegador (#22, #25 o
    #28), que es justo cuando más caro sale descubrirlo.

65. **Cada corrida del smoke deja una carpeta vacía en la cuenta real de Cloudinary.**
    El teardown borra el **asset** (verificado: `resources` bajo `knit-crochet/users` = `[]`), pero no la
    **carpeta** `knit-crochet/users/<uuid>` que la subida creó. Borrarlas exige la **Admin API**, que la app
    de producción no usa ni necesita — meterla en el código sólo para limpiar tests sería peor.
    **Escenario de fallo concreto:** es cosmético hoy, pero acumulativo: una carpeta huérfana por corrida de
    smoke, para siempre, ensuciando la consola de Cloudinary de la persona que la mire. **No** es la deuda
    **61**, que es del producto (imágenes reemplazadas que quedan huérfanas); ésta es del arnés de pruebas.
    **Estado:** las dos carpetas que dejaron el implementer y el reviewer **ya están borradas** por el líder
    con la Admin API vía `curl` (`{"deleted":[...]}`, y `knit-crochet/users` quedó en `total_count 0`).
    **Arreglo:** o se acepta y se limpia a mano de vez en cuando (lo hecho hoy), o el teardown llama a la
    Admin API con las mismas credenciales, sólo desde el test y nunca desde `src/` de producción.

---

## Nuevas de la feature #16 `dashboard_comparison_3metrics` (2026-08-05)

> Las 66-70 las levantó el implementer y **el reviewer las suscribe las cinco**. La **71** la levantó el
> reviewer y el implementer **no** la había visto.

66. **La comparativa de `yarnMeters` es lifetime y no se mueve con el filtro, pero el payload no lo dice.**
    Un consumidor recibe `comparison.yarnMeters` dentro de una respuesta que **sí** trae `year`/`type`
    aplicados a las otras dos métricas, y **nada en el dato** marca que ésa no se filtra.
    **Escenario de fallo concreto:** el usuario cambia el año en el Dashboard, ve **moverse dos comparativas
    y quedarse una**, y no hay nada que se lo explique. Parece un bug y no lo es. Está en el PRD (§11.2) y
    desde hoy también en un test (`metrics-service.test.ts`, el que asserta que metros no se mueve), pero
    **no en el dato**.
    **Arreglo:** una nota en la UI de #19, o antes marcando la entrada en el payload.
    **⚠️ El reviewer pide cerrarla ANTES de escribir #19, no durante.**

67. **El guardrail de no-hardcode lee texto plano y no distingue comentario de código.**
    Ya provocó un rojo **legítimo pero incómodo** durante la implementación: un docstring que citaba la cifra
    del puente de unidades disparó el guardrail. Daría un falso positivo si alguna semilla llegara a valer un
    número que aparece de forma natural en el código (hoy ninguna vale `0` ni `1`, que son los únicos dígitos
    del servicio).
    **Arreglo:** parsear, o —más barato— escanear sólo las líneas que no empiezan por `*` o `//`.
    Familia de la **40** y la **43** (escaneos de fuente). **No confundir con la 71**, que es otra cosa.

68. **Nada obliga POR TIPOS a que una métrica nueva traiga su comparativa.**
    `MetricComparisons` declara sus tres claves a mano. Si mañana `DashboardMetrics` gana una cuarta métrica,
    **el compilador no dirá nada** y la UI recibirá un mapa incompleto.
    **Escenario de fallo concreto:** el test del endpoint asserta las tres claves, así que caería en rojo —
    pero **por un test, no por el tipo**, que es la red más débil y la que se descubre más tarde.
    **Arreglo:** derivar las claves de un único origen (una constante de claves de métrica, o
    `Record<MetricKey, Comparison>`).

69. **`times` puede ser menor que 1 y nadie ha decidido cómo se lee.**
    Con poco tejido la respuesta es del tipo *"0,41 colectivos"*, y con `times = 0` es *"0 partidos de
    fútbol"*. **El backend está bien** —el cociente es correcto y el caso está testeado—; lo que falta es
    decisión de producto: el PRD **no fija redondeo, ni plural, ni un texto alternativo para el caso vacío**,
    y RFC-02 §4 sí define un estado vacío para la página.
    **⚠️ El reviewer pide cerrarla ANTES de escribir #19**, junto con la 66. Lo va a chocar esa slice.

70. **`pickComparison` ordena la lista en cada llamada.**
    Son 5-6 elementos y tres llamadas por request, así que **hoy es irrelevante y no se propone tocarlo**.
    Pero las listas ya vienen ordenadas de config (hay un invariante que lo exige) y el `sort` defensivo se
    repite en cada petición. Ficha de higiene, **prioridad baja**. Si se toca, el test *"does not depend on
    the order in which the list is written"* es el que protege el cambio.

71. **El guardrail de no-hardcode del dashboard es de LISTA FIJA: CUARTA aparición del patrón de las 40/43.**
    La levantó **el reviewer**; el implementer no la había visto. `comparison-service.test.ts` declara
    `SERVICE_FILES = ["./comparison.ts", "./metrics.ts"]`. Es un clon estructural de
    `src/shared/ui/primitives/no-hardcode.test.ts` (lista fija + `readFileSync` por `import.meta.url` +
    regex), que es **exactamente** lo que la **43** ficha como patrón recurrente y lo que la **40** propone
    sustituir por un **barrido por recorrido de directorios**, como ya hace
    `canonical-tailwind-classes.test.ts` "para que un archivo nuevo quede cubierto solo".
    **Aquí es PEOR que en la 43:** allí la lista fija cubría el **100%** de los archivos existentes de su
    clase; aquí **no cubre** `store.ts`, `index.ts` ni `testing/in-memory-store.ts`, que **ya existen** en la
    misma capa de servicio.
    **Escenario de fallo concreto:** #19 añade `src/features/dashboard/api/comparison-labels.ts` con las
    etiquetas escritas a mano, o cuela una etiqueta en `store.ts`; el guardrail **no lo mira**, la aceptación
    #2 de la ficha #16 queda incumplida en el código y los 577 tests siguen verdes.
    **Hoy no hay nada abierto** (el reviewer verificó que ninguno de esos archivos guarda datos de
    referencia), pero **la clase está sin proteger**.
    **Arreglo:** recorrer `src/features/dashboard/**` en vez de nombrar dos archivos. **Se tapa junto con la
    40 y la 43: es la misma medicina, y ésta es la cuarta vez que se paga.**

---

## Nuevas de la feature #17 `projects_detail_yarns` (2026-08-06)

> Las 72-77 las levantó el implementer y **el reviewer las suscribe las seis**, sin encontrar que ninguna
> tapara un fallo que debiera haberse arreglado en la slice. La **78** y la **79** las levantó el reviewer.

72. **El orden determinista se apoya en DOS criterios de comparación distintos, y nadie los ha enfrentado.**
    Postgres ordena `text` con la **colación de la base** (en Neon, típicamente `en_US.UTF-8`: insensible a
    mayúsculas y a signos), mientras el doble en memoria compara por ***code point*** (`"Z" < "a"`,
    `"a" < "á"`). Con los datos de prueba (ASCII, iniciales distintas) los dos coinciden.
    **Escenario de fallo concreto:** una marca *"álamo"* o *"ZARA"* sale en un orden en producción y en otro
    en los tests. **El test verde no prueba que coincidan siempre**: lo que está indeterminado no es el orden
    —que es determinista en las dos implementaciones— sino su **coincidencia** en un caso que hoy ningún test
    ejerce.
    **Arreglo:** medirlo con `SMOKE_NEON=1` sobre nombres con acento y mayúsculas mezcladas, o forzar
    `COLLATE "C"` en el `ORDER BY`.

73. **La corrida hermética NUNCA ejecuta el JOIN contra Postgres.** *(El reviewer la señala como la que más
    merece atención del leader.)* `store.test.ts` asierta el SQL **emitido** (resuelve con cero filas) y el
    doble asierta el **comportamiento**; que ese SQL **devuelva filas** sólo se comprueba en el smoke de
    Neon, que está `skipped` por defecto.
    **Escenario de fallo concreto:** un SQL sintácticamente perfecto puede fallar contra la DB real. **Es el
    mismo patrón que destapó la deuda 6.** Mitigado hoy porque el smoke ya trae la aserción, pero **nadie la
    ejecuta**. Hermana de la **59** y la **64**: la familia de la **regla 4**.

74. **Dos formas distintas de "las lanas de un proyecto" en el mismo recurso.**
    `GET /api/projects/:id` devuelve `yarns` (objetos de cinco campos) y
    `POST`/`DELETE /api/projects/:id/yarns[/:yarnId]` devuelven `{ yarnIds }` (**sólo ids**).
    **Escenario de fallo concreto:** la tab Lanas de #21 va a enlazar una lana y necesitar sus **nombres al
    instante**. O re-fetchea el detalle entero en cada enlace, o mantiene **dos representaciones** en el
    estado y las sincroniza a mano. **Decidirlo ANTES de #21, no durante.**

75. **El doble en memoria APLANA los catálogos.** `InMemoryYarnRow` guarda `brandName`/`typeName` **copiados
    en cada lana**, no tablas `brands`/`yarn_types`.
    **Escenario de fallo concreto:** dos lanas de la misma marca pueden quedar con **nombres distintos** en
    un test, y no hay forma de escribir un test tipo *"renombro la marca y las dos lanas cambian"*. El día
    que el detalle necesite `brandId` (p. ej. para filtrar el selector) el doble se queda corto.

76. **Asimetría de scoping DENTRO del mismo store.** `listLinkedYarns` recibe `userId` y lo aplica;
    `listYarnIds(projectId)` **sigue sin dueño** y confía en que el servicio llamó antes a
    `findById`/`findYarn`.
    **Escenario de fallo concreto:** hoy es inofensivo (los dos llamadores lo hacen), pero es **exactamente
    la asimetría que abre un agujero** cuando alguien reutiliza el método más barato sin saber que arrastra
    esa precondición. **Arreglo:** unificar el criterio.

77. **El *recording database* de `store.test.ts` depende de internos de Drizzle.** Intercepta `then` y usa
    `toSQL()`, y asume que los métodos del query builder devuelven un objeto encadenable. Es la técnica que
    hace posible testear el SQL real sin DB — y que es lo mejor de esta slice — pero **una versión mayor de
    `drizzle-orm` puede romperla de forma poco legible**. Fichada para que quien vea ese fallo sepa que es
    **infraestructura de test, no producción**.

78. **El JOIN a `brands`/`yarn_types` no filtra por `userId`: el scoping de los catálogos es una invariante
    de ESCRITURA, no un filtro de LECTURA.** La levantó el reviewer. **Hoy no es explotable, y lo verificó en
    el código, no lo supuso:** `src/features/yarns/api/assert-yarn-refs.ts` obliga, en cada `create`/`update`
    de lana, a que `brandId` sea una marca **del usuario** y `typeId` un tipo **de esa marca**. Así que
    `brandName` y `typeName` sólo pueden salir del catálogo propio.
    **Escenario de fallo concreto:** el día que alguien inserte una lana por otro camino que no pase por
    `assert-yarn-refs.ts` (una migración, un seed, un endpoint nuevo), la lectura **no tiene red propia**.
    **Arreglo: un `AND`.** `eq(brands.userId, userId)` en el `WHERE`. Cuesta una línea y hace la lectura
    independiente de la invariante de escritura. **Defensa en profundidad.**

79. **`PATCH /api/projects/:id` sigue respondiendo `{ project }` sin `yarns`.** La levantó el reviewer.
    Es **correcto respecto al PRD** (§9.1 habla sólo del `GET`), así que no es un defecto de #17.
    **Escenario de fallo concreto:** tras editar un proyecto, la UI se queda **sin las lanas** y tiene que
    re-fetchear el detalle entero para recuperarlas. Emparenta con la **74**: son la misma pregunta vista
    desde dos verbos. **Conviene decidirlas juntas y ANTES de #21.**

---

## Nuevas de la feature #18 `patterns_used_by` (2026-08-06)

> Las 80-83 las levantó el implementer y **el reviewer las suscribe las cuatro**, calificándolas de "las
> correctas, bien argumentadas, con escenario de fallo y coste de arreglo". La **84** y la **85** las levantó
> el reviewer.
>
> **⚠️ La 81 es la más valiosa del lote, y no por sí sola: por lo que #18 MIDIÓ.** Ver el recuadro de abajo.

### 📌 Lo que #18 midió, y que da contexto a la 81

Al borrar el filtro **de producción**, la suite entera quedó en **`2 failed | 600 passed | 13 skipped`**.
Los **32 tests de ruta siguieron verdes**, y los otros 568 también. **Los únicos dos rojos fueron los de
`store.test.ts`**, el archivo que asierta el **SQL realmente emitido** por Drizzle.

**Por qué:** el doble en memoria **implementa el filtro por su cuenta**
(`in-memory-store.ts:138-143`), así que sigue acotando aunque producción haya dejado de hacerlo. Es la
**deuda 6 exacta, reproducida en vivo** — y esta vez medida, no argumentada. Confirmado de forma
independiente por el reviewer. **No es un defecto de #18: es un defecto del método de testing**, y es el
argumento más fuerte que tiene el proyecto para el patrón de `store.test.ts` que introdujo #17.

80. **El filtro `?patternId=` no puede distinguir "sin uso" de "no existe" ni de "ajeno" — y la UI tampoco.**
    Los tres casos responden `200` + `[]`.
    **Es coherente A PROPÓSITO con `?yarnId=`** (verificado: el filtro de lanas tampoco consulta la tabla
    `yarns`), y esa ambigüedad **es la mitad buena de la propiedad de seguridad**: es justo lo que impide que
    el endpoint funcione como **oráculo de existencia** de patrones ajenos.
    **Escenario de fallo concreto:** el drawer de patrón de RFC-05 §2 pinta "usado en". Si el patrón se borró
    en otra pestaña, el drawer dirá *"no se usa en ningún proyecto"* en vez de *"ese patrón ya no existe"*. El
    usuario lee **un dato falso, no un error**.
    **Arreglo posible sin romper S1:** el servicio `listProjects` puede comprobar el patrón antes (projects
    **sí** puede depender de patterns — es la dirección legal del DAG) y devolver `404`.
    **Es una decisión de producto, no un bug:** decidirla cuando se implemente el drawer (**#26**).

81. **El ancla de SQL emitido sólo cubre 2 de los 7 filtros de `list`, y los 3 que faltan son los MÁS
    FRÁGILES.** *(La que más valor tiene del lote, según el reviewer, y hay que leerla junto al recuadro de
    arriba.)* `store.test.ts` fija hoy el `WHERE` de `patternId` (y de rebote `type` y el scoping). **Siguen
    sin ancla de SQL:** el `@>` de jsonb de `needle`, el `exists(...)` correlacionado de `yarnId`, y el rango
    `gte`/`lte` de fechas.
    **Escenario de fallo concreto:** son **justo los que el doble en memoria traduce peor** a JavaScript
    —`Array.includes` **no es** `@>`; un `some()` **no es** un subquery correlacionado—, o sea los que más se
    parecen a la deuda 6. Y acabamos de medir que, sin ancla de SQL, borrar un filtro de producción deja 600
    tests en verde.
    **Arreglo: ~30 líneas**, reutilizando el `recordListQuery` que esta slice **ya dejó escrito**. Es barato
    y el andamio está puesto.

82. **La deuda 73 queda ADELANTADA sólo para `list` con `patternId`, y sigue abierta para el resto.**
    El smoke de Neon ahora ejecuta el filtro nuevo **contra Postgres real** (filas de verdad, no SQL bien
    formado) e incluye el scoping cruzado. Pero **sigue `skipped` por defecto** y **el resto de `list` nunca
    se ejecuta contra el motor**.
    **Se ficha aparte para que nadie lea "el smoke ya cubre `list`" y dé la 73 por saldada.**
    **Arreglo:** ampliar el caso 3 del smoke con `needle`, `yarnId` y el rango de fechas, en una sola corrida.

83. **Nada impide que un proyecto apunte al `patternId` de OTRO usuario, porque la ESCRITURA no lo comprueba.**
    Verificado leyendo el código, no supuesto: `createProject`/`updateProject` pasan `patternId` al store
    **sin validarlo**, mientras que enlazar una lana **sí** exige `findYarn(userId, yarnId)` antes. Hoy sólo
    lo tapa que la FK obliga a que el patrón **exista** — no a que sea **del usuario**.
    **NO es un agujero del filtro de #18** —la lectura sólo devuelve proyectos propios, jamás filas ajenas, y
    el reviewer lo verificó buscando un camino de fuga y no encontrándolo—, **pero sí es un agujero del
    modelo**: un cliente puede grabar en su proyecto una referencia a un patrón que **no puede ni leer**, y
    cuando ese patrón ajeno se borre, **su proyecto cambiará solo** (`set null`).
    **Es deuda PREEXISTENTE de #5/#10, no introducida por #18** (juzgado y confirmado por el reviewer). Se
    levanta aquí porque **esta slice es la primera que hace de `projects.pattern_id` una superficie pública
    de consulta**.
    **Hermana de la 78:** allí una invariante de escritura no replicada en lectura; aquí una invariante de
    escritura **directamente ausente**. **Arreglo: un `assert-pattern-ref.ts` calcado de
    `assert-yarn-refs.ts`.**

84. **La línea del PRD §9 que enumera los filtros no está anclada por ningún test.** La levantó el reviewer.
    El ancla de contrato fija las claves del **esquema zod**, pero nada ata esa lista a la línea del PRD.
    **Escenario de fallo concreto:** alguien añade un filtro, actualiza el esquema **y el ancla**, y **olvida
    el PRD**. Nada lo detecta, y el PRD —que es la fuente de verdad funcional— empieza a mentir.
    Aplica por igual a los 7 filtros y es **preexistente**, pero el ancla nueva lo deja **a un paso**: un test
    que lea la línea del PRD y la compare con las claves del esquema cerraría el círculo. Deuda **menor**.

85. **Un parámetro de query desconocido se ignora en silencio.** La levantó el reviewer.
    `projectFiltersSchema` es un `z.object` **no estricto**, así que `?patternID=` o `?patern_id=` responden
    **200 con la lista entera** en vez de 400.
    **Escenario de fallo concreto:** quien escriba el cliente y se equivoque de mayúscula verá **todos** los
    proyectos y creerá que el filtro no acota, en vez de recibir un error que le diga dónde está el fallo.
    **Preexistente y fuera del alcance de #18.** Se ficha porque el ancla nueva vive justo al lado de ese
    hueco. **Arreglo:** `.strict()` en el esquema — pero decidir antes si romper clientes tolerantes.

---

## Nuevas de la feature #33 `ui_primitives_2` (2026-08-06)

> Las 86-93 las levantó el implementer. La **94** la levantó el reviewer **corrigiendo** al implementer.
>
> **📌 En esta slice se SALDÓ UNA DEUDA que nadie había pedido saldar: el guardrail de no-hardcode pasó de
> lista fija a barrido por recorrido de directorios.** Ver el recuadro de abajo, y la ficha **91**.

### 📌 El guardrail de no-hardcode: lista fija → barrido (medicina de las 40/43/71)

`no-hardcode.test.ts` se movió de `src/shared/ui/primitives/` a `src/shared/ui/` y pasó de **lista fija de 18
archivos** a **recorrido de directorios**. Es la medicina que las deudas **40**, **43** y **71** llevaban
pidiendo, aplicada por fin a uno de los tres guardrails.

**Verificado por el reviewer, que es lo que lo hace creíble** (reescribir un guardrail es la clase de cambio
que lo debilita sin que se note):
- Barre **54 archivos** donde antes había 18, y **los 18 viejos siguen dentro** (`MISSING FROM SWEEP: []`).
- **Las regexes de detección son byte a byte idénticas**: no se relajó el criterio para que pasara.
- **Sin allowlist ni excepciones.**
- Inyectó hardcode en **3 archivos de la lista vieja y 2 nuevos** → **5/5 rojos**. Rompió la recursión → los
  2 tests de integridad en rojo.

**Cubre estrictamente más y detecta lo mismo.** Un componente nuevo en `shared/ui/**` queda vigilado solo, sin
registrarlo en ningún sitio. **Quedan dos guardrails de lista fija: las deudas 40 y 43** (ficha **91**).

86. ~~**La animación del `Skeleton` no sale de los tokens de movimiento.**~~ **SALDADA** (lote de deudas
    86/87/90/94, 2026-08-07). `animate-pulse` era un valor por defecto de Tailwind: el CSS compilado decía
    `pulse 2s cubic-bezier(.4,0,.6,1) infinite`, y ni esa duración ni esa curva salían de ningún token de
    movimiento del sistema.
    **Cómo se saldó:** port 1:1 del shimmer del template (`template-src.html:140` para `.kc-skeleton`, `:25`
    para su regla de fotogramas) con los números **tokenizados** en `globals.css` — `--skeleton-band` (200px),
    `--skeleton-band-size`, `--skeleton-gradient`, `--dur-shimmer` (1400ms), `--ease-loop` (linear) y
    `--animate-skeleton`, más el `@keyframes kc-shimmer`. El componente sólo nombra clases. **La segunda mitad
    (el efecto correcto: degradado que se desplaza, no latido de opacidad) también queda saldada**, porque el
    leader localizó la definición exacta en el template. Gate nuevo:
    `primitives/skeleton/skeleton.tokens.test.ts`, que **compila el CSS y asierta sobre la salida**, no sobre
    el fuente (una regla de fotogramas declarada y no emitida no anima nada). **Lo que sigue abierto es sólo
    la fidelidad en pantalla → ficha 95.**

87. ~~**El `Dialog` no bloquea el scroll del fondo.**~~ **SALDADA** (lote 86/87/90/94, 2026-08-07).
    **Cómo se saldó:** `primitives/dialog/root-scroll-lock.ts` bloquea el `overflow` del elemento raíz
    mientras haya algún diálogo abierto, con **contador de referencias** de módulo. Cubre las tres trampas,
    cada una con su test: desmontar sin cerrar (el soltador **es** la limpieza del efecto), dos diálogos a la
    vez **en cualquier orden de cierre** (no sólo el inverso al de apertura) y restaurar el `overflow` que
    hubiera antes en vez de un valor fijo. Los soltadores son idempotentes (modo estricto de React monta y
    limpia dos veces). **La otra mitad de la ficha original —`inert` sobre el resto del árbol— NO se hizo y no
    se pierde: pasa a la ficha 96.**

88. **La trampa de foco no cubre el foco robado desde fuera.** El ciclo de `Tab` está atrapado, pero si un
    script externo llama a `.focus()` sobre un elemento de detrás, **el foco se va y nadie lo devuelve**.
    **Prioridad baja: hoy nada del repo hace eso.** **Arreglo:** escuchar `focusin` en el documento mientras
    esté abierto.

89. **`focusableWithin` no distingue lo visible de lo oculto por CSS.** Filtra `disabled` y el atributo
    `hidden`, pero **un control con `display:none` desde una clase seguiría contando** como parada del ciclo
    de tabulación — o sea, `Tab` se detendría en algo que no se ve.
    **No se puede medir en happy-dom**, que no aplica hojas de estilo. **Arreglo real: medirlo con un
    navegador de verdad.** Familia de la **regla 4**, hermana de las **26**, **51** y **53**.

90. ~~**El `Dialog` no ofrece foco inicial configurable.**~~ **SALDADA** (lote 86/87/90/94, 2026-08-07).
    **Cómo se saldó:** prop opcional `initialFocusRef`. **El default no cambia** (sin la prop sigue enfocando
    el panel, y hay un test que lo dice con esas palabras). **Repliegue al panel** si el elemento pedido no
    está montado, no es enfocable o está fuera del panel; la condición se **deriva** de `focusableWithin`, la
    misma lista que usa la trampa de foco, para que no haya dos criterios de "enfocable" desincronizables.
    **⚠️ CORRECCIÓN DEL LEADER (2026-08-07) — esta ficha contenía un DATO FALSO y se corrige aquí.**
    El implementer escribió: *"dato medido y relevante: happy-dom **sí** enfoca un `input` deshabilitado, así
    que confiar en el `focus()` del DOM habría dado verde sin repliegue (REGLA 7)"*. **Es falso.** Lo levantó
    el reviewer del lote y **lo verificó el leader con una sonda propia**: `focus()` sobre un control
    deshabilitado es un **no-op** y el foco **se queda donde estaba** (en el disparador). La sonda montó las
    dos tesis enfrentadas y salió `1 failed | 1 passed`: cayó la del implementer.
    **El corolario que colgaba de ese dato también cae:** no es cierto que el gate hubiera dado verde sin
    repliegue por esa vía.
    **Lo que NO cambia: el código es correcto.** Derivar el repliegue de `focusableWithin` en vez de confiar
    en el DOM **sigue siendo la decisión acertada** — porque mantiene un solo criterio de "enfocable"
    compartido con la trampa de foco, que es la razón buena. Lo que estaba mal era la justificación, no la
    elección.
    **Por qué se deja escrito en vez de borrarlo:** un dato inventado en el libro mayor es peor que no
    tenerlo — el siguiente agente lo habría citado como medición ajena. Ver el aviso de método en `current.md`.

91. **Quedan DOS guardrails de lista fija: las deudas 40 y 43.** Esta slice convirtió el tercero (no-hardcode)
    a barrido de directorios — ver el recuadro de arriba — y **la medicina de los otros dos es idéntica**.
    **Arreglo: ~15 líneas cada uno**, con el recorrido que esta slice ya dejó escrito y verificado.
    **Es la cuarta vez que se nombra este patrón** (40 → 43 → 71 → aquí); ahora, por primera vez, hay una
    implementación de referencia que copiar.

92. **Ningún gate obliga a que un primitivo nuevo traiga su test de `axe`.** Hoy es **disciplina**: los seis
    de esta slice lo traen, pero **el séptimo puede no traerlo con los 756 tests en verde**.
    **Arreglo:** un test que recorra `shared/ui/**` y exija que cada carpeta de componente tenga un archivo de
    test que mencione `axe`. **Mismo patrón de barrido** que el guardrail que esta slice acaba de escribir.

93. **El ancla de la superficie pública no cubre `layout/` ni `three/`.** `public-api.test.ts` fija al literal
    lo que exportan `primitives/` y `feedback/`; **las otras dos capas quedan sin ancla** y se les puede caer
    un export sin que nada lo note.
    **Arreglo:** dos listas más en el mismo test.

94. ~~**La justificación escrita del portal del `Dialog` señala la causa EQUIVOCADA.**~~ **SALDADA** (lote
    86/87/90/94, 2026-08-07). La levantó el reviewer de #33 **corrigiendo al implementer**. La conclusión era
    correcta —el portal al `body` es obligatorio— pero la prosa culpaba a un `transform` del archivero que no
    existe.
    **Cómo se saldó, y con una vuelta de más:** se corrigieron los **tres** sitios que repetían la causa
    equivocada (`Dialog.tsx`, `dialog.variants.ts` y el comentario del test del portal en `Dialog.test.tsx`)
    para que nombren el `main` y su `--z-base`, **y además el razonamiento se convirtió en un test**:
    `primitives/dialog/dialog.portal.tokens.test.ts`. Ata las cuatro piezas del argumento —el `main` está
    posicionado **y** lleva `z-index` (las dos condiciones de un contexto de apilamiento), el contenido vive
    dentro, los navs pintan en `--z-nav` **fuera** de él, y `--z-base` < `--z-nav` < `--z-modal`—, así que
    ninguna se puede mover en silencio. **Un comentario no impide dos veces el mismo error; un test sí.**
    **Precio: ficha 100** (el test lee `AppShell.tsx` por texto).

---

## Nuevas del lote de deudas 86/87/90/94 (2026-08-07)

> Enablers de #19 pedidos por el leader. **No es una feature**, así que `feature_list.json` no se tocó.
> Informe: `progress/reports/impl_deudas_86_87_90_94.md`.

95. **La fidelidad EN PANTALLA del shimmer sigue sin verificarse, y hay dos motivos concretos para mirarla.**
    El port es fiel al template y está anclado sobre el CSS compilado, pero eso prueba que el CSS es el
    correcto, no que se vea bien (**regla 4**, hermana de **26**, **51**, **53**, **89**).
    Dos cosas que sólo se ven con una pantalla delante: (a) el fondo **se repite** (`background-repeat` por
    defecto, igual que en el template), así que un bloque más ancho que la banda de 200px enseña **varias
    bandas de brillo a la vez**; (b) la forma redonda mide un objetivo táctil (44px), **menos de un cuarto de
    la banda**, así que el brillo la cruza casi de golpe. El template sólo tenía **una** forma y no se hizo
    esta pregunta. **Arreglo posible si molesta:** declarar que el fondo no se repita, o derivar la banda del
    tamaño del bloque.

96. **El resto del árbol sigue siendo alcanzable con el modal abierto (la mitad de la 87 que no se hizo).**
    La ficha 87 ofrecía dos remedios: bloquear el scroll **o** `inert` sobre el resto. Se hizo el primero, que
    es el que resolvía el escenario reportado. Con `inert` sobre los hermanos del portal, el fondo dejaría de
    ser alcanzable **también** por lector de pantalla y por búsqueda del navegador, no sólo por `Tab`.
    **Hermana de la 88** (foco robado desde fuera): las dos se cierran con el mismo cambio, y `inert` las
    resolvería de una vez. **Prioridad baja:** hoy la trampa de foco y `aria-modal` cubren los caminos reales.

97. **El bloqueo de scroll no compensa el ancho de la barra de scroll.** Al poner `overflow: hidden` en el
    raíz, un navegador con barra clásica (Windows/Linux de escritorio) la hace desaparecer y **el contenido de
    detrás salta horizontalmente** unos píxeles al abrir el modal. **No se puede medir en happy-dom**, que no
    hace layout. **Arreglo:** compensar con `padding-right` del ancho medido, o usar `scrollbar-gutter`.
    Familia de la **regla 4**.

98. **`root-scroll-lock` vive en la carpeta del `Dialog` y su contador es global.** Está bien mientras el
    `Dialog` sea el único que bloquea. En cuanto un `Drawer`, una hoja inferior o un visor de imagen quieran
    lo mismo, o lo importan desde `primitives/dialog/` (acoplamiento raro) o escriben el suyo **y los dos se
    pisan el `overflow`**, que es justo el bug que el contador existe para evitar. **Arreglo:** promoverlo a
    `shared/ui/lib/` con el segundo consumidor, no antes.

99. **El foco inicial se decide UNA vez, al abrir.** Si el contenido del modal llega después (un formulario
    que carga sus opciones, un `Suspense`), en el momento del efecto el elemento apuntado todavía no está
    montado, se aplica el repliegue al panel y **no se reintenta**. **Escenario concreto:** el modal de #19 si
    alguna vez espera datos antes de pintar sus campos. **Arreglo:** reevaluar cuando cambie el contenido, o
    documentar que el campo enfocado debe estar en el primer render.

100. **El gate del portal lee `AppShell.tsx` como TEXTO, y eso acopla un primitivo a la capa de layout.**
     Es el precio de convertir la prosa de la 94 en test: un primitivo del design system portable no debería
     saber que existe un `AppShell`. Y es frágil por otro lado: si el `main` pasa a sacar sus clases de un
     `cva` —que es la convención del repo— el test deja de encontrarlas y cae **sin que nada esté roto**.
     **Arreglo:** que `AppShell` exporte las clases de su `main` desde un `app-shell.variants.ts` y que el
     test lea de ahí; o mover el gate a `layout/app-shell/` y dejar en el diálogo sólo la referencia.

101. **Nada obliga a que un test que monte un `Dialog` compruebe que soltó el bloqueo.** El aserto que lo
     vigila vive en el `afterEach` de `Dialog.test.tsx`. Un test de página que monte un modal —#19 va a montar
     uno— puede dejar el raíz bloqueado y contaminar a los siguientes **con todo en verde**, y el rojo
     aparecería en un archivo que no tiene la culpa. **Misma familia que la 92** (nada obliga a traer el test
     de `axe`): es disciplina, no gate. **Arreglo:** subir el aserto al `setup` global de Vitest.

102. **El `@keyframes` está en el bundle, pero nadie ha visto moverse el shimmer.** Es la mitad honesta del
     gate del CSS compilado: se verificó que la regla se emite, que la utilidad existe y que los valores son
     los del template — **no** que el navegador la ejecute. Hermana directa de la **95** y de la familia de la
     **regla 4**. **Arreglo:** entra gratis en la primera pasada de navegador de #19, que ya va a montar
     skeletons.

## Nueva del arranque de #19 (2026-08-07)

> Detectada por el leader al ejecutar el gate de arranque. No la produjo ninguna feature.

103. **`src/shared/db/index.test.ts` es FLAKY: se pasa del timeout bajo la carga de la suite completa.**
     **Medido, no inferido**, en dos corridas consecutivas sin tocar una línea de código:
     - Corrida A (suite completa): `× exposes a configured Drizzle client when DATABASE_URL is set 5929ms`
       → `Error: Test timed out in 5000ms`. Total: `1 failed | 787 passed | 13 skipped`, y
       `Test Files 1 failed | 61 passed | 3 skipped`.
     - Aislado (`pnpm vitest run src/shared/db/index.test.ts`): `4 passed`, **3.12s**.
     - Corrida B (suite completa, sin cambios): **verde**, `788 passed | 13 skipped`, `62 passed | 3 skipped`.

     **Por qué importa más de lo que parece:** el test tarda **5929ms contra un techo de 5000ms**, es decir
     falla por ~18%. El margen es tan fino que el resultado depende de la carga de la máquina y del orden de
     paralelización de Vitest. Eso convierte el gate de arranque en **no determinista**, y un gate no
     determinista es peor que no tener gate: entrena a los agentes a **volver a correrlo hasta que salga
     verde**, que es exactamente el reflejo que haría pasar por alto un rojo de verdad. Es la enfermedad
     opuesta a la **regla 3** (un gate que no se ve caer no vale) — aquí el gate cae **sin que nada esté roto**.

     **Causa probable (INFERENCIA, no medida):** el coste es de *import*, no de aserción — el test hace
     `await import("@/shared/db")` y arrastra Drizzle + el driver de Neon en frío. La corrida completa
     declara `import 130.03s` y `setup 85.49s` repartidos entre 65 archivos, así que un import en frío
     compitiendo con otros 61 archivos explica el pico. **No lo he verificado instrumentando el import.**

     **Arreglo:** subir el `testTimeout` de ESE archivo (no el global — bajar la exigencia de toda la suite
     para tapar un caso es cambiar el termómetro) a un valor con margen real sobre el coste de import
     observado, y dejar escrito en el propio test **por qué** lleva un timeout propio. Alternativa de fondo:
     que el test no pague el import completo del cliente real.
     **Actualización (2026-08-07):** no volvió a aparecer en ninguna de las corridas completas de #19
     (implementer ×2, reviewer ×3). Sigue viva: un flaky que no se reproduce **no está arreglado**, sólo
     callado.

## Nuevas de la feature #19 `dashboard_ui` (2026-08-07)

> Informes: `progress/reports/impl_dashboard_ui.md` y `progress/reports/review_dashboard_ui.md`.
> Las ocho primeras las propuso el implementer y el reviewer las validó una a una; las cuatro últimas
> salieron del review.

### 📌 La que NO está aquí, porque nació saldada

El review de la ronda 1 iba a fichar *"sólo UN par de breakpoints está atado por test; los otros tres
no"*. **#19 la saldó antes de que existiera**, al resolver el bloqueante B1 por la vía buena:
`src/shared/ui/breakpoint-tokens.test.ts` cubre **los cuatro pares**, y el reviewer lo verificó con
**cuatro mutaciones independientes** (cada par cae por separado) más una quinta rompiendo el
descubrimiento. Vale la pena leer el porqué en el informe de cierre `19.informe-dashboard_ui.md`: el
bloqueante **no era un bug de código**, era una frase que afirmaba que ese test ya existía.

104. **No hay primitivo de ENLACE en el design system, y ya van dos consumidores.** `LoginForm.tsx:29`
     define sus clases de enlace a mano, y `ActiveProjectsPanel.tsx` ha tenido que definir las suyas,
     casi idénticas salvo el color del primer plano (uno vive sobre superficie clara y el otro sobre el
     fondo oscuro). **Es el segundo consumidor: toca promoverlo a `shared/ui`.** ⚠️ Al hacerlo, aplicá la
     **regla de superficies**: el enlace debe **heredar** el primer plano, como la variante fantasma del
     botón (deuda 17), o se repite el defecto de la invisibilidad sobre superficie no declarada.
     **Precio:** tocar el barrel hace caer `public-api.test.ts` (usa `toEqual`), y eso es una decisión de
     contrato del design system, no de una página — por eso #19 no lo hizo.

105. **No hay primitivo de `select`, y ya hay uno en producción.** El control de orden del Dashboard usa
     un `select` nativo con `inputClasses` (que se exportó justo para esto, así que no es un abuso). Pero
     el estado de error, el foco y la flecha del nativo **no están cubiertos por ningún test del design
     system**. Hermana de la 104: mismo precio, misma decisión de contrato.

106. **El error del modal de alta es un párrafo con `role="alert"` local, no `AuthFormError`.** Ese
     componente vive en `features/auth/ui/` y este libro ya lo señalaba como *"el `Alert` que el SDD §6
     lista como pendiente; candidato a promover con un segundo consumidor"*. **Ya hay segundo consumidor.**
     Tercera hermana de la 104/105, y la más madura de las tres.

107. **"Ver todos" apunta a `/proyectos`, que hoy es un 404.** Igual que las seis pestañas del archivero
     desde #13. **No es un defecto de #19**: se cierra con #20. Queda fichado para que nadie lo lea como
     regresión al abrir la app.

108. **El año inicial se toma del reloj del CLIENTE en el inicializador de `useState`.** En el render de
     servidor eso corre con el reloj del **servidor**. Si los dos estuvieran en años distintos (medianoche
     del 31 de diciembre a caballo de dos husos), React avisaría de una discrepancia de hidratación en el
     valor del campo. **NO MEDIDO** —lo declara así el implementer, y está bien declarado— porque es una
     ventana de minutos al año y evitarla costaba enseñar la pantalla sin año en el primer render.

109. **`ProjectCardData` no obliga a nadie a mantenerse en el subconjunto.** Está definido como un `Pick`
     del proyecto serializado, así que **un proyecto entero encaja igual**: nada impide que un día la card
     empiece a leer campos que no le tocan. Hoy sólo lo protege la disciplina. Importa más de lo normal
     porque **#20 va a reusar esta card** (enmienda E2.1) y es el momento en que la tentación aparece.

110. **La utilidad de ocultación sólo-para-lectores de la etiqueta de tiempo no está vigilada por ningún
     gate de tokens.** Es una utilidad del core de Tailwind, no un token, y el guardrail no la mira.
     Coherente con el precedente del ancho máximo de contenedor que usa `AuthPanel`, pero conviene saber
     que la frontera *"escala de Tailwind sí / valor suelto no"* es hoy **disciplina, no test**.

111. **Ningún gate obliga a que una ruta de `(app)` traiga su test de composición dentro del caparazón.**
     El gate de "un solo ovillo" existe para `/` **porque el implementer lo escribió**; `/proyectos` (#20)
     puede nacer sin él. **Hermana de la 92** (nada obliga a traer el test de `axe`) y de la **101**: las
     tres son la misma enfermedad —invariantes que dependen de que el siguiente agente se acuerde—.
     **Conviene taparlas juntas.**

112. **El `JWT_SECRET` de `.env` LOCAL se trunca solo, y ya costó tiempo a dos agentes.** Está entre
     comillas y contiene un `$` seguido de caracteres; `@next/env` **expande variables**, así que de los
     24 caracteres escritos el servidor usa **18**. **Medido** por el reviewer resolviéndolo con el mismo
     `loadEnvConfig` que usa Next (`len 18`). No es código del repo —es entorno local— pero **cualquiera
     que monte una sonda contra el servidor real vuelve a tropezar**, y de hecho tropezaron los dos.
     **Arreglo:** escapar el `$` o cambiar el secreto local, y **una línea de aviso en `.env.example`**.

113. **Un JWT válido con un `sub` que no es UUID devuelve 500 en `/`.** Verificado contra servidor real:
     `invalid input syntax for type uuid` sale de Neon y **se propaga hasta el render**. **No es
     explotable desde fuera** (el token tiene que estar firmado con el secreto del servidor), pero es una
     ruta a 500 sin `try` intermedio en la capa de auth. **Es de #31/#32, no de #19.** Un `sub` mal
     formado debería tratarse como **sesión inválida**, no como consulta.

114. **La región viva del Dashboard es un `role="status"` anónimo.** Funciona y tiene test, pero el helper
     `settle()` de tres archivos de test depende de que ese `status` sea **único** en la pantalla. En
     cuanto otra pieza monte un `status`, esos tests se vuelven **ambiguos** — y la ambigüedad de un
     selector no falla limpio: falla raro.

115. **`progress/history.md` iba DOS sesiones por detrás.** Lo levantó el reviewer como C5 en las dos
     rondas. Su última cabecera era `2026-08-05 — Feature #15`, faltando **#33 `ui_primitives_2`** (cerrada
     el 2026-08-06). **Es contabilidad del leader, no del implementer.** ~~Saldada al cerrar #19~~: se
     añadieron las dos entradas. **Queda como ficha viva de MÉTODO:** el cierre de sesión de `AGENTS.md`
     §5 tiene cuatro pasos y el de `history.md` es el que se salta, porque **nada lo verifica** —
     `init.sh` valida `feature_list.json`, no el historial.

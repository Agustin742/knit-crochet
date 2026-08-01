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
4. **`tsconfig.tsbuildinfo` trackeado en git** (pre-existente): añadir a `.gitignore`.
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
13. **⚠️ DEFECTO REAL (no teórico): `leading-tight` se pierde en `buttonVariants`.** `twMerge` la descarta
    porque el `text-base` de la variante de tamaño ya trae su propio `line-height` — **el interlineado del
    botón no es el que dice el código**. Es **preexistente**, no lo introdujo el refactor canónico; lo
    destapó el reviewer al auditar `twMerge`. Revisar al tocar `button.variants.ts` (o antes, si algún
    botón se ve con el alto raro).
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
17. **⚠️ DEFECTO REAL: la variante fantasma de `Button` es ilegible sobre superficies oscuras.** Pinta con
    el color de primer plano claro, así que sobre el espresso del shell no se lee. El `ArchiveNav` lo
    parchea pasándole el color inverso desde fuera para el botón "Salir" — parche correcto y de alcance
    mínimo, pero **el defecto sigue vivo para el próximo consumidor**. Se arregla en el primitivo, no en
    cada llamador. Detectado en la review del archivero fichero.
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

21. **⚠️ DEFECTO REAL: `AppShell` promete algo que no hace, y cuesta una petición HTTP por carga.**
    `src/features/auth/ui/AppShellClient.tsx` pide `/api/auth/me` en cada carga de cualquier página de
    `(app)`, guarda el resultado en estado (**re-renderiza el shell entero**) y `ArchiveNav` lo **descarta**;
    `handleLogout` es **código inalcanzable**. Y el JSDoc de `AppShell.tsx:19` afirma "Usuario mostrado en el
    archivero", que es **falso**. En `ArchiveNav` la prop sí está honestamente documentada y con test que fija
    que se ignora — el andamiaje ahí es defendible; el problema es el resto de la cadena. Arreglo propuesto:
    corregir el JSDoc (**una línea**, es lo que quita la mentira) + dejar de pedir el usuario que nadie
    consume, **sin tocar el endpoint** (se usa en #31) + un test de que montar el shell no dispara ningún
    fetch. **Ya lo había levantado la 3ª review, pero ese informe se truncó y nunca llegó al implementer.**
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

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

### ⚖️ Escala de severidad — CORREGIDA el 2026-08-24, a petición del usuario

**El problema que arregla esta regla.** Durante cuatro sesiones este libro pintó del **mismo rojo** dos
cosas que no se parecen en nada: *"un usuario no puede crear un proyecto"* y *"si alguien edita un token
y le quita la unidad, el gate no se entera"*. El color medía **riesgo para el código**, no **impacto
para quien usa la app** — y el leader trató el segundo como urgente sesión tras sesión. Resultado: el
arnés se convirtió en el producto y el MVP no avanzó.

**La escala ahora tiene DOS ejes y el que manda es el primero:**

| eje | pregunta |
|---|---|
| **Visibilidad** (manda) | ¿**puede un usuario ver esto**, hoy, usando la app? |
| Riesgo | ¿qué se rompe si nadie lo arregla? |

- 🔴 **Un usuario lo ve y le impide hacer algo.** Interrumpe lo que sea.
- 🟠 **Un usuario lo ve pero puede seguir.** Entra en el lote de la página que lo toca.
- 🟢 / ⚪ **Ningún usuario lo ve: sólo lo ve un agente editando el código.** Casi todo el trabajo de
  gates vive aquí. **NO interrumpe una feature.** Se ficha y espera.

> **Regla dura que sale de esto:** *una deuda sólo interrumpe una feature si **un usuario puede verla**.*
> Un gate que no detecta una edición futura **no es urgente**, por muy real que sea el agujero. Se
> anota, se deja escrito el escenario, y se sigue construyendo páginas.
>
> **Aviso al leader:** la tentación es siempre la misma —"está medido y es corto, lo meto en el lote"—.
> Así se escaló el alcance el 2026-08-24, dos veces en una sesión. Cada decisión era defendible por
> separado; sumadas, el usuario terminó el día sin ver una página nueva.

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

## 🔴 Nuevas del rediseño de login/register del usuario (2026-08-07, commit `bdb11b0`)

> **El árbol quedó en ROJO al cerrar la sesión.** No es un fallo de #19: es una **decisión de producto
> que cambió** y cuyo gate no se actualizó. Detalle en la ficha 116.

116. ~~**🔴 GATE EN ROJO: `register` ahora monta el ovillo, y el test dice que no debe.**~~
     → **SALDADA el 2026-08-07, en la misma sesión.** El gate se **reescribió a conciencia**, no se borró
     (deuda 29): pasa a fijar la realidad nueva —el alta **sí** monta el ovillo, decorativo— y lleva
     escrito **qué decía antes, qué cambió y por qué se reescribe**, más un aviso a quien venga después de
     que **la ficha de #31 describe el criterio viejo y no hay que "arreglarlo" al revés**.
     **Condición doble ejecutada** (tres mutaciones sobre `register/page.tsx`, las tres con un único rojo
     —el nuevo— y restauración verificada por suma de control + `git diff` vacío).
     **Verificado por el leader por su cuenta:** `bash ./init.sh` → `EXIT_CODE=0`,
     `1200 passed | 13 skipped` en 69 archivos.
     El criterio revertido quedó **anotado, no borrado**, en `feature_list.json` #31.
     El test nuevo **declara sus dos límites** en vez de sobrevender: el `aria-hidden` que comprueba es el
     del envoltorio (ahí `AsciiYarn` está doblado; el real lo cubren sus propios tests), y el `data-slot`
     por el que se agarra ya no describe lo que hay debajo (**deuda 117**, que sigue viva).
     Informe: `progress/reports/impl_fix_register_ovillo.md`.

     *Ficha original, conservada:*
     **`register` ahora monta el ovillo, y el test decía que no debe.**
     **Medido**: `bash ./init.sh` → `EXIT_CODE=1`, `1 failed | 1199 passed | 13 skipped` (1213).
     El único rojo es `src/app/(auth)/auth-pages.test.tsx:188` → `× no monta el ovillo ASCII`.

     **Qué pasó:** el criterio de aceptación de **#31** decía *"ovillo ASCII de fondo **SOLO en login**
     (no en register)"*, y el test lo fijó en dos asertos: `queryByTestId("ascii-yarn")` ausente y
     `[data-slot="bg-3d"]` a `null`. El rediseño del usuario pone el ovillo **también en el alta**.

     **El test hizo su trabajo:** avisó de que se estaba cambiando algo que alguien fijó a propósito.
     **Arreglo: REESCRIBIRLO, no borrarlo** (deuda 29) — que ahora **sí** monta el ovillo, y por qué la
     decisión de #31 se revierte. Conviene además **anotar la reversión en el criterio de #31**, o dentro
     de tres meses alguien lee la ficha vieja y lo "arregla" al revés.

117. ~~**El atributo `data-slot="bg-3d"` ya no describe lo que hay debajo, en las dos páginas de auth.**~~
     → **SALDADA el 2026-08-10** (lote 117/118/119, review **APROBADO, 0 bloqueantes**). Contrato:
     **enmienda E12(d) del RFC-01**. Renombrado a **`data-slot="auth-hero"`** en las dos páginas;
     **el `bg-3d` del `AppShell` NO se tocó** y sus 3 asertos siguen verdes sin modificar.
     **Medido antes de tocar nada** (`explore_deuda117_data_slot.md`): son **dos manijas homónimas en
     árboles que nunca coexisten** —las rutas `(auth)` no montan `AppShell`—, `data-slot` no aparece
     **ni una vez** en `docs/` ni en `template/`, y el ancla de superficie pública sólo cubre nombres
     de export. Coste real: 2 líneas de producción + 2 asertos, tal como se predijo.
     **El nombre elegido restaura un eje conceptual**, no es cosmética: *`bg-3d` = capa fija decorativa*
     frente a *`auth-hero` = pieza en el flujo e interactiva*. Ese eje **todavía no está en las
     convenciones** → deuda **126**.
     **Dos cosas que la ficha pedía y se decidieron al revés, a propósito:**
     (1) **el `aria-hidden` del envoltorio SE QUEDA** pese a ser redundante (`AsciiYarn` ya es
     `aria-hidden` incondicional): en `auth-pages.test.tsx` el componente está **doblado por un `<span>`
     pelado**, así que ese atributo es **la única manija que el test tiene** para comprobar que la pieza
     es decorativa; quitarlo pondría 2 gates en rojo **por artefacto del doble, no por accesibilidad**.
     El motivo quedó escrito junto al atributo para que nadie lo "limpie".
     (2) el `className=""` (cadena vacía que no hacía nada) **sí se eliminó**.
     **De regalo, tres comentarios que mentían**, reescritos citando E12: `register/page.tsx` decía
     *"Sin ovillo de fondo"* **tres líneas antes de montarlo**, `login/page.tsx` decía *"sin capturar el
     puntero"* cuando hoy pasa `interactive={true}` (→ deuda **121**), y el layout de `(auth)` presumía
     de un posicionamiento que ya no sostenía nada.

     *Ficha original, conservada:*
     **El atributo `data-slot="bg-3d"` ya no describe lo que hay debajo, en las dos páginas de auth.**
     Ese nombre significa *"la capa de fondo 3D"*, y en el rediseño el ovillo pasó a ser **una celda de
     una rejilla de dos columnas, en el flujo**, junto al formulario. En `login` el contenedor perdió
     además su posicionamiento y su token de capa, y quedó con `className=""` — **una cadena vacía que no
     hace nada**. El envoltorio con `aria-hidden` también es redundante: `AsciiYarn` **ya es siempre
     `aria-hidden`** por construcción (`AsciiYarn.tsx:59`), no es opcional.
     **Por qué importa:** el gate de login (`auth-pages.test.tsx:85-87`) **busca por ese `data-slot`**,
     así que el nombre no es decorativo — es la manija por la que los tests agarran la pieza. Un nombre
     que miente sobrevive porque nadie lo mira.
     **Arreglo:** renombrar el slot a lo que ahora es, y ajustar el gate con él.

118. ~~**La rejilla de dos columnas de las páginas de auth no tiene variante responsive.**~~
     → **SALDADA el 2026-08-10** (lote 117/118/119, review **APROBADO, 0 bloqueantes**). Contrato:
     **enmienda E12 (a) (b) (c) (e) del RFC-01** — hizo falta **enmienda y no sólo arreglo** porque se
     midió que **la rejilla de dos columnas de auth no estaba especificada en NINGÚN sitio**: ni RFC-01
     ni SDD-01 la mencionaban. Era una decisión de producto tomada a mano en `bdb11b0`, legítima pero
     **sin fuente de verdad**, así que no había documento contra el que validar el responsive correcto.
     **Ahora lo hay.**

     **La ficha acertaba y se quedaba CORTA, y el motivo real es peor:** `AsciiYarn` **no devuelve
     `null`** por debajo de `--bp-tablet`; devuelve **siempre** su host `h-full w-full` con la escena
     vacía dentro. Así que la segunda pista existe y **reclama su mitad del ancho**, y como
     `minmax(0, 1fr)` la deja bajar por debajo de su contenido mínimo, **no hay scroll horizontal que
     avise: simplemente se aplasta**. Y como todo el hueco es `aria-hidden`, **`axe` tampoco lo veía**.

     **CONFIRMADA EN NAVEGADOR REAL por el leader (REGLA 4)** — la ficha estaba en esa familia y el
     informe del explorador **no la sustituía**. `next dev` + emulación de dispositivo en Chrome:
     conmuta **exactamente** en `--bp-tablet` (767px → una pista, `padding-inline: 0`, hueco
     `display: none`; 768px → `280px 280px`, `80px`, hueco visible), y a 1280px sale `536px 536px` con
     `80px / 80px` y sin `gap`, **idéntico a lo que producía `px-20`**.
     **Y se reprodujo el estado ANTERIOR inyectando la geometría vieja por DOM en la página viva**
     (sin tocar el árbol): columnas de **91.2px** y campos de **48px** a 390px. **La aritmética del
     explorador (91 / 47) acertó dentro de 1px.**

     **Se resolvió además el `px-20`, que iba en el mismo paquete** (E12 c): era **el único valor de
     espaciado crudo de todo `src/`** (1 de 55) y **ningún guardrail podía verlo** —`PX_LITERAL` busca
     `<dígitos>px` y ahí el `px` va delante y significa *padding-inline*—, y aportaba **160 de los
     ~208px** que se perdían en móvil. Sustituido por el token nuevo **`--auth-inset-inline: 80px`**
     con su motivo escrito, aplicado **sólo desde `tablet:`**: el diseño del usuario **no cambia ni un
     píxel donde él lo mira**, cotejado propiedad por propiedad sobre el CSS compilado y confirmado en
     navegador.

     **Nace el gate que no existía** (E12 e): `src/app/yarn-host-responsive.test.ts`, 20 casos, +20
     tests. Compila `globals.css` con postcss y asierta sobre el **CSS compilado** (REGLA 7), **descubre**
     los anfitriones de ovillo en vez de enumerarlos (medicina de las deudas 40/43/71/91) y lleva
     **dos** anclas anti-descubrimiento-roto — el reviewer las atacó y salieron **cuatro** asertos en
     rojo, más red de la anunciada. **El descubrimiento no encontró ningún consumidor no conforme**:
     `DashboardHero` ya lo cumplía, sólo que **nada lo vigilaba**.
     **Su agujero conocido está fichado como deuda 123** (la exención "fuera de flujo" es esquivable).

     **El número que justifica todo el encargo, verificado al dígito por el reviewer:** al matar
     `--breakpoint-tablet`, los **seis** asertos que leen nombres de clase siguen **verdes** y sólo caen
     los **ocho** del CSS compilado (`8 failed | 12 passed`). **Un gate que sólo mirara clases no habría
     servido de nada** — una clase puede existir en el JSX y no compilar a ninguna media query.

     *Ficha original, conservada:*
     **La rejilla de dos columnas de las páginas de auth no tiene variante responsive, y el ovillo no se
     monta en móvil.** Las dos páginas usan una rejilla fija de dos columnas con relleno lateral grande.
     Por debajo de `--bp-tablet`, `useViewportSupports3d` **no monta la escena** (medido en
     `explore_19_hero_fondo.md` §2), así que en móvil quedaría **media pantalla vacía** y el formulario
     comprimido a la mitad del ancho. **NO MEDIDO en navegador** — es lectura de código, y es
     exactamente el mismo riesgo que #19 documentó para el hero del Dashboard. **Familia de la regla 4:
     sólo se confirma con una pantalla delante.**

119. ~~**`next-env.d.ts` entró en el commit `bdb11b0`.**~~
     → **SALDADA el 2026-08-10 por el leader** (es configuración fuera de las capas de código: su carril).
     **Se ignora, y no por preferencia nuestra.** La doc de Next **16.2.10 empaquetada en el propio
     `node_modules`** (`next/dist/.../02-typescript.md:91`) dice literalmente *"Add it to `.gitignore`. If
     your project already tracks the file, remove it from Git"*, y su tabla de estructura lo clasifica
     junto a `.env` como *"should not be tracked"*. Context7 confirma lo mismo con la plantilla real de
     `create-next-app`: **las dos fuentes coinciden, no hubo que elegir.**
     **Medido antes de decidir, no argumentado** (`progress/reports/explore_deuda119_next_env.md`): en un
     `git worktree` desechable con su propio `pnpm install` se probaron **las 4 combinaciones**
     (`.next` sí/no × archivo sí/no) y `tsc --noEmit` da **errores idénticos en todas**. Lo único que se
     pierde es poder importar `*.png` como módulo, y **el repo no tiene ni una importación estática de
     imágenes**. `next build` sin el archivo → exit 0, y lo regenera solo.
     **Ejecutado:** `.gitignore` + `git rm --cached next-env.d.ts` (el archivo **sigue en disco**;
     verificado). **`tsconfig.json` NO se tocó y debe seguir listándolo en `include`** — ignorarlo en git
     no es sacarlo de TypeScript. El motivo entero quedó escrito **dentro de `.gitignore`**, que es donde
     lo va a leer quien se pregunte por qué.
     **La ficha se confirmó con reloj:** 4 commits tocaron el archivo y **3 eran flips puros de una línea**
     (75% ruido); `next dev` revierte el import en ~7s medidos.
     **Precedente idéntico ya resuelto en este repo:** `tsconfig.tsbuildinfo` se destrackeó igual en
     `4973309`.

120. ~~**🔴 `postcss` es DEPENDENCIA FANTASMA: un clon limpio falla `pnpm typecheck` hoy.**~~
     **✅ SALDADA el 2026-08-12.** `postcss` declarada en `devDependencies` con specifier **exacto
     `8.4.31`** (no `^8.4.31`). Diff total: **4 líneas** (`package.json` +1, `pnpm-lock.yaml` +3).
     **Cero archivos de `src/**`.** Informes: `progress/reports/impl_deuda120_postcss.md` y
     `review_deuda120_postcss.md` (**APROBADO, 0 bloqueantes**).
     **Por qué exacto y no caret:** `pnpm-workspace.yaml` ya fija `postcss` a `8.4.31` con un `override`
     global, que **manda sobre cualquier specifier**. Un `^8.4.31` sería una **declaración falsa**: diría
     *"cualquier 8.x me vale"* cuando la regla de al lado obliga a una sola. Precedente de pin exacto en
     el repo: `three` y `@types/three`.
     **El lockfile NO movió nada:** las 3 líneas están todas dentro de `importers['.'].devDependencies`
     —puro registro de intención—; **cero entradas nuevas** en `packages:` o `snapshots:` (ya estaba ahí
     por `@tailwindcss/postcss`, `next` y `vite`), **cero descargas**.
     **🔴 DOS CORRECCIONES a lo que esta ficha decía, escritas y no borradas:**
     1. Decía *"falla `pnpm typecheck`"*. **Se quedaba corta.** En entorno limpio **caen además los tres
        archivos de test enteros** y `bash ./init.sh` sale **exit 1**: `3 failed | 67 passed | 3 skipped`
        y **`1185 passed`** en vez de 1220. Con el arreglo, ese mismo entorno da **exit 0** y
        **`1220 passed | 13 skipped`**. La aritmética cierra sola: **1220 − 1185 = 35**, y los tres
        archivos aislados dan exactamente **35 passed**.
     2. Decía que aquí funcionaba *"porque el almacén de pnpm la tiene por transitividad"*. **FALSO.**
        El linker es **`isolated`** y clasifica `postcss` como **`private`**, o sea la deja en
        `node_modules/.pnpm/node_modules/`, que **TypeScript y Vite no miran** desde `src/`. La causa real
        es otra y está en la **deuda 130**.
     **Verificación:** el reviewer **no leyó el informe y ya**: reconstruyó el experimento entero por su
     cuenta con dos copias limpias propias, y **todos los números cargantes reprodujeron exactos**.
     ~~Dos~~ **TRES**
     tests la importan y **no está declarada en `package.json`**; funciona en esta máquina sólo porque el
     almacén de pnpm la tiene por transitividad.
     **🔴 Corrección de libro mayor (2026-08-12, leader, medido por barrido de `src/`):** la ficha decía
     **dos** y son **tres**: `src/app/globals-css.test.ts:5`,
     `src/shared/ui/primitives/skeleton/skeleton.tokens.test.ts:5` y
     **`src/app/yarn-host-responsive.test.ts:6`**. El tercero es **el gate que nació en el propio lote
     117/118**, así que la ficha quedó desactualizada por el trabajo de su misma sesión. Sólo declara
     `package.json` a `@tailwindcss/postcss` (`:19`); **`postcss` a secas no aparece**. No cambia el
     diagnóstico ni el arreglo — **agranda la superficie** y es la misma raíz ya registrada aquí tres
     veces: *nadie volvió a la fuente a comprobarlo*.
     **Medido** en el worktree limpio del saldo de la 119
     (`progress/reports/explore_deuda119_next_env.md`), donde salió como hallazgo colateral —
     **es más grave que la deuda que se fue a investigar**.
     **Por qué importa más de lo que parece:** no rompe a nadie que ya tenga el repo, así que **no se
     va a descubrir por uso**; se descubre el día que alguien clona (o el día que un CI limpio corre por
     primera vez). Y la ruta de descubrimiento es la peor: falla el **typecheck**, no un test, así que
     parece un problema de TypeScript y no una dependencia que falta.
     **Arreglo:** una línea (`pnpm add -D postcss`). **Deliberadamente NO se plegó al lote de las deudas
     117/118**: tocar `package.json` es un cambio con su propia superficie de riesgo y el usuario acotó
     el encargo a 117/118/119. **Decisión pendiente del usuario**, no del siguiente agente que pase.

121. **El ovillo de auth pasó a `interactive={true}` en el rediseño `bdb11b0`, y nada lo vigila.** Antes
     las dos páginas usaban el valor por defecto. `interactive` decide si el host captura el puntero
     (`AsciiYarn.tsx:186`: `pointer-events-auto` frente a `pointer-events-none`).
     **Hoy no hay regresión**: el ovillo vive en otra columna de la rejilla, así que no se superpone al
     formulario — verificado por lectura, no por pantalla. **Pero el invariante no está escrito en
     ningún sitio**, así que el día que alguien superponga las dos celdas (o vuelva a un layout de
     fondo) el ovillo se comerá los clics del formulario **con todo verde**. Es la familia exacta de la
     deuda 52: un gate que sólo mira las clases propias de una pieza no ve lo que le hacen desde fuera.
     **E12 decidió a propósito NO resolverla**: se deja como está y se ficha.

122. **Los breakpoints de fábrica de Tailwind siguen vivos en el compilado, y nada impide saltarse el
     sistema de tokens.** **Medido** sobre el CSS compilado
     (`progress/reports/explore_deuda118_responsive_auth.md` §1.3): además de los tres del proyecto
     (`640px`, `768px`, `1180px`), el compilado contiene los cinco de fábrica
     (`40rem`, `48rem`, `64rem`, `80rem`, `96rem`). `@theme` **añade** nombres, no sustituye los de
     fábrica.
     **Hoy nadie los usa en `src/`** (barrido completo, cero apariciones), así que no hay nada abierto.
     **El riesgo es de deriva:** alguien escribe la variante de fábrica por costumbre, se salta
     `--bp-*`/`--breakpoint-*` y **queda fuera de `breakpoint-tokens.test.ts`**, que sólo ata los pares
     declarados por el proyecto. El gate responsive que nace con E12(e) es el sitio natural donde
     prohibirlo, si se decide prohibirlo.

## Del review del lote 117/118/119 (2026-08-10) — el gate nuevo, auditado

> El lote salió **APROBADO con 0 bloqueantes**, pero el reviewer no se conformó con leer el gate: lo
> **atacó**. Estas cuatro fichas son el resultado. Informe:
> `progress/reports/review_deudas_117_118_119.md` §7.

123. **🟠 La exención "fuera de flujo" del gate responsive es MÁS ANCHA QUE SU MOTIVO, y es esquivable.**
     `src/app/yarn-host-responsive.test.ts:83` y `:319`. Un anfitrión de ovillo con `fixed` o `absolute`
     queda exento de **los dos** asertos de fondo. **El fallo lógico:** la exención se justifica con
     *"un anfitrión fuera de flujo no reserva espacio"*, y eso es cierto **para el anfitrión** — pero
     el segundo aserto **no juzga al anfitrión, juzga al contenedor** (dos columnas en la base). Un
     contenedor de dos columnas **sigue partiendo el ancho en dos pistas** aunque su segundo hijo esté
     fuera de flujo, **que es el daño exacto de la deuda 118**. El gate lo exime igual.
     **MEDIDO por el reviewer con una página sonda propia** (`absolute` + dos columnas, sin ninguna
     variante responsive): con la sonda puesta caen **sólo las dos anclas** (`2 failed | 18 passed`) y
     **no se genera ni un caso** para ese anfitrión; y haciendo **lo que el propio JSDoc del gate le
     pide al desarrollador** (`:401`, *"añádelo a la lista"*), el archivo queda en
     **`20 passed (20)`, EXIT=0** — verde, con una página que parte el ancho en dos y un hueco que no
     se apaga nunca.
     **Por qué NO es bloqueante:** hoy el único exento es `AppShell.tsx:52`, que es el caso correcto, y
     el ancla lo fija. Y el ancla **obliga a que un humano pase por ahí** — ésa es la diferencia real
     con una allowlist. **Por qué importa igual:** el mensaje que ese humano lee le pide comprobar **a
     mano** justo lo que el gate se acaba de saltar. Misma familia que el agujero conocido de E11(c) /
     deuda **52**.
     **Arreglo barato:** aplicar el aserto del contenedor **también** a los anfitriones exentos, o
     exigir que la exención venga acompañada de un estirado a los cuatro lados.
     **Prioridad alta la próxima vez que se toque el gate.**

124. **El inventario del ancla del gate responsive es un punto de fuga por diseño.** Es el **precio
     conocido** de un ancla de pertenencia y **no hay alternativa mejor** (sin ancla, un descubrimiento
     roto sale verde, que es peor). La ficha existe para que nadie lo descubra por sorpresa: quien
     actualiza el inventario recibe la instrucción de verificar **a mano** el invariante del caso que
     añade — y eso es exactamente por donde se cuela la **123**.
     **Sugerencia barata:** que el mensaje de fallo del ancla **nombre explícitamente** qué hay que
     comprobar cuando el anfitrión nuevo está fuera de flujo.

125. **El lector de JSX del gate responsive depende del formateo de Prettier.** `parseTags`
     (`yarn-host-responsive.test.ts:128`) asume **una etiqueta de apertura por línea**. Lo ficha el
     propio implementer (§9.4) y el reviewer lo confirma. Es cierto hoy y **las anclas lo cazan si deja
     de serlo** (falla cerrado, no abierto), pero conviene saber el precio: el día que caiga, el arreglo
     es **reescribir el lector**, no tocar una línea.

126. **`data-slot` sigue sin fila en `docs/harness/conventions.md`.** **Verificado:**
     `grep -n "data-slot" docs/harness/conventions.md` devuelve **cero**. Este lote acaba de renombrar
     uno (`bg-3d` → `auth-hero`) y, sobre todo, de establecer un **eje conceptual** — *`bg-3d` = capa
     fija decorativa* frente a *`auth-hero` = pieza en el flujo e interactiva* — que **hoy sólo vive en
     comentarios de código**. Un eje que no está en las convenciones se pierde en la siguiente página
     que alguien escriba. **Carril de documentación**, arreglo de minutos.

115. **`progress/history.md` iba DOS sesiones por detrás.** Lo levantó el reviewer como C5 en las dos
     rondas. Su última cabecera era `2026-08-05 — Feature #15`, faltando **#33 `ui_primitives_2`** (cerrada
     el 2026-08-06). **Es contabilidad del leader, no del implementer.** ~~Saldada al cerrar #19~~: se
     añadieron las dos entradas. **Queda como ficha viva de MÉTODO:** el cierre de sesión de `AGENTS.md`
     §5 tiene cuatro pasos y el de `history.md` es el que se salta, porque **nada lo verifica** —
     `init.sh` valida `feature_list.json`, no el historial.

## Del planeamiento de #20 `projects_list_ui` (2026-08-12) — nacidas de la enmienda E1 del RFC-03

> Las tres son **precios aceptados a propósito** al cerrar las ocho decisiones de #20 con el usuario, no
> descuidos. Se fichan para que el precio quede escrito y no se descubra por sorpresa en #21/#22.
> Contrato: `docs/design/rfc/RFC-03-proyectos.md` §7-bis.

127. **El filtro de RANGO DE FECHAS existe en el backend y ninguna pantalla lo usa.** `?from=&to=`
     está implementado (`src/features/projects/api/store.ts:103-108`, `gte`/`lte` sobre **`startDate`**)
     y probado, pero **E1(b) lo dejó fuera del toolbar de #20** para no ensanchar la slice.
     **Por qué importa más que una función que falta:** nace de una **contradicción interna de RFC-03**
     que sigue viva — **§1 lo declara filtro *principal*** y el PRD §6.2 lo lista, pero **§2 no lo pone en
     el toolbar** y el `acceptance` de #20 tampoco. Quien lea §1 va a creer que #20 lo incumple.
     Mitigado a medias: §1 lleva ahora un aviso que apunta a E1(b). **Añadirlo es aditivo y barato**
     (el backend está hecho); lo caro sería resolver la contradicción a medias otra vez.
     ⚠️ **Trampa medida al pasar:** `z.coerce.date("2026-05-01")` produce medianoche **UTC** y `startDate`
     es `timestamp` **sin zona**. **NO MEDIDO** si un filtro de "hoy" se corre un día. Cuando se
     implemente, medilo antes de anclarlo en un test.

128. **El selector de "lana usada" sólo puede etiquetar por COLOR, y dos lanas pueden quedar
     indistinguibles.** `GET /api/yarns` devuelve la **fila cruda**: `brandId`/`typeId` son **UUIDs, no
     nombres** (`src/features/yarns/api/store.ts:244-249`). El único sitio del repo que aplana los
     nombres es `listLinkedYarns` (`store.ts:177-199`), y **sólo sirve al detalle de un proyecto**, no a
     un selector global. **E1(d)** compró el coste cero (una llamada, cero backend nuevo).
     **Escenario de fallo concreto:** el usuario tiene dos lanas con el mismo `colorName` de marcas
     distintas; en el desplegable de "más filtros" ve **dos entradas idénticas** y no puede saber cuál
     elige. **Arreglos posibles:** pedir marcas y tipos aparte (triplica el fetch de un desplegable
     secundario), o un endpoint que aplane los nombres para el inventario — que es reabrir backend.
     **Toca a #24/#25 también**, que van a necesitar la misma etiqueta.

129. **🟠 El cliente HTTP de navegador se duplica por TERCERA vez, y `readErrorMessage` va copiado
     literal.** No hay cliente compartido: `src/shared/lib/http.ts` importa `next/server` y es
     **exclusivamente de Route Handlers**. Los dos clones vivos son
     `src/features/auth/ui/auth-client.ts:15-30` y `src/features/dashboard/ui/dashboard-client.ts:40-55`
     — **la misma función, byte a byte**. El propio `dashboard-client.ts:8-16` deja escrito que copia al
     primero porque no hay dónde compartirlo. **E1(h)** decidió duplicar por tercera vez y ficharlo, para
     no meter en #20 un refactor de `shared/lib` que toca **dos features ya `done` y revisadas**.
     **Por qué se ficha en vez de dejarlo pasar:** quedan **#21, #22, #24, #25, #27, #28** por delante, y
     todas necesitan cliente. **Sin decisión, se llega a cinco o seis copias**, y entonces el refactor ya
     no cuesta un rato. **El momento natural de extraerlo es antes de #22**, cuando el patrón esté
     confirmado por tres usos reales y todavía queden pocos consumidores.
     Corolario ya medido, para quien lo extraiga: el molde **funde 200 y 201** (`dashboard-client.ts:68`
     sólo mira `response.ok`), y el quick-start de #20 necesita distinguirlos (E1(e)). O sea que el
     tercer clon **ya nace divergiendo** del molde.

## Del saldo de la deuda 120 (2026-08-12) — la causa de fondo, verificada por el reviewer

130. **🔴 El `node_modules` de esta máquina es un ÁRBOL PLANO ESTILO npm FOSILIZADO encima del árbol de
     pnpm, y por eso NINGUNA dependencia fantasma se puede detectar aquí.** Es **la causa real** de que
     la deuda 120 fuera invisible, y **sigue viva después de saldarla**.
     **Medido por el implementer y REPRODUCIDO de forma independiente por el reviewer:**

     | | entradas de primer nivel | NO son symlink |
     |---|---|---|
     | Árbol principal (esta máquina) | **378** | **348** |
     | Copia limpia, `pnpm install` fresco | **30** | **0** |

     **pnpm nunca crea directorios reales de primer nivel**: sus dependencias raíz son siempre enlaces.
     Antes del arreglo de la 120, `node_modules/postcss` era un **directorio real** (`isSymbolicLink()`
     → `false`, fecha `jul. 20 21:24`). El propio `pnpm-workspace.yaml` deja constancia de esa era al
     hablar de *"la misma versión que **npm** había instalado"*.
     **Prueba adicional que aportó el reviewer:** existe un **`node_modules/.package-lock.json`** en el
     árbol principal —**artefacto de npm**— y **está ausente** en un install limpio de pnpm.
     **Consecuencia operativa, y es lo que importa:** con 348 directorios de cobertura, **cualquier
     paquete transitivo resuelve desde `src/` en esta máquina**. No es que a `postcss` se le escapara la
     declaración: **este `node_modules` no puede detectar dependencias fantasma por construcción**. La 120
     fue la primera que asomó; cualquier import nuevo sin declarar volverá a pasar desapercibido aquí y a
     descubrirse recién en un clon limpio o en un CI.
     ⚠️ **ADVERTENCIA DE MÉTODO, del reviewer, y hay que leerla antes de citar el número:** **348 depende
     del método de conteo.** Su primer conteo ingenuo (dotfiles incluidos, `@babel` contado como una
     entrada) dio **330/309 sobre el mismo árbol**. No es contradicción — **es que el número no significa
     nada sin la receta al lado**. Si volvés a medir, escribí el método.
     **Arreglo:** `rm -rf node_modules && pnpm install`. **Su verificación ya está hecha de antemano:** el
     `init.sh` en copia limpia da **exit 0, 1220 passed**, o sea que se sabe que el árbol sano pasa.
     **NO se hizo** en el lote de la 120: quedaba fuera de alcance (toca `node_modules`, no
     `package.json`). **Decisión pendiente del usuario.**

131. **El barrido de dependencias fantasma existió una vez y se tiró.** Al saldar la 120 se escribió un
     barrido (`sweep.mjs`, en el scratchpad) que recorre directorios de `src/` **sin lista a mano**
     —medicina de las deudas 40/43/71/91—, extrae el nombre de paquete de **seis** formas de import
     (`import … from`, `import()`, `require()`, `import "efecto"`, `vi.mock`, `vi.importActual`) y lo
     contrasta contra `package.json`. **Punto clave: no consulta `node_modules`**, así que su resultado
     **no queda contaminado por la deuda 130**. Barrió **296 archivos** → **cero fantasmas** además de
     `postcss`.
     **El reviewer lo atacó en vez de creerle** y confirmó que **el "cero" no es un verde vacío**:
     con controles positivos, quitar `postcss` del conjunto declarado hace aflorar exactamente los 3
     archivos, y quitar `zod` hace aflorar los suyos. Sondeó además los puntos ciegos —`require.resolve`,
     `vi.doMock`, `vi.importMock`, `createRequire`: **cero apariciones**; los dos
     `/// <reference types>` viven en `next-env.d.ts` → `next`; el plugin de `tsconfig.json` → `next`;
     el de `postcss.config.mjs` → `@tailwindcss/postcss`. **Todos declarados.**
     **La deuda es que ese barrido vivía en el scratchpad y se borró con él.** Mientras la **130** siga
     viva, es **el único instrumento capaz de ver una dependencia fantasma en esta máquina** — y hoy hay
     que reescribirlo desde cero para volver a usarlo. Convertirlo en un test del repo cuesta poco y lo
     haría correr en cada `init.sh`.
     **Límite conocido, declarado por el propio implementer:** valida *declarado sí/no*, **no** valida la
     ubicación (`dependencies` frente a `devDependencies`).

## Del review de #20 `projects_list_ui` (2026-08-12) — aprobada sin bloqueantes, y esto es lo que quedó

> El review salió **APROBADO, 0 bloqueantes**, pero el reviewer **atacó los gates con seis inyecciones de
> fallo** en vez de leerlos. Estas fichas son el residuo. Informe:
> `progress/reports/review_projects_list_ui.md` §4-bis y §6.

132. **🟠 La invariante "la tarjeta del Dashboard no monta controles" se sostiene en UN SOLO PUNTO del
     repo, y la mitad "consumidor" no tiene gate.** **MEDIDO por el reviewer, y corrige una premisa que
     el leader había escrito en el encargo.** El encargo daba por hecho que si el quick-start se colara
     "de serie", *"`DashboardView.test.tsx` y su `axe` verían controles nuevos"*. **Es falso.** Con la
     inyección B1 —**todas** las tarjetas del Dashboard con botón— `DashboardView.test.tsx` pasa
     **`31 passed (31)`**, `axe` incluido. Y **no existe** ningún `ActiveProjectsPanel.test.tsx`.
     **Lo único que sostiene la invariante es `ProjectCard.test.tsx:125-130`** —que existe, es correcto y
     sí cae—. **No es un defecto de #20: es que #20 es lo único que la sostiene.**
     **Por qué importa:** el gate vive en el lado *productor* (la tarjeta). El lado *consumidor* (quién la
     monta y con qué props) **no tiene ninguno**, así que el día que alguien pase `onQuickStart` desde el
     Dashboard "porque queda bien", **la suite entera sigue verde**. Familia de las deudas 52 y 121: un
     gate que sólo mira la pieza no ve lo que le hacen desde fuera.

133. **Código muerto y engañoso en `ProjectsView.test.tsx:149`.** El `void init;` dentro de `serve()`
     **no se refiere al parámetro del doble de `fetch`** —que es lo que sugiere el comentario de la
     línea 152— sino a un `const init = undefined` de módulo declarado **tres líneas más abajo**.
     **Funciona por accidente**: se evalúa en tiempo de llamada, no de definición. Lo correcto sería no
     declarar el parámetro que no se usa.
     **No rompe nada y NO se arregló a propósito:** el código estaba ya aprobado y verificado por suma de
     control por el reviewer, y modificarlo después de la aprobación invalidaría esa verificación por un
     defecto puramente cosmético. **Arreglo de una línea la próxima vez que se toque ese archivo.**

134. **El informe del implementer de #20 transcribió mal un número dentro de un bloque presentado como
     SALIDA LITERAL.** §3.3, rotura B2: pegaba `Tests 3 failed | 12 passed (13)`, **imposible de raíz**
     (3 + 12 = 15, no 13). La salida real es `3 failed | 10 passed (13)`. Los otros tres bloques (A1, A2,
     B1) coincidían **exactos**. **Corregido en el informe** al cerrar.
     **Se ficha aunque esté corregido, porque es reincidencia:** es el mismo defecto que en #31 (un
     informe declaró 9 rojos donde salían 12), y ataca justo la **REGLA 3**, cuyo valor entero depende de
     que los números pegados sean los que salieron. **Un número inventado dentro de un bloque de salida
     es indistinguible de uno real para quien lo lea después.** La aritmética interna es la única defensa
     barata: **si los sumandos no dan el total, el bloque no es una salida.**

135. **Deuda 6 suma su CUARTA instancia, ahora en el cliente de navegador.** Las aserciones de filtros de
     #20 son sobre la **URL literal** —que es el patrón correcto y el que evita el fallo silencioso del
     `z.object` sin `.strict()`—, pero **nada ata esas cadenas al esquema real del endpoint**. Si el
     backend renombrara un parámetro, **estos gates seguirían verdes** y la pantalla dejaría de filtrar.
     Es la clase ya fichada (deudas **6**, **73**, **81**, **82**), no un defecto nuevo de #20, y su
     medicina es la conocida: un ancla que derive los nombres de `projectFiltersSchema` en vez de
     reescribirlos a mano.

---

> **Deudas 136-141 — nacidas de la VERIFICACIÓN EN NAVEGADOR REAL de `/proyectos` (2026-08-13),
> pedida por el usuario tras ver la página.** Informe:
> `progress/reports/verificacion_navegador_proyectos.md`. Medidas por el leader con `getBoundingClientRect`
> sobre el `next dev` real, viewport 1521×753 CSS, con datos reales (un proyecto, cero lanas).
> **#20 estaba cerrada, verde y APROBADA a la primera cuando aparecieron.**

136. **🔴 El toolbar de `/proyectos` parte su superficie en dos y el buscador se lee como un diálogo
     flotante.** `ProjectsToolbar.tsx:84` abre `flex flex-wrap items-end gap-(--space-4)` con tres hijos
     de alturas incompatibles: `ToggleGroup` estado `24,164 206x44`, `ToggleGroup` tipo `246,164 224x44`
     y el **`Card` del buscador `487,86 509x123`**. Con `items-end` los botones se pegan al borde
     inferior y la tarjeta se queda arriba → **~78px de hueco muerto** sobre los botones, y una
     superficie `bg-surface-raised` + `shadow-hard-lg` **centrada sobre el ovillo ASCII**, que el ojo lee
     como un modal abierto.
     **⚠️ El `Card` NO es decorativo y no se puede quitar a lo bruto:** `ProjectsToolbar.tsx:61-64`
     documenta que es la medicina de la **deuda 31** — `Field` pinta su etiqueta con el primer plano
     oscuro, ilegible sobre el espresso, y la variante elevada es la única superficie donde el anillo de
     foco llega al contraste mínimo. **La deuda real es tener medio toolbar sobre el fondo y medio sobre
     una tarjeta**, no la tarjeta en sí.

137. **🔴 El quick-start funciona y es INDISTINGUIBLE de un botón roto: su único feedback es
     `sr-only`.** Medido pulsando el ▶: a `+150ms` el botón queda `disabled` con glifo `✳`; a `+2s`
     vuelve a `▶` y el aviso aparece en la región viva (`"asdasd ya tenía el cronómetro en marcha."`).
     Pero **las dos regiones vivas miden `23,188 1x1`**, con `class="sr-only"`, `position:absolute` y
     `clip-path: inset(50%)`. Quien mira la pantalla ve un parpadeo de 200ms y **nada más**: la card
     sigue diciendo `0%` y `0 min`, el botón vuelve a su estado inicial, no hay aviso visible.
     **Por qué pasó el review:** los tests asertan justo sobre esa región viva (nombre accesible, deuda
     114) y `axe` mide el árbol accesible. **El eje que falla es el visible, y ahí no hay ningún gate**
     (ver deuda 141).

138. **🟠 El estado vacío MIENTE cuando el vacío lo produjo un filtro.** `ProjectsView.tsx:241` decide
     con `listIsEmpty` —la lista que devuelve el servidor— y pinta `EMPTY_TITLE`/`EMPTY_DESCRIPTION`
     (`:39-41`): *"Tu cesto está vacío — Empezá un proyecto…"*. **Medido:** ese mensaje sale con
     **"Inactivos"** activo y con **"Aguja = 3 mm"**, teniendo el usuario un proyecto. Le dice "no tenés
     proyectos" a alguien que sí tiene, y lo empuja a crear otro en vez de a quitar el filtro.
     **Sólo el buscador de cliente lo hace bien** (`:259`, "Ningún proyecto coincide con la búsqueda").
     Es exactamente la asimetría de **E1(a)**: lo que se filtra en cliente distingue, lo que se filtra en
     servidor no. Falta además la salida obvia: **un control de "quitar filtros"**.

139. **🟠 Copy de interfaz que le explica el andamiaje del proyecto al usuario final.** Dos casos:
     `EMPTY_DESCRIPTION` (`ProjectsView.tsx:40-41`) — *"…los dos botones de acá abajo te llevan al
     inicio, **que es donde hoy se crea en dos pasos**"* — y `SEARCH_HINT`
     (`ProjectsToolbar.tsx:19-20`) — *"Filtra por nombre sobre los proyectos ya cargados, **sin volver a
     pedirlos**"*. El primero explica que el formulario de #22 todavía no existe; el segundo explica una
     decisión de arquitectura (E1(a), filtrado de cliente). **El "hoy" del primero delata que es una
     excusa de andamiaje escrita en la cara del usuario.** Un usuario no sabe ni le importa cuántos
     pasos tiene la creación ni si la lista se vuelve a pedir.

140. **🟠 El hueco de la foto vacía es el bloque más grande de la página y no comunica nada.**
     Card `480x405`; el `aspect-video` de la foto mide **`437x246`** = **61% de la altura de la card**, y
     con `image === null` es un rectángulo liso con **una letra de `11x28` px** centrada. Para comparar:
     el nombre del proyecto ocupa `56x26`. La pantalla dedica su mayor superficie a un vacío.

141. **🔴 DEUDA DE MÉTODO, la que explica a las otras cinco: NINGÚN gate de este repo mide el eje
     visible.** `/proyectos` se cerró con `init.sh` verde (`1281 passed`), `axe` sobre la vista, gate de
     composición, región viva con nombre y un review **aprobado a la primera con 0 bloqueantes** — y al
     abrirla en un navegador **está visiblemente rota**. Los gates existentes miden **tokens, roles,
     nombres accesibles y CSS compilado**; ninguno mide **dónde cae un elemento en la pantalla ni si un
     mensaje se ve**.
     **Es la SEGUNDA vez que pasa lo mismo:** la deuda **118** (la rejilla de auth aplastada en móvil) se
     descubrió igual, y su ficha ya decía *"cero gates se rompen al arreglarla porque cero gates miden lo
     que denuncia"*. Entonces se ató el CSS compilado (`yarn-host-responsive.test.ts`); **la geometría
     resultante sigue sin atarse por nadie**.
     **El caso más puro es la 137:** el `sr-only` hizo que la accesibilidad **tapara** el agujero visual
     en vez de delatarlo — el test verde y la pantalla muda son el mismo hecho.
     **Medicina candidata (no decidida):** la **REGLA 4** existe pero es humana y se aplica a ojo; hoy
     depende de que alguien mire. Lo que falta es o bien hacerla obligatoria en el cierre de toda feature
     de UI, o bien un gate que asierte geometría (alturas compatibles en una fila, feedback no
     `sr-only` para toda acción con efecto).

142. **🔴 UN GATE DEL ARNÉS TERMINÓ DICTANDO LA INTERFAZ, y la pantalla perdió la distinción entre dos
     controles que se comportan distinto.** **Lo levantó el usuario mirando la pantalla**, no un test.
     `ProjectsToolbar.tsx:51-54` deja escrito el motivo de **E1(i)**: el segmentado activo/inactivo son
     *"dos `Toggle`"* porque *"crear un primitivo de segmentado tocaría `public-api.test.ts`, anclado al
     literal"*. Resultado medido en navegador: **cuatro botones idénticos de 44px en fila**
     (`206x44` y `224x44`), donde **los dos primeros son EXCLUYENTES** (estado: o activos o inactivos) y
     **los dos siguientes ACUMULABLES** (tipo: podés marcar los dos), **sin una sola señal visual que lo
     distinga**. Quien mira no tiene forma de saber cuál es cuál hasta que lo prueba.
     **La justificación además era evitable, y está medido:** `public-api.test.ts` ancla listas literales
     de `primitives` y `feedback`; **un componente que viva en `features/projects/ui/` no lo toca**. El
     coste que decidió la interfaz ni siquiera se habría pagado.
     **Por qué es la deuda más importante de este lote:** no es un defecto de una pantalla, es un
     **defecto de proceso**. El inventario de `shared/ui/` se convirtió en la especificación por
     descarte, y el criterio "qué es barato para el arnés" desplazó al criterio "qué entiende quien usa
     la app". Regla escrita a raíz de esto en `docs/harness/conventions.md` §"El template es un SUELO,
     no un techo", y replicada en los tres agentes (`leader`, `implementer`, `reviewer`).

143. **🔴 LA FUENTE DE VERDAD VISUAL NO EXISTE, y por eso el template ocupó su lugar.** Medido por
     explorador sobre `docs/`:
     - **RFC-03 §1/§2 fija piezas y su orden** (toolbar: segmentado → tipo → más filtros → buscar;
       card: foto/nombre/progreso/tiempo + quick-start) y **ni una línea** sobre jerarquía de página,
       contenedor, proporción de la card, número de columnas o placeholder de foto.
     - **Las nueve decisiones de la enmienda E1 son TODAS de contrato y mecánica. Ninguna es visual.**
     - **El SDD §9 remite "al mockup de referencia" y al brief de identidad, y cita un `visual.md`:
       ninguno de los tres existe en el repo.** El SDD nombra `--surface-raised` y `--shadow-hard` pero
       **no da regla de cuándo elevar**.
     **Consecuencia directa:** cuando el contrato no dice nada del aspecto, el implementer resuelve por
     descarte con lo que hay en el inventario — y sale una pantalla sin jerarquía donde todo pesa igual.
     **Es la causa raíz de la 136, la 140 y la 142.** Mientras esto siga así, cada pantalla de UI nueva
     va a reproducirlo.

144. **🟠 En TODA la app no existe feedback visible de una acción que sale bien.** Medido por barrido:
     **no hay ningún `Toast` construido** (el token `--z-toast` está declarado **sin implementación** y
     `--success` **sin un solo uso**), y no existe ninguna primitiva de aviso (Alert/Notice/Banner/
     Callout) en `shared/ui`. **Lo único visible son los errores**: `AuthFormError`, el `role="alert"` de
     `NewProjectDialog` y `ErrorState` (que es un panel de página completa, no un aviso).
     **Esto reencuadra la deuda 137:** el `sr-only` del quick-start **no fue un descuido del
     implementer, era el único patrón que existía**. La app sabe decir "esto falló" y no sabe decir
     "esto salió bien".

> **Deudas 145-148 — nacidas del review del lote E2 (2026-08-15). Ninguna bloqueó la aprobación.**

145. ~~**🔴 `src/shared/lib/auth/password.test.ts` es frágil por tiempo, y eso enseña a desconfiar del
     rojo.** Confirmado por el reviewer midiendo, no leyendo: **1217 ms aislado**, sin `testTimeout`
     propio en `vitest.config.ts` (o sea el tope por defecto), y **bajo la carga de la pasada completa lo
     rebasa** — el implementer del lote E2 lo vio salir en rojo en su baseline, y en las dos pasadas del
     leader no apareció. Es hasheo de contraseña: el coste de CPU es **deliberado**, así que el arreglo
     es **darle un `testTimeout` propio a ese archivo**, no abaratar el hasheo.
     **Por qué importa más de lo que parece:** el verde o rojo de `init.sh` pasa a depender de lo cargada
     que esté la máquina, y **ésa es la peor propiedad que puede tener una puerta de calidad** — entrena
     a todo el mundo a encogerse de hombros ante un rojo. Familia de la **deuda 103**.~~ → **SALDADA**
     el 2026-08-18. Arreglo **por alcance, con números medidos, sin tocar el hasheo**: `BCRYPT_COST`
     sigue en 12 y `bcryptjs` sigue siendo `bcryptjs`; no se saltó ni borró ningún test.
     - `vitest.config.ts`: `testTimeout: 10_000` global. Justificado con medición propia, no a ojo:
       fuera de los archivos de abajo, el test más lento de la suite bajo carga es el axe de
       `ProjectsView` con **3219 ms** — sólo 1.5x de margen sobre el defecto de 5000 ms.
     - `vi.setConfig({ testTimeout })` **por archivo** (no sale del archivo): 20 s en
       `src/shared/lib/auth/password.test.ts` (peor medido 4543 ms) y en
       `src/features/auth/api/auth-service.test.ts` (4315 ms); 30 s en
       `src/app/api/auth/auth-routes.test.ts` (7501 ms).
     - `it(nombre, { timeout: 20_000 }, fn)` **sólo en el primer `it`** de `src/shared/db/index.test.ts`
       (peor medido 5837 ms): es el único que paga el arranque en frío de drizzle+neon; los otros tres
       corren en milisegundos y se quedan con el tope global a propósito.
     Cada tope lleva encima el comentario con por qué ese número y qué lo hace lento.
     **Ampliación del alcance respecto de la ficha original:** `src/app/api/auth/auth-routes.test.ts`
     **no estaba entre los rojos** y sin embargo es el archivo más lento de la suite (7501 ms y 7161 ms
     los dos tests de login, ambos por encima del tope por defecto): pasaba **por suerte de reparto**.
     Misma raíz (bcrypt real a través de los Route Handlers). Arreglar sólo los 3 rojos habría dejado
     la puerta dependiendo de la carga, que es justo lo que esta ficha quiere eliminar.
     **REGLA 3 (probado, no afirmado):** con `verifyPassword` devolviendo siempre `true` los tres
     archivos bcrypt-bound salen en **rojo por aserción** (`expected true to be false`, `expected 200 to
     be 401`, `promise resolved … instead of rejecting`), y con `createDbClient` devolviendo `{}` cae el
     `it` cuyo tope se subió (`expected undefined to be function`). Los topes no tapan nada.
     Verificación: `bash ./init.sh` **x2 → EXIT 0** (240.96 s en frío y 107.34 s en caliente), más una
     pasada extra **con los 4 núcleos saturados a propósito** → también verde.
     Salidas reales en `progress/reports/impl_deuda145_timeouts.md`.

     > **REAPERTURA PARCIAL — el leader, 2026-08-20.** El arreglo **subió el techo y no quitó la
     > propiedad**. Medido: al cerrar la enmienda E13 corrí `init.sh` **solapado con la pasada del
     > reviewer**, y `src/features/auth/api/auth-service.test.ts` —uno de los archivos a los que este
     > mismo arreglo le dio tope propio— **cayó en rojo**:
     >
     > ```
     > × registers a user hashing the password and issuing a session token  20479ms
     >   Error: Test timed out in 20000ms
     > ```
     >
     > Rebasó su `vi.setConfig({ testTimeout: 20_000 })` por **479 ms**. La pasada entera tardó
     > **833 s** contra los ~90 s habituales, o sea la máquina iba unas **nueve veces** más lenta.
     > **Por qué no lo cazó la verificación original:** probó con *"los 4 núcleos saturados a
     > propósito"* y salió verde — pero saturar los núcleos con trabajo cualquiera **no es lo mismo que
     > correr dos suites de Vitest a la vez**, que compiten además por memoria, disco y workers.
     > **Lo que queda vivo, y es lo que la ficha original decía:** un **tope absoluto** no puede
     > defender un **coste deliberado** (bcrypt) contra una **carga variable**. Mientras el criterio sea
     > "cuántos milisegundos tardó", el verde de `init.sh` sigue dependiendo de la máquina.
     > **Cómo se saldaría de verdad:** que el coste de hasheo sea **inyectable en test** (un coste bajo
     > en la suite, el real en producción, con un test propio que compruebe que producción usa el alto),
     > o serializar los archivos de coste deliberado. **No se decide aquí.**
     > **Regla de convivencia mientras tanto, que es culpa mía y me la apunto:** *no se corren dos
     > pasadas de la suite a la vez* — el rojo que produce no es información, es ruido.

146. ~~**🟠 El gate de CSS compilado existe SÓLO para el segmentado.** `ProjectsView.tsx`,
     `ProjectCard.tsx` y `ProjectsToolbar.tsx` no tienen quien verifique que sus utilidades emiten una
     regla real. Hoy están bien —el reviewer lo midió reconstruyendo el "ALL PRESENT" del implementer con
     un control positivo— pero **mañana no hay quien avise**. Una clase inventada se queda inerte en el
     atributo y **todos los gates salen verdes**. Es REGLA 7 aplicada al CSS.~~ → **SALDADA** el
     2026-08-18, **en tres rondas**, con **un archivo de test versionado** y no con un script descartable:
     `src/features/projects/ui/projects-ui.classes.test.ts` (**9 tests**).
     **Las rondas 1 y 2 NO la saldaron, y conviene que quede escrito:** el gate entregado **devolvía verde
     con una clase inerte en el DOM por CUATRO caminos distintos** —comparación por subcadena, llamada a
     función externa, atributo esparcido y reasignación con `+=`—, y **las cuatro las destapó el reviewer
     probando el gate, no leyéndolo**. Un gate con verde falso es peor que no tener gate, y la lección de
     método es esa: **a un verificador se le mide, no se le lee**.
     - **Cómo se resolvió el obstáculo real.** El gate del segmentado deriva sus clases de
       `segmented-control.variants.ts`; estos tres las escriben sueltas **dentro del JSX**, así que esa
       técnica no se traslada. **No** se extrajeron a un archivo de variantes por componente —eso mueve el
       literal de sitio pero deja el agujero: la siguiente clase suelta vuelve a quedar fuera y el gate
       pasa a depender de la disciplina—. Se **derivan del fuente**: se parsea el TSX con el **compilador
       de TypeScript** (AST, no regex), se recogen los `className` y se resuelve lo que cada uno vale
       (cadenas, plantillas, constantes locales, arrays con `join`, ternarios, funciones que devuelven
       clases), y cada nombre se busca en el **CSS compilado**. Cubre lo de hoy y lo que se escriba
       mañana, sin lista que mantener — mismo criterio que `canonical-tailwind-classes.test.ts`.
     - **Cobertura medida por el propio gate:** `ProjectsView.tsx` 14 atributos / 47 clases,
       `ProjectCard.tsx` 12 / 38, `ProjectsToolbar.tsx` 11 / 23.
     - **El barrido se vigila a sí mismo**, que es lo que impide un verde vacío: cuenta los `className`
       del AST contra los escritos en el texto crudo, exige que ninguna forma de expresión quede sin
       seguir, y **fija la lista exacta de fuentes externas** (`className` de la prop y `inputClasses` del
       design system). Una fuente de clases nueva que el gate no sepa seguir lo pone en **rojo**.
     - **La comparación contra el CSS exige FRONTERA DE NOMBRE (arreglo de ronda 2).** La ronda 1 buscaba
       el selector como **subcadena**, y una utilidad recortada es prefijo de la buena: aparecía dentro
       del selector de la otra y pasaba en verde estando inerte. **Y la técnica del precedente tampoco
       basta** —la ficha decía "misma técnica que el gate del segmentado" y **era falso**: se comparte la
       compilación, no la comparación; el anclado a la llave de apertura de
       `segmented-control.tokens.test.ts:126-131` deja que `[^{,]*` se trague las letras que faltan, así
       que **también daría verde falso**. Ahora se exige que el nombre **termine ahí**: detrás no puede ir
       letra, dígito, guion bajo, guion **ni barra invertida** (Tailwind escapa así variantes y tokens).
     - **Una llamada a función de OTRO archivo ya no se traga las clases (arreglo de ronda 2).** Devolvía
       los **argumentos** como si fueran el resultado: con un argumento resoluble el atributo salía "no
       vacío", nadie denunciaba nada y **lo que la función devuelve de verdad no se comprobaba jamás**.
       Ahora el nombre llamado entra en la lista de fuentes externas, que se compara **exacta**.
     - **Colisión de nombres y REASIGNACIÓN (rondas 2 y 3).** `locals` indexa por nombre a cualquier
       profundidad, así que dos declaraciones homónimas se pisaban; y `resolve` devolvía **sólo el
       inicializador**, así que `let x = "…"; x += " …";` —TypeScript corriente, con las clases escritas
       dentro del archivo— perdía la mitad. No se resuelve el ámbito ni se interpreta el programa: se
       **denuncian** los dos casos si el nombre llega a usarse para resolver un `className`.
     - **Camino que el barrido no atraviesa (arreglo de ronda 3).** Un `className` que llega por un
       **atributo esparcido** o como **propiedad de un literal de objeto** no era visto por el AST **ni**
       por el contraste contra el texto crudo, que buscaba el nombre seguido de igual: **las dos redes
       tenían el mismo agujero**, y una segunda red que falla donde falla la primera no es una segunda
       red. Ahora el spread y la propiedad se registran, y la cuenta cruda admite el igual **y** los dos
       puntos.
     - **Qué promete este gate, dicho sin absolutos (arreglo de ronda 3).** El JSDoc afirmaba que se
       recogen **todos** los `className`: falso, y es la misma clase de brecha comentario/código que la
       deuda 148 **en el archivo que existe para denunciarla**. Ahora enumera lo que resuelve y sus
       **cuatro cajones de denuncia** (`unhandled`, `external`, `ambiguous`, `bypassed`). La promesa no es
       entenderlo todo: es **no callarse**.
     - **Restricción respetada — a la segunda.** El JSDoc declaraba "ni un nombre de clase literal" y
       **era falso**: dos palabras de la propia prosa (los nombres en inglés de la utilidad de flujo y la
       de rejilla) eran candidatos, y una **metía su regla en el CSS de producción**. Reescritas en
       castellano. Comprobado por compilación con y sin el archivo: **37616 bytes de CSS en los dos
       casos**, o sea que el test aporta **cero** CSS.
     - **Controles positivos, con salida real (los tres en el informe):** clase inventada
       (`bg-surface-inventada` en `ProjectCard.tsx`) → rojo, y **los gates viejos verdes con la clase
       puesta** (`23 archivos / 772 tests`), que es el defecto que la ficha describía; **clase recortada**
       (`items-en` en `ProjectsToolbar.tsx`) → rojo con la comparación nueva y **verde con la vieja**;
       **helper importado** con argumento resoluble → rojo nombrando la función, y **verde** anulando el
       arreglo; **atributo esparcido** con una utilidad recortada nueva → rojo nombrando los dos caminos,
       **verde** con la lógica de ronda 2; **reasignación con `+=`** → rojo nombrando la variable,
       **verde** sin la comprobación. Todo restaurado, `git status --porcelain` **sin residuo**.
     - **Coste:** ~1.3 s el archivo aislado (~180 ms de test; el resto es arranque del worker), o sea lo
       mismo que el gate del segmentado (959 ms / 170 ms). El tope de 120 s heredado es un guardarraíl, no
       un coste medido. **La duración de la suite completa NO prueba nada** (74.18 / 76.94 / 116 / 121.72 s
       con el mismo código, según quién y cuándo): el número válido es el del archivo aislado.
     Salidas reales en `progress/reports/impl_deudas_146_147_148.md` (§RONDA 2) y review en
     `progress/reports/review_deudas_146_147_148.md`.

147. ~~**🟠 `DashboardView.tsx:49` conserva el andamiaje que E2(f) borró de `/proyectos`.** Dice al usuario
     final *"los botones de arriba lo crean en dos pasos"*: le explica la mecánica interna del proyecto a
     quien sólo quiere tejer. Es **el hermano vivo de la deuda 139**, y quedó fuera del alcance de E2
     porque la enmienda sólo cubría la lista.~~ → **SALDADA** el 2026-08-18 **con el criterio de E2(f), no
     con uno nuevo**: imperativo corto + qué se va a ver, sin rutas, sin pasos y sin nombrar controles.
     `EMPTY_STATE_DESCRIPTION` pasa a *"Empezá el primero y acá van a estar tus horas, tus proyectos y lo
     que llevás tejido de cada uno."*, con el porqué escrito encima de la constante.
     **No promete metros de lana** a propósito: son un agregado *lifetime* que no se mueve con el año
     (E1.5), así que en el vacío **del año** sería otra promesa que la pantalla no sostiene.
     **El ancla que faltaba:** ni `EMPTY_STATE_DESCRIPTION` ni `emptyStateTitle` aparecían en **ningún**
     test — la copia visible no tenía quien la sostuviera. `DashboardView.test.tsx` gana **1 test** que
     comprueba las dos direcciones (que la copia buena está y que las dos frases de andamiaje no vuelven),
     igual que E2(f) hizo en `ProjectsView.test.tsx`. **REGLA 3:** restaurando la copia vieja el test sale
     en rojo (*"expected `<p …>Estrená el año con un proyecto: los botones de arriba lo crean en dos
     pasos.</p>` to be null"*).

148. ~~**🟠 El comentario del `SegmentedControl` promete un absoluto que el TIPO no sostiene.** El JSDoc de
     `STATUS_FILTERS` (reescrito en la ronda 2) afirma que "ninguna elegida" y "dos elegidas" **no se
     pueden ni representar**. El reviewer **lo probó en vez de leerlo**: con un `value` fuera del juego de
     opciones salen **cero** pulsadas, y con dos `options` de igual `value` salen **dos** — y
     `pnpm typecheck` **acepta las dos cosas**, porque `value: string` no está atado a `options`.
     El consumidor real está a salvo y ningún gate cubre el hueco. **No se bloqueó** porque el comentario
     describe de más una decisión correcta en vez de empujar a la equivocada. Arreglo: hacer el primitivo
     **genérico sobre sus opciones**, para que el tipo sostenga lo que el comentario promete.~~ →
     **SALDADA** el 2026-08-18 **haciendo que el tipo sostenga la promesa**, no bajando el comentario:
     bajarlo era legítimo pero dejaba en pie un estado imposible que el consumidor descubre en pantalla.
     Ahora el comentario y el tipo dicen lo mismo, **y dicen qué cierra cada cosa**:
     - **"Ninguna elegida" lo cierra el TIPO.** `SegmentedControlOption<TValue extends string = string>` y
       `SegmentedControlProps<TValue>`, con **`value: NoInfer<TValue>`** — la pieza clave: sin `NoInfer`,
       `TValue` se infiere también desde `value` y un valor ajeno se cuela **ampliando la unión**, o sea
       que el genérico solo no arreglaba nada. El parámetro por defecto es `string`, así que
       `readonly SegmentedControlOption[]` sigue compilando sin anotar (compatibilidad comprobada).
     - **"Dos elegidas" NO lo puede cerrar el tipo** —nada impide dos `options` con el mismo `value`—, así
       que lo cierra el **render**: la elegida pasa a ser una **posición** (`findIndex`), se marca la
       primera y ninguna más, y lo sostiene un test.
     - **Lo que no cierra ninguno de los dos** queda escrito y medido, en orden de probabilidad:
       **(1) anotar `options` con el parámetro por defecto** (`readonly SegmentedControlOption[]`)
       **colapsa `TValue` a `string`** y vuelve a aceptar cualquier `value` —no es "llamar sin tipos", es
       una anotación idiomática, y era **la del propio archivo de test del primitivo**: lo cazó el
       reviewer con `tsc` (EXIT 0) y fue bloqueante de ronda 2, porque una brecha comentario/tipo es
       literalmente el enunciado de esta ficha—; **(2)** llamar sin tipos (JS puro) o forzar con un `as`.
       En los dos casos salen cero pulsadas y no se defiende en runtime a propósito. **Arreglo de ronda 2,
       sin tocar comportamiento:** la enumeración incluye el caso, las dos frases absolutas quedan
       condicionadas a que `TValue` se infiera, la constante `OPTIONS` del test lleva encima el aviso de
       que **no está protegida**, y el test del `ref` pasa a usar la forma inferida (era el único sitio
       donde se pasaba un `value` sin protección de tipo sin que se notara al leerlo).
     **REGLA 3, los dos rojos con salida real:** quitando `NoInfer`, `tsc` →
     *"SegmentedControl.test.tsx(97,9): error TS2578: Unused '@ts-expect-error' directive."*; volviendo
     `aria-pressed` al valor, *"expected [ `<button>`, …(1) ] to have a length of 1 but got 2"*.
     **+3 tests** (ancla de tipo con `@ts-expect-error`, opciones duplicadas y reenvío del `ref`, que es
     lo único que la aserción sobre `forwardRef` podía romper).
     **Efecto colateral bueno:** `ProjectsToolbar` pierde `handleStatus` —ya no hace falta reconstruir el
     tipo del dominio buscando la opción— y el JSDoc de `STATUS_FILTERS`, que repetía la misma promesa
     falsa (fue el bloqueante de la ronda 2 de E2), queda alineado. `public-api.test.ts` intacto.

> **Deudas 149-152 — nacidas del residuo del review del lote 146/147/148 (2026-08-18). Ninguna bloqueó
> la aprobación; las cuatro las dejó el reviewer explícitamente en el tejado del leader.**

149. **🟠 El gate viejo del segmentado tiene el defecto 146-A, por partida doble.**
     `src/shared/ui/primitives/segmented-control/segmented-control.tokens.test.ts` es el **precedente**
     del que nació el gate nuevo, y arrastra el fallo que la deuda 146 corrigió en el hijo pero no en el
     padre. **Confirmado por medición del reviewer en la ronda 2**, no por lectura, y **no tocado a
     propósito** (estaba fuera del alcance del encargo).
     **Escenario concreto de fallo, las dos vías:**
     - **Existencia por subcadena.** Comprueba que la clase aparece en el CSS compilado buscando el
       nombre **como trozo de texto**, sin exigir frontera. Una utilidad **recortada** es prefijo de la
       buena, así que una clase que **no emite ninguna regla** pasa por verde si otra clase más larga la
       contiene. Es literalmente el bloqueante 146-A.
     - **`ruleBody` puede devolver el cuerpo de OTRA regla.** El anclado con el que recorta el cuerpo de
       la regla no garantiza que lo que devuelve pertenezca al selector que se le pidió; encima de ese
       texto se asientan **todas sus aserciones de forma**. O sea: el test puede estar afirmando cosas
       ciertas **sobre la regla equivocada**.
     **Por qué importa:** es el gate del primitivo del que cuelgan dos pantallas, y un verde falso aquí
     no se nota nunca — es la propiedad que hace peligrosa a esta familia de tests. Arreglo: adoptar la
     **frontera de nombre** y el recorte de regla del gate nuevo
     (`src/features/projects/ui/projects-ui.classes.test.ts`), con control positivo (rojo **y** el verde
     de antes) como manda la REGLA 3. Familia de las deudas 141 y 146.

150. **🟠 El gate de clases cubre 3 archivos de los ~20 que pintan clases.**
     `projects-ui.classes.test.ts` deriva las clases del fuente por AST y las contrasta contra el CSS
     compilado, pero su lista `COMPONENTS` tiene **tres entradas**. En el resto de la UI, una clase
     inerte en el DOM —un `className` que no emite ninguna regla— **sigue sin que nadie la vea**, que es
     exactamente el agujero que la deuda 141 nombró.
     **Por qué no se hizo ya y por qué ahora sí conviene:** mientras el gate tenía vías de verde falso,
     extenderlo por directorio **multiplicaba un verde falso conocido** — habría dado confianza sin
     medir. Con los **cuatro cajones de denuncia** de la ronda 3 cerrados, extenderlo ya suma en vez de
     mentir. Arreglo: pasar de lista explícita a **barrido por directorio**, y medir cuántos archivos
     entran y cuánto cuesta la pasada antes de fijarlo.
     **ACTUALIZACIÓN del 2026-08-20 (enmienda E13):** la cobertura pasa de **3 a 7 archivos**
     (los 3 de `/proyectos`, los 3 del Dashboard y el `AppShell`) y, sobre todo, **la técnica dejó de
     ser copiable a mano**: vive en `src/shared/ui/testing/class-names-from-source.ts`, así que sumar un
     archivo cuesta una línea. **No se marca saldada** porque quedan archivos sin cubrir. El reviewer
     midió además que `field.variants.ts` sería el octavo, barato de sumar.
     **Aviso para quien lo haga (nota práctica del reviewer):** `EXTERNAL_SOURCES` es una lista
     **exacta**, así que adoptar el `cn()` que la convención manda —hoy ninguno de los tres archivos lo
     llama— pondrá el gate **rojo** hasta que se añada `cn` a esa lista. Es el comportamiento diseñado
     (obliga a decidir en vez de tragarse las clases en silencio), pero sorprende si no se sabe.

151. **🟢 La expresión regular de la línea 478 del gate nuevo no hace lo que su código dice, y está verde
     por accidente.** En `src/features/projects/ui/projects-ui.classes.test.ts:478`,
     ``new RegExp(`${CLASS_ATTRIBUTE}\s*[=:]`, "g")`` pierde la barra invertida **dentro del template
     literal** (en una cadena de JS, `\s` es un escape desconocido y se queda en `s`), así que el patrón
     que corre de verdad es **`classNames*[=:]`**: "className", cero o más letras `s`, y luego `=` o `:`.
     **Verificado por el leader el 2026-08-20**, después de que el reviewer lo dejara anotado.
     **Escenario concreto de fallo:** hoy pasa porque `s*` casa con **cero** repeticiones y nadie escribe
     espacio antes del `=`. El día que alguien escriba `className = "…"` o `className : "…"` —con
     espacio, que es justo lo que `\s*` decía cubrir—, **la cuenta cruda no lo verá**, y esa cuenta existe
     precisamente para ser la **segunda red** del AST. El lint no avisa. Arreglo: escapar la barra
     (`\s`) o construir la expresión sin template literal, con un control positivo que la deje en rojo.

152. **🟢 Una clase puesta con `classList` desde un `ref` es invisible para el gate, y eso hoy sólo está
     en la cabeza del que lo escribió.** El gate declara su alcance —clases **escritas en el fuente**—, y
     el reviewer midió las dos salidas: el atributo `class` a secas **lo caza `tsc`** (comprobado), pero
     `elemento.classList.add("…")` desde un `ref` **typechequea y el gate no lo ve**.
     **Cero ocurrencias en el repo hoy**, y por eso se dictaminó no bloqueante. Arreglo: **media línea en
     el JSDoc** del gate que nombre la vía, para que quien la use sepa que se está saliendo de la red en
     vez de descubrirlo por una clase inerte en pantalla. No hay test que escribir: es documentación de
     un límite conocido.

> **Deudas 153-154 — nacidas de la VERIFICACIÓN EN NAVEGADOR (REGLA 4) del 2026-08-20, hecha por el
> leader al cerrar el lote 146/147/148. Ninguna la produjo ese lote: las dos son anteriores y
> aparecieron por mirar la pantalla, que es exactamente para lo que existe la regla.**

153. **🔴 El estado vacío del año es INALCANZABLE para quien tenga un proyecto en curso — y es el mismo
     error que el código de al lado se cuidó de no cometer.** Medido en pantalla el 2026-08-20:
     con el año en **2026** y en **2027** el Dashboard muestra `0 horas tejidas` **y aun así no sale el
     vacío**, porque el panel "Proyectos en curso" sigue mostrando el mismo proyecto en los dos años.
     **Escenario concreto de fallo:** `DashboardView.tsx:189` decide `isEmpty` exigiendo, además de las
     métricas en cero, que **`data.projects.length === 0`**. Esa lista la trae
     `getActiveProjects({ year, type })` de `dashboard-client.ts:119`, **que recibe `year` y NUNCA lo
     manda**: su `queryString` sólo lleva `active` y `type`. Y no es un olvido de una línea — **el
     endpoint no tiene filtro de año**: el schema de `src/features/projects/validation.ts:40` sólo
     conoce `active`, así que la lista es **de por vida**, no del año.
     **Por qué duele especialmente:** el comentario de `DashboardView.tsx:185-187` razona, sobre los
     metros, que *"«vacío» es del AÑO, así que los metros no cuentan: son un agregado lifetime […] quien
     hubiera cargado una lana alguna vez no vería nunca el estado vacío"*. **Es literalmente la misma
     trampa, y `projects` cae en ella tres líneas más abajo.** El título que promete el vacío
     (*"Todavía no tejiste nada en {año}"*) es una afirmación **sobre el año** condicionada a un hecho
     **que no es del año**.
     **Consecuencia directa sobre la deuda 147:** la copia que ese lote reescribió **no se puede ver en
     pantalla** mientras haya un proyecto activo. Se saldó bien y está anclada por test, pero **su
     camino de llegada está roto**.
     **Dos arreglos posibles, y la decisión no es obvia:** (a) sacar `projects` de `isEmpty` y dejarlo
     como juicio del año puro —coherente con el argumento de los metros—; o (b) darle al endpoint un
     filtro de año de verdad y que el panel sea del año. **Hay que elegir a sabiendas**, porque cambia
     qué significa "Proyectos en curso". Lo que no se puede es dejarlo como está: hoy el parámetro
     `year` de `getActiveProjects` **miente**, y eso vale para las dos salidas.

154. ~~**🟠 El Dashboard no recibió el trabajo de jerarquía visual que `/proyectos` sí recibió (E2), y a
     ancho de escritorio se ve roto.** Medido en pantalla el 2026-08-20 a ~1536 px de ancho.
     **NO lo produjo el lote 146/147/148** —lo único que ese lote cambia en pantalla es una línea de
     copia—: es estado anterior, de la época de #19, y sale a la luz ahora porque **por fin alguien
     miró**. Dos síntomas concretos:
     - **"Tu año en números" pinta UNA tarjeta ocupando un tercio del ancho, con dos tercios de vacío
       marrón a su derecha**, mientras los tres selectores (`Horas`/`Proyectos`/`Metros`) viven pegados
       al borde derecho, a media pantalla de distancia de la tarjeta que gobiernan. Por defecto sólo
       `Horas` está elegida, así que **el estado por defecto de la página es el que peor se ve**.
     - **El bloque "Ordenar por" flota suelto**: aparece **por encima y a la derecha** del título
       "Proyectos en curso" con el que forma fila, sin alinearse con él, y **"Ver todos" queda FUERA de
       la tarjeta**, colgando de su borde derecho. Se lee como un panel a la deriva, no como la cabecera
       de una sección.
     **Por qué importa:** es la **página de entrada** de la app —lo primero que se ve al entrar—, y es la
     misma clase de problema que las deudas 136-144 describieron para `/proyectos`. Familia de la
     **141** (*ningún gate mide el eje visible*): esto pasó todos los gates durante meses.~~ → **SALDADA**
     el 2026-08-20 por la **enmienda E13 de RFC-01**, y la causa raíz resultó **no ser del Dashboard**:
     en toda la app **no existía ningún contenedor de ancho máximo**, así que cada fila `justify-between`
     mandaba sus mitades a los bordes de la ventana. Por eso se arregló **en el caparazón, una sola vez
     para las 6 rutas**, en vez de parchear esta página. Verificado **en pantalla por el leader**
     (REGLA 4, 2026-08-20): contenedor de **1040px, x=240 → 1280** en ventana de 1536; la tarjeta de
     métrica ocupa la columna entera sin huecos y la `Card` desapareció de los controles.
     Informe: `progress/informs/26.informe-e13_ancho_contenido.md`. **Lo que dejó vivo:** las deudas
     **155** (desalineación caparazón/contenido, inherente a E13) y **159** (la fila de "Proyectos en
     curso" sigue con tres líneas de base distintas).

155. **🟠 Por encima del tope de contenido, el caparazón y el contenido dejan de estar alineados.**
     Nace al implementar la enmienda **E13(a)** (2026-08-20), y es **inherente a la decisión, no un
     descuido**: E13 exige que el contenido vaya en una columna centrada con tope y que el caparazón
     **no cambie de geometría**. Las dos cosas a la vez sólo pueden convivir desalineadas. Medido con
     los tokens: con `--content-max-inline: 1040px` y una ventana de 1536px, el wordmark del archivero
     y el control de cuenta siguen a **24px** del borde (`--nav-tab-inset-start`) mientras la columna
     de contenido empieza a **248px**. **Escenario de fallo:** el ojo lee dos rejillas distintas en la
     misma pantalla — la del cajón y la del contenido — y el archivero deja de parecer el marco del
     contenido que hay debajo. **Cómo se salda:** decidir si el caparazón se acota también (y entonces
     hay que reabrir el ancho de nacimiento del archivero, que E11 dejó clavado en 1180px con 30.88px
     de holgura) o si la desalineación se acepta y se escribe como intencional. **No se decidió en
     E13 porque E13 dice explícitamente que el caparazón no se toca.**

156. ~~**🟠 El valor del tope de contenido se eligió por derivación, pero NADIE lo vio en pantalla.**
     `--content-max-inline: 1040px` sale de una aritmética honesta y comprobada por gate
     (`app-shell.classes.test.ts`), pero el implementer de E13 **no tenía navegador**: la elección de
     un ancho de contenido es una decisión de aspecto y ésta se tomó sin mirar. **Escenario de
     fallo:** 1040px puede quedar estrecho para un panel de datos en un monitor grande, y el defecto
     que E13 vino a arreglar se cambiaría por el contrario. **Coste de saldarla: una línea** de
     `globals.css` más rehacer la derivación del gate — que es justo lo que impide moverlo a ojo.
     Depende de la **REGLA 4** (verificación en navegador del leader).~~ → **SALDADA** el 2026-08-20:
     **el leader lo miró**. A 1536px de ventana la columna de 1040px ocupa el **68%** del ancho y la
     página se lee ordenada; no queda ni estrecha ni perdida. **No se cambia el valor.** La ficha se
     cierra con el juicio explícito de que 1040px es el ancho correcto hoy — si mañana alguien lo
     mueve, que sea con otra mirada en pantalla, no a ojo desde el código.

157. **🟢 El nuevo `--danger-inverse` cumple su medición y no lo eligió nadie mirándolo.**
     Nace en **E13(c)**: al sacar la `Card` del paso a paso del año, el mensaje de error pasa a leerse
     sobre el espresso, donde `--danger` mide **3.02:1** (por debajo del 4.5:1 de texto). El tono nuevo
     mide **5.00:1**, asertado en `field.variants.test.ts`. Lo que **no** está validado es su encaje en
     la paleta: se eligió por número, no por ojo, y **hoy sólo aparece en un sitio** (año fuera de
     rango). **Cómo se salda:** mirarlo en pantalla junto al resto de la paleta y ajustarlo en el token
     si canta. Es verde porque el criterio duro (contraste) está cumplido y medido.

158. **🔴 Otros TRES gates de tokens leen el valor con la misma lectura permisiva que dejó pasar el
     bloqueante B2, y ninguno comprueba la unidad — y uno de los tres puede MATAR TODAS LAS UTILIDADES
     `desktop:` DE LAS 6 RUTAS sin poner un solo test en rojo.**

     > **Subida de 🟠 a 🔴 por el leader el 2026-08-20**, sobre una medición del reviewer que la ficha
     > original no tenía. El caso peor **no es genérico, tiene nombre**: con
     > `--breakpoint-desktop: 1180` (sin unidad) el compilador emite `@media (width >= 1180)`, que es
     > **inválida**, y la **suite entera da `1404 passed`** con **todas las utilidades `desktop:`
     > muertas en las seis rutas**. O sea: el layout de escritorio de la app completa desaparece y
     > ningún gate se entera. Por eso la ficha nombra ahora explícitamente **`--breakpoint-*`** como el
     > token peligroso, y por eso `breakpoint-tokens.test.ts` es el primero de los tres que hay que
     > arreglar, no uno más de la lista.
     >
     > **El alcance de los otros dos se acepta tal como lo dejó el implementer** (`account-band` y
     > `archive-nav`): el reviewer compró el argumento —gates ya pagados, tokens sin ediciones
     > planificadas— y sólo objetó éste. **De rebote, `--bp-tablet` sí quedó cubierto** por el gate de
     > E13. Nace al cerrar **B2** en la ronda 3 de la
     enmienda E13 (2026-08-20). **Medido, no supuesto** (`grep -rn "parseFloat" src --include=*.test.ts`):

     | gate | ayudante | qué tokens lee |
     |---|---|---|
     | `src/shared/ui/breakpoint-tokens.test.ts:60` | `length()` | los `--bp-*` y sus alias de Tailwind |
     | `src/shared/ui/layout/account-band/account-band.tokens.test.ts:73` | `length()` | la geometría de la banda de cuenta |
     | `src/shared/ui/layout/archive-nav/archive-nav.tokens.test.ts:57` | `length()` | el presupuesto vertical y horizontal entero del archivero |

     Los tres tienen **la misma copia literal**: `Number.parseFloat` y un rechazo que sólo mira si el
     resultado es un no-número. `Number.parseFloat` **descarta el sufijo en silencio**, así que para
     ella el número pelado, el número con unidad de píxeles y el mismo número en unidades de
     tipografía **son el mismo número**. **Escenario de fallo:** a cualquiera de esos tokens se le cae
     la unidad en una edición y el gate sigue verde, mientras en el navegador la declaración es
     inválida y la propiedad cae a su valor inicial — que es exactamente cómo B2 dejaba la pantalla
     **sin tope de ancho con los 1403 tests en verde**, y el leader llegó a medirlo en pantalla.
     **Cómo se salda:** usar `isAbsolutePxLength()` de `src/shared/ui/testing/css-tokens.ts`, que ya
     existe, tiene su criterio de alcance escrito y su control positivo en cuatro direcciones. Es un
     puñado de líneas por gate. **Por qué no se hizo en la ronda 3:** son gates preexistentes de otras
     enmiendas, sus tokens no están planificados para editarse (el de E13 sí, ver **deuda 156**), y
     tocar tres gates ya pagados dentro de una ronda que existe para cerrar un bloqueante es cómo se
     abren bloqueantes nuevos.

     **Mitad hermana, del mismo diagnóstico y NO medida:** `isDeclared()`
     (`app-shell.classes.test.ts`) comprueba que un token aparezca declarado **en el texto** de
     `globals.css`, no que lo esté en un **ámbito que aplique**. Un token movido dentro de una regla
     condicional contaría como declarado y el tope no existiría por debajo de esa condición. Lo marcó
     el reviewer sin bloquear y **lo dedujo leyendo el patrón, no corriéndolo**; queda con esa
     etiqueta.

     **Buena noticia medida en la otra dirección:** cero comparaciones por subcadena de nombres de
     token en el resto de `src/**`. El bloqueante **B1** estaba sólo en los dos sitios de E13 y está
     cerrado.


159. **🟠 La fila de "Proyectos en curso" tiene tres piezas y tres líneas de base distintas.** Medido en
     pantalla por el leader (REGLA 4, 2026-08-20, ventana de 1536px, ya **con** el contenedor de E13
     puesto):

     | pieza | arriba | abajo |
     |---|---|---|
     | título "Proyectos en curso" | 982 | **1018** |
     | bloque "Ordenar por" + selector | 948 | **992** |
     | enlace "Ver todos" | **974** | 1018 |

     Las tres viven en la misma fila (`tablet:flex-row tablet:items-end tablet:justify-between` en
     `ActiveProjectsPanel.tsx:62`) y **ninguna se alinea con las otras dos**: el selector termina 26px
     por encima del título y "Ver todos" arranca a media altura entre los dos. **Escenario de fallo:** el
     ojo no encuentra la línea que une la cabecera de la sección, así que las tres piezas se leen como
     tres cosas sueltas en vez de como el encabezado de una lista — que es exactamente la queja que
     originó la deuda 154, sobreviviendo a su arreglo en pequeño.
     **Por qué NO la cerró E13:** E13(c) sólo pedía **quitar la `Card`** de los controles, y eso se
     cumplió. La desalineación es anterior y quedó a la vista al desaparecer el marco que la disimulaba.
     **Cómo se salda:** decidir qué se alinea con qué —lo natural es la línea de base del título con la
     del control, y "Ver todos" con una de las dos, no en medio—, y **sostenerlo con un gate**, porque
     hoy la alineación no la mide nadie: es la deuda **141** otra vez, en pequeño.

---

> **Del lote 158 + 153 (2026-08-24).** Cierre **parcial y declarado como tal**: la 153 se salda, la 158
> **NO**. Y las deudas nuevas se etiquetan ya con la **escala corregida** de arriba — casi todas son ⚪,
> y ese es justamente el punto.

158. **↩️ REDUCIDA, NO SALDADA** (ver ficha arriba). Los tres gates leen ya con `isAbsolutePxLength()`
     reutilizado, con control positivo en **cuatro direcciones** por gate corrido sobre mutantes del
     `globals.css` **real**, y con **tokens descubiertos, no enumerados** (el reviewer lo comprobó
     añadiendo un par nuevo: el gate lo cubrió solo). La partición `length`/`unitless` de `archive-nav`
     —necesaria porque ese archivo lee también `--leading-tight` y los `--z-nav-*`, que legítimamente no
     llevan unidad— **no deja ninguna longitud del lado permisivo**. La **mitad hermana pierde la
     etiqueta "no medida"**: `isDeclared()` quedó medida (con el token en una condición inalcanzable la
     suite daba `1416 passed` y la app sin tope) y **arreglada** en T6 preguntando al **CSS compilado**
     vía `declarationsOf()` — la regex se abandonó, no se endureció.
     **POR QUÉ NO SE CIERRA:** el reviewer encontró una **TERCERA variante** del mismo verde-falso, y
     T6 sólo blindó `app-shell`. Ver deuda **160**.
     Informes: `progress/reports/impl_deuda_158.md`, `progress/reports/review_deudas_158_153.md`.

153. ~~**🔴 El estado vacío del año es INALCANZABLE**~~ → **SALDADA** el 2026-08-24 por la enmienda
     **E4** de RFC-02, **con la decisión tomada por el usuario y escrita en el RFC antes de tocar
     código**: *"Proyectos en curso" es el PRESENTE, no una rebanada del año*. El parámetro `year` de
     `getActiveProjects` —que se recibía y **no se mandaba nunca**— se eliminó; `isEmpty` dejó de exigir
     `data.projects.length === 0`.
     **Lo que la decisión destapó, y no estaba en la ficha:** `isEmpty` **sustituía a los DOS paneles**,
     así que el vacío —ahora alcanzable con proyectos activos— habría **escondido un proyecto vivo**:
     el mismo desenlace por el que el usuario descartó filtrar por año. Se arregló como **E4 (d)**: el
     vacío sustituye **al panel de métricas**, y "Proyectos en curso" se pinta siempre que haya activos.
     **Y una segunda vuelta, E4 (e):** el vacío le decía *"Empezá el primero"* a quien tenía un proyecto
     en pantalla. **Decisión del usuario:** dos descripciones, según haya o no activos.
     **El rechazo que hubo por el camino vale la pena leerlo:** el primer ancla del vacío montaba un
     proyecto con `startDate` **del mismo año** que se miraba, y `countProjects` cuenta *"iniciado O
     terminado en el año"* — o sea, **producción nunca habría alcanzado ese estado**. Era la deuda 153
     **reaparecida dentro de su propio arreglo**. Verificación: `1426 passed | 13 skipped (1439)`.
     Informes: `progress/reports/impl_deuda_153.md`, `progress/reports/review_deudas_158_153.md`.

160. **⚪ TERCERA variante del mismo verde-falso: un token declarado DOS VECES en `:root`.** La cascada
     se queda con **la última** declaración y los gates leen **la primera**. **Medido por el reviewer:**
     la **suite entera** da `1424 passed` con `--nav-height: 104` y `--touch-target: 44em` **vigentes en
     el navegador**; y `36 passed` con `--bp-tablet` sólo dentro de una condición inalcanzable. T6
     blindó el ámbito **sólo en `app-shell`**; `breakpoint-tokens`, `account-band` y `archive-nav`
     siguen leyendo por el camino viejo. **Cómo se salda:** aplicarles `declarationsOf()`, que **ya
     existe**. **⚪ y no 🔴 a propósito:** el escenario exige que un agente edite `globals.css` y declare
     el token dos veces. **Ningún usuario puede ver esto.** No interrumpe #21.

161. **⚪ La familia entera se está arreglando gate por gate, y vuelve por un flanco nuevo cada vez.**
     Tres variantes en dos sesiones: **unidad** (B2 de E13) → **ámbito condicional** (T4) → **declaración
     duplicada** (160). Cinco call sites de `parseFloat` validados a mano. **Escenario de fallo:** mañana
     alguien escribe `foo.tokens.test.ts` con `Number.parseFloat` —que es lo natural y lo que hicieron
     los cuatro anteriores— y la sexta aparición entra con la suite en verde. **Lo que mata la CLASE:**
     un **gate de repo** (estilo el de no-hardcode, que ya barre `src/**`) que prohíba leer el valor de
     un token CSS sin validar unidad **y ámbito**. **Bajo la escala nueva es ⚪:** es la deuda de más
     calado del lote *para el código* y **cero para el usuario**. Se hace cuando las páginas estén.

162. **🟠 Cada paso de año dispara una petición idéntica y redundante a `/api/projects`.**
     `getActiveProjects` ya no lleva `year`, pero sigue en el `Promise.all` de un `useEffect` cuya clave
     **sí** incluye el año. **Medido:** cinco pasos de año → **10** peticiones, **5** de ellas idénticas.
     Coste bajo (lista de ~15 proyectos) y hoy tiene una ventaja: la lista se mantiene fresca.
     **Arreglo si molesta:** efecto propio con clave `type|reloadToken`. **Riesgo:** duplicar la máquina
     de "estar cargando", que hoy es una sola clave y por eso no se puede desincronizar.

163. **🟠 El estado vacío se re-rotula con el año nuevo mientras todavía está cargando**, sin feedback
     visible. Medido por el reviewer. **Es la deuda 137 otra vez.** Un usuario **sí** ve esto —de ahí el
     🟠— pero no le impide nada: ve un instante el título del año nuevo sobre datos del viejo.

164. **⚪ Las fechas `2026-…` escritas a mano en el fixture base de `DashboardView.test.tsx`.**
     Fichada por el implementer al arreglar el bloqueante 1. **Escenario de fallo con fecha exacta:** el
     **1 de enero de 2027**, `CURRENT_YEAR` avanza y el fixture no, reproduciendo **la misma
     incoherencia que causó el rechazo de hoy** — un test verde sobre un escenario que producción no
     produce. **Cómo se salda:** derivar las fechas de `CURRENT_YEAR`, como ya se hizo con el proyecto
     del test del vacío.

---

> **De la feature #21 `projects_detail_ui` (2026-08-24/25), sus dos tandas y las DOS verificaciones en
> navegador.** La feature se cierra **aprobada sin bloqueantes**. Casi todo lo de abajo es ⚪ y **eso es
> el punto**: con la escala corregida se ve de un vistazo qué merece parar una feature y qué no.

165. **🟠 La navegación móvil NO está pegada abajo: sólo aparece haciendo scroll hasta el fondo.**
     **NO la produjo #21** — viene del bottom-nav original y **sale a la luz ahora porque es la primera
     vez en siete sesiones que se pudo medir el móvil**. Medido a 502 px de ancho:
     `position: static` con **`z-index: 100` inerte** (el z-index no hace nada sobre un elemento
     estático — el valor delata que alguien la creía flotante), su rect cae en **y=934 con el viewport
     en 750**, o sea **fuera de pantalla**, y en ese ancho **el archivero de escritorio está oculto**
     (`0×0`). **Escenario de fallo:** en un teléfono, la **única** navegación de la app no se ve al
     entrar a ninguna página; hay que scrollear hasta el final para cambiar de sección.
     **Es 🟠 y no 🔴 porque se puede navegar**, pero está a un paso.

166. **🟠 El tab Progreso muestra `1 / 0` cuando la meta de vueltas no está fijada.** Visto en pantalla
     el 2026-08-25. El porcentaje sale bien (`0%`), pero el contador se lee como **una división por
     cero**. **Escenario:** proyecto recién creado, una vuelta apuntada y sin meta → el usuario lee
     `1 / 0`. **Cómo se salda:** decidir qué mostrar sin meta (sólo el número de vueltas, o un guion),
     que es una decisión de copia y va a **RFC-03**.

167. **⚪ TERCERA variante de verde-falso ya fichada (deuda 160), ahora con vecina:**
     `ProjectCard.test.tsx:399` es un aserto **estructuralmente incapaz de fallar** en `happy-dom`,
     porque **`happy-dom` no hace hit-testing**. Su comentario **prometía medir la convivencia de la
     capa del tap con el botón del cronómetro**, y no la mide. **No hay defecto detrás** —la convivencia
     quedó **verificada a mano en navegador**— así que **es ⚪ y no bloqueó el cierre**. Se corrigió
     **sólo el comentario**, a coste cero, para que ningún review futuro lo cite como evidencia.
     **La deuda de fondo permanece:** *ningún gate de este repo puede medir hit-testing*.

168. ~~**⚪ El swatch de color de lana no es reutilizable, y RFC-04 lo va a necesitar.**~~ **SALDADA**
     (S2 `swatch-split` de #23, 2026-09-18). Fichada por el implementer de T2. **No sube a
     `src/shared/ui/`** porque `ColorFamily` es **configuración de la app** y subirlo rompería la
     portabilidad del template (contrato del SDD). **Escenario:** al implementar #23-#25 (lanas) hará
     falta el mismo swatch y se copiará.
     **Cómo se saldó:** el componente se **partió por la línea de portabilidad, no se mudó entero**.
     `Swatch` sube a `src/shared/ui/primitives/swatch/` genérico —props únicamente (`color`, `label?`,
     `size`, `className`), sin hooks, sin `"use client"`, sin importar `ColorFamily`—.
     `yarnSwatchColor` (`YarnsTab.tsx:265-294`) se movió a `src/shared/config/yarn-swatch.ts` y se
     renombró `yarnSwatchClass`: el `switch` de 13 ramas queda igual, pero devuelve una clase de
     utilidad, que entra al primitivo por el `className` ya obligatorio en todo componente.
     `YarnsTab.tsx` compone ahora `Swatch` + `yarnSwatchClass` en sus dos sitios de uso.
     **Dónde quedó la prueba:** el commit de S2; `Swatch.boundary.test.ts` (lee el fuente, misma
     técnica que `file-input.boundary.test.ts`); `yarn-swatch.classes.test.ts` (las 13 familias emiten
     una regla real en el CSS compilado, el relevo de cobertura que perdió el barrido de AST al
     mudarse el mapa); y el informe de archivo de este cambio.

169. **⚪ Un inventario de lanas que falló no se puede reintentar sin recargar** (heredado de #20).

170. **⚪ Sigue faltando el gate de CSS compilado en `src/shared/ui/`.** `features/dashboard/ui/` y
     `features/projects/ui/` **sí** lo tienen, así que una utilidad mal escrita en una **página** se
     caza y la misma en un **primitivo** no. Verificado a mano en las dos tandas (41 clases de `Tabs`,
     60 del `Dialog`, las de la variante lateral: **cero inertes**) con archivos temporales que se
     borraron. **Bajo la moratoria no se abre**: la técnica ya está extraída en
     `shared/ui/testing/class-names-from-source.ts` y es un archivo cuando toque.

171. **🟡 VERIFICADO EL 2026-09-18 — la mitad del contraste ya no es sospecha, es medición.** Al cerrar
     S3 de #23 se crearon 13 lanas de prueba (una por familia), se midió en navegador y se borraron.
     **Resultado del contraste de los 13 swatches, relleno contra la superficie de la tarjeta
     (`rgb(255,253,246)`):** Blanco **1.02**, Neutro **1.30**, Amarillo **1.89**, Naranja 3.08,
     Rosa 3.13, Gris 3.67, Verde 4.83, Rojo 4.86, Azul 5.20, Violeta 5.43, y por encima Marrón, Negro
     y Multicolor. Tres caen bajo el 3:1 que pide WCAG 1.4.11 para objetos gráficos.
     **PERO no es un fallo de accesibilidad, y la razón importa:** los 13 llevan un borde de 1.6px a
     **14.65:1** contra la tarjeta, que es justamente el límite perceptible que esa norma exige, y el
     nombre del color va en texto al lado, así que nada se transmite sólo por color (WCAG 1.4.1). El
     comentario original del `YarnSwatch` ya decía que el borde estaba puesto para que *"una lana
     blanca o cruda siga teniendo silueta en vez de desaparecer"*: **funciona, y ahora está medido.**
     **Confirmado además el sospechoso nombrado:** `--yarn-neutral` es `#eadfcb` y `--surface-sunken`
     es `#eadfcb` — **literalmente el mismo color**. La consecuencia real no es invisibilidad (el
     borde la evita) sino que **Blanco y Neutro no se distinguen entre sí por el relleno**: los dos se
     leen como "círculo pálido con anillo oscuro". Quien tenga las dos lanas las diferencia por el
     nombre, no por la muestra.
     **Lo que sigue sin verificar** (no había datos para ello): la lana **multicolor** sobre otras
     superficies, la **checklist con un patrón real** y el **buscador con inventario grande**.
     **Cómo se salda del todo:** decidir si Blanco y Neutro merecen tokens distinguibles entre sí, y
     medir los tres puntos que quedan cuando haya datos reales.

     <!-- Ficha original, conservada porque la corrección cambia el estado, no la historia: -->
171-bis (original). **⚪ NO VERIFICADO por falta de datos, se declara en vez de darse por bueno:** el **contraste de los
     13 swatches** de lana —con dos sospechosos nombrados: **`--yarn-neutral`, que es literalmente
     `--surface-sunken`**, y `--yarn-white`—, la lana **multicolor**, la **checklist con un patrón
     real** y el **buscador con inventario grande**. El inventario del usuario está **vacío** y el
     proyecto **no tiene patrón**, así que no hay nada que pintar. Mirarlo exige **crear datos de
     prueba**, y eso escribe en los datos del usuario: **se pide antes**. Cae natural en **RFC-04**
     (#23-#25) y **RFC-05** (#26-#28), cuando esos datos existan igualmente. Ver **E4(b)** de RFC-03.

### 📌 Lo que estas dos verificaciones enseñaron sobre el MÉTODO (no es deuda, es medicina)

**Dos falsos positivos del leader en una sola sesión**, los dos a punto de reportarse como defectos:

1. **Un 🔴 que no existía.** Se midió con clics sintéticos y **el puntero caía en `coord ÷ 1.25`** —el
   `devicePixelRatio` exacto—, **sobre la capa del tap que cubre la tarjeta entera**. El síntoma
   **imita perfectamente al bug real**, y por eso engañó. **Y el factor NO es estable:** en la misma
   ventana, una captura salió en px físicos y la siguiente en px CSS.
2. **Un `500` que no era de la app.** El `next dev` había quedado **degradado** al detenerlo el arnés
   (*"Jest worker encountered child process exceptions"*). **Con servidor limpio: `200` y JSON válido.**

> **REGLA de método, para la nota de la REGLA 4:** *toda medición hecha con clics sintéticos empieza
> confirmando **dónde cayó** el puntero, no dónde se pidió que cayera* (escucha de `mousemove` en
> captura, cuatro líneas). Y *antes de culpar a la app, descarta el entorno de medición*.
>
> **Lo dijo mejor el reviewer:** que un análisis estático **no encontrara** el camino de propagación
> **era en sí mismo la señal** de que el fallo estaba en la medición y no en el código.

---

> **Del lote de deudas visibles 165 + 166 (2026-08-25).** El lote se cierra **aprobado sin bloqueantes**.
> Lo de abajo son **cuatro fichas nuevas**, y **ninguna la produjo el lote**: dos las destapó la propia
> verificación (172, 173), y dos son de cobertura de gates (174, 175). La 173 merece leerse entera,
> porque es la **segunda vez en dos sesiones** que arreglar algo hace visible lo que estaba escondido.

172. **🟠 El área segura de la barra móvil está CABLEADA y hoy vale CERO: falta decidir `viewport-fit`.**
     La detectó el **implementer**, que la escaló en vez de resolverla solo. `--safe-area-bottom` existe
     en `globals.css` y `BottomNav.tsx` aplica `pb-(--safe-area-bottom)`, pero
     `env(safe-area-inset-bottom)` **sólo devuelve algo distinto de cero con `viewport-fit: cover`** en el
     viewport del documento, y **este documento no lo declara**. **Medido en navegador:**
     `padding-bottom` computado = **`0px`**. **Escenario de fallo:** en un teléfono con barra de gestos, la
     navegación queda **bajo el gesto del sistema** y el SO se come los toques — una navegación que está
     pero no se puede usar. **Decisión del usuario (2026-08-25): se ficha, no se añade ahora.**
     `viewport-fit: cover` **no es una línea**: cambia el documento entero a pantalla completa y obliga a
     compensar **también los laterales** en horizontal; es un cambio de geometría del caparazón —lo que
     E13 se cuidó de no hacer— y **el móvil real (≤390 px) sigue fuera de alcance**, así que se entregaría
     a ciegas. **Cómo se salda:** decidir `viewport-fit` con una forma de mirarlo (emulación por CDP o un
     teléfono de verdad), y compensar los cuatro lados a la vez. Ver la corrección de **E14 (b)** en
     RFC-01. **Por qué esto NO es la 165 otra vez:** el `z-index` de la 165 era inerte **y nadie lo
     sabía**; esto está declarado en el RFC, acá y en el informe. *Un cableado declarado que espera una
     decisión es deuda; uno que nadie declaró es una trampa.*

173. **🟠 Los rótulos de la barra móvil se SOLAPAN y se salen de su caja al ancho en el que por fin se la
     ve.** **NO la produjo el lote** — E14 excluye el interior de la barra **por contrato** y no lo tocó.
     Es **preexistente, y la destapa el arreglo de la 165**: hasta hoy la barra estaba fuera de pantalla,
     así que nadie podía ver cómo se rompía por dentro. **Medido a 500 px** (nav de 484.8 px, seis cajas
     iguales de 80.8 px, `font-size: 11px`, `overflow: visible`, `white-space: normal`):
     | rótulo | ancho del TEXTO | ancho de su CAJA | desborde |
     |---|---|---|---|
     | `Calculadoras` | **105.2 px** | 80.8 px | **+24.4 px** |
     | `Dashboard` | 81.3 px | 80.8 px | +0.5 px (al filo) |
     Solape real medido entre `Patrones` y `Calculadoras`: **6.3 px**. La causa es que son **palabras
     únicas que no pueden partirse** con `white-space: normal`, en cajas repartidas a partes iguales, y
     nada las recorta. **Escenario de fallo:** en un teléfono se leen dos rótulos encimados y no se
     distingue dónde acaba uno; a ≤390 px es peor, y ahí no hay ninguna otra navegación. **Cómo se
     salda:** es una **decisión de diseño, no un ajuste** —abreviar los rótulos, bajar el cuerpo,
     recortar con elipsis, permitir dos líneas o cambiar el reparto— y va a **RFC-01**. **Se ficha y no se
     abre bajo la moratoria**, porque la barra **se puede usar**: las cajas táctiles siguen midiendo
     80.8 × 45.6 px y **no se solapan entre sí**; lo que se pisa es el texto.

174. **⚪ El gate nuevo de la barra comprueba que HAY desplazamiento inferior, pero no que sea CERO.**
     Fichada por el **reviewer**, que probó el gate con **once mutaciones propias** y encontró que diez lo
     ponen en rojo —incluida la reproducción literal de la deuda 165 y el cambio `sticky` → `fixed`— y
     **una no**: mover `bottom-0` a un desplazamiento distinto de cero **sigue pasando los 18 tests**.
     **No hay defecto detrás** (el valor real está en `0px`, medido en navegador), pero el gate acepta un
     anclaje que no es el del contrato.

175. **⚪ El interior de la barra no lo cubre ningún gate de CSS compilado.** Fichada por el reviewer. Las
     clases de `bottom-nav.variants.ts` no las escanea nadie, porque el resolvedor de literales de objeto
     tiene un agujero conocido. **Dos de las tres razones del implementer para no cerrarlo son válidas**
     (ese objeto no lleva clases, y las que produce viven en un archivo que E14 excluye explícitamente);
     **la tercera no lo sería sola** —*"tocaría una pieza que comparten otros tres gates"*—, y por eso se
     ficha en vez de darse por cubierto. **No es visual, es de cobertura.** Emparenta con la **170**.

### 📌 Lo que la verificación de este lote enseñó sobre el MÉTODO

1. **Arreglar algo que estaba escondido destapa lo que se escondía con ello, y eso NO es una regresión.**
   Segunda vez en dos sesiones: la 165 salió a la luz cuando se pudo medir el móvil, y la **173** sale a
   la luz cuando la barra por fin se ve. Conviene decirlo al fichar, porque de lo contrario el próximo
   review lo lee como *"el lote rompió la barra"* y busca un culpable que no existe.
2. **`resize_window` volvió a mentir, y ya van dos sesiones.** Reportó `Successfully resized ... to 500x750`
   y `innerWidth` siguió en **1536**. **Comprobá siempre `innerWidth` después de pedir un resize.**
3. **Hay una vía para medir angosto que NO depende de la ventana del usuario: un `iframe`.** Un iframe de
   500 px **tiene su propio viewport para media queries**, así que el navegador aplica las reglas reales
   —`archive:hidden` dejó de ocultar la barra, `position: sticky` se comportó como en un móvil— **sin
   falsear ni un estilo**. Con esto se verificaron los tres puntos que el reviewer dejó abiertos.
   **Su límite, dicho:** el iframe **no reproduce** barras de sistema ni áreas seguras, así que **no
   sirve** para cerrar la 172.
4. **Dos "404" que no eran bugs.** `/lanas`, `/patrones`, `/calculadoras` y `/stash` **no existen todavía**
   —son las features pendientes #23-#30—, y el Dashboard vive en **`/`, no en `/dashboard`**. La barra
   enlaza a cuatro rutas que hoy dan 404: **esperado en este punto del MVP**, no una regresión.

---

> **De la tanda 1 de #22 `projects_form_ui` (2026-08-26).** T1 se cierra **aprobada sin bloqueantes**: el
> reviewer **rompió el código él mismo con ocho mutaciones** y confirmó que las seis garantías del
> implementer son ciertas. Una sola ficha, y es un rótulo, no un agujero.

176. **⚪ QUINTA variante de verde-falso, y esta vez es sólo el COMENTARIO:** el de
     `FileInput.test.tsx:126` dice guardar el invariante de que el input de archivo **no puede ser
     `display:none`** —porque dejaría de ser enfocable por teclado— y **no puede guardarlo**: el reviewer
     puso `hidden` y **ese archivo salió 11/11 verde**. **NO hay agujero detrás:** el invariante real
     **sí** está cubierto, y por el sitio correcto —el **gate de CSS compilado**, que con esa misma
     mutación **muere**—. Es un **rótulo desactualizado**, y se ficha por lo único que hace daño: que un
     review futuro lo cite como evidencia de algo que no mide. **Arreglo de una línea, va en la T2.**
     Familia: **160**, **167**, **174**. Y la lección se repite: *un comentario que promete una garantía
     es una afirmación sobre el código, y envejece igual de mal que el código.*

---

> **De la verificación en navegador (REGLA 4) de #22 `projects_form_ui`, 2026-08-26.** Las dos tandas
> quedaron **aprobadas sin bloqueantes**. De los **ocho puntos** que dejaron abiertos los reviewers, se
> verificaron **los ocho**. Seis salieron bien. Lo de abajo son las **tres fichas** que salieron de mirar,
> y la primera **no la produjo #22: la destapa**.

182. **🟠 EL ACENTO DE TODA LA APP NO LLEGA A AA, y es la primera vez que alguien lo mide.**
     **NO lo produjo #22.** Salió al verificar el contraste del botón de peligro (que **sí** pasa: `#c6432f`
     sobre `#fffdf6` = **4,86:1**, medido con el color computado real, no con aritmética sobre tokens).
     Al medir el vecino apareció esto, y **se confirmó antes de reportarlo** barriendo la página entera:
     | elemento | de dónde viene | ratio |
     |---|---|---|
     | «Editar» del cajón | **#22** | **3,02:1** |
     | «Nuevo dos agujas» / «Nuevo crochet» | **#22** | **3,02:1** |
     | **«Activos»** del segmentado | **preexistente, #20** | **3,02:1** |
     La causa es el token: **`--accent: #e4649b` con texto `#fff8ee` da 3,02:1**, y **AA para texto normal
     exige 4,5**. A `16px/700` **no califica como texto grande** (haría falta ≥18,66px en negrita).
     **Escenario de fallo:** con poca luz, en una pantalla mala o con visión reducida, **el rótulo del
     botón principal de cada pantalla es el que peor se lee**. **Es 🟠 y no 🔴 porque se lee** —3,02 no es
     ilegible, es insuficiente—, y **no se abre bajo la moratoria** porque tocar el acento **repinta la app
     entera** y es una decisión de diseño del usuario: oscurecer `--accent`, oscurecer el texto sobre él,
     o aceptar el incumplimiento por escrito. **Va a RFC-01.**
     > **Por qué esto es hermano de la 165 y de la 173:** nadie lo había medido nunca. No hay gate que mire
     > contraste, así que el defecto **no podía salir de la suite** — sólo de mirar la pantalla.

183. **🟠 Tras COMPLETAR una acción, el foco se cae al `body`. Al cancelarla, no.** Medido en los tres
     caminos, y **el diagnóstico es exacto**:
     | camino | dónde queda el foco |
     |---|---|
     | cancelar el alta | **vuelve al disparador** («Nuevo dos agujas») ✅ |
     | **crear** con éxito | **`BODY`** ❌ |
     | **borrar** con éxito | **`BODY`** ❌ |
     **El `Dialog` NO tiene la culpa**: devuelve el foco correctamente cuando el flujo se descarta. Lo que
     falla es **el camino de éxito** de #22. **Escenario de fallo:** quien navega con teclado o lector de
     pantalla y **completa** un alta o un borrado es devuelto **al principio del documento** y pierde el
     sitio; quien **cancela** queda bien atendido. **Está al revés de lo que debería.** En el borrado hay
     un matiz que explica la mitad: **el disparador deja de existir** (la tarjeta se borró), así que no hay
     dónde volver y **hay que elegir destino** —el encabezado de la lista, o la tarjeta vecina—; en el alta
     **no hay excusa**, porque «Nuevo dos agujas» sigue ahí. **Cómo se salda:** mover el foco
     explícitamente al cerrar por éxito. **No bloquea #22** bajo la moratoria: la acción se completa y la
     pantalla queda correcta.

184. **🟠 La vista previa de la foto se pinta VACÍA en el alta, y ahí no comunica nada.** En un proyecto
     nuevo, `ProjectPhoto` ocupa **≈135 px de alto** en lo alto del formulario **antes** del campo «Foto
     del proyecto», y lo único que muestra es el **tipo de tejido que acabás de elegir dos campos más
     arriba**. En un modal que ya necesita **313 px de scroll**, es el bloque que más espacio gasta sin
     decir nada. **Es la misma familia que la deuda 144 / E2 (g)** (*el hueco de la foto vacía era un vacío
     del 61% de la tarjeta*), que ya se resolvió una vez en la lista y **vuelve a aparecer en el
     formulario**. **Cómo se salda:** decisión de diseño —no pintarla hasta que haya foto, o encogerla a la
     altura de un marcador— y va a **RFC-03**.

### 📌 Lo que esta verificación enseñó sobre el MÉTODO

1. **`TaskStop` NO mata el `next dev`.** Mata el envoltorio de `pnpm` y **deja vivo al hijo**. El servidor
   que se "paró" ayer seguía escuchando en `:3000` **horas después**, y el arranque de hoy falló por eso.
   **Pararlo de verdad es matar el PID del puerto y VERIFICAR que quedó libre.** Es la misma familia que la
   sesión de 281 h.
2. **Dos falsos positivos MÍOS, cazados antes de reportarlos** —y esta vez el control funcionó a la
   primera—: (a) *"el cajón no tiene botones de editar/borrar"*, cuando lo que pasaba es que **medí antes
   de que el detalle resolviera** (el cajón **deriva** su estado, así que los botones llegan después); y
   (b) *"el botón de guardar queda fuera de pantalla"*, cuando había buscado **el contenedor de scroll
   equivocado** — el que scrollea es el propio `[role="dialog"]`, con **313 px** de recorrido, y al fondo
   Cancelar y Crear **son alcanzables**. **Ninguno de los dos era de la app.**
3. **El teclado sintético también miente, como `resize_window`.** Un `type` de 33 caracteres **no llegó al
   campo** (`value` quedó vacío) porque depende de la ventana en primer plano. **Comprobá el `value` real
   después de escribir.** Y el accidente pagó: el envío vacío **verificó gratis** que la validación en
   cliente pone `aria-invalid`, cablea `aria-describedby` y **manda el foco al campo inválido** (deuda 38).
4. **Verificar el borrado exigía borrar, y eso se PIDIÓ antes.** Se creó un proyecto de prueba por la UI y
   se borró: **saldo neto cero** y el proyecto del usuario intacto. Es la aplicación de lo que dejó escrito
   la ficha 171.

---

> **Reportadas por el USUARIO probando la app tras cerrar #22 (2026-08-26).** Tres cosas. **Una NO era de
> la app** y se explica abajo porque casi cuesta una cacería; las otras dos son las fichas **185** y
> **186**, y las cierra la enmienda **E7** de RFC-03.

### 📌 La que NO era de la app, y por poco se ficha como regresión de #22

El tab **Sesiones** daba *"Se soltó un punto"* en **todos** los proyectos. **Medido:**
`GET /api/projects/:id/sessions` → **404 con `text/html`** (no JSON, o sea **la ruta no se resolvía**), y
**lo mismo `…/yarns`**: fallaban **todas las subrutas anidadas bajo `[id]/`**, no sólo sesiones — el tab
**Lanas estaba roto igual** y nadie lo había tocado. El handler **existe y exporta `GET`**;
`projectNotFound()` devuelve **JSON**, así que el HTML no salía de ahí.

**Lo que lo resolvió sin tocar una línea:** `pnpm build` → **compila las nueve rutas**, `sessions`
incluida. **El código estaba sano: era la caché de Turbopack del servidor de desarrollo.** Con `.next`
borrada y el servidor reiniciado limpio: **`200 {"sessions":[]}`** y el tab funcionando.

> **REGLA 2, otra vez, y esta vez habría costado caro:** *antes de culpar a la app, descartá el entorno de
> medición*. Un `next dev` con caché sucia **imita perfectamente a una regresión**: mismo síntoma, mismo
> sitio, y aparece justo después de tocar el código. **El discriminador barato es el build**: si compila
> la ruta y dev no la sirve, no es tuyo. Emparenta con el `500` falso del `next dev` degradado y con
> [la ficha de `TaskStop`].

185. **🟠 El alta de proyecto está PARTIDA EN DOS: el Dashboard y `/proyectos` abren formularios
     distintos con el mismo título.** **Medido con los dos modales abiertos:** ambos se titulan *"Nuevo
     proyecto de dos agujas"*; el de `/proyectos` tiene **seis campos** (nombre, tipo, foto, meta, agujas,
     notas) y el del Dashboard **uno** (nombre). **Lo introdujo #22**, que estrenó `ProjectFormDialog` en
     `/proyectos` y dejó el `NewProjectDialog` viejo en el Dashboard. **Escenario de fallo:** el usuario
     crea desde el Dashboard, no ve dónde poner la foto ni la meta, y concluye que la app no las tiene.
     **Y la causa raíz es de método, no de código:** **la enmienda E6 definió "el" formulario de proyecto y
     no dijo nada del Dashboard**, así que nadie tenía el encargo de mirarlo. *Una enmienda que define el
     formulario de una entidad tiene que enumerar **todos** los sitios desde los que se crea.* La cierra
     **E7 (a)**.

186. **🟠 El cronómetro rápido no comunica su estado, no se ve y no se puede parar desde la lista.**
     Reportado por el usuario y **medido con una sesión abierta en el servidor** (`fin: null`): el botón de
     la tarjeta **vuelve a `▶` «Empezar a tejer»** —ofrece una acción que ya no corresponde—, la única
     marca es el texto **«Lo arrancaste recién»**, **no hay cronómetro visible** y **no hay forma de
     parar** sin abrir el cajón. **Dentro del cajón sí:** `00:55` corriendo y «Parar el cronómetro».
     **La información y el control existen, bien hechos, y están encerrados.**
     **El backend NO tiene la culpa y está protegido:** al pulsar otra vez **no duplicó nada** —respondió
     *"ya tenía el cronómetro en marcha"*— y siguió habiendo **una sola sesión**; la invariante escrita en
     `start-session.ts` es *"como mucho una sesión abierta **por proyecto**"*, así que **puede haber varios
     cronómetros a la vez** en proyectos distintos.
     **La causa de fondo es una decisión vieja, y estaba documentada:** `ProjectsView.tsx:130-138` ya decía
     que *"**no hay forma de saber desde la lista si el cronómetro corre** —ni columna, ni filtro, ni
     endpoint— … la marca **se pierde al recargar**"*, por E1(e) y por **E2.2 de RFC-02**, que descartó
     abrir el backend. **Por eso la copia es deliberadamente efímera.** La consecuencia sólo se ve usando
     la app: **tras un F5, el botón dice «Empezar» con el cronómetro corriendo**.
     **Cómo se salda (E7 b, decisión del usuario):** el dato viene del servidor —**`GET /api/projects`
     incluye la sesión abierta de cada proyecto**, lo que **deroga en parte E2.2**—, el **botón se
     TRANSFORMA** en vez de añadirse otro (dos botones serían la **deuda 142** otra vez), el tiempo se ve
     en la tarjeta, y la copia efímera desaparece.

---

> **Abiertas durante la implementación de E7** (2026-08-26). Ninguna de las dos interrumpe: son
> consecuencias conocidas del alcance de la enmienda, no defectos de lo que entrega.

187. **🟡 Las tarjetas del Dashboard no enseñan el cronómetro que sí enseña `/proyectos`.** El panel
     "Proyectos en curso" monta la **misma** `ProjectCard` pero **sin la prop `timer`**, así que un
     proyecto con el cronómetro corriendo se ve **con reloj en `/proyectos` y sin nada en el inicio**.
     **No es un descuido:** E7 (b) habla de la tarjeta de la lista, y el Dashboard sostiene desde #19 la
     invariante de la **deuda 132** —*sin `timer`, cero controles*—, que se decidió conservar en vez de
     romperla de paso. **Lo que cuesta saldarla** es una decisión de producto, no de código: si la tarjeta
     del inicio ofrece parar, el Dashboard necesita su propia región de aviso y su propio manejo de error;
     si sólo enseña el reloj sin control, hay que decidir si un reloj sin botón al lado se lee como
     interactivo. **Escenario donde se ve:** cronómetro en marcha → el inicio no lo dice.

188. **🟡 El tiempo tejido de la tarjeta se queda viejo si el cronómetro se para DESDE EL CAJÓN.** Parar
     devuelve el `time` del proyecto ya recalculado; **parando desde la tarjeta se aplica** (E7 lo cablea),
     pero parando desde el cajón ese número se queda **sólo dentro del cajón** —`onTimeChange` alimenta
     `applyProject`, que es estado del propio cajón—, así que al cerrarlo la tarjeta sigue enseñando el
     total de antes de la sesión. **Es anterior a E7** (el camino de vuelta del `time` nunca existió) y E7
     lo deja a medias a propósito: lo que sí se cableó de vuelta es **el estado del cronómetro**, porque
     ése es el que hacía **mentir al botón**. El total viejo es una cifra desactualizada, no una acción
     imposible. Se salda pasando el `time` por el mismo camino que ya usa `onRunningChange`.

---

> **De la verificación en navegador (REGLA 4) del lote E7, 2026-08-26.** El lote se cierra **APROBADO**
> —con un rechazo intermedio bien puesto, ver abajo—. De los **diez puntos** que dejó el reviewer se
> verificaron **nueve**. Ocho salieron bien. Lo de aquí son las **tres fichas** que quedan, y la **189 es
> de ENTORNO, no de la app**: merece leerse antes que ninguna, porque ya costó dos cacerías en un día.

189. **🟠 DE ENTORNO, NO DE LA APP: el `next dev` de Next 16 / Turbopack NO SIRVE rutas anidadas que el
     build SÍ compila.** **Dos veces en la misma sesión**, y las dos imitaron perfectamente a un defecto
     recién introducido:
     | # | Síntoma | Alcance medido | Qué lo resolvió |
     |---|---|---|---|
     | 1ª | El tab **Sesiones** daba *"Se soltó un punto"* en todos los proyectos | `GET …/sessions` **y** `…/yarns` → **404 `text/html`** (todas las subrutas bajo `[id]/`); `GET /api/projects/:id` → 200 | borrar `.next` + reiniciar → **200 `{"sessions":[]}`** |
     | 2ª | El cronómetro no arrancaba desde la tarjeta | `POST …/sessions/start` → **404 `text/html`**, pero `GET …/sessions` → **200** (falla el nivel 4, no el 3) | **verificar contra `pnpm start`** → **201 `application/json`** |
     **El discriminador barato, y hay que usarlo SIEMPRE antes de investigar código:** `pnpm build`
     **lista las rutas**. Si el build compila `/api/projects/[id]/sessions/start` y dev responde 404, **el
     código está sano**. Confirmado las dos veces.
     **Por qué es 🟠 y no ⚪:** no rompe producción, pero **hace perder horas y empuja a fichar regresiones
     inexistentes**. La primera vez estuvo a un paso de abrirse como *"#22 rompió las sesiones"*.
     **Escenario de fallo:** un agente —o el usuario— toca una feature, ve 404 en la zona que acaba de
     tocar, y sale a cazar un fantasma. **Cómo se salda:** dejarlo escrito en el arnés (hecho aquí y en
     `progress/current.md`), y **si reincide, evaluar el `next dev` sin Turbopack**. Emparenta con el `500`
     falso del `next dev` degradado y con la ficha de `TaskStop`.

190. **⚪ El punto 10 de la lista del reviewer NO SE PUDO VERIFICAR: lector de pantalla real.** Falta
     comprobar con **NVDA o VoiceOver** que una tarjeta con el cronómetro corriendo **anuncia el estado y
     los minutos y NO recita segundos**. **Lo que SÍ está medido** y lo hace probable: el texto accesible
     de la tarjeta dice *"Cronómetro en marcha: 3 min"* —**minutos**, conforme a **E4 (a)**— y la etiqueta
     del botón cambia a *"Parar el cronómetro de …"*. **Pero eso es leer el DOM, no oír el lector**, y este
     arnés **no tiene ninguno**. Se declara en vez de darse por bueno. Cae natural en la primera sesión que
     tenga un lector a mano.

191. **🟡 DATO SUCIO EN LA BASE DEL USUARIO: una tarjeta marca `281 h 25 min` de tiempo tejido.** Visto en
     pantalla el 2026-08-26. **No lo produjo ningún lote**: es el **cronómetro que se dejó corriendo en la
     verificación de #20** y nunca se paró —el mismo que originó la regla de método *"si arrancás un
     cronómetro para probar, PARALO"*—. La sesión se cerró sola después, cargando las horas transcurridas.
     **Escenario de fallo:** el usuario mira su tarjeta y lee que tejió **once días y medio seguidos**; el
     dato es falso y contamina cualquier métrica de tiempo del Dashboard. **Es 🟡 y no 🟠 porque no rompe
     nada y sólo afecta a un proyecto de pruebas**, pero **es del usuario y hay que preguntarle antes de
     tocarlo**: corregir el `duration` de esa sesión escribe en sus datos. **Cómo se salda:** decidir con
     él si se corrige la sesión o se borra el proyecto de pruebas.

### 📌 Lo que este lote enseñó sobre el MÉTODO

1. **Un test ausente sobre código CORRECTO es una trampa con retardo, y merece rechazo.** El reviewer
   probó **diez garantías por mutación**: nueve murieron, **una sobrevivió** —`handleSaved` conserva
   `activeSession`, `ProjectsView.tsx:459`: forzarlo a `null` dejaba **66/66 en verde**—. El código estaba
   **bien**; lo que faltaba era la red que lo sostuviera. Y el sitio era el peor posible: **por ahí volvía
   a entrar la deuda 186 desde el modal de edición** (editás con el cronómetro corriendo y la tarjeta se
   olvida). Se cerró con **un test, cero líneas de producción**, y el reviewer **repitió la mutación él
   mismo** y comprobó además que **el test no es vacuo** (bajo mutación el DOM ya tiene el nombre nuevo, o
   sea que falla **por la sesión perdida** y no de rebote).
2. **`pnpm build` es el discriminador de fantasmas.** Ver la **189**. Dos veces salvó de fichar una
   regresión que no existía.
3. **Un falso positivo del leader, cazado antes de reportarlo.** *"El aviso hace saltar la rejilla"* — el
   documento crecía **63 px**, pero midiendo el `top` de la rejilla con y sin aviso: **0 px de salto**. Los
   63 px eran **el reloj nuevo dentro de la tarjeta**. Medir la consecuencia, no el síntoma.
4. **Verificar contra el build de producción es una vía legítima cuando dev falla**, y hay que decir que se
   hizo así. El `201 application/json` del arranque **se midió en `pnpm start`**, no en dev.

192. ~~**🟠 La tarjeta de `/lanas` tiene un control que no hace nada.**~~ **SALDADA** (2026-09-20,
     rebanada S1 `yarn-detail-drawer` de #24).
     **Cómo se saldó:** el `noOpTap` desapareció. `YarnCard` recibe ahora un `onOpen` que
     `YarnsView` cablea a un `detailId`, y ese id resuelve la lana contra la lista viva
     (`find(id) ?? null`) para alimentar el `YarnDetailDrawer`. Tocar una tarjeta abre el cajón
     con los datos de esa lana — el control que ya era real y alcanzable por teclado ahora
     además lleva a algún lado, que era exactamente lo que faltaba.
     **Dónde quedó la prueba:** el commit de S1; `YarnCard.test.tsx` (el tap llama a `onOpen`,
     reemplazando la vieja aserción de no-op), `YarnsView.test.tsx` (abre el cajón y conserva
     `marca · tipo · colorName` tras un cambio del stepper) y `YarnDetailDrawer.test.tsx`.
     **Ficha original:** `YarnCard` (#23, slice S3
     `list-cards-states`) monta un tap alcanzable por teclado y con nombre accesible, pero su manejador es
     un no-op documentado (`YarnCard.tsx`, función `noOpTap`). **Escenario de fallo:** un usuario toca o
     activa una tarjeta esperando ver el detalle de esa lana —igual que ya puede hacerlo en `/proyectos`
     desde #21— y no pasa nada visible: ni navega, ni abre un cajón, ni cambia ningún dato en pantalla. No
     es un defecto de esta slice: el cajón de detalle con el stepper de `usedQuantity` y el panel de
     gestión de marcas/tipos es la **entrada 24** (`yarns_detail_catalogs_ui`, RFC-04 §2), que todavía no
     existe. **Cómo se salda:** cuando entre la 24, el mismo control pasa de `noOpTap` a abrir el cajón —el
     control ya es real y ya es accesible, sólo falta cablearlo—.

193. **🟠 El estado vacío de `/lanas` es un callejón sin salida: dice que no tenés lanas y no ofrece
     ninguna forma de agregar una.** `RFC-04 §4` especifica el vacío como *"Sin lanas en el stash
     todavía"* **+ "Agregar lana"**, y la slice S3 de #23 montó sólo la primera mitad
     (`YarnsView.tsx`, `<EmptyState title={EMPTY_TITLE} />`, sin `action`). **Esto no es una
     limitación del primitivo:** `EmptyState` ya tiene el slot `action` y su propio comentario dice
     que "quien lo monta decide si ofrece 'Crear proyecto', dos botones de creación (RFC-02 §4) o
     nada". Lo que falta es el destino. **Escenario de fallo:** un usuario nuevo —con el stash vacío,
     que es el estado de arranque de cualquiera— entra a `/lanas`, lee que no tiene lanas, y la
     pantalla no le da ni un botón, ni un enlace, ni una pista de por dónde cargar la primera. La
     única salida es volver a navegar a otra sección. Es **más visible que la deuda 192**: ahí al
     menos hay tarjetas alrededor del control muerto; acá la página entera no ofrece nada.
     **Por qué se aceptó igual:** el modal de crear/editar lana es la **entrada 25**
     (`yarns_form_ui`, RFC-04 §2), que todavía no existe, así que el botón no tendría a dónde abrir.
     **Cómo se salda:** cuando entre la 25, pasarle el botón "Agregar lana" al slot `action` que ya
     está ahí. No se salda con la 24 (el cajón de detalle) — esa no crea lanas.
     **Fichada por:** el gate del orquestador al cerrar S3; el ejecutor la declaró como desviación en
     su informe pero no la fichó, y una desviación que sólo vive en un informe no es una deuda.
     **BLOQUEADA, comprobado el 2026-09-18** al intentar saldarla junto con la 194 y la 195: no existe
     **ni un solo `POST /api/yarns`** en toda la UI (`src/features/*/ui/` sólo hace `GET`). No es que
     falte cablear un botón: **no hay nada a lo que cablearlo**. Poner uno que no abra nada repetiría
     exactamente la deuda 192. Se salda con la entrada 25 y con ninguna otra.

194. ~~**🟠 El stock de la tarjeta de `/lanas` es un número pelado: dice "3" y no dice tres de qué.**~~
     **SALDADA** (2026-09-18, mismo día que se fichó).
     **Cómo se saldó:** el stock se renderiza con su unidad — `stockLabel()` en
     `src/features/yarns/ui/yarn-copy.ts` devuelve "3 ovillos", "1 ovillo", "0 ovillos".
     La unidad es **ovillos** porque el PRD-01 §4.5 lo dice literal: `quantity` es *"stock en
     OVILLOS"*. Va como **texto visible** y no como etiqueta oculta a propósito: el problema no
     era sólo de lectores de pantalla, el número suelto tampoco decía nada a quien mira.
     **Dónde quedó la prueba:** `YarnCard.test.tsx`, tres tests nuevos — la unidad presente, la
     concordancia en singular y en cero, y que el **nombre accesible del botón termine en el
     stock identificado** (`toHaveAccessibleName(/3 ovillos$/)`). Ese último es el que faltaba:
     el test viejo afirmaba `getByText("3")`, o sea sobre el VALOR, no sobre si el valor estaba
     identificado — por eso el agujero pasó todos los gates.
     **Ficha original:**
     `YarnCard.tsx` renderiza `{yarn.quantity}` sin etiqueta, sin unidad y sin texto para lector de
     pantalla. **Escenario de fallo:** un usuario ve bajo el nombre de la lana un "3" suelto en
     monoespaciada y no puede saber si son ovillos, gramos, metros o vueltas — y cuando vuelva a la
     misma pantalla dentro de una semana, tampoco. En lector de pantalla es peor: el nombre accesible
     del botón de la tarjeta termina en *"…Multicolor, 3"*, sin nada que lo califique.
     **Verificado en navegador el 2026-09-18** con 13 lanas de prueba: el `<span>` del stock no tiene
     `aria-label`, ni texto oculto, ni nodo hermano que lo etiquete. `RFC-04 §2` pide *"stock
     (`quantity`)"*: el valor está, la palabra que lo identifica no está en ningún lado.
     **Cómo se salda:** etiquetarlo en la tarjeta (unidad visible, o texto sólo para lectores), sin
     esperar a la entrada 24 — no depende del cajón de detalle.
     **Fichada por:** el gate del orquestador en la verificación de navegador de S3 (REGLA 4). Ningún
     test lo detectó porque todos afirman sobre el valor, no sobre si el valor está identificado.

195. ~~**⚪ El gate de clases compiladas ya dio forma al código de producción dos veces en la misma
     feature.**~~ **SALDADA** (2026-09-18) — y el defecto estaba en el barrido, no en el código.
     **La causa raíz:** `class-names-from-source.ts` nombraba el motivo de un atributo sin
     resolver por el **alias local** (`swatchClass`) mientras registraba la dependencia por la
     **función** (`yarnSwatchClass`). Los tests exigían que esos dos conjuntos fueran
     **idénticos**, cosa imposible en cuanto hay una llamada de por medio. Por eso había que
     contorsionar el fuente hasta que ambos nombraran lo mismo.
     **Cómo se saldó, tres cambios:**
     1. El motivo ahora **se sigue hasta su causa**: un alias local se resuelve hasta la función
        externa de la que depende, con guarda de ciclo. Es además lo que el propio comentario
        del barrido decía querer (*"que el rojo diga QUÉ hay que decidir"*) — un alias decía
        dónde se usaba, no de qué dependía.
     2. El barrido **ya entiende el acceso a propiedad** (`yarn.colorFamily`, `styles.card`):
        denuncia la raíz en vez de caer en `unhandled`. Agujero preexistente que este trabajo
        destapó: una clase en `styles.algo` se colaba sin comprobar.
     3. La afirmación sobre los motivos pasó de **igualdad** a **pertenencia**. `external`
        SIGUE comparándose exacto —esa es la garantía que importa: una fuente nueva pone el
        gate en rojo— pero los motivos sólo tienen que estar aprobados. Los dos conjuntos miden
        cosas distintas y exigirles igualdad era el error.
     **Efecto en el código:** `YarnCard.tsx` recupera `const swatchClass = yarnSwatchClass(...)`
     en vez del objeto literal desestructurado. `YarnColorSwatch` en `YarnsTab.tsx` **se queda**,
     porque componer dos sitios de uso es mérito propio, pero su comentario ya no miente sobre
     por qué existe.
     **Dónde quedó la prueba:** los 5 gates de clases del repo en verde (77 tests) —
     `yarns`, `projects`, `dashboard`, `app-shell`, `bottom-nav`.
     **Ficha original:**
     feature.** En S2 obligó a crear `YarnColorSwatch` en `YarnsTab.tsx`; en S3 obligó a esto en
     `YarnCard.tsx`: `const { value: swatchClass } = { value: yarnSwatchClass(yarn.colorFamily) };`
     — envolver una llamada en un objeto literal para desestructurarla acto seguido, cuyo único
     propósito es que el resolvedor vea un identificador plano en vez de una llamada externa.
     **Escenario:** quien lea ese archivo sin conocer el gate va a leer una línea sin sentido
     aparente, y o la "simplifica" —rompiendo el gate— o la copia por imitación a la próxima tarjeta.
     La cobertura NO está en riesgo hoy (`yarn-swatch.classes.test.ts` verifica la salida compilada
     de las 13 familias, que es más fuerte que el barrido de AST). Lo que está en riesgo es la
     legibilidad.
     **Es la deuda 142 otra vez, un escalón más abajo:** allá un gate dictó la *interfaz*; acá dicta
     la *forma del código*. Dos veces seguidas ya no es un incidente, es un patrón.
     **Bajo la moratoria NO se abre:** ningún usuario ve esto, sólo lo ve un agente editando código.
     Se ficha y espera. **Cómo se saldaría:** enseñarle al resolvedor a seguir una función importada,
     o aceptar explícitamente que ciertas clases se verifican por salida compilada y sacarlas del
     barrido sin contorsionar el fuente.

196. ~~**🔴 El panel de filtro de `/lanas` era invisible: el árbol marca→tipo existía en el DOM y no se
     veía nada.**~~ **SALDADA en el mismo pase** (2026-09-19).
     **Cómo se encontró:** mirando la pantalla. Ningún test podía: los componentes estaban montados,
     los nombres accesibles eran correctos, y **`axe` no gatea contraste** (`color-contrast` sale
     `incomplete` y `vitest-axe` sólo mira `violations`).
     **La causa, medida:** `YarnFilterPanel` se montaba como un `<div>` pelado sobre el fondo de la
     página. Ahí **`--fg` y `--bg` son el mismo color** (`#33241a` los dos): contraste **1.00**.
     «Todas las marcas», «QA Drops» y «QA Malabrigo» se pintaban en el color exacto del fondo.
     **Escenario de fallo:** un usuario abría `/lanas` y no veía ningún filtro por marca — sólo un
     puntito rosa suelto (el radio, que sí tiene color propio) flotando sobre el fondo. No podía
     filtrar por marca ni por tipo: la mitad de la entrada 23 era inalcanzable.
     **Lo peor:** RFC-03 **E2(b)** ya lo había medido y escrito, literal — *"`text-fg` y `--bg` son el
     mismo color (1.00:1), así que un `Field` suelto sobre el fondo no es «poco legible»: es
     **invisible**"*— y la tarea 4.3 de S4a había añadido un test que **obliga** al `<summary>` a usar
     `text-fg` y nunca `text-fg-inverse`. Correcto sobre una superficie elevada; catastrófico sobre el
     fondo. **El test fijó el fallo en su sitio.**
     **Cómo se saldó:** el panel entero pasa a vivir sobre un `Card`, que es la misma decisión que
     E2(b) tomó para el toolbar de `/proyectos` (`ProjectsToolbar.tsx:118`). `Card` declara fondo y
     primer plano juntos (deuda 32), así que la superficie arrastra su propio contraste.
     **Dónde quedó la prueba:** `YarnFilterPanel.test.tsx` afirma que la raíz lleva las clases de
     superficie, **derivadas de `cardVariants()`** y no de literales, para que el test siga midiendo la
     misma propiedad si mañana cambian las clases.

197. ~~**🟠 El desplegable de marca no avisaba de que se desplegaba: ningún triangulito, ninguna
     pista.**~~ **SALDADA en el mismo pase** (2026-09-19).
     **La causa:** el `<summary>` del primitivo `Disclosure` lleva `inline-flex`, y eso **anula el
     `display: list-item`** del que depende el marcador nativo. El estilo declaraba
     `list-style-type: disclosure-open`, pero **no se dibujaba nunca** — una regla muerta que parecía
     viva. El `gap-(--space-2)` del mismo estilo delata que alguien esperaba un icono ahí.
     **Escenario de fallo:** «QA Drops» se veía como una etiqueta en negrita cualquiera. Nada decía
     que se podía abrir para elegir un tipo, así que el nivel de tipo del árbol quedaba escondido
     detrás de un clic que a nadie se le ocurre dar.
     **Cómo se saldó:** el primitivo dibuja su propio marcador (`data-slot="disclosure-marker"`),
     `aria-hidden` porque el estado abierto/cerrado ya lo anuncia el `<details>` nativo, y rota al
     abrirse respetando `prefers-reduced-motion`.
     **Dónde quedó la prueba:** `Disclosure.test.tsx` — el marcador existe y es `aria-hidden`.

198. **⚪ La semántica AND de los filtros está probada contra el DOBLE, no contra la consulta real.**
     Al cerrar los huecos que encontró la verificación de #23 se añadieron tests que demuestran que
     `?brandId=&typeId=&colorFamily=` combinan con AND y no con OR — pero los tres corren contra
     `src/features/yarns/api/testing/in-memory-store.ts`, porque este repo **no tiene arnés de DB viva
     ni doble de SQL** para consultas `select`/`where` (el `store.test.ts` real sólo finge
     `insert`/`update`, y sirve para traducir códigos de error de Postgres).
     **Escenario:** si alguien cambiara `and(...conditions)` por `or(...conditions)` en
     `src/features/yarns/api/store.ts:258`, los tests seguirían en **verde** y la lista devolvería de
     más. La corrección del doble no prueba la corrección de la consulta; prueba que el doble y la
     consulta *fueron escritos con la misma intención*.
     **Por qué se acepta igual:** el `design.md` de este cambio designa explícitamente el doble en
     memoria como la capa de prueba de `YarnStore`, así que esto es el límite conocido de una decisión
     de arquitectura, no un olvido. Hoy la consulta real está verificada **por lectura** — `and(...)`
     está donde tiene que estar — y eso es más débil que un test, y así queda dicho.
     **Bajo la moratoria NO se abre:** ningún usuario ve esto. **Cómo se saldaría:** un doble de SQL o
     un arnés de DB de test que permita ejercitar `where` de verdad; alcanza con que cubra esta forma
     de consulta, no hace falta uno general.

199. **🟠 El botón «Editar» del cajón de detalle de una lana no hace nada.** `YarnDetailDrawer` (#24,
     rebanada S1) monta un botón «Editar» real, enfocable y activable por teclado, cuyo manejador es un
     no-op documentado. **Escenario de fallo:** un usuario abre el detalle de una lana, ve «Editar»,
     lo pulsa esperando corregir el color o la ficha técnica, y no pasa nada visible: ni se abre un
     modal, ni cambia la pantalla, ni aparece un aviso. **No es un defecto de esta rebanada:** el modal
     de crear/editar lana es la entrada **25** (`yarns_form_ui`, RFC-04 §2), que todavía no existe.
     **Por qué se monta igual:** es el criterio que el usuario ya fijó para el tap de la tarjeta
     (deuda 192) y que RFC-03 E1(f) había establecido antes — un control real desde el día uno, nunca
     un `div` decorado esperando, para que la entrega siguiente sólo tenga que cablearlo.
     **Cómo se salda:** cuando entre la 25, el mismo botón pasa de su no-op a abrir el modal.
     Registrado también como RFC-04 §7-ter, enmienda **E2(b)**.

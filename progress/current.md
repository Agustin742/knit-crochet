# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **✅ CERRADA — 4ª+5ª RONDA de #13 `ui_shell_nav` (CORRECCIÓN, sigue `done`).** **REVIEWER: APROBADO**
  (`progress/reports/review_archive_nav_fichero_r4.md`) — la **primera review independiente que ve este
  componente en 5 vueltas**; el reviewer corrió `init.sh` él mismo (exit 0, **420 passed | 6 skipped**) y
  verificó los 10 invariantes de D4 uno por uno. 7 hallazgos, **ninguno bloqueante**, todos registrados como
  deuda abajo (21-27). Informe de cierre del leader:
  **`progress/informs/8.informe-archive_nav_e8_e10.md`**.
  Cerrado también por el leader al aprobar: el **texto del invariante 3 del RFC** (decía "94px, entra con
  holgura"; ahora dice 6 ranuras / 5 cantos / 104 exactos / holgura cero) y el **aviso de truncado** en la
  cabecera de `review_archive_nav_fichero_r3.md`.

- **Detalle de la 4ª ronda — #13 `ui_shell_nav` (CORRECCIÓN, sigue `done`).** El usuario reportó 3 defectos
  nuevos ANTES de relanzar el reviewer de la 3ª ronda. Los tres quedaron **medidos en el navegador** por el
  leader (MCP de Chrome, viewport 1536px) y **escritos como enmiendas E8/E9/E10 en RFC-01 §3**:
  - **E8** — hover **y clic** solo en la pestaña; el canto full-bleed pasa a decoración inerte. Causa: el
    `group` estaba en la hoja entera (1536×10px), así que el puntero la activaba desde cualquier x.
  - **E9** — la pestaña se despega al hacer hover. Causa medida: en reposo tapa su propio canto (pestaña
    60–104, canto 94–104); al subir los 8px destapa el filo claro de 1px del canto, que aparece como una
    raya justo debajo y la deja "flotando suelta".
  - **E10 (deroga E1)** — **5 cantos, no 6**: la hoja activa no dibuja canto y **baja al fondo**, apoyada en
    el contenido, que pasa a ser su cara. La **x de cada pestaña queda fija por índice de lista**; sólo
    cambia el orden vertical. Verificado que no había una 7ª caja: hay 6 barras opacas, el sobrante es el
    contenido mismo.
  **Estado: EN CURSO (implementer).** El reviewer de la 3ª ronda **no corre hasta cerrar esto** (revisaría
  código que ya cambió).
  **Feature en curso: #13 `ui_shell_nav` — enmiendas E8/E9/E10 del `ArchiveNav` (la feature sigue `done`;
  `feature_list.json` NO se toca).**
  Plan:
  1. **E8**: el `<a>` deja de ser la hoja y pasa a ser **la pestaña**. La hoja se vuelve un `div` inerte
     (`pointer-events` bloqueados), sin `group`; hover y foco cuelgan de la propia pestaña.
  2. **E9**: el lift deja de ser un `translate` y pasa a ser **crecimiento de alto con la base anclada**
     (token nuevo `--nav-tab-height-lifted`): por construcción la pestaña nunca destapa nada.
  3. **E10**: la hoja activa no dibuja canto (`h-0`, sin `sheet`) y baja al fondo del cajón (`order-first`
     dentro del `flex-col-reverse`); la profundidad se calcula por posición en el stack y la **columna** por
     índice de lista.
  4. Tests: reescribir los que fijaban E1 (hojas idénticas / orden estable) y añadir los tres nuevos gates
     (canto inerte, 5 cantos + activa al fondo, columna estable entre rutas). Actualizar el presupuesto
     vertical en `archive-nav.tokens.test.ts`.
  5. Verificar `bash ./init.sh` + `pnpm build`.
  **VALIDACIÓN VISUAL DEL LEADER (navegador, 1536px) — hecha.** E8 ✓ (`elementFromPoint` en 5 puntos de
  franja vacía no encuentra nada interactivo; hover sobre franja vacía no levanta ninguna pestaña). E9 ✓
  (la pestaña crece 44→52 con la base clavada en 104 — el carril pasa de 60–104 a 52–104 — sin destapar
  arista ni hueco, ni en la hoja abierta ni en una con canto). E10 ✓ (5 cantos, Dashboard abierta sin canto,
  `aria-current` en su pestaña, rampa [1..6]). **NO verificable en navegador:** la estabilidad de columna
  entre rutas — `/stash` es privada y el proxy redirige a `/login`, así que sólo se ve `/` sin sesión.
  Verificado en código: `navTabColumn(index)` recibe sólo el índice de la lista, no la ruta.
  **⏳ AJUSTE EN CURSO (5ª vuelta, encargado al mismo implementer):** la hoja abierta llevaba `h-0`, así que
  no ocupaba ranura y su pestaña quedaba **al mismo nivel** que la del canto más bajo (Dashboard y Proyectos
  ambas en y 60–104): la escalera arrancaba plana. Corrección pedida por el usuario — **no baja Dashboard,
  suben los 5 cantos**: la hoja abierta conserva su ranura de 10px y sólo deja de pintar la cara del canto.
  Consume los 10px de holgura y devuelve el presupuesto a 6×10+44 = 104 exactos. **El reviewer corre
  después de esto.**
  6. **Ajuste posterior a la validación visual del leader:** la hoja abierta **conserva su ranura de
     `--nav-leaf-height`** y pierde sólo la cara del canto (con alto cero, su pestaña y la del canto más
     bajo caían al mismo nivel y la escalera arrancaba plana). Siguen siendo **5 cantos dibujados sobre 6
     ranuras**; el presupuesto vertical vuelve a 6 × 10 + 44 = 104 exactos (desaparecen los 10px de holgura
     y la partición nominal/degenerado del test) y E7 queda con gate propio.
  **VALIDACIÓN VISUAL DEL LEADER DEL AJUSTE (navegador, 1536px) — hecha y verde.** Geometría idéntica a la
  tabla objetivo: 5 cantos pintados sobre 6 ranuras; bases de pestaña en 104/94/84/74/64/54 (escalera
  monótona, Dashboard ya no comparte nivel con Proyectos); Dashboard `OPEN` con ranura 94–104 y sin canto;
  columnas 1..6 y profundidades 1..6. **E8** re-confirmado (franja vacía → `nav`, las 6 pestañas siguen en
  44px). **E9** re-confirmado (Proyectos crece a 52px con la base clavada en 94). **E7** confirmado
  empíricamente: la pestaña de la ranura 2 levantada llega a y=42 contra el wordmark en y=34.4 →
  **7.6px de margen, sin solape**, el número que declaró el implementer.
  **⚠️ INCIDENTE OPERATIVO (no es un bug del código):** al relanzar el dev server, `/` devolvía **404**
  desde el application-code con el árbol de rutas intacto, `pnpm build` OK y 420 tests verdes. Era **caché
  de Turbopack corrupta** por el corte del server anterior. Se arregló con `.next` borrado + relanzar. Si
  vuelve a pasar, no busques una regresión: limpiá `.next` primero. (De paso quedó visto que **la única
  página del router hoy es `/`** — `src/app/(app)/page.tsx`; el resto de rutas del nav todavía no existen,
  así que en el navegador sólo se puede validar `/`.)
  **Estado: implementada, lista para review.** `bash ./init.sh` VERDE: **420 passed | 6 skipped**
  (+9 sobre 411: +8 en `layout.test.tsx` —E8 ×3, E9 ×1, E10 ×5, absorbiendo el test viejo del carril— y
  +1 en `archive-nav.tokens.test.ts` —gate nuevo de la pestaña de la columna 1 contra el wordmark, con el
  presupuesto vertical reunificado en un solo test). `pnpm build` OK.
  Informe: `progress/reports/impl_archive_nav_e8_e10.md`.

- **Tarea previa: #13 `ui_shell_nav` (CORRECCIÓN, sigue `done` — no se toca `feature_list.json`)** —
  reescritura del `ArchiveNav` al **modelo fichero** (RFC-01 §3 **D4**).
  Plan:
  1. Tokens: retirar los del modelo de fila (tonos, solape, elevación, alturas de cuerpo, sombras
     de carpeta) y declarar los del fichero (alto de canto, alto/hueco de hover, cara de la hoja,
     filo superior, sombra hacia arriba, rampa de profundidad, reserva de los utils).
  2. `archive-nav.variants.ts`: hoja (caja fija, profundidad por índice), superficie que adelgaza y
     se despega en hover, pestaña con su columna en la rampa.
  3. `ArchiveNav.tsx`: banda superior (wordmark izq. + utils der.) + stack vertical full-bleed de 6
     hojas con la pestaña colgando del canto.
  4. Tests: preservar comportamiento/a11y; añadir orden del DOM y un test de **tokens** que mide de
     verdad el contraste de las tres pistas de profundidad sobre el fondo oscuro.
  5. Verificar `bash ./init.sh` + `pnpm build` + `globals-css.test.ts`.
  **Estado: implementada, lista para review.** Informe: `progress/reports/impl_archive_nav_fichero.md`.

- **⚠️ TAREA ABIERTA — 3ª ronda del `ArchiveNav`, SIN REVIEW INDEPENDIENTE.** El usuario reportó 5
  defectos visuales; el implementer los arregló (enmiendas **E4-E7** de D4 + invariantes 8/8-bis
  reescritos). **El reviewer NO llegó a correr: murió dos veces por el límite de gasto mensual de la
  cuenta** (error de infraestructura, no del código). La verificación que existe es del **leader**, no
  independiente: `init.sh` **411 passed | 6 skipped**, `pnpm build` OK, guardrails intactos por mtime,
  gates de nav complementarios sin ventana muerta, y validación en navegador de las 5 quejas + del ancho
  de nacimiento (1180px: cero recortes, cero solapes). **Falta el paso de `reviewer` del arnés antes de
  dar esto por cerrado.** Encargo listo para relanzar en `review_archive_nav_fichero_r3.md` (ver el
  prompt en la sesión). Dos juicios pendientes que quería del reviewer: (a) si mantener `user`/`onLogout`
  en la firma, ignoradas y documentadas para #31, es aceptable o es una API que miente; (b) si la
  constante de avance tipográfico del test de garantía (estimación, no métrica real de la fuente) es
  base suficiente — empíricamente resultó conservadora: 165px reales contra 167.5px asumidos.
- **DECISIÓN PENDIENTE DEL USUARIO:** tamaño de etiqueta del archivero. Quedó en **18px**; el usuario
  había pedido "cerca de la referencia" (36px). El tamaño **determina el ancho al que nace el archivero**
  (11px→~700px, 18px→1180px, 24px→~1344px, 32px→~1750px), y a 24px desaparecería de los portátiles de
  1280-1366px. Es una palanca de dos tokens que un test obliga a mover juntos.
- **Tarea anterior — CERRADA (corrección, NO es una feature nueva):** **#13 `ui_shell_nav`** → el
  `ArchiveNav` pasó de una fila de pestañas solapadas al **modelo fichero** (stack vertical de hojas
  full-bleed). **#13 sigue `done`, no se reabrió.** Causa raíz: `SDD-01` §0 admite que la referencia del
  archivero *"no respondió al fetch"* y se reconstruyó **de capturas** — nadie había visto su CSS. Se
  abrió en vivo con el MCP de Chrome y se midió. Contrato en **RFC-01 §3 D4** + enmiendas **E1/E2/E3**.
  `template/template-src.html` **no se tocó** por decisión del usuario: **template y `src/` ya no
  coinciden, y para `src/` manda D4.** `init.sh` **408 passed | 6 skipped** (+23 sobre 385, ninguno
  eliminado), `pnpm build` OK, validación visual del leader hecha. Informe:
  `progress/informs/7.informe-archive_nav_fichero.md`.
- **Tarea anterior (refactor mecánico, NO es una feature de `feature_list.json`):** migración a la
  **sintaxis canónica de variables de Tailwind v4** (`p-[var(--x)]` → `p-(--x)`) en todo `src/**`.
  Plan:
  1. Barrido propio de `src/**` + compilación del CSS **antes** de tocar nada (baseline).
  2. Probar cada par (viejo → canónico) aislado con `@source inline` y descartar los no equivalentes.
  3. Aplicar las conversiones archivo por archivo; actualizar los asserts de clases literales en tests.
  4. Guardrail nuevo: test por glob sobre `src/**` que falla si reaparece `<util>-[var(--x)]` simple.
  5. Verificar: CSS antes/después equivalente + `bash ./init.sh` + `pnpm build`.
  **Estado: implementada, lista para review.** 60 conversiones en 12 archivos; 9 excepciones
  documentadas (compuestos, `calc()`, `filter:drop-shadow(...)`); guardrail nuevo
  `src/shared/ui/canonical-tailwind-classes.test.ts` (barrido por glob de `src/**`, 17 tests).
  `bash ./init.sh` VERDE: **385 passed | 6 skipped** (+17 = los del guardrail). `pnpm build` OK.
  CSS antes/después **equivalente**: mismas 204 declaraciones; la capa de utilidades pasa de 168 a
  166 reglas sólo por desduplicar la incoherencia de z-index (misma declaración escrita de dos
  formas). Informe: `progress/reports/impl_canonical_tailwind_syntax.md`.
- **Feature anterior:** corrección de **#14 `ascii_yarn`** (sigue `done`, no se cambia su estado) — **port
  fiel de `template/ascii-yarn.js`** al motor de `src/shared/ui/three/ascii-yarn/` (RFC-01 §3 **D2-bis**).
  Plan:
  1. Reescribir el motor con `three` puro: `WebGLRenderTarget` de `cols × rows` (1 píxel = 1 carácter),
     `readRenderTargetPixels`, luminancia → rampa de 13 caracteres, escritura a un `<pre>`.
  2. Portar 1:1 la geometría de la referencia (esfera 0.98, 18 anillos con LCG semilla 42, agujas
     cilindro+cono+perilla, 3 luces, cámara fov 34 con aspect `(cols*0.6)/rows`).
  3. Conservar el contrato ya aprobado: `dynamic ssr:false`, `interactive`, `aria-hidden`,
     `useViewportSupports3d`, `usePrefersReducedMotion`, `cn()`, cero hardcode (color por `text-accent`,
     tamaño por `text-xs`, halo por `--shadow-glow`).
  4. D3 como el template: un solo frame con `rotation.y = 0.7` y **sin rAF**; el arrastre redibuja
     (**salda la deuda 8**, `frameloop="always"`).
  5. Reescribir los tests mockeando `three` en el borde; desinstalar R3F + drei si quedan sin uso.
- **Última tarea:** bugfix + hardening del escaneo de Tailwind (ver abajo). Antes: #14 `ascii_yarn` → el
  ovillo ASCII (three + R3F + drei) llenando el slot 3D del AppShell. APROBADA a la primera.
- **Agente:** leader → 3 exploradores en paralelo → implementer → reviewer; luego leader → implementer (bugfix).

## Estado del proyecto

- **Fase 1 (PRD-01, features 1-11):** completa (`done`).
- **Fase 2 (UI, features 12-31):** en curso. **#12, #13 y #14 done**; siguiente pendiente por id = **#15
  `uploads_image`**.
- `bash ./init.sh` VERDE: **362 passed | 6 skipped** (38 archivos). `pnpm build` OK.

## ⚠️ REGLA NUEVA para todos los agentes (nace de un bug real)

**Nunca escribas una clase de Tailwind con comodines o inventada en un informe, doc o comentario.** Citá una
clase real o describila en prosa. Un informe de #13 escribió `duration-[var(--dur-*)]` como abreviatura;
Tailwind v4 lo tomó por una clase real, generó CSS inválido y **tumbó la app entera con 500 en todas las
rutas**. Ya hay guardrail (`@source not` para `progress/`, `docs/` y `template/` en `globals.css`, con test
de regresión en `src/app/globals-css.test.ts`), así que hoy no rompe nada — pero la higiene sigue valiendo.
Detalle completo: `progress/informs/6.informe-bugfix-tailwind_source_guardrail.md`.

## Próximo paso — feature #15 `uploads_image`

Endpoint **único** y compartido `POST /api/uploads/image` que cablea el helper de Cloudinary ya existente
(#5): recibe un archivo (multipart/Blob), lo sube y devuelve `{ url }`. Lo usan los forms de Project (#22),
Yarn (#25) y Pattern (#28) — **no es un endpoint por entidad**. Aquí se salda la **deuda 3**: `folder`/
`publicId` se derivan del `userId` del JWT **validado con zod**, nunca del body crudo. Tests: subida OK con
el cliente de Cloudinary mockeado en el borde, 401 sin sesión, input inválido (zod). Fuente: RFC-03/04/05 §8
+ PRD §11.7. Es una slice de **backend**, no de UI: no aplica el checklist visual del SDD §9.

## Decisiones de diseño cerradas en #14 (vinculantes para quien siga)

Están en `docs/design/rfc/RFC-01-shell.md` §3 como tabla **D1/D2/D3**. Resumen:

- **D1** — La capa 3D es un **componente React** `AsciiYarn`, **no un web component**. El `<ascii-yarn>` con
  atributos que menciona el `template/` es el prototipo HTML viejo; ignoralo.
- ~~**D2** — El stack 3D es `three` + R3F + `drei` con `<AsciiRenderer />`~~ → **REVISADA: D2-bis**. El
  usuario entregó `template/ascii-yarn.js` (la referencia que faltaba) y manda sobre `src/`. El motor es
  **`three` puro**: render a un `WebGLRenderTarget` de `cols × rows` (1 píxel = 1 carácter),
  `readRenderTargetPixels`, luminancia → rampa de 13 caracteres, escritura a un `<pre>`. **Sin**
  `AsciiEffect`, **sin** `drei`, **sin** R3F (ambos paquetes desinstalados con pnpm).
- **D3** — Con `prefers-reduced-motion` se apaga **la auto-rotación**, pero **el arrastre sigue disponible**.

## Notas para consumidores del design system (acumulado #12-#14)

- **Layout listo:** `src/shared/ui/layout/` (AppShell, ArchiveNav, BottomNav) — presentación pura, se le pasan
  `user`+`onLogout`. El wiring de auth para el shell está en `src/features/auth/ui/AppShellClient.tsx`.
- **Capa 3D lista:** `<AsciiYarn />` en `src/shared/ui/three/`. Props: `interactive?: boolean` (default
  `false` → `pointer-events:none` + `aria-hidden`), `glow?: boolean` (halo `--shadow-glow`, default off),
  `cols`/`rows` (retícula ASCII, default 96×44) y `className` (fusionado con `cn()`; resuelve
  tamaño/posición, así que un loader es el mismo componente en una caja chica). **Un loader debe poner su
  propio `role="status"` con texto alrededor** — el componente es siempre `aria-hidden`.
- **`AsciiYarnScene.tsx` y `createYarnScene.ts` (en `src/shared/ui/three/ascii-yarn/`) son los únicos
  archivos del repo que pueden importar `three`.** Si necesitás 3D en otro lado, pasá por la capa `three/`;
  nunca importes directo. En tests, mockeá `three` en el borde (ver `ascii-yarn.test.tsx`).
- **Activa por ruta:** helper `isRouteActive` + `usePathname` (exacto para `/`, prefijo para subrutas).
- **Responsive token-first:** usar variantes `tablet:`/`mobile:`/`desktop:` (namespace `--breakpoint-*` en
  globals.css). Para gates que deban **desmontar** (no solo esconder), leer `--bp-*` con `matchMedia` como
  hace `useViewportSupports3d`.
- **Cero hardcode** enforced por `no-hardcode.test.ts` (cubre primitivos + layout + los 5 archivos de la capa
  3D). Tests de UI: `// @vitest-environment happy-dom` + mockear `next/navigation` y `fetch`; para 3D,
  mockear **`three`** en el borde, no el componente propio. Excepción documentada: en `ascii-yarn/` los
  números de geometría/luces/cámara son unidades de mundo 3D portadas del template, no CSS.
- **`prefers-reduced-motion` en JS:** ya existe `usePrefersReducedMotion` en
  `src/shared/ui/three/ascii-yarn/`. Si hace falta fuera del 3D, promoverlo a `shared/ui/lib/`.
- Gotcha vigente: no usar la secuencia de cierre de comentario dentro de `bg-*/text-*` en `globals.css`.

## Deuda técnica acumulada

> **Se mudó a `progress/deudas.md`** (2026-07-30). Ahí viven las **28** deudas vigentes, cada una con su
> escenario concreto de fallo, y ahí se añaden las nuevas.
>
> **Por qué ya no está aquí:** este archivo se **vacía** en cada cierre de sesión (`AGENTS.md` §5), así
> que la lista dependía de que quien cerrara se acordara de arrastrarla a mano. Un solo cierre hecho al
> pie de la letra se llevaba las 28 por delante. `deudas.md` **no se vacía nunca**.
>
> **No copies deudas de vuelta aquí.** Si una tarea de esta sesión toca una, citála por número.

## Pendiente operativo (no bloquea)

- Bastante trabajo sin commitear (features #8-#14 + `informs/` + `docs/design/rfc` + `template/`). Commit(s)
  limpios cuando el usuario lo indique.

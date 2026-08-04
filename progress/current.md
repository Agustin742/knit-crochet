# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** ninguna. Última cerrada: **#32 `account_menu`**, volcada a `progress/history.md`.
  Informe de cierre: `progress/informs/11.informe-account_menu.md`.
- **Agente:** leader (escribe la enmienda E11) → 1 implementer → 1 reviewer. **APROBADO a la primera, 0
  bloqueantes** (7 observaciones no bloqueantes, fichadas como deudas **52, 53 y 54**).
- Antes, en la misma sesión: **diagnóstico de las deudas 44/45/46** con 2 `general-purpose` en paralelo +
  1 implementer (el smoke real de auth contra Neon).

## Estado del proyecto

- **Fase 1 (PRD-01, features 1-11):** completa (`done`).
- **Fase 2 (UI, features 12-32):** en curso. **#12, #13, #14, #31 y #32 `done`**; siguiente pendiente por
  id = **#15 `uploads_image`**.
- `bash ./init.sh` VERDE: **515 passed | 11 skipped** (49 archivos + 2 skipped, que son los dos smokes).
  `pnpm build` OK. **Verificado por el leader**, no sólo reportado.
- **La app ya se puede usar de verdad, y ahora se nota:** hay alta, acceso, **el caparazón muestra quién
  está dentro y hay botón de cerrar sesión** (#32). Con la sesión abierta, `/login` y `/register` te
  devuelven al inicio (deuda 36 saldada).
- **Los dos bugs que el usuario reportó en el navegador están diagnosticados, y el servidor está sano.**
  Ver el bloque de las deudas 44/45/46 más abajo.

## Decisiones cerradas por el usuario (no se reabren)

- **Tamaño de etiqueta del archivero: 18px** (`--text-nav-tab`), y con él `--bp-archive: 1180px`. Ese token
  **determina a partir de qué ancho de pantalla existe el archivero**: a 24px desaparecería de los portátiles
  de 1280-1366px y a los 36px de la referencia sólo lo verían monitores grandes. Los dos tokens están atados
  por un test que obliga a moverlos juntos.
- **El menú de cuenta (usuario + cerrar sesión) NO iba en #31: es la feature #32 `account_menu`.** Estuvo
  bloqueada hasta que existiera la enmienda **E11** del RFC-01. **E11 ya está escrita** (2026-08-03,
  `docs/design/rfc/RFC-01-shell.md`, "Cuarta tanda"), con las tres decisiones tomadas por el usuario:
  - **(a)** el control **NO vuelve al `ArchiveNav`**: vive en una **banda propia del `AppShell`, fuera del
    elemento `nav`**. El archivero queda **intacto** y **`--bp-archive` sigue en 1180px** — o sea que la
    decisión cerrada del tamaño de etiqueta **no se reabre**. Motivo medido: **30.88px de holgura** contra
    los **168px** que reservaba la banda de utils, y **48px** sólo del relleno lateral de un `Button` `md`.
  - **(b)** esa banda rige en **todos los anchos**, de 320px a desktop: **`BottomNav` no se toca**. Resuelve
    de paso el agujero real que la deuda 19 describía mal (entre 320 y 1179px no había **ninguna**
    superficie capaz de alojar la sesión, porque el archivero no se monta y `BottomNav` no tiene props).
  - **(c)** el **gate del extremo derecho de la banda** (ranura 6 como peor caso) es **obligatorio**, y lo
    sigue siendo aunque el control salga del `nav`: **la colisión es geométrica, no del árbol del DOM**.
  Detalle de la medición en `explore_auth_shell_blast_radius.md`.
- **Para el envío de los formularios de auth se compró el arreglo mínimo** (declarar POST), no la Server
  Action. Lo irreversible —el secreto fuera de la URL— queda cerrado; el resto es la **deuda 39**.

## ⚠️ REGLAS vigentes para todos los agentes

**1. Nunca escribas una clase de Tailwind con comodines o inventada** en código, tests, informes, docs o
comentarios. Citá una clase real o describila en prosa. Un informe de #13 escribió una clase con un asterisco
como abreviatura; Tailwind v4 la tomó por real, generó CSS inválido y **tumbó la app entera con 500 en todas
las rutas**. Hay guardrail (`@source not` en `globals.css` + test en `src/app/globals-css.test.ts`), pero la
higiene sigue valiendo. Detalle: `progress/informs/6.informe-bugfix-tailwind_source_guardrail.md`.

**2. El par que un test mide se DERIVA del código, no se elige a mano.** El lote de higiene fue rechazado
porque un test medía un par de tokens que **ningún camino del código puede producir**, y tapaba en verde el
caso roto. Es el patrón de las deudas 18, 22, 23, 33, 40 y 43: *"el test mide una cosa, el código consume
otra"*.

**3. CONDICIÓN DOBLE en todo gate nuevo.** Tiene que verse **caer en rojo** al quitar el arreglo y pasar en
verde al restaurarlo, ejecutado en las dos direcciones, **con la salida real pegada y los números tal cual
salgan** (en #31 un informe declaró 9 rojos donde salían 12).

**4. Para lo que se sirve al navegador, medí contra un servidor real.** Los dos defectos más serios de #31
—la pantalla de login vacía y las credenciales viajando por la URL— **no los vio ningún test**: aparecieron
levantando `pnpm start` y mirando la respuesta.

**5. Los subagentes `Explore` son de SOLO LECTURA: no pueden escribir su informe.** Para la regla
anti-teléfono-descompuesto de `CLAUDE.md`, usá **`general-purpose`**, o asumí el volcado desde el leader.

## ✅ RESUELTO EN ESTA SESIÓN — los cuatro síntomas del navegador (deudas 44/45/46)

Los cuatro están cerrados o recalificados. **Ninguno era un defecto de datos.**

- **44** (*"tras el alta no llego al Dashboard con la sesión iniciada"*) → era **(b)**: la sesión **sí** se
  crea y `RegisterForm` **sí** navega (`router.replace("/")` + `router.refresh()`). No se notaba porque `/`
  es pública y **nada en el caparazón decía que había sesión**. **Lo arregla #32, ya cerrada.**
- **45** (*"el alta no rechaza un email ya registrado"*) → **el servidor devuelve 409**, medido contra Neon
  real, también con distinta caja y con espacios. Las tres hipótesis (traducción del UNIQUE, normalización
  del email, mapeo del status en el cliente) **cayeron con evidencia**. La ficha está **recalificada como
  deuda de presentación**: el mensaje llega y se pinta bajo el campo email, pero **nadie ha comprobado que
  sea perceptible**. El usuario decidió dar por buena la evidencia y no comprobarlo en navegador.
- **46** → **SALDADA**: `src/__smoke__/auth.smoke.test.ts`.
- *"puedo estar en el dashboard sin estar logueado"* → sigue siendo la **deuda 1**, criterio de **#19**.
- *"puedo entrar a login/register con la sesión ya iniciada"* → era la **deuda 36**, **saldada por #32**.

**La lección de método, que es lo que conviene recordar:** el smoke acertó **refutando** su propia
hipótesis. La ficha 45 apostaba al paralelo con `isDuplicateColorCode` (lanas) y el paralelo era **falso**:
`registerUser` consulta antes de insertar, así que nunca llega al error del driver. Sin medir, se habría
"arreglado" un código sano y el defecto real habría seguido ahí.

**Lo que sí queda vivo de todo esto: las deudas 47 y 48** (el store de auth no traduce el 23505 → 500 en vez
de 409; y la carrera del check-then-act). **La 47 primero**: con ella puesta, la 48 degrada a un 409 correcto.

## PRÓXIMA — feature #15 `uploads_image`

Endpoint **único** y compartido `POST /api/uploads/image` que cablea el helper de Cloudinary ya existente
(#5): recibe un archivo (multipart/Blob), lo sube y devuelve `{ url }`. Lo usan los forms de Project (#22),
Yarn (#25) y Pattern (#28) — **no es un endpoint por entidad**. Aquí se salda la **deuda 3**: `folder`/
`publicId` se derivan del `userId` del JWT **validado con zod**, nunca del body crudo. Tests: subida OK con
el cliente de Cloudinary mockeado en el borde, 401 sin sesión, input inválido (zod). Fuente: RFC-03/04/05 §8
+ PRD §11.7. Es una slice de **backend**, no de UI: no aplica el checklist visual del SDD §9.

## Notas para consumidores del design system (acumulado #12-#14, #31, #32)

- **Layout listo:** `src/shared/ui/layout/` (AppShell, **AccountBand**, ArchiveNav, BottomNav) — presentación
  pura. `AppShell` acepta `user`/`onLogout` y ahora **son reales**: alimentan la banda de cuenta. `ArchiveNav`
  **ya no las declara** (las tiraba desde E7; se le quitaron en #32).
- **`AccountBand` (nueva, #32):** nombre + botón "Salir", **en el flujo** y **antes** del `header` del
  archivero, fuera del elemento `nav`, **sin variante responsive** (rige de 320px a desktop). **No monta nada
  si falta el usuario O el callback de logout**: enseñar el nombre con un botón muerto es el error de E7 al
  revés. Su gate de geometría vive en `account-band.tokens.test.ts` y lo que asegura es **que siga en el
  flujo** — si alguien la superpone, cae en rojo. **Ojo: sólo mira las clases propias de la banda, así que se
  la puede superponer desde fuera vía `className` o un contenedor posicionado → deuda 52.**
- **El usuario se resuelve en el SERVIDOR**, no en cliente: `getSessionUser()` en el layout de `(app)`. Ese
  es el motivo de que el gate *"montar el caparazón no dispara ningún fetch de cliente"* **siga siendo
  verdad**. Si vas a añadir datos al caparazón, **hacelo por el mismo camino** o romperás ese invariante.
  Precio ya fichado: `/` pasó de estática a dinámica y hay una lectura de la base por carga (deuda 50).
- **Piezas de auth reutilizables** (`src/features/auth/ui/`): `AuthPanel` (marco de pantalla de acceso),
  `AuthFormError` (bloque de error con región viva — **es el `Alert` que el SDD §6 lista como pendiente**;
  candidato a promover a `shared/ui` en cuanto tenga un segundo consumidor), `focus-first-invalid.ts`,
  `next-path.ts` (**guarda de seguridad: todo redirect construido a partir de un valor de URL pasa por
  aquí**) y `field-errors.ts`.
- **Regla de superficies:** *una superficie que elige su fondo elige también su primer plano*. La variante
  fantasma de `Button` **hereda** el color del contexto, así que un contenedor nuevo que declare fondo y no
  declare texto deja invisible lo que contenga. `Card` ya lo hace bien.
- **Trampas de formulario ya pagadas, no las repitas:** `Button` es `type="button"` por defecto (pasá
  `type="submit"`); **todo formulario debe declarar su método** (si no, envía por GET y filtra lo que lleve
  nombre — deudas 39 y 43); `Field` **no anuncia errores tardíos**, hay que mover el foco al campo; montá
  formularios sobre la variante elevada de `Card`, la única superficie donde el anillo de foco cumple
  contraste (deuda 31).
- **Semántica de errores de auth (contraintuitiva a propósito):** el login devuelve **el mismo mensaje** para
  email inexistente y password errónea, para no revelar qué cuentas existen → se pinta **a nivel de
  formulario, nunca en el campo email**. El alta devuelve un código propio para email duplicado **sin decir
  qué campo** → el mapeo al campo lo decide el cliente, por status y no por texto.
- **Capa 3D lista:** `<AsciiYarn />` en `src/shared/ui/three/`. Props: `interactive?`, `glow?`, `cols`/`rows`
  (default 96×44) y `className`. Siempre `aria-hidden`: un loader necesita su propio `role="status"`. Por
  debajo del breakpoint de tablet **no se monta**.
- **`AsciiYarnScene.tsx` y `createYarnScene.ts` son los únicos archivos que pueden importar `three`.** En
  tests, mockeá `three` en el borde.
- **Activa por ruta:** `isRouteActive` + `usePathname` (exacto para `/`, prefijo para subrutas).
- **Responsive token-first:** variantes `tablet:`/`mobile:`/`desktop:`. Para gates que deban **desmontar**,
  leer `--bp-*` con `matchMedia` como `useViewportSupports3d`.
- **Cero hardcode** enforced por `no-hardcode.test.ts`. Tests de UI: `// @vitest-environment happy-dom` +
  mockear `next/navigation` y `fetch`. **Asertá sobre la salida real de `cn()`, no sobre el string crudo de
  `cva`.**
- **No importes desde el barrel `@/features/auth`** en cliente: arrastra Drizzle. Importá por ruta directa.
- Gotcha vigente: no usar la secuencia de cierre de comentario dentro de `bg-*/text-*` en `globals.css`.

## Deuda técnica acumulada

> Vive en **`progress/deudas.md`** — libro mayor, **no se vacía nunca**. Hoy: **54 fichas**; saldadas y
> tachadas 1, 2, 4, 8, 13, 17, 21, 32, 37, 38, 46 y —por **#32**— **19, 29, 30 y 36**. La **45** está
> **recalificada** (su hipótesis era falsa: pasó de deuda de datos a deuda de presentación), no saldada; la
> **19** está corregida **y** saldada. Recalibradas por #32: **22, 23 y 24**. Nuevas: **47**, **48**, y de
> #32 **49**, **50**, **51**, más las tres que levantó el reviewer: **52** (el gate de E11(c) se puede burlar
> **desde fuera** de la banda), **53** (la banda no tiene nombre accesible) y **54** (`GET /api/auth/me` se
> quedó **sin ningún consumidor en producción**: hay que darle uno o retirarlo, no dejarlo en el limbo).
>
> **Tres que sólo se cierran con una pantalla delante, y conviene mirarlas juntas:** la **26** (la escalera
> del archivero en las 6 rutas), la **51** (la banda con una sesión real) y la **53**. Hoy son imposibles:
> sólo existe la ruta `/`.
>
> **No copies deudas de vuelta aquí.** Si una tarea toca una, citála por número.
>
> **Dos que conviene taparse juntas:** la **40** y la **43** piden la misma medicina (barrido por recorrido de
> directorios sobre `src/**` en vez de lista fija). La **43** es la **tercera** aparición de ese patrón en el
> repo y la primera en la que lo que se escapa por el agujero es una **credencial**.
>
> **Dos caveats honestos de #31 que conviene no olvidar:** la deuda **39** pide verificarse **con el
> JavaScript desactivado**, no sólo con tests; y la **41** está **razonada pero no medida con un lector de
> pantalla real**.

## Pendiente operativo (no bloquea)

- Bastante trabajo sin commitear (features #8-#14, #31, **#32**, `informs/`, `docs/design/rfc`, `template/`,
  el lote de higiene y este cierre). Commit(s) limpios cuando el usuario lo indique. **Ya son muchas sesiones
  acumuladas sin commit: conviene proponerlo pronto.**
- El destrackeo de `tsconfig.tsbuildinfo` dejó una **eliminación preparada en el índice** de git: entra en el
  próximo commit. El archivo sigue en disco.

# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** ninguna. Última cerrada: **#31 `auth_ui`** (páginas de login y register), volcada a
  `progress/history.md`. Informe de cierre: `progress/informs/10.informe-auth_ui.md`.
- **Agente:** leader → 3 exploradores → implementer → reviewer, con **3 rondas de review, todas APROBADAS**.

## Estado del proyecto

- **Fase 1 (PRD-01, features 1-11):** completa (`done`).
- **Fase 2 (UI, features 12-32):** en curso. **#12, #13, #14 y #31 `done`**; siguiente pendiente por id =
  **#15 `uploads_image`**.
- `bash ./init.sh` VERDE: **481 passed | 6 skipped** (46 archivos + 1 skipped). `pnpm build` OK.
- **La app ya se puede usar de verdad:** hay alta y acceso. Antes de #31 el proxy mandaba a `/login` y esa
  ruta devolvía **404**, así que ninguna página privada era alcanzable en un navegador.
- **No hay forma de cerrar sesión desde la interfaz** (esperado: llega con #32). La cookie caduca a 7 días.

## Decisiones cerradas por el usuario (no se reabren)

- **Tamaño de etiqueta del archivero: 18px** (`--text-nav-tab`), y con él `--bp-archive: 1180px`. Ese token
  **determina a partir de qué ancho de pantalla existe el archivero**: a 24px desaparecería de los portátiles
  de 1280-1366px y a los 36px de la referencia sólo lo verían monitores grandes. Los dos tokens están atados
  por un test que obliga a moverlos juntos.
- **El menú de cuenta (usuario + cerrar sesión) NO iba en #31: es la feature #32 `account_menu`**, bloqueada
  hasta que exista la enmienda **E11** del RFC-01 con tres decisiones tomadas (dónde vive el control, qué pasa
  por debajo de 1180px, y el gate del extremo derecho de la banda). Motivo medido: **30.88px de holgura contra
  los 168px** que reservaba la banda de utils. Detalle en `explore_auth_shell_blast_radius.md`.
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

## 🔴 PRÓXIMA SESIÓN — arrancar por aquí, NO por #15

El usuario probó la app en el navegador después de cerrar #31 y reportó **cuatro síntomas**. Decidió que se
arreglan en la siguiente sesión. Fichas **44, 45 y 46** en `progress/deudas.md`, con el detalle y el primer
paso de diagnóstico de cada una.

**Dos de los cuatro ya estaban fichados, y quedan confirmados en pantalla** (no son hallazgos nuevos):
- *"puedo estar en el dashboard sin estar logueado"* → **deuda 1**, ya es criterio de aceptación de **#19**.
- *"puedo entrar a login/register con la sesión ya iniciada"* → **deuda 36**, colgada de **#32**.

**Los otros dos pueden ser bugs de producción y ninguno está diagnosticado:**
- **44** — tras el alta no se llega al Dashboard "con la sesión iniciada". **Separar primero** si no redirige
  de verdad, o si redirige y **no se nota** porque `/` es pública (deuda 1) y **nada en el caparazón muestra
  al usuario** (eso es #32). El primer paso es mirar si existe la cookie `kc_session` tras el alta: si está,
  lo que corresponde es **priorizar #32**, no parchear el formulario.
- **45** — el alta no rechaza un email ya registrado. **Si se confirma, es un defecto de producción con los
  481 tests en verde.**

**Y la causa de método, que es lo que hay que atacar primero — deuda 46:** la cadena de auth **nunca se ha
ejercitado contra la base real**. Los tests de rutas doblan el borde de datos y los de UI doblan `fetch`, así
que **nadie ha recorrido navegador → route handler → Drizzle → Postgres**. Hay **precedente exacto**: el smoke
test real contra Neon de la fase 1 destapó un bug en la traducción del error UNIQUE de las lanas
(`isDuplicateColorCode`). **La hipótesis número uno de la 45 es que falle la traducción equivalente para el
email.** Hacer el smoke real **antes** de tocar código: es lo que dice dónde está el fallo.

## Después — feature #15 `uploads_image`

Endpoint **único** y compartido `POST /api/uploads/image` que cablea el helper de Cloudinary ya existente
(#5): recibe un archivo (multipart/Blob), lo sube y devuelve `{ url }`. Lo usan los forms de Project (#22),
Yarn (#25) y Pattern (#28) — **no es un endpoint por entidad**. Aquí se salda la **deuda 3**: `folder`/
`publicId` se derivan del `userId` del JWT **validado con zod**, nunca del body crudo. Tests: subida OK con
el cliente de Cloudinary mockeado en el borde, 401 sin sesión, input inválido (zod). Fuente: RFC-03/04/05 §8
+ PRD §11.7. Es una slice de **backend**, no de UI: no aplica el checklist visual del SDD §9.

## Notas para consumidores del design system (acumulado #12-#14, #31)

- **Layout listo:** `src/shared/ui/layout/` (AppShell, ArchiveNav, BottomNav) — presentación pura. `AppShell`
  acepta `user`/`onLogout` **pero nadie las alimenta y `ArchiveNav` las ignora**: contrato reservado a **#32**,
  que tendrá que **reescribir** los dos gates de `AppShellClient.test.tsx` (`:87`, `:101`) — deuda 29 —, no
  sólo añadir código.
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

> Vive en **`progress/deudas.md`** — libro mayor, **no se vacía nunca**. Hoy: **43 fichas**; saldadas y
> tachadas 1, 2, 4, 8, 13, 17, 21, 32, 37 y 38.
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

- Bastante trabajo sin commitear (features #8-#14, #31, `informs/`, `docs/design/rfc`, `template/`, el lote de
  higiene y este cierre). Commit(s) limpios cuando el usuario lo indique.
- El destrackeo de `tsconfig.tsbuildinfo` dejó una **eliminación preparada en el índice** de git: entra en el
  próximo commit. El archivo sigue en disco.

# impl — feature #32 `account_menu` (RFC-01 §3, enmienda E11)

> Menú de cuenta en el caparazón: usuario visible + cerrar sesión. Una sola feature; nada de #15 ni de
> ninguna otra. Estado en `feature_list.json`: **sigue en `in_progress`** (no la marco `done`: falta el
> reviewer).
>
> **Aviso de higiene:** en este informe **no se escribe ningún nombre de clase de Tailwind**. Las
> utilidades se describen en prosa. Motivo, por si alguien lo hereda: Tailwind v4 escanea también los `.md`
> y una clase inventada o con comodín tumbó la app entera una vez.

---

## 1. Qué se construyó y dónde

### 1.1 La banda de cuenta (nueva superficie del design system)

| Archivo | Qué es |
|---|---|
| `src/shared/ui/layout/account-band/AccountBand.tsx` | **NUEVO.** El componente: nombre de quien tiene la sesión + botón "Salir". Presentación pura. |
| `src/shared/ui/layout/account-band/account-band.variants.ts` | **NUEVO.** Sus clases, en `cva`, con el porqué de cada decisión. |
| `src/shared/ui/layout/account-band/account-band.tokens.test.ts` | **NUEVO.** El gate de E11 (c) + los contrastes. 9 tests. |
| `src/shared/ui/layout/account-band/index.ts` | **NUEVO.** Barrel. |
| `src/shared/ui/layout/index.ts` | Exporta el subdirectorio nuevo. |
| `src/app/globals.css` | Dos tokens nuevos: el respiro vertical de la banda y su inset lateral (que **lee** el del carril del nav, en un solo sentido). |

**Dónde vive exactamente:** en el flujo del `AppShell`, **antes** del `header` del archivero y **fuera** del
elemento `nav`. No se superpone al cajón: lo empuja hacia abajo. Rige en todos los anchos y **no lleva
ninguna variante responsive** (E11 b), así que la misma superficie sirve por encima y por debajo de
`--bp-archive`.

**Qué contiene:** el nombre en la familia mono, tamaño extra pequeño, con interletrado de etiqueta y en el
tono claro atenuado; y un `Button` de la **variante fantasma**, tamaño por defecto, que es un `button` (no un
enlace). Alineados al final de la banda.

**Cuándo NO monta nada:** si falta el usuario **o** falta el callback de logout. Ofrecer "Salir" sin sesión
fue el defecto que motivó E7; enseñar el nombre con un botón muerto es el mismo error al revés y es
exactamente el escenario que describía la deuda 29. Que el control **desaparezca** es visible; que aparezca
**muerto** no lo era. Hay test de las dos mitades.

### 1.2 El archivero, intacto — y con una promesa muerta menos

| Archivo | Cambio |
|---|---|
| `src/shared/ui/layout/archive-nav/ArchiveNav.tsx` | **Se le quitan las props `user`/`onLogout` y el tipo `ArchiveNavUser`.** Las declaraba y las tiraba desde E7. JSDoc reescrito: explica que el control **no volverá** y por qué (medida de E11). |
| `src/shared/ui/layout/archive-nav/index.ts` | Deja de exportar el tipo. |
| `src/shared/ui/layout/app-shell/AppShell.tsx` | Monta la banda; sus props `user`/`onLogout` dejan de ser "RESERVADAS" y pasan a ser reales. El tipo de usuario ahora es el de la banda. |

**Cero cambios en la geometría del archivero:** ni `--bp-archive`, ni `--nav-tab-inset-end` (que sigue
derivado de su gemelo), ni el ancho de columna, ni `BottomNav` (E11 a + b). Hay un test que lo fija.

### 1.3 El cableado de la sesión

| Archivo | Cambio |
|---|---|
| `src/features/auth/api/session-user.ts` | **NUEVO.** `getSessionUser()`: lee la cookie en servidor y devuelve el usuario público, o `null` (sin sesión **o** usuario ya borrado). |
| `src/features/auth/api/session-user.test.ts` | **NUEVO.** 4 tests: camino feliz, sin sesión (y no toca la capa de datos), usuario inexistente, error propagado. |
| `src/features/auth/api/index.ts` | Lo exporta. |
| `src/app/(app)/layout.tsx` | Pasa a ser **Server Component asíncrono**: resuelve el usuario y lo baja por props. **Cruza a cliente sólo el nombre.** |
| `src/app/(app)/app-layout.test.tsx` | **NUEVO.** 3 tests: resuelve en servidor sin fetch, `null` sin sesión, y sólo el nombre cruza. |
| `src/features/auth/ui/AppShellClient.tsx` | Recupera estado de cliente: `useRouter` + manejador de logout. Acepta y propaga `user`. |
| `src/features/auth/ui/auth-client.ts` | `LOGOUT_ENDPOINT` + `postLogout()`, que devuelve un booleano: la cookie es `httpOnly` y el status es la única señal. |
| `src/features/auth/ui/next-path.ts` | `LOGOUT_REDIRECT` junto al destino por defecto. |
| `src/features/auth/ui/index.ts` | Lo exporta. |

### 1.4 La deuda 36, en el proxy

| Archivo | Cambio |
|---|---|
| `src/proxy.ts` | Verifica la cookie **antes** de resolver la allowlist. Con sesión válida, `/login` y `/register` redirigen a `/`. |
| `src/proxy.test.ts` | +5 tests. |

### 1.5 Tests reescritos (no borrados)

| Archivo | Qué se hizo |
|---|---|
| `src/features/auth/ui/AppShellClient.test.tsx` | Los dos gates de `:87` y `:101`, reescritos con su JSDoc. De 4 a 9 tests. |
| `src/shared/ui/layout/layout.test.tsx` | El gate de `:199`, reescrito. Los dos casos de `axe` ajustados. De 29 a 33 tests. |
| `src/shared/ui/primitives/no-hardcode.test.ts` | Registra los dos archivos nuevos. |

### 1.6 Libro mayor

`progress/deudas.md`: **19 corregida y saldada**; **22, 23 y 24 recalibradas**; **29, 30 y 36 tachadas** con
el cómo; **49, 50 y 51 nuevas**; nota de campo añadida a la **43**.

---

## 2. Las decisiones no obvias, con su porqué

### D1 — La banda va en el FLUJO, no superpuesta. Es lo que hace que E11 (c) se pueda cumplir

E11 describe la banda como una superficie que "se superpone al archivero". **Con esa geometría el gate (c)
es imposible de pasar**, y esa es justamente la conclusión que la medida obliga a sacar:

| magnitud | valor | de dónde sale |
|---|---|---|
| techo libre sobre la pestaña de la columna 6 en la ranura 6, **en reposo** | **10** | `--nav-height` − 5×`--nav-leaf-height` − `--nav-tab-height` |
| lo mismo, **con el puntero encima** | **2** | menos `--nav-tab-lift` |
| alto que necesita la banda | **60** | objetivo táctil + dos respiros |

(Todo en píxeles de CSS.) No hay ninguna forma de meter 60 en 2. Así que la banda **ocupa su propio sitio**:
es un hijo del `AppShell` que va antes del `header`, y el archivero empieza donde ella acaba. La colisión
deja de ser posible **por construcción**, que es la única manera honesta de cumplir un invariante cuyo margen
real es de 2 píxeles.

Esto **no relaja** el gate: lo convierte en el guardián de esta decisión. El segundo test deriva de las
**clases reales** del componente si la banda está en el flujo o fuera de él, y si alguien la superpone —el
error natural, porque es lo que hace la banda del wordmark dentro del nav— se pone rojo con los números
delante. La condición doble está en §4.

### D2 — El usuario se resuelve en el servidor (la "opción de menor radio")

El layout de `(app)` es un Server Component. Resolver ahí la sesión:

- **conserva entero** el invariante de coste que motivó el gate de `AppShellClient.test.tsx:87` — montar el
  caparazón sigue sin costar **ninguna** petición de cliente, ahora **también con el usuario en pantalla**;
- deja al gate diciendo la verdad en vez de obligar a invertirlo (deuda 29);
- **salda sola la deuda 30**: el módulo recupera estado de cliente (el manejador de logout), así que la
  directiva de cliente deja de mentir y no hay que renombrar nada ni repuntar a sus tres importadores.

**Consecuencia sobre `GET /api/auth/me`, que el acceptance nombra explícitamente:** el caparazón **no lo
llama**. El acceptance pedía "cablear `GET /api/auth/me` y `POST /api/auth/logout`" y, tres líneas más
abajo, que la opción de menor radio era resolver el usuario en el layout servidor — las dos cosas juntas no
se pueden tener, porque llamar al endpoint desde el cliente es exactamente lo que el gate de coste prohíbe.
Se eligió lo segundo, que es lo que el encargo marcaba como preferido. **El endpoint sigue vivo, público en
su ruta y con sus 9 tests**: no se tocó ni una línea suya, y `getSessionUser` reutiliza el mismo servicio
(`getCurrentUser`) que él usa, así que la fuente de verdad del usuario es idéntica. Lo que cambia es el
transporte: props desde el servidor en vez de una petición del navegador.

**Precio, medido:** `/` pasa de estática (`○`) a dinámica (`ƒ`) en el listado del build, y cada carga
completa de una página de `(app)` cuesta una lectura de la base. Comprobado en dos builds limpios
(§5). Es el mismo precio que la deuda 37 pagó para `/login`, y queda fichado como **deuda 50** con su
arreglo natural (meter el nombre en el JWT) y el motivo de no haberlo hecho aquí (cambia el contrato de
sesión de toda la app).

### D3 — El logout sólo navega si el servidor confirma

`postLogout()` devuelve un booleano porque la cookie es `httpOnly` y el cliente **no puede** comprobar por su
cuenta si se borró. Si la petición falla, la sesión sigue viva: navegar igualmente a `/login` mandaría al
usuario a una pantalla de la que el proxy —desde que se saldó la deuda 36, en esta misma slice— lo devuelve
de rebote al Dashboard. Un viaje de ida y vuelta se lee como "el botón hace cosas raras"; quedarse quieto se
lee como "no pasó nada". Ninguna de las dos es buena: la segunda al menos no miente. **La ausencia de mensaje
queda fichada como deuda 49**, con la pieza que la taparía ya identificada.

### D4 — `ArchiveNav` pierde las props en vez de seguir ignorándolas

E11 (a) dice que el control **no vuelve** al archivero. Con eso escrito, dejar `user`/`onLogout` en su firma
"por si acaso" es una promesa muerta en el contrato del design system, y era la que sostenía el gate que
había que reescribir. El único consumidor era `AppShell`, así que el cambio es contenido.

### D5 — Contraste: dónde se apoya el control importa, y por eso se mide

El acceptance avisaba de un hallazgo que la deuda 31 no cubre: el anillo de foco sobre **la cara de una hoja
del archivero** da 2.92:1, por debajo del mínimo de 3:1. **En esta implementación no es un defecto vigente**,
porque el control no se apoya en ninguna hoja: vive sobre el fondo de la app. Pero eso es una propiedad que
se puede perder sin que nadie se entere, así que está **medida en un test**, en las dos direcciones:

| par medido | resultado | umbral |
|---|---|---|
| lo que hereda el botón fantasma (el primer plano que declara la banda) sobre el fondo de la banda | **12.83:1** | ≥ 4.5 ✔ |
| el nombre atenuado sobre el fondo de la banda | **7.45:1** | ≥ 4.5 ✔ |
| anillo de foco sobre el fondo de la banda | **4.68:1** | ≥ 3 ✔ |
| anillo de foco sobre la cara de una hoja | **2.92:1** | **< 3**, asertado como tal ✘ a propósito |

El par se **deriva del código**, no se elige a mano: el test lee las clases que emite el `cva` de la banda
pasadas por `cn()`, se queda con las que corresponden a un rol de color declarado en `@theme` (así el tamaño
de texto no se confunde con un color) y resuelve el token hasta su valor literal. Si la banda dejara de
declarar su primer plano, el test **no encuentra el par y falla**, en vez de medir en verde un par imaginario
(el patrón de las deudas 18, 22, 23, 33, 40 y 43). Y el mismo bloque asierta que el botón fantasma **hereda**
(no fija) su color, que es lo que hace que ese par sea el correcto y no otro.

### D6 — La deuda 36 se arregla sólo en páginas, y siempre a `/`

- **Sólo páginas.** Redirigir un `POST /api/auth/login` rompería el propio acceso. Que el alta reemplace la
  sesión abierta es una decisión del endpoint, no del proxy. Hay test.
- **Siempre a `/`, sin honrar el `?next=`.** Ese parámetro lo escribe el propio proxy para volver *después*
  de autenticarse; hacerle caso en una ruta pública lo convertiría en un redirector. Hay test con un valor
  hostil (`//evil.example`), que comprueba además que el host del destino sigue siendo el nuestro.
- **Con cookie inválida o caducada la pantalla sigue accesible**, que es justo cuando hace falta. Hay test.

---

## 3. Los gates que se reescribieron, y qué invariante conserva cada uno

| Gate | Decía | Dice ahora | Invariante conservado |
|---|---|---|---|
| `AppShellClient.test.tsx:87` — *"fires no HTTP request at all when mounted"* | montar el shell no dispara ninguna petición | **lo mismo, y ahora también con sesión en pantalla**: se monta pasándole un usuario y se sigue exigiendo cero peticiones | **El invariante de coste, literal**: ni una petición por montaje ni por navegación. No hizo falta invertirlo porque el usuario se resuelve en servidor. Lo que se añade es la contrapartida que faltaba: **una** petición por pulsación explícita, y ninguna más (`costs one request per press, and none per mount`) |
| `AppShellClient.test.tsx:101` — *"hands over neither user nor logout until feature #31 wires them"* | el shell no entrega ni usuario ni logout | entrega el usuario que le dieron, entrega un `onLogout` que hace POST al endpoint de logout y navega a la pantalla de acceso, y **no navega** si el servidor no confirma o si la red se cae | **Que el contrato con el caparazón esté asertado y no supuesto.** El test seguía comprobando exactamente lo que el shell recibe; lo que cambia es qué debe recibir |
| `layout.test.tsx:199` — *"acepta user/onLogout pero NO los renderiza"* | el archivero acepta las props y no pinta nada | **el archivero no aloja el control de cuenta** (ni el nombre, ni el botón, ni por el árbol del DOM), **y el shell sí lo monta, en su banda, fuera del `nav`** | **El invariante original, entero**: el nav no es el anfitrión. Se le añade el dónde. Y se conserva la garantía de E7 (`sin sesión no hay banda`) con un test propio |

Los tres JSDoc se reescribieron. Si no, mentirían — que es exactamente lo que la deuda 21 dejó dicho que no
se vuelve a hacer.

**Gates que NO se tocaron y siguen verdes** (era el objetivo de E11 a): la simetría del carril
(`archive-nav.tokens.test.ts:213`), el presupuesto horizontal de las 6 etiquetas (`:248`), los dos juegos de
breakpoints (`:257`) y *"todo enlace del `nav` es una pestaña"* (`layout.test.tsx`) — este último porque el
control es un `button` **y** está fuera del `nav`, las dos cosas a la vez, con test.

---

## 4. Condición doble de los gates

### 4.1 Gate (c) — el extremo derecho de la banda (**gate nuevo, obligatorio**)

**Quitando el arreglo**: se añaden a las clases de la banda las utilidades de posicionamiento absoluto
pegado al borde superior, o sea exactamente la geometría que E11 describía (superponerse al archivero, como
hace la banda del wordmark dentro del nav).

```
 ❯ src/shared/ui/layout/account-band/account-band.tokens.test.ts (9 tests | 1 failed) 11ms
     × por eso va en el FLUJO: su borde inferior queda por encima del cajón 3ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/shared/ui/layout/account-band/account-band.tokens.test.ts > la banda de cuenta no cabe sobre el archivero (E11 c) > por eso va en el FLUJO: su borde inferior queda por encima del cajón
AssertionError: la banda ocupa hasta y=60 y la pestaña de la columna 6 empieza en y=2: expected 60 to be less than or equal to 2
 ❯ src/shared/ui/layout/account-band/account-band.tokens.test.ts:238:7

 Test Files  1 failed (1)
      Tests  1 failed | 8 passed (9)
   Duration  674ms
```

Los números del mensaje son los de la medición: **60** de banda contra **2** de techo.

**Restaurándolo**:

```
 ✓ … > la pestaña de la última columna en la ranura 6 no deja techo para un control 1ms
 ✓ … > por eso va en el FLUJO: su borde inferior queda por encima del cajón 0ms
 ✓ … > no toca el presupuesto horizontal del carril (E11 a) 0ms
 ✓ … > rige de 320px a desktop: sin variante responsive y sin ocultarse (E11 b) 1ms
 ✓ … > la banda declara su primer plano junto a su fondo 1ms
 ✓ … > el texto que hereda el botón de salir se lee sobre el fondo de la banda 0ms
 ✓ … > el nombre atenuado también se lee 0ms
 ✓ … > el anillo de foco se distingue del fondo de la banda 0ms
 ✓ … > y NO se distinguiría sobre la cara de una hoja: otra razón para no apoyarse en el cajón 0ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Duration  665ms
```

### 4.2 Gate de coste del caparazón (reescrito)

**Quitando el arreglo**: se repone en `AppShellClient` un efecto de montaje que pide el usuario al endpoint
`me`, o sea la forma exacta que tenía antes de la deuda 21.

```
 FAIL  src/features/auth/ui/AppShellClient.test.tsx > AppShellClient > fires no HTTP request when mounted, not even with a session
 FAIL  src/features/auth/ui/AppShellClient.test.tsx > AppShellClient > cierre de sesión > posts to the logout endpoint and lands on the login screen
 FAIL  src/features/auth/ui/AppShellClient.test.tsx > AppShellClient > cierre de sesión > costs one request per press, and none per mount
 Test Files  1 failed (1)
      Tests  3 failed | 6 passed (9)
```

Con el detalle del tercero, que es el que mide el coste:

```
AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times
Received:
  1st vi.fn() call:
    Array [
      "/api/auth/me",
    ]
Number of calls: 1
```

**Son 3 rojos, no 2 ni 4.** (El segundo cae de rebote: con una petición de más, la del logout deja de ser la
primera del espía.)

**Restaurándolo**:

```
 Test Files  1 passed (1)
      Tests  9 passed (9)
   Duration  1.29s
```

### 4.3 Gate de la deuda 36 (proxy)

**Quitando el arreglo** (se anula la condición del redirect):

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  src/proxy.test.ts > proxy > con la sesión ya abierta (deuda 36) > devuelve al Dashboard desde las páginas de acceso y de alta
AssertionError: /login: expected 200 to be 307 // Object.is equality
 FAIL  src/proxy.test.ts > proxy > con la sesión ya abierta (deuda 36) > ignora el ?next= al devolver: no es un redirector desde una ruta pública
 Test Files  1 failed (1)
      Tests  2 failed | 11 passed (13)
```

**Restaurándolo**:

```
 Test Files  1 passed (1)
      Tests  13 passed (13)
   Duration  781ms
```

---

## 5. Verificación contra un servidor real

Regla 4 del arnés: *lo que se sirve al navegador se mide contra un servidor real*. `pnpm build` +
`pnpm start` + `curl`.

**Cómo se fabricó la sesión sin tocar la base:** un JWT firmado con **los mismos claims que
`signSessionToken`** (emisor, audiencia, sujeto, HS256) y un secreto conocido pasado por entorno al arrancar
el servidor. **No se ejecutó el smoke de Neon y no se escribió nada en la base.**

> **Traspié honesto, porque cuesta media hora a quien lo repita:** el primer intento firmó el token *sin*
> emisor ni audiencia y leyendo el secreto de `.env` con una expresión regular propia. El servidor lo rechazó
> **todo** (401 en el endpoint de logout, sin redirect en `/login`) y durante un rato pareció que el arreglo
> del proxy no funcionaba en producción. No era eso: era el token. `verifySessionToken` exige emisor y
> audiencia y valida el sujeto. Con el token bien formado, todo respondió como debía.

| comprobación | resultado |
|---|---|
| `GET /login` **con** sesión válida | `HTTP/1.1 307` + `location: /` ← **deuda 36, medida en vivo** |
| `POST /api/auth/logout` con esa sesión | `HTTP/1.1 200` |
| `POST /api/auth/logout` **sin** sesión | `HTTP/1.1 401` (el endpoint no está en la allowlist pública: sólo se puede salir estando dentro) |
| `GET /` **sin** sesión | `200`; **0** bandas de cuenta y **0** botones "Salir" en el HTML; los 2 landmarks de navegación presentes |
| `GET /login` sin sesión | `200` y **1** elemento de formulario en el HTML → **la deuda 37 no ha vuelto** |
| `GET /proyectos` sin sesión | `307` a la pantalla de acceso con el destino guardado (comportamiento previo intacto) |

**Lo que NO se pudo medir contra el servidor, y por qué:** el HTML de la banda **con una sesión de verdad**.
Para eso hace falta una fila real en `users`, y esta slice tenía prohibido tocar Neon. Queda cubierto por
tests de comportamiento sobre el marcado real (RTL + `axe` sobre `AppShell` con usuario) y fichado como
**deuda 51**, para mirarlo junto a la deuda 26 en la primera validación visual.

**La validación visual de la geometría en las 6 rutas que pide el acceptance no es ejecutable hoy:** sólo
existe la ruta `/`. Es literalmente lo que dice la deuda 26 (*"es lo primero que tiene que mirar el usuario
cuando exista una segunda ruta"*). La predicción, derivada de tokens: como la banda va en el flujo, en las 6
rutas empuja el archivero y no lo toca. **Predicción, no observación.**

**Comprobación del CSS compilado** (que las utilidades nuevas existen de verdad, no sólo en el fuente): en el
CSS del build aparecen los dos tokens nuevos con sus valores resueltos y **una** regla de relleno lateral y
**una** de relleno vertical que los consumen.

---

## 6. Salida real de la verificación

### `bash ./init.sh`

```
── 1. Verificando entorno ─────────────────────────────
[OK]    node -> v24.11.1
[OK]    pnpm -> 11.9.0

── 2. Verificando archivos base del arnés ──────────────
[OK]    Existe AGENTS.md
[OK]    Existe feature_list.json
[OK]    Existe progress/current.md
[OK]    Existe docs/harness/architecture.md
[OK]    Existe docs/harness/conventions.md
[OK]    Existe docs/harness/verification.md
[OK]    Existe CHECKPOINTS.md

── 3. Validando feature_list.json ──────────────────────
[OK]    feature_list.json válido (32 features)

── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet


 Test Files  49 passed | 2 skipped (51)
      Tests  515 passed | 11 skipped (526)
   Start at  17:19:45
   Duration  42.09s (transform 3.00s, setup 31.93s, import 35.74s, tests 25.42s, environment 10.98s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**Partida: 481 passed | 11 skipped (46 archivos + 2 skipped). Llegada: 515 passed | 11 skipped (49 archivos
+ 2 skipped). +34 tests, +3 archivos.** Desglose: banda de cuenta 9, `getSessionUser` 4, layout de `(app)` 3,
proxy +5, caparazón +5, layout del design system +4, guardrail de valores en crudo +4.

### `pnpm build`

```
$ next build
▲ Next.js 16.2.10 (Turbopack)
- Environments: .env

  Creating an optimized production build ...
✓ Compiled successfully in 9.9s
  Running TypeScript ...
  Finished TypeScript in 7.8s ...
  Collecting page data using 3 workers ...
✓ Generating static pages using 3 workers (14/14) in 366ms
  Finalizing page optimization ...

Route (app)
┌ ƒ /
├ ○ /_not-found
├ ƒ /api/auth/login
├ ƒ /api/auth/logout
├ ƒ /api/auth/me
├ ƒ /api/auth/register
├ ƒ /api/brands
├ ƒ /api/brands/[id]
├ ƒ /api/brands/[id]/types
├ ƒ /api/brands/[id]/types/[typeId]
├ ƒ /api/dashboard/metrics
├ ƒ /api/patterns
├ ƒ /api/patterns/[id]
├ ƒ /api/projects
├ ƒ /api/projects/[id]
├ ƒ /api/projects/[id]/rounds
├ ƒ /api/projects/[id]/sessions
├ ƒ /api/projects/[id]/sessions/start
├ ƒ /api/projects/[id]/sessions/stop
├ ƒ /api/projects/[id]/steps
├ ƒ /api/projects/[id]/yarns
├ ƒ /api/projects/[id]/yarns/[yarnId]
├ ƒ /api/yarns
├ ƒ /api/yarns/[id]
├ ƒ /login
└ ○ /register


ƒ Proxy (Middleware)
```

**Comparación medida del cambio de `/`:** con el layout anterior (mismo árbol, `git stash` sólo de ese
archivo) el listado daba `┌ ○ /`; con el nuevo da `┌ ƒ /`. Es el precio de D2, fichado como deuda 50.

---

## 7. Deudas: qué se saldó, qué se corrigió, qué es nuevo

| Ficha | Estado |
|---|---|
| **19** | **Corregida y saldada.** Decía "en tablet no se ve el nombre"; lo real era que entre 320 y 1179 de ancho **no había ninguna superficie** capaz de alojar la sesión (el archivero no se monta y `BottomNav` no tiene props). E11 b lo resuelve con un anfitrión único. Prueba: el test de "sin variante responsive y sin ocultarse". |
| **22** | **Recalibrada.** Sigue abierta. Ahora hay **precedente ejecutable** de la técnica que pide (derivar la posición de las clases reales del componente): el gate nuevo. No se aplicó al wordmark porque `ArchiveNav` estaba fuera de alcance. |
| **23** | **Recalibrada.** El gemelo **vertical** del otro extremo ya existe (era E11 c). Lo que sigue destapado es el eje **horizontal**, y ahora con una segunda pieza en la banda; hoy no colisiona porque la separación con el cajón es vertical y total. |
| **24** | **Recalibrada.** Intacta y más barata: #32 no movió ni un milímetro el presupuesto horizontal (hay test), y ya no queda ninguna feature pendiente que quiera comérselo. Pasa de urgente a higiene. |
| **29** | **Saldada.** Cadena entera: servidor → props → banda, y logout cableado. Los tres gates reescritos, no borrados. |
| **30** | **Saldada sola**, por la salida que la propia ficha anticipaba: el módulo recuperó estado de cliente. |
| **36** | **Saldada** en el proxy, con las tres decisiones de alcance escritas y medidas contra un servidor real. |
| **43** | Nota de campo: los archivos nuevos entraron en el guardrail **por memoria**, y sólo entonces marcó tres comentarios con valores en píxeles. El guardrail canónico, que barre directorios, los cubrió solo. |
| **49** | **NUEVA.** El fallo de logout es **silencioso**: no navega (correcto) y no avisa (incompleto). |
| **50** | **NUEVA.** `/` pasa de estática a dinámica y cada carga cuesta una lectura de la base. Precio de D2, con arreglo natural identificado. |
| **51** | **NUEVA.** La banda no se ha visto con una sesión real en pantalla. Va junta con la 26. |

---

## 8. Lo que este informe NO afirma

- **No afirma que la banda se vea bien.** La fidelidad visual es revisión humana (SDD §9), y aquí ni siquiera
  se ha visto con sesión (deuda 51).
- **No afirma nada sobre las otras 5 rutas.** No existen.
- **No tocó la base de datos** ni ejecutó el smoke de Neon.
- **No marcó la feature como `done`.** Sigue en `in_progress`, esperando reviewer.

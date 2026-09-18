# review — feature #32 `account_menu` (RFC-01 §3, enmienda E11)

> Revisión independiente del trabajo descrito en `progress/reports/impl_account_menu.md`.
> Todo lo que se afirma aquí está **ejecutado por el reviewer**, no leído del informe.
> `SMOKE_NEON` **no** se ejecutó (queda fuera de esta revisión, por encargo).

## Veredicto

# APROBADO

**0 bloqueantes. 7 observaciones no bloqueantes** (ninguna impide cerrar la slice; la primera merece ficha
en `progress/deudas.md`).

La feature cumple E11 (a), (b) y (c). El archivero quedó intacto y medido, el gate nuevo **cae en rojo de
verdad** cuando se le quita el arreglo (reproducido por el reviewer, números idénticos a los del informe), el
invariante de coste del caparazón se **conservó** en vez de invertirse, el arreglo del proxy (deuda 36) es
correcto y no toca los endpoints, `next-path.ts` **no se debilitó** y `no-hardcode.test.ts` se **amplió** sin
excepciones nuevas.

---

## 1. Verificación propia (números del reviewer, no del informe)

### `bash ./init.sh` — exit code **0**

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
   Start at  17:30:25
   Duration  74.21s (transform 5.54s, setup 55.31s, import 61.35s, tests 36.91s, environment 18.19s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**Coincide exactamente con lo declarado**: 49 archivos + 2 skipped, **515 passed | 11 skipped (526)**.
La única diferencia es la duración (74.21s aquí contra 42.09s allí), que no es una métrica de corrección.

### `pnpm build` — exit code **0**

```
$ next build
▲ Next.js 16.2.10 (Turbopack)
- Environments: .env

  Creating an optimized production build ...
✓ Compiled successfully in 12.0s
  Running TypeScript ...
  Finished TypeScript in 9.3s ...
  Collecting page data using 3 workers ...
✓ Generating static pages using 3 workers (14/14) in 705ms
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

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

**Coincide con lo declarado**, incluido el cambio de la raíz de estática a dinámica: es el precio de D2 que
el informe ficha como deuda 50, y está declarado, no escondido.

---

## 2. Puntos obligatorios de revisión, uno por uno

### 2.1 E11 (a) — el archivero, ¿de verdad intacto? SÍ

Verificado sobre el diff real de `src/app/globals.css`: el archivo **sólo recibe adiciones**, un bloque de 16
líneas con dos tokens nuevos. Nada preexistente se modificó.

| comprobación | resultado |
|---|---|
| `--bp-archive` | `globals.css:261` = **1180px**, **sin cambios** (no aparece en el diff) |
| `--breakpoint-archive` | `globals.css:270` = **1180px**, **sin cambios** |
| `--nav-tab-inset-end` | `globals.css:101` = `var(--nav-tab-inset-start)`, **sigue derivado** |
| `--nav-tab-inset-start` | `globals.css:100` = `var(--space-6)`, sin tocar |
| reserva de ancho en el carril | **ninguna**: la banda no aparece en `archive-nav.variants.ts` |
| dependencia entre tokens | **de un solo sentido**: `--nav-account-inset-inline: var(--nav-tab-inset-start)` (`globals.css:117`). La banda lee al nav; el nav no lee a la banda |

**El control está fuera del elemento `nav`**, y no por lectura del código sino asertado:
`src/shared/ui/layout/app-shell/AppShell.tsx:63` monta la banda como hermano previo de `ArchiveNav`, y
`src/shared/ui/layout/layout.test.tsx:222` lo fija con `expect(nav.contains(band)).toBe(false)` más dos
negativos dentro del `nav` (ni el nombre, ni el botón).

Los gates del archivero que **no** debían moverse siguen verdes en la corrida completa
(`archive-nav.tokens.test.ts`: simetría del carril y presupuesto de las 6 etiquetas). El único cambio en
`ArchiveNav.tsx` es la **eliminación** de las props muertas `user`/`onLogout` y del tipo `ArchiveNavUser`:
no toca ni una línea de geometría.

### 2.2 E11 (c) — el gate del extremo derecho: PASA

**(i) ¿Se documentó la condición doble en las dos direcciones, con salida real?** Sí, en
`impl_account_menu.md` §4.1 (gate nuevo), §4.2 (coste del caparazón) y §4.3 (proxy).

**(ii) ¿Los números son reales? — REPRODUCIDO POR EL REVISOR.** Saqué la banda del flujo añadiendo la
utilidad de posicionamiento absoluto a la primera entrada del `cva` de
`src/shared/ui/layout/account-band/account-band.variants.ts:27` y ejecuté el gate:

```
 ❯ src/shared/ui/layout/account-band/account-band.tokens.test.ts (9 tests | 1 failed) 12ms
     × por eso va en el FLUJO: su borde inferior queda por encima del cajón 4ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  src/shared/ui/layout/account-band/account-band.tokens.test.ts > la banda de cuenta no cabe sobre el archivero (E11 c) > por eso va en el FLUJO: su borde inferior queda por encima del cajón
AssertionError: la banda ocupa hasta y=60 y la pestaña de la columna 6 empieza en y=2: expected 60 to be less than or equal to 2
 ❯ src/shared/ui/layout/account-band/account-band.tokens.test.ts:238:7

 Test Files  1 failed (1)
      Tests  1 failed | 8 passed (9)
   Duration  838ms
```

Y restaurando el archivo (verificado **byte a byte** contra una copia previa; `diff` sin salida):

```
 Test Files  1 passed (1)
      Tests  9 passed (9)
   Duration  790ms
```

**1 rojo de 9, y los números son exactamente 60 contra 2.** Idénticos a los del informe, mensaje incluido.
No hay inflación de la clase detectada en #31 (donde se declararon 9 rojos y salían 12).

**(iii) ¿El gate mide algo que el código pueda producir de verdad? (regla nº2) — SÍ.** Verificado leyendo la
cadena entera:

- `account-band.tokens.test.ts:118-120` construye las clases con `cn(accountBandVariants())`, o sea el
  **mismo `cva` y el mismo `cn`** que `AccountBand.tsx:50` pone en el atributo del elemento. No es una lista
  paralela escrita a mano.
- El alto de la banda (`:184-186`) sale de `tokenOf(BAND_CLASSES, ...)` para el alto mínimo y el respiro
  vertical, y `tokenOf` (`:123-134`) **lanza si no encuentra exactamente una**. Si la banda dejara de
  declarar cualquiera de los dos, el test **explota**, no mide un valor imaginario.
- Los tokens se resuelven contra `globals.css` siguiendo la cadena de `var()` hasta el literal (`:64-78`), y
  `declaration()` lanza si el token no existe.
- El techo del cajón (`:194-199`) se deriva de `--nav-height`, `--nav-leaf-height`, `--nav-tab-height`,
  `--nav-tab-lift` y de `ARCHIVE_SLOTS` **importado de `archive-nav.variants.ts`**, no de una constante local.
- El desplazamiento que la banda impone (`:208-215`) se deriva de las clases reales: fuera de flujo,
  transformación o margen negativo lo llevan a cero.
- Los pares de contraste (`:262-266`) se derivan igual: `paletteColorOf` sólo acepta un rol que `@theme`
  declare como color y exige **exactamente uno**, y `:271-272` asierta que el botón fantasma **hereda** el
  color en vez de fijarlo — que es lo que hace que el par medido sea el que el usuario ve y no otro. Es
  justo lo contrario del patrón de las deudas 18, 22, 23, 33, 40 y 43.

**Ni una sola constante geométrica escrita a mano en el test.** Los únicos números literales del archivo
están en **comentarios** (`:219`), como explicación de la cuenta que el código deriva.

**Sobre el cambio de geometría respecto a la letra de E11 (c):** el RFC describe la banda como superpuesta
("la banda se superpone al archivero, así que la colisión es geométrica"). El implementer la puso **en el
flujo** y documenta por qué (§2 D1): con 60 de banda contra 2 de techo, la superposición es matemáticamente
imposible. **No lo considero reabrir una decisión del usuario**: la decisión del usuario en E11 (c) es *"el
gate es obligatorio"*, y el gate **existe, está escrito, deriva del código y cae en rojo**. La geometría
superpuesta era la **premisa** de la que el propio RFC deduce el riesgo, y la medida la refuta. Resolver por
construcción un invariante cuyo margen real son 2 unidades es la lectura correcta del encargo, y queda
registrado en el `cva`, en `globals.css`, en el JSDoc del componente y en el propio gate.

### 2.3 Los tres gates invertidos — ¿se conservó el invariante de coste? SÍ

| gate | ¿invariante conservado? | evidencia |
|---|---|---|
| `AppShellClient.test.tsx:87` (antes) → `:119` (ahora) | **Sí, y reforzado.** Sigue diciendo *"fires no HTTP request when mounted"*, y ahora **con sesión en pantalla**. No se dio la vuelta a nada | `AppShellClient.test.tsx:119-131` |
| contrapartida nueva | *"costs one request per press, and none per mount"*: monta, **re-renderiza**, exige 0 peticiones, y sólo tras la pulsación exige exactamente 1 | `AppShellClient.test.tsx:208-225` |
| `AppShellClient.test.tsx:101` | **Sí.** Seguía asertando el contrato con el caparazón; cambia **qué** debe recibir, no que se aserte | `:133-152` |
| `layout.test.tsx:199` | **Sí.** El invariante original —*el archivero no aloja el control*— se conserva **entero** y se le añade el dónde | `layout.test.tsx:222-224` |

**Lo decisivo:** el invariante *"una petición por montaje, no una por navegación ni un re-render en
cascada"* **no se borró ni se relajó**, porque el usuario se resuelve en el layout servidor
(`src/app/(app)/layout.tsx:18`) y baja por props. Verifiqué que **no queda ningún fetch de sesión en el
cliente**: `AppShellClient.tsx` sólo llama a `postLogout()` desde el manejador, nunca en un efecto.

**Los JSDoc no mienten** (revisados uno a uno, que es donde este repo ya tropezó):

- `AppShellClient.test.tsx:24-41` explica que los gates se reescribieron, cuál era su razón anterior y por
  qué el invariante se conserva.
- `AppShellClient.test.tsx:108-118` y `:154-158` describen el estado **actual**.
- `layout.test.tsx:196-206` idem, con el "se REESCRIBIÓ, no se borró".
- `AppShellClient.tsx:20-44` describe el componente tal como está hoy.
- `ArchiveNav.tsx:50-57`: el JSDoc de la promesa muerta se **reescribió** y ahora dice que el control **no
  vuelve** y por qué. Las props y el tipo **se eliminaron de la firma**, no se dejaron ignoradas.

### 2.4 `src/proxy.ts` (deuda 36) — seguridad: CORRECTO

Leído línea a línea (`src/proxy.ts:16-83`):

1. **Sólo páginas, nunca endpoints.** `AUTH_PAGES = ["/login", "/register"]` (`:23`) — igualdad exacta, sin
   ninguna entrada de API. La condición del redirect (`:70`) es
   `authenticated && AUTH_PAGES.includes(pathname)`. Un `POST /api/auth/login` o `/api/auth/register` **no
   puede** entrar ahí. Asertado en `proxy.test.ts:117-125`: los dos endpoints con sesión válida devuelven
   200, no 307.
2. **La cookie se valida de verdad.** `hasValidSession` (`:35-46`) llama a `await verifySessionToken(token)`
   — **firma verificada**, no presencia — y devuelve `false` en el `catch`. Asertado en
   `proxy.test.ts:135-141`: `/login` con una cookie que no es un JWT responde **200**, la pantalla sigue
   accesible. Ese es exactamente el escenario que dejaría a alguien sin forma de entrar, y está cubierto.
3. **El destino nunca honra el `?next=`.** `NextResponse.redirect(new URL(HOME_PATH, request.nextUrl))`
   (`:71`) — destino fijo. `proxy.test.ts:103-115` lo prueba con un valor hostil de host externo y asierta
   las **tres** cosas: el `pathname` es la raíz, el `host` sigue siendo el nuestro, y el `search` queda
   vacío. No hay redirector abierto por aquí.
4. **Fail-closed intacto.** El reordenamiento (verificar primero, allowlist después) **no abrió nada**: la
   rama `if (!authenticated) return unauthorized(...)` (`:78-80`) sigue después de la allowlist, e
   `isPublicPath` no cambió. Los tests preexistentes del proxy siguen verdes (13/13).
5. **Grafo de imports intacto.** `src/proxy.ts:4` sigue importando **sólo** `@/shared/lib/auth/jwt`. Ni
   Drizzle, ni `@/shared/db`, ni bcrypt.

### 2.5 `next-path.ts` y `auth-client.ts` — ¿se debilitó la guarda? NO

El diff de `src/features/auth/ui/next-path.ts` es **de 3 líneas y sólo añade una constante**
(`LOGOUT_REDIRECT`). La guarda no se tocó: el patrón de ruta interna (`:18`) sigue rechazando la doble barra
inicial y la variante con barra invertida, `hasControlCharacters` (`:22-30`) sigue rechazando C0 y DEL, y
`resolveNextPath` (`:50-58`) sigue cayendo al destino por defecto en todo lo demás. **Ni host externo, ni
protocolo raro, ni doble barra inicial.**

`LOGOUT_REDIRECT` es una **constante literal del propio código**, no un valor de URL, así que no necesita
pasar por la guarda: en `AppShellClient.tsx:52` se usa directamente y no hay ningún camino en el que provenga
de la entrada del usuario.

`auth-client.ts` sólo añade el endpoint de logout y `postLogout()` (`:70-91`), que devuelve `response.ok` y
`false` en el `catch`. No toca `postAuth` ni la lectura de mensajes de error.

### 2.6 `no-hardcode.test.ts` — ¿se amplió o se debilitó? SE AMPLIÓ

El diff completo son **dos líneas añadidas** a la lista de archivos (los dos nuevos de la banda). **Cero
excepciones nuevas, cero reglas relajadas, cero patrones quitados.** Es exactamente lo que el guardrail pide.

### 2.7 Clases de Tailwind inventadas o con comodines: NINGUNA

- **En el código:** todas las utilidades nuevas resuelven contra tokens que existen — `--touch-target`
  (`globals.css:273`), `--nav-account-inset-inline` y `--nav-account-inset-block` (`:117-118`),
  `--color-fg-inverse` (`:128`), `--color-fg-inverse-muted` (`:129`), `--tracking-label` (`:168`),
  `--texture-dots-dark` (`:215`) y `--space-4`. `pnpm build` compila, y
  `src/shared/ui/canonical-tailwind-classes.test.ts` —que barre `src` por **recorrido de directorios**, no
  por lista fija— cubrió los archivos nuevos sin registro manual.
- **En los tests:** `account-band.tokens.test.ts:116` arma los prefijos por **concatenación**, así que ni un
  nombre de utilidad se escribe literal. Bien hecho y bien explicado (`:108-115`).
- **En el informe `.md`:** revisado — el implementer **no escribió ni un nombre de clase**, y avisa de ello
  en la cabecera. **Ni un asterisco.**
- **Guardrail intacto:** `globals.css:17-19` mantiene los tres `@source not` (`progress`, `docs`,
  `template`) y `src/app/globals-css.test.ts` sigue verde.
- **Nota del reviewer:** durante la reproducción del §2.2 escribí temporalmente una utilidad real en
  `account-band.variants.ts` y **restauré el archivo byte a byte** (verificado con `diff` contra copia
  previa). El árbol queda como lo dejó el implementer.

### 2.8 Cobertura honesta: SÍ (con un matiz, ver NB-6)

Las tres limitaciones que el informe declara son **reales, no coartadas**:

- *"No afirma que la banda se vea bien"* — correcto: la fidelidad visual es revisión humana (SDD §9).
- *"No afirma nada sobre las otras 5 rutas"* — verificado en el listado del build: sólo existen la raíz,
  `/login` y `/register`. La deuda 26 ya decía lo mismo.
- *"La banda con una sesión de verdad"* — para eso hace falta una fila en `users` y la slice tenía prohibido
  tocar Neon. **Lo que sí se podía medir, se midió**: contra servidor real comprobó el caso **anónimo** (0
  bandas y 0 botones de salida en el HTML) y el redirect de la deuda 36 con un JWT fabricado con los claims
  correctos. Lo que quedaba fuera queda **fichado** (deuda 51), no silenciado.
- Lo cubrible por tests **está cubierto**: `axe` sobre `AppShell` **con usuario**
  (`layout.test.tsx:503-509`), el control como botón y no como enlace (`:250-262`), y las dos mitades del
  "media sesión no se ofrece" (`:265-291`).

El **traspié honesto** de §5 del informe (token mal firmado, 401 en todo, y durante un rato pareció que el
proxy no funcionaba en producción) está declarado en vez de escondido. Eso es exactamente lo que el arnés
pide.

---

## 3. Arquitectura y convenciones

| criterio | resultado |
|---|---|
| UI sin DB | OK. `AccountBand` y `AppShell` son presentación pura; no importan `shared/db` ni hacen fetch |
| lógica en `features/<x>/api` | OK. `getSessionUser()` vive en `src/features/auth/api/session-user.ts` y reutiliza `getCurrentUser`, la misma fuente de verdad que `GET /api/auth/me` |
| route handlers finos | OK. Ninguno se tocó |
| feature-first | OK. `src/{app,features,shared}` respetado; el layout de `(app)` sólo compone |
| scoping por `userId` | OK. `getSessionUser` sale de `getSessionUserId()` (cookie), nunca de un parámetro de cliente |
| superficie serializada al cliente | OK. `layout.tsx:21` cruza **sólo** el nombre; asertado en `app-layout.test.tsx:82-97`, que incluso mete un `passwordHash` señuelo |
| dependencias nuevas | Ninguna |
| `console.log` / TODO / secretos | Ninguno en los archivos tocados |
| tests por módulo con lógica | OK. `session-user` (4), banda (9), layout de `(app)` (3), proxy (+5), caparazón (+5), design system (+4) |

---

## 4. Observaciones NO bloqueantes (numeradas y priorizadas)

**NB-1 — El gate de E11 (c) sólo mira las clases PROPIAS de la banda: se la puede superponer desde fuera y
seguiría verde.** *(la más relevante; merece ficha)*
`src/shared/ui/layout/account-band/account-band.tokens.test.ts:208-215`.
El desplazamiento se deriva de las clases del `cva` de la banda. Pero `AccountBand` acepta un `className`
(`AccountBand.tsx:16, 50`) y `AppShell.tsx:63` podría envolverla en un contenedor posicionado. En cualquiera
de esos dos casos la banda **quedaría superpuesta al cajón y el gate seguiría en verde**, porque las clases
del `cva` no habrían cambiado. El test de orden del DOM (`layout.test.tsx:227-247`) tampoco lo vería: el
orden de los nodos no cambia al posicionar en absoluto. *Por qué importa:* es la misma familia de agujero que
las deudas 22 y 40 (el gate no ve dentro de la capa que de verdad decide). *Arreglo:* asertar también que
`AppShell` no pasa clases de posicionamiento a la banda y que su contenedor no lleva utilidades de fuera de
flujo, o subir la comprobación al `AppShell` ya renderizado. **Fichar como deuda nueva.**

**NB-2 — La aritmética del segundo test del gate es degenerada: con la banda en el flujo se reduce a
"0 <= 2".**
`account-band.tokens.test.ts:230-239`. Con el desplazamiento igual al alto de la banda, la aserción
`BAND_HEIGHT <= NAV_TOP + WORST_CASE_TAB_TOP_HOVERED` es `alto <= alto + 2`. Todo su poder discriminante
viene del booleano de `:208`. Funciona —lo reproduje— y el primer test (`:218-228`) sí mide la geometría real
(60 contra 2), así que **el par de tests sí cubre lo que dice cubrir**. Pero el mensaje de error (*"la banda
ocupa hasta y=60 y la pestaña empieza en y=2"*) sugiere una comparación más fina de la que la aserción hace:
la banda podría crecer a 500 y este test seguiría verde. *Arreglo:* documentarlo en el JSDoc del propio test
(que el segundo mide **flujo sí/no** y el primero mide **la cota**), o partirlo en dos aserciones con nombres
que digan lo que cada una hace.

**NB-3 — `hasValidSession` corre ahora en TODAS las peticiones, incluidas las públicas donde su resultado no
se usa.**
`src/proxy.ts:59`. Antes, `isPublicPath` cortocircuitaba **antes** de tocar la cookie; ahora toda petición
que pase el matcher paga una lectura de cookie y, si hay cookie, una **verificación de firma completa** — por
ejemplo un `POST /api/auth/login` de un visitante con una cookie caducada. Es **correcto y sigue siendo
fail-closed**, y el coste es pequeño, pero es coste nuevo en el camino crítico del edge, en cada petición.
*Arreglo (opcional):* calcular `authenticated` de forma perezosa, sólo cuando el destino sea una página de
auth o una ruta no pública.

**NB-4 — Los comentarios perdieron la unidad de medida para pasar el guardrail de valores en crudo.**
`account-band.variants.ts:9-14` (*"queda a 10 del techo … y a 2 con el puntero encima"*, *"una holgura de
30.88 … y son 48"*) y `ArchiveNav.tsx:52-55`. La compensación es una coletilla (*"todas las medidas van en
unidades de píxel de CSS"*), que funciona pero deja la prosa peor de lo que estaba. *Por qué importa:* el
guardrail está moldeando **comentarios**, no código, que es justo donde no aporta nada; el implementer lo
declara honestamente en la nota de campo de la deuda 43. *Arreglo:* que `no-hardcode.test.ts` ignore los
comentarios cuando se le tape el agujero de la lista fija (deuda 43).

**NB-5 — `GET /api/auth/me` se queda sin ningún consumidor en producción.**
Verificado con búsqueda en `src`: sólo lo nombran comentarios y un test del proxy. El endpoint sigue vivo y
con sus tests, y el informe explica y justifica la elección (§2 D2), que además es la que el propio
`acceptance` marcaba como *"opción de menor radio"*. **No es un incumplimiento** —el acceptance pedía dos
cosas incompatibles y se eligió la preferida, con el motivo escrito—, pero conviene que el leader lo
registre: hay un endpoint público sin llamadores. *Arreglo:* decisión de producto; ninguna acción en esta
slice.

**NB-6 — La banda no tiene nombre accesible propio ni landmark.**
`AccountBand.tsx:48-61`: un contenedor con `data-slot`, un `span` con el nombre y el botón de salida. Un
lector de pantalla lee el nombre suelto, sin decir que es la cuenta con la sesión abierta. `axe` no lo marca
(no es una violación), y el informe no lo declara ni como cobertura ni como limitación — es el único hueco
del §8 que sí se podía haber nombrado con los medios disponibles. *Arreglo:* un `aria-label` en el
contenedor, o que el nombre sea el nombre accesible del bloque. Va bien junto a la deuda 51, en la primera
validación visual.

**NB-7 — `progress/history.md` todavía no tiene entrada de esta sesión y la feature sigue en `in_progress`.**
Correcto en este momento (el volcado a `history.md` y el paso a `done` son el cierre del leader, no del
implementer), pero es el único checkbox de C5 que queda abierto. Se cierra con el informe de síntesis.

---

## 5. Recorrido de `CHECKPOINTS.md`

### C1 — El arnés está completo
- [x] Existen `AGENTS.md`, `init.sh`, `feature_list.json`, `progress/current.md`.
- [x] Existen los 3 docs de `docs/harness/`.
- [x] `bash ./init.sh` termina con **exit code 0** (salida en §1).

### C2 — El estado es coherente
- [x] Como mucho **una** feature en `in_progress`: sólo la #32. Verificado sobre `feature_list.json`.
- [x] Toda feature `done` tiene tests asociados que pasan (515 verdes, 0 rojos).
- [x] `progress/current.md` describe la sesión activa, sin basura de sesiones anteriores.

### C3 — El código respeta la arquitectura
- [x] Capas respetadas: UI sin DB, lógica en `features/auth/api/`, route handlers intactos, scoping por
      `userId` desde la cookie. El proxy conserva su grafo de imports mínimo.
- [x] Estructura feature-first (`src/{app,features,shared}`).
- [x] Sin dependencias nuevas.
- [x] Sin `console.log` sueltos ni TODOs sin contexto en los archivos tocados.
- [x] Sin secretos hardcodeados.

### C4 — La verificación es real
- [x] Cada módulo con lógica no trivial tiene al menos un test (banda, `getSessionUser`, layout de `(app)`,
      proxy, caparazón).
- [x] `pnpm lint` y el typecheck pasan (dentro de `init.sh`).
- [x] Tests verdes: **515 passed | 11 skipped (526)**, 49 archivos + 2 skipped.
- [x] **Condición doble ejecutada en las dos direcciones y REPRODUCIDA por el reviewer** en el gate nuevo
      (§2.2), con los números idénticos a los declarados.

### C5 — La sesión se cerró bien
- [x] No hay archivos sin trackear sospechosos: los sin trackear de `git status` son los reports de esta
      slice y de la anterior (deuda 46) y el directorio nuevo de la banda. Ningún `.tmp` ni artefacto de
      build fuera del `.gitignore`.
- [ ] `progress/history.md` **todavía sin entrada** de esta sesión → **NB-7**. Es el paso de cierre del
      leader, no del implementer. **No bloquea la aprobación de la implementación.**
- [x] La última feature trabajada está en su estado correcto: **`in_progress`**, no marcada `done` por el
      implementer (bien).

---

## 6. Deudas: honestidad del libro mayor

Revisadas las fichas que debían tocarse (19, 22, 23, 24, 29, 30, 31, 36) y las nuevas (49, 50, 51):

- **19** — corregida con razón: el enunciado viejo ("en tablet no se ve el nombre") inducía a la conclusión
  falsa de volver a meterlo en el archivero. La corrección (no había **ninguna** superficie entre 320 y 1179)
  es la verdad medible, y la prueba que cita existe y pasa.
- **22, 23, 24** — recalibradas, **siguen abiertas**, y ninguna se cierra en falso. La 22 gana un precedente
  ejecutable; la 23 aclara que lo destapado es el eje **horizontal**; la 24 documenta que el presupuesto no
  se movió (con test). Correcto.
- **29, 30, 36** — tachadas con el cómo, conservando el texto original. Las tres están de verdad saldadas y
  lo verifiqué en el código, no en la ficha.
- **31** — no aparece tocada. El informe explica por qué: el hallazgo del anillo de foco contra la cara de
  una hoja (2.92:1) **no es un defecto vigente** porque el control no se apoya ahí, y en vez de ampliar la
  ficha lo dejó **medido en un test** (`account-band.tokens.test.ts:287-295`), que es más fuerte que una
  ficha. Aceptable.
- **49, 50, 51** — honestas y **ninguna esconde un bloqueante**:
  - **49** (el logout que falla en silencio) describe una **señal de UI que falta**, no una decisión
    incorrecta: la decisión de no navegar es la correcta y está protegida por dos tests. La pieza que lo
    taparía (`AuthFormError`) está identificada. No bloquea.
  - **50** (la raíz pasa a dinámica y una lectura de base por carga) es un **precio medido en dos builds** y
    verificado por mí en el listado del build. Está declarado, con su arreglo natural y con el motivo de no
    haberlo hecho aquí (cambiar el contenido del JWT es el contrato de sesión de toda la app). No bloquea.
  - **51** (la banda no se ha visto con sesión real) es una **limitación física** de la slice: hacía falta
    una fila en `users` y tocar Neon estaba prohibido. No bloquea, y va bien junta con la 26.

---

## 7. Resumen para el leader

La implementación es **sólida y honesta**. Lo que la distingue de las rondas que se rechazaron antes:

1. **El gate nuevo deriva de verdad.** Ni una constante geométrica escrita a mano: el `cva` real, el `cn`
   real, los tokens reales de `globals.css` y `ARCHIVE_SLOTS` importado. Y **lanza** en vez de medir en verde
   cuando algo desaparece. Reproduje el rojo y salen los mismos números.
2. **No se invirtió ningún gate para que pasara.** El invariante de coste se conservó eligiendo la
   arquitectura (usuario resuelto en el servidor) en vez de reescribiendo la aserción, y se le **añadió** la
   contrapartida que faltaba.
3. **Los JSDoc dicen la verdad**, uno por uno, incluidos los tres reescritos.
4. **El archivero está intacto**, y no de palabra: `--bp-archive`, `--breakpoint-archive` y
   `--nav-tab-inset-end` no aparecen en el diff de `globals.css`, que sólo tiene adiciones.
5. **El guardrail se amplió, no se abrió**, y `next-path.ts` no se debilitó.
6. **El arreglo del proxy es seguro**: sólo páginas, firma verificada de verdad, destino fijo, y la pantalla
   de acceso sigue accesible con cookie inválida.

Antes de cerrar, al leader le corresponde: volcar la sesión a `progress/history.md`, marcar la #32 `done`,
escribir `progress/informs/11.informe-account_menu.md` y **fichar NB-1** en `progress/deudas.md`. NB-2 a NB-6
son mejoras opcionales.

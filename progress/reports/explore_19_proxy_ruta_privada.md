# Explore #19 — hacer `/` privada: qué se toca exactamente y qué se rompe

> **Encargo:** feature #19 `dashboard_ui`, enmienda **E1.1** de RFC-02 (§7-bis, `docs/design/rfc/RFC-02-dashboard.md:61-65`).
> **Pregunta única:** ¿qué hay que tocar para que `/` sea privada, y qué se rompe?
> **Alcance:** investigación pura. **No se modificó ni un archivo de `src/**`.**
>
> **Método y honestidad de las cifras.** Lo que dice "medido" se ejecutó de verdad en esta sesión y se
> transcribe la salida. Lo que dice "inferencia (no medido)" es lectura de código, no ejecución: no se
> pudo medir la caída de los tests porque medirla exige editar `src/proxy.ts`, que esta exploración tiene
> prohibido tocar.

---

## 0. Resumen ejecutivo (lo que hay que saber si sólo se leen diez líneas)

1. **El cambio de producción es UNA línea:** `src/proxy.ts:14`, quitar `"/"` del array. Nada más en `src/**`
   necesita cambiar para que `/` quede protegida.
2. **`/` YA vive dentro del grupo `(app)`** (`src/app/(app)/page.tsx`), envuelta por el `AppShell`. **No hay
   nada que mover.** El RFC ya la quiere donde está.
3. **Cae exactamente UN test**, y es uno solo de los 13: `src/proxy.test.ts:55-62`. Hay que **reescribirlo**,
   no recortarlo (deuda 29), y añadir el gate positivo que hoy no existe: *sin sesión, `/` redirige a
   `/login?next=/`*.
4. **Un segundo test NO cae pero cambia de significado** y hay que reescribir su enunciado:
   `src/proxy.test.ts:127-131` ("deja entrar al Dashboard, que es una página **como cualquier otra**").
5. **La afirmación de E1.1 sobre el circuito inverso ES CIERTA** y está implementada: `src/proxy.ts:70-72`,
   con gate propio en `src/proxy.test.ts:88-101`. **No es una suposición del que escribió la enmienda.**
   Se comprobó también que no se abre ningún bucle de redirecciones (§3.2).
6. **La ficha de la deuda 1 es exacta.** La referencia a la **deuda 13** de E1.1 **es falsa**: la deuda 13
   de `progress/deudas.md` es el interlineado del botón, saldada el 2026-07-31, y no tiene nada que ver.
   El "13" es un **id de feature** mal transcrito. Detalle y cadena de custodia en §5.

---

## 1. `src/proxy.ts` — anatomía completa

Archivo: **`C:\_dev\projects\knit-crochet\src\proxy.ts`** (93 líneas). Es el único archivo de producción que
decide público/privado.

### 1.1 Las tres listas

| Línea | Constante | Contenido hoy | Qué decide |
|---|---|---|---|
| `src/proxy.ts:11` | `PUBLIC_API_ROUTES` | `["/api/auth/register", "/api/auth/login"]` | endpoints sin sesión |
| `src/proxy.ts:14` | `PUBLIC_PAGES` | `["/", "/login", "/register"]` | **páginas sin sesión ← AQUÍ SE TOCA** |
| `src/proxy.ts:23` | `AUTH_PAGES` | `["/login", "/register"]` | páginas que **sobran** con sesión (deuda 36) |

Dos exports más, que son los destinos: `LOGIN_PATH = "/login"` (`src/proxy.ts:25`) y `HOME_PATH = "/"`
(`src/proxy.ts:26`). **Ninguno de los dos hay que tocarlo**: siguen siendo los destinos correctos después
del cambio.

### 1.2 Criterio de coincidencia: **igualdad exacta**, no prefijo

`isPublicPath` (`src/proxy.ts:28-33`):

```ts
function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/api/")) {
    return PUBLIC_API_ROUTES.includes(pathname);
  }
  return PUBLIC_PAGES.includes(pathname);
}
```

- La comparación es `Array.prototype.includes` sobre el `pathname` completo → **igualdad exacta**. El
  comentario de `src/proxy.ts:13` lo declara: *"igualdad exacta: todo lo demás es privado"*.
- **Consecuencia directa para #19:** quitar `"/"` de la lista **no arrastra a nada más**. `/projects`,
  `/yarns`, etc. nunca dependieron de esa entrada, porque `"/"` jamás actuó como prefijo. Cero radio de
  explosión sobre otras rutas. Es la propiedad que hace que el cambio sea de una línea.
- El único uso de prefijo en todo el archivo es `pathname.startsWith("/api/")`, y **sólo** para elegir
  entre las dos listas y entre las dos formas de rechazo.

### 1.3 Cómo trata `/api/**` frente a las páginas

Hay **dos ramas separadas** y las dos existen por el mismo motivo: un endpoint no puede recibir un
redirect. `unauthorized` (`src/proxy.ts:48-55`):

```ts
function unauthorized(request: NextRequest, pathname: string): NextResponse {
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }
  const loginUrl = new URL(LOGIN_PATH, request.nextUrl);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}
```

- **API sin sesión** → `401 application/json` con `{ error: "No autenticado." }`.
- **Página sin sesión** → `NextResponse.redirect` a `/login`, con `?next=<pathname pedido>`.

**Construcción del redirect, dato por dato:**

- La URL se construye con `new URL(LOGIN_PATH, request.nextUrl)`: **base = la request**, así que host y
  esquema son los reales del despliegue, no un literal.
- El `next` se escribe con `searchParams.set("next", pathname)`, o sea **sólo el pathname**: la query
  original y el fragmento de la ruta protegida **se pierden**. Es preexistente y no lo cambia #19, pero
  conviene saberlo: si mañana `/?year=2025` fuera un enlace repartido, el rebote por login lo devuelve a
  `/` pelado.
- `NextResponse.redirect` emite **307** (lo asierta `src/proxy.test.ts:42`).

**Medido** (script en scratchpad, ejecutado con node):

```
redirect url: https://test.local/login?next=%2F | pathname param: /
```

O sea: `/` sin sesión producirá literalmente `Location: https://<host>/login?next=%2F`, y el
`searchParams.get("next")` del lado receptor lee `/`. **Nada que codificar a mano.**

### 1.4 El orden de las tres decisiones (importa, y es fail-closed)

`proxy()` (`src/proxy.ts:57-83`) resuelve en este orden:

1. `src/proxy.ts:59` — **primero** calcula `authenticated` (verificación de firma del JWT, `hasValidSession`,
   `src/proxy.ts:35-46`; cookie ausente o firma inválida → `false`, nunca lanza).
2. `src/proxy.ts:70-72` — **con sesión + página de auth** → redirect a `HOME_PATH`. *(deuda 36)*
3. `src/proxy.ts:74-76` — **ruta pública** → `NextResponse.next()`.
4. `src/proxy.ts:78-80` — **sin sesión** → `unauthorized(...)`.
5. `src/proxy.ts:82` — resto (con sesión, ruta privada) → `NextResponse.next()`.

Quitar `"/"` de la lista mueve `/` del escalón **3** al escalón **4/5**. **No hay ningún escalón intermedio
que se salte**, y el paso 2 no le afecta (`/` no está en `AUTH_PAGES`).

### 1.5 El matcher ya cubre `/` — verificado, no supuesto

`src/proxy.ts:85-93`. El comentario de `src/proxy.ts:86-89` avisa de que debe ser literal inline (una
constante importada se ignoraría **en silencio**). La pregunta que importa aquí es si la regex casa con la
raíz, porque si no casara el proxy **ni siquiera correría** en `/` y el cambio de la línea 14 no haría nada.

**Medido** (misma corrida de node, aplicando `^…$` al literal del matcher):

```
matcher "/"              true
matcher "/login"         true
matcher "/register"      true
matcher "/projects"      true
matcher "/api/projects"  true
```

**`/` casa.** El grupo `((?!…).*)` acepta la cadena vacía y ninguna de las alternativas excluidas casa
contra vacío. **El matcher NO hay que tocarlo.**

### 1.6 El cambio, escrito

Única edición de producción necesaria, en `src/proxy.ts:13-14`:

```ts
/** Páginas accesibles sin sesión (igualdad exacta: todo lo demás es privado). */
const PUBLIC_PAGES = ["/login", "/register"];
```

Con esto `PUBLIC_PAGES` y `AUTH_PAGES` pasan a tener **el mismo contenido**. **Recomendación explícita: NO
las unifiques en una sola constante.** Son dos preguntas distintas —"¿la sesión es obligatoria?" vs "¿la
sesión sobra?"— y el comentario de `src/proxy.ts:16-22` está escrito precisamente para que nadie las funda.
Que hoy coincidan es una coincidencia del estado del producto (dos páginas públicas, y las dos son de
auth), no una identidad: el día que exista una página pública que no sea de auth (términos, recuperar
contraseña, una landing) la fusión produce un redirect que nadie pidió. Si se fusionan, **el comentario de
las líneas 16-22 pasa a mentir**, que en este repo es peor que no tenerlo (`progress/deudas.md:23-25`).

---

## 2. Todos los tests que cubren el proxy hoy

**Cobertura total del proxy = un solo archivo: `src/proxy.test.ts`** (153 líneas, 13 tests). Verificado por
barrido: `PUBLIC_PAGES|LOGIN_PATH|HOME_PATH|AUTH_PAGES|from "@/proxy"|proxy(` sobre `src/**` no devuelve
ningún otro consumidor de test. No hay e2e, no hay smoke de rutas (no existe script que levante el server y
haga peticiones; el `smoke` de `feature_list.json` significa "montar el componente", y los tres
`src/__smoke__/*.smoke.test.ts` van contra Neon/Cloudinary, no contra el proxy).

**Baseline medido** — `pnpm vitest run src/proxy.test.ts`, ejecutado en esta sesión:

```
 Test Files  1 passed (1)
      Tests  13 passed (13)
   Duration  2.92s
```

### 2.1 Inventario, con veredicto

| # | Línea | Qué asierta | Veredicto al quitar `/` |
|---|---|---|---|
| 1 | `src/proxy.test.ts:26-31` | `/api/projects` sin token → 401 + `{error:"No autenticado."}` | **intacto** |
| 2 | `:33-37` | `/api/projects` con token basura → 401 | **intacto** |
| 3 | `:39-46` | `/projects` sin token → 307 a `/login` con `next=/projects` | **intacto** (es el mecanismo que hereda `/`) |
| 4 | `:48-53` | `/api/auth/login` y `/api/auth/register` sin token → 200 | **intacto** |
| 5 | `:55-62` | **`["/", "/login", "/register"]` sin token → 200** | 🔴 **CAE** |
| 6 | `:64-68` | `/api/auth/me` (fuera de la allowlist) → 401 | **intacto** |
| 7 | `:70-78` | `/api/projects` y `/projects` con token válido → 200 | **intacto** |
| 8 | `:88-101` | con token, `/login` y `/register` → 307 a `/` (deuda 36) | **intacto** |
| 9 | `:103-116` | con token, `/login?next=//evil.example` → 307 a `/`, host propio, sin query | **intacto** |
| 10 | `:118-125` | con token, los dos endpoints de auth → 200 (no se redirigen) | **intacto** |
| 11 | `:127-131` | **con token, `/` → 200** | 🟡 **pasa, pero su enunciado deja de ser cierto** |
| 12 | `:134-140` | `/login` con cookie inválida → 200 | **intacto** |
| 13 | `:142-152` | el matcher cubre rutas y excluye assets | **intacto** |

> **Naturaleza del veredicto:** *inferencia (no medido)*. Se derivó leyendo las cinco ramas de `proxy()`
> (§1.4) contra las entradas de cada test. **No se ejecutó la suite con el cambio aplicado**, porque hacerlo
> exige editar `src/proxy.ts`. Las dos filas marcadas son las únicas cuyo camino por `proxy()` cambia:
> ningún otro test manda `"/"` como pathname, y ninguno depende de la longitud o el contenido de
> `PUBLIC_PAGES` de forma indirecta.

### 2.2 El que cae — `src/proxy.test.ts:55-62`, cómo reescribirlo

```ts
it("lets public pages through without token", async () => {
  // Sin sesión, las tres siguen siendo públicas: lo que cambia con la cookie
  // puesta son las dos de auth (deuda 36), no ésta.
  for (const path of ["/", "/login", "/register"]) {
    const response = await proxy(buildRequest(path));
    expect(response.status).toBe(200);
  }
});
```

**Qué protegía**, que es lo que hay que conservar antes de tocarlo (`progress/deudas.md:20-22` y el criterio
"reescribir CONSCIENTEMENTE… no borrarlos (deuda 29)" de `feature_list.json`, acceptance de la feature #32):
que **la puerta de entrada a la app se pueda abrir sin sesión**. Es el gate del bloqueo total: si alguien
pusiera de más en `PUBLIC_PAGES`, o vaciara la lista, nadie podría llegar nunca a autenticarse. **Ese
invariante sigue siendo necesario y no debe desaparecer del archivo** — sólo se le cae un elemento del
array. El comentario de las líneas 56-57 ("las **tres** siguen siendo públicas") pasa a ser falso y hay que
reescribirlo, no sólo el array.

**Reescritura mínima honesta = una edición + un test nuevo:**

- El test 5 se queda con `["/login", "/register"]` y su comentario pasa a decir que **son las dos únicas**
  páginas públicas, y por qué (sin ellas no hay forma de autenticarse).
- **Test nuevo, que es el gate de la deuda 1** y hoy no existe en ninguna forma: `/` sin token → **307**,
  `location.pathname === "/login"`, `location.searchParams.get("next") === "/"`. Es el gemelo exacto del
  test 3 (`:39-46`), que ya prueba el mecanismo para `/projects`; lo que el nuevo fija es que **`/` está
  dentro de ese mecanismo**, que es literalmente lo que la deuda 1 pedía y lo que hoy nadie vigila.
  Los tres valores están **medidos** en §1.3, así que se pueden escribir sin adivinar.

**Advertencia sobre la trampa fácil:** no basta con borrar `"/"` del array del bucle. Un test que sólo
enumere las páginas públicas nunca falla cuando alguien **vuelve a añadir** `"/"` a `PUBLIC_PAGES` — sólo
falla si alguien la quita de la lista de test. El gate que impide la regresión es el **positivo** (el que
exige el 307), y por eso es obligatorio. Sin él, #19 saldaría la deuda 1 sin dejar ninguna guardia viva, y
es exactamente el patrón "el test mide una cosa, el código hace otra" que este repo ya tiene fichado
(deuda 18, `progress/deudas.md:144-155`).

### 2.3 El que no cae pero miente — `src/proxy.test.ts:127-131`

```ts
it("deja entrar al Dashboard, que es una página como cualquier otra", async () => {
  const token = await signSessionToken({ userId: "user-1" });
  expect((await proxy(buildRequest("/", token))).status).toBe(200);
});
```

Sigue verde (inferencia, no medido: con sesión y `/` privada, `proxy()` cae al `NextResponse.next()` de
`src/proxy.ts:82` en vez del de `src/proxy.ts:75` — mismo status, distinta rama). **Pero cambia de
significado por completo:**

- **Hoy** protege que el redirect de la deuda 36 (`src/proxy.ts:70-72`) **no se pase de frenada** y agarre a
  `/`, que es una página pública que no es de auth.
- **Después** protege algo más valioso y más frágil: que **`/`, el destino del propio redirect de la deuda
  36, sea alcanzable con sesión**. Es el eslabón que impide un bucle (§3.2).

Vive dentro del `describe("con la sesión ya abierta (deuda 36)")` (`src/proxy.test.ts:88`), y ahí es donde
debe quedarse: sigue siendo el cierre del circuito de esa deuda. Lo que hay que reescribir es **el título y
el comentario**: "como cualquier otra" era cierto cuando `/` era pública; ahora `/` es una página privada
que además es el destino de un redirect, y el test prueba que ese destino no rebota. Reescribirlo es
barato y es justo la clase de reescritura consciente que pide la deuda 29.

### 2.4 Colateral fuera de `src/proxy.test.ts`

Un solo test cambia de estatus sin fallar: **`src/app/(app)/app-layout.test.tsx:71-80`**, *"entrega null
cuando no hay sesión"*. El layout de `(app)` (`src/app/(app)/layout.tsx:17-25`) llama a `getSessionUser()` y
baja `null` si no hay nadie. Con `/` privada, **ninguna request anónima puede llegar ya a ese layout**: el
proxy la desvía antes. El test sigue siendo correcto y **no hay que tocarlo** (es defensa en profundidad, y
el `AppShell` debe seguir tolerando `user: null`), pero su escenario deja de ser alcanzable en producción.
Anotarlo, no borrarlo. Consecuencia menor sobre `progress/deudas.md:743-747` (deuda 51): "el caso anónimo
del caparazón se comprobó contra servidor real" deja de ser un caso reproducible en navegador.

---

## 3. El circuito inverso — VERIFICADO EN EL CÓDIGO, no heredado

E1.1 afirma: *"Con sesión, `/login` sigue redirigiendo a `/`, así que el circuito cierra solo"*
(`docs/design/rfc/RFC-02-dashboard.md:63`). **Comprobado: es cierto.**

### 3.1 Está implementado y tiene gate

**Implementación** — `src/proxy.ts:70-72`:

```ts
if (authenticated && AUTH_PAGES.includes(pathname)) {
  return NextResponse.redirect(new URL(HOME_PATH, request.nextUrl));
}
```

Con `AUTH_PAGES = ["/login", "/register"]` (`src/proxy.ts:23`) y `HOME_PATH = "/"` (`src/proxy.ts:26`). El
comentario de `src/proxy.ts:61-69` documenta el porqué y cita la deuda 36.

**Gates que ya lo vigilan** (los tres pasan hoy, dentro de los 13 medidos):

- `src/proxy.test.ts:89-101` — con token, `/login` y `/register` → 307 con `location.pathname === "/"`.
- `src/proxy.test.ts:103-116` — el `?next=` **no** se honra al devolver (no se abre un redirector desde ruta
  pública): destino `/`, host propio, `search` vacío.
- `src/proxy.test.ts:118-125` — los **endpoints** de auth no se tocan.

**Ficha de la deuda 36** (`progress/deudas.md:388-396`): tachada, saldada por #32 el 2026-08-03, con las
tres decisiones de alcance escritas. Coincide punto por punto con el código. **La afirmación de E1.1 no es
una suposición: es un hecho verificable en `src/proxy.ts:70-72`.**

### 3.2 Y además NO se abre ningún bucle — los cuatro caminos

Esto es lo que E1.1 da por sentado con "cierra solo" y que conviene dejar escrito, porque un redirect que
apunta a una ruta que a su vez redirige es el fallo clásico de este cambio. Recorrido rama a rama de
`proxy()` (inferencia razonada sobre §1.4, no medido):

| Estado | Pide | Rama que gana | Resultado |
|---|---|---|---|
| **sin sesión** | `/` | `src/proxy.ts:78` (ya no es pública) | 307 → `/login?next=%2F` |
| **sin sesión** | `/login` | `src/proxy.ts:74` (sigue pública) | 200 ✅ **el bucle se corta aquí** |
| **con sesión** | `/login` | `src/proxy.ts:70` | 307 → `/` |
| **con sesión** | `/` | `src/proxy.ts:82` | 200 ✅ **y aquí** |

Los dos puntos de corte son precisamente los dos tests de §2.2 (el nuevo) y §2.3. **Si alguien quitara
`/login` de `PUBLIC_PAGES`, o `/` dejara de ser alcanzable con sesión, el bucle sería infinito** — por eso
esos dos gates dejan de ser decorativos después de #19.

### 3.3 El `?next=/` llega y se usa bien — verificado extremo a extremo

El circuito de vuelta pasa por tres piezas y ninguna necesita cambios:

1. **`src/app/(auth)/login/page.tsx:36-54`** — Server Component: lee `searchParams.next` y lo sanea con
   `resolveNextPath` **antes** de cruzarlo a cliente.
2. **`src/features/auth/ui/next-path.ts:50-58`** — `resolveNextPath`. **Medido** (node, aplicando el regex
   `INTERNAL_PATH` de `src/features/auth/ui/next-path.ts:18`): `"/"` → **`true`** (ruta interna válida);
   `"//evil"` y `"/\evil"` → `false`. O sea **`/` sobrevive la validación y no cae al `DEFAULT_REDIRECT`**
   (que además es también `"/"`, `src/features/auth/ui/next-path.ts:2`, así que el resultado sería el mismo
   por dos caminos).
3. **`src/features/auth/ui/LoginForm.tsx:92`** — `router.replace(resolveNextPath(next))`: vuelve a pasar la
   guarda donde ocurre la navegación.

**Consecuencia práctica útil para #19:** para `/` concretamente, el `?next=` es **redundante** (validado o
no, el destino es `/`). El circuito funcionaría igual sin él. No hay motivo para quitarlo —el mecanismo es
uniforme y quitarlo sería un caso especial— pero implica que **no hace falta ningún trabajo nuevo de
validación**: el criterio de aceptación de #31 que pedía validar el `?next=` ya está entregado y medido
(`src/features/auth/ui/next-path.test.ts`, `src/app/(auth)/auth-pages.test.tsx:150-168`).

También cierra el alta: `src/features/auth/ui/RegisterForm.tsx:38` documenta que **no** lee `?next=` y
navega a `/` — que a partir de #19 es una ruta privada a la que se acaba de ganar acceso. Correcto sin
tocar nada.

---

## 4. Qué hay hoy en `/` — **ya está dentro de `(app)`**

**Rutas de página existentes en todo el repo** (barrido `src/app/**/page.tsx`, tres resultados):

- `src/app/(app)/page.tsx` ← **la raíz `/`**
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/register/page.tsx`

**No existe `src/app/page.tsx`.** El contenido de `src/app/` es exactamente: `(app)/`, `(auth)/`, `api/`,
`globals.css`, `globals-css.test.ts`, `layout.tsx`.

### 4.1 Es un placeholder, no una landing

`src/app/(app)/page.tsx` son 12 líneas: un `h1` con `APP_NAME` y un párrafo con *"Gestiona tus proyectos de
tejido de dos agujas y crochet."* **No hay marketing, no hay enlaces, no hay CTA a registro, no hay
formularios.** No es una landing: es el hueco reservado para el Dashboard. #19 lo sustituye entero.

### 4.2 No hay nada que mover — y esto contradice una premisa del encargo

La pregunta contemplaba el caso "si `/` hoy vive FUERA del grupo `(app)`". **No es el caso.** `/` ya está
dentro y por tanto **ya la envuelve el `AppShell`**: `src/app/(app)/layout.tsx:17-25` resuelve la sesión con
`getSessionUser()` (Server Component) y la baja por props a `AppShellClient`. Es exactamente donde el RFC la
quiere (`docs/design/rfc/RFC-02-dashboard.md:52`, *"Página en `src/app/(app)/page.tsx`"*).

Esto es lo que dejó la feature **#13 `ui_shell_nav`** (`feature_list.json`, acceptance: *"route groups en
`src/app/`: `(app)/**` privado envuelto por AppShell… protección por `src/proxy.ts` existente"*). **La
carpeta ya decía "privado"; el proxy no.** Esa discrepancia entre el árbol de rutas y la allowlist **es** la
deuda 1, y por eso el arreglo es de una línea: la mitad estructural ya está hecha desde #13.

### 4.3 Ningún enlace público apunta a `/`

Barrido de `href="/"` en `src/**`: **un solo resultado**, `src/shared/ui/layout/ArchiveNav.tsx:94`, que vive
dentro del caparazón privado y sólo lo ve alguien con sesión. Las dos páginas públicas se enlazan
**entre sí y a nada más**: `src/features/auth/ui/LoginForm.tsx:103` → `/register` y
`src/features/auth/ui/RegisterForm.tsx:105` → `/login`. `src/app/(auth)/layout.tsx` no tiene enlaces ni
logo clicable. **No queda ni un enlace público muerto** al hacer `/` privada.

### 4.4 Nota de rendimiento heredada, ya fichada

La deuda 50 (`progress/deudas.md:726-741`) anticipó este cambio: *"cuando `/` deje de ser pública (deuda 1,
criterio de aceptación de #19) la mitad estática-vs-dinámica deja de tener sentido —una página privada no se
prerenderiza— y queda sólo la lectura"*. Sigue siendo exacta. Con `/` privada **desaparece el reproche de
"pasó de estática a dinámica"** (era inevitable) y queda vivo el otro: un `findById` contra Neon por carga
de página desde `src/app/(app)/layout.tsx:18`. **#19 no tiene por qué arreglarlo** (el arreglo propuesto,
meter el nombre en el JWT, cambia el contrato de sesión de toda la app), pero **la ficha 50 debería
actualizarse al cerrar #19** para tachar la mitad que deja de aplicar.

---

## 5. Las fichas de deuda: una exacta, una referencia falsa

### 5.1 Deuda 1 — **la ficha es exacta y sigue vigente**

`progress/deudas.md:31-33`:

> 1. ~~**`src/proxy.ts` `/` público vs. Dashboard privado** (#13)~~ → **convertida en trabajo rastreable**:
>    nota de scope + criterio de aceptación en la feature **#19 `dashboard_ui`** (quitar `/` de PUBLIC_PAGES,
>    Dashboard privado en `/`, test del proxy actualizado). Se resuelve al construir el Dashboard.

Comprobado punto por punto:

| Afirma | Estado real | ✓ |
|---|---|---|
| `/` sigue en `PUBLIC_PAGES` | `src/proxy.ts:14` lo lista | ✅ |
| hay nota de scope en #19 | `feature_list.json` #19, `description` | ✅ |
| hay criterio de aceptación en #19 | `feature_list.json` #19, `acceptance[4]` | ✅ |
| las tres acciones que pide | son exactamente §1.6 + §2.2 de este informe | ✅ |

**Confirmada en pantalla** además por el usuario el 2026-08-01 (`progress/deudas.md:574-575`: *"puedo estar
en el dashboard sin estar logueado"*). **La ficha no miente y no se ha quedado corta.**

Único matiz, y es una **ampliación**, no una corrección: la ficha dejaba abierta la opción *"landing pública
aparte si se quiere"* (la frase está en `feature_list.json` #19, `description`). **E1.1 la cierra: no hay
landing.** Al saldar la deuda 1 conviene dejarlo escrito, porque si no, la opción descartada sobrevive en la
ficha y alguien la reabre dentro de tres meses.

### 5.2 Deuda 13 — **la referencia de E1.1 es FALSA**

E1.1 dice **"Salda las deudas 1 y 13"** (`docs/design/rfc/RFC-02-dashboard.md:64`). La deuda 13 real,
`progress/deudas.md:79-96`:

> 13. ~~**⚠️ DEFECTO REAL: `leading-tight` se pierde en `buttonVariants`…**~~ → **SALDADA** (lote de higiene
>     2026-07-31).

Es el interlineado del botón perdido por `twMerge`. **Saldada hace más de una semana, con gate propio en
`src/shared/ui/primitives/button/button.variants.test.ts`, y no tiene ninguna relación con el proxy, con las
rutas ni con la sesión.** Tiene además descendencia viva (deudas 33 y 34, `progress/deudas.md:345`, `:363`)
que confirma de qué va.

**De dónde salió el error — la cadena de custodia, para que no se repita:**

1. La ficha de la deuda 1 termina con **`(#13)`** (`progress/deudas.md:31`). En ese archivo, `(#N)` al final
   del título es **el id de la FEATURE** en la que se detectó la deuda, no otra deuda. Se ve claro en la
   deuda 2 (`progress/deudas.md:34`), que también lleva `(#13)` y trata de otra cosa completamente, y en la
   3 (`progress/deudas.md:36`), que lleva `(#5)`.
2. **Feature #13 es `ui_shell_nav`** (`feature_list.json`), la slice que creó los route groups `(app)`/
   `(auth)` y dejó `/` dentro de `(app)` **sin** quitarla de `PUBLIC_PAGES`. Es decir: `(#13)` es la
   procedencia correcta de la deuda 1.
3. Ese `(#13)` se propagó a `feature_list.json` #19, que escribe **"NOTA DE SCOPE (deuda #13)"** en su
   `description` y **"resuelve la deuda de proxy #13"** en `acceptance[4]`. **Ahí ya está mal escrito**:
   convierte un id de feature en "deuda #13".
4. E1.1 leyó esa frase y la tradujo a **"salda las deudas 1 y 13"**, sumando una deuda que no existe.

**Qué hacer con esto** (es cosa del leader / de la ficha, no del implementer):

- **No** tachar la deuda 13 al cerrar #19. Ya está tachada por otro motivo y volver a tocarla corrompe el
  libro mayor.
- Corregir la frase de E1.1 a **"Salda la deuda 1"**, o a *"salda la deuda 1, abierta en la feature #13"* si
  se quiere conservar la procedencia.
- Corregir de paso las dos apariciones de `feature_list.json` #19 (`description` y `acceptance[4]`), que son
  la fuente del contagio y que el implementer va a leer como encargo.
- Precedente aplicable: `progress/deudas.md:23-25` (*"Que una ficha mienta es peor que no tenerla"*), y los
  dos casos ya documentados de fichas corregidas — la **18** (`progress/deudas.md:144-155`, "ficha
  desactualizada") y la **19** (`progress/deudas.md:156-170`, "la ficha se quedaba corta y por eso
  engañaba"). Aquí no miente la ficha: miente **la enmienda que la cita**. Es una variante nueva del mismo
  patrón y merece quedar escrita.

---

## 6. Lista de trabajo para el implementer de #19 (parte "ruta privada")

**Producción — 1 archivo, 1 línea:**

1. `src/proxy.ts:14` → `const PUBLIC_PAGES = ["/login", "/register"];`
   No fusionar con `AUTH_PAGES` (§1.6). No tocar `LOGIN_PATH`, `HOME_PATH`, `isPublicPath`, `unauthorized`,
   `AUTH_PAGES` ni el `matcher`.

**Tests — 1 archivo, 2 ediciones + 1 test nuevo:**

2. `src/proxy.test.ts:55-62` → quitar `"/"` del bucle **y reescribir el comentario de las líneas 56-57**
   (hoy dice "las tres siguen siendo públicas").
3. `src/proxy.test.ts` → **test nuevo**: `/` sin token → 307, `pathname === "/login"`, `next === "/"`.
   Valores **medidos** en §1.3. Es el gate de la deuda 1 y hoy no existe.
4. `src/proxy.test.ts:127-131` → reescribir título y comentario: de "una página como cualquier otra" a "el
   destino del redirect de la deuda 36 es alcanzable con sesión, y por eso no hay bucle" (§2.3, §3.2).

**Nada que tocar, y conviene decirlo explícitamente en el encargo para que nadie lo "arregle":**

- `src/app/(app)/page.tsx` — ya está en el grupo privado; #19 lo reemplaza por el Dashboard, pero **no se
  mueve de sitio**.
- `src/app/(app)/layout.tsx` y `src/app/(app)/app-layout.test.tsx` — intactos (§2.4).
- `src/features/auth/ui/next-path.ts` y sus tests — el `?next=/` ya está validado y **medido** (§3.3).
- `src/features/auth/ui/LoginForm.tsx`, `RegisterForm.tsx`, `AppShellClient.tsx` — sus destinos siguen
  siendo correctos.
- El `matcher` de `src/proxy.ts:90-92` — **medido** que ya cubre `/` (§1.5).

**Documental (leader):**

5. Tachar la deuda 1 en `progress/deudas.md` citando el test nuevo como prueba, y dejar escrito que la
   opción "landing pública aparte" queda **descartada** por E1.1.
6. Corregir "las deudas 1 y 13" en `docs/design/rfc/RFC-02-dashboard.md:64` y las dos apariciones de
   "deuda #13" en `feature_list.json` #19 (§5.2).
7. Actualizar la deuda 50 (`progress/deudas.md:726-741`): la mitad "estática vs dinámica" deja de aplicar.

---

## 7. Qué se midió de verdad en esta sesión

| Dato | Cómo |
|---|---|
| `src/proxy.test.ts` = **13 tests, 13 verdes, 2.92s** | `pnpm vitest run src/proxy.test.ts` |
| el matcher casa `/`, `/login`, `/register`, `/projects`, `/api/projects` | script node contra el literal de `src/proxy.ts:91` |
| `INTERNAL_PATH` acepta `"/"` y rechaza `"//evil"` y `"/\evil"` | script node contra el regex de `src/features/auth/ui/next-path.ts:18` |
| el redirect de `/` es `https://<host>/login?next=%2F` y se lee como `/` | script node reproduciendo `src/proxy.ts:52-53` |
| cobertura del proxy = **un solo archivo de test** | barrido de `from "@/proxy"` y `proxy(` sobre `src/**` |
| no existe `src/app/page.tsx`; sólo 3 `page.tsx` en el repo | barrido `src/app/**/page.tsx` |
| un solo `href="/"` en `src/**`, y está dentro del shell privado | barrido `href="/"` |

**Inferencias explícitas, NO medidas** (requerían editar `src/proxy.ts`, prohibido en esta exploración):

- que cae **exactamente** el test de `src/proxy.test.ts:55-62` y ningún otro;
- que `src/proxy.test.ts:127-131` sigue verde por la rama de `src/proxy.ts:82`;
- la tabla de los cuatro caminos de §3.2.

Las tres se derivan del orden de ramas de `proxy()` (§1.4) y de la propiedad de **igualdad exacta** de
`isPublicPath` (§1.2). **La primera corrida real de la suite tras el cambio es lo que las confirma**, y le
toca al implementer dejarla escrita en su report.

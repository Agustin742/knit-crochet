# explore_auth_register_client — diagnóstico del CLIENTE del alta (deudas 44 y 45)

**Alcance:** sólo el camino del navegador (`src/features/auth/ui/**` + los primitivos que consume).
Del servidor sólo se cita `src/shared/lib/http.ts` y `register/route.ts` para **contrastar la forma del
cuerpo**, no para diagnosticarlo. Todo es lectura de código: **no se ha ejecutado la app ni la suite**.

**Nota de método:** donde digo "no se puede determinar leyendo código" lo digo explícitamente; no hay
suposiciones disfrazadas de conclusión.

---

## 1. `RegisterForm.tsx` — qué hace exactamente con un 201

**Veredicto: SÍ navega, y SÍ llama a `router.refresh()`. La hipótesis "falta el `refresh()`" NO aplica.**

`src/features/auth/ui/RegisterForm.tsx:76-95`:

```tsx
    setFieldErrors({});
    setPending(true);
    const result = await postAuth(REGISTER_ENDPOINT, parsed.data);

    if (!result.ok) {
      setPending(false);
      if (result.status === EMAIL_TAKEN_STATUS) {
        const errors = { email: result.message };
        setFieldErrors(errors);
        // Mismo motivo que arriba: el 409 se pinta en el campo, así que es el
        // foco —y no una región viva— lo que lo hace audible.
        focusFirstInvalid(focusableFields, errors);
        return;
      }
      setFormError(result.message);
      return;
    }

    router.replace(DEFAULT_REDIRECT);
    router.refresh();
```

- **Método de navegación:** `router.replace` (no `push`), `RegisterForm.tsx:94`. El motivo está documentado
  en el gemelo `LoginForm.tsx:86-91`: con `replace`, el botón "atrás" no devuelve a la pantalla de acceso.
- **`router.refresh()`:** presente, `RegisterForm.tsx:95`, inmediatamente después. Es exactamente lo que
  hace que los Server Components se vuelvan a renderizar viendo la cookie nueva. **Este defecto concreto
  no existe aquí.**
- **Destino:** constante, `DEFAULT_REDIRECT`. `src/features/auth/ui/next-path.ts:1-2`:

  ```ts
  /** Destino por defecto tras iniciar sesión: el Dashboard (RFC-01 §2). */
  export const DEFAULT_REDIRECT = "/";
  ```

  **`resolveNextPath()` NO se usa en el alta** — sólo en `LoginForm.tsx:92`. Es deliberado y está escrito
  en la cabecera del componente (`RegisterForm.tsx:38-39`): *"No lee `?next=`: el proxy sólo lo escribe al
  desviar a `/login`, y a esta pantalla se llega por decisión propia. Éxito ⇒ Dashboard."*
- **`pending` se queda encendido en el camino feliz** (no hay `setPending(false)` antes del `replace`).
  Es intencional según el comentario gemelo de `LoginForm.tsx:89-91`. Efecto secundario relevante para el
  síntoma: **el botón se queda en estado "cargando" durante la navegación**; si la navegación aterriza en
  una página que se parece a la anterior, la lectura del usuario es "se quedó pensando y no pasó nada".

**Lo que este código NO hace y podría explicar la percepción del usuario:** no muestra ninguna confirmación
ni toca ningún estado de sesión del cliente. La única señal de éxito es la navegación en sí.

---

## 2. `auth-client.ts` — cómo se hace el POST y qué se hace con el 409

**Veredicto: el POST es correcto (mismo origen, cookies incluidas). El 409 NO se trata aquí: se propaga
crudo como `status` y quien decide es el formulario.**

`src/features/auth/ui/auth-client.ts:41-67`:

```ts
export async function postAuth(
  endpoint: string,
  payload: unknown,
): Promise<AuthRequestResult> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, status: 0, message: NETWORK_ERROR_MESSAGE };
  }

  // `ok` cubre el 200 del login y el 201 del register.
  if (response.ok) {
    return { ok: true };
  }

  return {
    ok: false,
    status: response.status,
    message: await readErrorMessage(response),
  };
}
```

- **`credentials`:** sí, `"same-origin"` (`auth-client.ts:49`). El endpoint es una ruta relativa del mismo
  origen, así que el `Set-Cookie` del 201 se acepta y las cookies viajan. Es redundante con el
  comportamiento por defecto de los navegadores modernos, pero **no es un fallo**.
- **Cómo distingue los status:** por `response.ok` (`:58`), o sea 200-299. Cubre el 200 del login y el 201
  del alta sin enumerarlos. Todo lo demás cae al `return` de error con el `status` numérico intacto.
- **Qué hace con un 409:** *nada especial*. Lo devuelve como `{ ok: false, status: 409, message }`. No hay
  ningún `if (status === 409)` en este archivo. La decisión está en el formulario (punto 3).
- **Sí lee el cuerpo**, y con la clave `error`. `auth-client.ts:14-29`:

  ```ts
  async function readErrorMessage(response: Response): Promise<string> {
    try {
      const body: unknown = await response.json();
      if (
        typeof body === "object" &&
        body !== null &&
        "error" in body &&
        typeof (body as { error: unknown }).error === "string"
      ) {
        return (body as { error: string }).error;
      }
    } catch {
      // Un 500 puede responder HTML: el mensaje genérico es la salida correcta.
    }
    return UNEXPECTED_ERROR_MESSAGE;
  }
  ```

  Si el cuerpo no es JSON o no trae `error: string`, **no rompe**: cae a `UNEXPECTED_ERROR_MESSAGE`.

---

## 3. El mapeo 409 → campo email: ¿existe de verdad y la clave coincide?

**Veredicto: SÍ existe, y SÍ coincide. No hay discrepancia de forma entre cliente y servidor.**

**El mapeo, por status y no por texto** — `RegisterForm.tsx:19` y `:82-89`:

```tsx
const EMAIL_TAKEN_STATUS = 409;
```
```tsx
      if (result.status === EMAIL_TAKEN_STATUS) {
        const errors = { email: result.message };
        setFieldErrors(errors);
        focusFirstInvalid(focusableFields, errors);
        return;
      }
```

La nota de `progress/current.md` es **exacta**: el cuerpo no dice el campo, el status lo decide todo.

**La clave del cuerpo** — `src/shared/lib/http.ts:9-16`:

```ts
export type ErrorBody = { error: string };

export function errorResponse(
  message: string,
  status: number,
): NextResponse<ErrorBody> {
  return NextResponse.json({ error: message }, { status });
}
```

Y el handler la usa tal cual — `src/app/api/auth/register/route.ts:26-28`:

```ts
    if (error instanceof EmailAlreadyRegisteredError) {
      return errorResponse(error.message, 409);
    }
```

El servidor emite `{ "error": "Ya existe una cuenta con ese email." }`
(`src/features/auth/api/errors.ts:1-6`) y el cliente lee `body.error`. **Coinciden.**

**Detalle que conviene tener claro:** aunque el cuerpo del 409 llegara vacío, malformado o con otra clave,
**el error se pintaría igual en el campo email**, sólo que con el texto genérico
`UNEXPECTED_ERROR_MESSAGE`. La rama depende del **status**, no del cuerpo. Es decir: *si en el navegador no
aparece NADA bajo el campo email, entonces la respuesta no fue un 409*.

**Dónde se pinta** — `Field` (`src/shared/ui/primitives/field/Field.tsx:45-51`) clona el control y le cablea
`aria-invalid` y `aria-describedby`; `AuthFormError` (`AuthFormError.tsx:21-31`) es sólo la región de
formulario (`role="alert"`), y en el 409 se queda **vacía a propósito** porque el mensaje va al campo.

---

## 4. ¿Hay validación de cliente que cortocircuite o se trague la respuesta?

**Veredicto: hay cortocircuito, pero SÓLO antes de enviar y sólo con errores de forma. No puede tragarse
un 409.**

`RegisterForm.tsx:55-74`:

```tsx
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    ...
    const parsed = registerSchema.safeParse({ name, email, password });
    if (!parsed.success) {
      const errors = toFieldErrors<RegisterField>(parsed.error);
      setFieldErrors(errors);
      focusFirstInvalid(focusableFields, errors);
      return;
    }
```

- **`preventDefault()`** (`:56`) es el normal: impide el envío nativo. El `<form>` declara `method="post"` y
  `noValidate` (`:116-118`) — el `noValidate` apaga los globos del navegador, no la validación de zod.
- **El `return` de `:73`** es el único cortocircuito, y ocurre **antes** del `fetch`. Sólo se dispara con
  nombre vacío / email mal formado / password <8 o >72 (`src/features/auth/validation.ts:14-30`).
- **Lo que se envía es `parsed.data`** (`:78`), o sea el email ya **normalizado (trim + minúsculas)** por
  `emailSchema` (`validation.ts:14-19`). El servidor aplica el MISMO schema (`register/route.ts:17`), así
  que **no hay divergencia de casing entre lo que el cliente comprueba y lo que el servidor busca**. Este
  candidato queda descartado del lado cliente.
- **`pending` / botón:** `Button` pone `disabled={disabled ?? loading}` y `aria-busy`
  (`src/shared/ui/primitives/button/Button.tsx:22-23`). Bloquea el doble envío mientras la petición está en
  vuelo; **no oculta errores**: en el camino de error `setPending(false)` se ejecuta *antes* de pintar
  (`RegisterForm.tsx:81`).
- **Un matiz real, menor:** `setFieldErrors({})` en `:76` limpia el error del campo justo antes de reenviar.
  Si el usuario ve el 409, no cambia el email y vuelve a pulsar, el mensaje **desaparece y reaparece**. No
  es un bug, pero puede leerse como "no valida" si el parpadeo coincide con una respuesta rápida.
  *No se puede determinar leyendo código si esto es perceptible; hay que verlo.*

**No hay ningún `try/catch` que se coma la respuesta.** El único `catch` del camino es el de red
(`auth-client.ts:53`) y el de parseo de cuerpo (`:25`), y ambos devuelven un mensaje visible.

---

## 5. Los tests: qué doblan, qué aseguran y qué NO

**Qué doblan** — `RegisterForm.test.tsx:12-28` y `:58-60`:

```tsx
const routerState = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: routerState.replace, refresh: routerState.refresh }),
}));
```
```tsx
beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
});
```

`auth-forms.test.tsx:27-35` dobla lo mismo (router + `next/link`) pero **no toca `fetch`**: sólo comprueba
`method="post"` y ausencia de `action`; no ejerce ningún camino de respuesta.

**El test del 409** — `RegisterForm.test.tsx:145-162`:

```tsx
  it("maps a 409 onto the email field and takes the focus there", async () => {
    const user = userEvent.setup();
    fetchSpy.mockResolvedValue(jsonResponse(409, { error: EMAIL_TAKEN }));
    render(<RegisterForm />);

    await fillValidForm(user);
    await submit(user);

    const email = screen.getByLabelText("Email");
    await waitFor(() => expect(email).toHaveAttribute("aria-invalid", "true"));
    const describedBy = email.getAttribute("aria-describedby");
    expect(screen.getByText(EMAIL_TAKEN)).toHaveAttribute("id", describedBy);
    expect(email).toHaveFocus();
    expect(screen.getByRole("alert")).toBeEmptyDOMElement();
    expect(routerState.replace).not.toHaveBeenCalled();
  });
```

con `jsonResponse` (`:34-39`) construyendo un `Response` real:

```tsx
function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
```

**Qué ASEGURA:** que *dado un 409 con cuerpo `{ error: string }`*, el componente marca el email como
inválido, asocia el mensaje por `aria-describedby`, mueve el foco al campo, no duplica el texto en la región
de formulario y no navega.

**Qué NO asegura:**

1. **Que el servidor devuelva 409.** El test del servidor
   (`src/app/api/auth/auth-routes.test.ts:119-130`) dobla el borde de datos y **asserta sólo el status**,
   nunca el cuerpo. Entre los dos tests **nadie ejercita Postgres de verdad** — es la deuda 46 literal.
2. **Que la pareja clave-emisor/clave-lector esté verificada por un test.** El doble escribe `{ error }` y
   `errorResponse` emite `{ error }`: **coinciden, pero por lectura de código, no por ninguna aserción**.
   Si mañana el servidor cambiara la clave, ningún test se pondría rojo (el 409 seguiría pintándose, con el
   texto genérico). **Es el patrón de las deudas 18/22/23/33/40/43 esperando a repetirse**, aunque hoy
   *no* esté disparado.
3. **Nada del `Set-Cookie`.** El doble del 201 (`:114`) es un `Response` sin cookie, y ningún test asserta
   `credentials` ni la persistencia de `kc_session`. La cadena "201 → cookie en el navegador → proxy la ve"
   **no la cubre ningún test**.
4. **Nada de lo que se ve tras navegar.** `routerState.replace` es un espía: se comprueba que se llamó con
   `"/"` (`:120`), no que `/` cambie de aspecto. **Justo el hueco de la deuda 44.**
5. **Nada del runtime de Next.** happy-dom + `vi.mock("next/navigation")` no ejercitan hidratación, caché
   del App Router ni el `proxy`. Un error de hidratación en el navegador dejaría `handleSubmit` sin cablear
   y **todos estos tests seguirían verdes**.

**Conclusión del punto 5: la pista de "forma del cuerpo distinta" se investigó y NO se confirma.** El doble
y `shared/lib/http` emiten la misma forma. El agujero real es otro: **el status nunca se ha observado
contra la base real**.

---

## Deuda 44: ¿(a) o (b)?

**Conclusión, sólo con el código: es (b) — navega, pero es imposible notarlo.** Tres hechos, cada uno
comprobable en el fuente:

1. **La navegación está escrita y es completa**: `router.replace("/")` + `router.refresh()`
   (`RegisterForm.tsx:94-95`). No falta el `refresh()`, que era la sospecha razonable.
2. **`/` es pública**: `src/proxy.ts:14` → `const PUBLIC_PAGES = ["/", "/login", "/register"];`. Con sesión
   y sin ella se sirve exactamente igual. (Deuda 1.)
3. **En `/` no hay un solo píxel que hable del usuario.** La página es
   `src/app/(app)/page.tsx:3-12`: un `h1` con el nombre de la app y un párrafo. Y el caparazón **no pide el
   usuario a propósito** — `src/features/auth/ui/AppShellClient.tsx:30-31`:

   ```tsx
   export function AppShellClient({ children }: AppShellClientProps) {
     return <AppShell background={<AsciiYarn />}>{children}</AppShell>;
   }
   ```

   con la cabecera (`AppShellClient.tsx:15-28`) diciendo que `GET /api/auth/me` y el logout **se recablean
   en #32**.

O sea: **aunque todo funcione perfecto, la pantalla resultante es idéntica a la de un invitado**. El
usuario está describiendo con precisión lo que ve; lo que ve no prueba que la sesión no exista.

**Qué observación lo confirma o lo refuta (en este orden, 30 segundos en DevTools):**

| Observación | Lectura |
|---|---|
| La barra de direcciones pasa de `/register` a `/` | **Navegó** → descarta (a) |
| Existe la cookie `kc_session` (Application → Cookies; nombre en `jwt.ts:3`) | **Sesión creada** → es (b) confirmada |
| `GET /api/auth/me` desde la consola devuelve 200 con el usuario | Sesión válida de punta a punta → (b) sin ninguna duda |
| La URL se queda en `/register` **y** el botón sigue en "cargando" | Entonces sí es (a): mirar la consola por una excepción y la pestaña Network por el status real |
| La URL pasa a `/` pero el contenido parece el de antes | Matiz de `replace`+`refresh` encadenados: **no se puede determinar leyendo código** si el `refresh` se descarta al solaparse con la navegación. Sólo se ve probando |

**Si sale (b) — que es lo que dice el código — el arreglo NO está en `RegisterForm`:** es priorizar **#32**
(menú de cuenta) y sacar `/` de `PUBLIC_PAGES` (deuda 1, criterio de #19). Tocar el formulario sería
parchear un síntoma que no tiene causa en el formulario.

---

## Deuda 45: ¿el cliente pinta el 409?

**Sí. El cliente pinta el 409 correctamente, y se puede afirmar con bastante confianza.** El razonamiento,
paso a paso:

1. `postAuth` no filtra por status: cualquier respuesta no-2xx sale con su `status` real
   (`auth-client.ts:62-66`).
2. `RegisterForm` compara ese status con `409` y **sólo con el status** (`RegisterForm.tsx:82`). No mira el
   texto, así que no puede fallar por un mensaje distinto.
3. El texto que pinta sale de `body.error` (`auth-client.ts:17-23`) y el servidor emite exactamente
   `{ error }` (`http.ts:15`). **Las claves coinciden.**
4. Y aunque no coincidieran, la rama del campo email se ejecuta igual: el mensaje sería el genérico, pero
   **habría mensaje**.

**Corolario operativo, y es el hallazgo útil de este informe:** si en el navegador el alta con un email
repetido **no muestra nada bajo el campo email**, entonces `POST /api/auth/register` **no está devolviendo
409**. El fallo estaría del lado servidor (o en los datos), no en el mapeo del cliente. Si devolviera 500,
el cliente pintaría el mensaje genérico en la **región de arriba** (`AuthFormError`), no bajo el campo — y
eso lo distingue a simple vista.

**Lo que NO puedo determinar leyendo código:** qué status devuelve realmente el servidor contra la base de
producción/desarrollo. Requiere la observación del primer paso de la deuda 45 (o el smoke test de la 46).

---

## Causas candidatas ordenadas por probabilidad

### A. (Deuda 44) La sesión se crea, se navega, y no hay nada que lo muestre — no es un bug del formulario
**Probabilidad: alta.** Sostenida por `proxy.ts:14` + `(app)/page.tsx` + `AppShellClient.tsx:15-31`.
**Arreglo mínimo:** ninguno en `RegisterForm`. Priorizar **#32** (menú de cuenta que lea
`GET /api/auth/me` y muestre el usuario) y, en #19, sacar `"/"` de `PUBLIC_PAGES`. Con cualquiera de las
dos, el síntoma desaparece solo.

### B. (Deuda 45) El servidor no devuelve 409 para el email duplicado
**Probabilidad: alta** — es la única explicación compatible con "el cliente mapea bien el 409" (probado
arriba) y "en pantalla no se rechaza".
**Arreglo mínimo:** **primero medir** (dar de alta dos veces y mirar status + cuerpo en la pestaña Network),
y sólo después tocar. Fuera de mi alcance decir dónde falla; los sitios donde puede fallar son
`register.ts:15-18` (el `findByEmail` previo) y el `create` que reventaría con el UNIQUE de Postgres
traducido como 500 (`register/route.ts:29`). **La deuda 46 (smoke real contra Neon) es lo que lo resuelve
de raíz, y conviene ANTES de tocar código.**

### C. (Deuda 45, variante de datos) Hay filas antiguas con el email sin normalizar
**Probabilidad: media-baja.** El cliente y el servidor normalizan a minúsculas (`validation.ts:14-19`), pero
`findByEmail` hace `eq(users.email, email)` — comparación **exacta** (`store.ts:33`). Una fila guardada con
mayúsculas antes de que existiera la normalización **no se encontraría**, y el alta pasaría a `create` →
o 201 espurio (si no hay UNIQUE efectivo) o 500 (si lo hay).
**Arreglo mínimo:** verificar en la base si hay emails con mayúsculas; si los hay, normalizarlos y
considerar un índice único sobre `lower(email)`. **No se puede determinar leyendo código**: hace falta mirar
los datos.

### D. La cookie del 201 no persiste en el navegador
**Probabilidad: baja.** `setSessionCookie` (`session.ts:54-68`) usa `secure: process.env.NODE_ENV === "production"`,
o sea **no** `secure` en desarrollo — que es lo correcto para `http://localhost`. `sameSite: "lax"`,
`path: "/"`, `httpOnly`. No veo nada que un navegador vaya a rechazar en local.
**Arreglo mínimo:** ninguno a priori; se descarta mirando Application → Cookies. Ojo si se probó contra un
despliegue con `NODE_ENV=production` servido por http: ahí la cookie `secure` se descarta en silencio y el
síntoma sería (a)-que-parece-(b). *No puedo determinar por dónde probó el usuario.*

### E. Error de hidratación que deja `onSubmit` sin cablear
**Probabilidad: baja, pero invisible para toda la suite.** Si React no hidrata, el `<form method="post">`
haría un envío nativo **a la propia página** (`/register`, sin `action`) y el resultado sería una recarga sin
efecto: cero mensajes, cero navegación — compatible con AMBOS síntomas a la vez.
**Arreglo mínimo:** ninguno hasta confirmar. Se descarta en un vistazo: consola del navegador limpia y una
petición `POST /api/auth/register` en la pestaña Network. **Si NO aparece esa petición, es esta causa y no
ninguna de las anteriores** — merece ser lo primero que se mire, aunque sea la menos probable.

### F. `replace` + `refresh` encadenados y el caché del App Router
**Probabilidad: baja para estos síntomas.** El `refresh()` está (`RegisterForm.tsx:95`), que es justo lo que
lo evita. Si el `refresh` se descartara por solaparse con la navegación, el efecto sería servir `/` con datos
cacheados — invisible hoy, porque `/` no muestra datos de sesión. **Se volverá relevante en cuanto #32
pinte al usuario.**
**Arreglo mínimo si se confirmara más adelante:** invertir el orden (`refresh()` y luego `replace()`), o
hacer el alta con una Server Action + `redirect()` (deuda 39), que elimina el problema por construcción.

---

## Resumen en una línea

El cliente del alta está **bien**: navega con `replace`+`refresh` a `/` y mapea el 409 al campo email por
status, con la misma clave `error` que emite el servidor. **La 44 es (b)** (la sesión no se ve porque nada
la muestra: #32 + deuda 1) y **la 45 no es del cliente** — si el 409 llegara, se pintaría; hay que medir qué
status llega de verdad, que es exactamente lo que pide la deuda 46.

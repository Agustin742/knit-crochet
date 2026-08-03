# impl — #31 `auth_ui`, acotada a las dos páginas de autenticación

> Implementer. Alcance recibido del líder: **login + register y nada más**. El cableado de la sesión en el
> caparazón (usuario + cerrar sesión en el `ArchiveNav`) queda fuera, pendiente de decisión del usuario.
> **Cero archivos de `src/shared/ui/**`, `AppShell*`, `ArchiveNav`, `globals.css` y `src/proxy.ts` tocados.**

---

## 1. Qué se construyó y dónde

### Archivos nuevos

| Archivo | Qué es |
|---|---|
| `src/app/(auth)/login/page.tsx` | Página fina: slot del ovillo ASCII + `<Suspense>` + `<LoginForm />`. `metadata` propia. |
| `src/app/(auth)/register/page.tsx` | Página fina: sólo `<RegisterForm />`. Sin ovillo (RFC-01 §2). `metadata` propia. |
| `src/app/(auth)/auth-pages.test.tsx` | Smoke + `axe` de las dos páginas; gate de "ovillo sólo en login" y de "ninguna página renderiza su propio `main`". |
| `src/features/auth/ui/LoginForm.tsx` | Formulario de acceso con estado, fetch y redirección. |
| `src/features/auth/ui/RegisterForm.tsx` | Formulario de alta con estado, fetch y redirección. |
| `src/features/auth/ui/AuthPanel.tsx` | Tarjeta compartida de las dos pantallas (título + subtítulo + formulario + pie). |
| `src/features/auth/ui/AuthFormError.tsx` | Error **a nivel de formulario** con región `role="alert"` (no existe primitivo en el design system). |
| `src/features/auth/ui/auth-client.ts` | `postAuth(endpoint, payload)`: POST JSON, lectura del `{ error }`, mensajes de red / genérico. |
| `src/features/auth/ui/field-errors.ts` | `toFieldErrors(zodError)`: issues de zod → mapa `campo → mensaje`. |
| `src/features/auth/ui/next-path.ts` | **`resolveNextPath()`: validación del `?next=`** + `DEFAULT_REDIRECT`. |
| `src/features/auth/ui/next-path.test.ts` | 7 casos, incluidos los maliciosos. |
| `src/features/auth/ui/LoginForm.test.tsx` | 11 casos (RTL + `user-event` + `axe`). |
| `src/features/auth/ui/RegisterForm.test.tsx` | 6 casos (RTL + `user-event` + `axe`). |
| `src/shared/lib/auth/password.constants.ts` | Las dos constantes de longitud de password, **sin `bcryptjs`**. |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/shared/lib/auth/password.ts` | Las dos constantes se mudan a `password.constants.ts` y se **reexportan** desde aquí: su superficie pública no cambia y ningún consumidor se entera. |
| `src/features/auth/validation.ts` | Importa las constantes del módulo sin bcrypt. Nada más: schemas, reglas y mensajes intactos. |
| `src/features/auth/ui/index.ts` | Exporta lo nuevo, conservando `AppShellClient`. |
| `progress/deudas.md` | Fichas **35** y **36** (nuevas, ver §5). |
| `progress/current.md` | Feature en curso + plan. |

**No tocados, a propósito:** `src/features/auth/ui/AppShellClient.tsx` y su test (los dos gates de `:87` y
`:101` siguen verdes y siguen siendo verdad: la app no cablea la sesión en el shell), todo `src/shared/ui/**`,
`src/app/globals.css`, `src/proxy.ts`, `src/app/(auth)/layout.tsx`.

---

## 2. Decisiones, con su porqué

### 2.1 Bundling de la validación — **se reusan los schemas del servidor**

El problema real: el **400** de los endpoints devuelve sólo el mensaje del primer issue de zod y **sin
`path`** (`shared/lib/http.ts`), así que con el cuerpo de la respuesta es imposible saber qué campo falló. La
salida es validar en cliente antes de enviar, donde zod sí da `issue.path`.

Reusar `@/features/auth/validation` desde el navegador significaba arrastrar su cadena de imports:
`validation.ts` → `@/shared/lib/auth/password` → `bcryptjs`. **Decisión: extraer las dos constantes a
`password.constants.ts`** (módulo sin dependencias) y dejar que `password.ts` las reexporte. El cliente
consume el mismo schema que el servidor, con **los mismos mensajes y las mismas reglas**, y su grafo de
imports ya no toca el módulo de hashing.

**Lo que medí, y hay que decirlo entero:** compilé el bundle **con el import antiguo** para comprobar el
coste, y **bcrypt no aparecía en los chunks de cliente tampoco así** — el bundler ya lo sacudía. O sea que
esto **no arregla un peso real hoy**; la advertencia del informe de exploración (§8) era teórica. Lo que sí
arregla es la dependencia: el grafo del cliente deja de apoyarse en que el tree-shaking siga acertando cuando
`password.ts` gane una función con efectos o cambie la versión del bundler. Alternativa descartada: escribir
un schema paralelo en `features/auth/ui/` que replicara los mensajes — dos fuentes de verdad para las mismas
reglas, que divergirían en el primer cambio de política de passwords.

Método de la medición (reproducible): tras `pnpm build`, buscar en `.next/static` la cadena `bcrypt` (y
`$2a$`, y `Illegal salt`) → **cero coincidencias**; buscar el mensaje `El email no es válido.` → **una**
coincidencia, o sea que la validación **sí** está en el bundle de cliente y la búsqueda distingue.

### 2.2 Validación del `?next=` — cómo se decide qué destino es interno

`resolveNextPath()` acepta el destino **sólo** si empieza por una barra que **no** va seguida de otra barra ni
de una barra invertida, y **no** contiene ningún carácter de control. Todo lo demás cae a `/`.

- Las **dos barras** (y la variante con barra invertida) son URLs *protocol-relative*: el navegador las
  resuelve contra el esquema actual, o sea que `//evil.example` acaba en `https://evil.example`. Es el caso
  que convierte la pantalla de acceso en un **redirector abierto**: el usuario se autentica en el sitio real
  y aterriza en el falso, con la sesión recién abierta.
- Las **absolutas** y los esquemas ejecutables (`javascript:`, `data:`) no empiezan por barra → fuera.
- Los **caracteres de control** se rechazan porque el navegador **los elimina** al normalizar una URL: una
  barra, un tabulador y otra barra se convierten en `//` **después** de haber pasado un control que sólo
  mirase el primer par de caracteres. Se comparan por código (`0x20` / `0x7f`), no con una clase de regex,
  para no escribir bytes de control en el fuente.
- El percent-encoding no necesita tratamiento aparte: `useSearchParams().get()` ya devuelve el valor
  decodificado, así que `next=%2F%2Fevil.example` llega como `//evil.example` y lo caza la misma regla.

**Verificado en las dos direcciones** (la "condición doble" que pide `current.md`):

| Manipulación | Resultado |
|---|---|
| Invertir la condición de guarda | **9 rojos**: 5 en `next-path.test.ts` + los 4 casos maliciosos de `LoginForm.test.tsx` |
| Quitar sólo la comprobación de caracteres de control | **1 rojo**, exactamente el caso de los caracteres de control |
| Restaurar | **verde** |

### 2.3 Dónde se pinta cada error

| Situación | Dónde se pinta | Por qué |
|---|---|---|
| Login, **401** | **Formulario** (`role="alert"`), nunca en el campo email | El servidor devuelve el **mismo** mensaje para email inexistente y password errónea, a propósito, para no confirmar qué emails están registrados. Marcar el campo email haría que la pantalla afirmara lo que el servidor se niega a decir. Hay assertion explícita de que **ni email ni password** quedan `aria-invalid`. |
| Register, **409** | **Campo email** | El cuerpo no dice qué campo falló; el status es la única señal y en ese endpoint sólo lo produce el email duplicado. Se asierta además que el error de formulario queda **vacío**. |
| **400** de zod (no debería llegar) / **500** / red caída | Formulario | El 400 sin `path` no se puede repartir por campos; se previene validando antes de enviar. |
| Reglas de formato/longitud | Campo, vía `Field error=…` | Salen del `path` de zod en el cliente. |

`AuthFormError` monta el contenedor `role="alert"` **siempre**, aunque esté vacío: si la región naciera junto
al mensaje, parte de los lectores de pantalla se pierden el anuncio. Es la pieza que `Field` no da (su
mensaje es un `span` asociado por `aria-describedby`, que no se anuncia al aparecer tras el envío).

### 2.4 Detalles del design system que había que respetar

- `Button` es `type="button"` por defecto → los dos submit llevan **`type="submit"` explícito** (asertado en
  los dos smoke tests) y `loading={pending}`, que ya da `disabled` + `aria-busy`.
- El formulario va sobre `Card` en su **variante por defecto (elevada)**, la única superficie donde el anillo
  de foco llega al mínimo de contraste (deuda 31).
- El mensaje de error de formulario usa el color de peligro sobre esa superficie: **4.86:1**, por encima del
  4.5 exigido (misma pareja de tokens que ya usa el mensaje de `Field`).
- `<form noValidate>`: sin él el navegador intercepta el envío con sus propios globos y nunca se llega a los
  mensajes en español de zod.
- No hay primitivo de enlace: los dos enlaces de pie usan `next/link` con utilidades por token, incluido el
  anillo de foco.
- **Cero clases inventadas y cero valores crudos.** Única utilidad que no sale de `globals.css`: el ancho
  máximo de la tarjeta, que usa la escala de contenedores del propio Tailwind (una variable de tema, no un
  número suelto); sin ella la tarjeta se estiraría a todo el viewport en desktop. `globals.css` está fuera de
  mi alcance, así que no se añadió un token nuevo.

### 2.5 Redirección: `replace`, no `push`

Tras el éxito se llama `router.replace(destino)` + `router.refresh()`. `replace` para que el botón "atrás" no
devuelva a la pantalla de acceso ya autenticado; `refresh` para que los Server Components vuelvan a
renderizarse viendo la sesión nueva. `pending` se queda encendido a propósito: apagarlo devolvería el botón a
"activo" durante la navegación.

**Register no lee `?next=`.** El proxy sólo escribe ese parámetro al desviar a `/login`
(`proxy.ts:29-31`), y a la pantalla de alta se llega por decisión propia. Éxito ⇒ Dashboard. Y **no encadena
un login**: el endpoint responde 201 y ya deja la cookie puesta (hay un test que asierta **una sola** llamada
a `fetch`).

### 2.6 El ovillo, montado en la página de login

Va en `login/page.tsx`, no en el layout de `(auth)`: en el layout aparecería también en register, que es justo
lo que el RFC-01 §2 prohíbe. Se sigue la receta del slot de `AppShell` sin reutilizar `AppShell` (traería el
archivero): contenedor decorativo, fuera del árbol accesible, sin capturar el puntero, absoluto sobre el
`main` —que el layout ya declara relativo— y en el token de z de fondo. La tarjeta va por encima con el z
base. En mobile la escena no se monta (`useViewportSupports3d`): es el comportamiento previsto, no un bug.

Ninguna de las dos páginas renderiza `<main>` — lo pone el layout — y hay un test por página que lo fija.

---

## 3. Verificación (evidencia real)

### `bash ./init.sh`

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  45 passed | 1 skipped (46)
      Tests  467 passed | 6 skipped (473)
   Duration  44.75s

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

### El delta, explicado uno a uno

Partida: **435 passed | 6 skipped** en 41 archivos. Llegada: **467 passed | 6 skipped** en 45 archivos.
**+32 tests, +4 archivos, 0 modificados, 0 borrados, 0 saltados nuevos.**

| Archivo nuevo | Tests | Qué cubre |
|---|---|---|
| `src/features/auth/ui/next-path.test.ts` | **7** | ruta interna aceptada · sin destino → `/` · absolutas · protocol-relative (dos barras y barra invertida) · esquemas ejecutables y rutas relativas · espacio delante · caracteres de control |
| `src/features/auth/ui/LoginForm.test.tsx` | **11** | smoke (roles, `type="submit"`, enlace) · validación en cliente sin llamar al endpoint · login OK con email normalizado + `replace("/")` + `refresh()` · **401 a nivel de formulario y NO en el campo email** · red caída · `?next=` interno respetado · **4 `?next=` maliciosos rechazados** · `axe` en reposo y con error |
| `src/features/auth/ui/RegisterForm.test.tsx` | **6** | smoke · validación en cliente (password corta) · **201 → redirige sin encadenar login** (una sola llamada a `fetch`) · **409 → campo email**, con el error de formulario vacío · 500 con cuerpo no-JSON → mensaje genérico · `axe` en reposo y con email duplicado |
| `src/app/(auth)/auth-pages.test.tsx` | **8** | login: smoke, ovillo presente/decorativo, sin `main` propio, `axe` · register: smoke, **sin ovillo**, sin `main` propio, `axe` |

### `pnpm build`

```
✓ Compiled successfully in 7.5s
...
├ ○ /login
└ ○ /register
```

Las dos rutas se prerenderizan como estáticas: la frontera de `<Suspense>` alrededor de `LoginForm` es lo que
lo permite pese al `useSearchParams` (sin ella, el build falla).

### Guardrails de clases

`src/app/globals-css.test.ts` + `src/shared/ui/canonical-tailwind-classes.test.ts` +
`src/features/auth/ui/AppShellClient.test.tsx`: **27 passed** en una corrida aparte. Los archivos nuevos
entran solos en el barrido canónico (recorre `src/**` por directorios) y usan la forma corta con paréntesis.
**Los dos gates de `AppShellClient.test.tsx` (`:87` y `:101`) siguen verdes y sin tocar.**

---

## 4. Cómo se dobló el borde en los tests

Sólo el borde, siguiendo el patrón de `AppShellClient.test.tsx`: `next/navigation` (router + `useSearchParams`
con un valor controlable), `next/link` (un ancla) y `fetch` (`vi.stubGlobal`). **El design system corre de
verdad** en los tres archivos de UI, así que los errores por campo se leen del `aria-invalid` /
`aria-describedby` que cablea `Field`, y `axe` mide el marcado real. En el test de páginas se dobla además
`@/shared/ui/three` (happy-dom no tiene WebGL, y el ovillo real ya tiene sus propios tests).

---

## 5. Deuda nueva registrada

- **35 — dos reglas de `validation.ts` sin mensaje, ahora visibles.** `.max(255)` del email y `.max(120)` del
  nombre no llevan segundo argumento, así que zod emite su texto por defecto **en inglés**. Antes sólo
  viajaba dentro de un 400 que nadie pintaba; desde #31 el formulario pinta `issue.message` bajo el campo.
  Escenario: pegar un nombre de más de 120 caracteres devuelve un mensaje en inglés en un formulario
  íntegramente en español. No lo arreglé porque toca el contrato de mensajes del endpoint desde una feature
  de UI.
- **36 — un usuario ya autenticado puede entrar a `/login` y `/register`.** El proxy declara las dos rutas
  públicas por igualdad exacta y no mira la cookie. Escenario: con sesión abierta, un marcador de `/login`
  muestra el formulario y un fallo de password responde "Email o contraseña incorrectos." **estando ya
  dentro**; peor, un alta desde `/register` sustituye la sesión en silencio. Se tapa en `src/proxy.ts`, que
  quedó fuera de mi alcance.

Ninguna de las fichas 3, 19, 22-31, 33 y 34 se tocó.

---

## 6. Qué quedó fuera (y por qué)

1. **El menú de cuenta en el caparazón** (mostrar el usuario, botón de cerrar sesión, `GET /api/auth/me` y
   `POST /api/auth/logout`): fuera por instrucción del líder, pendiente de decisión del usuario. Consecuencia
   práctica que conviene tener presente: **hoy no existe ninguna forma de cerrar sesión desde la interfaz**,
   y las deudas **29** y **30** siguen abiertas.
2. **Añadir un token de ancho de contenedor a `globals.css`** para la tarjeta: `globals.css` estaba fuera de
   alcance. Si el reviewer prefiere un token propio en lugar de la escala de Tailwind, es un cambio de una
   línea en `globals.css` más otro en `AuthPanel`.
3. **Mensajes en español de los dos `.max(...)`** (deuda 35) y **redirección del usuario ya autenticado**
   (deuda 36).
4. **Recuperar el query string y el hash del destino original**: el proxy sólo guarda el `pathname`
   (`proxy.ts:29-31`), así que no hay nada que recuperar desde el cliente. No es deuda de #31.
5. **Smoke manual en el navegador** (nivel 3 de `verification.md`, opcional): no ejecutado; hace falta una
   base de datos con datos, y la verificación exigida por el acceptance es la del SDD §9, que sí está.

---

## 7. Apéndice de cierre (tras la review: APROBADO, sin bloqueantes)

Review: `progress/reports/review_auth_ui_paginas.md`. Confirmó los 467|6 corriendo `init.sh`, el respeto del
alcance (3 archivos modificados en `src/`, los dos gates del caparazón intactos) y **dio por buena la
corrección al informe de exploración sobre `bcryptjs`**, midiéndola por su cuenta en las dos direcciones.

### 7.1 Corrección de un número mío: la condición doble del `?next=` da **12 rojos**, no 9

En §2.2 escribí "invertir la condición de guarda → 9 rojos". **El número correcto es 12** (7 de
`next-path.test.ts` + 5 de `LoginForm.test.tsx`). Re-medido en el cierre:

```
⎯⎯⎯⎯⎯⎯ Failed Tests 12 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  LoginForm.test.tsx > honours an internal ?next= destination
 FAIL  LoginForm.test.tsx > rejects a malicious ?next= (absoluta | protocol-relative |
                            protocol-relative con barra invertida | esquema ejecutable)
 FAIL  next-path.test.ts  > acepta la ruta interna que escribe el proxy
 FAIL  next-path.test.ts  > cae al Dashboard cuando no hay destino
 FAIL  next-path.test.ts  > rechaza URLs absolutas
 FAIL  next-path.test.ts  > rechaza URLs protocol-relative (las dos barras y la barra invertida)
 FAIL  next-path.test.ts  > rechaza esquemas ejecutables y rutas relativas
 FAIL  next-path.test.ts  > rechaza el destino con espacio delante (el navegador lo recorta)
 FAIL  next-path.test.ts  > rechaza caracteres de control, que el navegador elimina al normalizar
      Tests  12 failed | 6 passed (18)
```

**De dónde salió el 9:** la mutación que ejecuté no era la inversión literal de la guarda, sino una más
débil (dejaba pasar lo interno y lo de control por caminos cruzados), que no tumbaba los dos casos del
camino feliz. El resultado va **a mi favor** —la guarda está mejor cubierta de lo que declaré— pero los
números de una condición doble son justamente la evidencia de que el test mide lo que dice, así que quedan
como salen de ejecutarla. La otra medición de §2.2 (quitar sólo la comprobación de caracteres de control →
**1 rojo**, exactamente ese caso) se confirma sin cambios.

### 7.2 Deuda registrada en el cierre

- **37 — el HTML preestático de `/login` no contiene el formulario** (frontera de Suspense con relleno nulo +
  lector de parámetros de búsqueda). Medido en build limpio: el HTML de `/register` trae su elemento de
  formulario y el de `/login` no trae ninguno. Es un hallazgo de la review sobre mi propio diseño.
- **38 — los errores tardíos que van a `Field` no se anuncian ni mueven el foco** (validación en cliente de
  los dos formularios y el 409 de register). `AuthFormError` cubre bien 401/500/red, pero
  `RegisterForm.test.tsx:149` **fija con un test que la región viva queda vacía** en el 409.
- **36 quedó colgada de la feature #32** `account_menu`: el arreglo sólo existe en el proxy.

**Las 37 y 38 NO se arreglaron**: quedan pendientes de una decisión del usuario sobre si se cierran ahora o
más adelante.

### 7.3 Papeleo del cierre

`feature_list.json` → **#31 `done`** (#32 sigue `pending`, con la deuda 36 añadida a su `acceptance`);
`progress/deudas.md` → fichas 37 y 38 + la anotación de la 36; JSDoc de `src/app/(auth)/layout.tsx`
actualizado (decía que las páginas de login/register quedaban fuera de alcance, que ya no es cierto). El
comentario envejecido del nombre del gate en `AppShellClient.test.tsx:101` **se dejó intacto a propósito**:
lo arregla #32. **Verificación tras el papeleo: `bash ./init.sh` verde, 467 passed | 6 skipped** (sin cambio,
como debía ser: nada de lo tocado es código ejecutable salvo un comentario).

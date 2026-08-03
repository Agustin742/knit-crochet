# impl — los formularios de auth declaran POST (NB-1 de la review de las deudas 37/38)

> Ronda de arreglo **mínimo**, decidida por el usuario. #31 sigue `done`. Frontera de alcance intacta: **cero
> archivos de `src/shared/ui/**`, `AppShellClient.*`, `AppShell.tsx`, `ArchiveNav`, `globals.css` y
> `src/proxy.ts`**; los dos gates de `AppShellClient.test.tsx` (`:87`, `:101`) siguen verdes y sin editar.

---

## 1. El defecto, en una línea

Un formulario **sin método declarado no es un formulario que no se envía**: el HTML lo envía **por GET a la
URL actual**. Como los dos formularios de auth llevan `name` en sus controles, un envío nativo —el que ocurre
si alguien escribe y pulsa Enter **antes de que hidrate el JavaScript**— ponía la contraseña en la barra de
direcciones, y de ahí al historial, al `Referer` y a los registros de cualquier proxy o CDN que haya delante.
Es **CWE-598**.

**Lo habilitó el arreglo de la deuda 37**, que es la mejora: desde que el HTML de `/login` ya trae el
formulario, hay una ventana real —la que va del primer pintado a la hidratación— en la que el manejador de
React todavía no está enganchado y el navegador hace el envío nativo. Antes de aquella ronda esa ventana no
existía en `/login` porque no había formulario que enviar. `/register`, en cambio, arrastraba la misma forma
desde #31.

## 2. El arreglo

`method="post"` en el elemento de formulario de `LoginForm` y de `RegisterForm`, con un comentario que
explica por qué está ahí (si no, el siguiente que pase lo lee como ruido: "si el envío lo maneja
JavaScript, ¿para qué un método?").

No se convirtió nada a Server Action: ésa es la salida completa y queda **fichada como deuda 39**.

**Qué cambia y qué no**, dicho con precisión:

| | Antes | Después |
|---|---|---|
| Envío nativo (sin JS o pre-hidratación) | `GET /login?email=…&password=…` | `POST /login`, credenciales en el **cuerpo** |
| La contraseña queda en la URL / historial / `Referer` / registros | **Sí** | **No** |
| El acceso **funciona** sin JS | No | **No** (deuda 39) |
| Camino normal (con JS) | `fetch` desde el manejador | idéntico: `preventDefault` sigue cortando el envío nativo |

## 3. Corrección a lo que esperábamos encontrar: **no hay 405**

El encargo anticipaba que el peor caso pasaría a "un 405 inofensivo". **Medido: no es así.** En Next 16 una
página del App Router responde **200** a un POST y vuelve a pintar la pantalla:

```
POST /login  -> 200   URL pedida: http://127.0.0.1:3132/login
  el secreto aparece en la respuesta: 0 veces
```

O sea que el peor caso no es un error visible, sino **"parece que no pasó nada"**: el usuario ve otra vez el
formulario, vacío de datos, sin mensaje. Es peor en experiencia de lo que se esperaba y **exactamente igual
de bueno en seguridad**, que es lo que este arreglo iba a comprar: el secreto ya no viaja en la URL. Esa
diferencia —fuga irreversible contra confusión recuperable— es la que justifica el arreglo mínimo, y el
"parece que no pasó nada" es justo el escenario que la **deuda 39** deja escrito.

## 4. Evidencia contra un servidor real

Dos builds limpios (`.next` borrado) y `pnpm start`, con un valor de contraseña obviamente ficticio
(`CONTRASENA-FICTICIA-DE-PRUEBA`).

**ANTES** — el formulario servido no declara método, así que el navegador enviaría por GET:

```
== ANTES (código anterior)
<form noValidate="" class="flex flex-col gap-(--space-4)">      <- /login
<form noValidate="" class="flex flex-col gap-(--space-4)">      <- /register

GET /login?email=...&password=... -> 200
  la respuesta trae la pantalla: 1 formulario(s), heading: 1
```

Es decir: la petición que el propio formulario construye lleva el secreto en la línea de petición, y el
servidor responde 200 pintando la pantalla como si nada.

**DESPUÉS** — el formulario servido declara POST en las dos pantallas:

```
== DESPUES: método declarado en el HTML servido
<form noValidate="" class="flex flex-col gap-(--space-4)" method="post">   <- /login
<form noValidate="" class="flex flex-col gap-(--space-4)" method="post">   <- /register

== el envío nativo que ahora construye el navegador (POST a la URL actual, cuerpo urlencoded)
  POST /login  -> 200   URL pedida: http://127.0.0.1:3132/login
  el secreto aparece en la respuesta: 0 veces

== el envío que el formulario ya NO puede generar (GET con las credenciales en la URL)
  GET /login?email=...&password=... -> 200
  el secreto aparece en la respuesta: 1 veces
```

**Cómo hay que leer ese último bloque, porque es el punto delicado del informe.** Esa URL escrita **a mano**
sigue respondiendo 200: es una página, y los parámetros de búsqueda que no entiende los ignora. Eso no
cambia ni puede cambiar desde esta capa — cualquiera puede teclear cualquier URL. Lo que cambia, y es lo
único que importa, es que **el formulario ya no genera esa petición**: el navegador construye el envío a
partir del método declarado en el HTML servido, que ahora es POST. El discriminador honesto del antes/después
es el atributo del formulario servido (primer bloque) más el hecho de que el envío nativo no lleva ya nada en
la URL (`URL pedida: …/login`, sin query).

Detalle que refuerza la ficha: en la respuesta al GET, el secreto **se ve reflejado una vez** en el HTML (la
carga de navegación de Next repite la URL pedida). En la respuesta al POST aparece **cero** veces.

## 5. El gate y su condición doble

`src/features/auth/ui/auth-forms.test.tsx` (nuevo): un solo archivo que cubre **los dos** formularios, para
que la garantía no dependa de acordarse de repetirla en cada test. 4 tests: cada formulario declara POST, y
cada formulario **no** declara destino de envío propio (sin `action`, el envío nativo va a la página, no a un
endpoint que pudiera aceptarlo por accidente).

**Rojo** al quitar el atributo de los dos formularios:

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  auth-forms.test.tsx > … > LoginForm declara POST como método de envío
 FAIL  auth-forms.test.tsx > … > RegisterForm declara POST como método de envío
      Tests  2 failed | 2 passed (4)
```

**Verde** al reponerlo:

```
      Tests  4 passed (4)
```

Los dos formularios caen, no sólo uno: el gate cubre los dos, como se pidió.

## 6. Archivos

### Nuevos

| Archivo | Qué es |
|---|---|
| `src/features/auth/ui/auth-forms.test.tsx` | Guardarraíl del método de envío de los dos formularios (4 tests). |

### Modificados

| Archivo | Cambio |
|---|---|
| `src/features/auth/ui/LoginForm.tsx` | `method="post"` + comentario del porqué. |
| `src/features/auth/ui/RegisterForm.tsx` | Íd. |
| `progress/deudas.md` | Fichas **39**, **40**, **41** y **42** (ver §7). |
| `progress/reports/impl_auth_ui_deudas_37_38.md` | Apéndice §6 con las dos correcciones al informe anterior. |
| `progress/current.md` | Estado de la ronda. |

## 7. Deuda

Cuatro fichas nuevas, ninguna arreglada en esta ronda:

- **39 — el acceso sigue dependiendo de JavaScript.** La salida completa: convertir el envío en **Server
  Action**. Escenario escrito: pulsar Enter antes de que hidrate manda las credenciales a la propia página,
  el servidor responde 200 con la pantalla y el usuario ve que "no pasó nada", sin mensaje de error. Deja
  dicho por qué el arreglo mínimo no lo cubre (tapa la fuga, no hace que el acceso funcione) y que la
  verificación de esa slice es **pedir la página con el JavaScript desactivado**. Incluye el aviso de que la
  tercera vía que devolvería `/login` a estática (leer el destino en el manejador del envío) es
  **incompatible** con el acceso sin JS.
- **40 — el gate de la 37 no ve dentro de los componentes cliente** (NB-2 de la review). Escenario: una
  frontera de relleno nulo **dentro** de `LoginForm` o `AuthPanel` deja otra vez el HTML sin formulario con
  el gate en verde. Fichada, **no implementada**: no salía gratis —un guardarraíl de fuente nuevo necesita su
  propia condición doble y decidir qué hacer con las fronteras legítimas (una con esqueleto debe pasar)— y el
  encargo de esta ronda era el arreglo mínimo del envío.
- **41 — el foco se mueve antes de que el DOM tenga los atributos del error.** Dependencia de temporización
  entre `setFieldErrors` y `focus()`. Queda escrito que **no está medida con un lector de pantalla real** y
  que reproducirlo es el primer paso antes de tocar nada.
- **42 — `focus-first-invalid.ts` sin test propio y con retorno muerto.** Su orden ("el primer inválido en
  orden visual") sólo se prueba a través de formularios donde el orden del array y el del DOM coinciden, y el
  booleano que devuelve no lo lee nadie.

Las tres notas menores de la review me parecieron justas y están recogidas: las dos primeras como fichas 41 y
42, la tercera dentro de la 39.

Sigue abierta la **36** (usuario ya autenticado en `/login` y `/register`), colgada de la feature **#32**.

## 8. Verificación

```
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 Test Files  46 passed | 1 skipped (47)
      Tests  481 passed | 6 skipped (487)

[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**Delta: 477 → 481 (+4), 45 → 46 archivos (+1).** Todo el delta es el archivo nuevo
`src/features/auth/ui/auth-forms.test.tsx`:

| Test | Qué fija |
|---|---|
| `LoginForm declara POST como método de envío` | El envío nativo del login no puede ir por GET |
| `RegisterForm declara POST como método de envío` | Íd. en el alta |
| `LoginForm no declara un destino de envío propio` | Sin `action`, el envío nativo no alcanza ningún endpoint |
| `RegisterForm no declara un destino de envío propio` | Íd. |

Ningún test existente cambió de resultado ni de nombre: los 477 anteriores siguen verdes tal cual.

**`pnpm build`:**

```
✓ Compiled successfully in 17.4s
├ ƒ /login
└ ○ /register
```

**Clases:** no se tocó ninguna. El cambio es un atributo de HTML y un comentario. `globals-css.test.ts` y
`canonical-tailwind-classes.test.ts` corren dentro de `init.sh`, en verde. Ninguna clase de Tailwind con
comodines o inventada en código, tests, comentarios ni en este informe. Gestor de paquetes: **pnpm**.

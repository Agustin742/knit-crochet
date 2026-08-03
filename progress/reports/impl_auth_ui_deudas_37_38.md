# impl — deudas 37 y 38 (ronda de arreglo sobre #31 `auth_ui`)

> #31 sigue `done`: esto es una corrección sobre una feature cerrada, no una reapertura. Frontera de alcance
> intacta: **cero archivos de `src/shared/ui/**`, `AppShellClient.*`, `AppShell.tsx`, `ArchiveNav`,
> `globals.css` y `src/proxy.ts`**. Los dos gates de `AppShellClient.test.tsx` (`:87`, `:101`) siguen verdes
> y **sin editar**.

---

## 1. Deuda 37 — la pantalla de login llegaba sin formulario

### 1.1 Qué se eligió y por qué

**Salida (b): leer el destino en el Server Component y pasarlo como prop.** Descartada la (a) —esqueleto en
la frontera de Suspense— por una razón concreta: el esqueleto arregla la **percepción** (deja de verse un
hueco), pero el HTML sigue **sin formulario**, así que el caso peor de la ficha (*sin JS no hay pantalla de
acceso nunca*) quedaría abierto. Y el criterio de aceptación que puso el líder es literal: el HTML tiene que
**contener el formulario**. Con (a) no se cumple; con (b) sí.

**Precio, aceptado y declarado:** `/login` pasa de estática a dinámica (`ƒ` en la tabla del build).
`/register` sigue estática (`○`) porque no lee nada de la URL. Es el coste exacto de servir un HTML que ya
trae la pantalla: un render por petición de una página que no toca la base de datos.

**Efecto colateral bueno:** al no usar ya el hook de parámetros de búsqueda, **desaparece la frontera de
Suspense** entera. La página quedó más simple que antes del arreglo.

### 1.2 La condición innegociable: el destino sigue pasando por `resolveNextPath`

La guarda **no se movió de sitio**; ahora se aplica **dos veces**, y las dos están cubiertas por tests:

| Dónde | Qué hace | Por qué ahí |
|---|---|---|
| `src/app/(auth)/login/page.tsx` (servidor) | Sanea `searchParams.next` antes de entregarlo | Para que un destino hostil **ni siquiera cruce** la frontera servidor→cliente |
| `src/features/auth/ui/LoginForm.tsx` (cliente) | Vuelve a sanear justo antes de `router.replace` | El control tiene que vivir **donde ocurre la navegación**, venga el valor por donde venga. Si mañana alguien alimenta la prop desde otro sitio, la guarda sigue delante |

`resolveNextPath` es idempotente (`resolveNextPath(resolveNextPath(x)) === resolveNextPath(x)`), así que
aplicarla dos veces no cambia el resultado.

**Test explícito de que el destino hostil no sobrevive POR LA RUTA NUEVA**, que es lo que pidió el líder:

- `LoginForm.test.tsx` → *"rejects a malicious destination (…)"*, **5 casos**, entregando el valor hostil
  **directamente como prop**, o sea saltándose a propósito el saneo de la página: absoluta,
  protocol-relative, protocol-relative con barra invertida, esquema ejecutable y **carácter de control**
  (caso nuevo de esta ronda).
- `auth-pages.test.tsx` → *"no deja pasar un ?next= hostil (…)"*, **4 casos**, entrando por la URL al Server
  Component, incluido el parámetro **repetido** (que llega como lista y ya no es un string).
- Los 7 de `next-path.test.ts` siguen intactos.

### 1.3 Evidencia del criterio de aceptación (build limpio, las dos direcciones)

**ANTES** — reproducido a mano volviendo a la forma anterior (página estática + frontera de relleno nulo +
el hook en el formulario), `rm -rf .next && pnpm build`:

```
├ ○ /login
└ ○ /register
---
.next/server/app/login.html
elementos form en el HTML PREESTATICO de /login (ANTES): 0
elementos form en el HTML PREESTATICO de /register: 1
```

**DESPUÉS** — estado entregado, `rm -rf .next && pnpm build` + `pnpm start -p 3125`:

```
✓ Compiled successfully in 8.2s
├ ƒ /login
└ ○ /register

GET /login status=200
elementos form en la respuesta de /login (DESPUES): 1
      1 name="email"
      1 name="password"
      1 type="submit"
```

**Y el saneo, medido sobre el HTML servido de verdad:**

```
# GET /login?next=//evil.example
prop next entregada al formulario (hostil):
      1 next\":\"/
# GET /login?next=/projects/7
prop next entregada al formulario (interna):
      1 next\":\"/projects/7
```

> Nota honesta sobre un número que puede despistar: en el HTML de la petición hostil la cadena `evil`
> aparece **3 veces**. Las tres son de la carga de navegación de Next, que repite la URL pedida y la clave de
> segmento (`"login?next=%2F%2Fevil.example"`). El valor **entregado al formulario** es `"/"`, que es lo que
> se ve arriba y lo que decide la navegación.

### 1.4 Gate automático y su alcance real

`auth-pages.test.tsx` → *"no esconde el formulario tras una frontera de Suspense con relleno nulo"*: recorre
el árbol de elementos que **devuelve** la página y falla si alguna frontera de Suspense tiene relleno nulo o
ausente. Una frontera **con esqueleto** lo pasaría a propósito: lo que se prohíbe es el hueco vacío, no
Suspense.

**Alcance honesto, escrito también en el JSDoc del test:** mide la **composición** de la página, no el HTML
final. El mecanismo original (Next abandona el prerender del subárbol al encontrar el hook) **no es
reproducible en vitest**, porque con el router doblado no hay suspensión — un test que lo intentara quedaría
**verde en las dos direcciones**, que es exactamente el defecto que este proyecto ya tiene fichado cuatro
veces ("el test mide una cosa y el código consume otra"). Por eso la prueba del HTML es la de §1.3, con
build y servidor reales, y el gate cubre la causa estructural.

---

## 2. Deuda 38 — los errores de campo no se anunciaban

### 2.1 El arreglo

`src/features/auth/ui/focus-first-invalid.ts` (nuevo, 30 líneas): recibe los campos **en orden visual** con
sus referencias y el mapa de errores, y enfoca el primero inválido. Devuelve si movió el foco.

Se llama en los **tres** caminos que pintan error de campo:

| Camino | Archivo |
|---|---|
| Validación en cliente del login | `LoginForm.tsx` |
| Validación en cliente del register | `RegisterForm.tsx` |
| **409** de register (email duplicado) | `RegisterForm.tsx` |

No se llama en los errores de formulario (401, 500, red caída): ahí ya anuncia `AuthFormError`, y robar el
foco además sería ruido.

**No se duplica el mensaje en ninguna región nueva.** Al enfocar el control, el lector de pantalla anuncia
etiqueta + estado de invalidez + mensaje, porque `Field` ya cablea `aria-invalid` y `aria-describedby`. Por
eso el arreglo **no toca el design system**: son referencias y una llamada.

### 2.2 El test que protegía el silencio: qué se hizo con él

`RegisterForm.test.tsx:149` asertaba que la región viva queda **vacía** en el 409 y paraba ahí: fijaba el
silencio como si fuera la conducta deseada.

**Se reescribió, no se borró** — ahora se llama *"maps a 409 onto the email field and takes the focus
there"*:

- **Conserva** la garantía original: `expect(screen.getByRole("alert")).toBeEmptyDOMElement()` sigue ahí. Es
  una garantía real y hay que mantenerla: el 409 no debe duplicarse a nivel de formulario, porque entonces el
  mismo error se leería dos veces y se perdería la asociación con el campo.
- **Añade** la que faltaba: `expect(email).toHaveFocus()`, más la asociación del mensaje por
  `aria-describedby` que ya comprobaba.
- Su JSDoc explica por qué cambió, para que nadie lo lea dentro de seis meses como una regresión.

Traducido: antes el test decía *"no hay nada a nivel de formulario"*; ahora dice *"no hay nada a nivel de
formulario **porque el mensaje viaja con el foco**"*. La misma aserción, con la razón al lado.

---

## 3. Archivos

### Nuevos

| Archivo | Qué es |
|---|---|
| `src/features/auth/ui/focus-first-invalid.ts` | Mueve el foco al primer control inválido (deuda 38). |

### Modificados

| Archivo | Cambio |
|---|---|
| `src/app/(auth)/login/page.tsx` | Server Component asíncrono: recibe `searchParams`, sanea con `resolveNextPath`, entrega `next` por prop. Fuera el `Suspense` y su import. |
| `src/features/auth/ui/LoginForm.tsx` | Nueva prop `next` (`LoginFormProps`); fuera el hook de parámetros de búsqueda; referencias a los dos controles; foco al primer inválido. |
| `src/features/auth/ui/RegisterForm.tsx` | Referencias a los tres controles; foco al primer inválido en validación y en el 409. |
| `src/features/auth/ui/index.ts` | Exporta `LoginFormProps`. |
| `src/features/auth/ui/LoginForm.test.tsx` | Destino por prop en vez de por hook; caso malicioso nuevo (carácter de control); 2 tests de foco. |
| `src/features/auth/ui/RegisterForm.test.tsx` | Reescritura consciente del test del 409; test de foco en la validación. |
| `src/app/(auth)/auth-pages.test.tsx` | La página de login se resuelve como asíncrona; gate de la frontera de Suspense; seam del destino; 4 casos de `?next=` hostil por URL. |
| `progress/deudas.md` | **37 y 38 tachadas** con el cómo y el dónde. |

---

## 4. Verificación

### 4.1 `bash ./init.sh`

```
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  45 passed | 1 skipped (46)
      Tests  477 passed | 6 skipped (483)
   Duration  44.05s

[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
```

### 4.2 El delta, explicado uno a uno

Partida **467 passed | 6 skipped** → llegada **477 passed | 6 skipped**. **+10 tests, 0 archivos nuevos de
test** (todo cae en los que ya existían), 0 borrados, 1 **reescrito** (el del 409).

| Archivo | Antes | Ahora | Delta | Qué entró |
|---|---|---|---|---|
| `src/app/(auth)/auth-pages.test.tsx` | 8 | **14** | **+6** | gate de la frontera de Suspense con relleno nulo (1) · el destino interno viaja por el servidor hasta la redirección (1) · `?next=` hostil por URL (4: absoluta, protocol-relative, barra invertida, **parámetro repetido que llega como lista**) |
| `src/features/auth/ui/LoginForm.test.tsx` | 11 | **14** | **+3** | caso malicioso nuevo por prop (**carácter de control**) (1) · foco al primer inválido (1) · foco a la password cuando sólo ella es inválida (1) |
| `src/features/auth/ui/RegisterForm.test.tsx` | 6 | **7** | **+1** | foco al primer inválido en la validación en cliente (1). El del 409 **no suma**: se reescribió en su sitio |
| `src/features/auth/ui/next-path.test.ts` | 7 | 7 | 0 | intacto |
| Resto del repo | 435 | 435 | 0 | intacto |

### 4.3 Condición doble de cada gate nuevo (salida real, sin redondear)

**(A) Deuda 38 — el foco.** Mutación: anular `focusFirstInvalid` (la condición del bucle a falsa).

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  LoginForm.test.tsx > moves focus to the first invalid control after a failed submit
 FAIL  LoginForm.test.tsx > moves focus to the password when only the password is invalid
 FAIL  RegisterForm.test.tsx > maps a 409 onto the email field and takes the focus there
 FAIL  RegisterForm.test.tsx > moves focus to the first invalid control after a failed submit
      Tests  4 failed | 17 passed (21)
```

Restaurado:

```
 Test Files  2 passed (2)
      Tests  21 passed (21)
```

**(B) Deuda 37, causa estructural.** Mutación: reponer `<Suspense fallback={null}>` alrededor del formulario.

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  auth-pages.test.tsx > página de login > no esconde el formulario tras una frontera de Suspense con relleno nulo
      Tests  1 failed | 13 passed (14)
```

Restaurado: 14 verdes. (Los demás tests de la página siguen verdes bajo esta mutación **a propósito**: la
frontera no cambia a dónde redirige el formulario, sólo qué HTML se emite. Lo que se ve caer es exactamente
el gate escrito para eso.)

**(C) La guarda del `?next=` sigue cubierta después de cambiar de camino.** Mutación: invertir la condición
de `resolveNextPath`.

```
⎯⎯⎯⎯⎯⎯ Failed Tests 17 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  auth-pages.test.tsx > entrega al formulario el destino interno del proxy
 FAIL  auth-pages.test.tsx > no deja pasar un ?next= hostil (absoluta)
 FAIL  auth-pages.test.tsx > no deja pasar un ?next= hostil (protocol-relative)
 FAIL  auth-pages.test.tsx > no deja pasar un ?next= hostil (protocol-relative con barra invertida)
 FAIL  LoginForm.test.tsx > honours an internal destination handed over by the page
 FAIL  LoginForm.test.tsx > rejects a malicious destination (absoluta | protocol-relative |
                            protocol-relative con barra invertida | esquema ejecutable |
                            carácter de control)
 FAIL  next-path.test.ts > (los 7)
      Tests  17 failed | 29 passed (46)
```

Restaurado: **46 passed**. Sube de los 12 de la ronda anterior a **17** porque ahora el mismo defecto se ve
también desde la página. El caso del parámetro **repetido** se mantiene verde bajo esta mutación, y es
correcto: una lista no es un string, así que muere antes de llegar a la guarda.

### 4.4 `pnpm build`

```
✓ Compiled successfully in 8.2s
├ ƒ /login
└ ○ /register
```

`/login` es ahora dinámica: es el precio declarado de la salida (b).

### 4.5 Guardrails de clases

**No se tocó ninguna clase**: el arreglo es composición, referencias y foco. Aun así se ejecutaron
`src/app/globals-css.test.ts` y `src/shared/ui/canonical-tailwind-classes.test.ts` dentro de `init.sh`, en
verde. Ninguna clase de Tailwind con comodines o inventada en código, tests, comentarios ni en este informe.

---

## 5. Deuda

**Ninguna nueva.** Las **37** y **38** quedan **tachadas** en `progress/deudas.md` con el cómo, el dónde y la
prueba. Sigue abierta la **36** (usuario ya autenticado en `/login` y `/register`), colgada de la feature
**#32**, porque sólo se arregla en `src/proxy.ts`, que está fuera de esta frontera.

Dos cosas que conviene tener presentes, y que **no** son deuda porque son decisiones declaradas:

1. `/login` ya no es estática. Si algún día molesta, la vuelta atrás no es reponer la frontera vacía sino
   pasar el destino por otro canal — y esa vuelta tendría que traer su propia prueba del HTML.
2. El formulario sigue enviándose con JavaScript: el HTML ya **contiene** la pantalla de acceso, pero sin JS
   no se puede enviar. Convertirlo a Server Action está fuera del alcance de esta ronda y nadie lo ha pedido.
   ⚠️ **Esta frase es incorrecta. Ver el apéndice §6.1.**

---

## 6. Apéndice de corrección (tras la review de esta ronda: APROBADO, y un defecto real encontrado)

Review: `progress/reports/review_auth_ui_deudas_37_38.md`. Aprobó la ronda, reprodujo las tres condiciones
dobles y volvió a atacar el camino nuevo del `?next=` (61.440 casos generados + 23 peticiones contra un
servidor real, incluidas formas que sólo existen desde que hay salto servidor→cliente) **sin encontrar
fugas**. Encontró, en cambio, un defecto que esta ronda destapó, y dos errores de este informe.

### 6.1 Corrección: "sin JS no se puede enviar" es **falso**, y en la dirección tranquilizadora

Lo escribí en el §5.2 de arriba. Lo correcto es:

> Sin JS **sí** se envía — y ése es exactamente el problema. Un formulario sin método declarado se envía por
> **GET a la URL actual**, así que al pulsar Enter antes de que hidrate el JavaScript, el navegador ponía
> **la contraseña en la barra de direcciones** (y de ahí al historial, al `Referer` y a los registros de
> cualquier proxy o CDN). Es CWE-598, y lo **habilitó este mismo arreglo**: antes de él no había formulario
> en el HTML de `/login` que enviar.

Es el peor tipo de error de informe: afirma que algo es imposible cuando en realidad ocurre y además filtra
un secreto. Se tapó en la ronda siguiente declarando `method="post"` en los dos formularios; el resto (que el
acceso **funcione** sin JS) queda fichado como **deuda 39**. Evidencia y detalle:
`progress/reports/impl_auth_forms_post.md`.

### 6.2 Corrección: la tabla de archivos del §3 estaba incompleta

Falta **`src/app/(auth)/layout.tsx`**, que sí se modificó (sólo el JSDoc: decía que las páginas de login y
register quedaban fuera de alcance, lo que dejó de ser cierto al crearlas). El cambio en sí es correcto, pero
la lista de archivos tocados es donde el revisor decide dónde mirar: si miente por omisión, la review empieza
mal. La tabla completa de aquella ronda es la del §3 **más** esa fila.

### 6.3 Notas menores de la review, aceptadas

Las tres eran justas; las tres quedan fichadas en `progress/deudas.md` en vez de arregladas sobre la marcha:
**41** (el foco se mueve antes de que el DOM tenga los atributos del error: dependencia de temporización no
medida) y **42** (`focus-first-invalid.ts` sin test propio y con un valor de retorno que nadie consume). La
tercera —que `/login` podría haber seguido estática leyendo el destino en el manejador del envío— quedó
escrita **dentro de la ficha 39**, porque esa vía y el acceso sin JavaScript son incompatibles: conviene que
quien lo lea vea las dos a la vez.

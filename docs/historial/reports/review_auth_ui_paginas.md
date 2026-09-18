# Review — feature #31 `auth_ui` (acotada a login + register)

**Veredicto: APROBADO**

> Reviewer. Alcance revisado: las dos páginas de autenticación. El cableado de la sesión en el caparazón
> queda fuera por decisión del usuario (feature #32 `account_menu`) y **no se ha exigido**.
>
> **Todo lo que sigue lo he ejecutado yo.** No se ha copiado ni un número del informe del implementer.
> Higiene: cero nombres de clase de Tailwind escritos en este archivo (se describen en palabras).

---

## 0. Checkpoints

- **C1** [x] — `AGENTS.md`, `init.sh`, `feature_list.json`, `progress/current.md`, los tres docs de
  `docs/harness/` y `CHECKPOINTS.md` existen. `bash ./init.sh` termina en **exit code 0**.
- **C2** [x] — **una sola** feature en `in_progress` (#31; el paso a `done` lo hace el cierre del líder).
  `progress/current.md` describe la sesión activa, sin basura anterior.
- **C3** [x] — feature-first respetado; ninguna página ni componente toca Drizzle; ningún route handler se
  modificó; sin dependencias nuevas; **cero** console.log / TODO / FIXME en los archivos nuevos (verificado
  por grep sobre `src/app/(auth)`, `src/features/auth/ui` y `password.constants.ts`); sin secretos.
- **C4** [x] — lint verde, typecheck verde, **467 passed | 6 skipped** en 45 archivos. Cada módulo nuevo con
  lógica tiene test (directo en `next-path.ts`; a través de los formularios en `auth-client.ts`,
  `field-errors.ts`, `AuthPanel`, `AuthFormError`).
- **C5** [x] — sin artefactos sospechosos sin trackear; `progress/history.md` tiene entrada de la última
  sesión cerrada; #31 refleja su estado correcto.

---

## 1. Verificación ejecutada por el reviewer

### bash ./init.sh — corrido **dos veces**, verde las dos

```
Test Files  45 passed | 1 skipped (46)
     Tests  467 passed | 6 skipped (473)
[OK]    Entorno listo.
```

Baseline declarada: 435 | 6 en 41 archivos. Llegada: **467 | 6 en 45 archivos**. **El número del implementer
se confirma**: +32 tests, +4 archivos, ningún test borrado ni saltado nuevo.

### pnpm build

`Compiled successfully`. `/login` y `/register` aparecen como estáticas. (Ojo con el matiz del hallazgo
**NB-1**: "estática" no significa "con contenido".)

### Alcance — git status + git diff

Modificados en `src/`, **sólo tres**, y los tres mínimos:

| Archivo | Cambio real (leído en el diff) |
|---|---|
| `src/features/auth/ui/index.ts` | 7 líneas de export añadidas; `AppShellClient` conservado |
| `src/features/auth/validation.ts` | cambia la ruta del import de las constantes + comentario. **Schemas, reglas y mensajes idénticos** |
| `src/shared/lib/auth/password.ts` | las dos constantes salen a `password.constants.ts` y se reexportan |

**NO tocados, confirmado por git status:** todo `src/shared/ui/**`, `AppShell.tsx`, `AppShellClient.tsx` y
su test, `ArchiveNav`, `src/app/globals.css`, `src/proxy.ts` y `src/app/(auth)/layout.tsx`.

**Los dos gates de `src/features/auth/ui/AppShellClient.test.tsx` (`:87` y `:101`)**: el archivo no aparece
como modificado, los leí y siguen literalmente iguales, y están dentro de los 467 verdes. **Se cumple.**

---

## 2. Juicio 1 (el que importa) — la guarda del `?next=`

**No he encontrado ningún bypass.** No es un juicio por lectura: importé el módulo real
(`src/features/auth/ui/next-path.ts`) desde Node y lo ataqué.

**Método.** Para cada candidato calculo `resolveNextPath(valor)` y luego el origen de
`new URL(resultado, "https://app.example/login")` — que es el mismo modelo con el que el router de Next
decide si una navegación es interna o una salida del sitio. Cualquier origen distinto del de la app es fuga.

1. **Fuerza bruta**: los code points 0x0000 a 0x2FFF (12 288) inyectados en **cinco formas** distintas
   (segundo carácter con destino hostil detrás, primer carácter, carácter duplicado, y la variante con la
   barra invertida) = **61 440 casos**. Fugas: **0**.
2. **35 clásicos a mano**, varios de los cuales **no estaban en la lista del implementer**: barra invertida
   sola delante, barra invertida como primer carácter, la mezcla de barra invertida y arroba para falsificar
   el host, punto seguido de barra invertida, doble punto con doble barra, tres barras, el esquema con una
   sola barra ("https:/…") y el esquema sin barras ("https:evil…"), byte nulo, arroba delante del host, tres
   caracteres Unicode que se confunden con la barra (fracción, espacio de ancho cero, marca de orden de
   bytes), el carácter NEL de la zona C1, espacios delante y detrás, y el destino con interrogante y con
   almohadilla. Fugas: **0**.
3. **Ida y vuelta por el percent-encoding**, que es como llega de verdad: construyo la query, la decodifico
   con `URLSearchParams` (lo mismo que devuelve el lector de parámetros de Next) y de ahí a la guarda.
   Probado simple, **doble** (`%252F`), tabulador codificado en dos posiciones, el signo más que se convierte
   en espacio, la barra invertida codificada y el byte nulo codificado. Fugas: **0**.

**Por qué es completa y no una coincidencia.** La regla es "primer carácter barra, segundo carácter ni barra
ni barra invertida, y ningún carácter de control". El analizador de URLs sólo sale del origen actual si tras
la primera barra viene otra barra o una barra invertida; y los únicos caracteres que ese analizador
**elimina** antes de mirar (tabulador, salto de línea, retorno de carro, y los espacios y controles de los
extremos) están todos por debajo de 0x20, o sea dentro de la comprobación de caracteres de control. No queda
hueco por construcción, y la fuerza bruta lo corrobora.

**Condición doble reproducida por mí** (mutando el archivo, corriendo, y **restaurándolo**; comprobado con
`diff` contra la copia previa y con git status que el árbol quedó idéntico):

| Manipulación | Declarado | **Medido por mí** |
|---|---|---|
| Quitar sólo la comprobación de caracteres de control | 1 rojo, ese caso | **1 rojo**, exactamente el caso de caracteres de control. **Coincide** |
| Invertir la condición de guarda | 9 rojos | **12 rojos**: los **7** de `next-path.test.ts` + **5** de `LoginForm.test.tsx` (los 4 maliciosos **y** el del destino interno legítimo) |
| Restaurar | verde | **verde** (init.sh de nuevo 467 y 6 saltados) |

La discrepancia del segundo caso va a favor: la guarda está **más** cubierta de lo declarado. Ver **NB-4**.

**Conclusión: no es bloqueante. La guarda aguanta.**

---

## 3. Juicio 3 — quién tenía razón sobre bcryptjs: **el implementer**

Lo medí en las dos direcciones, con build limpio cada vez (borrando la carpeta de build y reconstruyendo):

| Estado de `validation.ts` | "bcrypt" en los chunks de cliente | "Illegal salt" | El mensaje de email inválido |
|---|---|---|---|
| **Actual** (importa `password.constants`) | **0 archivos** | 0 | **1 archivo** |
| **Revertido al import antiguo** (vía `password.ts`, que importa bcryptjs) | **0 archivos** | 0 | **1 archivo** |

La sonda **discrimina** (encuentra la validación en el bundle de cliente y no encuentra el hashing), así que
el cero no es un falso negativo del método. **El bundler ya sacudía bcryptjs fuera del cliente antes del
cambio**: la advertencia del §8 del informe de exploración era teórica, y el implementer midió bien y lo
declaró abiertamente en lugar de venderse el cambio. Se le apunta a favor.

La extracción **se sostiene igual** por lo que él argumenta: el grafo de imports del cliente deja de apoyarse
en que el sacudido acierte siempre. Y está **bien hecha**: `password.ts` reexporta las dos constantes, el
único consumidor real (`validation.ts`) no cambia de valores ni de mensajes, y el resto del repo no se entera
(grep de los dos identificadores sobre todo `src/`: sólo esos tres archivos). Cero regresión.

`validation.ts` y `next-path.ts` quedaron byte a byte como los dejó el implementer.

---

## 4. Juicio 4 — semántica de los errores. Correcta, y no filtra nada

| Caso | Dónde se pinta | Verificado |
|---|---|---|
| Login **401** | **Formulario**, región viva | `LoginForm.tsx:59-62` manda todo fallo al estado de formulario. `LoginForm.test.tsx:139-155` asierta el mensaje **y** que **ni email ni contraseña** quedan marcados como inválidos |
| Register **409** | **Campo email** | `RegisterForm.tsx:67-70` decide **por status**, no por el cuerpo — que es lo correcto, porque el cuerpo no dice el campo. `RegisterForm.test.tsx:137-151` comprueba además la asociación aria real del mensaje y que la región de formulario queda **vacía** |
| **400** de zod | No debería llegar; si llega, formulario | Se previene validando antes con **los mismos schemas del servidor**. `LoginForm.test.tsx:95-109` y `RegisterForm.test.tsx:89-106` asertan que el fetch **no se dispara** |
| **500** con cuerpo no-JSON / red caída | Formulario, mensaje genérico | `auth-client.ts:14-29` (el catch de la lectura JSON) y `:53-55`. Tests en los dos formularios |

**Fuga de información: ninguna.** El código nunca infiere "ese email no existe": el 401 no toca el campo
email en ningún camino, y el único mapeo a campo (409) es sobre un status que el servidor sólo emite para el
email duplicado, que es información que el usuario acaba de aportar. `auth-client.ts` no expone el status a la
UI para nada más que ese único condicional.

Detalle correcto y no obvio: el email se manda **ya normalizado** por el schema (`LoginForm.tsx:57` usa el
dato parseado, no el estado crudo), y hay test que lo asierta (`LoginForm.test.tsx:128-131`).

---

## 5. Juicio 5 — a11y de verdad

**Lo que está bien:**

- **Un solo landmark principal.** Ninguna de las dos páginas lo renderiza; lo pone el layout. Hay un test por
  página que lo fija (`auth-pages.test.tsx:52-56` y `:83-87`), y lo comprobé leyendo las dos páginas.
- **La frontera de Suspense está donde debe.** Es obligatoria por el lector de parámetros de búsqueda y
  envuelve sólo `LoginForm` (`login/page.tsx:34-36`). Register no la lleva porque no lee la query: correcto.
- **El error de formulario sí se anuncia.** `AuthFormError.tsx:23` monta el contenedor con rol de alerta
  **siempre**, vacío incluido, y sólo inserta el párrafo cuando hay mensaje. Es el patrón correcto: la región
  viva está registrada antes de que llegue el texto. El 401, el 500 y la red caída **se anuncian de verdad**.
- **Contraste verificado por cálculo**, no por confianza: peligro #c6432f sobre superficie elevada #fffdf6 da
  **4.86:1** — el número del informe es exacto y pasa el mínimo de 4.5. Sobre la superficie no elevada daría
  4.59, así que montar sobre la variante elevada de `Card` también estaba justificado.
- `axe` corre en los dos formularios **en reposo y en estado de error**, y en las dos páginas.

**Lo que NO está bien** (hallazgo **NB-2**, no bloqueante): el propio JSDoc de `AuthFormError` explica que
`Field` no anuncia errores tardíos… y luego **el 409 de register se manda a `Field`**. Es un error tardío,
posterior al envío, y no se anuncia ni mueve el foco. Lo mismo con los errores de validación en cliente de
los dos formularios. Detalle en §9.

---

## 6. Juicio 6 — el ovillo

**Correcto y protegido por test en las dos direcciones.** Está montado en `src/app/(auth)/login/page.tsx:26-32`
(la página), no en el layout — que sigue sin tocarse. `auth-pages.test.tsx:42-49` comprueba que en login está
y es decorativo; `:76-81` comprueba que en register **no está**, ni el componente ni el contenedor del slot.
Si alguien lo subiera al layout, ese segundo test cae. RFC-01 §2 respetado.

El contenedor sigue la receta del slot de `AppShell` sin arrastrar `AppShell` (que traería el archivero,
prohibido): oculto al árbol accesible, sin captura del puntero, absoluto sobre el landmark principal —que el
layout ya declara relativo— y en el token de z de fondo, con la tarjeta en el token de z base. Verificado
leyendo los dos archivos y los tokens de `globals.css` (los dos existen).

---

## 7. Juicio 7 — capas

- **`shared/ui` sigue siendo presentación pura**: no se tocó **ni un archivo** de esa carpeta, así que la
  regla de "no hace fetch" se conserva por construcción.
- **`AuthPanel`** es **legítimamente de auth**: su forma —título, subtítulo, formulario y pie con el enlace a
  la otra pantalla— es el contrato de estas dos pantallas concretas, no un primitivo. Bien colocado.
- **`AuthFormError`** es, en rigor, el `Alert` que el SDD §6 lista como pendiente en la carpeta de feedback de
  `shared/ui`. Colocarlo en la feature **es correcto hoy**: es lo que recomendó el explorador, no hay un
  segundo consumidor, y crear un primitivo del template portable pasa por el proceso del RFC-00. Queda como
  **nota NB-6**: candidato a promoción en cuanto aparezca el segundo consumidor.
- **Ubicación de la costura**: el fetch y la redirección viven en `src/features/auth/ui/`, y las páginas son
  finas (una compone dos cosas, la otra una). Es exactamente lo que pide el acceptance.
- Import de `@/features/auth/validation` **por ruta directa y no por el barrel** de la feature: es la
  excepción correcta y está justificada por escrito, porque el barrel arrastra la capa de datos.

---

## 8. Juicio 8 — deudas 35 y 36

**35 — bien descrita, y verificada línea por línea.** `validation.ts:18` (el máximo de 255 del email) y `:29`
(el máximo de 120 del nombre) no llevan segundo argumento: zod emite su texto por defecto en inglés. La ficha
lo cuenta con escenario concreto y explica por qué no se arregla desde una feature de UI (cambiaría el
contrato de mensajes del endpoint). **Aceptada.**

**36 — aplazarla es aceptable. La exclusión se sostiene.** Razonado, no concedido:

1. **El arreglo sólo existe en el proxy.** Verificado en `src/proxy.ts:11-23`: la allowlist decide si la
   sesión se **exige**, nunca si **sobra**, y el proxy es la única capa que ve la cookie httpOnly antes de
   renderizar. Intentarlo desde las páginas obligaría a un fetch de sesión más un redirect de cliente: más
   superficie, peor resultado y un parpadeo del formulario. Y `src/proxy.ts` estaba excluido por escrito.
2. **No es una vulnerabilidad.** No expone datos ajenos ni escala privilegios; el peor caso es confusión de
   sesión. Un open redirect sí lo habría sido, y ése **sí** se cerró en esta feature.
3. **El estado anterior era peor**: sin estas páginas, los redirects del proxy terminaban en 404.

Recomendación al líder: engancharla a #32, que es la slice que vuelve a tocar sesión, o a una slice de proxy;
no dejarla suelta.

---

## 9. Hallazgos

### Bloqueantes

**Ninguno.**

### No bloqueantes que merecen ficha en `deudas.md`

**NB-1 — El HTML preestático de `/login` no contiene el formulario.** La frontera de Suspense con relleno
nulo (`login/page.tsx:34`) más el lector de parámetros de búsqueda hacen que el prerender de la ruta salga
**vacío**. Medido, no supuesto: en el build limpio, el HTML preestático de `/register` contiene el elemento de
formulario y el de `/login` **no contiene ninguno** (la única aparición de la palabra "Entrar" es el título
del documento). **Escenario concreto:** un usuario al que el proxy desvía a `/login` desde el móvil con cache
fría y red lenta ve una **pantalla completamente en blanco** hasta que hidrata el JS — en móvil ni siquiera
aparece el ovillo, porque por debajo del umbral de tablet la escena no se monta. Sin JS no hay formulario
nunca. Y es la pantalla de entrada de toda la app. Además, el §3 del informe dice "las dos rutas se
prerenderizan como estáticas" **sin decir que la de login se prerenderiza vacía**: la afirmación es cierta y
la conclusión que sugiere, no. **Arreglo:** o un relleno con el esqueleto de la tarjeta, o leer el destino en
el Server Component por la prop de parámetros de búsqueda y pasarlo como prop al formulario (a costa de que
la ruta pase a dinámica). Si se hace lo segundo, **la validación tiene que seguir pasando por
`resolveNextPath`**.

**NB-2 — Los errores tardíos que van al campo no se anuncian ni mueven el foco.** El razonamiento de
`AuthFormError` es correcto y su ejecución también, pero **no cubre dos casos que son igual de tardíos**:
(a) los errores de validación en cliente de los dos formularios y (b) el **409** de register. Los dos van a
`Field`, cuyo mensaje —según su propio inventario y según el JSDoc de `AuthFormError`— **no es región viva**.
`RegisterForm.test.tsx:149` incluso **fija** que la región viva queda vacía en el 409, o sea que el silencio
está protegido por un test. Y en ningún camino se mueve el foco: se queda en el botón de envío. **Escenario
concreto:** una persona con lector de pantalla rellena el alta con un email ya registrado y pulsa "Crear
cuenta". El botón se desactiva y se vuelve a activar, y **no se anuncia absolutamente nada**: tiene que
recorrer el formulario campo por campo para descubrir que el email quedó marcado como inválido. Idéntico al
enviar el login vacío. **Arreglo pequeño:** tras un envío fallido, mover el foco al primer control inválido;
`Field` ya cablea la descripción accesible, así que al enfocar el campo el mensaje se lee solo. Son unas
pocas líneas y no toca `shared/ui`.

### No bloqueantes, sólo nota

**NB-3 — El enlace "Crear una cuenta" del login pierde el destino guardado.** `LoginForm.tsx:82` apunta a
`/register` a secas. Si el proxy desvió desde una ruta protegida y el usuario decide registrarse en vez de
entrar, aterriza en el Dashboard en lugar de donde iba. No es un fallo de seguridad (register no lee el
parámetro: `RegisterForm.tsx:14` sólo usa el destino por defecto) y la decisión de no leerlo está bien
argumentada. Si alguna vez se propaga, que pase por `resolveNextPath` **en los dos extremos**.

**NB-4 — Un número del informe no reproduce.** El §2.2 declara **9 rojos** al invertir la guarda; la
inversión literal da **12** (7 + 5). No cambia ninguna conclusión —va a favor— pero conviene que los números
de las condiciones dobles se escriban tal cual salen, porque son la evidencia de que el test mide lo que dice.

**NB-5 — Las clases del enlace están duplicadas literalmente** en `LoginForm.tsx:19-23` y
`RegisterForm.tsx:21-25`. Dos copias que divergirán en el primer retoque. Se unifican solas cuando exista el
primitivo de enlace del SDD §6.

**NB-6 — `AuthFormError` es candidato a promoción** a la carpeta de feedback de `shared/ui` (es el `Alert`
del SDD §6) en cuanto tenga un segundo consumidor. Hoy está bien donde está.

**NB-7 — Dos comentarios envejecidos, los dos en archivos que el implementer hizo bien en no tocar.** El
JSDoc de `src/app/(auth)/layout.tsx:5` sigue diciendo que las páginas de login y register quedan fuera de
alcance, y el nombre del gate `AppShellClient.test.tsx:101` sigue diciendo "hasta que la feature #31 las
cablee", cuando ahora las cablea #32. Que los arregle la slice que toque cada archivo (#32 para el segundo).

---

## 10. Resumen del veredicto

La única superficie de ataque nueva que nacía con esta feature —el redirector abierto por el parámetro de
destino— **está cerrada**, y lo he comprobado atacándola con 61 440 casos generados más 45 a mano, sin
encontrar ni una fuga; la condición doble de su test reproduce (exacta en una manipulación, más fuerte de lo
declarado en la otra). El alcance se respetó al pie de la letra: tres archivos modificados en `src/`, los
tres mínimos, y los dos gates del caparazón intactos y verdes. El contrato contraintuitivo de los errores
está bien resuelto y no filtra lo que el backend oculta a propósito. El ovillo está donde manda el RFC y hay
test que impide moverlo. Y en el punto donde el implementer contradecía al explorador, **el implementer tenía
razón y lo declaró en contra de su propio interés**.

Quedan dos defectos reales pero acotados —la pantalla de login que se prerenderiza vacía y los errores
tardíos de campo que no se anuncian— que merecen ficha y que no justifican devolver el trabajo.

**APROBADO.**

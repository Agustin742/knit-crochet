# Review — ronda de arreglo de las deudas 37 y 38 (sobre #31 `auth_ui`, ya cerrada)

**Veredicto: APROBADO**

> Reviewer, segunda pasada. Alcance revisado: **sólo esta ronda**. No se reaudita lo aprobado en
> `progress/reports/review_auth_ui_paginas.md` más allá de confirmar que no se rompió.
>
> **Todo lo que sigue lo ejecuté yo**: `init.sh`, `pnpm build`, un servidor de producción real, 61 440 casos
> de fuerza bruta por el camino nuevo y las tres mutaciones. Ningún número está copiado del informe.
> Higiene: cero nombres de clase de Tailwind en este archivo.

---

## 0. Verificación base

| Comprobación | Declarado | **Medido por mí** |
|---|---|---|
| `bash ./init.sh` | 477 \| 6 | **477 passed \| 6 skipped** en 45 archivos, exit **0**. Coincide |
| `pnpm build` | OK, `/login` dinámica | **OK**. `/login` sale como dinámica y **ya no genera HTML preestático**; `/register` sigue estática y sí lo genera. Coincide |
| Frontera de alcance | nada de `shared/ui`, `AppShell*`, `ArchiveNav`, `globals.css`, `proxy.ts` | **Confirmado por `git status`**: ni un archivo de esas rutas modificado. Los dos gates de `AppShellClient.test.tsx` (`:87`, `:101`) siguen ahí, **sin editar** y verdes |
| Estado del proyecto | #31 `done` | #31 **done**, #32 **pending**, **0** features en `in_progress` |

**Una discrepancia de declaración (no de código):** el informe §3 lista los archivos modificados y **omite
`src/app/(auth)/layout.tsx`**, que sí está modificado. Miré el diff: es **sólo JSDoc** (actualiza el
comentario envejecido que yo mismo señalé como NB-7 en la review anterior). Cambio correcto y bienvenido,
pero **la tabla de archivos del informe tiene que ser exhaustiva**: es precisamente el sitio donde un
reviewer confía. Nota, no hallazgo.

---

## 1. Juicio 1 — seguridad por el camino NUEVO: **no hay bypass**

La guarda en sí no se tocó: `src/features/auth/ui/next-path.ts` es **byte a byte idéntico** al que ataqué en
la ronda anterior (comprobado con `diff` contra mi copia). Lo nuevo es el **recorrido**: el valor entra por la
URL al Server Component, se sanea allí, cruza a cliente como prop y se vuelve a sanear antes de navegar. Ataqué
las dos puertas.

### 1.1 Fuerza bruta por el camino completo (lógica real)

Repliqué literalmente las dos líneas que deciden (`login/page.tsx:37-53` y `LoginForm.tsx:92`) sobre el módulo
real, y medí el origen resultante con el mismo modelo que usa el router:

- **61 440 casos**: code points 0x0000–0x2FFF inyectados en cinco formas distintas, pasando por
  página → prop → navegación. **Fugas: 0.**
- **Idempotencia comprobada, no asumida**: en los 61 440 casos, aplicar la guarda al valor que la página ya
  saneó nunca cambia el resultado. **Violaciones: 0.** El argumento del informe §1.2 se sostiene.

### 1.2 Formas que sólo existen ahora que hay salto servidor→cliente

Éstas son las que pedías, las que el implementer podía no haber pensado. **Ninguna pasa:**

| Forma | Resultado |
|---|---|
| Parámetro **repetido** (llega como lista) | `/` |
| Lista de un solo elemento hostil, lista vacía, lista anidada | `/` |
| Ausente, `undefined` explícito, `null`, cadena vacía | `/` |
| Número, booleano, `Symbol` | `/` |
| **Objeto con `toString` hostil** y **objeto con `valueOf` hostil** | `/` |
| **`String` como objeto** (no primitivo) envolviendo un destino hostil | `/` |
| **Array con `toString` hostil** | `/` |
| **Getter hostil** sobre la clave, y **getter que cambia entre lecturas** (intento de TOCTOU) | `/` y `/ok` — sin fuga |
| **Prototipo contaminado** (la clave vive en el prototipo, no en el objeto) | `/` |
| Clave con otra caja (`NEXT=`), clave con corchetes (`next[]=`) | `/` |

El mérito concreto está en `login/page.tsx:52`: `typeof requestedNext === "string" ? requestedNext : null`.
Ese `typeof` es lo que mata de golpe la lista, los objetos con conversión hostil y el `String` como objeto —
**antes** de que nada de eso pueda convertirse en una cadena. Y la guarda vuelve a comprobar el tipo por su
cuenta, así que hay redundancia real, no aparente.

### 1.3 Contra el servidor de producción REAL

No me quedé en la simulación: build limpio, `pnpm start`, y peticiones HTTP de verdad leyendo **la prop que
viaja en la carga serializada** (extraída con una expresión que verifiqué primero contra un caso interno
conocido, para no medir la URL que Next repite en el payload — que es justo la trampa que el informe advierte
en su nota honesta del §1.3).

**23 casos, 0 fugas.** Protocol-relative, absolutas con los dos esquemas, barra invertida simple y doble,
esquema ejecutable, `data:`, tabulador, salto de línea, byte nulo, espacio delante, arroba para falsificar
host, triple barra, vacío, relativa, parámetro repetido (dos formas), sin parámetro, clave con otra caja y
clave con corchetes → **todas entregan `"/"`**. El caso interno legítimo entrega `"/projects/7"`, así que la
sonda **discrimina** y el cero no es un falso negativo.

**Conclusión: el redirector abierto sigue cerrado. No hay bloqueante aquí.**

*(Curiosidad medida, y es segura: `next=/projects/../..//evil.example` pasa la guarda y el navegador lo
normaliza a una ruta del propio origen que empieza por doble barra. No sale del sitio — sólo produce un 404
interno. Lo dejo escrito para que nadie lo "descubra" luego y lo confunda con una fuga.)*

---

## 2. Juicio 2 — ¿la ficha 37 está legítimamente tachada?

**Sí, tacharla es correcto — pero el residuo que el informe describe en su §5 está mal caracterizado, y esa
parte sí necesita ficha propia.** Vamos por partes, porque la pregunta era exactamente ésta.

### 2.1 El escenario de la ficha 37 ya no reproduce. Medido

La ficha 37 decía dos cosas: *"pantalla en blanco hasta que hidrata"* y *"sin JS no hay formulario nunca"*.
Contra el servidor de producción real:

```
GET /login  ->  200
elementos form en la respuesta:   1
input con nombre email:           1
input con nombre password:        1
boton de envio:                   1
```

El HTML servido **trae la pantalla de acceso completa**. El escenario de la ficha está muerto. Tacharla es
legítimo, y **no** es el patrón de "ficha tachada con parte del defecto vivo" que cacé en el lote de higiene:
allí lo tachado seguía reproduciendo tal cual estaba escrito; aquí no.

### 2.2 Pero el residuo no es "no se puede enviar": es que **se envía mal**

El informe §5 lo cuenta así: *"el formulario sigue enviándose con JavaScript: el HTML ya contiene la pantalla,
pero sin JS no se puede enviar"*. **Eso es inexacto, y la inexactitud va en la dirección tranquilizadora.**
El elemento de formulario servido es:

```
<form noValidate="" class="...">
```

**Sin `action` y sin `method`.** En HTML eso no significa "no se envía": significa **enviar por GET a la URL
actual**. Y los controles llevan `name="email"` y `name="password"`. Lo comprobé contra el servidor real:

```
GET /login?email=ada%40example.com&password=lanaslindas-secreta  ->  200
(la pagina responde y vuelve a renderizar el formulario)
```

O sea: **la contraseña acaba en la barra de direcciones, en el historial del navegador y en la línea de
petición de cualquier registro, proxy o CDN que haya delante** (CWE-598). No autentica a nadie ni permite
tomar una cuenta, pero es una credencial en claro en un sitio donde no debe estar.

**Escenario concreto:** a alguien lo desvía el proxy a `/login` en un móvil con red lenta. Ahora —y ésta es
justamente la mejora de esta ronda— **ve el formulario antes de que hidrate el JS**. Escribe, pulsa Enter, y
como React todavía no ha enganchado el manejador, el navegador hace el envío nativo: recarga `/login` con su
contraseña en la query. Antes de esta ronda **esto era imposible en `/login`**, porque no había formulario que
enviar.

### 2.3 Honestidad por mi parte: esto es en parte una miss mía

Comprobé `/register`, y **tiene exactamente la misma forma desde #31**: su HTML preestático ya traía el
formulario sin `action` ni `method`, con `name="password"`. O sea que **el defecto de clase es previo y yo no
lo vi en la primera review**. Esta ronda no lo inventa: lo **extiende a `/login`**, que es la página a la que
el proxy manda a todo el mundo y donde la contraseña es una credencial ya existente.

Por eso **no lo trato como bloqueante de esta ronda**: no es una regresión introducida aquí, es un defecto
heredado cuyo alcance crece como efecto secundario de un arreglo que por lo demás está bien hecho. Pero **sí
exige ficha nueva** (ver **NB-1**) y **sí exige corregir la frase del §5**, porque tal como está escrita
invita a archivar el residuo como inocuo.

**Veredicto del juicio 2:** la **37 queda bien tachada**; el residuo se va a una ficha propia, no a una
reapertura de la 37. La salida definitiva (Server Action) es la que cierra las dos cosas a la vez.

---

## 3. Juicio 3 — las tres mutaciones, reproducidas

Mutando, corriendo y **restaurando**; los tres archivos quedaron comprobados con `diff` contra la copia previa
y el árbol volvió a **51 passed** en los seis archivos de auth.

| Mutación | Declarado | **Medido por mí** |
|---|---|---|
| **(A)** anular el movimiento de foco | 4 rojos | **4 rojos, y son exactamente los cuatro que nombra**: los dos de login, el del 409 y el de la validación de register. **Coincide** |
| **(B)** reponer la frontera de Suspense con relleno nulo | 1 rojo | **1 rojo**, exactamente *"no esconde el formulario tras una frontera de Suspense con relleno nulo"*. **Coincide** |
| **(C)** invertir la guarda del destino | 17 rojos | **17 rojos**, y la lista de nombres coincide una a una: 4 de la página, 6 de `LoginForm` y los 7 de `next-path`. **Coincide exactamente** |

Los 12 de la ronda anterior suben a 17 porque el mismo defecto se ve ahora **también desde la página**: la
cobertura creció con el camino nuevo, que es lo que uno quiere ver cuando una guarda cambia de recorrido.

Confirmo además la observación honesta del informe: bajo (C) el caso del **parámetro repetido sigue verde**, y
es correcto — una lista muere en el `typeof` de la página y nunca llega a la guarda. Que el implementer lo
anticipe y lo escriba en vez de esconderlo es exactamente lo que hay que hacer con un test que no discrimina.

---

## 4. Juicio 4 — ¿basta el gate de la 37?

**Sí, con matices, y la decisión de no forzar un test del HTML es la correcta.**

El argumento del implementer es verificable y lo verifiqué: con el router doblado no hay suspensión que
reproducir, así que un test que renderizara la página en el entorno de pruebas y buscara el formulario saldría
**verde con y sin el arreglo**. Eso es un test que miente, y este repositorio ya tiene cuatro fichas de
exactamente ese fallo. Preferir un gate honesto sobre la **causa estructural** y dejar la prueba del HTML como
evidencia de build+servidor es el intercambio correcto.

**Lo que se le escapó no es una forma mejor de asertar el HTML, sino un límite del recorrido** (ver **NB-2**):
`collectSuspenseBoundaries` inspecciona el árbol que **devuelve la página**, y `LoginForm` aparece ahí como un
elemento sin hijos. Si mañana alguien mete una frontera de relleno nulo **dentro** de `LoginForm` o de
`AuthPanel`, el gate no la ve y el defecto vuelve con el test en verde.

Sobre "una forma de asertar el HTML de verdad": la habría —comprobar la salida de `pnpm build` o levantar el
servidor y pedir la página— pero ahora que `/login` es **dinámica** ya no hay HTML preestático que mirar en
disco, así que exigiría un servidor real dentro de la suite. Eso es un test de extremo a extremo, y este
proyecto no tiene esa capa. **No hay una tercera vía barata que se le haya pasado.** La evidencia de §1.3 la
reproduje entera y sale como dice.

---

## 5. Juicio 5 — el test del 409: la garantía vieja **sigue entera**

Comparé la versión nueva (`RegisterForm.test.tsx:145-162`) con lo que asertaba la vieja. **No se perdió nada:**

| Aserción original | ¿Sigue? |
|---|---|
| El campo email queda marcado como inválido | **Sí** (`:154`) |
| El mensaje del 409 está asociado al campo por descripción accesible | **Sí** (`:155-156`) |
| **La región de formulario queda vacía** (el 409 no se duplica) | **Sí** (`:160`) — que era el punto en discusión |
| No se redirige | **Sí** (`:161`) |
| *(nuevo)* el foco está en el campo del error | **Sí** (`:158`) |

Es una reescritura **aditiva**: misma garantía, más una. Y el JSDoc explica por qué cambió, que es lo que
evita que dentro de seis meses alguien lo lea como una regresión. Bien hecho, y bien que no se borrara.

---

## 6. Juicio 6 — `/login` pasa a dinámica: ¿está bien pagado el precio?

**Sí, el precio es asumible. Pero el informe lo presenta como inevitable, y no lo era.**

Lo que cuesta de verdad, más allá de lo que dice el informe:

1. **No toca la base de datos** — confirmado: la página sólo lee los parámetros de búsqueda y llama a una
   función pura. Cero consultas, cero secretos, cero espera de red en el servidor.
2. **Lo que sí cuesta y el informe no nombra:** el HTML de `/login` deja de ser cacheable en el borde. Cada
   visita es una invocación de función, y **la puerta de entrada de la app queda expuesta a arranque en frío**
   — que es precisamente la latencia que esta ronda venía a quitar. El intercambio real no es "estática vs
   dinámica", es "pantalla en blanco hasta hidratar" **a cambio de** "posible espera hasta el primer byte".
   Sigue siendo un buen cambio (la segunda es más corta y no deja la pantalla vacía), pero conviene decirlo.
3. **Y una tercera salida que no se consideró:** el destino sólo hace falta **en el momento de enviar**, no
   al renderizar. Leerlo en el manejador del envío desde la ubicación del navegador —en vez de con el hook
   durante el render— no dispara ninguna frontera de Suspense **ni** obliga a renderizado dinámico: `/login`
   se habría quedado **estática y con el formulario en el HTML**, que es lo mejor de las dos salidas. La
   guarda seguiría exactamente donde está. Por eso la frase del §1.1 —"es el coste exacto de servir un HTML
   que ya trae la pantalla"— **no es cierta como absoluto**: es el coste de **esta** solución, no del
   objetivo.

No pido cambiarlo: la salida elegida es más idiomática, pone la guarda antes (el valor hostil no cruza
siquiera a cliente) y es más fácil de testear. Pero queda como **NB-3**, para que si algún día molesta el
arranque en frío nadie crea que la única vuelta atrás es reponer el hueco vacío.

---

## 7. Juicio 7 — a11y: ¿se anuncia de verdad, y no se rompió el teclado?

**Se anuncia, y el teclado no se rompe.** Con matices que valen una nota.

**Lo que está bien:**

- Mover el foco al control inválido es **la** técnica correcta aquí, y no una aproximación: al enfocar, el
  lector lee etiqueta + estado de invalidez + descripción, y esos tres los cablea `Field` sin que haya que
  duplicar el texto en ninguna región nueva. Por eso el arreglo **no toca el design system**, que era la
  restricción dura.
- **Los tres caminos están cubiertos**, y lo verifiqué en el código, no sólo en los nombres de los tests:
  validación en cliente de login (`LoginForm.tsx:66-72`), validación en cliente de register
  (`RegisterForm.tsx:72`) y **409** (`RegisterForm.tsx:87`).
- **El orden es el visual, no el de zod**: `RegisterForm.tsx:60-64` declara los campos en orden de pantalla y
  el test lo fija con un caso donde los tres son inválidos y tiene que ganar el nombre. Esto importa: si fuera
  el orden de los errores de zod, el foco saltaría a un campo arbitrario.
- **No se roba el foco donde no toca**: en 401, 500 y red caída no se llama al helper, porque ahí ya anuncia
  la región viva. Mover el foco además sería quitárselo al usuario dos veces por el mismo error.
- **Nada del comportamiento de teclado anterior se rompe.** El foco sólo se mueve tras un envío **fallido**;
  el orden de tabulación, el envío con Enter y el anillo de foco visible siguen igual. En el camino de éxito
  no se toca el foco. Y `axe` sigue verde en los dos formularios y en las dos páginas.

**El matiz (NB-4, sólo nota):** el foco se mueve en la misma línea en que se pide el cambio de estado, así que
en ese instante el control **todavía no tiene** los atributos de invalidez y descripción — React los aplica al
re-renderizar, un momento después. En la práctica funciona, porque el lector consulta el estado del nodo
enfocado cuando el DOM ya se ha asentado, y el nodo es el mismo. Pero es una dependencia de temporización que
nadie declaró y que ningún test puede distinguir (todos asertan después del render). La forma robusta es mover
el foco **después** de que el error se haya pintado. **Aviso honesto: esto lo razoné, no lo medí** — no
conseguí instrumentar el instante exacto sin escribir dentro del repositorio, y no voy a hacerlo.

---

## 8. Hallazgos

### Bloqueantes

**Ninguno.**

### No bloqueantes con ficha en `deudas.md`

**NB-1 — Los dos formularios de auth se envían por GET si el JavaScript no está listo, y la contraseña acaba
en la URL.** El elemento de formulario se sirve **sin `action` y sin `method`**, y sus controles llevan
nombre, así que el envío nativo del navegador es un GET a la propia página con las credenciales en la query.
Verificado contra el servidor de producción: `GET /login?email=...&password=<secreto>` responde **200** y
vuelve a pintar la pantalla. La contraseña queda en la barra de direcciones, en el historial y en la línea de
petición de cualquier registro o intermediario (CWE-598). **Escenario concreto:** el proxy desvía a `/login`
en un móvil con red lenta; gracias a esta misma ronda el formulario **ya se ve** antes de que hidrate; la
persona escribe y pulsa Enter; el manejador de React todavía no está enganchado y el navegador hace el envío
nativo. **Alcance honesto: `/register` tiene la misma forma desde #31 y yo no lo vi en su review** — esta
ronda no introduce el defecto, lo extiende a la página a la que el proxy manda a todo el mundo. **Arreglo
mínimo:** declarar el método como POST, con lo que el peor caso pasa de fuga de credencial a un 405
inofensivo. **Arreglo bueno:** convertir el envío en una Server Action, que cierra esto y además hace que la
pantalla funcione de verdad sin JavaScript. **Y hay que corregir la frase del §5 del informe**, que describe
el residuo como "sin JS no se puede enviar": sí se puede, y ése es justamente el problema.

**NB-2 — El gate de la 37 no ve dentro de los componentes cliente.** `collectSuspenseBoundaries`
(`auth-pages.test.tsx:48-59`) recorre el árbol que **devuelve** la página; `LoginForm` figura ahí como un
elemento sin hijos, así que su interior no se inspecciona. **Escenario concreto:** alguien envuelve el
formulario en una frontera de relleno nulo **dentro** de `LoginForm` o de `AuthPanel` para cargar algo en
diferido; el HTML de la puerta de entrada vuelve a salir vacío y el gate sigue **verde**, porque la frontera
ya no está en la composición de la página. Es el mismo agujero por el que entró la 37, un nivel más abajo. El
JSDoc documenta el límite "composición, no HTML", pero **no** éste. Barato de acotar: prohibir el relleno nulo
en todo el subárbol de `(auth)` con el mismo barrido por directorios que ya usa el guardarraíl de clases.

### No bloqueantes, sólo nota

**NB-3 — El precio de la dinámica está bien pagado, pero no era inevitable.** Ver §6: leer el destino en el
manejador del envío habría dejado `/login` **estática y con el formulario en el HTML**. Añádase que la página
deja de ser cacheable en el borde y queda expuesta a arranque en frío.

**NB-4 — El foco se mueve antes de que se pinten los atributos del error.** Ver §7. Dependencia de
temporización no declarada, indistinguible por los tests actuales. Razonado, no medido.

**NB-5 — `focus-first-invalid.ts` no tiene test propio.** Se ejercita bien a través de los cuatro tests de
los formularios (la mutación (A) lo demuestra), pero es un módulo con lógica —recorrido en orden y valor de
retorno— y el repositorio tiene la costumbre de darle test directo a esas piezas, como a `next-path.ts`. En
particular, **el valor de retorno no lo comprueba nadie**: hoy no lo consume ningún llamador.

**NB-6 — La tabla de archivos modificados del informe omite `src/app/(auth)/layout.tsx`.** Es un cambio sólo
de comentario y además correcto (salda mi NB-7 anterior), pero la lista de archivos tocados es el sitio donde
el reviewer confía; tiene que ser exhaustiva.

---

## 9. Resumen del veredicto

Las dos deudas se cierran de verdad y no de boquilla: el HTML de `/login` **ya trae la pantalla de acceso**
—verificado contra un servidor de producción real, no contra un test— y los tres caminos de error de campo
**mueven el foco** al control correcto, en orden visual, sin duplicar texto ni tocar el design system. El test
que fijaba el silencio se reescribió conservando entera la garantía que sí valía. Las tres condiciones dobles
reproducen, y la de la guarda del destino lo hace **clavada en 17**.

Y lo más importante: el camino nuevo del destino, que era la parte peligrosa, **aguanta**. Lo ataqué otra vez
desde cero por las dos puertas —61 440 casos de fuerza bruta y 23 peticiones reales contra el servidor,
incluidas las formas que sólo existen ahora que hay salto servidor→cliente: parámetro repetido, prototipo
contaminado, getters hostiles y objetos con conversión a texto envenenada— y **no hay ni una fuga**. El
redirector abierto sigue cerrado.

Queda un defecto real que esta ronda no introduce pero sí amplía —el envío nativo por GET con la contraseña
en la URL, que `/register` arrastra desde #31 y que yo no vi entonces— y que merece ficha propia con la
Server Action como salida definitiva. No justifica devolver el trabajo.

**APROBADO.**

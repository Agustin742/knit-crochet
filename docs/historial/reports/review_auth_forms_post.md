# Review — los formularios de auth declaran POST (arreglo mínimo del NB-1)

**Veredicto: APROBADO**

> Reviewer, tercera pasada sobre #31. Alcance revisado: **sólo esta ronda**. De lo anterior sólo se confirma
> que no se rompió.
>
> **Todo lo que sigue lo ejecuté yo**: `init.sh`, `pnpm build`, un servidor de producción real con peticiones
> HTTP de verdad contra **las dos** pantallas, y la mutación del gate nuevo. Ningún número copiado del
> informe. Higiene: cero nombres de clase de Tailwind en este archivo.

---

## 0. Verificación base

| Comprobación | Declarado | **Medido por mí** |
|---|---|---|
| `bash ./init.sh` | 481 \| 6 en 46 archivos | **481 passed \| 6 skipped** en **46** archivos, lint y typecheck verdes, exit **0**. Coincide, y el delta desde 477 es exactamente +4 en un archivo nuevo |
| `pnpm build` | OK | **OK**. `/login` sigue dinámica, `/register` sigue estática |
| Frontera de alcance | nada de `shared/ui`, `AppShell*`, `ArchiveNav`, `globals.css`, `proxy.ts` | **Confirmado por `git status`: ninguno modificado** |
| Gates de `AppShellClient.test.tsx` | verdes y sin editar | **Sin modificar** respecto a HEAD, y dentro de los 481 verdes |
| #31 | sigue `done` | **`done`**, y **0** features en `in_progress` |

**Y lo que esta ronda no debía tocar, comprobado con `diff` byte a byte contra mis copias de las rondas
anteriores:** `next-path.ts` (la guarda del destino) **idéntico**, `focus-first-invalid.ts` **idéntico**,
`login/page.tsx` **idéntico**. El cambio real son dos atributos y dos comentarios.

---

## 1. Juicio 1 — el agujero, medido contra un servidor real

Build limpio, `pnpm start`, peticiones HTTP de verdad, con un secreto obviamente ficticio para poder
buscarlo. **Las dos pantallas, no sólo login.**

### 1.1 El HTML servido declara el método en las dos

```
/login     <form noValidate="" class="..." method="post">
/register  <form noValidate="" class="..." method="post">
```

Sin `action` en ninguna de las dos. Esto es lo que decide el comportamiento **antes de que hidrate el JS**,
que es la ventana entera del problema: el navegador construye el envío a partir de este atributo.

### 1.2 El envío nativo que el navegador construye AHORA

```
POST /login     -> 200   URL final: .../login      secreto en la URL: false   reflejado en el cuerpo: 0
POST /register  -> 200   URL final: .../register   secreto en la URL: false   reflejado en el cuerpo: 0
```

**En las dos pantallas el secreto viaja en el cuerpo y no aparece ni en la URL ni en la respuesta.** El
agujero de la clase está cerrado donde importaba.

### 1.3 Sobre el "GET que ya no responde 200"

Lo pedías así, y hay que ser preciso: **eso no se puede conseguir desde esta capa, y el informe lo dice bien**
(su §4). `GET /login?email=…&password=…` **sigue respondiendo 200**, porque es una página y los parámetros
que no entiende los ignora — cualquiera puede teclear cualquier URL. Lo que cambia, y es lo único que estaba
en nuestra mano, es que **el formulario ya no genera esa petición**. El discriminador honesto del antes/después
es el par (atributo del formulario servido, URL final del envío nativo), y los dos salen como deben.

Que el informe se negara a vender ese 200 como si fuera un 405 —y explicara por qué no lo es— es exactamente
lo que se le pide a un informe.

### 1.4 Una comprobación que nadie hizo y que cierra el círculo: nada queda cacheado con el secreto

Fui a mirar dónde podría quedar escrito el secreto aunque no esté en la URL del envío:

```
GET /login   (con credenciales en la query, tecleada a mano)
   Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
POST /login  Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
GET /register  Cache-Control: s-maxage=31536000
```

`/login` es dinámica y responde **`no-store`**, así que ni siquiera el caso residual (una URL con credenciales
heredada del historial de antes del arreglo) deja copia en ningún intermediario. `/register` sí es cacheable
en el borde, pero su HTML **no refleja los parámetros de búsqueda** (medido: cero apariciones del secreto),
así que no hay forma de que una página cacheada contenga una credencial. **Ningún camino deja el secreto en
un caché.**

---

## 2. Juicio 2 — la condición doble del gate, reproducida

Mutación: **quitar el atributo de los dos formularios**. Restaurado después y comprobado con `diff`.

| | Declarado | **Medido por mí** |
|---|---|---|
| Rojo al quitar el atributo | 2 rojos, uno por formulario | **2 rojos**, y son *"LoginForm declara POST como método de envío"* y *"RegisterForm declara POST como método de envío"*. **Coincide** |
| Verde al reponerlo | 4 verdes | **Verde**: 55 passed en los siete archivos de auth (el archivo nuevo aporta sus 4) |

**Cubre las dos páginas**, que era la condición: cayeron los dos, no uno. Y el gate está en **un solo
archivo** que itera sobre los dos formularios, así que la garantía no depende de acordarse de repetirla —
decisión correcta.

Detalle que me gusta: los otros dos tests del archivo fijan que **no** hay `action`. Eso no es decoración:
sin `action` el envío nativo va a la página, no a un endpoint que pudiera aceptarlo a medias. Lo verifiqué
también contra el servidor real (cero formularios con destino propio en las dos pantallas).

---

## 3. Juicio 3 — ¿queda algún borde vivo?

Ésta era la pregunta que importaba. Fui a buscar bordes en vez de darla por cerrada.

**Lo que comprobé y está limpio:**

| Borde | Resultado |
|---|---|
| ¿Algún botón sobrescribe el método o el destino del envío (`formmethod` / `formaction`)? | **Cero** en las dos pantallas. Es la vía clásica para reintroducir el GET, y no existe |
| ¿Algún formulario declara `action` apuntando a un endpoint? | **Cero** |
| ¿El envío nativo conserva el destino en la URL cuando hay `?next=`? | `POST /login?next=/projects/7` → 200, secreto **no** en la URL, **cero** reflejos. La query sigue llevando sólo el destino |
| ¿El POST provoca alguna redirección que arrastre la query? | `location` **vacío**: no hay redirección |
| ¿El proxy trata distinto el POST? | No: sigue dejando pasar `/login` y `/register` (públicas) y responde 307 al POST de una ruta privada. Sin cambios |
| ¿Queda algún otro formulario en el repo con la forma vieja? | Recorrí `src/**`: **sólo existen esos dos**. La cobertura de hoy es del 100% |
| ¿El secreto acaba en algún caché? | No (ver §1.4) |
| ¿Cambia algo el camino normal con JS? | No: `preventDefault` sigue cortando el envío nativo, y los 477 tests anteriores siguen verdes sin cambiar de nombre ni de resultado |

**Lo que sigue vivo, y es correcto que siga vivo porque está fichado:**

El envío nativo responde **200 pintando la pantalla vacía y sin mensaje**. No es una fuga, es una confusión:
el usuario cree que no pasó nada. Es la **deuda 39** y está bien escrita. El usuario eligió el mínimo sabiendo
esto, y mi caracterización del riesgo se sostiene: **lo irreversible era la URL** —queda escrita en el
historial, en el `Referer` y en registros de terceros que no controlamos— y eso es exactamente lo que se
compró. Lo que queda es recuperable y visible para quien lo sufre.

**Un matiz que corrige mi propia caracterización anterior, y conviene dejarlo escrito:** yo dije que el peor
caso pasaría a "un 405 inofensivo". **Es falso, y el implementer lo midió y me corrigió**: en Next 16 una
página del App Router responde **200** a un POST. Lo reproduje. La conclusión de seguridad no cambia (el
secreto sale de la URL igual), pero la de experiencia sí: no hay error visible, hay silencio. Que lo midiera
en vez de dar por buena la frase del encargo es lo correcto.

**El único borde nuevo que sí encontré es de cobertura futura, no de comportamiento** → **NB-1** abajo.

---

## 4. Juicio 4 — nada de lo anterior se rompió

- **La guarda del `?next=`**: `next-path.ts` **idéntico byte a byte** al que ataqué con 61 440 casos en la
  ronda anterior. No hacía falta reatacarla y no lo hice; lo que sí comprobé es que sigue siendo el mismo
  archivo y que sus 7 tests siguen verdes.
- **El foco al primer control inválido**: `focus-first-invalid.ts` **idéntico**, y sus cuatro tests de los
  dos formularios siguen verdes.
- **Los dos gates de `AppShellClient.test.tsx`**: **sin modificar**.
- **Frontera de alcance**: ni un archivo de `src/shared/ui/**`, `AppShell*`, `ArchiveNav`, `globals.css` ni
  `src/proxy.ts`.
- **#31 sigue `done`**, con 0 features en `in_progress`.

---

## 5. Juicio 5 — papeleo

**Las fichas 39, 40, 41 y 42 están bien escritas, las cuatro con escenario concreto.** Las leí enteras:

- **39 (Server Action)** — el escenario está bien elegido: no es "sin JS no funciona" en abstracto, es *"pulsa
  Enter antes de que hidrate, el servidor responde 200, no pasa nada y no hay mensaje; vuelve a escribirlo
  todo"*. Distingue explícitamente **lo que el mínimo tapó** (la fuga) de **lo que no** (que el acceso
  funcione), y fija la verificación de la slice futura: **pedir la página con el JavaScript desactivado**.
  Eso último es lo que impide que se cierre con un test que no discrimina.
- **40 (mi NB-2)** — recogida entera, con el escenario del `dynamic` dentro de `LoginForm` o `AuthPanel`, la
  propuesta del barrido por directorios, y —esto es lo que la hace útil— **la razón de no haberla hecho ahora**:
  un guardarraíl de fuente nuevo necesita su propia condición doble y hay que decidir que una frontera con
  esqueleto sí debe pasar. La emparenta además con las fichas 18, 22, 23 y 33, que son la misma familia.
- **41 (mi NB-4)** — bien, y **mejor que mi nota**: deja escrito de forma explícita que **no está medida con
  un lector de pantalla real**, que es una hipótesis fundada y no una observación, y que reproducirla es el
  primer paso antes de tocar nada. Es exactamente cómo hay que fichar algo que se razonó y no se midió.
- **42 (mi NB-5)** — recoge las dos mitades (sin test propio **y** retorno muerto) y añade el escenario que a
  mi nota le faltaba: los formularios de hoy tienen el orden del array igual al del DOM, así que ningún test
  distinguiría un desajuste en un formulario futuro.

**Las dos correcciones al informe anterior están hechas, y bien hechas** (apéndice §6 de
`impl_auth_ui_deudas_37_38.md`):

- **§6.1** rectifica la frase "sin JS no se puede enviar" sin suavizarla: la llama *"el peor tipo de error de
  informe: afirma que algo es imposible cuando en realidad ocurre y además filtra un secreto"*. Corregir en
  esos términos, en el propio informe y no en una nota aparte, es lo que hace que el registro sirva.
- **§6.2** añade la fila que faltaba en la tabla de archivos (`src/app/(auth)/layout.tsx`) y explica por qué
  importa: la lista de archivos tocados es donde el revisor decide dónde mirar.

**Mis tres notas menores:** las tres tratadas, ninguna ignorada y ninguna arreglada a lo loco. Dos fichadas
(41 y 42). La tercera —que `/login` podría haber seguido estática leyendo el destino en el manejador del
envío— la metió **dentro de la ficha 39** con un argumento que **corrige mi nota**: esa vía y el acceso sin
JavaScript son **incompatibles**, porque leer el destino en el manejador vuelve a atar el envío al cliente.
Tenía razón él. Que las dos queden escritas juntas, para que nadie persiga una sin ver que cancela la otra,
es mejor solución que la que yo proponía.

---

## 6. Hallazgos

### Bloqueantes

**Ninguno.**

### No bloqueantes con ficha en `deudas.md`

**NB-1 — El guardarraíl protege dos formularios por nombre, pero el defecto era de clase.**
`auth-forms.test.tsx:39-42` itera sobre una **lista fija** de dos componentes importados a mano. Hoy la
cobertura es del **100%** —recorrí `src/**` y sólo existen esos dos formularios—, así que no hay nada abierto
ahora mismo. El problema es el mañana: **un formulario nuevo nace con el defecto y con los tests en verde**,
porque nadie se acuerda de añadirlo a la lista. Y el defecto original no era "a `LoginForm` le falta un
atributo", era "un formulario sin método declarado envía por GET".
**Escenario de fallo concreto:** llega la pantalla de recuperar contraseña, o la de cambiar la contraseña
desde el perfil. Alguien copia la estructura de `RegisterForm` pero no el atributo (es lo primero que se
pierde al copiar, porque parece redundante cuando el envío lo hace `fetch`); el control lleva
`name="password"`; el HTML se sirve sin método; y en la ventana previa a la hidratación vuelve la contraseña
a la URL. Los 481 tests siguen verdes.
**Arreglo:** convertirlo en un barrido por recorrido de directorios sobre `src/**` —el patrón que ya usa
`src/shared/ui/canonical-tailwind-classes.test.ts`, que precisamente se eligió "para que un archivo nuevo
quede cubierto solo"— asertando que todo elemento de formulario del repositorio declara su método. Es la
misma medicina que pide la **ficha 40**, sobre otro síntoma: conviene hacerlas juntas. Nótese que este
repositorio ya tiene fichada la fragilidad "lista fija" en `no-hardcode.test.ts`; ésta es la tercera
aparición del mismo patrón.

### No bloqueantes, sólo nota

**NB-2 — La respuesta de `/login` a una URL con credenciales refleja el secreto tres veces, no una.** El
informe (§4) dice "1 vez"; medido son **3**, y todas son de la carga de navegación de Next, que repite la URL
pedida. La lectura del informe es correcta —son reflejos de la propia URL, no del cuerpo del envío— y el dato
no cambia ninguna conclusión: ese camino ya no lo genera el formulario y la respuesta va con `no-store`, así
que no queda copia en ningún caché. Se anota sólo porque los números de un informe se citan después.

**NB-3 — Nota de precisión para el registro, no defecto:** conviene que quede escrito que el arreglo **no
convierte el peor caso en un 405**, como decía mi propio encargo, sino en un **200 silencioso**. El informe
lo corrige bien en su §3 y la ficha 39 lo recoge; lo repito aquí porque la caracterización errónea salió de
una review mía y no quiero que sobreviva en el registro por inercia.

---

## 7. Resumen del veredicto

El agujero está cerrado, y no porque lo diga un test: contra un servidor de producción real, **las dos**
pantallas sirven su formulario con el método declarado, y el envío nativo que el navegador construye a partir
de ese HTML manda las credenciales en el cuerpo — cero rastro en la URL, cero reflejo en la respuesta, en
login y en register. Fui además a buscar por dónde podría volver a escaparse —botones que sobrescriban el
método o el destino, formularios con destino propio, redirecciones que arrastren la query, el `?next=`
conviviendo con el envío, el trato del proxy al POST, y dónde acaba cacheado cada respuesta— y **no queda
ninguna vía abierta**. Ningún camino deja el secreto en un caché.

La condición doble reproduce clavada: quitar el atributo tira **2** tests, uno por pantalla; reponerlo los
devuelve a verde. Nada de lo aprobado antes se movió: la guarda del destino y el helper de foco están byte a
byte iguales, los gates del caparazón sin tocar y la frontera de alcance intacta.

El papeleo es de los buenos: cuatro fichas con escenario concreto, la 41 diciendo explícitamente que es una
hipótesis no medida, y las dos correcciones al informe anterior escritas sin suavizar. Y en un punto **el
implementer me corrigió a mí con una medición** (no hay 405, hay un 200 silencioso) y en otro con un
argumento (la vía que devolvería `/login` a estática es incompatible con el acceso sin JavaScript). Las dos
correcciones son buenas y las firmo.

Queda un solo hallazgo, y mira al futuro, no al presente: el guardarraíl cubre dos formularios por nombre
cuando el defecto era de clase. Merece ficha, junto con la 40, que pide el mismo remedio.

**APROBADO.**

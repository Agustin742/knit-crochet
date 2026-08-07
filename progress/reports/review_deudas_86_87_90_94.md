# Review — lote de deudas 86 / 87 / 90 / 94 (enablers de #19 `dashboard_ui`)

**Veredicto:** CHANGES_REQUESTED
**Bloqueantes: 1** (documental, no de codigo). El codigo se aprueba tal cual: no pido tocar ni una linea de
`src/**`. Lo que hay que corregir es una **afirmacion factual falsa** que el implementer declaro como
**medida** y escribio en el registro permanente de deudas.

> **No es una feature.** `feature_list.json` **no se toco** (`git diff --stat feature_list.json` vacio, 33
> features, ninguna en `in_progress` — la unica aparicion de la cadena es el enum del esquema, linea 14).
> Es UI: se aplico el checklist visual del **SDD §9**. No hay pagina, asi que no aplica smoke de ruta.

---

## 0. Verificacion ejecutada por mi

| Comando | Resultado |
|---|---|
| `bash ./init.sh` | **VERDE**, exit 0. lint OK, typecheck OK, **62 passed / 3 skipped** archivos, **788 passed / 13 skipped** tests |
| `pnpm build` | **OK**, exit 0. 15 paginas estaticas, 26 rutas, TypeScript verde |
| `git status --porcelain` | **identico al declarado** (ver §7) |

**Los numeros declarados cuadran exactamente.** Baseline `3d244f1`: 60/3 archivos, 756/13 tests →
**+2 archivos, +32 tests**, 0 regresiones, 0 skips nuevos (los 3 smokes siguen `skipped`).

### Aritmetica del +32 — y un hallazgo que el implementer no declaro

Conte los `it()` uno a uno con `git show HEAD:<archivo>` contra el arbol actual:

| Archivo | Antes | Ahora | Delta |
|---|---|---|---|
| `Dialog.test.tsx` | 19 | 32 | **+13** (6 de scroll + 7 de foco) |
| `Skeleton.test.tsx` | 8 | 9 | **+1** |
| `dialog.portal.tokens.test.ts` | — | 7 | **+7** |
| `skeleton.tokens.test.ts` | — | 9 | **+9** |
| | | | **+30** |

Faltaban **2**. Los encontre: `no-hardcode.test.ts` genera **2 tests por cada fuente** que barre, y el
barrido por directorios recogio **solo** el archivo nuevo `root-scroll-lock.ts`. Verificado:

```
$ pnpm vitest run src/shared/ui/no-hardcode.test.ts --reporter=verbose | grep -c "root-scroll-lock"
2
```

**30 + 2 = 32.** Es decir: el guardrail de no-hardcode **demostro empiricamente** que su barrido por
directorios vigila los archivos nuevos sin registrarlos en ningun sitio. Eso es mejor evidencia que el
razonamiento por lectura que ofrecia el informe (§9), y merecia estar en el informe.

---

## 1. EL BLOQUEANTE — la afirmacion sobre happy-dom y el `input` deshabilitado es FALSA

El implementer escribe, en tres sitios y con la autoridad de la REGLA 7:

> *"Lo medi en vez de suponerlo: con la mutacion 'obedecer la prop a ciegas', el test del `input`
> deshabilitado **se pone rojo** — es decir, **happy-dom si enfoca un control deshabilitado**. Si el
> repliegue se hubiera apoyado en 'llamo a `focus()` y luego miro donde quedo el foco', **el gate habria dado
> verde sin repliegue ninguno**."* (informe §4, repetido en §9 y en `progress/deudas.md` **ficha 90**)

**Lo comprobe, como pedia el encargo. Es falso, y ademas la inferencia esta invertida.**

### Prueba 1 — sonda directa (RTL + happy-dom, ejecutada, no razonada)

Renderice un boton y un `input` deshabilitado, enfoque el boton, y llame a `input.focus()`:

```
Expected: "__ver_arriba__"
Received: "SE QUEDO EN EL BOTON PREVIO"
```

`focus()` sobre un control deshabilitado en happy-dom es un **no-op**: el foco **no** se mueve al input, se
queda donde estaba. Lo contrario de lo declarado.

### Prueba 2 — la mutacion 90-B real, con el mensaje de error completo

Reproduje la mutacion `const target = requested ?? panel` contra el `Dialog.test.tsx` real (copia del
componente al scratchpad + `alias` de Vitest; `git status` intacto). Salen **2 rojos**, como declara — el
conteo es correcto. Pero el motivo no es el declarado:

```
x repliega al panel si el elemento pedido no es enfocable
Received element with focus:
  <button type="button">      <- el DISPARADOR ("Nuevo dos agujas")
```

El foco no fue al campo "Rondas" deshabilitado. **Se quedo en el boton que abrio el modal**, porque
`focus()` sobre el deshabilitado no hizo nada. El rojo prueba que **el panel no recibio el foco**, que es
otra cosa distinta de *"el deshabilitado si lo recibio"*.

### Por que bloquea

1. **El corolario tambien es falso, y en la direccion peligrosa.** Si `focus()` sobre lo no enfocable es un
   no-op, una implementacion del tipo *"llamo a `focus()` y compruebo si `document.activeElement` es el que
   pedi; si no, repliego"* **habria funcionado** en happy-dom, no habria dado verde sin repliegue. El
   informe usa como prueba de la REGLA 7 justo el dato que la contradice.
2. **Vive en `progress/deudas.md` ficha 90**, que es registro permanente y de consulta, etiquetado como
   *"Dato medido y relevante"*. Un implementer futuro que razone sobre foco en happy-dom partira de una
   premisa falsa. El propio encargo lo anticipo: *"si es cierto afecta a cualquier test futuro que razone
   sobre foco"*.
3. Es exactamente la familia del precedente **#31** — un informe que declara mal lo que midio. Aqui los
   **numeros** estan bien (y el implementer incluso se autocorrige en el 87, ver §5); lo que esta mal es la
   **interpretacion**, presentada como medicion.

### Que hay que cambiar (solo prosa, cero codigo)

1. `progress/deudas.md`, **ficha 90**: sustituir el parrafo *"Dato medido y relevante: happy-dom si enfoca un
   `input` deshabilitado…"*. El dato correcto es el opuesto: **happy-dom NO enfoca un control deshabilitado;
   `focus()` es un no-op y el foco se queda donde estaba**. Y la mutacion 90-B se pone roja porque el
   **panel** no recibe el foco (se queda en el disparador), no porque lo reciba el deshabilitado.
2. `progress/reports/impl_deudas_86_87_90_94.md` **§4 y §9**: misma correccion, y retirar la conclusion
   *"el gate habria dado verde sin repliegue ninguno"*, que no se sostiene.

**Nota importante:** la **decision de codigo sigue siendo la correcta** y no hay que tocarla. Derivar el
repliegue de `focusableWithin` es lo que hay que hacer, pero por el motivo que el **comentario del
`Dialog.tsx` si dice bien** (una sola fuente de verdad de "enfocable", que no se puede desincronizar con la
trampa de `Tab`), no por el motivo inventado. `Dialog.tsx:159-168` esta bien redactado y se queda como esta.

---

## 2. Punto de proceso — el implementer escribio en progress/deudas.md

Tacho las cuatro fichas y anadio las 95-102. **No lo trato como falta** (el encargo no se lo prohibio), pero
verifique el contenido, que era lo pedido.

### Los cuatro tachados: son ciertos. Los cuatro.

| Ficha | Saldada de verdad? | Como lo verifique |
|---|---|---|
| **86** | **SI** | Tokens y regla de fotogramas presentes en el **bundle de produccion**, no solo en el fuente (§3) |
| **87** | **SI** (la mitad que la ficha pedia) | Contador correcto; ejecute 2 mutaciones y 3 sondas propias (§4) |
| **90** | **SI** | Prop, repliegue y default intacto; mutacion 90-B ejecutada (§6) |
| **94** | **SI** | Los 3 sitios corregidos; **busque un cuarto y no existe** en src ni en docs (§6) |

**Ninguna esta tachada de mas.** No hay bloqueante por este lado.

Una observacion, no bloqueante: la **ficha 87 original** se titulaba "El Dialog no bloquea el scroll del
fondo **ni oculta el resto del arbol**", y el titulo tachado quedo reescrito como "...no bloquea el scroll
del fondo" a secas. Editar el enunciado historico de una ficha al saldarla borra parte de lo que decia.
**Lo salva** que el cuerpo lo declara explicitamente ("La otra mitad, inert, NO se hizo y no se pierde: pasa
a la ficha 96") y que el Arreglo original de la 87 ya ofrecia las dos vias como **alternativas** ("bloquear
overflow ... **o** inert"), asi que hacer una satisface la ficha. Sugerencia para el leader: al cerrar,
dejar tachado el titulo original y poner la aclaracion debajo.

### Las 95-102 son honestas, y una de ellas es notablemente autocritica

Ninguna esconde algo que tocara arreglar en este lote:

- **95 / 102** — fidelidad en pantalla del shimmer. Correctamente **regla 4** (no medible sin navegador). La
  95 ademas **levanta dos defectos concretos del propio port que nadie le pidio confesar**: que el fondo se
  repite (varias bandas de brillo a la vez en un bloque ancho) y que la forma redonda mide menos de un cuarto
  de la banda. Verifique las dos: son ciertas y son **fieles al template**, que solo tenia una forma. Ficha
  correcta, no arreglo pendiente.
- **96** — el inert. Es la mitad no hecha de la 87. Ya discutido arriba: legitima.
- **97** — compensacion del ancho de la barra de scroll. Real y no medible en happy-dom. Legitima.
- **98** — root-scroll-lock en la carpeta del Dialog. Confirmo que **no se reexporta** desde el barrel
  dialog/index.ts (lo lei), asi que el acoplamiento esta contenido. Diferir al segundo consumidor es la
  decision correcta.
- **99** — el foco inicial se decide una vez. Cierto: Dialog.tsx:145-177, el efecto depende de
  [open, container, initialFocusRef] y la referencia es estable, asi que contenido que llega despues no
  reevalua. Limitacion real y bien fichada.
- **100** — el gate del portal lee AppShell.tsx como texto. **Es la ficha mas honesta del lote**: se
  autoimputa el precio de su propia solucion (un primitivo del design system portable pasa a saber que
  existe un AppShell, y el test cae si el main migra a cva sin que nada este roto). Correcta.
- **101** — nada obliga a que otro test que monte un Dialog compruebe que solto el bloqueo. Cierto y
  relevante para #19; el aserto vive solo en el afterEach de Dialog.test.tsx.

**Falta una ficha** que sugiero anadir (ver §8, no bloqueante): el ancla de public-api.test.ts es
**solo de runtime** y no ve la superficie de **tipos**.

---

## 3. Deuda 86 — el shimmer. Fidelidad al template: EXACTA

Contraste numero por numero contra `template/template-src.html` (linea 140 la regla `.kc-skeleton`, linea 25
el keyframe `kc-shimmer`). **Ningun numero se "mejoro".**

| Contrato del template | En el template | Portado | Token | Fiel? |
|---|---|---|---|---|
| Angulo del degradado | `90deg` | `90deg` | `--skeleton-gradient` | SI |
| Paradas del degradado | `25% / 50% / 75%` | `25% / 50% / 75%` | `--skeleton-gradient` | SI |
| Colores | `--surface-sunken` / `--brand-cream` | los mismos, **nombrados** | `--skeleton-gradient` | SI |
| Ancho de banda | `200px` | `200px` | `--skeleton-band` | SI |
| Tamano del fondo | `200px 100%` | derivado: `var(--skeleton-band) 100%` | `--skeleton-band-size` | SI |
| Duracion | `1.4s` | `1400ms` (= `1.4s`) | `--dur-shimmer` | SI |
| Curva | `linear` | `linear` | `--ease-loop` | SI |
| Iteracion | `infinite` | `infinite` | `--animate-skeleton` | SI |
| Recorrido | `-200px 0` a `200px 0` | `calc(-1 * var(--skeleton-band)) 0` a `var(--skeleton-band) 0` | derivado de la banda | SI |

**La banda gobierna de verdad las dos cosas** (tamano del fondo y recorrido): un solo token, imposible
desincronizar. Es la decision de diseno mas solida del lote.

**Los numeros salen de tokens, ninguno escrito a mano en el componente.** `skeleton.variants.ts:39-45` solo
nombra clases; los seis valores viven en `globals.css:222-259`. Confirmado.

### Desviaciones respecto del template: dos, deliberadas y documentadas. Ninguna es un numero cambiado.

1. El template usa el atajo `background:`, que **resetea el color de fondo**. El port mantiene el color de
   superficie hundida debajo del degradado. **No cambia nada en pantalla** (el degradado, que se repite,
   cubre la superficie) y es justo lo que hace posible el estado quieto. Correcto.
2. El template tiene un solo `border-radius: var(--radius-sm)`; el port usa radio por forma. **Preexiste a
   este lote**: las tres formas ya estaban en `skeleton.variants.ts` antes del 86. Fuera de alcance, no es
   regresion.

### prefers-reduced-motion: NO se degrado, y "quieto no es invisible" es cierto

Con la preferencia puesta el elemento sale con las clases de estado quieto **y conserva el color de
superficie hundida** de la base: el bloque **sigue viendose como un bloque de carga**. Lo verifica un test
nuevo, y lo verifica sobre la salida real de `cn()`, no sobre el string de `cva` — que es lo que importa,
porque `twMerge` podria haberse comido una de las dos clases:

```
Skeleton.test.tsx: expect(skeletonNode().className).toContain("bg-surface-sunken");
```

La media query global de `globals.css:336-345` esta **intacta** (no la toco el diff). Y el estado quieto es
**identico al de antes del lote** (misma clase de animacion nula + misma superficie), asi que no hay forma de
que este lote haya degradado nada aqui.

### REGLA 7: el gate corre sobre el CSS compilado. CONFIRMADO por mi, y sobre el bundle real.

Esta era la afirmacion que hacia creible el resto, y **se sostiene**. `skeleton.tokens.test.ts` compila con
`postcss` + `@tailwindcss/postcss` y asierta sobre la salida (misma tecnica que `globals-css.test.ts`).
Ademas lo verifique yo sobre **el artefacto de `pnpm build`**, no sobre la corrida del test:

```
$ grep -ro "animate-pulse" .next/static | wc -l
0                       <- CERO en TODO el output estatico de produccion
```

Y en `.next/static/chunks/1wccx2690-wow.css` estan, con su valor: el keyframe `kc-shimmer` emitido, los seis
tokens (`--dur-shimmer:1.4s`, `--ease-loop:linear`, `--skeleton-band:200px`, el tamano derivado, el degradado
y la animacion compuesta) y **las cinco reglas de utilidad**: la de animacion, la de imagen de fondo, la de
tamano de fondo y las dos del estado quieto. **Las dos utilidades de fondo se generan de verdad** — las
busque expresamente, porque son la clase de cosa que se declara y no se emite.

REGLA 7 bien aplicada. No encontre ningun test que asierta sobre el string crudo de `cva` en vez de la salida
de `cn()`, ni ningun keyframe dado por bueno sin compilar.

---

## 4. Deuda 87 — bloqueo de scroll. Las tres trampas, mas la cuarta que probe yo.

`root-scroll-lock.ts` (59 lineas, contador de referencias de modulo, cada soltador con guarda `released`).

### Trampa 1 — desmontar sin cerrar: CUBIERTA, con test

`Dialog.tsx:179-187` devuelve `lockRootScroll()` como valor de retorno del efecto: el soltador **es** la
limpieza, no una llamada aparte que alguien pueda olvidar. Test: "lo suelta aunque el dialogo se DESMONTE
sin cerrarse".

### Trampa 2 — dos dialogos, incluido el cierre no-LIFO: CUBIERTA. Lo ejecute.

Reproduje la mutacion **87-B** (guardar-y-restaurar sin contador) redirigiendo el modulo con `alias` de
Vitest a una copia mutada en el scratchpad. Resultado real:

```
x con dos abiertos, cerrar el de ABAJO tampoco lo devuelve
  AssertionError: expected '' to be 'hidden'
  AssertionError: un dialogo se fue sin soltar el bloqueo: expected 'hidden' to be ''
 Test Files  1 failed | 1 passed (2)
      Tests  1 failed | 38 passed (39)
```

**Coincide caracter por caracter con lo declarado.** Y confirma lo importante: "cerrar el de ARRIBA"
**sigue verde** con la implementacion ingenua — acierta por accidente. Sin el test del **orden inverso**, la
mutacion habria pasado entera. El caso que rompe a un contador ingenuo esta cubierto y **discrimina**.

### Trampa 3 — no pisar un overflow previo: CUBIERTA, con test

`root-scroll-lock.ts:39-42` guarda el valor solo en el **primer** bloqueo (`holders === 0`) y lo restaura en
el ultimo. Test partiendo de un valor previo puesto a mano, con `finally` para no contaminar al siguiente.

### Trampa 4 — la que el encargo no nombro: abrir y cerrar el MISMO dialogo muchas veces

**No habia test.** Lo probe yo, 5 ciclos completos sobre el `Dialog` real:

```
OK  el contador NO se acumula al abrir y cerrar el MISMO dialogo muchas veces
OK  tras un ciclo con overflow previo, el previo sigue restaurandose  ->  ["scroll", "scroll"]
```

**El contador vuelve a cero en cada ciclo y no se acumula.** El motivo esta en el codigo:
`overflowBeforeLock` se reinicia al soltar el ultimo (`root-scroll-lock.ts:56`), asi que el siguiente ciclo
vuelve a leer el valor real en vez de arrastrar el de antes.

Ademas verifique por lectura la idempotencia (lineas 45-51: la guarda `released` impide que llamar dos veces
al soltador descuente dos veces) y que `holders` **no puede irse a negativo**. Modo estricto de React:
efecto, limpieza, efecto — deja el contador en 1. Correcto.

**Conclusion: no encontre ningun agujero en el contador de referencias.** El unico hueco es de **cobertura**,
no de comportamiento: el ciclo repetido funciona pero **no tiene test propio**. Va como sugerencia (§8), no
como bloqueante, precisamente porque lo verifique y funciona.

### Verificacion extra: la mutacion 87-A, ejecutada

```
x bloquea el scroll del elemento raiz mientras esta abierto
x lo suelta aunque el dialogo se DESMONTE sin cerrarse
x con dos abiertos, cerrar el de ARRIBA no devuelve el scroll
x con dos abiertos, cerrar el de ABAJO tampoco lo devuelve
x restaura el overflow que ya hubiera, no un valor fijo
 Tests  5 failed | 34 passed (39)
```

**Los cinco nombres exactos y el conteo exacto** que declara el informe. Ver §5 sobre la historia del 13.

---

## 5. REGLA 3 — los conteos cuadran, y la autocorreccion del 13 a 5 es CIERTA

**11 mutaciones declaradas** (86: A-D, 87: A-B, 90: A-C, 94: A-D). Conteo correcto: 4+2+3+4 = 11.

**Ejecute 3 de las 11** con la tecnica de los reviewers anteriores (copia al scratchpad + `alias` de Vitest,
`git status --porcelain` identico antes y despues):

| Mutacion | Declarado | Medido por mi | Cuadra? |
|---|---|---|---|
| **87-A** | `5 failed / 34 passed (39)`, 5 nombres | **identico**, los mismos 5 nombres | SI |
| **87-B** | `1 failed / 38 passed (39)`, solo "cerrar el de ABAJO" | **identico** | SI |
| **90-B** | `2 failed / 37 passed (39)` | **2 failed**, los mismos 2 nombres (30 passed de 32 porque corri solo `Dialog.test.tsx`; 32 + 7 del gate del portal = 39) | SI |

Las **8 restantes** (86-A/B/C/D, 90-A/C, 94-A/B/C/D) mutan `globals.css` y `AppShell.tsx`, que los gates leen
por `import.meta.url`: **quedan fuera del alcance de la tecnica del alias, y lo digo como pedia el encargo.**
Las razone por lectura y **son internamente consistentes** una por una:

- **86-A** (volver al latido de fabrica): cae solo el ancla; los tests de comportamiento **derivan** de la
  constante (REGLA 2b) y Tailwind genera la utilidad porque la clase aparece en el fuente. **1 rojo.**
- **86-B** (borrar el keyframe): `keyframeBlock()` lanza "la regla de fotogramas no se emitio". **1 rojo.**
- **86-C** (valores correctos pero escritos a mano): el ancla de **valores** sigue verde (`resolved()` da lo
  mismo) y cae solo el de **tokens**. **Es la mutacion que define la deuda 86** y la mejor del lote: separa
  "el efecto se ve igual" de "sale de tokens". **1 rojo.**
- **86-D** (banda 200 a 240): caen **2**, y eso demuestra que la banda gobierna las dos cosas.
- **94-A/B/C**: 1, 2 y 1 rojos sobre un archivo de **7** tests (2+2+3 = 7, verificado ejecutandolo).
- **90-A/C**: 1 y 11 rojos. El 11 es coherente: sin foco inicial se cae media suite del dialogo.

### La historia del 13 failed que se convirtio en 5: verificada, y cierta

El implementer declara que la **primera** corrida de 87-A dio `13 failed / 26 passed`, que **no eran 13 sino
5 mas cascada** de un `afterEach` que asertaba **antes** de limpiar, que arreglo el `afterEach`, repitio, y
que **deja los dos numeros**.

Lo confirmo por dos vias:

1. **Ejecute 87-A con el afterEach actual y salen exactamente 5.** Si el arreglo no fuera real, seguirian
   saliendo 13.
2. **El mecanismo de la cascada es verificable leyendo el diff.** El `afterEach` actual
   (`Dialog.test.tsx:17-29`) **captura, limpia y luego asierta**:

```
const leftover = rootOverflow();
document.documentElement.style.overflow = "";      <- limpia PRIMERO
expect(leftover, "un dialogo se fue sin soltar el bloqueo").toBe("");
```

Con el orden invertido, el bloqueo que dejaba un test se propagaba al siguiente y a todos los demas: tests de
foco y de `axe` que no tienen nada que ver. La cascada es exactamente la que describe.

**Es el contrario del precedente #31** (alli un informe declaro 9 rojos donde salian 12): aqui el implementer
detecta que su propio gate **exageraba** el dano, lo arregla y publica los dos numeros. Eso es lo que hay que
hacer, y hay que decirlo. **Es tambien lo que hace mas doloroso el bloqueante del §1**: el mismo informe que
se autocorrige con rigor en el 87 inventa una inferencia en el 90.

---

## 6. Deudas 90 y 94

### 90 — el default NO cambio, y los tests viejos siguen midiendolo

- `Dialog.test.tsx` pasa de **19 a 32** `it()`: los 19 viejos siguen ahi y **el diff no toca ni uno**. Los
  cuatro de la trampa de foco, los tres del retorno al disparador y "al abrir, el foco entra en el dialogo"
  estan intactos, no reescritos ni relajados. **Siguen midiendo el default.**
- Ademas hay uno nuevo que lo dice con todas las letras: "SIN la prop, sigue enfocando el panel exactamente
  como antes".
- La mutacion **90-A** (ignorar la prop) deja **1 rojo y 38 verdes**: la prueba positiva de que el default no
  se movio.
- El repliegue **deriva de `focusableWithin`** (`Dialog.tsx:165-168`), la misma lista que usa la trampa de
  tabulacion: una sola definicion de "enfocable", imposible de desincronizar. **Nunca deja el foco en el
  body.** Los tres casos malos (no montado / no enfocable / fuera del panel) tienen test cada uno, y la
  mutacion 90-B pone rojos los dos que corresponden.

**La deuda 90 esta saldada.** El unico problema es la **justificacion escrita** del repliegue. Ver §1.

### 94 — busque el cuarto sitio: no existe en codigo ni en docs

Los **tres** sitios estan corregidos, verificados uno a uno:

| Sitio | Estado |
|---|---|
| `Dialog.tsx:95-113` (docblock) | corregido: nombra el `main` y `--z-base`, y **avisa** del error viejo |
| `dialog.variants.ts:8-14` (comentario de z-index) | corregido |
| `Dialog.test.tsx:119-122` (comentario del test del portal) | corregido |

`grep -rn "portal"` sobre `src/**` y `docs/**` no devuelve **ningun cuarto**. Y verifique las dos premisas
factuales en vez de creerlas:

- **`archive-nav.variants.ts` NO tiene ninguna transformacion.** Un `grep -ri` de la propiedad sobre todo el
  repo **no lo devuelve**; las lineas 72 y 133 crean el contexto de apilamiento con `drop-shadow`. La causa
  vieja era falsa, en efecto. (Historicamente **si** la tuvo, y desaparecio en el lote `archive_nav_e8_e10`:
  eso explica de donde salio la confusion.)
- **`AppShell.tsx`**: el `main` lleva posicion relativa **y** el token de la capa base, con `{children}`
  dentro; `ArchiveNav` y `BottomNav` son **hermanos** del `main`, no descendientes. `--z-base:1`,
  `--z-nav:100`, `--z-overlay:200`, `--z-modal:300` (`globals.css:270-287`). El argumento es correcto.

Quedan menciones de la prosa vieja en **artefactos historicos**
(`progress/reports/impl_33_ui_primitives_2.md:112`), que son registro inmutable y ya estan **contradichos en
su propio informe de cierre** (`progress/informs/17.informe-ui_primitives_2.md:120-127`, que es donde nacio
la ficha 94). **No cuentan como cuarto sitio** y no hay que tocarlos.

### El test del portal protege de verdad? La pareja si; el archivo solo, a medias. Y esta declarado.

Esta era la pregunta afilada del encargo. Mi juicio:

| Pregunta | Respuesta |
|---|---|
| Cae `dialog.portal.tokens.test.ts` si alguien **quita el portal**? | **NO.** Lee `AppShell.tsx` y `globals.css` como **texto**; `createPortal` no le afecta. |
| Cae **algo** si alguien quita el portal? | **SI**: "se monta en un portal al body, fuera del arbol de la pagina", en `Dialog.test.tsx`, que mide en runtime que el contenedor de `render()` no contiene el dialogo. Mutacion **94-D** declarada: 1 rojo. |
| Cae si alguien **mueve un token** y rompe la relacion? | **SI.** 94-B (`--z-base` a 500) da 2 rojos: falla contra 100 y contra 300. |
| Cae si el `main` **deja de ser jaula**? | **SI.** 94-A: el aserto de la posicion **y** el del z-index, por separado. |

**No es "un test que solo lee tres numeros y los compara entre si"** — que era el fallo que el encargo temia.
Ademas de las desigualdades, ancla las **premisas estructurales** del argumento: el `main` esta posicionado
**y** lleva z-index (las dos condiciones de un contexto de apilamiento, asertadas por separado porque con una
sola no habria jaula), el contenido de la pagina vive dentro, y **ninguno de los dos navs se monta dentro del
main**. Esas premisas son justo lo que la deuda 94 decia que estaba mal explicado.

Lo que protege el portal en si es la **otra mitad**, en runtime, y el implementer **lo dice explicitamente**
en vez de venderlo (informe §5: "La otra mitad —que el panel de verdad sale del arbol— ya se mide en runtime
en Dialog.test.tsx"), con los dos archivos citandose mutuamente. **Reparto honesto. Lo apruebo.**

---

## 7. Reglas del arnes y estado del arbol

| Regla | Estado |
|---|---|
| **REGLA 1** (clases inventadas o con comodin) | OK. `src/app/globals-css.test.ts` **verde**. Los tests nuevos arman los nombres por concatenacion o los **importan** de las variantes. Verifique ademas que `globals.css:15-19` declara `@source not` para `progress`, `docs` y `template`: los `.md` **no se escanean**. **Comprobado empiricamente:** la utilidad de latido aparece citada en el informe `.md` y hay **0** en el bundle. |
| **REGLA 2a** (ancla al literal de lo que es contrato) | OK. `TEMPLATE` en `skeleton.tokens.test.ts:43-51`, con los valores del template escritos a mano **una sola vez** y el porque al lado; y los cuatro z-index en el gate del portal. |
| **REGLA 2b** (comportamiento derivando) | OK. Las clases se **importan** de las variantes, las paradas de tabulacion se leen del DOM, el tamano del fondo se comprueba **derivado** de la banda. |
| **REGLA 3** | OK. 11 mutaciones, conteos cuadran, 3 reproducidas por mi al caracter (§5). |
| **REGLA 7** | OK. Gate sobre CSS **compilado** mas bundle de produccion (§3). Ningun aserto sobre el string crudo de `cva`. |
| **Cero hardcode** | OK. `no-hardcode.test.ts` **verde** y **demostradamente** barriendo `root-scroll-lock.ts` (2 tests generados, §0). Todo numero y color nuevo vive en `globals.css`. |
| **Sintaxis canonica** | OK. `canonical-tailwind-classes.test.ts` verde; las dos utilidades nuevas usan la forma corta con parentesis. |
| **pnpm** | OK. Ni un npm ni un npx, tampoco en mi verificacion. |
| **Entorno happy-dom por archivo** | OK. En los de componente; los dos de tokens no lo llevan, y es correcto: no montan nada. |
| **SDD §9.3 (axe)** | OK. `Skeleton.test.tsx:88` (las tres formas) y `Dialog.test.tsx:541` (sobre `document.body`, correcto por el portal). |

### Checklist visual del SDD §9

| Punto | Estado |
|---|---|
| 1. RTL + user-event, comportamiento y a11y | OK, 30 tests nuevos escritos (mas 2 autogenerados) |
| 2. Smoke de render | OK, los que ya habia, intactos |
| 3. axe en primitivos | OK, verde en los dos |
| 4. Typecheck + lint + build | OK, ejecutados por mi |
| 5. Fidelidad visual | Pendiente de revision humana, **correctamente fichada** en 95 y 102 |

No aplica smoke de ruta: no se monto ninguna pagina.

### public-api.test.ts: el razonamiento del implementer es CORRECTO

Lo juzgue en vez de aceptarlo. El test hace `toEqual` sobre la lista **ordenada** de
`Object.keys(namespace)`, asi que falla en las dos direcciones (al anadir y al quitar). Lei los barriles:

```
dialog/index.ts   -> DIALOG_CLOSE_LABEL, Dialog, DialogProps(tipo), DIALOG_SIZES, DialogSize(tipo)
skeleton/index.ts -> Skeleton, SkeletonProps(tipo), SKELETON_SHAPES, SkeletonShape(tipo)
```

- `initialFocusRef` es una **prop**: invisible para `Object.keys`.
- El renombre de la constante de clases del `Skeleton` a plural: **nunca estuvo en el barrel** ni en la lista
  `PRIMITIVES` del ancla.
- `root-scroll-lock` **no se reexporta**. Si lo estuviera, `lockRootScroll` habria aparecido en el namespace
  y el test **habria caido** — o sea que su silencio aqui es informativo, no casual.

**Nada paso a ser publico. El test hizo bien en no caer, y el implementer hizo bien en comprobarlo en vez de
suponerlo.** Dicho eso, el episodio destapa un agujero real del ancla, que propongo fichar (§8).

### El arbol quedo byte a byte como estaba: CONFIRMADO

`git status --porcelain` tras mi propia bateria de mutaciones (todas en el scratchpad y en `.next/`, que esta
en `.gitignore`, y borradas al terminar):

```
 M progress/current.md
 M progress/deudas.md
 M src/app/globals.css
 M src/shared/ui/primitives/dialog/Dialog.test.tsx
 M src/shared/ui/primitives/dialog/Dialog.tsx
 M src/shared/ui/primitives/dialog/dialog.variants.ts
 M src/shared/ui/primitives/skeleton/Skeleton.test.tsx
 M src/shared/ui/primitives/skeleton/Skeleton.tsx
 M src/shared/ui/primitives/skeleton/skeleton.variants.ts
?? progress/reports/impl_deudas_86_87_90_94.md
?? src/shared/ui/primitives/dialog/dialog.portal.tokens.test.ts
?? src/shared/ui/primitives/dialog/root-scroll-lock.ts
?? src/shared/ui/primitives/skeleton/skeleton.tokens.test.ts
```

**`AppShell.tsx` NO aparece**, pese a haber sido mutado dos veces (94-A y 94-C). Tampoco `globals.css` tiene
borrados: `git diff --stat` da `39 insertions(+)` y **cero deletions**. **La afirmacion se sostiene.**

---

## 8. Observaciones NO bloqueantes

1. **Deuda nueva sugerida (103): el ancla de public-api.test.ts es solo de runtime.** `DialogProps` gano una
   prop publica y **ningun ancla se movio**, porque `Object.keys` no ve tipos. Para un template **portable**
   la superficie de tipos **es** contrato: quitar o renombrar una prop rompe a un consumidor igual que quitar
   un export. Familia de la **ficha 93**. Arreglo: un ancla de tipos (`expectTypeOf`, o una lista de nombres
   de props por componente).
2. **Sin test para el ciclo abrir/cerrar repetido** (§4, trampa 4). Lo verifique y **funciona**, pero es la
   unica de las cuatro trampas del contador sin gate propio. Son dos lineas dentro del `describe` que ya
   existe.
3. **progress/current.md declarado como "19 ++" en el informe §1; son 39.** Trivial, pero esa tabla se
   presenta como el inventario del cambio.
4. **"32 tests nuevos" en el checklist del SDD §9 (informe §8).** El implementer escribio **30**; los otros 2
   los genero solo el guardrail de no-hardcode. El total (788) es correcto. Merecia decirse, porque es la
   mejor evidencia de que el barrido por directorios funciona (§0).
5. **Ficha 87: titulo historico reescrito al tacharlo** (§2). Disculpado por el cuerpo y por la ficha 96,
   pero como criterio general conviene tachar el enunciado **original** y aclarar debajo.

---

## Checkpoints

- **C1:** [x] — `AGENTS.md`, `init.sh`, `feature_list.json`, `progress/current.md`, los 3 docs de
  `docs/harness/` y `CHECKPOINTS.md` existen. `bash ./init.sh` ejecutado por mi: **exit 0**.
- **C2:** [x] — `feature_list.json` **sin cambios** (33 features, ninguna `in_progress`; la unica aparicion
  de la cadena es el enum del esquema, linea 14). `progress/current.md` describe la sesion activa, sin basura
  de sesiones anteriores.
- **C3:** [x] — El lote es **solo `src/shared/ui/`**: no toca capas, ni DB, ni route handlers, ni
  `src/proxy.ts`. Feature-first intacto. **Sin dependencias nuevas.** Sin `console.log` ni `TODO`/`FIXME` en
  ningun archivo nuevo o modificado (verificado por `grep`). Sin secretos.
- **C4:** [x] — Cada modulo nuevo tiene test (`root-scroll-lock.ts`, 6 tests en `Dialog.test.tsx` mas el
  aserto del `afterEach`; el shimmer, `skeleton.tokens.test.ts`; el porque del portal,
  `dialog.portal.tokens.test.ts`). Lint y typecheck **verdes**. **788 passed / 13 skipped**, todo verde.
  `pnpm build` **OK**.
- **C5:** [x] parcial — Sin artefactos sospechosos sin trackear (los mios vivieron en `.next/`, ignorado, y
  estan borrados). La entrada de `progress/history.md` **todavia no existe**: la escribe el **leader** al
  cerrar, no el implementer, asi que **no cuenta contra este lote**. No aplica "ultima feature en su estado
  correcto": esto no es una feature.

**Ningun checkpoint falla por culpa de este lote.** El bloqueante del §1 no es de checkpoint: es de
veracidad del registro.

---

## Cambios requeridos

**Uno solo, y es de prosa. No toques `src/`.**

1. **Corregir la afirmacion falsa sobre happy-dom** en los **dos** sitios donde vive:
   - `progress/deudas.md`, **ficha 90**, el parrafo que empieza "Dato medido y relevante: happy-dom **si**
     enfoca un `input` deshabilitado...".
   - `progress/reports/impl_deudas_86_87_90_94.md`, **§4** ("El dato que justifica no confiar en el DOM") y
     **§9** (ultimo bullet de REGLA 7).

   **El dato correcto, medido por mi de dos formas independientes:** happy-dom **NO** enfoca un control
   deshabilitado — `focus()` es un **no-op** y el foco **se queda donde estaba**. La mutacion 90-B se pone
   roja porque **el panel no recibe el foco** (se queda en el boton disparador), no porque lo reciba el campo
   deshabilitado. Hay que **retirar tambien** la conclusion derivada "el gate habria dado verde sin repliegue
   ninguno": es falsa, y en la direccion peligrosa — una implementacion que llamara a `focus()` y comprobara
   donde quedo el foco **si** habria funcionado.

   **La decision de codigo no cambia.** Derivar el repliegue de `focusableWithin` sigue siendo lo correcto,
   por el motivo que el comentario de `Dialog.tsx:159-168` **ya explica bien**: una sola fuente de verdad de
   "enfocable", que no puede desincronizarse con la trampa de tabulacion.

**Corregido eso, esto es APPROVED.** El resto del lote es solido: las cuatro fichas estan realmente saldadas,
el contador de referencias no tiene agujeros (probe hasta la cuarta trampa, que nadie habia pedido), el port
del shimmer es fiel al template numero por numero, el gate corre sobre CSS compilado de verdad, y las tres
mutaciones que pude reproducir salieron identicas a lo declarado.

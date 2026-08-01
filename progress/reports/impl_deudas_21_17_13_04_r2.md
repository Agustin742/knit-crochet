# impl r2 — lote de higiene: deudas 21, 17, 13 y 4 (segunda vuelta)

> Respuesta a `progress/reports/review_deudas_21_17_13_04.md` (**CAMBIOS REQUERIDOS**), leído entero.
> **No se tocó nada de lo aprobado**: deudas 21, 13 y 4 quedan como estaban, y las tres decisiones de juicio
> (borrar `handleLogout`, los 3 tests eliminados, el hallazgo de la deuda 33) no se revolvieron.
> **`feature_list.json` no se tocó.**
>
> Partía de **433 passed | 6 skipped**. Resultado: `bash ./init.sh` VERDE, **435 passed | 6 skipped**
> (+2). `pnpm build` OK. `globals-css.test.ts` 6 passed.

**El reviewer tiene razón en los dos bloqueantes.** El primero es el más incómodo de admitir y el más
instructivo: mi arreglo de la deuda 17 **movió el defecto de 1 superficie a 3** y yo lo registré como
"límite conocido" (ficha 32) en vez de como lo que era, una regresión dentro del radio de mi propia
decisión. Y el segundo es peor todavía en lo que tiene de método: el test que yo escribí para demostrar que
el arreglo funcionaba **medía un par de tokens que ningún camino del código puede producir**, y por eso me
salió verde justo el caso que estaba roto. Los dos están cerrados abajo, y el segundo con la condición doble
que pedía el encargo, ejecutada de verdad en las dos direcciones.

---

## 1. Bloqueante 1 — la deuda 17 estaba *mudada*, no saldada

**Salida tomada: la (1) del reviewer**, como decidió el líder — declarar el primer plano de `Card` junto al
fondo que ya declara. **No** la (2) (des-tachar la ficha 17).

### Qué cambié

`src/shared/ui/primitives/card/card.variants.ts` — **una clase en la base** de la `cva`, junto al padding:
la tarjeta declara ahora su primer plano (el rol oscuro, por token; sin ningún valor literal). Las dos
variantes son superficies claras, así que la base las cubre a las dos.

Va acompañada de un comentario que explica el porqué **y** el acoplamiento: una superficie que elige su
fondo tiene que elegir también qué se lee encima, **porque es de aquí de donde hereda la variante fantasma
del botón**. Es la contrapartida de la decisión de la deuda 17, escrita en el sitio donde alguien la va a
leer antes de quitarla.

### Efecto medido

| Superficie | Antes del lote | Tras la 1ª vuelta | Ahora |
|---|---|---|---|
| Fondo de la app | 1.00 — invisible | **12.83** | **12.83** |
| Tarjeta elevada | 14.65 | 1.14 — roto | **14.65** |
| Tarjeta plana | 13.84 | 1.08 — roto | **13.84** |

Las **4 de 4** superficies quedan legibles; ninguna empeora respecto de antes del lote. (La superficie
hundida no entra en la tabla porque no es un contenedor: sólo la usa el estado deshabilitado del propio
botón, que fija su par fondo/primer plano completo y no hereda nada.)

### Por qué acepto que era mío y no de la ficha 32

Porque la distinción del reviewer es correcta y yo no la hice: *que un párrafo suelto dentro de una tarjeta
saliera ilegible* ya estaba roto antes de tocar nada — eso sí es la 32; *que el botón fantasma dentro de una
tarjeta sea invisible* **no** estaba roto antes (14.65:1), lo rompí yo. Registrar el límite honestamente no
convierte una regresión en deuda heredada. Y el argumento operativo del reviewer es el que remata: una ficha
**tachada** es una ficha que nadie vuelve a mirar, así que archivar como resuelto algo que empeoró es peor
que dejarlo abierto.

### Fichas actualizadas en `deudas.md`

- **Ficha 17:** apartado nuevo **(c) SEGUNDA VUELTA**, con las mediciones de las 4 superficies, la
  distinción entre lo preexistente y lo que rompió el arreglo, y la constancia de que **se cierra junto con
  la 32 y por el mismo cambio**. No borré nada de lo anterior.
- **Ficha 32: tachada** siguiendo el protocolo (`~~…~~` + cómo + dónde), con los números antes/después, la
  explicación de por qué nació separada y por qué no podía quedarse abierta sin dejar mintiendo a la 17, y
  la regla que deja escrita: *una superficie que elige su fondo elige también su primer plano*.

### Consumidores de `Card` verificados

`Card` sólo se instancia en `Card.test.tsx` (barrido de `<Card` y `cardVariants` en todo `src`): no hay
ningún consumidor de app al que se le pueda cambiar el color por debajo. Los 5 tests que ya existían siguen
verdes, incluido el de `axe` y el de fusión de `className` — un llamador que pase su propio color de texto
lo sigue ganando por `twMerge`, así que la clase nueva no cierra ninguna puerta.

---

## 2. Bloqueante 2 — el test que certificaba en verde el caso roto

### El diagnóstico, confirmado

El test decía *"lo que hereda sobre una superficie clara también"* y medía el rol oscuro contra la tarjeta
elevada: **14.65, verde**. Pero desde que la variante fantasma hereda, **nunca recibe ese rol sobre una
tarjeta**: recibe lo que la tarjeta declare, y no declaraba nada. El valor real de ese escenario era 1.14.
Es el patrón de las deudas 18/22/23 —"el test mide tokens, el layout consume clases"— reproducido dentro
del lote que venía a limpiarlo. Escribí el test eligiendo yo el par en vez de **derivarlo del código**, y
por eso midió lo que yo esperaba en vez de lo que pasa.

### Cómo lo corregí: el par se deriva, no se elige

El bloque de contraste ya no nombra a mano ninguna superficie clara. Ahora:

1. **Lee la regla `body` de `globals.css`** y saca de ahí dos cosas: el color que **hereda** todo lo que no
   declare primer plano, y el fondo de la app. (Comprobado que es el mismo token que pinta `AppShell` con
   su clase de fondo, así que el par del shell es real, no analógico.)
2. **Llama a `cardVariants` de verdad**, una vez por variante, pasa el resultado por `cn()` y **extrae de
   las clases** el token de fondo y el de primer plano. Si la tarjeta **no declara** primer plano, el test
   usa automáticamente **el heredado del `body`** — que es justo lo que le pasaría al botón en pantalla.
3. Mide el contraste de ese par y exige 4.5:1, con un test **por variante de `Card`**.

O sea: el test no puede quedar verde por el motivo equivocado, porque el par lo pone el código, no yo. El
barrido de variantes de `Card` es además un `Record` tipado: **una variante nueva que no se registre rompe
el typecheck** en vez de quedarse sin medir.

### La condición doble, ejecutada en las dos direcciones (evidencia)

**(a) SIN el arreglo de `Card`** — quité la clase de primer plano y corrí el archivo:

```
 × lo que hereda dentro de una tarjeta raised también se lee
 × lo que hereda dentro de una tarjeta flat también se lee

AssertionError: un botón fantasma dentro de una Card raised hereda --fg-inverse sobre --surface-raised:
  expected 1.1423543436615025 to be greater than or equal to 4.5
AssertionError: un botón fantasma dentro de una Card flat hereda --fg-inverse sobre --surface:
  expected 1.0787340444807942 to be greater than or equal to 4.5

 Tests  2 failed | 11 passed (13)
```

**Rojo, y por el motivo correcto**: el mensaje nombra el par real (`--fg-inverse` sobre la superficie) y los
valores coinciden con las mediciones independientes del reviewer (1.14 y 1.08). El test **no depende de que
yo me acuerde de actualizarlo**: detecta solo la ausencia de la declaración.

**(b) CON el arreglo de `Card`** — restaurada la clase:

```
 Test Files  1 passed (1)
      Tests  13 passed (13)
```

**Verde, por el motivo correcto** (14.65 y 13.84).

### Repaso de los otros tres tests de contraste, con ese mismo ojo

El reviewer decía que los tres miden pares alcanzables. **Lo confirmo, y además dejé dos de ellos también
derivados** en vez de escritos a mano:

| Test | ¿Alcanzable? | Comprobación |
|---|---|---|
| *"el primer plano que la variante fijaba antes era INVISIBLE sobre el fondo de la app"* | Sí, **era** el camino real hasta este lote | Es la documentación del defecto original (par histórico, declarado como tal en el nombre y en el comentario). El fondo ya no se nombra a mano: sale de la regla `body`. |
| *"lo que hereda sobre la superficie oscura de la app sí se lee"* | Sí | **Los dos extremos salen de la regla `body`** (su `color` y su `background-color`). Y verifiqué que la clase de fondo que pinta `AppShell` referencia **ese mismo token**, así que el par es el del shell real, no uno equivalente de memoria. |
| *"el anillo de foco se ve sobre el fondo oscuro"* | Sí | El anillo lo declara la base de `buttonVariants` con el token de foco, y el fondo vuelve a salir de la regla `body`. Umbral 3:1 (componente de interfaz, no texto). |

---

## 3. No bloqueantes

### 3.a — Agujero (a) del gate de la deuda 13: **cerrado en código, sin ficha**

Como prefería el líder, era barato: el barrido de las 8 combinaciones tamaño×variante ahora asierta la
**presencia** de la clase que lleva el interlineado pegado al tamaño, no sólo la ausencia del interlineado
suelto (sigue asertando también la ausencia, que no estorba). Con eso, el escenario del reviewer —un
`compoundVariants` con un tamaño de texto dentro, que se aplica **después** de `size` y se lleva las dos
cosas de golpe— **cae con el gate**, porque esa combinación dejaría de tener ninguna clase de tamaño con
interlineado. El comentario del test explica exactamente ese escenario, para que nadie lo revierta por
parecer redundante.

### 3.b — Agujero (b): **ficha 34 nueva**

El eje del llamador no se puede cerrar dentro del primitivo (`className` es un override legítimo por
contrato del design system), así que va a ficha con su escenario concreto: un consumidor que pase un tamaño
de texto suelto en `className` reproduce la deuda 13 desde el sitio de llamada, con los 13 tests del
primitivo en verde porque miden la salida de `buttonVariants` **sin** `className`. La ficha propone las dos
salidas reales (un gate que pase tamaños por `className`, o documentar en el primitivo que un tamaño venido
de fuera se escribe con la forma unida).

**Y retiro la frase de mi informe anterior.** Dije que la forma elegida era *"estructuralmente inseparable:
no hay reordenación, refactor ni `twMerge` que pueda quedarse con una mitad"*. Es más fuerte de lo que el
gate sostiene y de lo que la forma garantiza: es inseparable **dentro de la clase**, pero cualquier otra
clase de tamaño que llegue después —de un `compoundVariants` o de un `className`— se lleva el par entero.
La forma sigue siendo la buena; la afirmación era demasiado ancha.

### 3.c — Ficha 33: acoplamiento con la 13 añadido

Añadido a la ficha, con aviso destacado: hoy la clasificación errónea de `twMerge` es justamente **lo que
protege** el interlineado de la etiqueta del archivero, así que quien tape la 33 renombrando la utilidad a
una talla reconocida **hace caer la etiqueta en la deuda 13 en el mismo movimiento**, en silencio y con el
test de la 33 en verde. La ficha dice ahora explícitamente que se tape con la forma tamaño+interlineado
unida, no sólo renombrando.

### 3.d — Ficha 31: alcance corregido

Añadido el tercer valor: la tarjeta elevada da **3.13**, que **sí** pasa el umbral de 3:1; las que no pasan
son la superficie plana (2.95) y la hundida (2.41). Como la elevada es la variante **por defecto** de
`Card`, la ficha decía más de lo que pasa en el caso más común. Reescrito también el escenario de fallo
para que apunte a los dos casos que fallan de verdad, con una advertencia de no mover un token de identidad
a ciegas.

---

## 4. Verificación

### `bash ./init.sh` — VERDE

```
[OK]    lint verde
[OK]    typecheck verde

 Test Files  41 passed | 1 skipped (42)
      Tests  435 passed | 6 skipped (441)

[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
```

### Delta explicado: 433 → 435 = **+2**, cero tests eliminados en esta vuelta

| Archivo | Antes (r1) | Ahora | Δ | Motivo |
|---|---|---|---|---|
| `button.variants.test.ts` | 12 | 13 | **+1** | el test de superficie clara —que era **uno** y medía un par inalcanzable— pasa a ser **uno por variante de `Card`** (elevada y plana), derivados del código. Neto +1. |
| `Card.test.tsx` | 5 | 6 | **+1** | gate directo de la deuda 32: la tarjeta declara primer plano junto a su superficie. |
| todo lo demás | — | — | 0 | intacto |
| **total** | **433** | **435** | **+2** | |

Los 6 `skipped` siguen siendo los mismos. Acumulado del lote completo: 420 → 435 = **+15**.

### `pnpm build` — OK

`✓ Compiled successfully in 6.5s` + `✓ Generating static pages (12/12)`. Sin errores ni warnings nuevos.
(Como en la primera vuelta, `pnpm build` reescribe `next-env.d.ts`; lo devolví a su estado para no ensuciar
el diff del usuario.)

### `src/app/globals-css.test.ts` — 6 passed

Corrido aparte porque volví a tocar clases. El guardrail de alcance de escaneo sigue intacto y `globals.css`
compila sin CSS inválido.

### Higiene

- **`pnpm` siempre**, en todos los comandos. Cero `npm`, cero `npx`.
- **Ninguna clase con comodín** en código, comentarios, `deudas.md` ni en este informe; barrido hecho. Los
  nombres de clase de los tests se siguen armando por concatenación en runtime.
- **Cero hardcode:** `no-hardcode.test.ts` cubre `card.variants.ts` y sigue verde; la clase añadida es una
  utilidad de rol, sin valores literales.
- **Ninguna operación de git nueva.** La única preparada en el índice sigue siendo la eliminación de
  `tsconfig.tsbuildinfo` de la primera vuelta.

---

## 5. Archivos tocados en esta vuelta

| Archivo | Qué |
|---|---|
| `src/shared/ui/primitives/card/card.variants.ts` | **modificado** — primer plano en la base, junto al fondo (bloqueante 1; salda la deuda 32 y hace verdadera la 17). |
| `src/shared/ui/primitives/card/Card.test.tsx` | **modificado** — +1 test: la tarjeta declara su primer plano. |
| `src/shared/ui/primitives/button/button.variants.test.ts` | **modificado** — bloque de contraste reescrito para **derivar** los pares de `cardVariants` y de la regla `body` (bloqueante 2); barrido de combinaciones pasado a aserción de presencia (no bloqueante a). |
| `progress/deudas.md` | ficha 17 ampliada con la 2ª vuelta; **ficha 32 tachada**; ficha 31 corregida; ficha 33 ampliada; **ficha 34 nueva**. |
| `progress/current.md` | estado de la segunda vuelta. |

## 6. Qué queda sin hacer

- **Deuda 34** (eje del llamador) y **deuda 31** (anillo de foco en dos superficies claras): registradas, no
  arregladas. La 34 no se cierra dentro del primitivo y la 31 mueve un token de identidad — decisión de
  diseño, no de higiene.
- **Deuda 30** (`"use client"` sobrante en `AppShellClient`): sigue diferida a #31, como en la primera
  vuelta y sin objeción del reviewer.
- **Deudas fuera de alcance, no tocadas:** 3, 22, 23, 24, 25, 26, 27, 28.
- **`progress/history.md`** (checkpoint C5 del reviewer): es el paso de cierre del **líder**, no mío.
- **Validación visual en navegador:** sigue sin ser posible por el mismo motivo de la primera vuelta — ni la
  variante fantasma ni `Card` tienen consumidor montado en ninguna ruta (`/` es la única que existe). Lo que
  la sustituye es la medición sobre los tokens y las clases que el código declara de verdad, que para
  contraste es más preciso que el ojo.

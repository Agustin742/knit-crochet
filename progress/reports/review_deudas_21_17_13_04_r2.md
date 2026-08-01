# Review r2 — lote de higiene: deudas 21, 17, 13 y 4 (segunda vuelta)

**Veredicto: APROBADO**

> Re-review acotada de `progress/reports/impl_deudas_21_17_13_04_r2.md`, contra los dos bloqueantes de
> `progress/reports/review_deudas_21_17_13_04.md`.
> **Todo verificado por mí**: `bash ./init.sh` y `pnpm build` corridos de nuevo, contraste medido con mi
> propia fórmula de WCAG, y **la condición doble reproducida en las dos direcciones quitando yo mismo la
> clase y restaurándola con verificación de hash**. Ningún número de este informe viene del informe del
> implementer.

---

## 0. Verificación de base

- **`bash ./init.sh` VERDE, exit code 0.** Corrido por mí: `Test Files 41 passed | 1 skipped (42)`,
  **`Tests 435 passed | 6 skipped (441)`**. El número declarado es exacto (+2 sobre 433; +15 sobre el
  baseline original de 420).
- **`pnpm build` OK.** Corrido por mí: compila y emite el árbol completo de rutas (24 handlers + `/` +
  `/_not-found`) y el `Proxy (Middleware)`. Sin errores ni warnings nuevos. *(Como avisaba el implementer,
  el build reescribe `next-env.d.ts`; lo restauré yo tras comprobarlo, el árbol de trabajo queda limpio.)*
- **Lo aprobado en r1 NO se tocó.** Comprobado por diff-stat: `.gitignore` (4+),
  `AppShellClient.test.tsx` (140), `AppShellClient.tsx` (68), `AppShell.tsx` (11) y `button.variants.ts` (24)
  tienen **exactamente las mismas cifras que en la primera vuelta**. Las deudas 21, 13 y 4 están intactas y
  las tres decisiones de juicio no se revolvieron.
- **`feature_list.json`: cero cambios** (diff vacío). Sigue sin ser una feature.
- **Git: ninguna operación nueva.** La única preparada en el índice sigue siendo la eliminación de
  `tsconfig.tsbuildinfo` de la primera vuelta. Cero commits, cero ramas.
- Los únicos archivos nuevos de esta vuelta son `card.variants.ts` y `Card.test.tsx` (modificados) más los
  informes. Sin artefactos sospechosos.

---

## 1. Bloqueante 1 — CERRADO

`src/shared/ui/primitives/card/card.variants.ts:16` añade el rol de primer plano oscuro a la **base** de la
`cva`, junto al padding. Al estar en la base cubre las dos variantes, que son ambas superficies claras.

### Contraste medido por mí, con mi propia fórmula, en las 4 superficies

| Superficie | Antes del lote | Tras r1 | **Ahora** |
|---|---|---|---|
| Fondo de la app (`--bg`) | 1.00 — invisible | 12.83 | **12.83** ✅ |
| Tarjeta elevada (`--surface-raised`) | 14.65 | 1.14 — roto | **14.65** ✅ |
| Tarjeta plana (`--surface`) | 13.84 | 1.08 — roto | **13.84** ✅ |
| Superficie hundida (`--surface-sunken`) | — | — | **no aplica** (ver abajo) |

**Las 4 de 4 quedan resueltas y ninguna empeora respecto de antes del lote.** La regresión que yo señalaba
está revertida y el arreglo original de la 17 se conserva.

### La superficie hundida: comprobé yo el caso que el implementer no detalló

El implementer la despacha en un paréntesis. **Lo verifiqué y tiene razón, por el motivo que dice.** Barrido
de `--surface-sunken` en todo `src`: aparece **sólo dos veces**, en
`button.variants.ts:32` y `Input.tsx:18`, y **las dos como estado deshabilitado que fija su par completo**
(fondo hundido + primer plano apagado en la misma declaración). No es un contenedor: nada se anida dentro,
así que **no participa del mecanismo de herencia** que discute la deuda 17. Medido de todos modos por
prudencia: el par real del deshabilitado da **4.09:1** — por debajo de 4.5, pero los controles inactivos
están **explícitamente exentos** del criterio de contraste de WCAG, y además no depende de herencia. **No es
hallazgo.**

### Consumidores de `Card`: verificado que no se rompió a nadie

Barrido de `<Card` y `cardVariants` en todo `src`: **`Card` no tiene ningún consumidor de aplicación**. Sus
únicas instanciaciones están en `Card.test.tsx` y la única lectura de `cardVariants` fuera del propio
primitivo es el test de contraste. **Nadie podía apoyarse en que heredaba el primer plano del `body`**, ni a
sabiendas ni por accidente. Los tests previos de `Card` siguen verdes, incluido el de `axe` y el de fusión
de `className` — y como la clase va en la base, un llamador que pase su propio color lo sigue ganando por
`twMerge`, así que no se cierra ninguna puerta.

### ¿La deuda 32 está legítimamente saldada, o quedó algún borde vivo?

**Está saldada de verdad, y en su alcance completo**, no sólo en la parte que rozaba a la 17. Es el punto
que me interesaba comprobar, porque la 32 se enunciaba como *"`Card` no declara primer plano"*, que es más
ancho que *"el botón fantasma dentro de `Card`"*:

- El caso general del enunciado —`<Card><p>texto</p></Card>`— queda arreglado por el mismo cambio: cualquier
  descendiente que no declare color propio hereda ahora el rol oscuro de la tarjeta, **14.65** en la elevada
  y **13.84** en la plana. Era el escenario literal de la ficha y está cubierto.
- Comprobé el otro texto que puede caer dentro de una tarjeta, el apagado (`--fg-muted`, que usa
  `Field.tsx:67`): da **5.30** sobre la elevada y **5.01** sobre la plana. **Pasa.** No queda ese borde.
- Las dos variantes de `Card` son las únicas que existen y las dos son claras, así que la base las cubre sin
  excepciones.

**No encuentro borde vivo de la 32.** Tacharla es correcto.

---

## 2. Bloqueante 2 — CERRADO, y el par nuevo **sí es alcanzable**

### La condición doble, reproducida por mí (no aceptada por declaración)

Es el punto entero del hallazgo, así que lo ejecuté yo. Método, para que sea auditable: copié
`card.variants.ts` al scratchpad, registré su `sha256`, quité **sólo** la clase de primer plano por script,
corrí el test, restauré desde la copia y **verifiqué con `sha256sum -c` que el archivo quedó byte a byte
idéntico** (`OK`). No edité código del implementer: lo dejé exactamente como estaba.

**(a) SIN el arreglo de `Card`** — resultado real de mi ejecución:

```
 Tests  2 failed | 11 passed (13)

AssertionError: un botón fantasma dentro de una Card raised hereda --fg-inverse sobre --surface-raised:
  expected 1.1423543436615025 to be greater than or equal to 4.5
AssertionError: un botón fantasma dentro de una Card flat hereda --fg-inverse sobre --surface:
  expected 1.0787340444807942 to be greater than or equal to 4.5
```

**Rojo, y por el motivo correcto.** Los valores coinciden con mis mediciones independientes de la r1 (1.14 y
1.08) y el mensaje **nombra el par real** (`--fg-inverse` sobre la superficie), no uno genérico.

**(b) CON el arreglo restaurado** — mi ejecución: `Tests 19 passed (19)` en los dos archivos
(13 de `button.variants.test.ts` + 6 de `Card.test.tsx`). **Verde por el motivo correcto.**

La condición doble se sostiene tal como la declaró el implementer.

### El juicio de fondo: ¿se cambió un par inalcanzable por otro?

**No. El par nuevo es alcanzable, y lo es por construcción, no por coincidencia.** Leí la derivación entera
(`button.variants.test.ts:267-298`) y la contrasté con lo que pasa en pantalla:

- El fondo sale de la clase de fondo que **la propia `cardVariants` emite**, pasada por `cn()`
  (`:288-292`) — no de una lista escrita a mano.
- El primer plano sale de la clase de primer plano que **esa misma salida** declara, y **si no declara
  ninguna cae al color heredado de la regla `body` de `globals.css`** (`:296`). Ese `??` es la pieza clave:
  es lo que hace que el test **detecte solo** la ausencia de la declaración, en vez de necesitar que alguien
  se acuerde de actualizarlo.
- Y ese par es exactamente el que ocurre en el navegador: la tarjeta fija `color` en su elemento; el botón
  fantasma lleva el color heredado, que resuelve al del ancestro. **El mismo par que mide el test es el que
  pinta el CSS.**

Es decir: el test ya no *elige* el par, lo *deriva*. Eso es lo que rompe el patrón 18/22/23 — el test ahora
consume lo mismo que consume el layout. Y lo confirma la condición doble: **no hay forma de tenerlo verde
sin que el par sea legible de verdad**, porque quitar la clase lo tira al escenario heredado y cae.

Dos refuerzos que también verifiqué:

- El barrido de superficies es un `Record` tipado sobre `CardVariants` (`:61-64`): **una variante nueva de
  `Card` que no se registre rompe el typecheck** en vez de quedarse sin medir.
- Los otros tres tests del bloque ya no nombran el fondo de la app a mano: lo sacan de la regla `body`
  (`:258-265`). El par del shell es el real, no uno equivalente de memoria. Comprobé que el fondo que pinta
  `AppShell` referencia ese mismo rol: es cierto.

**Nota no bloqueante sobre robustez de la derivación** (no merece ficha): `tokenOfUtility` toma la primera
clase con prefijo de texto, así que si algún día `Card` añadiera una utilidad de texto que no sea color
(una alineación, por ejemplo), el test **fallaría con un mensaje confuso** en vez de medir. Es **fallo
ruidoso, no silencioso** —que es la propiedad que importa aquí— así que lo dejo como observación.

---

## 3. No bloqueantes de la r1

### 3.a — Agujero (a) del gate de la deuda 13: **cerrado de verdad**

`button.variants.test.ts:92-111` ahora asierta la **presencia** de la clase que lleva el interlineado pegado
al tamaño en las 8 combinaciones (y mantiene la ausencia del suelto, que no estorba).

**Verifiqué que caza el escenario que yo describí**, no me fié del comentario: monté la `cva` con un
`compoundVariants` que mete un tamaño de texto suelto y la pasé por `twMerge`:

```
salida:  font-body bg-transparent text-sm
¿conserva tamaño+interlineado? -> false   (el gate exige true)
```

El compound se aplica después de `size`, se lleva el par entero, y **la aserción nueva da `false` y hace
caer el test**. Con la redacción anterior (sólo ausencia del suelto) habría pasado en verde. Cerrado.

### 3.b — Agujero (b) → **ficha 34: escenario bien escrito**

Verifiqué el mecanismo: `twMerge` con el tamaño del llamador detrás devuelve sólo la clase del llamador,
llevándose tamaño e interlineado de la variante. La ficha lo describe con precisión —nombra `Button.tsx` y
el `cn(buttonVariants(...), className)`, dice por qué los 13 tests siguen verdes (miden la salida sin
`className`), y da las dos salidas reales. **Correcto que vaya a ficha y no a código**: el `className` del
llamador es un override legítimo por contrato del design system.

Valoro además que el implementer **retire explícitamente** su afirmación de la r1 ("estructuralmente
inseparable: no hay reordenación, refactor ni `twMerge` que pueda quedarse con una mitad") y la acote a
"inseparable dentro de la clase". Es la corrección exacta.

### 3.c — Ficha 33 ampliada: **correcta**

El acoplamiento con la 13 está escrito tal como lo verifiqué en la r1: hoy la clasificación errónea de
`twMerge` es **lo que protege** el interlineado de la etiqueta, y quien tape la 33 renombrando la utilidad a
una talla reconocida hace caer la etiqueta en la deuda 13 en el mismo movimiento, en silencio y con el test
de la 33 en verde. La ficha ordena taparla con la forma tamaño+interlineado unida. Bien.

### 3.d — Ficha 31 corregida: **correcta**

Contiene ya los tres valores y coinciden con mis medidas: **3.13** en la elevada (pasa), **2.95** en la
plana y **2.41** en la hundida (no pasan). El escenario de fallo se reescribió para apuntar a los dos casos
que fallan de verdad, con la advertencia de no mover un token de identidad a ciegas. Bien.

---

## 4. El delta de +2: explicado y comprobado, no sólo contado

Era la pregunta legítima del coordinador —dos bloqueantes cerrados con sólo +2 tests suena a poco—, así que
la verifiqué a mano en vez de aceptar la tabla.

**Aritmética, contada por mí ejecutando los archivos:**

| Archivo | r1 | r2 | Δ |
|---|---|---|---|
| `button.variants.test.ts` | 12 | **13** | +1 |
| `Card.test.tsx` | 5 | **6** | +1 |
| **total** | 433 | **435** | **+2** |

Confirmado ejecutando los dos archivos juntos: **19 passed** (13 + 6). El desglose interno de los 13 cuadra
con los 12 de la r1 estructura por estructura: el bloque de la deuda 13 sigue en 5 tests, el de la variante
fantasma sigue en 3, y el de contraste pasa de 4 a 5 **porque el test único de superficie clara se desdobló
en uno por variante de `Card`**. **Ningún test desapareció**: el de la combinatoria no se sustituyó, se
**reforzó dentro del mismo test** añadiéndole la aserción de presencia.

**Y la cobertura nueva es real, no cosmética** — es lo que de verdad importa, y lo demostré en las dos
direcciones:

- Los **2 tests de superficie clara** los vi **caer en rojo** con los valores correctos al quitar la clase
  (§2). Un test que sólo puede estar verde si el defecto no existe es cobertura real.
- La **aserción reforzada** de la combinatoria la vi devolver `false` ante el escenario del
  `compoundVariants` (§3.a). Antes ese escenario pasaba en verde.
- El **test de `Card`** fija que la clase no se pierda por refactor. Es el más débil de los tres —sólo
  comprueba que exista *alguna* clase de primer plano, no que sea legible— pero **la división del trabajo es
  correcta**: la legibilidad la mide el test de contraste, que derivaría el rol equivocado y caería. Los dos
  juntos cubren el caso; ninguno sobra.

Dicho de otro modo: **+2 en el marcador, pero el cambio real es de calidad, no de cantidad** — un test que
certificaba en verde un caso roto pasó a ser dos que sólo pueden estar verdes si el caso está bien.

---

## 5. Checkpoints

- **C1 — El arnés está completo: [x]** — archivos base y los 3 docs presentes; **`bash ./init.sh` exit code
  0, corrido por mí**.
- **C2 — El estado es coherente: [x]** — `feature_list.json` intacto (31 features válidas); ninguna feature
  cambió de estado (correcto: no es una feature); `current.md` describe la sesión activa.
- **C3 — El código respeta la arquitectura: [x]** — el cambio de esta vuelta es un primitivo de
  presentación pura; no se tocaron capas de datos, route handlers ni scoping. Sin `console.log`, sin
  secretos, sin dependencias nuevas. Cero hardcode: la clase añadida es una utilidad de rol y
  `no-hardcode.test.ts` sigue verde.
- **C4 — La verificación es real: [x]** ← **levantado.** Era el checkpoint que tumbé en la r1. Ya no hay
  ningún test que asierta un par inalcanzable: el bloque de contraste **deriva** cada par del código, y lo
  comprobé haciéndolo caer en rojo a propósito. Lint, typecheck y los 435 tests verdes, verificados por mí.
- **C5 — La sesión se cerró bien: [ ]** ← **Razón:** sigue sin haber entrada de esta sesión en
  `progress/history.md`. **No es falta del implementer** (es el paso de cierre del leader, y él lo declara
  así); lo dejo sin marcar porque el checkbox describe un estado que todavía no se cumple. **No bloquea la
  aprobación del trabajo del implementer.**

---

## 6. Hallazgos de esta vuelta

**Ninguno bloqueante. Ninguna ficha nueva.** Sólo dos observaciones, ya anotadas arriba, que no requieren
acción:

1. *(Nota, §2)* La derivación del par falla **ruidosamente** si `Card` añadiera alguna vez una utilidad de
   texto que no sea color. Fallo ruidoso es la propiedad correcta; no merece ficha.
2. *(Nota, §1)* La superficie hundida da 4.09:1 en el estado deshabilitado, por debajo de 4.5, pero los
   controles inactivos están exentos del criterio de contraste de WCAG y ese par no depende de herencia.

---

## 7. Veredicto

**APROBADO.**

Los **dos bloqueantes están cerrados de verdad**, no por declaración:

1. La variante fantasma vuelve a leerse en **las 4 superficies** (12.83 / 14.65 / 13.84, medidas por mí; la
   hundida no participa del mecanismo de herencia). La regresión que introdujo la primera vuelta está
   revertida **sin perder** el arreglo original, `Card` no tenía consumidores a los que romper, y la
   **deuda 32 queda saldada en su alcance completo**, no sólo en el borde que rozaba a la 17.
2. El test de superficie clara **ya no mide un par inalcanzable**: lo deriva de las clases que emite
   `cardVariants` y de la regla `body`, y **lo vi caer en rojo con los valores correctos** al quitar la
   clase y volver a verde al restaurarla, con el archivo restaurado byte a byte.

Los dos no bloqueantes se atendieron bien: el (a) cerrado en código y **comprobado que caza el escenario**
que describí, el (b) a ficha 34 con el escenario correcto, y las fichas 33 y 31 corregidas como pedí. El
delta de +2 es honesto, **no se perdió ningún test**, y la cobertura nueva es real, verificada en las dos
direcciones.

Cerrar el lote es responsabilidad del leader (informe de síntesis en `progress/informs/` y entrada en
`progress/history.md`, único checkbox que queda sin marcar).

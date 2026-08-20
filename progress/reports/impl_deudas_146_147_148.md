# impl — deudas 148, 147 y 146 (en ese orden)

> **NO es una feature.** `feature_list.json` no se toca.
> Informe **incremental**: se escribe antes de tocar código y se actualiza al cerrar
> cada deuda, no al final (regla anti-congelación).

**Baseline heredado del leader (medido por él):** `bash ./init.sh` → EXIT 0 ·
`Test Files 77 passed | 3 skipped (80)` · `Tests 1336 passed | 13 skipped (1349)`.

---

## Plan

### 148 — el comentario del `SegmentedControl` promete lo que el tipo no sostiene
- Vía elegida: **que el tipo sostenga la promesa**, no bajar el comentario.
  `SegmentedControlOption<TValue extends string = string>` +
  `SegmentedControlProps<TValue>` con `value: NoInfer<TValue>`, de modo que `TValue`
  se infiera **sólo desde `options`** y un `value` ajeno al juego sea error de `tsc`.
- El caso de **dos `options` con el mismo `value`** no lo cierra el tipo: se cierra
  **en el render** (sólo la primera coincidencia queda pulsada) + test, y el JSDoc
  deja de prometer lo que no sostiene.
- Consumidor (`ProjectsToolbar.tsx`) y `public-api.test.ts` no se rompen.

### 147 — andamiaje en `DashboardView.tsx`
- Reescribir `EMPTY_STATE_DESCRIPTION` con el criterio de **E2(f)** (precedente en
  `src/features/projects/ui/ProjectsView.tsx`): nada de rutas, pasos ni mecánica.
- **Hoy ninguna prueba ancla esa cadena** (comprobado por barrido): se añade el
  ancla en `DashboardView.test.tsx`, igual que E2(f) hizo en `ProjectsView.test.tsx`.

### 146 — no hay gate de CSS compilado para los tres componentes de `/proyectos`
- Gate nuevo que **deriva** los nombres de clase leyendo el fuente TSX (AST de
  TypeScript, no regex a ojo) y comprueba contra el **CSS compilado** que cada uno
  emite regla real. Ni una clase literal en el test (Tailwind escanea los tests).
- Control positivo obligatorio con salida real + `git status --porcelain` limpio.
- Medir lo que el gate añade a la suite.

---

## Estado

- [x] **148 — SALDADA** · ronda 1 en lo esencial + brecha residual cerrada en ronda 2
- [x] **147 — SALDADA** · sin peros (confirmado por el reviewer)
- [x] **146 — SALDADA EN RONDA 3** · la ronda 1 entregó un gate con **verde falso** por
  dos caminos (§RONDA 2) y el re-review encontró **dos más** (§RONDA 3). Cuatro vías de
  verde falso en total, **las cuatro encontradas probando el gate, no leyéndolo**

> **Este informe tiene tres rondas.** Lo de abajo es la ronda 1 tal como se escribió,
> con notas de corrección donde dijo algo que no era cierto. La ronda 2 está al final
> y la 3 es la que cierra la 146.

## Verificación de cierre

```
$ bash ./init.sh > progress/reports/init_deudas_146_147_148.log 2>&1
INIT EXIT=0
```

```
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  78 passed | 3 skipped (81)
      Tests  1347 passed | 13 skipped (1360)
   Start at  21:37:03
   Duration  74.18s (transform 5.63s, setup 55.25s, import 62.67s, tests 42.94s, environment 24.74s)

[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
```

Log completo: `progress/reports/init_deudas_146_147_148.md` — se corrió redirigido a
`.log` y se **renombró a `.md`** porque `.gitignore:32` ignora `*.log` y la evidencia
tiene que quedar versionada. **Corrección de ronda 2:** el archivo **no es la salida
cruda a secas** — lleva una cabecera de 5 líneas explicando el renombrado y una valla
de código alrededor; lo de dentro sí es la salida sin tocar.

**Aritmética, y cierra sin residuo:**

| | Archivos | Tests |
|---|---|---|
| Partida | 77 | 1336 |
| 148 — `SegmentedControl.test.tsx` | +0 | **+3** |
| 147 — `DashboardView.test.tsx` | +0 | **+1** |
| 146 — `projects-ui.classes.test.ts` (nuevo) | **+1** | **+7** |
| **Total** | **78** | **1347** |

`77 + 1 = 78` ✔ · `1336 + 3 + 1 + 7 = 1347` ✔ · saltados sin tocar (3 archivos / 13 tests).

`feature_list.json` **no se tocó** (33 features, sin cambios de estado).

---

## 148 — cerrada: el tipo ata `value` a `options`, y lo que no ata lo dice

**Vía elegida: que el tipo sostenga la promesa.** Bajar el comentario era legítimo
pero deja el defecto real en pie: `value: string` **admite un estado imposible** y
el consumidor se entera en pantalla. El coste del genérico es una aserción de tipo
sobre `forwardRef`, no un rediseño.

**Archivos:**
- `src/shared/ui/primitives/segmented-control/SegmentedControl.tsx`
  - `SegmentedControlOption<TValue extends string = string>` y
    `SegmentedControlProps<TValue extends string = string>`. **El parámetro por
    defecto es `string`**, así que `readonly SegmentedControlOption[]` sigue
    compilando sin anotar nada (compatibilidad hacia atrás, comprobada: el test
    existente no se tocó).
  - `value: NoInfer<TValue>` — la pieza clave. Sin `NoInfer`, `TValue` se infiere
    **también** desde `value` y un valor ajeno se cuela ampliando la unión (o sea
    el genérico no arreglaría nada). Con él, `TValue` sale **sólo de `options`**.
  - `aria-pressed={index === selectedIndex}` con
    `selectedIndex = options.findIndex(...)`: la elegida pasa a ser una **posición**.
  - `key={`${index}-${option.value}`}`: con dos opciones del mismo valor ya no hay
    choque de claves (y React no avisa por algo que ahora está contemplado).
  - `forwardRef` envuelto y **reetiquetado con una aserción** al tipo genérico:
    `forwardRef` borra los genéricos. La aserción no toca el runtime, y hay un test
    nuevo que comprueba que el `ref` sigue llegando al carril.
  - JSDoc reescrito: **dice exactamente qué cierra cada cosa** (tipo / render /
    nada) en vez de un absoluto.
- `src/shared/ui/primitives/segmented-control/SegmentedControl.test.tsx`
  **+3 tests** (12 en el archivo): ancla de tipo con `@ts-expect-error`, opciones
  duplicadas, y reenvío del `ref`.
- `src/features/projects/ui/ProjectsToolbar.tsx`: se **borra `handleStatus`**. Ya
  no hace falta reconstruir el tipo del dominio buscando la opción: el primitivo
  devuelve `StatusFilter`. `onValueChange={onStatusChange}` directo.
- `src/features/projects/ui/project-filters.ts`: el JSDoc de `STATUS_FILTERS`
  repetía la misma promesa falsa (fue el bloqueante de la ronda 2 de E2). Ahora
  describe lo que el primitivo sostiene de verdad.

**Qué cierra qué (lo que la ficha pedía explícito):**

| Estado imposible | Lo cierra | Cómo se sostiene |
|---|---|---|
| **ninguna** elegida (`value` ajeno a `options`) | **el TIPO** | `NoInfer<TValue>` + `@ts-expect-error` en el test: si alguien desata `value`, `tsc` se pone rojo por directiva sin usar |
| **dos** elegidas (dos `options` con el mismo `value`) | **el RENDER** | `findIndex` + test `con dos opciones del mismo valor marca la primera y sólo la primera` |
| llamador **sin tipos** (JS puro, o un `as`) | **nada** | queda escrito en el JSDoc y **medido** en el test del ancla de tipo: salen cero pulsadas y el primitivo no se inventa una |

**REGLA 3 — salida real de los dos rojos.**

1. Quitando `NoInfer` (`value: TValue`), `pnpm run typecheck`:

```
src/shared/ui/primitives/segmented-control/SegmentedControl.test.tsx(97,9): error TS2578: Unused '@ts-expect-error' directive.
```

2. Volviendo `aria-pressed` a `option.value === value`:

```
 FAIL  src/shared/ui/primitives/segmented-control/SegmentedControl.test.tsx > SegmentedControl > con dos opciones del mismo valor marca la primera y sólo la primera
AssertionError: expected [ <button …(4)></button>, …(1) ] to have a length of 1 but got 2

- Expected
+ Received

- 1
+ 2

 Test Files  1 failed (1)
      Tests  1 failed | 11 passed (12)
```

Restaurado en los dos casos: `typecheck` EXIT 0 y
`vitest run src/shared/ui/primitives/segmented-control src/features/projects/ui`
→ `Test Files 6 passed (6)` · `Tests 102 passed (102)`.

`public-api.test.ts` **no se tocó**: el nombre exportado sigue siendo el mismo (los
tipos no viven en el espacio de nombres de runtime).

---

## 147 — cerrada: el vacío del Dashboard cuenta qué va a haber, no cómo se usa la app

**Archivos:**
- `src/features/dashboard/ui/DashboardView.tsx`: `EMPTY_STATE_DESCRIPTION` pasa de
  *"Estrená el año con un proyecto: los botones de arriba lo crean en dos pasos."*
  a *"Empezá el primero y acá van a estar tus horas, tus proyectos y lo que llevás
  tejido de cada uno."*, con el JSDoc que explica el criterio y cita E2(f).
- `src/features/dashboard/ui/DashboardView.test.tsx`: **+1 test**.

**Criterio, copiado de E2(f) y no reinventado.** El `EMPTY_DESCRIPTION` de
`/proyectos` quedó en *"Empezá el primero y va a aparecer acá con su foto, su
progreso y las horas que le dedicaste."*: **imperativo corto + qué se va a ver**,
sin rutas, sin pasos y sin nombrar controles. La copia nueva es la misma forma
aplicada a lo que esta página muestra —horas, proyectos y el progreso de cada uno—,
en el mismo voseo que el resto de la app.

**Qué NO dice, a propósito:** *metros de lana*. Son un agregado **lifetime** que no
se mueve con el filtro de año (enmienda E1.5), así que prometerlos en el vacío
**del año** sería otra vez una promesa que la pantalla no sostiene.

**El ancla que faltaba.** Barrido previo: `EMPTY_STATE_DESCRIPTION` y
`emptyStateTitle` **no aparecían en ningún test** — el test del vacío buscaba el
título por texto reconstruido a mano. El test nuevo importa la constante (así el
día que cambie, cambia en un sitio) y comprueba **las dos direcciones**: que la
copia buena está **y** que las dos frases de andamiaje no vuelven, igual que hizo
E2(f) en `ProjectsView.test.tsx`.

**REGLA 3 — salida real del rojo** (restaurando la copia vieja):

```
 FAIL  src/features/dashboard/ui/DashboardView.test.tsx > estados de carga, vacío y error (RFC-02 §4) > no le explica el andamiaje de la app a quien todavía no tejió nada
AssertionError: expected <p …(1)></p> to be null

- Expected:
null

+ Received:
<p
  class="m-0 font-body text-sm leading-base text-fg-muted"
>
  Estrená el año con un proyecto: los botones de arriba lo crean en dos pasos.
</p>

 Test Files  1 failed (1)
      Tests  1 failed | 31 passed (32)
```

Restaurado: `vitest run src/features/dashboard/ui/DashboardView.test.tsx` →
`Test Files 1 passed (1)` · `Tests 32 passed (32)`.

---

## 146 — gate de CSS compilado para los tres componentes de `/proyectos`

> ⚠️ **Esta sección es de la RONDA 1 y su título decía "cerrada". No lo estaba.** El
> reviewer probó el gate en vez de leerlo y **lo hizo devolver verde con una clase
> inerte en el DOM por dos caminos distintos**. Se deja tal cual —la decisión de
> técnica sigue en pie y el reviewer la respalda— y **lo que faltaba está en §RONDA 2**,
> con el rojo y el verde de cada control positivo.

**Archivo nuevo (versionado, reproducible desde el árbol):**
`src/features/projects/ui/projects-ui.classes.test.ts` — **7 tests**, ningún otro
archivo tocado.

### La decisión, con su argumento

El obstáculo era real: el gate del segmentado deriva cada clase de
`segmented-control.variants.ts` —donde viven **todas** las clases del primitivo por
construcción (`cva`)— y por eso no escribe ni una literal. Los tres componentes de
`/proyectos` escriben las clases **inline en el JSX**, así que no hay archivo del
que derivar.

**Descartado: extraer las clases a un archivo de variantes por componente.** Mueve
el literal de sitio pero **no cierra el agujero**: en cuanto alguien vuelva a
escribir una clase inline en el JSX —que es lo natural en una composición de
página— queda otra vez fuera del gate. El gate pasaría a depender de la disciplina,
que es justo lo que un gate existe para no necesitar; y de paso dejaría el JSX de
tres pantallas hablando por referencias a cambio de cero cobertura.

**Elegido: derivar del FUENTE, por AST.** Se parsea el TSX con el compilador de
TypeScript (que ya es dependencia de desarrollo) y se resuelve cada `className`:
cadenas, plantillas con interpolación, constantes locales, arrays con `.join`,
ternarios y funciones locales que devuelven clases. Cada nombre resultante se busca
en el **CSS compilado** (`postcss` + `@tailwindcss/postcss` sobre `globals.css`).

> **Corrección de ronda 2.** Esta frase decía *"misma técnica que el gate del
> segmentado"* y **era falsa**: compartimos la forma de **compilar** el CSS, pero la
> **comparación** era distinta y más débil (subcadena). Corregido en el código y
> explicado en §Ronda 2 → bloqueante 1.

**Por qué AST y no una expresión regular:** una regex tiene que adivinar dónde
acaba una expresión de JSX, y **lo que se le escapa se pierde en silencio** — que
es exactamente el fallo que este gate viene a impedir.

### Cobertura, medida por el propio gate (no por un script aparte)

| Archivo | `className` vistos | clases distintas |
|---|---|---|
| `ProjectsView.tsx` | 14 | 47 |
| `ProjectCard.tsx` | 12 | 38 |
| `ProjectsToolbar.tsx` | 11 | 23 |

### El gate se vigila a sí mismo (si no, sería un verde vacío)

Tres de los siete tests no miran el CSS: miran **al barrido**.

1. **Cuenta contra el texto crudo.** Los `className` que ve el AST tienen que ser
   tantos como los escritos con un igual detrás en el fuente. Si el recorrido se
   saltara uno, se nota. (En `ProjectCard` hay 14 apariciones de la palabra y **12**
   atributos: dos son la firma de la prop y la desestructuración.)
2. **Ninguna forma de expresión sin seguir.** Si aparece una construcción que el
   resolvedor no contempla, se registra su tipo de nodo y el test la denuncia en vez
   de devolver cero clases tan campante.
3. **Lista exacta de fuentes externas.** Los únicos `className` que pueden quedar
   vacíos son los que traen el valor de fuera del archivo: `className` (la prop de
   `ProjectCard`) e `inputClasses` (del design system). Se compara el conjunto en
   **las dos direcciones**: una fuente nueva pone el gate en rojo y obliga a decidir.

### Restricción de Tailwind respetada

**Ni un nombre de clase literal en el test.** Lo único escrito al literal son
nombres de **archivo** (`ProjectCard.tsx`) y de **identificador** (`className`,
`inputClasses`), que no son candidatos a clase. Las clases se leen del disco en
tiempo de ejecución, así que ninguna muestra de este archivo puede colarse como CSS
de producción.

### Control positivo — la parte que hace que el gate valga algo

Clase inventada metida a propósito en `src/features/projects/ui/ProjectCard.tsx:99`
(junto a las de ese `div`):

```
 FAIL  src/features/projects/ui/projects-ui.classes.test.ts > cada clase de /proyectos emite una regla real en el CSS compilado > ProjectCard.tsx: Tailwind genera todas sus utilidades
AssertionError: estas clases de ProjectCard.tsx no generan ninguna regla: se quedan inertes en el atributo: expected [ 'bg-surface-inventada' ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "bg-surface-inventada",
+ ]

 Test Files  1 failed (1)
      Tests  1 failed | 6 passed (7)
```

Y **con esa misma clase puesta**, los gates que ya existían siguen sin verla — que
es literalmente el defecto que describía la ficha:

```
$ pnpm exec vitest run src/features/projects/ui/ProjectCard.test.tsx src/features/projects/ui/ProjectsView.test.tsx src/shared/ui

 Test Files  23 passed (23)
      Tests  772 passed (772)
```

Restaurado, y sin residuo:

```
$ git status --porcelain
 M .claude/settings.json
 M src/features/dashboard/ui/DashboardView.test.tsx
 M src/features/dashboard/ui/DashboardView.tsx
 M src/features/projects/ui/ProjectsToolbar.tsx
 M src/features/projects/ui/project-filters.ts
 M src/shared/ui/primitives/segmented-control/SegmentedControl.test.tsx
 M src/shared/ui/primitives/segmented-control/SegmentedControl.tsx
?? progress/reports/impl_deudas_146_147_148.md
?? src/features/projects/ui/projects-ui.classes.test.ts
```

`ProjectCard.tsx` **no aparece**: quedó byte a byte como estaba.
(`.claude/settings.json` venía ya modificado de antes de esta sesión; no lo toqué.)

### Coste, medido

| | Duración del archivo | de la que es test |
|---|---|---|
| Gate nuevo (`projects-ui.classes.test.ts`) | 1.28 s | 172 ms |
| Gate existente (`segmented-control.tokens.test.ts`) | 959 ms | 170 ms |

O sea que **compilar `globals.css` cuesta del orden de 100-150 ms** en esta base, no
segundos: el tope de 120 s que hereda del gate del segmentado es un guardarraíl
contra un cuelgue, **no un coste medido**.

> **Corrección de ronda 2.** Aquí decía que la pasada completa (**74.18 s** frente a
> ~105 s de la partida) probaba que el añadido no se nota. **No prueba nada:** la
> pasada del reviewer dio **121.72 s**, la del leader **116 s** y la mía de ronda 2
> **76.94 s**, con el mismo código. La duración total de la suite en esta máquina es
> ruido. **Lo que sí mide el coste es el archivo aislado** (1.3 s, de los que 0.17 s
> son test), y ése es el número que hay que mirar.

### Lo que este gate NO cubre (dicho ahora, no cuando falle)

- Sólo mira **si la utilidad emite regla**, no si la regla es la correcta ni si el
  valor sale de un token. Eso lo miden la convención canónica
  (`canonical-tailwind-classes.test.ts`) y, para el segmentado, su gate de forma.
- Cubre **tres archivos**, los que la ficha nombra. El resto de la app sigue sin
  gate de CSS compilado: `DashboardView.tsx`, `MetricsPanel.tsx`,
  `ActiveProjectsPanel.tsx`, `NewProjectDialog.tsx`, el caparazón y los primitivos
  que no son el segmentado. **El extractor es genérico** —recibe rutas—, así que
  ampliarlo es añadir nombres a `COMPONENTS` o mover el barrido a un recorrido de
  directorios. Queda como deuda nueva propuesta abajo.
- No ve clases que se compongan en **tiempo de ejecución** a partir de datos (no las
  hay hoy en estos tres archivos, y el test de fuentes externas avisaría).

---

## Decisiones no obvias, resumidas

1. **148 se resolvió por el lado del tipo y no del comentario.** Las dos vías eran
   legítimas; bajar el comentario dejaba en pie un estado imposible representable.
   El coste fue una aserción de tipo sobre `forwardRef` (con test de `ref` que la
   cubre), no un rediseño.
2. **`NoInfer` es la pieza, no el genérico.** Un genérico a secas no arregla nada:
   `TValue` se inferiría también desde `value` y el valor ajeno ampliaría la unión.
   Vale la pena decirlo porque la ficha proponía "hacerlo genérico" a secas.
3. **La duplicación de valores se cerró en el render, no con una excepción.** Un
   `throw` en un primitivo de presentación rompería la pantalla por un error de
   programación; marcar la primera mantiene cierta la invariante visible.
4. **146 no extrajo variantes.** Argumentado arriba: el objetivo es que el gate no
   dependa de que nadie escriba una clase inline, y extraer no da esa propiedad.
5. **El log de `init.sh` se deja versionado** (`progress/reports/init_deudas_146_147_148.md`)
   para que el número no dependa de que alguien lo copie bien.

## Sin verificar por mí (dicho, no tapado)

- **No miré la pantalla en un navegador.** No tengo herramientas de navegador en
  esta sesión. Los tres cambios son de tipo, de copia y de test, y **ninguna clase
  de CSS cambió** —el gate nuevo lo demuestra: las 108 clases de los tres
  componentes siguen siendo las mismas y todas emiten regla—, así que la única
  diferencia visible es el texto del vacío del Dashboard. Aun así, **el eje visible
  no lo medí yo**.

## Deuda nueva propuesta (no la fiché yo; la decide el líder)

- **El gate de CSS compilado cubre 3 archivos de los ~20 que pintan clases.**
  `/proyectos` ya tiene quien avise; el Dashboard, el caparazón y el resto de los
  primitivos siguen igual que antes de esta sesión. El extractor de
  `projects-ui.classes.test.ts` es genérico y está listo para barrer por directorio,
  igual que `canonical-tailwind-classes.test.ts`.

---

# RONDA 2 — cuatro bloqueantes del reviewer

Veredicto de partida: `progress/reports/review_deudas_146_147_148.md`. El review es
correcto en los cuatro puntos: **probó el gate en vez de leerlo y lo hizo devolver
verde con una clase inerte en el DOM por dos caminos distintos**. Lo reproduje yo
antes de tocar nada y lo dejo medido abajo, con el rojo y el verde de cada uno.

**Verificación de cierre de esta ronda** (`bash ./init.sh` redirigido a archivo, no
por tubería; salida completa en `progress/reports/init_deudas_146_147_148_r2.md`):

```
INIT EXIT=0
[OK]    lint verde
[OK]    typecheck verde

 Test Files  78 passed | 3 skipped (81)
      Tests  1348 passed | 13 skipped (1361)
   Duration  76.94s
```

**Aritmética contra la partida de esta ronda (78 / 1347):**

| | Archivos | Tests |
|---|---|---|
| Partida ronda 2 | 78 | 1347 |
| Bloqueante 8 (no bloqueante, colisión de nombres) — test nuevo en `projects-ui.classes.test.ts` | +0 | **+1** |
| **Total** | **78** | **1348** |

`78 + 0 = 78` ✔ · `1347 + 1 = 1348` ✔. Ningún test movido ni borrado; los otros tres
bloqueantes se arreglan **dentro** de tests que ya existían (por eso no suman).

---

## Bloqueante 1 — comparar selectores, no subcadenas

**Qué estaba mal.** `css.includes("." + nombre)` es cierto en cuanto ese texto
aparezca **dentro de un selector más largo**. Cualquier utilidad recortada es
prefijo de la buena y pasaba en verde estando inerte en el atributo.

**Qué se hizo.** Función `emitsRule(className)` nueva, que exige **frontera de fin de
nombre**: detrás del selector escapado no puede venir un carácter que todavía forme
parte del nombre de clase — letra, dígito, guion bajo, guion **ni barra invertida**
(Tailwind escapa así los dos puntos de una variante, los paréntesis de un token y la
barra de una altura de línea; sin esa exclusión, el nombre corto daría por buena su
versión con variante).

**Sobre "la técnica del precedente": la medí antes de copiarla, y no basta.** El
reviewer manda usar la regex anclada a la llave de apertura de
`segmented-control.tokens.test.ts:126-131`. Ese anclado es
`selector(?:[^{,]*)?\{`, y **lo que hay en medio admite justo las letras que
faltan**: para una utilidad recortada, el `[^{,]*` se traga el resto del nombre y la
regla de la clase larga hace de coartada. O sea que **también daría verde falso** para
este control positivo. Por eso aquí se va más lejos que el precedente en vez de
igualarlo, y por eso **la afirmación "misma técnica" del informe de ronda 1 queda
corregida** (aquí, y en la ficha 146 de `deudas.md`).

**Control positivo — la clase recortada, medida por los dos caminos.** Con
`items-en` (a la utilidad de alineación de la propia toolbar le falta la última
letra) metida en `ProjectsToolbar.tsx:119`:

*Con la comparación NUEVA → **rojo**:*

```
 FAIL  src/features/projects/ui/projects-ui.classes.test.ts > cada clase de /proyectos emite una regla real en el CSS compilado > ProjectsToolbar.tsx: Tailwind genera todas sus utilidades
AssertionError: estas clases de ProjectsToolbar.tsx no generan ninguna regla: se quedan inertes en el atributo: expected [ 'items-en' ] to deeply equal []

 Test Files  1 failed (1)
      Tests  1 failed | 7 passed (8)
```

*Con la comparación VIEJA (`css.includes`), la misma clase inerte puesta → **verde**,
que es justo lo que denunció el reviewer:*

```
 Test Files  1 passed (1)
      Tests  8 passed (8)
```

Restaurado todo: `ProjectsToolbar.tsx` vuelve a su línea original y `emitsRule` a la
versión estricta.

**Y la misma diferencia, medida directamente sobre el CSS compilado** (script de un
solo uso en la raíz del repo, borrado después; la raíz **no la escanea Tailwind**,
`globals.css:15` acota el escaneo a `src/` con `source("../")`):

```
inline           exacta=false   subcadena=true
text-f           exacta=false   subcadena=true
text-fg          exacta=true    subcadena=true
grid             exacta=true    subcadena=true
gap-(--space-5)  exacta=true    subcadena=true
```

Las dos primeras filas son el bloqueante entero: **no existen** en el CSS y la
comparación vieja las daba por buenas.

---

## Bloqueante 2 — una llamada a función externa ya no se traga las clases

**Qué estaba mal.** Si el `className` era una llamada a una función **de otro
archivo**, el resolvedor devolvía **los argumentos** como si fueran el resultado. Con
un solo argumento resoluble, el atributo salía "no vacío": no entraba en
`emptyAttributes`, no entraba en `unhandled`, nadie denunciaba nada — y **las clases
que la función devuelve de verdad no se comprobaban jamás**.

**Qué se hizo.** Si el identificador llamado **no está en `locals`**, se registra en
`external`. Los argumentos se siguen mirando (pueden ser clases de verdad), pero el
nombre llamado entra en la lista de fuentes externas, **que se compara EXACTA**, así
que aparecer ahí pone el gate en rojo hasta que alguien decida qué hacer con esa
función. Se mejoró además el motivo que se guarda de un atributo vacío: si venía de
una llamada, se guarda **el nombre de la función**, para que el rojo diga qué hay que
decidir y no sólo "una expresión".

**Control positivo — el helper importado del reviewer, reproducido.**
`src/features/projects/ui/__probe-helper.ts` con
`helperClasses(kind) => kind + " bg-probe-inexistente"`, usado como
`className={helperClasses("flex")}` en `ProjectsToolbar.tsx:119`:

*Con el arreglo → **rojo**, y nombrando al culpable:*

```
 FAIL  src/features/projects/ui/projects-ui.classes.test.ts > el barrido de clases de /proyectos no se deja nada > sólo deja sin resolver lo que se declara fuera del archivo
AssertionError: expected [ 'className', 'helperClasses', …(1) ] to deeply equal [ 'className', 'inputClasses' ]
+   "helperClasses",
      Tests  1 failed | 7 passed (8)
```

*Sin el arreglo (anulando sólo la línea que registra la fuente externa), con el mismo
helper puesto → **verde**, con la clase inerte llegando al DOM:*

```
 Test Files  1 passed (1)
      Tests  8 passed (8)
```

Helper borrado, `import` borrado y `ProjectsToolbar.tsx` restaurado; comprobado con
`git status --porcelain` (no aparece `__probe-helper.ts` ni ningún resto).

---

## Bloqueante 3 — clases de Tailwind literales en la prosa del test

**Tenía razón y el daño era real:** el JSDoc declaraba *"ni un nombre de clase
literal"* mientras dos palabras de la propia prosa —los nombres **en inglés** de la
utilidad de flujo y la de rejilla— eran candidatos válidos, y una de ellas **metía su
regla en el CSS de producción**. Es la regla dura de `conventions.md` violada en el
archivo que declaraba cumplirla.

**Qué se hizo.** Las dos palabras se reescribieron en castellano ("clases sueltas
dentro del propio JSX", "referencias a un objeto de estilos"), se quitó el ejemplo de
código que citaba la utilidad de rejilla, y el JSDoc pasa a decir **por qué** esto
aplica también a la prosa, con el incidente escrito.

**Prueba de que ya no aporta CSS, y es más fuerte que revisar palabra por palabra:**
compilé `globals.css` **con el archivo de test en su sitio y con el archivo movido
fuera del árbol**:

```
con projects-ui.classes.test.ts en su sitio  -> bytes de CSS: 37616
con el archivo movido fuera de src/          -> bytes de CSS: 37616
```

**Byte a byte idéntico: el archivo aporta exactamente cero CSS.** Y en el mismo
barrido, la utilidad de flujo que antes emitía por culpa de la prosa ahora sale
`exacta=false`, o sea que **su regla desapareció**.

Barrido adicional de control: busqué en el archivo **todas** las utilidades de una
sola palabra del núcleo de Tailwind. Sólo aparece una, `filter`, y es el método de
array de JavaScript (`.filter(...)`) — **no lo introduce este archivo**: la app lo usa
por todas partes y su regla sigue ahí con el archivo fuera del árbol (la medición de
arriba lo demuestra: mismos bytes).

---

## Bloqueante 4 — el hueco de tipo que faltaba en la enumeración

**Tenía razón, y es el enunciado exacto de la ficha 148.** Anotar `options` con el
parámetro por defecto (`readonly SegmentedControlOption[]`) **colapsa `TValue` a
`string`** y vuelve a compilar cualquier `value`. No es "llamar sin tipos": es una
anotación idiomática, y **es la que usa el propio archivo de test del primitivo**.

**Qué se hizo (sin tocar el comportamiento):**

- `SegmentedControl.tsx` — la enumeración de "lo que no cierra ninguno de los dos"
  pasa a tener **dos casos ordenados por probabilidad**, y el primero es éste, con la
  salida: *para que el tipo proteja, `options` se deja inferir*.
- Las dos frases absolutas quedan condicionadas: la del JSDoc de la prop `value` gana
  un párrafo con la condición, y la de la enumeración dice **"siempre que `TValue` se
  infiera"**.
- El JSDoc de la prop `options` dice que manda sobre `value` **"mientras se deje
  inferir"**.
- `SegmentedControl.test.tsx` — la constante `OPTIONS` lleva encima el aviso de que
  **no está protegida** y de por qué sigue existiendo (demuestra que el genérico no
  rompió a los consumidores ya escritos).
- **Más de lo que se pedía, porque el reviewer lo dejó a mi criterio:** el test del
  `ref` pasa a usar `INFERRED_OPTIONS`, o sea la forma protegida. Antes era el único
  sitio donde se pasaba un `value` sin ninguna protección de tipo y no se notaba al
  leerlo.

**REGLA 3 aplicada al arreglo:** el ancla de tipo sigue siendo la que muerde. Con
`INFERRED_OPTIONS`, quitar `NoInfer` deja el `@ts-expect-error` sin error que esperar
y `tsc` sale en rojo (`error TS2578`, salida pegada en la sección de la deuda 148 de
la ronda 1). Con `OPTIONS` **no mordería**, y ése es justo el caso que ahora está
escrito en vez de escondido.

---

## No bloqueantes atendidos

- **Colisión de nombres en `locals` (punto 8).** Era otra vía de pérdida silenciosa:
  el índice es por nombre a cualquier profundidad, así que dos declaraciones
  homónimas se pisaban. No se resuelve el ámbito (sería medio compilador): se
  **detecta la colisión** y, si un nombre repetido llega a usarse para resolver un
  `className`, entra en `ambiguous` y **un test nuevo lo pone en rojo** en vez de
  elegir una de las dos a ciegas. Es el test que suma +1 en la aritmética.
- **"Misma técnica que el segmentado" (punto 6).** Corregido en el informe (dos
  sitios, con nota de corrección visible) y en la ficha 146 de `deudas.md`. Además se
  explica **por qué** no basta con igualar al precedente.
- **La duración de la suite completa como prueba (punto 7).** Corregido: se marca
  explícitamente que ese número es ruido de máquina (121.72 s del reviewer, 116 s del
  leader, 74.18 s y 76.94 s en mis dos pasadas, mismo código) y que **el número
  válido es el del archivo aislado**.
- **El `.md` renombrado (punto 5).** Dicho como es: cabecera de 5 líneas + valla de
  código; lo de dentro es la salida sin tocar.
- **La deuda nueva propuesta (punto 11): NO la fiché**, como se me indicó. La decide
  el leader y va después de esto.

## Lo que sigue sin verificar

- **Sin navegador**, igual que en la ronda 1. Esta ronda **no toca ni un carácter de
  ninguna clase de CSS** ni ningún componente renderizado: los cambios son un test, dos
  JSDoc y un comentario. La única diferencia visible del lote entero sigue siendo el
  texto del vacío del Dashboard (147), y **nadie lo ha mirado en pantalla**.

---

# RONDA 3 — dos vías más de verde falso, y bajar los absolutos

Re-review en `progress/reports/review_deudas_146_147_148.md` §RE-REVIEW. **Los cuatro
bloqueantes de la ronda 2 quedaron cerrados** y verificados por el reviewer en
archivos distintos a los míos. Lo que bloqueaba ahora eran **dos caminos nuevos** por
los que una clase inerte llega al DOM con el gate en verde — los buscó a propósito y
los encontró. Los dos están cerrados con la misma forma que ya tenía el arreglo de la
colisión de nombres: **no entender más, callarse menos**.

**Verificación de cierre** (redirigida a archivo, no por tubería; salida completa en
`progress/reports/init_deudas_146_147_148_r3.md`):

```
INIT EXIT=0
[OK]    lint verde
[OK]    typecheck verde

 Test Files  78 passed | 3 skipped (81)
      Tests  1349 passed | 13 skipped (1362)
   Duration  79.33s
```

**Aritmética contra la partida de esta ronda (78 / 1348):**

| | Archivos | Tests |
|---|---|---|
| Partida ronda 3 | 78 | 1348 |
| Bloqueante 1 — test nuevo del camino no atravesado (`bypassed`) | +0 | **+1** |
| Bloqueante 2 — reasignación: **reusa** el test de `ambiguous` (renombrado) | +0 | +0 |
| Bloqueante 3 — sólo prosa y títulos de test | +0 | +0 |
| **Total** | **78** | **1349** |

`78 + 0 = 78` ✔ · `1348 + 1 = 1349` ✔. Ninguno movido ni borrado.

---

## Bloqueante 1 — el `className` que llega por un spread de JSX

**Por qué era el peor de los dos como fallo de diseño, y no sólo como agujero:** las
**dos redes tenían el mismo agujero**. El recorrido del AST sólo miraba un
`JsxAttribute` llamado `className`, y el contraste contra el texto crudo buscaba el
nombre seguido de **igual** — y un objeto esparcido no escribe ninguna de las dos
cosas. La segunda red existe justamente para atrapar lo que se le escapa a la
primera; si falla donde falla la primera, **no es una segunda red**.

**Arreglo (dos capas, a propósito):**

- **AST:** todo `JsxSpreadAttribute` se registra en `bypassed`, y también toda
  propiedad `className` dentro de un literal de objeto (que es lo que ese objeto
  esparcido suele llevar dentro). Un test nuevo exige que `bypassed` esté vacío.
- **Texto crudo:** la cuenta pasa a buscar el nombre seguido de **igual o de dos
  puntos**, y se compara contra `atributos + propiedades de objeto`. Así la segunda
  red vuelve a fallar donde la primera **no** falla. Sigue sin contar las formas de
  *declarar* (la firma de tipo, la desestructuración), que no llevan ninguna de las
  dos justo detrás del nombre.

**Control positivo — utilidad recortada nueva, en `ProjectsView.tsx:386`:** al nombre
de la utilidad de centrado horizontal se le quita la última sílaba
(queda `justify-cent`) y se pasa por un spread:

```tsx
<div {...{ className: "flex flex-wrap justify-cent gap-(--space-3)" }}>
```

Con el arreglo → **rojo**, y nombrando los dos caminos:

```
 FAIL  src/features/projects/ui/projects-ui.classes.test.ts > el barrido de clases de /proyectos no se deja nada > ningún className llega por un camino que el barrido no atraviesa
AssertionError: ProjectsView.tsx: expected [ …(2) ] to deeply equal []
+ [
+   "{...{ className: \"flex flex-wrap justify-cent gap-(--space-3",
+   "className: \"flex flex-wrap justify-cent gap-(--space-3)\"",
+ ]
      Tests  1 failed | 8 passed (9)
```

Con la lógica de la ronda 2 (anulando los dos registros y devolviendo la cuenta cruda
a sólo el igual), la misma clase inerte puesta → **verde**:

```
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

---

## Bloqueante 2 — clases acumuladas con `let` y `+=`

**Es la peor de las dos**, y coincido con el reviewer en por qué: las clases están
escritas **dentro del archivo, en TypeScript corriente**, y aun así se perdían enteras
— `resolve` de un identificador devolvía **sólo su inicializador**, así que toda
reasignación posterior era invisible.

**Arreglo:** un segundo recorrido recoge los nombres que son **destino de una
asignación** en cualquier punto del archivo (el igual, el más-igual y el resto del
rango de operadores de asignación de TypeScript). Si uno de esos nombres llega a
usarse para resolver un `className`, entra en `ambiguous` — el mismo cajón que ya
usaba el nombre declarado dos veces, por el mismo motivo: **el inicializador no es lo
que el nombre vale**, y adivinar cuál es requeriría interpretar el programa.

**Control positivo — utilidad mal escrita nueva, en `ProjectCard.tsx`:** al nombre de
la utilidad de estiramiento vertical le falta una letra (queda `items-strech`), y se
acumula por reasignación:

```tsx
let revCls = "flex flex-col";
revCls += " gap-(--space-3) items-strech";
<div className={revCls}>
```

Con el arreglo → **rojo**, nombrando la variable:

```
 FAIL  src/features/projects/ui/projects-ui.classes.test.ts > el barrido de clases de /proyectos no se deja nada > no resuelve ninguna clase por un nombre pisado ni reasignado
AssertionError: ProjectCard.tsx: expected [ 'revCls' ] to deeply equal []
+ [
+   "revCls",
+ ]
      Tests  1 failed | 8 passed (9)
```

Sin el arreglo (quitando sólo la comprobación de reasignación), con el mismo código
puesto → **verde**:

```
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

**Las dos clases inyectadas no existen en el CSS**, comprobado contra el compilado —o
sea que en los dos verdes de arriba había de verdad una cadena inerte en el atributo:

```
justify-cent     exacta=false   subcadena=true
justify-center   exacta=true    subcadena=true
items-strech     exacta=false   subcadena=false
items-stretch    exacta=true    subcadena=true
```

Fijate en la primera fila: la recortada es **subcadena** de la buena, así que aunque
hubiera llegado al extractor, la comparación de la ronda 1 también la habría dado por
buena. Los dos defectos son independientes y los dos están cerrados.

**Restaurado todo:** `ProjectsView.tsx` y `ProjectCard.tsx` vuelven a su estado
original (no aparecen en `git status --porcelain`), y el gate a la versión de ronda 3.

---

## Bloqueante 3 — bajar los absolutos

Tenía razón, y **es la segunda vez en este lote que aparece la misma raíz**: un
comentario que promete más de lo que el código sostiene, esta vez en el archivo que
existe para denunciar exactamente eso.

- El JSDoc decía *"se recogen **todos** los `className`"*. Ahora dice qué recorre
  (los que aparecen **como atributo**) y qué resuelve (cadenas, plantillas, constantes
  y funciones **del propio archivo**, arrays con `join`, ternarios, concatenaciones).
- Se añade el párrafo que fija **qué promete el gate**: *no entenderlo todo, sino no
  callarse*, con la **lista de los cuatro cajones de denuncia** (`unhandled`,
  `external`, `ambiguous`, `bypassed`) y la nota de que los tres últimos **nacieron de
  verdes falsos medidos, no de imaginarlos**.
- El test *"sabe seguir **todas** las formas de expresión"* pasa a
  *"no queda ninguna forma de expresión sin seguir ni sin denunciar"*, que es lo que
  de verdad comprueba.
- El test de `ambiguous` pasa a *"no resuelve ninguna clase por un nombre pisado ni
  reasignado"*, y su JSDoc explica las dos formas.

---

## Sobre `segmented-control.tokens.test.ts` — no lo toqué, y queda preparado

Confirmo el diagnóstico: ese gate usa la comparación por **subcadena** para existencia
y un `ruleBody` cuyo anclado admite que el nombre siga, así que **puede estar midiendo
la regla de otra clase**. **No lo arreglo**, como se me indicó.

Lo dejo preparado en lo que me tocaba: la frontera vive en una función suelta
(`emitsRule`) que sólo depende de `selectorFor` y del CSS compilado, sin nada del
dominio de `/proyectos`. Moverla a un módulo compartido —o quedarse con la variante
que devuelve **el cuerpo** de la regla anclado con la misma frontera— es mover una
función y dos líneas de escape, no rediseñar. **Lo que hay que decidir al hacerlo, y
no es trivial:** ese archivo compila el CSS por su cuenta, igual que éste y que
`globals-css.test.ts`; si se comparte el helper, conviene decidir si se comparte
también la compilación (tres compilaciones de ~150 ms, hoy independientes y
paralelizables por archivo).

## Lo que sigue sin verificar

- **Sin navegador**, igual que en las dos rondas anteriores. Esta ronda **no toca
  ningún componente**: los cambios son un archivo de test y su prosa. La única
  diferencia visible del lote entero sigue siendo el texto del vacío del Dashboard
  (147), y **nadie lo ha mirado en pantalla**.
- **El archivo de test sigue aportando cero CSS**, comprobado otra vez tras reescribir
  su prosa: **37616 bytes** de CSS compilado, el mismo número que en la ronda 2.
- **El gate sigue cubriendo 3 archivos.** Ahora con dos redes más, así que extenderlo
  (deuda que decide el leader) ya no multiplicaría un verde falso conocido — pero
  tampoco puedo prometer que no haya una cuarta vía: lo honesto es decir que **cada
  vía que apareció la encontró alguien probando, no leyendo**, y que el diseño actual
  está pensado para que la siguiente salga en rojo en vez de en silencio.

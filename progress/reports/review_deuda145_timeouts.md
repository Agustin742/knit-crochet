# Review — deuda 145 (fragilidad por tiempo en los tests)

**Veredicto:** APROBADO — con residuo escrito (ver "Residuos", no bloqueantes).

> No es una feature: `feature_list.json` **no está tocado** (verificado con
> `git status --porcelain`, no con el informe).
> `.claude/settings.json` sale modificado y queda **fuera de este review** (otra tanda).

## Lo que medí yo, no lo que dice el informe

| Comprobación | Cómo la hice | Resultado |
|---|---|---|
| `bash ./init.sh` | pasada propia, redirigida a archivo | **EXIT 0** · lint ok · typecheck ok · `Test Files 77 passed / 3 skipped (80)` · `Tests 1336 passed / 13 skipped (1349)` · 71.08 s |
| Alcance de `vi.setConfig` | andamiaje propio, **probado no leído** (sección 1) | **NO se escapa del archivo** |
| REGLA 3 | rotura deliberada reproducida por mí (sección 2) | **3 rojos por aserción**, 795-1436 ms, muy lejos de los topes |
| Código de producción | `git diff --name-only` | **cero** archivos de `src/` que no sean `.test.` |
| Tests saltados/borrados | `git diff -U0` + conteo de `it(` HEAD vs worktree | **cero**; 9/5/4/2 idénticos |
| Suite bajo carga forzada | 4 quemadores de CPU + `--reporter=verbose` | verde, peor test **2430 ms** |

## 1. `vi.setConfig({ testTimeout })` NO se escapa del archivo — probado

Esta afirmación sostiene todo el arreglo: si fuera falsa, lo que hay en el repo es
**un tope global de 20-30 s disfrazado**, justo lo que la consigna prohibía. No la
leí en la doc: construí el caso adversario.

Andamiaje (creado y **ya borrado**, en `src/__scope_probe__/`): dos archivos de test
en el **mismo worker, sin aislamiento y en serie**
(`--pool=threads --no-isolate --maxWorkers=1 --fileParallelism=false`), con
`console.log(Date.now())` en cada uno para **probar el orden de ejecución** en vez de
suponerlo (hicieron falta tres intentos: el sequencer no respeta ni orden alfabético
ni tamaño de archivo, así que forcé el orden y lo verifiqué con marcas de tiempo).

- Archivo 1, con `vi.setConfig({ testTimeout: 30_000 })`: duerme **11 s** y pasa
  (11 s > tope global de 10 s, o sea su tope propio sí aplica). Evaluado en `t=...994220`.
- Archivo 2, **sin** `setConfig`, ejecutado **después** y en el mismo hilo: duerme 12 s y
  **falla con `Test timed out in 10000ms`**, cortado a los **10013 ms**. Evaluado en `t=...005247`.

**Conclusión: el tope alto muere con el archivo.** No hay tope global encubierto, y de paso
queda confirmado que el defecto vigente para todo lo demás son **10 000 ms** exactos.
Andamiaje eliminado; `git status --porcelain` no muestra rastro de `src/__scope_probe__/`.

## 2. Control positivo de la REGLA 3 — reproducido en la fuente

Rompí yo mismo `verifyPassword` (`await compare(...); return true;`) y corrí los **tres**
archivos bcrypt-bound con la config nueva puesta:

```
x password.test.ts     > verifies the right password and rejects a wrong one   1436ms
  -> AssertionError: expected true to be false
x auth-routes.test.ts  > POST /api/auth/login answers 401 with invalid creds     798ms
  -> AssertionError: expected 200 to be 401
x auth-service.test.ts > rejects a wrong password and an unknown email...        795ms
  -> AssertionError: promise resolved "{ user: {...} }" instead of rejecting
 Test Files  3 failed (3)   Tests  3 failed | 13 passed (16)
```

**Rojo por aserción, nunca por reloj**, y los tres tardan **1.4 s o menos contra topes de
20 s y 30 s** (margen 14x-38x): los topes no tapan nada.
Restaurado con `git checkout --`; `git status --porcelain` y `git diff --stat` sobre
`src/shared/lib/auth/password.ts` no devuelven nada. Cero residuo.

## 3. El tope global 5000 -> 10 000 ms: justificado, pero es la pieza más floja

**Lo apruebo**, con dos matices que quedan escritos.

A favor (por eso no lo bloqueo):

- **Hay medición propia**, que es lo que la consigna exigía: el test genérico más lento bajo
  carga es el axe de `ProjectsView` con 3219 ms, o sea **1.5x** contra el defecto de 5000 ms.
  Con el global en el defecto, la familia axe/happy-dom —que **no** tiene tope propio— se queda
  exactamente con la fragilidad que esta ficha viene a matar.
- **10 s sigue cazando un cuelgue en 10 s**, no en minutos: la enfermedad al revés (tope global
  gigante) no se produce. Un cuelgue real cuesta **5 segundos extra**, una sola vez.

En contra (residuo, no bloqueante):

- **Es la única decisión del lote que rompe su propio método.** Aplicó alcance por archivo en los
  cuatro casos caros y luego, para un quinto caso (los tests de axe), subió el techo de los ~1345
  tests restantes en vez de darle a esa familia su `vi.setConfig`. La pieza quirúrgica existía y
  la usó cuatro veces.
- **Su propia extrapolación deja el global con menos margen del que declara.** Escribe
  3219 x 1.6 (factor de carga observado contra el baseline del leader) = **~5.2 s**; contra
  10 000 ms eso es **1.9x**, no 3.1x. Es el margen más ajustado del lote.

**Recomendación (no bloqueante):** si alguien quiere el global de vuelta en el defecto, la vía es
`vi.setConfig` en los archivos de axe/happy-dom, **no** borrar la línea a secas. Borrarla sin más
no rompe los 4 archivos arreglados (tienen tope propio) pero devuelve el parpadeo a la familia UI.

## 4. La ampliación a `auth-routes.test.ts` — justificada, no alcance desbocado

Está **dentro** del alcance y lo confirmo:

- Misma raíz exacta (bcrypt cost 12 real a través de los Route Handlers), no un problema nuevo.
- Los números obligan: **7501 ms y 7161 ms** en una pasada completa, o sea **ya por encima del
  tope por defecto**. Ese archivo no "pasaba": **ganaba el sorteo de la carga**. Dejarlo fuera
  habría cerrado la ficha con la puerta todavía dependiendo del ruido, que es el enunciado
  literal de la deuda 145.
- No arrastró nada más: sigue siendo **un archivo de test**, sin tocar producción ni añadir dobles.

Si algo, el mérito es haberlo encontrado: no estaba en la lista de rojos que recibió.

## 5. ¿Deuda saldada o umbral de parpadeo movido? — saldada, con residuo honesto

La pregunta de fondo tiene respuesta doble, y las dos van escritas:

- **Saldada en lo que la ficha pedía:** el verde de `init.sh` ya no depende de la carga.
  Lo verifiqué con la suite entera y **4 quemadores de CPU** sobre 4 núcleos: verde,
  `1336 passed / 13 skipped`, y el peor test fue **2430 ms** (login de `auth-routes`), contra su
  tope de 30 s: **12x de margen**. Ningún test se acercó siquiera a 5000 ms.
- **No saldada en el fondo:** el arreglo **no acelera nada**. `BCRYPT_COST` sigue en 12 (correcto:
  es defensa, no ineficiencia) y el arranque en frío sigue costando lo que cuesta.

Márgenes contra los peores tiempos medidos (los del implementer, en frío + cargado, peores que
los míos en caliente):

| alcance | tope | peor medido | factor |
|---|---|---|---|
| `auth-service.test.ts` | 20 s | 4315 ms | 4.6x |
| `password.test.ts` | 20 s | 4543 ms | 4.4x |
| `auth-routes.test.ts` | 30 s | 7501 ms | 4.0x |
| `db/index.test.ts` (1er `it`) | 20 s | 5837 ms | **3.4x** |
| **global** (axe de `ProjectsView`) | 10 s | 3219 ms | **3.1x** (1.9x con su propia extrapolación) |

**Residuo, sin adornos:** los dos que quedan por debajo de ~3.5x son el primer `it` de
`db/index.test.ts` y, sobre todo, **el global frente a la familia axe/happy-dom**. Y hay un
multiplicador que el propio informe reconoce y que nadie acotó: **caché de transformación fría
y contención de CPU son dos factores distintos y pueden coincidir** (el pico de 7501 ms no se
reprodujo bajo carga con caché caliente; salió en frío). Si vuelven a coincidir sobre un test de
axe, el candidato a parpadear es **el global de 10 s**, no los topes por archivo.

## 6. Higiene — sin peros

- **Producción intacta.** `git diff --name-only` devuelve `vitest.config.ts`, los 4 `*.test.ts`
  y `progress/deudas.md` (más `.claude/settings.json`, fuera de alcance). **Ni un archivo de
  `src/` que no sea `.test.`**. `password.ts` y `db/index.ts` sin diff tras mi propia rotura
  y restauración.
- **Cero `skip` / `todo` / tests borrados.** El diff no introduce ninguno y el conteo de `it(`
  por archivo es idéntico entre `HEAD` y el worktree (9 / 5 / 4 / 2). El total **1336 pasados +
  13 saltados = 1349** cuadra con la aritmética del baseline (1333 pasados + 3 rojos = 1336):
  **no se ganó el verde saltando nada**.
- **Comentarios:** los cinco topes llevan encima **el número y la causa** (bcrypt cost 12 en JS
  puro / import de los Route Handlers / arranque en frío de drizzle+neon vía transform de vite),
  con el peor tiempo medido y el factor aplicado. Cumple `conventions.md` (comentario sólo para
  un *por qué* no obvio) y el requisito explícito de la ficha.
- **Elección fina que merece reconocerse:** en `db/index.test.ts` el tope va **por `it`**, no por
  archivo. Los otros tres tests corren en 1-2 ms y **conservan el tope global a propósito**. Es la
  diferencia entre "este test es caro" y "este archivo es caro", y está bien vista.
- `progress/deudas.md`: la 145 queda tachada con el **cómo**, los números y la ampliación de
  alcance declarada. Correcto según la cabecera del libro mayor.

## Checkpoints

- C1: [x] `bash ./init.sh` termina en **EXIT 0** (pasada propia del reviewer, no la del implementer).
- C2: [x] `feature_list.json` no tocado (esto es deuda, no feature); nada quedó en `in_progress`.
- C3: [x] No aplica el eje de capas (el cambio es sólo tests + config) y, sobre todo, **no hay
      código de producción tocado**. Sin `console.log` sueltos ni TODOs sin contexto en el diff.
- C4: [x] lint verde, typecheck verde, 1336 tests verdes; y lo que de verdad importa aquí: los
      tests **siguen mordiendo** (REGLA 3 reproducida por el reviewer, rojo por aserción).
- C5: [x] Sin archivos sospechosos: el único sin trackear es
      `progress/reports/impl_deuda145_timeouts.md`. Mi andamiaje (`src/__scope_probe__/`) está
      borrado. (La entrada en `progress/history.md` y el estado de `progress/current.md` son
      trabajo del leader, no del implementer.)

## Bloqueantes

**Ninguno.**

## Residuos / no bloqueantes (que no se pierdan)

1. **El tope global de 10 000 ms es la pieza más floja del lote** (sección 3): margen 3.1x contra
   el peor genérico medido, **1.9x** con la extrapolación de carga del propio implementer. Es
   además la única decisión que abandona el alcance por archivo que él mismo usó cuatro veces.
   Camino correcto si se quiere apretar: `vi.setConfig` en los archivos de axe/happy-dom y global
   de vuelta al defecto. **No borrar la línea a secas.**
2. **`db/index.test.ts`, primer `it`: 3.4x** (5837 ms contra 20 s), el más ajustado de los topes
   por archivo. Nadie acotó el peor caso de "caché fría **más** CPU saturada" **juntas**: los dos
   multiplicadores están medidos por separado (6.7x ocioso->cargado; ~2.2x frío->caliente) y el
   pico de 7501 ms vino del segundo, no del primero.
3. **Nada se hizo más rápido.** La deuda se salda moviendo umbrales, que era lo pedido, pero el
   coste real sigue ahí: la suite tarda 71-99 s en caliente y ~300 s en frío, y **el grueso no son
   los tests** (43-63 s) sino `setup` + `import` + `environment`. Candidato obvio a ficha nueva si
   alguien quiere la puerta rápida; el implementer lo dejó anotado y coincido.
4. **`.claude/settings.json`** sale modificado en el worktree y **no lo revisé**: es de otra tanda.
   Que no se cuele en el commit de esta deuda sin que alguien lo mire.

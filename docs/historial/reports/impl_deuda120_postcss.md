# impl — Deuda 120: `postcss` dependencia fantasma

> **NO es una feature de `feature_list.json`.** Ese archivo **no se tocó**.
> **`progress/deudas.md` tampoco se tocó** — el tachado de la ficha es del leader al cerrar.

---

## 0. Veredicto en una línea

**La ficha 120 es VERDADERA, y se quedaba corta.** En un entorno limpio no sólo falla
`pnpm typecheck` (exit 2, tres `TS2307`): también **caen los tres archivos de test enteros**
(`3 failed | 67 passed`, **35 tests perdidos**), y `bash ./init.sh` sale con **exit 1**.
Con el arreglo, ese mismo entorno limpio da **exit 0** y **1220 passed | 13 skipped**, exactamente los
mismos números que el árbol principal.

---

## 1. Archivos creados / modificados

| Archivo | Cambio |
|---|---|
| `package.json` | **+1 línea**: `"postcss": "8.4.31"` en `devDependencies` |
| `pnpm-lock.yaml` | **+3 líneas**: la entrada del importador raíz. Nada más. |

**Nada de `src/**`.** Nada de `pnpm-workspace.yaml` (verificado por suma de control, §5).

### Diff completo, los dos archivos

```diff
diff --git a/package.json b/package.json
@@ -43,6 +43,7 @@
     "eslint": "^9.39.0",
     "eslint-config-next": "^16.2.10",
     "happy-dom": "^20.11.1",
+    "postcss": "8.4.31",
     "typescript": "^5.9.3",
     "vitest": "^4.1.10",
     "vitest-axe": "^0.1.0"
```

```diff
diff --git a/pnpm-lock.yaml b/pnpm-lock.yaml
@@ -90,6 +90,9 @@ importers:
       happy-dom:
         specifier: ^20.11.1
         version: 20.11.1
+      postcss:
+        specifier: 8.4.31
+        version: 8.4.31
       typescript:
         specifier: ^5.9.3
         version: 5.9.3
```

```
 package.json   | 1 +
 pnpm-lock.yaml | 3 +++
 2 files changed, 4 insertions(+)
```

---

## 2. Diff del lockfile, revisado y explicado

**El riesgo que el encargo señalaba (churn del árbol de resolución) NO se materializó, y hay una razón
concreta y medible.**

**¿Se movió la resolución de algo que no sea `postcss`? NO. De nada. Cero.**

- El diff son **3 líneas, todas dentro de `importers['.'].devDependencies`** — o sea, la declaración de
  que la raíz ahora depende directamente de `postcss`. **Es puro registro de intención.**
- **No se añadió ninguna entrada a la sección `packages:`** ni a `snapshots:`. `postcss@8.4.31` ya
  estaba en las dos (`pnpm-lock.yaml:2627` y `:5410`) porque tres paquetes ya la traían:
  `@tailwindcss/postcss@4.3.3` (`:3844`), `next@16.2.10` (`:5296`) y `vite@8.1.5` (`:5859`).
- **No cambió ni una versión de ningún otro paquete.** `pnpm add` reportó
  `Progress: resolved 608, reused 450, downloaded 0, added 0` y `Already up to date`: **descargó cero
  paquetes**.

### Por qué salió tan barato — el dato que hay que conocer

**`pnpm-workspace.yaml` ya fija `postcss` a `8.4.31` con un `override` global** (líneas 3-8), con este
motivo escrito dentro:

> *vite 8.1.5 declara una dependencia dura en postcss@^8.5.17, versión no publicada en el registry de
> este entorno (último publicado: 8.5.16). Se fija a 8.4.31 — la misma versión que Next.js ya usa y que
> npm había instalado — para reproducir el árbol funcional.*

Un `override` de pnpm **manda sobre cualquier specifier**. Así que la versión resuelta no era una
elección mía: **cualquier rango que hubiera escrito habría resuelto a 8.4.31 igual**. Lo medí antes de
instalar (`require('postcss/package.json').version` → `8.4.31`) y fijé esa misma.

**Decisión: specifier EXACTO `8.4.31`, no `^8.4.31`** (`pnpm add -D -E`). Motivo: escribir `^8.4.31`
sería **una declaración falsa** — diría "cualquier 8.x me vale" cuando el override de al lado obliga a
8.4.31 y nada más. El exacto dice la verdad y **queda consistente con el override**, así que quien lea
`package.json` y `pnpm-workspace.yaml` juntos ve el mismo número en los dos sitios en vez de dos reglas
que hay que reconciliar mentalmente. Hay precedente de pin exacto en el repo: `three` y `@types/three`
(`0.185.1`).

---

## 3. Condición doble de ENTORNO (REGLA 3) — medida, no argumentada

**Método.** Copia completa del **árbol de trabajo actual** (no un `git clone` de HEAD) al scratchpad,
**excluyendo `node_modules`, `.next`, `.git` y `tsconfig.tsbuildinfo`**, seguida de `pnpm install
--frozen-lockfile` desde cero.

**Por qué copia del árbol de trabajo y no clon de HEAD:** el **tercer** archivo afectado,
`src/app/yarn-host-responsive.test.ts`, **está sin commitear** (`??` en `git status`). Un clon de HEAD
lo habría dejado fuera y la medición habría cubierto sólo 2 de los 3 casos. La copia mide **el código
que hay hoy**, que es lo que la ficha afirma.

Las dos copias se instalaron con `INSTALL_EXIT=0` y **`downloaded 0`**: el almacén global tenía todo, así
que ninguna diferencia entre "antes" y "después" viene de la red.

### 3.1 ANTES (sin el arreglo) — DEBE FALLAR, y falla

Primera prueba de que el entorno limpio es de verdad distinto de esta máquina:

```
$ ls node_modules | grep -x postcss
(root node_modules/postcss NO existe)
```

**Typecheck:**

```
$ pnpm typecheck
TYPECHECK_EXIT=2
$ tsc --noEmit
src/app/globals-css.test.ts(5,21): error TS2307: Cannot find module 'postcss' or its corresponding type declarations.
src/app/yarn-host-responsive.test.ts(6,21): error TS2307: Cannot find module 'postcss' or its corresponding type declarations.
src/shared/ui/primitives/skeleton/skeleton.tokens.test.ts(5,21): error TS2307: Cannot find module 'postcss' or its corresponding type declarations.
[ELIFECYCLE] Command failed with exit code 2.
```

**Los tres archivos, exactamente los tres que el leader había medido. Ni uno más, ni uno menos.**

**`bash ./init.sh` completo en el entorno limpio SIN el arreglo → `INIT_EXIT=1`:**

```
[OK]    lint verde
src/app/globals-css.test.ts(5,21): error TS2307: Cannot find module 'postcss' ...
src/app/yarn-host-responsive.test.ts(6,21): error TS2307: Cannot find module 'postcss' ...
src/shared/ui/primitives/skeleton/skeleton.tokens.test.ts(5,21): error TS2307: Cannot find module 'postcss' ...
[FAIL]  typecheck en rojo

 ❯ src/app/globals-css.test.ts (0 test)
 ❯ src/app/yarn-host-responsive.test.ts (0 test)
 ❯ src/shared/ui/primitives/skeleton/skeleton.tokens.test.ts (0 test)

 FAIL  src/app/globals-css.test.ts [ src/app/globals-css.test.ts ]
Error: Cannot find package 'postcss' imported from .../clean/src/app/globals-css.test.ts
 ❯ src/app/globals-css.test.ts:5:1
      4| import tailwindcss from "@tailwindcss/postcss";
      5| import postcss from "postcss";
       | ^

 Test Files  3 failed | 67 passed | 3 skipped (73)
      Tests  1185 passed | 13 skipped (1198)
[FAIL]  hay tests rotos
```

### 3.2 DESPUÉS (con el arreglo) — DEBE PASAR, y pasa

Copia limpia **nueva**, hecha ya con `package.json`/`pnpm-lock.yaml` arreglados, e install fresco:

```
$ ls node_modules | grep -i postcss
postcss@          <- symlink, creado por el install
$ grep postcss after-install.log
+ @tailwindcss/postcss 4.3.3
+ postcss 8.4.31
```

```
$ pnpm typecheck
TYPECHECK_EXIT=0
$ tsc --noEmit
(sin una sola línea de salida)
```

```
$ pnpm exec vitest run <los tres archivos>
VITEST_EXIT=0
 Test Files  3 passed (3)
      Tests  35 passed (35)
```

**`bash ./init.sh` completo en el entorno limpio CON el arreglo → `INIT_CLEAN_EXIT=0`:**

```
[OK]    lint verde
[OK]    typecheck verde
 Test Files  70 passed | 3 skipped (73)
      Tests  1220 passed | 13 skipped (1233)
[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
```

### 3.3 La aritmética cierra

| | ANTES (limpio) | DESPUÉS (limpio) | Δ |
|---|---|---|---|
| `init.sh` exit | **1** | **0** | — |
| `tsc --noEmit` exit | **2** | **0** | — |
| Archivos de test | `3 failed \| 67 passed \| 3 skipped (73)` | `70 passed \| 3 skipped (73)` | **+3 verdes** |
| Tests | `1185 passed \| 13 skipped` | `1220 passed \| 13 skipped` | **+35** |

**1220 − 1185 = 35**, y la corrida aislada de los tres archivos da **exactamente 35 passed**. Los
números cuadran solos: **lo único que cambió es lo que la ficha decía que cambiaría.**

---

## 4. Verificación en el árbol principal

`bash ./init.sh` **redirigido a archivo, sin tubería** (`> archivo 2>&1; echo $?`), como pedía el encargo:

```
INIT_EXIT=0
[OK]    node -> v24.11.1
[OK]    pnpm -> 11.9.0
[OK]    feature_list.json válido (33 features)
[OK]    lint verde
[OK]    typecheck verde
 Test Files  70 passed | 3 skipped (73)
      Tests  1220 passed | 13 skipped (1233)
   Duration  83.70s
[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**Coincide dígito a dígito con el gate de arranque del leader** (`70 passed | 3 skipped`,
`1220 passed | 13 skipped`) — el arreglo **no movió un solo test**, que es exactamente lo que debía pasar.

`pnpm build`:

```
BUILD_EXIT=0
  Finished TypeScript in 11.5s
✓ Generating static pages using 3 workers (15/15) in 379ms
Route (app)   — 27 rutas
ƒ Proxy (Middleware)
```

---

## 5. Restauración del árbol de trabajo — verificada por suma de control

El experimento vivió **entero** en el scratchpad. Las dos copias (`clean/`, `clean-after/`) están
**borradas**.

| Archivo | SHA-256 al empezar | SHA-256 al terminar | ¿Cambió? |
|---|---|---|---|
| `package.json` | `a92117c8…8acf94` | `1e645af1…efc9c1` | **SÍ, a propósito** |
| `pnpm-lock.yaml` | `bc8de4ae…a7621e` | `1020f037…a2b0d0` | **SÍ, a propósito** |
| `pnpm-workspace.yaml` | `c3322866…397787` | `c3322866…397787` | **NO — idéntico** |

`git diff --stat -- pnpm-workspace.yaml` → **vacío**.

**`git status --porcelain`, diferencia contra la línea base tomada al arrancar:**

```
>  M package.json          <- MÍO, intencionado
>  M pnpm-lock.yaml        <- MÍO, intencionado
>  M docs/design/rfc/RFC-03-proyectos.md          <- NO es mío
>  ?? progress/reports/explore_20_card_quickstart.md       <- NO es mío
>  ?? progress/reports/explore_20_filtros_backend.md       <- NO es mío
>  ?? progress/reports/explore_20_pagina_estados_gates.md  <- NO es mío
```

Las cuatro últimas son **de los tres exploradores de #20 y del leader, corriendo en paralelo** conmigo
(el propio `current.md` los anuncia en su tabla de carriles). **Las declaro explícitamente para que
nadie me las atribuya**, ni yo me las apropie. **Ningún archivo de `src/**` cambió.**

---

## 6. 🔴 HALLAZGO GRAVE, colateral y no pedido: `node_modules` de esta máquina está contaminado

**Este es el resultado más valioso de la sesión, y corrige la explicación que daba la propia ficha 120.**

La ficha decía que funciona aquí *"porque el almacén de pnpm la tiene por transitividad"*. **Medido: no
es eso.** El linker de pnpm en este repo es `isolated` (`node_modules/.modules.yaml:1517`) y clasifica
`postcss` como **`"private"`** (`:123-125`), o sea la coloca en `node_modules/.pnpm/node_modules/`, que
**TypeScript y Vite NO miran** desde `src/`. Por eso la copia limpia falló. Lo que la hacía funcionar
aquí era otra cosa:

**Antes del arreglo, `node_modules/postcss` en el árbol principal era un DIRECTORIO REAL, no un
symlink** (`fs.lstatSync(...).isSymbolicLink()` → `false`; fecha `jul. 20 21:24`). **pnpm nunca crea
eso**: sus dependencias raíz son siempre enlaces. Era un **resto de una instalación con `npm`** — y el
propio `pnpm-workspace.yaml` deja constancia de esa era: *"la misma versión que **npm había
instalado**"*. Tras `pnpm add`, ya es un symlink correcto a `.pnpm/postcss@8.4.31`.

**Y no es un caso aislado. Conté las entradas de primer nivel de `node_modules` que NO son symlink:**

| | entradas de primer nivel | NO son symlink |
|---|---|---|
| **Árbol principal (esta máquina)** | **378** | **348** |
| **Copia limpia, install fresco** | **30** | **0** |

**348 directorios reales que un `pnpm install` limpio jamás produce.** Es un árbol plano estilo npm
fosilizado encima del árbol de pnpm. **Consecuencia operativa, y es la razón de fondo de la deuda 120:
en esta máquina, CUALQUIER paquete transitivo resuelve desde `src/`.** No es que a `postcss` se le
escapara la declaración: es que **este `node_modules` no puede detectar dependencias fantasma, por
construcción**. La 120 fue la primera que salió; con 348 directorios de cobertura, no tiene por qué ser
la última que pudiera aparecer si alguien añade un import mañana.

**No lo arreglé** (fuera de alcance: tocaría `node_modules`, no `package.json`). **Lo dejo medido para
el leader.** El arreglo sería `rm -rf node_modules && pnpm install`, y su verificación natural es la que
ya monté: `init.sh` en copia limpia da **exit 0, 1220 passed**, así que se sabe de antemano que el árbol
sano pasa.

---

## 7. Barrido de más dependencias fantasma (MEDIDO, no arreglado)

**Encargo: medir y reportar, no arreglar.** Hecho.

**Método** (script en el scratchpad, `sweep.mjs`): recorrido de directorios de `src/` (**no una lista a
mano** — es la medicina de las deudas 40/43/71/91) + los 6 archivos de configuración de la raíz. Se
extrae el nombre de paquete de **seis** formas de import (`import … from`, `import()` dinámico,
`require()`, `import "efecto"`, `vi.mock`, `vi.importActual`), se descartan los relativos, el alias
`@/`, los `node:` y los builtins de Node, y se contrasta contra `dependencies` + `devDependencies` de
`package.json`.

**Punto clave del método: el barrido NO consulta `node_modules`.** Compara código contra `package.json`.
Por eso su resultado **no queda contaminado** por lo del §6.

```
Archivos barridos: 296

--- DECLARADOS OK (21) ---
@neondatabase/serverless, @tailwindcss/postcss, @testing-library/jest-dom,
@testing-library/react, @testing-library/user-event, bcryptjs,
class-variance-authority, clsx, drizzle-kit, drizzle-orm, eslint-config-next,
jose, next, postcss, react, react-dom, tailwind-merge, three, vitest,
vitest-axe, zod

--- NO DECLARADOS EN package.json (0) ---
```

**Resultado: CERO fantasmas más. `postcss` era la única.**

Dos comprobaciones extra por si la regex se dejaba algo:

- `/// <reference types="…">` en `src/` → **cero apariciones**.
- `@import` / `@plugin` / `@config` en CSS → sólo `@import "tailwindcss"` en `globals.css:15`, y
  **`tailwindcss` sí está declarada** (`package.json:29`). No es fantasma.

**Nota honesta sobre el límite del barrido:** valida *declarado sí/no*, **no** valida la ubicación
(`dependencies` frente a `devDependencies`). Ejemplo: `drizzle-kit` está en `devDependencies` y sólo lo
importa `drizzle.config.ts`, que es correcto; pero el barrido no lo habría cazado si estuviera mal.
Comprobarlo era otra pregunta y **no la contesté**.

---

## 8. Decisiones no obvias

1. **Specifier exacto `8.4.31`, no `^8.4.31`.** Razonado en §2: el `override` de `pnpm-workspace.yaml`
   ya obliga a esa versión, así que un caret sería una declaración falsa. Precedente en el repo: `three`.
2. **Copia del árbol de trabajo en vez de `git clone` de HEAD** para la medición. Razonado en §3: uno de
   los tres archivos afectados **está sin commitear**, y un clon lo habría dejado fuera, midiendo 2 de 3.
3. **No toqué `progress/current.md`, en contra del paso 3 de mi protocolo, y lo digo en vez de
   ocultarlo.** El leader tiene **tres exploradores de #20 escribiendo en paralelo** y él mismo estaba
   editando `current.md` y `RFC-03` durante mi sesión (se ve en §5). Un `Edit` mío sobre ese archivo se
   arriesgaba a una **actualización perdida** sobre trabajo ajeno. El encargo además decía *"escribí todo
   en `progress/reports/impl_deuda120_postcss.md`"* y el bloque «EN CURSO» de `current.md` ya documenta
   este carril. **Queda a criterio del leader volcar lo que quiera de aquí.**
4. **Dos copias limpias separadas** (una sin arreglo, otra con) en vez de reusar una y reinstalar encima.
   Un `pnpm install` sobre un `node_modules` ya poblado **no es lo mismo** que uno desde cero — y toda la
   ficha 120 trata precisamente de un `node_modules` con historia. Ambas se borraron al terminar.
5. **`bash ./init.sh` siempre redirigido a archivo, nunca por tubería.** La trampa de `| tail` está
   fichada en `current.md` (regla del gate) y se respetó en las **tres** corridas (principal, limpia sin
   arreglo, limpia con arreglo).

---

## 9. Lo que NO hice (alcance respetado)

- **`src/**`** — cero archivos tocados.
- **`feature_list.json`** — no tocado. Esto no es una feature.
- **`progress/deudas.md`** — **no tocado**. El tachado de la ficha 120 es del leader.
- **`pnpm-workspace.yaml`** — no tocado (hash idéntico, §5).
- **Otras dependencias fantasma** — no había ninguna (§7), así que no hubo nada que no arreglar.
- **La contaminación de `node_modules` (§6)** — medida y reportada, **deliberadamente no arreglada**.

---

## 10. Para el leader: lo que hay que decidir

1. **La ficha 120 se puede tachar**, y al escribir el motivo conviene corregirle dos cosas, sin borrarlas:
   - decía *"falla `pnpm typecheck`"* → **también caen los 3 archivos de test y `init.sh` sale exit 1**
     (`1185` en vez de `1220`);
   - decía que aquí funcionaba *"porque el almacén de pnpm la tiene por transitividad"* → **falso**, el
     linker es `isolated` y la clasifica como `private`; funcionaba por un **directorio real fosilizado
     de la era npm** (§6).
2. **Candidata a ficha nueva: `node_modules` local contaminado, 348 entradas no-symlink contra 0 en un
   install limpio** (§6). Es **la causa de que la 120 fuera invisible**, y sigue viva después de este
   arreglo. Cualquier import nuevo sin declarar volverá a pasar desapercibido aquí.
3. **Barrido de fantasmas: cero pendientes** (§7). Nada más que hacer por ese lado hoy.

# Impl report — hardening `tailwind_source_guardrail`

**Tarea de bugfix/hardening, no una feature de `feature_list.json`.** No se tocó ningún `status`.

Objetivo: que un `.md` de `progress/`/`docs/` o el prototipo de `template/` no puedan volver a inyectar
"clases" al escáner de Tailwind y romper el CSS (bug del `duration-[var(--dur-*)]` citado en
`progress/reports/impl_ui_shell_nav.md`).

## Archivos tocados (solo 2, como pedía el brief)

- **Modificado** `src/app/globals.css` — bloque de alcance de escaneo al principio del archivo
  (+19 líneas, incluida documentación). **No se tocó ningún token de `@theme`** ni ningún componente.
- **Creado** `src/app/globals-css.test.ts` — test de regresión: compila el CSS de verdad y aserta
  sobre la salida.

No se modificó `package.json` (ver §"Decisiones no obvias" sobre `postcss`).

## Qué quedó en `globals.css`

```css
@import "tailwindcss" source("../");

@source not "../../progress";
@source not "../../docs";
@source not "../../template";
```

Dos mecanismos, complementarios:

1. `source("../")` — acota la **detección automática** de fuentes a `src/` (la ruta es relativa al CSS,
   que vive en `src/app/`). Nada fuera de `src/` se escanea, ni siquiera carpetas futuras.
2. `@source not "…"` — deja **explícitas** las tres carpetas prohibidas: defensa en profundidad si
   alguien ensancha la base, y documentación del porqué en el sitio donde se leería.

## Sintaxis verificada contra la versión instalada (no de memoria)

`context7` no está disponible; la comprobación se hizo **contra el paquete real** y **empíricamente**:

- `node_modules/tailwindcss/package.json` → **`"version": "4.3.3"`**.
- `node_modules/tailwindcss/dist/lib.mjs` (bundle real, es el que corre) — el parser del at-rule:

  ```js
  if (b.name === "@source") { if (b.nodes.length > 0) throw new Error("`@source` cannot have a body.");
    if (D.parent !== null) throw new Error("`@source` cannot be nested.");
    let O = !1, L = !1, E = b.params;
    E[0] === "n" && E.startsWith("not ") && (O = !0, E = E.slice(4)),
    E[0] === "i" && E.startsWith("inline(") && (L = !0, E = E.slice(7, -1).trim()),
    … throw new Error("`@source` paths must be quoted.");
    … h.push({ base: D.context.base, pattern: j, negated: O });
  ```

  Es decir, en 4.3.3: el prefijo literal es **`not ` (con espacio)**, la ruta **debe ir entre comillas**,
  el at-rule **no puede anidarse ni llevar cuerpo**, y el patrón se registra con **`base` = el directorio
  del CSS que contiene la directiva** (confirma que las rutas son relativas a `src/app/`).
- Comprobación empírica adicional: se compiló el CSS con y sin las directivas (ver abajo). Con la
  directiva presente el compilador **no lanza** (sintaxis aceptada) **y** cambia el resultado.

## Punto 3 del brief — ¿el guardrail funciona de verdad?

Experimento con un script temporal (`_tw_probe.tmp.mjs`, ya borrado) que corre exactamente el pipeline
del brief (`postcss([tailwindcss()]).process(globals.css)`) y busca los strings sembrados. Carnadas
temporales: `progress/_bait.tmp.md` → `text-[9971px]`, `docs/_bait.tmp.md` → `text-[9972px]`,
`template/_bait.tmp.md` → `text-[9973px]`.

**A) Control — exclusiones comentadas (estado equivalente al del bug):**

```
ms: 410 bytes: 30976
invalid var(--…*): []
bait 9971px present: true
bait 9972px present: true
bait 9973px present: true
has .bg-surface: true
```

**B) Control con el veneno original** (`progress/_bait.tmp.md` = ``poison `duration-[var(--dur-*)]` ``,
exclusiones aún comentadas) — se reproduce el bug exacto:

```
ms: 443 bytes: 31038
invalid var(--…*): ["var(--dur-*","var(--dur-*"]
```

**C) Guardrail restaurado, el veneno SIGUE en `progress/`:**

```
ms: 377 bytes: 28273
invalid var(--…*): []
bait 9971px present: false
bait 9972px present: false
bait 9973px present: false
has .bg-surface: true
has .tablet\:flex: true
```

Conclusión: el `@source not` se aplica de verdad. Además el bundle **adelgaza 2.7 kB** (30976 → 28273):
`docs/`/`template/`/`progress/` estaban generando utilidades basura que sí llegaban al CSS real.
Las carnadas y el script de prueba fueron **borrados** (`git status` limpio, ver §Verificación).

**D) Evaluación del acotado positivo a `src/`:** se compiló con `@import "tailwindcss" source("../")` y
la salida resultó **byte a byte idéntica** (28273 bytes) a la de solo `@source not`, con `.bg-surface` y
`tablet\:flex` presentes → **no rompe la detección de ninguna clase real de `src/**`**, y además baja el
tiempo de compilación (~370 ms → ~140-230 ms). Por eso se dejaron los dos mecanismos.

## El test de regresión (`src/app/globals-css.test.ts`, 6 tests)

- Compila `src/app/globals.css` con `postcss([tailwindcss()])` — si el CSS no compila, el test revienta.
- Aserta que la salida **no** contiene `/var\(--[a-z-]*\*/` (la firma exacta del CSS inválido del bug;
  el control **B** demuestra que ese regex sí lo detecta).
- Aserta que **sigue** habiendo utilidades de `src/**` (`.bg-surface`), para que un acotado demasiado
  agresivo no pase inadvertido.
- Siembra una carnada `.tmp.md` en `progress/`, `docs/` y `template/`, recompila, aserta que ninguna
  aparece en la salida, y las borra en `afterAll`.
- **Robusto al cwd:** las rutas salen de `fileURLToPath(new URL("./globals.css", import.meta.url))` y
  `new URL("../../", import.meta.url)`, igual que `no-hardcode.test.ts`. No usa `process.cwd()`.
- **Timeout:** los `beforeAll` llevan 120 s explícitos. En la práctica cada compilación tarda ~200-450 ms
  (oxide es nativo), así que el archivo entero corre en ~1,5 s.

Control de que el test sirve: con las tres directivas comentadas, los 3 tests de carnada **fallan** con
el mensaje "Tailwind escaneó progress/… : el alcance de escaneo de globals.css se ensanchó"
(`Tests 3 failed | 2 passed`). Restauradas, `6 passed`.

## Decisiones no obvias

- **`postcss` se importa sin estar en `package.json`.** Es dependencia dura de Next y de Vite, está
  hoisteada en `node_modules/postcss` y **pinneada por el `overrides` de `pnpm-workspace.yaml`**
  (8.4.31), así que resuelve de forma estable. Se prefirió eso a tocar `package.json`/lockfile por un
  test, como pedía el brief ("tocá lo mínimo"). Alternativa descartada: usar la API `compile()` de
  `tailwindcss` — no reproduce el escaneo de fuentes, que es justo lo que hay que testear.
- **Se dejaron los dos mecanismos** (`source("../")` + `@source not`) en vez de solo uno: el modo de
  fallo del bug es *silencioso hasta que rompe el build*, y el coste es un bloque de 4 líneas en un
  único archivo. El test aserta el **resultado** (esas carpetas no se escanean), no un mecanismo
  concreto, así que sigue siendo válido si mañana se simplifica a uno solo.
- **El comentario explicativo va antes del `@import`**: es legal (los comentarios no cuentan como
  reglas para la restricción de posición de `@import`) y se verificó que la salida no cambia
  (28273 bytes en ambos casos) y que `pnpm build` sigue OK.
- **No se añadió `.gitignore`** para las carnadas `*.tmp.md`: se borran en `afterAll` y, si una
  ejecución quedara a medias, el archivo huérfano es inofensivo (está en una carpeta excluida).

## Verificación ejecutada

`bash ./init.sh` → **VERDE** (exit 0):

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"
 Test Files  38 passed | 1 skipped (39)
      Tests  362 passed | 6 skipped (368)
   Duration  45.16s
[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

Baseline 356 passed | 6 skipped → ahora **362 passed | 6 skipped** (+6, los del archivo nuevo; ningún
test previo se tocó).

`pnpm build` → **OK** (no hubo bloqueo de `.next` por un `pnpm dev` del usuario). 12 páginas estáticas
generadas, todas las rutas de API listadas, proxy compilado. Comprobación extra sobre el CSS **realmente
emitido por el build** (`.next/static/chunks/2thd_sk7shzs3.css`):

```
bytes 31349
invalid var: []
has bg-surface: true
```

`git status --porcelain` tras terminar: solo `M src/app/globals.css` y `?? src/app/globals-css.test.ts`
como cambios propios (el resto del árbol sucio es trabajo previo de #8-#14 sin commitear). Sin archivos
temporales huérfanos.

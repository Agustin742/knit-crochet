# impl — lote de higiene: deudas 21, 17, 13 y 4

> **NO es una feature de `feature_list.json`.** `feature_list.json` no se tocó (ni estados ni nada).
> Encargo: saldar 4 deudas técnicas de `progress/deudas.md`.
> Baseline al arrancar: `bash ./init.sh` VERDE, **420 passed | 6 skipped**.
> Resultado: `bash ./init.sh` VERDE, **433 passed | 6 skipped** (+13, desglose abajo). `pnpm build` OK.

---

## 1. Archivos creados / modificados

| Archivo | Qué |
|---|---|
| `src/shared/ui/layout/app-shell/AppShell.tsx` | **modificado** — JSDoc de `user`/`onLogout` corregido (deuda 21). Firma pública **intacta**. |
| `src/features/auth/ui/AppShellClient.tsx` | **modificado** — fuera el `useEffect` + `fetch("/api/auth/me")`, el `useState` y `handleLogout` (deuda 21). |
| `src/features/auth/ui/AppShellClient.test.tsx` | **modificado** — reescrito: 3 tests viejos fuera, 4 nuevos, incluido el gate "montar el shell no dispara ningún fetch". |
| `src/shared/ui/primitives/button/button.variants.ts` | **modificado** — variante fantasma que hereda el primer plano (deuda 17) + interlineado pegado al tamaño (deuda 13). |
| `src/shared/ui/primitives/button/button.variants.test.ts` | **nuevo** — 12 tests: gates de las deudas 13 y 17. |
| `.gitignore` | **modificado** — ignora `tsconfig.tsbuildinfo` y `*.tsbuildinfo` (deuda 4). |
| `progress/deudas.md` | 4 fichas tachadas con el cómo y el dónde; ficha 17 **corregida** antes de tacharla; **5 deudas nuevas** (29-33). |
| `progress/current.md` | plan de la sesión + recuento de fichas de `deudas.md`. |

**No se tocó** (deliberadamente): `src/app/api/auth/me/route.ts` y sus tests (9, verdes — los usa #31),
`src/shared/ui/layout/archive-nav/**`, `feature_list.json`, y las deudas fuera de alcance (3, 22-28).

---

## 2. Deuda 21 — `AppShell` promete algo que no hace

### Qué se cambió

**(a) El JSDoc mentiroso.** Decía *"Usuario mostrado en el archivero (utils)"*. Ahora dice que la prop está
**reservada para #31 `auth_ui`**, que se acepta y se propaga al `ArchiveNav` y que **el `ArchiveNav` la
ignora a propósito** desde la enmienda E7 (ofrecía "Salir" sin ninguna sesión abierta), de modo que pasar un
usuario **no pinta nada en pantalla**. Igual para `onLogout`.

**(b) La petición que nadie consumía.** `AppShellClient` quedó en una sola expresión: monta el `AppShell` con
la capa 3D y ya. Se fueron el `useEffect`, el `fetch("/api/auth/me")`, el `useState<PublicUser|null>` y el
import de `PublicUser`. Con ello desaparece **una petición HTTP por navegación** en todas las páginas del
grupo `(app)` y el **re-render del shell entero** (ovillo ASCII incluido) que provocaba el `setUser`.

**(c) La firma pública de `AppShell` (`user` / `onLogout`) sigue exactamente igual**, como pedía el encargo:
es contrato del design system y #31 la va a usar. Lo que cambió es **quién la alimenta**: hoy, nadie.

### Decisión pedida: qué hacer con `handleLogout` → **borrado**

**Lo borré.** Razones, por orden de peso:

1. **Su test sólo pasaba porque se fabricaba su propio sujeto.** El doble de `@/shared/ui` del test viejo
   renderizaba un botón "Salir" que **el shell real no tiene** desde E7. O sea: el test verificaba un
   cableado que ningún usuario podía alcanzar, apoyándose en un botón que sólo existía dentro del test.
   Eso no es cobertura, es confianza falsa — y es peor que no tener el test, porque nadie iba a mirar ahí.
2. **La deuda 21 va justo de eso**: de que el shell prometa cosas que no cumple. Conservar `handleLogout`
   como andamiaje habría dejado viva la segunda promesa incumplida mientras se quitaba la primera.
3. **Dónde vive el logout es una decisión de #31, no mía.** #31 monta login/register y decide si el menú de
   cuenta va en el `ArchiveNav`, en el `BottomNav` o en una página propia. Dejarlo escrito en
   `AppShellClient` daba esa decisión por tomada sin poder verificarla, que es la misma clase de error que
   la deuda 21.
4. **Reponerlo cuesta seis líneas** (`POST /api/auth/logout` + `router.push("/login")`), y se escribirá
   contra la UI real que lo llame.

**Dónde quedó anotado que #31 lo tiene que volver a cablear** (las dos vías que pedía el encargo):
- en el **propio archivo**: el JSDoc de `AppShellClient.tsx` explica qué había, por qué se fue y qué
  exactamente tiene que reponer #31 (`GET /api/auth/me`, `POST /api/auth/logout` + redirect a `/login`);
- en **`progress/deudas.md` como deuda 29**, con el escenario de fallo concreto y un aviso que importa:
  el gate nuevo asierta **lo contrario** (que el shell no pide nada y no recibe usuario), así que #31 tiene
  que **reescribir ese gate**, no sólo añadir código.

### Tests (netos: 3 fuera, 4 dentro → +1)

| Test viejo | Qué pasa |
|---|---|
| *"hands the shell the user from GET /api/auth/me"* | **eliminado**: verificaba justo el comportamiento que la deuda manda quitar. |
| *"logs out via POST /api/auth/logout and redirects to /login"* | **eliminado** con `handleLogout` (ver arriba: su sujeto era un botón del propio test). |
| *"still renders the shell when /api/auth/me fails"* | **sustituido** por *"renders its children inside the shell"*: sin fetch no hay camino de error que probar, pero el render sí se sigue cubriendo. |

Los 4 nuevos, en `AppShellClient.test.tsx`:
1. `renders its children inside the shell`.
2. `hands the 3D layer to the shell as its background` — mantiene cubierto el cableado que sí existe.
3. **`fires no HTTP request at all when mounted`** — **el gate de regresión que pedía el encargo**. Espía
   `fetch` global y espera un tick de microtareas **y** uno de macrotareas antes de asertar, porque un
   `useEffect` con fetch no resolvería dentro del render.
4. `hands over neither user nor logout until feature #31 wires them` — el doble registra las props que
   recibe el shell; fija el estado real de la cadena (hoy `undefined`) para que #31 lo tenga que tocar
   a conciencia.

---

## 3. Deuda 17 — la variante fantasma de `Button`

### Corrección de la ficha (antes de arreglar nada)

La ficha mentía en dos puntos y los dos se **verificaron**, no se asumieron:

1. Decía que `ArchiveNav` parcheaba el defecto desde fuera pasándole el color inverso al botón "Salir".
   **Falso hoy:** E7 quitó los utils del nav. Barrido de `src/**`: `variant="ghost"` aparece **sólo** en
   `Button.test.tsx` (el test de axe). **Cero consumidores reales** → arreglo sin riesgo de regresión.
2. Decía "ilegible". **Es peor:** `--fg` y `--bg` resuelven **al mismo color** de la escala de marca
   (`--brand-espresso`). Contraste medido: **1.000**. El botón fantasma sobre el shell no era poco legible,
   era **invisible**.

Las dos correcciones están escritas en la ficha de `deudas.md`, con el texto original tachado, como manda el
protocolo del archivo.

### Decisión pedida: (a) heredar vs. (b) dos variantes → **(a) heredar**

Elegí **(a)**: la variante fantasma **deja de fijar primer plano** y adopta el de la superficie que la
contiene (`currentColor`; el `<button>` ya hereda color por el preflight de Tailwind, y declararlo explícito
documenta la intención y la hace asertable).

Por qué (a) y no (b):

- **(b) institucionaliza el parche que la deuda quería quitar.** El texto de la deuda es literal: *"se
  arregla en el primitivo, no en cada llamador"*. Partirla en normal/inversa devuelve la decisión al
  llamador, que tiene que saber sobre qué fondo está — exactamente el parche de `ArchiveNav` que la deuda
  señalaba, pero ahora con bendición oficial y multiplicado por cada consumidor de #15-#31.
- **(b) no escala:** cada superficie nueva (o cada cambio de tono) obliga a revisar cada llamador; con (a),
  una superficie nueva se resuelve declarando **su** primer plano, una vez.
- **(a) arregla de paso el borde.** El borde de hover fijaba el color de borde oscuro: el **mismo defecto**,
  en el borde. Heredando (`currentColor`) queda ligado al texto por construcción, así que **no puede
  desincronizarse**: si el texto se lee, el borde también.
- **Coste conocido y registrado:** heredar sólo funciona si la superficie declara su primer plano. Hoy hay
  una que no lo hace (`Card`) → **deuda 32**, con su escenario y su medición.

### Lo demás que pedía el encargo

- **Borde de hover sobre fondo oscuro:** resuelto por herencia (arriba). Gate: test de que la variante
  declara el borde heredado.
- **Anillo de foco sobre fondo oscuro:** `--focus` contra `--bg` = **4.68:1**, por encima del 3:1 de
  componente de interfaz. **No hacía falta tocarlo**, pero ahora tiene gate. Al medirlo apareció que sobre
  las superficies **claras** se queda corto (2.95 y 2.41) → **deuda 31**, fuera del alcance de esta deuda
  (que es sobre fondo oscuro) y no arreglable sin mover un token de identidad.
- **Cero hardcode:** `no-hardcode.test.ts` sigue verde; las clases nuevas son utilidades de palabra clave,
  sin ningún valor literal.

---

## 4. Deuda 13 — `leading-tight` se perdía en `buttonVariants`

### Confirmado empíricamente ANTES de tocar nada (dos niveles)

1. **`twMerge`**: pasarle el interlineado suelto seguido del tamaño devuelve la cadena **sin el
   interlineado**. Para `tailwind-merge` un tamaño de texto y un interlineado son el mismo conflicto,
   porque en Tailwind cada tamaño trae su propio `line-height`; gana el último y el primero desaparece.
2. **CSS compilado** (compilando `globals.css` de verdad con `@tailwindcss/postcss`, la técnica de
   `globals-css.test.ts`): el botón se pintaba con el interlineado **del tamaño**, no con el declarado —
   **1.5** en el tamaño normal y ~**1.556** en el de icono, contra el **1.1** que decía el código. En
   píxeles: 24 y 28 de alto de línea donde el código prometía 17.6 y 19.8.

**Sí afecta también a la variante `icon`**, como sospechaba el encargo (el tamaño de icono arrastra su
propio interlineado igual que el normal).

### Decisión pedida: la forma del arreglo → **tamaño e interlineado en la misma clase**

Elegí la sintaxis de Tailwind v4 que **fija tamaño e interlineado juntos**, aplicada en las dos variantes de
tamaño, y quité el interlineado de las clases base. Frente a la alternativa de sólo reordenar (declarar el
interlineado suelto **después** del tamaño), esta forma es **estructuralmente inseparable**: no hay
reordenación, refactor ni `twMerge` que pueda quedarse con una mitad y tirar la otra. Reordenar arregla el
síntoma de hoy y deja el mismo pie para volver a pisarlo mañana.

**Verificado empíricamente, no asumido** (los tres son requisitos que el encargo pedía comprobar):
- la clase **sobrevive a `twMerge`** (es lo que asierta el test, sobre la salida de `cn()`);
- el CSS compilado de las dos utilidades emite el interlineado declarado (`var(--leading-tight)`);
- se emiten **antes** que las utilidades de interlineado sueltas, así que **un llamador puede seguir
  sobreescribirlo** desde `className` — no se pierde flexibilidad (hay test).

### Tests (12 nuevos en `button.variants.test.ts`)

Todos asertan sobre **la salida real de `cn()`**, no sobre el string crudo de `cva` — que es justo el error
que dejó pasar el defecto durante años, tal y como advertía el encargo.

- **Deuda 13 (5):** un test por variante de tamaño (el tamaño conserva su interlineado tras `cn()`); un test
  que **reproduce la pérdida** con el orden antiguo (documenta la causa, no sólo el arreglo); un test de que
  el interlineado no vuelve a viajar suelto en **ninguna** de las 8 combinaciones tamaño×variante; y uno de
  que un llamador todavía puede cambiarlo.
- **Deuda 17 (3):** la fantasma no fija primer plano propio; el borde de hover hereda; y —contrapeso— las
  variantes sólidas **sí** siguen fijando su par fondo/primer plano (no se puede heredar cuando pintás tu
  propio fondo).
- **Contraste, con la fórmula de WCAG leyendo los tokens de `globals.css` (4):** el primer plano viejo era
  invisible sobre el fondo de la app; lo heredado se lee sobre la superficie oscura (12.83:1) y sobre la
  clara (14.65:1); el anillo de foco se ve sobre el fondo oscuro (4.68:1).

**Detalle no obvio:** el barrido de tamaños y variantes se hace sobre un `Record` tipado con la variante de
`cva`, no sobre una lista suelta. Añadir un tamaño o una variante nueva sin registrarlo aquí **rompe el
typecheck**: el gate se amplía solo en vez de quedarse cubriendo lo viejo.

---

## 5. Deuda 4 — `tsconfig.tsbuildinfo` trackeado

- `.gitignore`: se añadió `tsconfig.tsbuildinfo` **y** `*.tsbuildinfo` (con comentario del porqué: es la
  caché incremental de `tsc`, se regenera en cada typecheck).
- `git rm --cached tsconfig.tsbuildinfo` (sin `-r`). **El archivo sigue en el disco**, intacto.
- Comprobado: `git ls-files | grep tsbuildinfo` ya no devuelve nada.

> ⚠️ **AVISO PARA EL USUARIO, como pedía el encargo:** `git rm --cached` **deja una eliminación preparada en
> el índice**. En `git status` aparece como `D  tsconfig.tsbuildinfo` en la zona de "staged". **Es lo
> correcto y es lo que registra el destrackeo** — no es que se haya borrado nada del disco. Al hacer el
> próximo commit se incluirá esa eliminación; es lo esperado.

**Ninguna otra operación de git**: cero `commit`, cero `push`, cero `add` de nada más, cero cambios de rama.

> Nota aparte, para que el diff del usuario quede limpio: `pnpm build` **reescribe `next-env.d.ts`** (Next
> alterna ahí entre la ruta de tipos de `dev` y la de `build`, y el archivo está trackeado por indicación
> del propio Next). Como ese cambio lo produjo mi verificación y no mi trabajo, **lo devolví a su estado
> original** y volví a correr `init.sh` **entero** después (verde, mismos 433). Es churn preexistente: va a
> reaparecer en cuanto alguien corra `pnpm dev` o `pnpm build`.

---

## 6. Verificación (output real)

### `bash ./init.sh`

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  41 passed | 1 skipped (42)
      Tests  433 passed | 6 skipped (439)
   Duration  42.95s

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

### Delta explicado: 420 → 433 = **+13**, con **cero tests perdidos sin justificar**

| Archivo | Antes | Después | Δ | Deuda |
|---|---|---|---|---|
| `src/features/auth/ui/AppShellClient.test.tsx` | 3 | 4 | **+1** | **21** (3 eliminados + 4 nuevos; los 3 eliminados están justificados uno a uno en §2) |
| `src/shared/ui/primitives/button/button.variants.test.ts` (nuevo) | 0 | 12 | **+12** | **13** (5) + **17** (3) + contraste (4) |
| todo lo demás | — | — | 0 | — |
| **total** | **420** | **433** | **+13** | |

Los 6 `skipped` son los mismos de siempre (no se tocaron).

### `pnpm build`

OK. Compila y emite el árbol de rutas completo (24 handlers `ƒ` + `/` + `/_not-found`) y el `Proxy
(Middleware)`. Sin errores ni warnings nuevos.

### `src/app/globals-css.test.ts` (obligatorio porque se tocaron clases)

`6 passed`. El guardrail de alcance de escaneo de Tailwind sigue intacto y `globals.css` sigue compilando
sin CSS inválido.

### Verificaciones extra que hice por encargo o por prudencia

- **`src/app/api/auth/**` → `9 passed`.** El endpoint `/api/auth/me` **no se tocó** y sigue verde: lo
  necesita #31.
- **Compilación real del CSS** con `@tailwindcss/postcss` (scripts temporales, borrados después) para
  confirmar, antes y después: qué interlineado recibía el botón, que las utilidades nuevas se generan y qué
  emiten, y el orden de emisión frente a las utilidades de interlineado sueltas.
- **Ejecución directa de `twMerge`** para confirmar el conflicto de la deuda 13 y para el hallazgo de la
  deuda 33 (ver abajo).
- **Higiene de clases:** ningún nombre de clase se escribe literal en los tests nuevos (se arman por
  concatenación en runtime, como manda `conventions.md`) y ninguna clase con comodín se escribió en este
  informe, en `deudas.md` ni en los comentarios. Repasado con un barrido.

---

## 7. Deuda nueva encontrada (registrada en `progress/deudas.md`, numeración 29-33)

Ninguna bloquea. Las tres primeras son consecuencias conscientes de lo saldado; las dos últimas son
hallazgos colaterales, verificados empíricamente.

| # | Titular | Verificación |
|---|---|---|
| **29** | **#31 tiene que volver a cablear usuario y logout del shell.** El gate nuevo asierta lo contrario, así que #31 debe **reescribirlo**, no sólo añadir código. | consecuencia directa de §2 |
| **30** | **`AppShellClient` conserva `"use client"` sin usar ya ninguna capacidad de cliente**, y arrastra `AppShell` y `BottomNav` al bundle del navegador en todas las páginas de `(app)`. No se quitó porque obliga a renombrar el módulo y repuntar sus importadores: es decisión de #31. | lectura del archivo tras el cambio |
| **31** | **El anillo de foco no llega a 3:1 sobre las superficies claras** (2.95 y 2.41; sobre el fondo oscuro sí, 4.68). Un `Input` enfocado dentro de una `Card` apenas se distingue. | fórmula de WCAG sobre los tokens |
| **32** | **`Card` declara superficie clara y no declara primer plano**, así que hereda el crema del `body`: texto a **1.14:1**, invisible. Salta con la primera tarjeta con texto. Es además **el límite de la solución de la deuda 17**. | fórmula de WCAG sobre los tokens |
| **33** | **El mecanismo de la deuda 13 amenaza al tamaño de etiqueta del archivero:** `twMerge` clasifica `text-nav-tab` como **color**, no como tamaño, y el color de la variante activa llega después → pasar `tabLabelVariants` por `cn()` devuelve la cadena **sin el tamaño**, con el test de presupuesto horizontal en verde (mide tokens, no clases: el patrón de la deuda 18). Hoy no ocurre porque el nav usa la salida de `cva` directa. | ejecutando `twMerge` |

---

## 8. Qué quedó sin hacer

- **Deudas fuera de alcance, no tocadas:** 3, 22, 23, 24, 25, 26, 27, 28.
- **Deuda 31 y deuda 32 no se arreglaron**, sólo se registraron: la 31 mueve un token de identidad (decisión
  de diseño, no de higiene) y la 32 toca un primitivo que no estaba en el encargo. Las dos están fuera del
  alcance de las 4 deudas asignadas.
- **Deuda 30 no se ejecutó a propósito:** quitar `"use client"` obliga a renombrar `AppShellClient` (el
  nombre pasaría a mentir) y a repuntar sus tres importadores más la documentación que lo cita — eso ya es
  tocar el terreno de #31, y la regla del arnés es parar y reportar, no expandir el lote.
- **Validación visual en navegador:** no se hizo. La variante fantasma **no tiene ningún consumidor** en
  `src/**` (es justo lo que la corrección de ficha demostró), así que hoy **no hay nada que mirar en
  pantalla**: no se puede renderizar un botón fantasma sin inventar una página. El interlineado del botón sí
  sería observable, pero el botón tampoco está montado en ninguna ruta (`/` es la única que existe). Lo que
  sustituye a esa validación es la medición del CSS compilado, que es más precisa que el ojo para esto.
- **`feature_list.json` no se tocó** (ni estados ni nada), como ordenaba el encargo.

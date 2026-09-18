# impl — Reescritura del gate del ovillo en `register` (deuda 116)

> **NO es una feature de `feature_list.json`.** Encargo acotado: el árbol estaba en rojo por un gate que
> fijaba una decisión de producto ya revertida. **No toqué `feature_list.json`** (la nota de la reversión
> en #31 la escribe el leader; aparece modificado en `git status` por su mano, no por la mía).

- **Fecha:** 2026-08-07
- **Archivo tocado (uno solo):** `src/app/(auth)/auth-pages.test.tsx`
- **Archivos NO tocados, a propósito:** `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`
  (el rediseño del usuario es intencional), `feature_list.json`, `progress/deudas.md` (las deudas 117 y 118
  quedan fichadas tal cual: son decisiones de diseño, no mías).
- **`progress/current.md`:** no lo edité. El leader lo tenía modificado en el árbol de trabajo durante esta
  sesión y una edición mía en paralelo se pisaría con la suya. Este informe es la entrega.

---

## 1. Qué decía el test antes

`src/app/(auth)/auth-pages.test.tsx:187-193`, dentro de `describe("página de register")`:

```tsx
/** RFC-01 §2: el ovillo es exclusivo del login. */
it("no monta el ovillo ASCII", () => {
  const { container } = render(<RegisterPage />);

  expect(screen.queryByTestId("ascii-yarn")).not.toBeInTheDocument();
  expect(container.querySelector('[data-slot="bg-3d"]')).toBeNull();
});
```

**Qué protegía:** la **asimetría deliberada** entre las dos pantallas de auth. El criterio de aceptación de
la feature **#31 `auth_ui`** decía *"ovillo ASCII de fondo SOLO en login (no en register)"* (RFC-01 §2), y
estos dos asertos lo convertían en invariante ejecutable: ni el componente doblado (`ascii-yarn`) ni su
envoltorio (`data-slot="bg-3d"`) podían aparecer en el alta.

**Baseline medido al arrancar** (`pnpm vitest run "src/app/(auth)/auth-pages.test.tsx"`):

```
 ❯ src/app/(auth)/auth-pages.test.tsx (14 tests | 1 failed) 4261ms
     × no monta el ovillo ASCII 57ms

 FAIL  src/app/(auth)/auth-pages.test.tsx > página de register > no monta el ovillo ASCII
Error: expect(element).not.toBeInTheDocument()

expected document not to contain element, found <span
  data-testid="ascii-yarn"
/> instead
 ❯ src/app/(auth)/auth-pages.test.tsx:191:52

 Test Files  1 failed (1)
      Tests  1 failed | 13 passed (14)
```

## 2. Qué dice ahora, y por qué

La asimetría **ya no existe**: el usuario rediseñó las dos páginas en el commit `bdb11b0` (2026-08-07) y puso
el ovillo **también en register**, como celda de una rejilla de dos columnas junto al formulario. El gate hizo
su trabajo avisando; **se reescribe, no se borra ni se salta** (deuda 29).

El test nuevo fija la **realidad nueva** — el alta **sí** monta el ovillo, y lo monta como pieza **decorativa**
(fuera del árbol accesible). Es el espejo exacto del gate de login (`:81-88`), que sigue intacto:

```tsx
it("monta el ovillo ASCII, decorativo (revierte la decisión de #31, 2026-08-07)", () => {
  const { container } = render(<RegisterPage />);

  expect(screen.getByTestId("ascii-yarn")).toBeInTheDocument();
  const slot = container.querySelector('[data-slot="bg-3d"]');
  expect(slot).not.toBeNull();
  expect(slot).toHaveAttribute("aria-hidden", "true");
});
```

**La reversión queda escrita dentro del propio test**, en el nombre del caso (*"revierte la decisión de #31,
2026-08-07"*) y en un docstring largo encima que dice: qué decía antes textualmente, qué cambió y cuándo,
por qué se reescribe en vez de recortarse, y —explícito— *"la ficha de #31 en `feature_list.json` sigue
describiendo el criterio viejo; no 'arregles' esto al revés: quitar el ovillo de `register/page.tsx` es un
cambio de producto, y este test es quien tiene que caer para avisarlo"*.

### Dos límites honestos, escritos también en el docstring

1. **El `aria-hidden` que se mide es el del envoltorio de la página, no el del componente.** `AsciiYarn` está
   **doblado** en este archivo (`vi.mock("@/shared/ui/three")` devuelve un `span` pelado con el `data-testid`),
   así que este test **no puede** observar el `aria-hidden` que el componente real se pone solo. Que el real
   sea `aria-hidden` siempre por construcción es lectura de `AsciiYarn.tsx:59` —lo verifiqué leyéndolo, no
   ejecutándolo aquí— y lo cubren sus propios tests. **Es exactamente la misma limitación que ya tenía el
   gate de login**, que asierta sobre el mismo envoltorio.
2. **El `data-slot` por el que se agarra el envoltorio miente desde el rediseño** (deuda 117: ya no es una
   capa de fondo, es una celda de la rejilla). Lo uso igual porque **es la manija que existe hoy** y la misma
   por la que agarra login. **No lo renombré**: eso es el arreglo de la ficha 117, arrastra a los dos gates a
   la vez y está fuera de este encargo.

## 3. Condición doble (REGLA 3) — ejecutada en las dos direcciones

**Método:** copia byte a byte de `src/app/(auth)/register/page.tsx` al scratchpad **antes** de mutar, con suma
de control; mutación en sitio; restauración desde la copia; verificación por `md5sum` + `cmp` + `git diff`.

```
d9e0ad6248f94c4722b518b406e52e1e *src/app/(auth)/register/page.tsx
d9e0ad6248f94c4722b518b406e52e1e *…/scratchpad/register-page.orig.tsx
629 src/app/(auth)/register/page.tsx
```

Hice **tres** mutaciones, no una, para comprobar que **cada aserto tiene mordida por separado** (un gate con
tres asertos donde sólo uno puede fallar es un gate de un aserto).

### Mutación A — la reversión literal a #31: fuera el ovillo **y** su envoltorio

`register/page.tsx` reescrita sin el `import` de `AsciiYarn` y sin el bloque del envoltorio.

```
--- MUTACION A aplicada (ovillo + envoltorio fuera) ---
VITEST_EXIT=1

 ❯ src/app/(auth)/auth-pages.test.tsx (14 tests | 1 failed) 3176ms
     × monta el ovillo ASCII, decorativo (revierte la decisión de #31, 2026-08-07) 17ms

 FAIL  src/app/(auth)/auth-pages.test.tsx > página de register > monta el ovillo ASCII, decorativo (revierte la decisión de #31, 2026-08-07)
TestingLibraryElementError: Unable to find an element by: [data-testid="ascii-yarn"]
 ❯ src/app/(auth)/auth-pages.test.tsx:227:19

 Test Files  1 failed (1)
      Tests  1 failed | 13 passed (14)
```

### Mutación B — envoltorio presente, ovillo fuera

El envoltorio (con su `aria-hidden` y su `data-slot`) se queda **vacío**. Sirve para demostrar que el gate
**no se conforma con encontrar el hueco**: exige el ovillo dentro.

```
=== MUTACION B: envoltorio presente, ovillo fuera ===
VITEST_EXIT=1

 ❯ src/app/(auth)/auth-pages.test.tsx (14 tests | 1 failed) 3072ms
     × monta el ovillo ASCII, decorativo (revierte la decisión de #31, 2026-08-07) 12ms

TestingLibraryElementError: Unable to find an element by: [data-testid="ascii-yarn"]

 Test Files  1 failed (1)
      Tests  1 failed | 13 passed (14)
```

### Mutación C — ovillo presente, pero **deja de ser decorativo**

El envoltorio pierde su `aria-hidden`. Sirve para demostrar que la mitad "decorativa" del gate **también
muerde**, y no viaja de gorra detrás de la de presencia.

```
=== MUTACION C: ovillo presente, envoltorio SIN aria-hidden ===
VITEST_EXIT=1

 ❯ src/app/(auth)/auth-pages.test.tsx (14 tests | 1 failed) 3032ms
     × monta el ovillo ASCII, decorativo (revierte la decisión de #31, 2026-08-07) 10ms

Error: expect(element).toHaveAttribute("aria-hidden", "true") // element.getAttribute("aria-hidden") === "true"

Expected the element to have attribute:
  aria-hidden="true"
Received:

 Test Files  1 failed (1)
      Tests  1 failed | 13 passed (14)
```

**En las tres el rojo es UNO y es el mío.** Los otros 13 casos del archivo —los 10 de login y los otros 3 de
register, `axe` incluido— siguieron verdes en las tres mutaciones: la mutación no arrastró a nadie.

### Restauración, verificada

```
d9e0ad6248f94c4722b518b406e52e1e *src/app/(auth)/register/page.tsx
CMP_OK=identico
 M src/app/(auth)/auth-pages.test.tsx
--- git diff de register (vacio = restaurado) ---
(fin diff)
```

Mismo `md5` que antes de mutar, `cmp` sin diferencias y `git diff` de `register/page.tsx` **vacío**.

### Dirección verde, tras restaurar

```
=== RESTAURADO: direccion verde ===
VITEST_EXIT=0

 Test Files  1 passed (1)
      Tests  14 passed (14)
```

## 4. El bloque de login sigue verde, y el `axe` de register también

Corrida con reportero detallado, nombres tal cual:

```
VITEST_EXIT=0
 ✓ … > página de login > monta el formulario de acceso (smoke) 60ms
 ✓ … > página de login > monta el ovillo ASCII de fondo, decorativo y detrás del contenido 8ms
 ✓ … > página de login > no renderiza su propio main 6ms
 ✓ … > página de login > no esconde el formulario tras una frontera de Suspense con relleno nulo 1ms
 ✓ … > página de login > entrega al formulario el destino interno del proxy 609ms
 ✓ … > página de login > no deja pasar un ?next= hostil (absoluta) 575ms
 ✓ … > página de login > no deja pasar un ?next= hostil (protocol-relative) 557ms
 ✓ … > página de login > no deja pasar un ?next= hostil (protocol-relative con barra invertida) 565ms
 ✓ … > página de login > no deja pasar un ?next= hostil (repetida (llega como lista)) 562ms
 ✓ … > página de login > has no axe violations 88ms
 ✓ … > página de register > monta el formulario de alta (smoke) 7ms
 ✓ … > página de register > monta el ovillo ASCII, decorativo (revierte la decisión de #31, 2026-08-07) 5ms
 ✓ … > página de register > no renderiza su propio main 3ms
 ✓ … > página de register > has no axe violations 40ms
```

(El prefijo `src/app/(auth)/auth-pages.test.tsx > ` se abrevió con `…` para que quepa; el resto es literal.)

El gate de login que busca por `[data-slot="bg-3d"]` (`:81-88`) **no se tocó** y pasa. El `axe` de register
pasa: el envoltorio con `aria-hidden` deja el ovillo fuera del árbol accesible, y con el componente doblado
el `span` vacío no aporta violaciones.

## 5. Verificación completa

**`bash ./init.sh`, sin tubería** (redirigido a archivo y leído después, para que el código de salida sea el
del script y no el de `tail`):

```
INIT_EXIT=0

── 3. Validando feature_list.json ──────────────────────
[OK]    feature_list.json válido (33 features)

── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  69 passed | 3 skipped (72)
      Tests  1200 passed | 13 skipped (1213)
   Duration  86.90s (transform 8.13s, setup 67.80s, import 74.94s, tests 44.19s, environment 28.31s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**`1200 passed | 13 skipped` en 69 archivos**: exactamente el objetivo, y el mismo número con el que cerró #19.
El total de tests **no cambia** (1199 + 1 rojo = 1200): se reescribió un caso, no se añadió ninguno.

**`pnpm build`:**

```
BUILD_EXIT=0
$ next build
▲ Next.js 16.2.10 (Turbopack)
✓ Compiled successfully in 22.8s
  Running TypeScript ...
  Finished TypeScript in 16.8s ...
✓ Generating static pages using 3 workers (15/15) in 776ms
…
├ ƒ /login
└ ○ /register
```

## 6. Decisiones no obvias

1. **Tres mutaciones en vez de una.** El encargo pedía ver el gate caer al quitar el ovillo. Con un solo aserto
   con mordida y dos de adorno, el gate parecería más fuerte de lo que es. A y B separan *"está el hueco"* de
   *"está el ovillo"*; C separa *"está"* de *"es decorativo"*.
2. **No asierto unicidad del ovillo** (que haya exactamente uno). `register` monta uno solo y no vive dentro
   del caparazón en este test, así que un gate de cardinalidad no protegería nada real hoy; y el repo tiene
   una nota en `progress/current.md` sobre si un `getBy*` en singular cae o no con dos instancias que **no he
   medido**. No añado un aserto apoyado en una creencia sin comprobar.
3. **Mantengo `[data-slot="bg-3d"]` como manija** pese a la deuda 117. Cambiarlo sería tocar `register/page.tsx`
   (prohibido en este encargo) y desincronizar los dos gates hermanos. Queda escrito en el docstring que
   renombrarlo arrastra a los dos.
4. **Reverti `next-env.d.ts`.** `pnpm build` lo reescribió (cambia su `import` de la ruta de tipos de `dev` a
   la de build: la deuda 119 exacta). Lo dejé como estaba en `HEAD` con `git checkout -- next-env.d.ts` para
   no ensuciar el árbol con un efecto colateral mío. **`pnpm dev` lo volverá a cambiar**, eso no lo arreglo yo.
5. **No hice commit**, como se pidió.

**Árbol al terminar** (`git status --porcelain`):

```
 M feature_list.json      ← del leader, no mío
 M progress/current.md    ← del leader, no mío
 M progress/deudas.md     ← del leader, no mío
 M src/app/(auth)/auth-pages.test.tsx   ← lo único mío
```

## 7. Qué queda abierto (no lo toqué, a propósito)

- **Deuda 116:** el rojo está apagado y el gate fija la realidad nueva. Falta —si el leader no lo ha hecho ya
  al escribir la nota de #31— **tacharla en `progress/deudas.md`** explicando cómo se saldó.
- **Deuda 117** (el `data-slot` que ya no describe lo que hay debajo, en las **dos** páginas) y **deuda 118**
  (la rejilla de dos columnas sin variante responsive, con el ovillo sin montar por debajo del breakpoint de
  tablet): **siguen abiertas y sin tocar**. La 118 sigue **no medida en navegador**.

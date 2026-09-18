# explore — design system y contrato visual de las pantallas de auth (#31 `auth_ui`)

> **Nota de procedencia:** lo produjo un subagente `Explore` (solo lectura), que **no pudo escribir el
> archivo**. El leader lo volcó literalmente aquí. **Para futuros encargos: `Explore` no escribe; usar
> `general-purpose` o volcar el resultado desde el leader.**

**Higiene aplicada:** no se escribe ningún nombre de clase de Tailwind con comodines ni inventado. Gestor de
paquetes: **pnpm**, nunca npm.

---

## 1. Primitivos de formulario disponibles

### 1.1 `Field` — `src/shared/ui/primitives/field/Field.tsx`

- Es **client component** (`"use client"`, línea 1).
- API exacta (`FieldProps`, líneas 19-27): `label: ReactNode` (obligatorio), `hint?: ReactNode`,
  `error?: ReactNode`, `id?: string`, `className?: string`, `children: ReactElement<ControlProps>` — **un
  único elemento control**, no una lista.
- **Label:** no se declara con prop del input; `Field` siempre renderiza un `<label htmlFor={fieldId}>`
  (líneas 55-60). El `id` sale de `useId()` salvo que se pase `id` (líneas 37-38).
- **Estado de error:** se dispara pasando `error` no vacío (línea 41). Efectos:
  - `cloneElement` inyecta al control `id`, `aria-invalid={true}` y `aria-describedby={messageId}`
    (líneas 45-51). El id del mensaje es `` `${fieldId}-message` `` (línea 39).
  - El mensaje se pinta en un `<span id={messageId}>` con familia mono y tamaño xs, en color de peligro si
    hay error o de primer plano atenuado si es hint (líneas 62-72).
  - **El error tiene prioridad sobre el hint** (línea 42): con ambos presentes, el hint desaparece.
- **Asociación para lectores de pantalla:** label por `htmlFor`/`id`, mensaje por `aria-describedby`,
  invalidez por `aria-invalid`. Todo lo cablea `Field`; el consumidor no toca aria.

**Límites conocidos (relevantes para #31):**
- Sólo acepta **un** hijo; no compone varios `aria-describedby`.
- No hay prop `required` ni marca visual de obligatorio.
- **El span del mensaje no es región viva**: no tiene `role="alert"` ni `aria-live`. Un error que aparece
  **después** del submit no se anuncia salvo que se mueva el foco al campo. Si #31 quiere anuncio, tiene que
  envolverlo desde `features/auth/ui/` o mover el foco.
- No existen `Textarea`, `Select`, `Checkbox`, `Toggle` (el SDD §6 los lista como inventario objetivo,
  líneas 171-174; sólo `Input` está construido).

### 1.2 `Input` — `src/shared/ui/primitives/field/Input.tsx`

- `InputProps = InputHTMLAttributes<HTMLInputElement>` (línea 21); `forwardRef` (líneas 23-28); exporta
  también `inputClasses` (línea 8) por si hace falta reutilizar el skin.
- **Regla dura documentada en el propio archivo (líneas 5-7):** el estado de error **se dispara por
  `aria-invalid`, no por una clase manual**. Las reglas de error del skin son selectores de atributo sobre
  `aria-invalid` (líneas 16-17). Nunca pintar el error a mano; siempre vía `Field error=…`.
- Altura mínima por token de target táctil, foco visible por token de foco, estado disabled con superficie
  hundida (líneas 9-18).
- Barril: `field/index.ts` exporta `Field`, `FieldProps`, `Input`, `InputProps`, `inputClasses`; y
  `src/shared/ui/index.ts` reexporta todo → el import canónico es `@/shared/ui`.

### 1.3 `Button` — `src/shared/ui/primitives/button/Button.tsx` y `button.variants.ts`

- `ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariants` + **`loading?: boolean`**
  (líneas 7-11).
- **Estado de carga: SÍ existe** (líneas 14, 22-30): con `loading` el botón queda `disabled`
  (`disabled ?? loading`), expone `aria-busy="true"` y antepone un glifo giratorio `aria-hidden`. No cambia
  el texto: el label lo pone el llamador.
- **⚠️ Trampa para un formulario:** `type={type ?? "button"}` (línea 20). Para que el submit funcione hay que
  pasar **`type="submit"` explícitamente**.
- **Variantes** (`button.variants.ts`, líneas 37-51): `primary`, `secondary`, `danger`, `ghost`. Default
  `secondary` (líneas 57-60).
- **Tamaños** (líneas 52-55): sólo `md` e `icon`. **No hay tamaños pequeño/grande ni variante "ancho
  completo"**: un botón de submit a todo el ancho se consigue pasando la utilidad de ancho por `className`
  (se fusiona con `cn()`).
- `ghost` **hereda** el primer plano de la superficie (comentario líneas 41-48, deuda 17): sobre `Card`
  clara se lee bien.

### 1.4 `Card` — `src/shared/ui/primitives/card/card.variants.ts`

- Variantes `raised` (default: superficie elevada + sombra dura) y `flat` (líneas 19-28); borde grueso por
  token, radio md, padding de espacio 5, y **declara su primer plano** (líneas 15-16, deuda 32). Es el
  contenedor natural de la tarjeta de login/register sobre el fondo espresso.

### 1.5 Qué falta para un login/register completo

| Necesidad | Estado |
|---|---|
| Error **a nivel de campo** | Cubierto (`Field error`) |
| Error **a nivel de formulario** (401 credenciales, 409 email duplicado, 500) | **No existe primitivo.** No hay `Alert`, `Toast`, `ErrorState` ni carpeta `feedback/` (SDD §6 línea 185 los lista como pendientes). #31 tiene que construir el bloque de error del form **en `src/features/auth/ui/`**, no en `shared/ui` (regla de presentación pura, `conventions.md` 105-107). Recomendado: contenedor con `role="alert"` y colores por token de peligro |
| Estado de carga en el submit | Cubierto (`loading` + `aria-busy`) |
| Enlace "¿ya tenés cuenta?" | **No hay primitivo de enlace.** Usar `next/link` con utilidades por token |
| `PageHeader` / `Container` | No existen (SDD §6 línea 180 los lista como objetivo) |
| `Emphasis` | No existe todavía |

**Guardrails que afectan a los archivos nuevos:**
- `src/shared/ui/canonical-tailwind-classes.test.ts` **barre todo `src/**` por recorrido de directorios**
  (líneas 49-77): cualquier archivo nuevo de `(auth)` o `features/auth/ui` queda cubierto y debe usar la
  **forma corta con paréntesis** para tokens, no la larga con `var()` entre corchetes (tabla en
  `conventions.md` 73-78).
- `src/shared/ui/primitives/no-hardcode.test.ts` usa una **lista fija** (líneas 17-34) que sólo cubre
  `shared/ui`: los archivos de #31 no entran solos, pero la regla token-first sigue vigente por convención
  (`conventions.md` 65-68).
- **Deuda 31** (`deudas.md` 237-245): el anillo de foco da 3.13:1 sobre la superficie elevada (**pasa**) pero
  2.95:1 sobre superficie y 2.41:1 sobre la hundida (**no pasan**). Traducción práctica: **montar el form
  sobre `Card` con su variante por defecto (`raised`), no sobre `flat`.**

## 2. `src/app/(auth)/layout.tsx` — qué monta hoy

Archivo completo, 13 líneas. Renderiza **un único `<main>`** con: posición relativa, alto mínimo de viewport
dinámico, flex en columna centrado vertical y horizontalmente, fondo de app y padding de espacio 6 (línea 9).
El JSDoc (líneas 3-6) dice explícitamente "pantalla limpia, sin archivero (RFC-01 §2)" y que las páginas
quedaban fuera del alcance de #13.

**Diferencias con `(app)`** (`(app)/layout.tsx`, 7 líneas → delega en `AppShellClient`, que monta `AppShell`
con el ovillo como `background`, `AppShellClient.tsx:31`):

| | `(app)` | `(auth)` |
|---|---|---|
| Nav archivero / bottom-nav | Sí (`AppShell.tsx` 61, 65) | No |
| Slot de fondo 3D | Sí: `div` `aria-hidden`, `data-slot="bg-3d"`, fijo a todo el viewport, sin captura de eventos, en el token de z de fondo (`AppShell.tsx` 53-59) | **No existe** |
| `<main>` | Lo pone `AppShell` (línea 63) | Lo pone el layout (línea 9) |
| Fetch | Ninguno (gate de deuda 21) | Ninguno |

**Qué le falta:** no hay slot 3D, ni `metadata` propia, ni capa de textura, ni wordmark/logo. Como el layout
ya rinde `main`, **las páginas de login/register no deben renderizar otro `main`** (sería un segundo landmark
y `axe` lo marca). El `relative` del `main` ya está puesto, así que una capa decorativa posicionada dentro de
la página funciona sin tocar el layout.

⚠️ **Alcance del ovillo:** si se pusiera en el **layout**, aparecería también en register, lo que
**contradice el RFC**. Por eso el fondo 3D va montado **en la página de login**, no en el layout.

## 3. RFC-01 §2 y §3 — contrato de las pantallas de auth

- **§2, línea 21 (textual):** "**Auth = pantalla limpia, sin archivero**; ovillo ASCII de fondo **solo en
  login** (no en register)."
  → **El "sólo en login" SÍ está justificado en el RFC**, no es una invención del `feature_list.json`. Por la
  jerarquía de `RFC-00-proceso.md` §2 (45-52), **el RFC manda**. `feature_list.json` 464-471 coincide: no hay
  conflicto.
- **§3, línea 161 (route groups):** "`(app)/**` privado, envuelto por `AppShell`; `(auth)/**` público
  (login/register), pantalla limpia sin nav. Protegidos por `src/proxy.ts` (ya existe)."
- **§3, línea 188:** `src/app/(auth)/layout.tsx` = "limpio".
- **Decisiones que afectan al ovillo en login:** **D1** (55: componente React, no custom element),
  **D2-bis** (57: `three` puro, sin `AsciiEffect` ni `drei`), **D3** (58: con `prefers-reduced-motion` se
  apaga la auto-rotación pero el arrastre sigue). El JSDoc de `AsciiYarn` (22-24) cita "fondo del login" como
  uso previsto **decorativo**.
- **Enmienda E7(b)** (137): los utils (usuario + logout) **salieron del `ArchiveNav`** hasta #31, porque se
  ofrecía "Salir" sin sesión abierta. Vuelven cuando exista la pantalla de auth que los justifica → **es #31
  quien decide dónde vive el menú de cuenta**.
- **E1…E6, E8, E9, E10** son todas del `ArchiveNav` y **no tocan** las pantallas de auth.
- **§4, línea 166:** el shell consume `GET /api/auth/me` y `POST /api/auth/logout`, sin otros datos.
  **§5, 171:** el ovillo es también el loader global. **§6, 176-177:** foco visible por token y
  `prefers-reduced-motion` respetado.
- **Deuda 29** (`deudas.md` 220-228) y el JSDoc de `AppShellClient.tsx` (11-28): #31 debe **volver a
  cablear** `user` y `onLogout` (props reservadas en `AppShell.tsx` 21-29) y, para eso, **reescribir el gate
  de test vigente**, que hoy asierta lo contrario. **Deuda 30** (229-236): decidir en #31 si `AppShellClient`
  conserva `"use client"`.

## 4. SDD-01 §9 — checklist de verificación (criterio de aceptación de #31)

`docs/design/SDD-01-design-system.md` 259-271, punto por punto:

1. **Test de componente / interacción** con **React Testing Library + `user-event`** sobre entorno DOM
   (**`happy-dom`**). Se prueba **comportamiento y accesibilidad** (roles, foco, estados, callbacks), **no
   píxeles**.
2. **Smoke de render:** cada componente monta sin explotar.
3. **Assertions de a11y con `axe`** en los primitivos.
4. **Typecheck + lint + build verdes** como puerta (aquí: `bash ./init.sh` + `pnpm build`, RFC-01 195-196).
5. **Fidelidad visual = revisión manual** contra el mockup de referencia (regresión visual automatizada es
   opcional a futuro).
6. Nota de cierre (270-271): no se testea "que se vea lindo"; **sí** se testea comportamiento, a11y y que
   **cero valores estén hardcodeados**.

El acceptance de `feature_list.json` línea 470 lo instancia: "RTL (login OK/inválido, register OK/duplicado,
redirect) + axe + smoke + init.sh + build".

## 5. `<AsciiYarn />` — API y cómo ponerlo de fondo fuera del AppShell

`src/shared/ui/three/ascii-yarn/AsciiYarn.tsx`:

- **Props** (`AsciiYarnProps`, 19-34): `interactive?: boolean` (default `false`), `glow?: boolean` (default
  `false`), `cols?: number`, `rows?: number`, `className?: string`. Tamaño y posición **los decide el
  consumidor**; el host llena su contenedor (62-67).
- **Siempre `aria-hidden="true"`** (59) y marcado con `data-slot="ascii-yarn"` / `data-interactive` (60-61).
  Con `interactive=false` no captura eventos (64).
- Color: sale de `currentColor`; el host fija el color de acento (63) y el `<pre>` lo hereda (JSDoc 42-44).
- Es **`"use client"`** y hace el `dynamic(..., { ssr: false, loading: () => null })` **dentro del módulo**
  (1-17) precisamente para que **un Server Component pueda importarlo sin romper el build**. → La página de
  login **puede** montarlo directamente aunque sea Server Component; no hace falta un wrapper cliente sólo
  por el ovillo.
- `useViewportSupports3d()` (55, 69-71 + `useViewportSupports3d.ts` 43-50): **por debajo del breakpoint de
  tablet la escena no se monta** y three.js ni se descarga. En SSR devuelve `false` (39-41). Consecuencia
  para login: **en mobile el fondo simplemente no aparece** — comportamiento esperado, no bug.

**Patrón de inyección de `AppShellClient` y su reutilización en `(auth)`:**
- `AppShellClient.tsx:31` sólo pasa el ovillo como `background`; **el posicionamiento no está en `AsciiYarn`
  sino en `AppShell`**: el slot es un `div` con `aria-hidden`, `data-slot="bg-3d"`, sin captura de eventos,
  fijo a todo el viewport y con el token de z de fondo (`AppShell.tsx` 53-59); el contenido va encima con el
  token de z base (63).
- **El patrón NO es reutilizable tal cual** en `(auth)`: `AppShell` no se puede usar (traería el archivero,
  prohibido por RFC-01 §2). Lo reutilizable es **la receta del slot**: en la página de login, un contenedor
  decorativo con `aria-hidden`, sin captura de eventos, posicionado detrás y con el token de z de fondo
  (`--z-bg-3d`, `globals.css:214`; el base en la 215), y la tarjeta del formulario por encima con el z base.
  El `main` de `(auth)` ya es `relative`, así que también sirve un posicionamiento absoluto dentro de él.
- Aislamiento: la regla "sólo `shared/ui/three/**` importa `three`" (`conventions.md` 117-122) se respeta
  importando `AsciiYarn` desde `@/shared/ui`.

## 6. Convenciones de tests de UI

**Entorno y arranque**
- `vitest.config.ts`: `include: ["src/**/*.{test,spec}.{ts,tsx}"]`, `environment: "node"` por defecto —
  **cada test de UI declara el pragma de entorno happy-dom en la primera línea**; alias `@` → `./src`.
- `vitest.setup.ts`: registra los matchers de `vitest-axe` y `@testing-library/jest-dom/vitest`. El
  **runner** `axe` se importa aparte en cada test de UI, porque necesita DOM.
- Tipos del matcher: `src/shared/ui/testing/vitest-axe.d.ts`.
- Comando: **`pnpm test`** (`verification.md` 25).

**Plantilla recomendada para los formularios: `src/shared/ui/primitives/field/Field.test.tsx`** — el ejemplo
más cercano a lo que #31 necesita:
- Línea 1: pragma de entorno; 2-8: imports de RTL + `user-event` + `axe`; 10: `afterEach(cleanup)`.
- Consulta por etiqueta (`getByLabelText`, 20, 29, 63) en vez de por test-id.
- Escritura real con `userEvent.setup()` + `user.type` (26-36).
- Aserción de la asociación aria: se lee `aria-describedby` del input y se comprueba que el `id` del mensaje
  coincide (43-53 y 63-69).
- `axe` sobre estados válido y de error juntos (83-96).

**Plantilla para la costura con fetch/router: `src/features/auth/ui/AppShellClient.test.tsx`**
- `vi.mock("next/navigation", …)` con `usePathname` y `useRouter` (9-12) → el mismo patrón sirve para
  `useRouter().push` tras el login y, añadiendo `useSearchParams`, para leer el `?next=`.
- `vi.stubGlobal("fetch", fetchSpy)` en `beforeEach` y `vi.unstubAllGlobals()` en `afterEach` (43-54).
- `vi.mock("@/shared/ui", …)` para doblar el design system y **no montar el 3D** en un test de costura
  (25-41).
- **Gates que #31 debe reescribir** (deuda 29): "fires no HTTP request at all when mounted" (87-99) y
  "hands over neither user nor logout until feature #31 wires them" (101-114).
- Mockeo de `three` en el borde: `ascii-yarn.test.tsx` 1-60 (happy-dom no tiene WebGL).
- `Button.test.tsx` 57-63 muestra cómo asertar el estado de carga (`toBeDisabled` + `aria-busy`).

**Regla de higiene en tests** (`conventions.md` 98-104): **nunca escribir una clase de Tailwind literal** en
tests, guardrails, comentarios o informes — Tailwind escanea también los archivos de test y una clase
inválida rompe el build. En tests, armar las muestras por concatenación en runtime.

## 7. Riesgos y decisiones abiertas que hereda el implementer

1. **`Button` por defecto es `type="button"`** → pasar `type="submit"` o el form no envía con Enter.
2. **No hay componente de error de formulario**: construirlo en `features/auth/ui/` con región anunciable;
   `Field` no anuncia errores tardíos.
3. **Un solo `<main>`**: ya lo pone el layout de `(auth)`.
4. **El ovillo va en la página de login, no en el layout** (si va en el layout, aparece en register y viola
   RFC-01 §2 línea 21).
5. **Reescribir los gates de `AppShellClient.test.tsx`** si se cablean `user`/`onLogout` (deuda 29); decidir
   el destino del `"use client"` (deuda 30).
6. **Montar el formulario sobre la variante elevada de `Card`**, donde el anillo de foco cumple el mínimo de
   contraste (deuda 31).
7. Sintaxis canónica de tokens en Tailwind v4 obligatoria: el barrido de `canonical-tailwind-classes.test.ts`
   cubre automáticamente los archivos nuevos.

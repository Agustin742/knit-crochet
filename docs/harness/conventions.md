# Convenciones de código

> Homogeneidad extrema. La IA predice mejor cuando el repositorio se parece
> a sí mismo en todas partes.

## Idioma (regla del PRD §4)

- **El código está en inglés:** nombres de tablas, clases, atributos, enums,
  rutas de API y archivos.
- **La UI y la prosa van en español.**

## TypeScript / React

- **TypeScript estricto:** `strict: true`. Prohibido `any` salvo justificación
  documentada. Prefiere `unknown` + narrowing.
- **Server vs Client:** por defecto Server Component. `"use client"` solo cuando
  necesites estado/efectos/eventos del navegador.
- **Imports:** externos primero, luego internos con alias (`@/...`). Cada feature
  expone su API pública desde un `index.ts`; consume otros features por su
  `index.ts`, no por rutas internas.
  - **Excepción obligatoria — la capa de schema:** un `features/<x>/schema.ts`
    importa las tablas de otro feature **por su `schema.ts` directo**
    (`@/features/yarns/schema`), **nunca** por el `index.ts`. El barrel arrastra
    `./api` y crea un ciclo `schema → index → api → store → schema`. Ver
    `architecture.md` §"Capa de schema".
- **Strings:** comillas dobles `"..."`. Template literals para interpolación.
- **Async:** `async/await`, nada de cadenas de `.then()`.

## Nombres

| Tipo                        | Convención        | Ejemplo                  |
|-----------------------------|-------------------|--------------------------|
| Componentes / archivo       | `PascalCase.tsx`  | `ProjectCard.tsx`        |
| Hooks                       | `useCamelCase`    | `useAuth`                |
| Funciones / variables       | `camelCase`       | `getProjectById`         |
| Tipos / interfaces / enums  | `PascalCase`      | `Project`, `CraftType`   |
| Constantes                  | `UPPER_SNAKE`     | `JWT_COOKIE_NAME`        |
| Route Handlers              | `route.ts`        | `app/api/projects/route.ts` |
| Tablas / columnas Drizzle   | `snake_case`      | `used_quantity`          |
| Features (carpeta)          | `kebab-case`      | `time-tracking`          |
| Variantes `cva` (archivo)   | `<name>.variants.ts` | `button.variants.ts`  |
| Tokens CSS                  | `--kebab-case`    | `--font-emphasis`, `--z-bg-3d` |
| Componente (carpeta)        | `kebab-case/`     | `primitives/button/`     |

## Dónde va cada cosa (feature-first)

- Schema Drizzle de la entidad → `features/<x>/schema.ts`.
- Lógica / servicios → `features/<x>/api/`.
- Validación de entrada → `features/<x>/validation.ts` (zod), un esquema por endpoint.
- Estado de cliente → `features/<x>/store.ts` (zustand).
- Utilidades compartidas (jwt, hashing, cloudinary, fetch) → `shared/lib`.
- Enums y constantes (`CraftType`, `ColorFamily`, comparativas) → `shared/config`.
- Cliente Drizzle + conexión Neon → `shared/db`.
- **UI (fase 12+):** design system **portable** (primitivos, layout, feedback, form,
  motifs, three, `lib/cn.ts`) → `shared/ui/`; UI y estado de una feature →
  `features/<x>/ui/`; página (fina: rutea + compone) → `app/**`. Ver SDD-01 §4 y
  [RFC-00](../design/rfc/RFC-00-proceso.md).

## UI / Design system (fase 12+)

> Detalle completo en `docs/design/SDD-01-design-system.md` y los RFC. Acá, las
> reglas duras que aplican a **todo** componente. Fuente de verdad de proceso:
> [RFC-00](../design/rfc/RFC-00-proceso.md).

- **Token-first (regla dura).** Ningún componente hardcodea color, tamaño, borde,
  radio, sombra ni z-index: **todo referencia un token**. Los tokens se declaran una
  vez (`@theme` en `src/app/globals.css`, nombres del SDD §5) y se consumen vía
  Tailwind. Cambiar la identidad = cambiar tokens, no componentes.
- **Sintaxis canónica de variables en Tailwind v4 (regla dura).** Para consumir un
  token dentro de una utilidad se usa la **forma corta con paréntesis**, no la larga
  con `var()` entre corchetes:

  | ❌ No canónico | ✅ Canónico |
  |---|---|
  | `p-[var(--space-6)]` | `p-(--space-6)` |
  | `border-[length:var(--border-width)]` | `border-(length:--border-width)` |
  | `outline-[color:var(--focus)]` | `outline-(color:--focus)` |
  | `[z-index:var(--z-nav)]` | `z-(--z-nav)` |

  Motivo: son **el mismo CSS**, pero la forma larga dispara el warning
  `suggestCanonicalClasses` de Tailwind IntelliSense en cada archivo y genera ruido
  permanente en el editor. Además evita la incoherencia de escribir la misma
  intención de dos maneras (`z-[var(--z-base)]` junto a `[z-index:var(--z-bg-3d)]`).

  **Excepciones legítimas** (no son convertibles, dejalas como están): valores
  **compuestos** (`shadow-[var(--a)_var(--a)_0_var(--b)]`), cualquier cosa envuelta en
  **`calc()`** (`mb-[calc(-1*var(--border-width))]`), y las propiedades arbitrarias
  para las que **no existe utilidad** en el core de Tailwind.

  **Criterio de corrección al convertir:** el CSS generado tiene que ser
  **equivalente**. No basta con que compile y con que los tests pasen: comprobalo
  contra la salida real (ver `src/app/globals-css.test.ts` para la técnica de
  compilar el CSS y asertar sobre él).

  Vigilado por `src/shared/ui/canonical-tailwind-classes.test.ts`, que barre todo
  `src/**` por recorrido de directorios (no por lista fija), así que un archivo nuevo
  queda cubierto solo.
- **Nunca escribas una clase de Tailwind literal en un archivo que hable de clases**
  (tests de convenciones, guardrails, informes, comentarios). **Tailwind escanea
  también los `.test.ts`**: una clase citada como ejemplo se convierte en una utilidad
  real en el CSS de producción, y una clase con comodines o inválida **rompe el build
  entero**. Ya pasó dos veces. En tests, armá las muestras por concatenación en
  runtime; en prosa, describí la utilidad en palabras. Detalle:
  `progress/informs/6.informe-bugfix-tailwind_source_guardrail.md`.
- **Presentación pura.** El design system (`shared/ui/`) es **solo presentación**:
  props + estado local de UI. **No** hace fetch, **no** decide rutas, **no** conoce
  el backend. Quien lo consume (`features/<x>/ui/`, páginas) le pasa datos y callbacks.
- **`cn()` obligatorio.** Todo componente que acepte `className` lo fusiona con
  `cn(...)` = `twMerge(clsx(...))` (`shared/ui/lib/cn.ts`) para permitir override sin
  choques de clases.
- **Variantes con `cva`.** `variant`/`size` tipadas en un archivo `<name>.variants.ts`
  aparte del componente; nada de concatenar strings de clases a mano.
- **Énfasis por tipografía.** Resaltar = **cambiar familia** (`--font-emphasis`,
  componente `Emphasis`), no solo peso/color.
- **Fuentes** self-hosted con `next/font` (`display`, `body`, `mono`, `emphasis`).
  Sin `@import` ni requests a fuentes externas.
- **Capa 3D aislada.** Solo `shared/ui/three/**` importa `three` (three **puro**: R3F
  y `drei` se desinstalaron, ver RFC-01 §3 **D2-bis**), siempre client-only
  (`dynamic`, `ssr:false`). Vive detrás del contenido (`--z-bg-3d`),
  `pointer-events:none` salvo escena interactiva explícita. Con
  `prefers-reduced-motion` **no se arranca el `requestAnimationFrame`**: se dibuja un
  solo frame y el arrastre redibuja a demanda (**D3**). Nunca bloquea el primer render.
- **Nada del template importa de una app**: ni de `features/`, ni de una capa de
  datos, ni del backend. Es portable por contrato (SDD §2).

## Accesibilidad (baseline no negociable, parte de "done")

- HTML semántico + roles/aria correctos (`Dialog`, `Tabs`, `Toast`, `Tooltip`,
  `aria-current` en el nav activo, `aria-pressed` en toggles, `aria-live` en
  resultados/cronómetro).
- **Foco visible** en todo interactivo (token `--focus`); navegación por teclado
  completa (incl. reordenar sin ratón donde haya drag).
- `prefers-reduced-motion` respetado por animación 2D **y** por la capa 3D.
- Targets táctiles ≥ **44×44 px** (token `--touch-target`).

## Manejo de errores

- Errores de dominio nombrados (p. ej. `class AuthError extends Error`) en la
  capa del feature o en `shared/lib`.
- Los Route Handlers capturan, loguean del lado servidor y responden con el
  status HTTP correcto + JSON `{ error: string }`. Nunca propagan stack traces.
- Códigos usados en el PRD: `401` (no auth), `404` (no existe), `409` (borrado
  de lana referenciada; requiere `?force=true`).

## Validación

- **Zod** en cada endpoint. Valida `body`, `params` y `query` antes de la lógica.

## Comentarios

Por defecto **no** se escriben. Solo cuando explican un *por qué* no obvio
(workaround documentado, invariante sutil). Los nombres hacen el resto.

## Tests

- Un test por servicio/endpoint con lógica no trivial: camino feliz + al menos
  un camino de error.
- Colócalos junto al feature (`features/<x>/**/*.test.ts`) o en `__tests__/`,
  de forma consistente en todo el repo.
- Nada de mocks de DB/fs donde puedas usar un doble real acotado (DB de test).
- **UI (fase 12+), definición de "done" del SDD §9:** test de comportamiento y
  accesibilidad con **React Testing Library + `user-event`** sobre `happy-dom`
  (roles, foco, estados, callbacks — **no** píxeles) + smoke de render + `axe` en
  los primitivos. Se verifica además que **cero valores estén hardcodeados** (todo
  por token). La **fidelidad visual** contra el mockup es **revisión humana**, no
  test automático.

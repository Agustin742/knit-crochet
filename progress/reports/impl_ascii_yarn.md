# impl — feature #14 `ascii_yarn`

> Implementer. Fecha: 2026-07-25. Estado: **implementada, verde, pendiente de review**
> (la feature sigue en `in_progress`, ver §7).

---

## 1. Qué se construyó y dónde

### Dependencias (pnpm, nunca npm)

```bash
pnpm add three@0.185.1 @react-three/fiber @react-three/drei
pnpm add -D @types/three@0.185.1
```

Resultado real: `three 0.185.1`, `@react-three/fiber 9.6.1`, `@react-three/drei 10.7.7`
(+ `@types/three 0.185.1` en dev). `next.config.ts` **no se tocó** (no hace falta
`transpilePackages`: `three` publica ESM ya compilado).

### Archivos nuevos

| Archivo | Qué es |
|---|---|
| `src/shared/ui/three/index.ts` | Barrel de la capa 3D. |
| `src/shared/ui/three/ascii-yarn/index.ts` | Barrel local: `AsciiYarn` + `AsciiYarnProps`. |
| `src/shared/ui/three/ascii-yarn/AsciiYarn.tsx` | Barrera pública `"use client"`: `dynamic(ssr:false)` + host con las reglas duras del ASCII + gate de mobile. |
| `src/shared/ui/three/ascii-yarn/AsciiYarnScene.tsx` | Escena R3F (export **default**, es lo que carga el `dynamic`): `<Canvas>` + luces + `<OrbitControls>` + `<AsciiRenderer>`. |
| `src/shared/ui/three/ascii-yarn/YarnMesh.tsx` | Geometría declarativa: ovillo + agujas. |
| `src/shared/ui/three/ascii-yarn/usePrefersReducedMotion.ts` | Suscripción a `matchMedia("(prefers-reduced-motion: reduce)")`. |
| `src/shared/ui/three/ascii-yarn/useViewportSupports3d.ts` | Gate de degradación mobile leyendo el token `--bp-tablet`. |
| `src/shared/ui/three/ascii-yarn/ascii-yarn.test.tsx` | 9 tests (smoke, pointer-events, reduced-motion, degradación, token de color). |

### Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/shared/ui/index.ts` | `export * from "./three";` |
| `src/shared/ui/layout/app-shell/AppShell.tsx` | Nueva prop opcional `background?: ReactNode`, renderizada **dentro** del `<div data-slot="bg-3d">`. Sigue sin importar `three` y sin hardcode. |
| `src/features/auth/ui/AppShellClient.tsx` | Importa `AsciiYarn` de `@/shared/ui` y lo pasa como `background={<AsciiYarn />}`. |
| `src/shared/ui/primitives/no-hardcode.test.ts` | + 4 rutas nuevas (`AsciiYarn.tsx`, `AsciiYarnScene.tsx`, `YarnMesh.tsx`, `useViewportSupports3d.ts`). |
| `src/shared/ui/layout/layout.test.tsx` | + test: el `background` inyectado se renderiza dentro del slot `bg-3d`. |
| `package.json` / `pnpm-lock.yaml` | Dependencias nuevas. |

---

## 2. Verificación empírica de D2 (obligatoria antes de construir)

`context7` no está disponible → se inspeccionaron los artefactos reales instalados.

**`AsciiRenderer` existe y funciona con el pipeline de R3F.** `node_modules/@react-three/drei/core/AsciiRenderer.d.ts`:

```ts
export type AsciiRendererProps = {
  renderIndex?: number; bgColor?: string; fgColor?: string;
  characters?: string; invert?: boolean; color?: boolean; resolution?: number;
};
```

**No hubo desvío: se usó el plan A (D2 tal cual).** Hallazgos de la fuente
(`drei/core/AsciiRenderer.js`) que condicionaron el diseño:

1. Envuelve el `AsciiEffect` de **`three-stdlib@2.36.1`** (no de `three/addons`). Relevante
   para saber *qué* mockear en tests si algún día se mockea el effect directamente.
2. Pone `gl.domElement.style.opacity = '0'` y **monta el nodo ASCII encima con
   `pointerEvents: 'none'`** → el arrastre lo sigue recibiendo el canvas de WebGL. Por eso
   `<OrbitControls>` funciona sin pasarle `domElement`.
3. `fgColor`/`bgColor` se asignan como **CSS strings inline**
   (`effect.domElement.style.color = fgColor`) → se puede pasar `"var(--accent)"` y el color
   sale del token. **Es la vía token-first de esta feature.**
4. `AsciiEffect` fija `font-family: "courier new, monospace"` **inline** en su `<table>` →
   la única forma de imponer `--font-mono` es `!important` (ver §4).

**Verificación de `<OrbitControls>` (`drei/core/OrbitControls.js`):** su `useFrame` hace
`if (controls.enabled) controls.update()`. Consecuencia de diseño: **no** se puede usar
`enabled={false}` para el modo decorativo, porque eso también apagaría la auto-rotación.
El gate de interacción se hace con `pointer-events` (§4), no con `enabled`.

---

## 3. Decisiones tomadas

### Geometría (no había mockup; RFC-01 §7 dice que el afinado fino se pule aparte)

`YarnMesh.tsx`: esfera (r 1.35) + **6 toros** en rotaciones distintas simulando las vueltas de
hilo + **2 agujas** (cilindros de 5.1 con casquete esférico) cruzadas atravesando el ovillo.
Todo `meshStandardMaterial color="white"` — `AsciiEffect` mapea **brillo → densidad de
carácter**, así que lo que da contraste es la iluminación, no el color del material. Luces:
`ambientLight 0.35` (baja, para no aplanar) + `directionalLight` frontal fuerte (3.2) +
`pointLight` de contra (2.4). Alto contraste = ASCII legible (SDD §7.1).

### Rampa y fondo — el detalle no obvio

Rampa `" .:-=+*o%@"` con `invert`. **Por qué `<color attach="background" args={["black"]} />`
es obligatorio:** con canvas transparente, `AsciiEffect` fuerza `fBrightness = 1` en los
píxeles con `alpha == 0`; combinado con `invert` eso pinta el fondo entero de `@`. Con fondo
**negro opaco**, los píxeles de fondo caen en el espacio de la rampa y quedan invisibles. El
`<div>` del efecto lleva `bgColor="transparent"`, así que se ve el espresso de la app detrás.

`resolution: 0.14` (celda grande a propósito): ASCII legible, "motivo intencional y no muro de
ruido" (SDD §7.1), y menos píxeles por frame en el bucle de asciificación, que es **JS puro por
frame**. `dpr={[1, 1.5]}` acota el pixel ratio (SDD §7). Cámara a 9.5 con fov 42 para que las
agujas quepan mientras el conjunto rota.

### API de modos (mínima, cubre los tres consumidores)

```ts
interface AsciiYarnProps { interactive?: boolean; className?: string }
```

- `interactive` (default `false`) → host en `pointer-events-none` y `aria-hidden`. Cubre
  **fondo del shell**, **fondo del login (#31)** y **loader**.
- `interactive` → `pointer-events-auto`: cubre el **hero del Dashboard (#19)**.
- `className` (fusionado con `cn()`) resuelve tamaño/posición: un loader es el mismo componente
  en una caja chica. **No se creó `YarnLoader`** (fuera del alcance de esta slice).
- **`aria-hidden` siempre**, incluso interactivo: el ASCII no comunica información y el canvas no
  es focusable, así que no hay violación de axe. Documentado en el docblock: *un loader debe
  poner su propio `role="status"` con texto alrededor*.

**Doble gate de pointer-events (no es redundancia).** R3F escribe `pointerEvents: 'auto'`
**inline** en su contenedor, y en CSS un descendiente con `auto` reactiva los eventos aunque el
padre esté en `none`. Por eso además del `pointer-events-none` del host, la escena pasa
`style={{ pointerEvents: interactive ? "auto" : "none" }}` al `<Canvas>` para pisar ese inline.

### `prefers-reduced-motion` (D3)

`usePrefersReducedMotion` → `autoRotate={!prefersReducedMotion}` en `<OrbitControls>`. Los
controles quedan **siempre `enabled`**, así que el arrastre sigue disponible: exactamente D3
(se apaga el movimiento no solicitado, se preserva el que la persona pide).

Ambos hooks usan **`useSyncExternalStore`**, no `useState` + `useEffect`. No fue una preferencia
estética: el lint del repo (`react-hooks/set-state-in-effect`, de `eslint-config-next`)
**rechaza** el `setState` síncrono dentro del efecto. `useSyncExternalStore` es la API correcta
para suscribirse a `matchMedia` y además da `getServerSnapshot` (`false`) sin riesgo de
divergencia en hidratación.

### Degradación en mobile — criterio

De las tres opciones del SDD §7 ("menos densidad, fondo estático, o **se omite**") se eligió
**omitir**, porque es la única que evita descargar y ejecutar three.js (~130 KB gzip + un bucle
de asciificación en JS) en el dispositivo más débil, y porque tablet/desktop son los primarios.

Se resolvió con `matchMedia` **leyendo el token**, no con variantes Tailwind: `tablet:` sólo
oculta visualmente (la escena seguiría montada y consumiendo CPU). `useViewportSupports3d` hace
`getComputedStyle(document.documentElement).getPropertyValue("--bp-tablet")` y compone
`(min-width: <token>)`; las media queries no resuelven `var()`, así que ésta es la forma
token-first. **Falla abierto**: si el token no se puede leer (primer render, entorno de test sin
hoja de estilos) se monta igual.

### Montaje diferido

`AsciiYarn.tsx` declara su propio `"use client"` y ahí vive el `dynamic(..., { ssr: false })`
(en Next 16 sigue prohibido en Server Components). `loading: () => null` — es decorativo, no
debe reservar espacio ni provocar layout shift.

### Slot del AppShell

Se siguió el camino recomendado: prop `background?: ReactNode` en `AppShellProps`, renderizada
dentro del `<div data-slot="bg-3d">` (que ya era `fixed inset-0 pointer-events-none
[z-index:var(--z-bg-3d)]` y `aria-hidden`). `AppShell` **no importa `three`**: sigue siendo
presentación pura y sigue pasando su propio test de no-hardcode. Quien conoce `three` es
`AppShellClient` (feature layer, ya cliente).

---

## 4. Cero hardcode

- Color del ASCII: `fgColor="var(--accent)"` (drei lo asigna como CSS inline, el browser lo
  resuelve). Fondo del nodo ASCII: `"transparent"`. Materiales/fondo de escena: keywords
  (`"white"`, `"black"`), no hex.
- Tamaños de escena: números **sin unidad** (unidades de mundo 3D, no px).
- Breakpoint: token `--bp-tablet` leído en runtime.
- Reglas duras del ASCII (SDD §7.1) en el host: `font-mono leading-ascii whitespace-pre`.
- Override de la fuente que `AsciiEffect` inyecta inline: `[&_table]:font-mono!`. El
  `!important` es inevitable (nada gana a un estilo inline). **Verificado en el CSS compilado**:
  ```css
  .leading-ascii{--tw-leading:var(--leading-ascii);line-height:var(--leading-ascii)}
  .\[\&_table\]\:font-mono\! table{font-family:var(--font-mono)!important}
  ```
- Los 4 archivos fuente nuevos se añadieron a `no-hardcode.test.ts` y pasan.

---

## 5. Tests

`src/shared/ui/three/ascii-yarn/ascii-yarn.test.tsx` (9 tests, `happy-dom`).

**Estrategia de mocks — se mockea en el borde, no el componente propio.** happy-dom no tiene
WebGL *ni contexto 2D* (`canvas.getContext('2d')` → `null`), así que el `AsciiEffect` real
revienta. Se mockean **sólo las dos librerías** (`@react-three/fiber` → `Canvas` que renderiza
sus children en un `<div>`; `@react-three/drei` → `OrbitControls` y `AsciiRenderer` que exponen
sus props como `data-*`). `YarnMesh` y los elementos intrínsecos de three (`<mesh>`,
`<sphereGeometry>`…) se renderizan **de verdad** como elementos desconocidos del DOM: React no
emite ni un warning y así el smoke sigue ejercitando el árbol real.

**`matchMedia` no se stubea**: se usa el motor real de happy-dom vía
`window.happyDOM.settings.device.prefersReducedMotion`.

Cobertura:

1. Host montado con `aria-hidden` + `font-mono`/`leading-ascii`/`whitespace-pre`.
2. La escena diferida llega a montarse detrás del host (Canvas + controls + renderer).
3. Decorativo por defecto / hero interactivo: clase del host **y** `pointerEvents` del Canvas.
4. `className` fusionado con `cn()`.
5. Degradación mobile: con `--bp-tablet` inalcanzable, la escena **no** se monta.
6. Sin preferencia → `autoRotate=true`.
7. `reduce` → `autoRotate=false` **y** controles `enabled` **y** canvas con puntero (D3 completo).
8. Reacción en caliente al cambio de la media query.
9. El color del ASCII es `var(--accent)` y la rampa no está vacía.

También en `layout.test.tsx`: el `background` inyectado se renderiza dentro de `bg-3d`.

**No se testean píxeles ni fidelidad visual** (SDD §9). La calidad del ovillo es revisión humana.

---

## 6. Verificación ejecutada (salidas reales)

`bash ./init.sh`:

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
 RUN  v4.1.10 C:/_dev/projects/knit-crochet
 Test Files  37 passed | 1 skipped (38)
      Tests  356 passed | 6 skipped (362)
   Duration  43.16s

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

(Antes de esta feature el baseline era 355 passed / 6 skipped tras la instalación; el arranque
de sesión estaba en 338+6. El total actual incluye los 9 tests nuevos de `ascii-yarn` y el de
`layout`.)

`pnpm build`:

```
✓ Compiled successfully in 12.0s
  Running TypeScript ...
  Finished TypeScript in 13.1s ...
✓ Generating static pages using 3 workers (12/12) in 415ms
```

**Evidencia de que `three` no entra al bundle inicial** (esto es lo que el build tenía que
demostrar). El chunk que contiene `WebGLRenderer` está aislado y **no aparece en ningún
manifiesto ni en el HTML prerenderizado**:

```
$ ls -S .next/static/chunks/*.js | head -2   (bytes, chunk, nº de 'WebGLRenderer')
    903401  .next/static/chunks/0sy0x-848djo5.js  three=6
    227537  .next/static/chunks/12-cr3b-kssav.js  three=0

$ grep -rl "0sy0x-848djo5" .next/*.json .next/server/*.json .next/server/app/*.html
(sin resultados)
```

---

## 7. Estado de la feature y desvíos

- **`feature_list.json` #14 sigue en `in_progress`.** El leader pidió marcarla `done` al quedar
  verde, pero el protocolo del implementer (`.claude/agents/implementer.md`, regla dura) dice
  explícitamente *"No marques `done` tú mismo. Llama a un reviewer y espera su veredicto"*, y no
  tengo herramienta para lanzar el reviewer. **Lo dejo en manos del leader**: en cuanto el
  reviewer apruebe, el cambio es una línea. No lo marqué en silencio en ninguna de las dos
  direcciones.
- **Sin desvíos respecto de D1, D2 ni D3.** D1: componente React, cero `customElements`, cero
  Shadow DOM. D2: `three` + R3F + drei instalados, ASCII por `<AsciiRenderer>` y giro por
  `<OrbitControls>` (plan A, no hizo falta el plan B). D3: auto-rotación apagada, arrastre vivo,
  con test.

## 8. Deuda abierta (no bloquea, se anota para quien siga)

1. **Coste de CPU del bucle de asciificación.** `frameloop="always"`: incluso con
   reduced-motion y sin arrastre, la escena re-asciifica cada frame. Lo natural sería
   `frameloop="demand"` en reduced-motion (drei invalida en `change`, así que el arrastre
   seguiría), o un limitador a ~24-30 fps. **No se hizo porque no puedo verificarlo en
   happy-dom** y el riesgo era un ASCII permanentemente en blanco si nunca se pide un frame.
   Candidato claro para el afinado que RFC-01 §7 deja fuera de alcance.
2. **`resolution` es inmutable tras construir el `AsciiEffect`.** Cambiar la densidad al pasar
   de tablet a desktop exigiría remontar `<AsciiRenderer>` (cambiar su `key`). Hoy la densidad
   es única para todos los tamaños ≥ tablet.
3. **Fondo global en todas las páginas privadas.** El ovillo va como `background` del `AppShell`
   (así lo pidió el leader y encaja con RFC-01 §1, "la capa de fondo (textura + ovillo ASCII)").
   Cuando llegue **#19 `dashboard_ui`** hay que decidir si el hero es una **segunda** instancia
   `interactive` dentro del `FocusFrame` o si el hero reemplaza al fondo en esa ruta — dos
   escenas 3D simultáneas serían caras.
4. **Sin `glow`.** El template mencionaba un atributo `glow` y existe `--shadow-glow`; se dejó
   fuera por alcance. Sería un `text-shadow` por token sobre el host.
5. **Ajuste fino visual pendiente** (rampa, densidad, encuadre, velocidad de giro): es revisión
   humana contra el navegador, explícitamente fuera del alcance de esta slice (RFC-01 §7).
6. `@types/three` y `three` quedaron **pinneados a 0.185.1** a propósito: no hay
   `peerDependency` que avise si se desincronizan. Actualizarlos siempre juntos.

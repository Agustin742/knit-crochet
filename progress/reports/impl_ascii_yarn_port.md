# impl — corrección de #14 `ascii_yarn`: port fiel de `template/ascii-yarn.js`

- **Tipo:** corrección de una feature ya `done` (su `status` **no** se tocó).
- **Contrato:** `template/ascii-yarn.js` (referencia visual, manda sobre `src/`), RFC-01 §3 **D2-bis**,
  SDD-01 §3. D1 (componente React) y D3 (reduced-motion apaga sólo la auto-rotación) **sin cambios**.
- **Qué se rehízo:** el motor. Se eliminó R3F + `drei` + `AsciiEffect` y se portó el algoritmo del
  template: render a un `WebGLRenderTarget` de `cols × rows` (**1 píxel = 1 carácter**),
  `readRenderTargetPixels`, luminancia → rampa de 13 caracteres, escritura a un `<pre>`.

---

## 1. Archivos

### Creados
| Archivo | Qué hace |
|---|---|
| `src/shared/ui/three/ascii-yarn/asciiFromPixels.ts` | Función pura: buffer RGBA → bloque de texto. Exporta `ASCII_RAMP` (los 13 caracteres del template). Invierte el orden de filas (el framebuffer viene de abajo-izquierda). |
| `src/shared/ui/three/ascii-yarn/createYarnScene.ts` | Construye escena/cámara/luces/geometría con `three` puro. Incluye el LCG de Lehmer (semilla 42) y devuelve `dispose()` con todas las geometrías y materiales. |

### Reescritos
| Archivo | Qué cambió |
|---|---|
| `src/shared/ui/three/ascii-yarn/AsciiYarnScene.tsx` | Ya no es una escena R3F: es un componente con un `<pre>` + un `useEffect` que crea el `WebGLRenderer`, el render target, el bucle de dibujo y los handlers de puntero. Props nuevas `cols`/`rows`. |
| `src/shared/ui/three/ascii-yarn/AsciiYarn.tsx` | Mismo contrato (dynamic `ssr:false`, `interactive`, `aria-hidden`, `useViewportSupports3d`, `cn()`). Se quitó el hack `[&_table]:font-mono!` (ya no hay `<table>` de `AsciiEffect`), se movió la tipografía al `<pre>`, se añadió `text-accent` (color por token → `currentColor`), centrado flex y props `glow`/`cols`/`rows`. |
| `src/shared/ui/three/ascii-yarn/ascii-yarn.test.tsx` | Reescrito: se mockea **`three`** en el borde (13 tests). |

### Modificados
| Archivo | Qué cambió |
|---|---|
| `src/shared/ui/primitives/no-hardcode.test.ts` | Lista actualizada a los 5 archivos de la capa 3D (`YarnMesh.tsx` fuera; `asciiFromPixels.ts` y `createYarnScene.ts` dentro) + nota de la excepción "unidades de mundo 3D". |
| `package.json` / `pnpm-lock.yaml` | `pnpm remove @react-three/drei @react-three/fiber` (−45 paquetes). |
| `progress/current.md` | D2 tachada → D2-bis; deuda 8 marcada saldada; deuda 11 reformulada; notas para consumidores actualizadas. |

### Borrados
- `src/shared/ui/three/ascii-yarn/YarnMesh.tsx` (geometría R3F declarativa, reemplazada por `createYarnScene.ts`).

### Sin tocar
`usePrefersReducedMotion.ts`, `useViewportSupports3d.ts`, `index.ts`, `AppShell.tsx`,
`features/auth/ui/AppShellClient.tsx` (el `background={<AsciiYarn />}` sigue igual), `template/**`.

---

## 2. Tabla de fidelidad (template → código)

Todo lo de esta tabla es **copia literal** de `template/ascii-yarn.js`. Nada se "mejoró".

| Concepto | Template (línea) | Código | Valor |
|---|---|---|---|
| Rampa (13 chars) | L4 | `asciiFromPixels.ts` `ASCII_RAMP` | `" .`+"`"+`:;-=+*x#%@"` |
| Luminancia | L73 | `asciiFromPixels.ts` `LUMA_*` | `0.2126 / 0.7152 / 0.0722`, `/255` |
| Índice de rampa | L74 | idem | `min(len-1, trunc(l*len))` (`\|0` → `Math.trunc`, idéntico para valores ≥ 0) |
| Orden de filas | L70 | idem | `for (y = rows-1; y >= 0; y--)` |
| LCG | L6 | `createYarnScene.ts` `createRandom` | `s = (s*16807) % 2147483647`, semilla `42` |
| Cámara | L32-34 | `createYarnScene.ts` | `fov 34`, `aspect (cols*0.6)/rows`, near `0.1`, far `100`, pos `(0, 0.35, 5.4)`, `lookAt(0,0,0)` |
| Ambient | L35 | idem | `0xffffff`, `0.22` |
| Key light | L36 | idem | `0xffffff`, `1.7`, pos `(2.5, 3, 4)` |
| Fill light | L37 | idem | `0xffffff`, `0.4`, pos `(-3, -1.5, -2)` |
| Material ovillo | L41 | idem | `MeshPhongMaterial 0xd8d8d8`, `shininess 14` |
| Esfera | L42 | idem | `SphereGeometry(0.98, 32, 24)` |
| Anillos | L43-46 | idem | **18** × `TorusGeometry(0.99, 0.05, 6, 56)`, `rotation.set(rand()*π ×3)` en el mismo orden de consumo del LCG |
| Material aguja | L48 | idem | `MeshPhongMaterial 0xffffff`, `shininess 90` |
| Vástago | L51 | idem | `CylinderGeometry(0.034, 0.034, 3.5, 10)` |
| Punta | L52 | idem | `ConeGeometry(0.034, 0.22, 10)`, `position.y 1.85` |
| Perilla | L53 | idem | `SphereGeometry(0.095, 12, 10)`, `position.y -1.78` |
| Pose de aguja | L55-56 | idem | `rotation.set(0.38, 0, rz)`, `position.y 0.12` |
| Las dos agujas | L59 | idem | `rz = 0.55` y `-0.62` |
| Inclinación del grupo | L60 | idem | `rotation.x = 0.15` |
| Renderer | L27-28 | `AsciiYarnScene.tsx` | `WebGLRenderer({ antialias:false, powerPreference:"low-power" })`, `setSize(cols, rows)` |
| Render target | L63-64 | idem | `WebGLRenderTarget(cols, rows)`, `Uint8Array(cols*rows*4)` |
| Retícula por defecto | L11-12 | idem | `cols 96`, `rows 44` |
| Auto-rotación | L101 | idem | `+= 0.006` por frame, sólo si no se arrastra |
| Arrastre X | L89 | idem | `* 0.01` |
| Arrastre Y + clamp | L90 | idem | `* 0.008`, clamp `±1.2` |
| Reduced-motion | L98 | idem | `rotation.y = 0.7`, **un** `draw()`, **sin** `requestAnimationFrame` |
| Arrastre con reduced-motion | L92 | idem | `if (reduced) draw()` dentro de `pointermove` |
| Fallback sin WebGL | L29 | idem | `try/catch` alrededor del `WebGLRenderer` (la capa decorativa queda vacía en vez de romper la página) |

**Diferencias deliberadas (y por qué):**

1. **No se carga `three` desde CDN** (template L22): se importa del paquete instalado — el arnés lo exige.
2. **No hay atributos de custom element** (`cols`, `rows`, `color`, `font-size`, `auto`, `glow`): son props
   de React (D1). No se portó `auto` (la auto-rotación siempre está encendida salvo reduced-motion);
   nadie la apagaba en el template-src.
3. **`cursor: grab/grabbing` por clase, no por `style` inline**: `cursor-grab` +
   `data-[dragging=true]:cursor-grabbing`, con el atributo `data-dragging` como estado. Mismo efecto,
   sin escribir CSS a mano desde JS.
4. **`setPointerCapture` con guarda `typeof === "function"`**: happy-dom no implementa la Pointer Capture
   API. La guarda es defensiva, no un mock en producción.
5. **`dispose()` completo**: el template sólo libera renderer y render target; acá también geometrías y
   materiales, en el cleanup del `useEffect` (React monta/desmonta muchas veces más que un custom element).
6. **El grupo se recrea si cambian `cols`/`rows`/`prefers-reduced-motion`** (dependencias del efecto): se
   pierde la rotación acumulada en ese instante. Es el mismo comportamiento que reconectar el elemento.

---

## 3. Cero hardcode: cómo se resolvió cada literal del template

| Literal del template | Solución | Dónde |
|---|---|---|
| `pre.style.fontSize = '11px'` | Clase `text-xs` → `--text-xs: 11px` (el token **ya valía 11px**, coincidencia exacta con el template). | `AsciiYarnScene.tsx` |
| `pre.style.color = 'currentColor'` | El host lleva `text-accent` (`--color-accent` → `--accent` → `--brand-pink`) y el `<pre>` **hereda** `currentColor`. Cambiar la identidad = cambiar el token. | `AsciiYarn.tsx` |
| `textShadow = '0 0 9px rgba(228,100,155,0.75)'` | Prop `glow` → `[text-shadow:var(--shadow-glow)]`. El token existente es `0 0 18px rgba(228,100,155,0.6)`: **mismo rosa**, radio y alfa distintos. **No se inventó un color ni se creó un token nuevo** — se usó el más cercano, como pedía el brief. Si la revisión visual quiere el halo exacto del template, es un ajuste de `--shadow-glow` en `globals.css`, no del componente. | `AsciiYarn.tsx` |
| `font-family: "IBM Plex Mono", monospace` | `font-mono` (`--font-mono`, self-hosted por `next/font`). | `AsciiYarnScene.tsx` |
| `line-height: 1` | `leading-ascii` (`--leading-ascii: 1`). | idem |
| `letter-spacing: 0` | `tracking-normal`. | idem |
| `margin: 0`, `user-select`, `touch-action` | `m-0`, `select-none`, `touch-none`. | idem |

**Números que NO son hardcode** (y así queda anotado en el encabezado de `no-hardcode.test.ts`): geometría,
luces, cámara, sensibilidades de arrastre y paso de rotación son **unidades de mundo 3D**, no CSS. Los
colores de material (`0xd8d8d8`, `0xffffff`) tampoco son colores de marca: son **grises que alimentan la
luminancia** de la rampa; el color visible del ovillo lo pone el token del host. Ambos archivos nuevos están
igualmente en la lista del guardrail (pasan: la regex de hex exige `#`, y no hay `px` ni `rgb()`).

**Verificado en el CSS realmente generado** (chunk del build, no sólo en el fuente): `text-accent`,
`text-xs`, `leading-ascii`, `tracking-normal`, `font-mono`, `whitespace-pre`, `cursor-grab`, `touch-none`,
`text-shadow:var(--shadow-glow)` y `[data-dragging=true]{cursor:grabbing}` existen todos en
`.next/static/chunks/1hknn5oqye-cu.css`.

---

## 4. D3 y la deuda 8

`prefers-reduced-motion: reduce` → `group.rotation.y = 0.7`, **un solo `draw()`**, y el
`requestAnimationFrame` **no se arranca**. El arrastre sigue vivo y **redibuja en cada `pointermove`**.

Esto **salda la deuda técnica 8** (`frameloop="always"`): con la preferencia activa el ovillo dejaba de
girar pero R3F seguía re-asciificando cada frame en todas las páginas privadas. Ahora, con la preferencia
activa, el coste es exactamente **1 frame + 1 frame por evento de arrastre**. Sin la preferencia, el bucle
corre a rAF pleno igual que el template (decisión de la referencia, no deuda nueva). Está cubierto por test:
`requestAnimationFrame` no se llama y `renders === 1`.

---

## 5. Dependencias

`pnpm remove @react-three/drei @react-three/fiber` → **hechas fuera**. No quedaba ninguna importación
(`grep` en `src/**`, `*.css`, `*.json`). Quedan `three@0.185.1` + `@types/three@0.185.1` (sigue vigente la
deuda 10: actualizarlos siempre juntos). El único rastro textual de R3F/drei es la `description` de la
feature #14 en `feature_list.json`, que todavía narra la D2 vieja — **no la toqué** (es del líder); vale la
pena reescribirla para que no contradiga a D2-bis.

---

## 6. Tests

`src/shared/ui/three/ascii-yarn/ascii-yarn.test.tsx` — 13 tests, `three` mockeado **en el borde** (clases
mínimas con `rotation`/`position`/`add` + un `WebGLRenderer` que cuenta renders y rellena el buffer). Sin
tests de píxeles.

- Host: `aria-hidden`, color por token (`text-accent`), `pointer-events` según `interactive`,
  `className` fusionado con `cn()`, `glow` → clase de token, degradación mobile (`--bp-tablet` → no se monta
  la escena y **no hay ningún render**).
- Motor: el `<pre>` recibe una retícula de exactamente `rows` líneas × `cols` caracteres, todos
  pertenecientes a la rampa.
- Auto-rotación: se llama a `requestAnimationFrame` y `rotation.y` avanza `0.006` por frame.
- **D3, las dos mitades:** (a) con `reduce` → `raf` **no** llamado, exactamente **1** render y pose
  `rotation.y = 0.7`; (b) el arrastre **sigue**: `pointerdown` + `pointermove` de 50px → `+0.5` en
  `rotation.y` y **un render más**; tras `pointerup` un `pointermove` suelto no mueve ni redibuja.
- Clamp vertical del arrastre a `±1.2`.
- `asciiFromPixels` como función pura (sin mocks): negro → `" "`, blanco → `"@"`, dimensiones y el
  orden invertido de filas.

---

## 7. Verificación

### `bash ./init.sh`

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  38 passed | 1 skipped (39)
      Tests  368 passed | 6 skipped (374)
   Duration  43.49s

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

Baseline previa: 362 passed | 6 skipped → ahora **368 passed | 6 skipped** (+6 neto: la suite del ovillo
pasa de 8 a 13 tests y el guardrail de hardcode pasa de 4 a 5 archivos × 2 asserts).

### `pnpm build`

**Comprobado antes de correrlo** que no había `pnpm dev` activo: `netstat` sin nada escuchando en 3000/3001
y ningún proceso `next dev`/`next-server` en `Get-CimInstance Win32_Process`. **No se borró `.next`.**
Resultado: build completo, 12 páginas estáticas generadas, todas las rutas del App Router intactas, sin
errores ni warnings de TS/ESLint.

---

## 8. Lo que NO valida esto

El criterio de aceptación real es **visual** y lo mira el usuario en pantalla. Lo automatizado cubre
comportamiento y contrato; la fidelidad del ovillo contra el template es revisión humana (SDD §9, RFC-01 §7).
Puntos concretos a mirar en el navegador:

1. **Encuadre y tamaño.** El `<pre>` mide `96 chars × 11px` ≈ 630×484 px y va **centrado** en el host
   (`flex items-center justify-center`) — decisión mía: el template no dice nada porque su host era una caja
   del layout. Si se lo quiere a sangre o en otra posición, se resuelve con `className`/`cols`/`rows` desde
   el consumidor, no tocando el motor.
2. **Color y contraste.** El ASCII sale en `--accent` (rosa) sobre el espresso del shell. Si queda muy
   fuerte de fondo, la palanca es `className` (p. ej. una opacidad por token) desde `AppShellClient`.
3. **Halo.** Hoy `glow` está **apagado** (como en el template y en `template-src.html`). Encenderlo es
   `<AsciiYarn glow />`.
4. **Espacio de color.** `three` 0.185 vs. 0.160 del template: si el ovillo se ve más oscuro/claro de lo
   esperado, el sospechoso es el `outputColorSpace` del render target, no la geometría.

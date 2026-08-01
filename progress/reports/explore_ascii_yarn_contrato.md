# Explore — Contrato de diseño de la feature #14 `ascii_yarn`

> Informe del subagente `Explore` (solo lectura). Persistido por el leader porque el
> agente no tenía herramientas de escritura.

## (a) Contrato exacto del SDD (`docs/design/SDD-01-design-system.md`)

**§3 Stack (l.97, 101)** — literal: `three` + `@react-three/fiber` + `@react-three/drei` +
**`AsciiEffect`** (three.js examples). "R3F integra three.js declarativo; `drei` trae helpers;
`AsciiEffect` renderiza la escena como ASCII (el ovillo rotable, §7)".

**§4 Estructura (l.131, 137)** — `three/` = "capa 3D client-only (CanvasHost + escenas)".
Regla dura: "`three/` es la única capa que importa `three`/R3F, siempre client-only (§7)".

**§5 Tokens implicados (l.150-160)** — `--z-bg-3d` (nota: "Crítico: el 3D va detrás del
contenido"), `--font-mono`, `--accent`/`--brand-pink`, `--dur-*`/`--ease-*`, `--bp-*`.

**§6 Inventario, Capa 3D (l.197-201)** — literal: `CanvasHost` + la escena **signature**: un
ovillo de lana con agujas renderizado en ASCII (`AsciiEffect`), rotable (auto-rotación +
arrastre). "Valida la integración R3F, el aislamiento SSR y `prefers-reduced-motion`".

**§7 Capa 3D — aislamiento estricto (l.205-219)**:
- **Client-only**: todo `three/**` es client, montaje **diferido sin SSR**.
- **Detrás del contenido**: `CanvasHost` en `--z-bg-3d`; fondos decorativos **no capturan
  eventos** (`pointer-events: none`) **salvo escenas explícitamente interactivas**.
- **Rendimiento**: `dpr` acotado, carga diferida / `Suspense`, respeto de
  `prefers-reduced-motion` (**congelar o caer a estático**). "El 3D no bloquea el primer render".
- **Objeto ASCII signature**: ovillo con agujas, rotable por auto-rotación + arrastre. "Es un
  elemento interactivo de marca (**excepción consciente al `pointer-events: none`**)".
- **Tablet + desktop primarios**; en mobile degrada: "menos densidad, fondo estático, o se omite".

**§7.1 Técnica ASCII (l.223-239)**:
- `AsciiEffect` de `three/addons/effects/AsciiEffect.js` (basado en jsascii).
- Rotación con `mesh.rotation.y += speed` en el loop (o `OrbitControls` para arrastre) +
  `effect.render(scene, camera)`.
- Calidad = **rampa de caracteres** afinada + **resolución de celda** + malla bien iluminada y
  de alto contraste.
- Reglas de render del contenedor: **fuente monospace, `line-height: 1`, `white-space: pre`,
  `letter-spacing` afinado, unidades `ch`**. "Motivos pequeños e intencionales, no muros de ruido".

**§9 Verificación — qué SÍ y qué NO (l.259-271)**: SÍ RTL + `user-event` sobre `happy-dom`,
smoke de render, `axe` en primitivos, typecheck+lint+build, cero hardcode. NO píxeles, no "que
se vea lindo" (fidelidad visual = revisión manual). `feature_list.json` #14 acota: "smoke de
montaje + reduced-motion + init.sh + build".

## (b) Usos según los RFC

**RFC-01 §2 (l.21-22)**: "Auth = pantalla limpia, sin archivero; ovillo ASCII de fondo **solo en
login** (no en register)". "Ovillo ASCII = **hero (Dashboard) + loader global**. Gira solo **y**
se puede arrastrar."

**RFC-01 §3 (l.43-46)**, bloque literal `<ascii-yarn>` (`src/shared/ui/three/`):
> Web component client-only (three.js `AsciiEffect`; `dynamic` `ssr:false`). Ovillo + agujas,
> auto-rota y se arrastra. Va detrás del contenido (`--z-bg-3d`), `pointer-events:none` salvo
> cuando es hero interactivo. Congela con `prefers-reduced-motion`. Se usa como hero (Dashboard)
> y loader global.

Otros: §5 "Loading global: el ovillo ASCII como loader"; §7 fuera de alcance "el afinado fino del
ovillo 3D (se prototipa acá; se pule aparte)"; §8 stack nuevo a instalar: `three` (+ `AsciiEffect`);
l.6: "lo único fijo 'tal cual' es el ovillo ASCII".

**RFC-02 (Dashboard)**: l.3 "ovillo hero"; l.18 "gira solo y se arrastra"; l.22 "**Hero:**
`<ascii-yarn>` + wordmark/saludo. En `kc-focusframe`"; l.38 "**Loading:** ovillo ASCII como
loader + `kc-skeleton`".

**Feature #31 `auth_ui`**: ovillo de fondo SOLO en login.

**Modos implícitos (3)**: (1) hero interactivo (Dashboard, arrastrable, recibe eventos, dentro de
FocusFrame); (2) loader (global y de página); (3) fondo decorativo (login, `pointer-events:none`,
`--z-bg-3d`).

## (c) Implementación de referencia en `template/` → **NO EXISTE**

`template/` solo tiene `tokens.css` y `template-src.html`. No hay three.js, `AsciiEffect`, canvas
ni custom element en todo el repo.

Lo que sí aporta (contrato de API del elemento), `template/template-src.html:237-242`:

```html
<!-- Capa 3D: ovillo ASCII rotable. Componente separado (ascii-yarn.js en la raíz
     del proyecto): web component <ascii-yarn cols rows font-size color auto glow>.
     Client-only, detrás del contenido (--z-bg-3d), congela con reduced-motion. -->
<section id="capa3d" ...>
  <pre class="kc-ascii" ...>&lt;ascii-yarn cols="100" rows="46" color="#E4649B" auto="true"&gt;&lt;/ascii-yarn&gt;</pre>
</section>
```

- Atributos declarados: `cols`, `rows`, `font-size`, `color`, `auto`, `glow`.
- **El archivo `ascii-yarn.js` nunca se entregó**: no hay geometría, loop, drag ni cleanup de
  referencia. Todo eso lo inventa el implementer.
- `template-src.html:136`: `.kc-ascii { margin:0; font-family: var(--font-mono);
  line-height: var(--leading-ascii); white-space: pre; }` ("reglas duras del ASCII").
- `template/tokens.css`: `--z-bg-3d: 0`, `--brand-pink: #E4649B`, `--accent: var(--brand-pink)`,
  `--font-mono`, `--leading-ascii: 1` ("obligatorio en motivos ASCII").
- `@media (prefers-reduced-motion: reduce)` global anula animaciones CSS, **no** un loop rAF.

## (d) Reglas del arnés aplicables

`docs/harness/conventions.md`: Server Component por defecto, `"use client"` solo con
estado/efectos/eventos (l.16-17); carpeta de componente en `kebab-case/`, componente
`PascalCase`, variantes `<name>.variants.ts` (l.40-43); **token-first, regla dura**: nada de
color/tamaño/borde/radio/sombra/z-index hardcodeado (l.65-68); presentación pura en `shared/ui/`
(l.69-71); `cn()` obligatorio (l.72-74); `cva` para variantes (l.75-76); **capa 3D aislada**
(l.81-84, literal): "Solo `shared/ui/three/**` importa `three`/R3F, siempre client-only
(`dynamic`, `ssr:false`)… congela con `prefers-reduced-motion`. Nunca bloquea el primer render";
sin comentarios salvo un "por qué" no obvio (l.111-114); tests RTL/`happy-dom`/smoke/axe (l.116-128).
`architecture.md` l.128 prohíbe "añadir una dependencia pesada sin justificarla en
`feature_list.json`" → instalar `three` está autorizado por RFC-01 §8; **R3F/drei no lo están**.

**Estado del repo**: `three`/R3F/drei no instalados. Slot ya existe en
`src/shared/ui/layout/app-shell/AppShell.tsx:36-42`. El guardrail
`src/shared/ui/primitives/no-hardcode.test.ts` usa una **lista explícita** de archivos.

## (e) Decisiones abiertas / ambigüedades

1. **Web component real vs. componente React.** RFC-01 §3 + `feature_list.json` #14 + template
   dicen "web component `<ascii-yarn>`" con atributos; SDD §6 dice `CanvasHost` en React y §3
   exige R3F + drei. APIs incompatibles. Un custom element choca con `cn()`/`cva`/RTL/axe.
2. **¿Se instalan `@react-three/fiber` y `@react-three/drei`?** SDD §3 los exige; RFC-01 §8 y #14
   solo mencionan `three` + `AsciiEffect`.
3. **Tipos de `AsciiEffect`** bajo TS strict sin `any`.
4. **Arrastre: `OrbitControls` vs. listeners propios** (`pointerdown/move/up` + `setPointerCapture`).
   Impacta bundle y cleanup.
5. **API de modos**: nadie define cómo se elige hero/loader/fondo-login (`mode`? `variant`?
   `auto` + `interactive`?). `glow` no está definido semánticamente.
6. **Tokens vs. atributo `color`**: el template hardcodea `#E4649B`, lo que viola token-first. El
   default debería leer `--accent` (¿`getComputedStyle`? — happy-dom no lo resuelve).
7. **`cols`/`rows` fijos (100×46) vs. responsive**: SDD §7 exige degradar en mobile; el template
   da valores fijos. Falta criterio (ResizeObserver vs. breakpoints).
8. **Reduced-motion: "congela" vs. "cae a estático"**, y si el **arrastre manual** sigue permitido.
9. **Testeabilidad en happy-dom**: no hay WebGL (ni 2D real) → mockear o fallback estático.
10. **Loader**: ¿el mismo elemento con otro tamaño o un wrapper `YarnLoader`? Falta el rol a11y
    (`role="status"`/`aria-live`), que `axe` va a mirar.
11. **Geometría del ovillo + agujas**: sin especificación en ningún doc ni mockup.

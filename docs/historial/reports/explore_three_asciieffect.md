# Explore — three.js + AsciiEffect en knit-crochet (feature 14 `ascii_yarn`)

> Investigación pura. **No se instaló nada** ni se tocó código de `src/**`.
> `context7` no disponible → fallback aplicado: (1) inspección de `node_modules`,
> (2) tarballs oficiales del registry descargados al scratchpad, (3) documentación
> oficial embebida en `node_modules/next/dist/docs/**`, (4) **verificación empírica**
> (ejecuciones reales de `node`, `vitest`, `tsc` y `esbuild`).

**Fecha:** 2026-07-25 · **Estado del repo:** `three` **NO está instalado** (verificado: `ls node_modules/three` → no existe).

---

## Fuentes usadas (todas verificadas, ninguna de memoria)

| # | Fuente | Qué aportó |
|---|---|---|
| F1 | `pnpm view three version` → `0.185.1` | Última estable |
| F2 | Tarball `https://registry.npmjs.org/three/-/three-0.185.1.tgz`, extraído en scratchpad | `package.json` (exports map), fuente real de `AsciiEffect.js`, tamaños |
| F3 | Tarball `https://registry.npmjs.org/@types/three/-/three-0.185.1.tgz` | `AsciiEffect.d.ts` real |
| F4 | `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` (docs que **Next 16.2.10 embarca**) | Regla `ssr: false` en Server Components |
| F5 | `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/transpilePackages.md` | Cuándo hace falta `transpilePackages` |
| F6 | `node_modules/next/dist/docs/01-app/03-api-reference/06-cli/next.md` líneas 68-69, 98-99 | Turbopack es el bundler por defecto en Next 16 |
| F7 | `node_modules/react-dom/cjs/react-dom-client.development.js` (`isCustomElement`, `setPropOnCustomElement`) | Soporte real de custom elements en React 19.2.7 |
| F8 | `node_modules/@types/react/index.d.ts` línea 4132 (`namespace JSX` dentro de `declare namespace React` línea 70) | Dónde augmentar `IntrinsicElements` |
| F9 | Ejecuciones propias con `happy-dom@20.11.1` + `vitest@4.1.10` | Capacidades del entorno de test |
| F10 | `https://raw.githubusercontent.com/mrdoob/three.js/r185/examples/webgl_effects_ascii.html` | Uso canónico de `AsciiEffect` |
| F11 | `esbuild@0.28.1` (de `node_modules/.pnpm`) bundle+minify real | Tamaños de bundle medidos, no estimados |
| F12 | `docs/design/SDD-01-design-system.md` §3, §4, §7, §7.1, §9 · `feature_list.json` id 14 | Contrato funcional |

---

## 1. Versión y paquetes

### Versión

- **`three@0.185.1`** es la última estable (`dist-tags: { latest: "0.185.1" }`).
- `three` **no declara `peerDependencies`** de React/Next: es una librería agnóstica. No hay
  incompatibilidad posible con Next 16 / React 19 por esa vía.
- Compatible con TS strict del repo: **verificado** con `tsc --noEmit` real (ver §5).

### ¿Hacen falta `@types/three`? → **SÍ, obligatorio**

Esto es lo primero que había que verificar y el resultado es tajante. Del tarball real de `three@0.185.1`:

```
$ find <three-0.185.1>/package -name "*.d.ts" | wc -l
0
```

**Cero archivos `.d.ts`.** Y su `package.json` (F2) **no tiene campo `types`** ni condición `"types"` en el
exports map:

```jsonc
// three@0.185.1/package.json  (verbatim del tarball)
{
  "type": "module",
  "main": "./build/three.cjs",
  "module": "./build/three.module.js",
  "exports": {
    ".":                  { "import": "./build/three.module.js", "require": "./build/three.cjs" },
    "./examples/fonts/*": "./examples/fonts/*",
    "./examples/jsm/*":   "./examples/jsm/*",
    "./addons":           "./examples/jsm/Addons.js",
    "./addons/*":         "./examples/jsm/*",
    "./src/*":            "./src/*",
    "./webgpu":           "./build/three.webgpu.js",
    "./tsl":              "./build/three.tsl.js"
  }
}
```

> **Traducción:** un *exports map* es la tabla que dice qué archivo real corresponde a cada ruta de import.
> Fijate que `./addons/*` apunta a `./examples/jsm/*` — son **la misma carpeta con dos nombres**. Eso
> importa para el §2.

`@types/three@0.185.1` existe y **versiona en paralelo** (mismo número que `three`). Su `package.json`
**replica el mismo exports map**, por eso los subpaths (`three/addons/...`) resuelven tipos correctamente
bajo `moduleResolution: "bundler"` (que es lo que usa este repo, `tsconfig.json`).

> ⚠️ **Ojo con la falsa creencia** de que "three moderno trae tipos propios". Es falso para el paquete
> `three` publicado en npm. Lo que sí tiene el código fuente son **JSDoc** (`@param {WebGLRenderer}`),
> que sirven para generar docs pero **no** son consumibles por TS sin `allowJs` + `checkJs`, y este repo
> tiene `"allowJs": false`.

### Comando exacto de instalación (pnpm — nunca npm)

```bash
pnpm add three@0.185.1
pnpm add -D @types/three@0.185.1
```

Notas operativas para el implementer:

- `three` va en **`dependencies`** (código de runtime que se envía al browser).
- `@types/three` va en **`devDependencies`** (solo compila).
- **Fijar la versión exacta y hacerlas coincidir.** `@types/three` no declara `peerDependencies`
  (verificado: `peerDependencies: {}`), así que pnpm **no** te va a avisar si se desincronizan. three
  publica breaking changes en cada minor (r184 → r185), y los tipos siguen ese ritmo.
- `@types/three` arrastra dependencias propias (`fflate`, `@types/webxr`, `meshoptimizer`,
  `@tweenjs/tween.js`, `@dimforge/rapier3d-compat`, `@types/stats.js`). Son **solo tipos/dev**, no entran
  al bundle, pero engordan el `pnpm-lock.yaml`. Es normal y esperable.
- **No hace falta tocar `pnpm-workspace.yaml`**: `three` no tiene build scripts nativos (no requiere
  entrada en `onlyBuiltDependencies` / `allowBuilds`).

### ¿R3F (`@react-three/fiber`) como pide el SDD §3?

Datos verificados del registry:

- `@react-three/fiber@9.6.1`, peers: `react: ">=19 <19.3"`, `react-dom: ">=19 <19.3"`, `three: ">=0.156"`.
  El repo tiene `react@19.2.7` → **compatible**.
- `@react-three/drei@10.7.7`.

**Recomendación: NO usar R3F para esta feature.** Motivos concretos:

1. `AsciiEffect` **sustituye el elemento del DOM**: no se monta el `<canvas>` del renderer, se monta
   `effect.domElement` (un `<div>` con una `<table>` dentro). R3F está construido alrededor de montar y
   gestionar **su propio `<canvas>`**; desviar la salida a otro nodo exige `frameloop="never"`, un
   `gl` custom y un render loop manual — o sea, se pelea contra el framework para terminar haciendo
   exactamente lo mismo que el camino imperativo.
2. La escena es trivial (un toro/esfera + 2 cilindros como agujas + 2 luces). El valor de R3F
   (composición declarativa de escenas complejas) no se materializa acá.
3. Coste: R3F + drei suman peso y superficie de API para cero beneficio en este caso.

El SDD §3 recomienda R3F **para la capa 3D en general**; esta feature es la excepción justificada por la
mecánica de `AsciiEffect`. **Es una desviación del SDD y debe ser aprobada explícitamente por el leader**
antes de que el implementer la ejecute.

---

## 2. AsciiEffect — ruta de import, API real y tipos

### Ruta de import correcta

**Ambas funcionan y resuelven al mismo archivo** (por el exports map de §1):

| Especificador | Resuelve a |
|---|---|
| `three/addons/effects/AsciiEffect.js` | `examples/jsm/effects/AsciiEffect.js` |
| `three/examples/jsm/effects/AsciiEffect.js` | `examples/jsm/effects/AsciiEffect.js` |

**Usar `three/addons/effects/AsciiEffect.js`.** Es la forma canónica: el propio archivo fuente lo declara
en su cabecera JSDoc y el SDD §7.1 ya la nombra así.

```js
// three-0.185.1/examples/jsm/effects/AsciiEffect.js, líneas 1-7 (verbatim)
/**
 * A class that creates an ASCII effect.
 *
 * The ASCII generation is based on [jsascii](https://github.com/hassadee/jsascii/blob/master/jsascii.js).
 *
 * @three_import import { AsciiEffect } from 'three/addons/effects/AsciiEffect.js';
 */
```

⚠️ **La extensión `.js` es obligatoria** en el especificador. El exports map mapea `./addons/*` a rutas con
extensión; sin `.js` no resuelve.

### API real (leída de la fuente, no de memoria)

```js
class AsciiEffect {
  constructor( renderer, charSet = ' .:-=+*#%@', options = {} )
  this.setSize = function ( w, h )              // llama internamente a renderer.setSize(w, h)
  this.render  = function ( scene, camera )     // llama renderer.render() y luego asciifica
  this.domElement                               // HTMLDivElement que contiene una <table>
}
```

**Opciones reales** (líneas 25-31 de la fuente — el objeto se lee con acceso por string):

```js
const fResolution   = options[ 'resolution' ]    || 0.15;   // number, más alto = más detalle
const iScale        = options[ 'scale' ]         || 1;      // number (1..5 en las tablas de letter-spacing)
const bColor        = options[ 'color' ]         || false;  // boolean, más lento
const bAlpha        = options[ 'alpha' ]         || false;  // boolean
const bBlock        = options[ 'block' ]         || false;  // boolean
const bInvert       = options[ 'invert' ]        || false;  // boolean
const strResolution = options[ 'strResolution' ] || 'low';  // 'low' | 'medium' | 'high'
```

Detalles no obvios, todos leídos de la fuente:

- **`resolution` y `scale` son inmutables tras construir.** Se leen una sola vez en el constructor y
  `fFontSize`/`fLineHeight`/`fLetterSpacing` se derivan ahí mismo (líneas 170-217). Para cambiarlas hay que
  **destruir y reconstruir** el efecto. Relevante para el degradado responsive del SDD §7 ("menos densidad
  en mobile").
- **`setSize(w, h)` reenvía a `renderer.setSize(w, h)`** (línea 55). **No llames a `renderer.setSize()`
  por tu cuenta**; siempre a través del efecto.
- **`render(scene, camera)` reemplaza a `renderer.render()`** (línea 68-73). Nunca llames a `renderer.render()`
  directamente.
- **`domElement` es un `<div>`**, no el canvas. El `<canvas>` del `WebGLRenderer` **nunca se agrega al DOM**
  — se usa solo como buffer intermedio del que se hace `drawImage`.
- La fuente **fuerza `courier new, monospace`** en el estilo inline de la `<table>` (`strFont`, línea 136).
  ⚠️ **Choca con el token `--font-mono` del design system.** Hay que sobreescribir con CSS de mayor
  especificidad sobre `effect.domElement table`, o el ASCII no va a usar la tipografía de la identidad.
- `setSize()` recalcula `oCanvas.width/height = floor(w|h * resolution)`. El coste del efecto es
  **O(width × height × resolution²)** en JS puro por frame — es lo que hace pesado al efecto, no el WebGL.
- Escapa HTML (`&`, `<`, `>`) y usa `innerHTML` para pintar. Sin riesgo de XSS acá (el input es el buffer de
  píxeles, no texto de usuario).

### Tipos TS: existen, pero con un **hueco real verificado**

`@types/three@0.185.1` sí trae la declaración, en
`@types/three/examples/jsm/effects/AsciiEffect.d.ts`:

```ts
// verbatim del tarball de @types/three@0.185.1
import { Camera, Scene, WebGLRenderer } from "three";

export interface AsciiEffectOptions {
    resolution?: number;
    scale?: number;
    color?: boolean;
    alpha?: boolean;
    block?: boolean;
    invert?: boolean;
}

export class AsciiEffect {
    constructor(renderer: WebGLRenderer, charSet?: string, options?: AsciiEffectOptions);
    domElement: HTMLElement;

    render(scene: Scene, camera: Camera): void;
    setSize(width: number, height: number): void;
}
```

🔴 **Hueco verificado: `strResolution` NO está en `AsciiEffectOptions`**, aunque la implementación JS sí lo
soporta. Comprobado con un `tsc --noEmit` real:

```
src/probe2.tsx(5,60): error TS2561: Object literal may only specify known properties,
  but 'strResolution' does not exist in type 'AsciiEffectOptions'.
  Did you mean to write 'resolution'?
```

**Workaround para el implementer si necesita `strResolution`** (afecta el `letter-spacing`, o sea la
calidad visual del ASCII — el SDD §7.1 insiste en que "no quede horrible"):

```ts
import { AsciiEffect, type AsciiEffectOptions } from "three/addons/effects/AsciiEffect.js";

/** `strResolution` existe en la implementación JS (AsciiEffect.js L31) pero falta en
 *  @types/three@0.185.1. Se extiende localmente en vez de castear a `any`. */
type AsciiOptions = AsciiEffectOptions & {
  strResolution?: "low" | "medium" | "high";
};

const options: AsciiOptions = { resolution: 0.2, scale: 1, invert: true, strResolution: "medium" };
const effect = new AsciiEffect(renderer, " .:-=+*#%@", options);
```

Otra imprecisión menor: el `.d.ts` declara `domElement: HTMLElement`, mientras el JSDoc de la fuente dice
`HTMLDivElement`. Sin impacto práctico (`appendChild` acepta `HTMLElement`).

### Uso canónico (del ejemplo oficial r185, F10)

```js
effect = new AsciiEffect( renderer, ' .:-+*=%@#', { invert: true } );
effect.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( effect.domElement );
effect.domElement.style.color = 'white';
effect.domElement.style.backgroundColor = 'black';

// controles: se enganchan a effect.domElement, NO a renderer.domElement
controls = new TrackballControls( camera, effect.domElement );

// en el loop:
effect.render( scene, camera );
```

⚠️ **Detalle crítico:** los controles (`OrbitControls`/`TrackballControls`) se construyen contra
**`effect.domElement`**, no contra `renderer.domElement`. El canvas del renderer no está en el DOM y no
recibe eventos de puntero. Equivocarse acá = "el arrastre no funciona" sin ningún error en consola.

---

## 3. Import client-only en Next 16 App Router

### ¿Sigue prohibido `ssr: false` en Server Components? → **SÍ**

Verificado en la documentación que **Next 16.2.10 embarca en su propio paquete** (F4,
`node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` líneas 94-95):

> **Note:** `ssr: false` option is not supported in Server Components. You will see an error if you try to
> use it in Server Components.
> `ssr: false` is not allowed with `next/dynamic` in Server Components. Please move it into a Client Component.

Y en la línea 66 del mismo doc:

> **Note:** `ssr: false` option will only work for Client Components, move it into Client Components ensure
> the client code-splitting working properly.

**Conclusión: la restricción de Next 15 sigue vigente en Next 16.** La `dynamic(..., { ssr: false })` tiene
que vivir dentro de un módulo marcado con `"use client"`.

### Dato clave del repo: el punto de montaje **ya es cliente**

Explorando el árbol real:

- `src/app/(app)/layout.tsx` (Server Component) → renderiza `<AppShellClient>`
- `src/features/auth/ui/AppShellClient.tsx` → **tiene `"use client"`** (línea 1)
- `AppShellClient` renderiza `AppShell` de `@/shared/ui`
- `src/shared/ui/layout/app-shell/AppShell.tsx` **ya tiene el hueco reservado**:

```tsx
{/* Slot de la capa 3D (feature 14 monta aquí el <ascii-yarn>). Detrás del
    contenido y sin capturar eventos. */}
<div
  aria-hidden="true"
  data-slot="bg-3d"
  className="pointer-events-none fixed inset-0 [z-index:var(--z-bg-3d)]"
/>
```

El token `--z-bg-3d: 0;` existe en `src/app/globals.css` línea 164. **La feature 15 ya dejó la costura
lista** — el implementer rellena ese `<div>`, no inventa uno nuevo.

### Estrategia recomendada: **UNA sola** — barrera `"use client"` propia + `dynamic(ssr:false)` + import perezoso de `three` dentro del efecto

Tres capas, cada una con una responsabilidad:

```
AsciiYarn.tsx          "use client"  → dynamic(() => import("./AsciiYarnImpl"), { ssr: false })
   └─ AsciiYarnImpl.tsx "use client" → useEffect + await import("three") + AsciiEffect
```

**Capa 1 — la barrera pública** (`src/shared/ui/three/ascii-yarn/AsciiYarn.tsx`):

```tsx
"use client";

import dynamic from "next/dynamic";

/**
 * Barrera client-only del ovillo ASCII. Declara su propio "use client" para que
 * `ssr: false` sea legal aunque el consumidor sea un Server Component
 * (Next 16 sigue prohibiendo ssr:false en Server Components — docs de next@16.2.10,
 * 01-app/02-guides/lazy-loading.md L94-95).
 */
const AsciiYarnImpl = dynamic(() => import("./AsciiYarnImpl"), {
  ssr: false,
  loading: () => null, // el 3D es decorativo: nada de skeleton, nada de layout shift
});

export interface AsciiYarnProps {
  interactive?: boolean;
  className?: string;
}

export function AsciiYarn(props: AsciiYarnProps) {
  return <AsciiYarnImpl {...props} />;
}
```

**Capa 2 — la implementación** (`AsciiYarnImpl.tsx`), con `three` importado **dentro** del `useEffect`:

```tsx
"use client";

import { useEffect, useRef } from "react";

export default function AsciiYarnImpl({ interactive = false, className }: AsciiYarnProps) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let disposed = false;
    let cleanup: (() => void) | undefined;

    void (async () => {
      // import perezoso: three NO entra al chunk de la página
      const THREE = await import("three");
      const { AsciiEffect } = await import("three/addons/effects/AsciiEffect.js");
      if (disposed) return;
      // ... construir escena, effect, loop; guardar el teardown en `cleanup`
    })();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [interactive]);

  return <div ref={hostRef} className={className} aria-hidden="true" />;
}
```

**Por qué esta estrategia y no las alternativas:**

| Alternativa | Veredicto |
|---|---|
| `dynamic(ssr:false)` llamado dentro de `AppShell.tsx` | ❌ Frágil. `AppShell` **no** tiene `"use client"` propio (solo hereda el de `AppShellClient`) y se exporta por el barrel `@/shared/ui`. El día que un Server Component lo importe directo, **build roto**. |
| Solo `"use client"` sin `dynamic` | ❌ `"use client"` **no** significa "no se renderiza en el server": el componente igual se prerenderiza en SSR. `three` explotaría al construir el `WebGLRenderer`. |
| Solo `await import()` dentro de `useEffect`, sin `dynamic` | ⚠️ Funciona en runtime, pero el módulo del componente entra al chunk inicial. `dynamic` además saca el propio componente del árbol de SSR. |
| `React.lazy` + `<Suspense>` | ⚠️ Válido, pero no ofrece el escape de SSR que da `ssr:false`; habría que gestionarlo a mano con un `mounted` flag. Más código, mismo resultado. |
| **La recomendada (barrera propia + dynamic + import perezoso)** | ✅ Robusta ante refactors, cero `three` en el chunk inicial, cero SSR. |

**Matiz honesto sobre el "explota en el server":** verifiqué que importar `three` en Node **sin DOM no
falla**:

```
$ node -e "import('.../build/three.module.js').then(m=>console.log('OK', Object.keys(m).length))"
three imported OK in node, exports: 441
```

O sea: el crash **no** ocurre al importar el módulo, sino al **construir** `new WebGLRenderer()` o
`new AsciiEffect()` (que necesitan `document.createElement('canvas')` y un contexto gráfico). El aislamiento
client-only sigue siendo obligatorio, pero por la razón correcta — útil para no perseguir fantasmas al
depurar.

---

## 4. `next.config.*` / `transpilePackages` → **no hace falta tocar nada**

Estado actual del repo (`next.config.ts`, íntegro):

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
```

**Se queda así.** Justificación verificada:

1. **`transpilePackages` no aplica.** Del doc que embarca Next 16.2.10 (F5): hace falta cuando *"a
   `node_modules` dependency ships raw TypeScript or JSX"*. `three` publica **JavaScript ESM plano y ya
   compilado** (`build/three.module.js` + `examples/jsm/*.js`) — verificado en el tarball. No hay TS ni JSX
   que transpilar.
2. **Turbopack es el bundler por defecto en Next 16** (F6: *"Force enable Turbopack (**enabled by default**)"*
   tanto para `next dev` como para `next build`) y resuelve exports maps y ESM de forma nativa. Los addons
   de `examples/jsm` son ESM estándar con imports relativos con extensión `.js` — el caso fácil.
3. **`three` no está en la lista de auto-transpilados** de Next (`node_modules/next/dist/lib/default-transpiled-packages.json`
   contiene únicamente `["geist"]`), y **no necesita estarlo**.
4. **`serverExternalPackages` no aplica**: `three` nunca debe ejecutarse en el server (§3).
5. **`experimental.optimizePackageImports`**: no lo recomiendo. Está pensado para paquetes de cientos de
   módulos con re-exports (iconos, `lodash-es`). `three` se distribuye como **un solo bundle ESM**, así que
   no hay nada que aplanar. El tree-shaking normal ya funciona (medido en §7).

> Si en el futuro se añadiera R3F/drei, **tampoco** harían falta: publican ESM+CJS compilados.

---

## 5. Custom element vs. componente React

### ¿React 19 soporta custom elements? → **SÍ, verificado en el código de react-dom instalado**

`react-dom@19.2.7` (F7):

```js
function isCustomElement(tagName) {
  if (-1 === tagName.indexOf("-")) return !1;   // requiere un guion en el nombre
  switch (tagName) {
    case "annotation-xml": case "color-profile": case "font-face": /* ... */ return !1;
    default: return !0;
  }
}
```

y una rama de asignación de props dedicada, `setPropOnCustomElement(domElement, tag, key, value, props, prevValue)`,
que maneja `style`, `children`, `dangerouslySetInnerHTML`, `onScroll`/`onScrollEnd`, y — la mejora clave de
React 19 — **asigna props no reconocidas como propiedades del elemento (no solo como atributos string)**.
`ascii-yarn` contiene guion → califica como custom element.

### El escollo real: TypeScript, no React

`@types/react@19.2.17` **no tiene index signature** en `IntrinsicElements` (F8): es una lista cerrada de
tags HTML/SVG. Sin augmentación, `<ascii-yarn />` **no compila**. Verificado:

```
src/probe2.tsx(3,24): error TS2339: Property 'ascii-yarn2' does not exist on type 'JSX.IntrinsicElements'.
```

En `@types/react` 19 el `namespace JSX` vive **dentro de `declare namespace React`** (línea 4132, dentro del
`declare namespace React` que abre en la 70). Por lo tanto la augmentación correcta es sobre el módulo
`"react"`, **no** sobre un `declare global`:

```ts
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "ascii-yarn": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        "data-speed"?: string;
        interactive?: boolean;
      };
    }
  }
}
```

✅ **Verificado con `tsc --noEmit` real**, en un workspace aislado con `three@0.185.1` + `@types/three@0.185.1`
+ `@types/react@19.2.17` y **el tsconfig de este repo** (`strict`, `verbatimModuleSyntax`,
`noUncheckedIndexedAccess`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`). Ese mismo archivo importaba
`three/addons/effects/AsciiEffect.js`, `AsciiEffectOptions` y símbolos de `three`, construía la escena
completa y **compiló con `EXIT=0`, sin errores ni warnings**.

Es decir: **tanto la resolución de tipos de `three/addons/*` como la augmentación del custom element están
empíricamente validadas contra la configuración exacta de este proyecto.**

### Recomendación: **componente React con `<div>` host** ✅

| | Custom element real (`customElements.define`) | Componente React con `<div>` host |
|---|---|---|
| **Contrato del acceptance** ("web component") | Literal | Requiere reinterpretación |
| Registro | Global e **idempotente a la fuerza**: `define()` **lanza** si el nombre ya existe → hay que guardear con `customElements.get()`; sufre con HMR de `next dev` | No aplica |
| Ciclo de vida | `connectedCallback`/`disconnectedCallback` propios, **desincronizados** del ciclo de React → doble fuente de verdad para montaje/limpieza | `useEffect` + cleanup, una sola fuente de verdad |
| Props | Solo strings vía atributos (salvo props objeto de React 19) | Props tipadas nativas |
| TS | Necesita augmentación de `IntrinsicElements` (arriba) | Tipado directo, cero augmentación |
| SSR | React 19 emite el tag en el HTML; el upgrade ocurre solo en cliente → **riesgo de hydration mismatch** | Controlado por `dynamic(ssr:false)` |
| Tokens/Tailwind | Si usa Shadow DOM, **las variables CSS heredan pero las clases Tailwind no aplican** → rompe el contrato de tokens del SDD §5 | Tokens y Tailwind funcionan sin fricción |
| a11y | Hay que cablear `aria-hidden`/roles a mano | Natural |
| Testabilidad | Funciona en happy-dom (verificado), pero RTL es más indirecto | Patrón RTL idéntico al resto del repo |
| Consistencia con el repo | Ninguna otra pieza usa custom elements | Igual que `Button`, `Card`, `AppShell`… |

**Qué dice realmente el SDD (leído, §4 y §7):** el SDD **no pide un custom element**. Pide una **capa
`three/`** dentro del design system con un **`CanvasHost` + la escena signature**:

> `three/` — capa 3D client-only (CanvasHost + escenas)
> **`three/` es la única capa que importa `three`/R3F**, siempre client-only (§7).
> `CanvasHost` + la escena **signature**: un ovillo de lana con agujas renderizado en ASCII (`AsciiEffect`),
> rotable (auto-rotación + arrastre)

El string `customElements` / `web component` **no aparece en el SDD**. El término "Web component
`<ascii-yarn>`" viene solo del **título** de la feature 14 en `feature_list.json`, y su primer criterio de
aceptación dice literalmente *"**web component client-only en `src/shared/ui/three/`**; montaje diferido
dynamic ssr:false"* — donde lo verificable y sustantivo es **la ubicación y el aislamiento client-only**,
no la API de Custom Elements del navegador.

**Propuesta concreta:** implementar `<AsciiYarn />` como componente React en
`src/shared/ui/three/ascii-yarn/` (respetando `PascalCase.tsx` + carpeta `kebab-case/` de
`docs/harness/conventions.md`), y **pedir al leader que actualice el título de la feature 14** para que
diga "componente client-only" en vez de "web component". Es una decisión de contrato: **no debe tomarla el
implementer en silencio**.

> Si el usuario/leader insiste en el custom element literal: es **viable** (React 19 lo soporta, happy-dom lo
> soporta — ambos verificados), pero entonces **sin Shadow DOM** (para no romper Tailwind/tokens) y con el
> `define()` guardeado:
> ```ts
> if (!customElements.get("ascii-yarn")) customElements.define("ascii-yarn", AsciiYarn);
> ```

---

## 6. Testabilidad — el punto más delicado, y donde más se verificó

### Hallazgo 🔴 crítico: happy-dom no tiene **ni WebGL ni canvas 2D**

Probé `happy-dom@20.11.1` (la versión instalada) directamente:

```json
{
  "happyDomVersion": "20.11.1",
  "WebGLRenderingContext_global": "undefined",
  "WebGL2RenderingContext_global": "undefined",
  "getContext_webgl2": "null",
  "getContext_webgl": "null",
  "getContext_2d": "null",          // ← no solo falta WebGL: falta también el 2D
  "customElements": "object",
  "matchMedia": "function",
  "requestAnimationFrame": "function",
  "ResizeObserver": "function"
}
```

**Lo importante es `getContext('2d') === null`.** Mucha gente asume que basta con mockear `three` porque
"lo que falta es WebGL". **Es falso acá.** `AsciiEffect` usa un canvas **2D propio** como buffer intermedio,
y su secuencia de guardas (líneas 140-152 de la fuente) tiene un agujero:

```js
const oCanvas = document.createElement( 'canvas' );
if ( ! oCanvas.getContext ) { return; }          // ✅ pasa: el método existe
const oCtx = oCanvas.getContext( '2d' );          // ← null en happy-dom
if ( ! oCtx.getImageData ) { return; }            // 💥 TypeError: lee .getImageData de null
```

Reproducido y confirmado **en una corrida real de vitest 4.1.10 + happy-dom**:

```
TypeError: Cannot read properties of null (reading 'getImageData')
```

> **Consecuencia para el implementer:** mockear solo `three` **no alcanza**. Si el código bajo test
> construye el `AsciiEffect` real, el test explota. **Hay que mockear también
> `three/addons/effects/AsciiEffect.js`.**

### Hallazgo ✅ muy útil: happy-dom soporta `prefers-reduced-motion` de forma nativa

**No hace falta mockear `matchMedia`.** happy-dom 20 expone `settings.device.prefersReducedMotion`:

```json
{ "prefersColorScheme": "light", "prefersReducedMotion": "no-preference",
  "mediaType": "screen", "forcedColors": "none" }
```

y **alimenta `matchMedia` de verdad**. Verificado:

```json
{ "default_matches": false,
  "after_mutating_settings": true,        // window.happyDOM.settings.device.prefersReducedMotion = "reduce"
  "via_constructor_settings": true,
  "no_preference_query_when_reduce": false,
  "mql_shape": { "media": "(prefers-reduced-motion: reduce)", "matches": true,
                 "addEventListener": "function", "addListener": "function", "onchange": true } }
```

Y vitest **pasa `environmentOptions.happyDOM.settings` tal cual** al constructor de `Window`
(`node_modules/vitest/dist/chunks/index.DC7d2Pf8.js` L363-375). Además `window.happyDOM` es alcanzable
desde el test. **Verificado con un `vitest run` real que pasó en verde:**

```ts
const hd = (window as unknown as { happyDOM: { settings: { device: Record<string, string> } } }).happyDOM;
expect(hd.settings.device.prefersReducedMotion).toBe("no-preference");
expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(false);
hd.settings.device.prefersReducedMotion = "reduce";
expect(window.matchMedia("(prefers-reduced-motion: reduce)").matches).toBe(true);   // ✅ pasa
```

Esto es **muy superior** a stubear `window.matchMedia` a mano: ejercita el motor de media queries real de
happy-dom en vez de un doble que siempre miente.

También verificado en la misma corrida: **`customElements.define` + `connectedCallback` + `disconnectedCallback`
funcionan** en happy-dom (por si se va por el camino del custom element).

### Patrón de mocking del repo (a respetar)

De `src/shared/ui/layout/layout.test.tsx` y los tests de rutas:

- `// @vitest-environment happy-dom` **como primera línea** (el default global es `node`).
- `vi.mock("modulo", () => ({ ... }))` en el tope del archivo.
- `vi.fn<() => T>(...)` tipado para los dobles.
- `afterEach(() => { cleanup(); ...reset })`.
- RTL: `render`, `screen`, `within`; `userEvent` importado dinámicamente dentro del test.
- `axe` de `vitest-axe` para a11y (matcher ya registrado en `vitest.setup.ts`).

### Esqueleto de test concreto

`src/shared/ui/three/ascii-yarn/AsciiYarn.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/* ------------------------------------------------------------------ *
 * 1) `three` mockeado: happy-dom no tiene WebGLRenderingContext.
 * ------------------------------------------------------------------ */
const renderSpy = vi.fn();
const setSizeSpy = vi.fn();
const disposeSpy = vi.fn();

vi.mock("three", () => {
  class Vector3 { set = vi.fn(); }
  class Object3D {
    position = new Vector3();
    rotation = { x: 0, y: 0, z: 0 };
    add = vi.fn();
    remove = vi.fn();
  }
  return {
    Scene: class extends Object3D {},
    Group: class extends Object3D {},
    Mesh: class extends Object3D { geometry = { dispose: disposeSpy }; material = { dispose: disposeSpy }; },
    PerspectiveCamera: class extends Object3D { aspect = 1; updateProjectionMatrix = vi.fn(); },
    WebGLRenderer: class {
      domElement = document.createElement("canvas");
      setSize = vi.fn();
      setPixelRatio = vi.fn();
      render = vi.fn();
      dispose = disposeSpy;
    },
    TorusKnotGeometry: class { dispose = disposeSpy; },
    CylinderGeometry: class { dispose = disposeSpy; },
    MeshStandardMaterial: class { dispose = disposeSpy; },
    PointLight: class extends Object3D {},
    AmbientLight: class extends Object3D {},
  };
});

/* ------------------------------------------------------------------ *
 * 2) AsciiEffect mockeado TAMBIÉN. Imprescindible: el AsciiEffect real
 *    hace canvas.getContext("2d") -> null en happy-dom -> TypeError
 *    "Cannot read properties of null (reading 'getImageData')".
 *    (verificado empíricamente contra AsciiEffect.js de three@0.185.1)
 * ------------------------------------------------------------------ */
vi.mock("three/addons/effects/AsciiEffect.js", () => ({
  AsciiEffect: class {
    domElement = document.createElement("div");
    setSize = setSizeSpy;
    render = renderSpy;
  },
}));

// El componente real bajo test (la impl, no la barrera `dynamic`)
import AsciiYarnImpl from "./AsciiYarnImpl";

/** Helper: happy-dom expone el motor real de media queries vía settings. */
function setReducedMotion(value: "reduce" | "no-preference") {
  (window as unknown as {
    happyDOM: { settings: { device: { prefersReducedMotion: string } } };
  }).happyDOM.settings.device.prefersReducedMotion = value;
}

beforeEach(() => setReducedMotion("no-preference"));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  setReducedMotion("no-preference");
});

describe("AsciiYarn — smoke de montaje", () => {
  it("monta sin explotar y agrega el domElement del efecto al host", async () => {
    const { container } = render(<AsciiYarnImpl />);
    const host = container.querySelector("[data-slot='ascii-yarn']");
    expect(host).toBeInTheDocument();
    // el import dinámico de three resuelve en un microtask -> waitFor
    await waitFor(() => expect(setSizeSpy).toHaveBeenCalled());
    expect(host!.firstElementChild).toBeInstanceOf(HTMLDivElement);
  });

  it("es decorativo: aria-hidden y fuera del árbol accesible", async () => {
    render(<AsciiYarnImpl />);
    await waitFor(() => expect(setSizeSpy).toHaveBeenCalled());
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("limpia al desmontar (sin fugas de rAF ni de GPU)", async () => {
    const { unmount } = render(<AsciiYarnImpl />);
    await waitFor(() => expect(setSizeSpy).toHaveBeenCalled());
    unmount();
    await waitFor(() => expect(disposeSpy).toHaveBeenCalled());
  });
});

describe("AsciiYarn — prefers-reduced-motion", () => {
  it("con 'reduce' no arranca el loop: renderiza UN solo frame estático", async () => {
    setReducedMotion("reduce");
    render(<AsciiYarnImpl />);
    await waitFor(() => expect(renderSpy).toHaveBeenCalledTimes(1));

    const before = renderSpy.mock.calls.length;
    await new Promise((r) => setTimeout(r, 50)); // varios frames de margen
    expect(renderSpy.mock.calls.length).toBe(before); // congelado: no hay más frames
  });

  it("sin preferencia, el loop avanza (más de un frame)", async () => {
    setReducedMotion("no-preference");
    render(<AsciiYarnImpl />);
    await waitFor(() => expect(renderSpy.mock.calls.length).toBeGreaterThan(1));
  });
});
```

Notas de implementación que este test **impone** sobre el componente (contrato testeable):

- El host debe llevar `data-slot="ascii-yarn"` (gancho de test estable, no depende de clases Tailwind).
- La decisión de reduced-motion debe leerse con `window.matchMedia("(prefers-reduced-motion: reduce)")`
  **en el `useEffect`** (no en el módulo), o el mock nunca aplica.
- Ideal: escuchar `mql.addEventListener("change", ...)` para reaccionar en caliente (happy-dom lo soporta,
  verificado).
- El cleanup del `useEffect` debe hacer `cancelAnimationFrame`, `renderer.dispose()`, y `dispose()` de
  geometrías y materiales.

### Sobre `axe`

El SDD §9 pide axe **en los primitivos**. `AsciiYarn` es decorativo y `aria-hidden`; una pasada de axe sobre
su contenedor es barata y no molesta, pero **el valor real está en el smoke + reduced-motion + cleanup**,
que es exactamente lo que pide el acceptance de la feature 14.

---

## 7. Peso y primer render

### Tamaños **medidos**, no estimados

Bundle real hecho con `esbuild@0.28.1` (`--bundle --minify --format=esm --platform=browser`) sobre una
escena mínima representativa (Scene, PerspectiveCamera, WebGLRenderer, TorusKnotGeometry,
MeshPhongMaterial/Standard, Mesh, PointLight, AmbientLight + AsciiEffect):

| Escenario | Minificado | gzip | brotli |
|---|---|---|---|
| three + AsciiEffect (tree-shaken) | **514.5 KB** | **129.4 KB** | **107.4 KB** |
| + `OrbitControls` | **536.5 KB** | **134.5 KB** | — |

Archivos sueltos, sin minificar:

| Archivo | Raw | gzip |
|---|---|---|
| `build/three.module.js` | 634.9 KB | 126.5 KB |
| `examples/jsm/effects/AsciiEffect.js` | 7.7 KB | 2.7 KB |
| `examples/jsm/controls/OrbitControls.js` | 39.6 KB | 8.3 KB |
| `build/three.webgpu.js` | 2121.5 KB | — | 

**Lecturas honestas de estos números:**

- El tree-shaking de `three` **es flojo**: de 634.9 KB de fuente a 514.5 KB minificados usando ~8 clases.
  El core (`WebGLRenderer` y su cadena de shaders/materiales) es esencialmente monolítico. **No cuentes con
  bajarlo importando menos cosas.**
- **~130 KB gzip / ~107 KB brotli es el coste realista** de esta feature. Para dimensionarlo: es
  comparable a todo React + React-DOM juntos. Es una decisión de producto, no un detalle.
- ❌ **Nunca importar `three/webgpu`** (2.1 MB raw, 4× el core). No aporta nada acá.
- `AsciiEffect` en sí es despreciable (2.7 KB gz). **Todo el peso es el core de `three`.**

### Cómo evitar que bloquee el primer render

La arquitectura de §3 ya lo resuelve, en **dos** niveles de diferimiento:

1. **`dynamic(..., { ssr: false })`** → el componente sale del grafo de SSR y se convierte en un chunk
   aparte. No entra al HTML inicial ni al chunk de la ruta.
2. **`await import("three")` dentro del `useEffect`** → el chunk de `three` **ni siquiera se pide** hasta
   que el componente montó en cliente, es decir después de la hidratación.
3. **`loading: () => null`** → cero placeholder, cero layout shift. Es un fondo decorativo: **no** poner
   skeleton ni spinner.

Refinamientos recomendados (baratos y de alto impacto):

- **Cortocircuito por reduced-motion antes de importar `three`.** Si el usuario pide movimiento reducido y
  la degradación es "fondo estático", **no descargues 130 KB para nada**:

  ```ts
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce && staticFallbackAvailable) return; // ni se importa three
  ```

- **`IntersectionObserver`** para montar solo cuando el host es visible (útil si el ovillo vive en el hero
  del Dashboard).
- **Degradación en mobile** (SDD §7: *"en mobile degrada — menos densidad, fondo estático, o se omite"*):
  chequear `--bp-tablet` con `matchMedia` **antes** del import y omitir el 3D en pantallas chicas. Es la
  optimización de mayor rendimiento por línea de código.
- **`dpr` acotado** (SDD §7): `renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))`. Con `AsciiEffect`
  el buffer ya se reduce por `resolution`, así que un dpr alto es puro desperdicio.
- ⚠️ **`AsciiEffect` es caro en CPU, no en GPU.** El bucle de asciificación recorre
  `width × height × resolution²` píxeles **en JS puro cada frame**. Con `resolution: 0.15` a 1920×1080 son
  ~46k píxeles/frame. **Considerar limitar a ~24-30 fps** con un acumulador de tiempo en vez de correr a
  `requestAnimationFrame` libre; visualmente el ASCII no gana nada por encima de eso y el ahorro de CPU es
  grande.
- **Nota de UX del acceptance:** la feature 14 lo quiere también como **loader global**. Un loader que
  necesita descargar 130 KB antes de aparecer es un contrasentido. Recomiendo **loader en CSS/ASCII estático**
  y reservar el 3D para el hero del Dashboard. **Decisión de producto — elevar al leader.**

---

## 8. Resumen accionable para el implementer

1. `pnpm add three@0.185.1` + `pnpm add -D @types/three@0.185.1`. **Versiones iguales y fijas.**
2. **No** tocar `next.config.ts`. **No** añadir `transpilePackages`.
3. Importar como `three/addons/effects/AsciiEffect.js` (**con `.js`**).
4. Estructura en `src/shared/ui/three/ascii-yarn/`: `AsciiYarn.tsx` (barrera `"use client"` + `dynamic ssr:false`)
   → `AsciiYarnImpl.tsx` (`"use client"` + `useEffect` + `await import("three")`) → `index.ts`.
5. Montar en el slot **ya existente** `data-slot="bg-3d"` de `src/shared/ui/layout/app-shell/AppShell.tsx`.
6. Controles de arrastre contra **`effect.domElement`**, nunca `renderer.domElement`.
7. Sobreescribir el `font-family: 'courier new'` que `AsciiEffect` inyecta inline, con el token `--font-mono`.
8. En tests: mockear **`three` Y `three/addons/effects/AsciiEffect.js`** (los dos), y usar
   `window.happyDOM.settings.device.prefersReducedMotion` en vez de stubear `matchMedia`.
9. `strResolution` → extender el tipo localmente (no `any`).
10. **Antes de codear, resolver con el leader:** (a) ¿custom element literal o componente React?
    (b) ¿se acepta desviarse de R3F que pide el SDD §3? (c) ¿el loader global también usa 3D?

---

## 9. Riesgos técnicos

| # | Riesgo | Severidad | Mitigación |
|---|---|---|---|
| R1 | `AsciiEffect` real revienta en happy-dom (`getContext('2d')` → `null`) | 🔴 Alta | Mockear el addon además de `three` (§6) |
| R2 | ~130 KB gzip de `three`; tree-shaking casi nulo | 🟠 Media-alta | `dynamic ssr:false` + import perezoso + cortocircuitos por reduced-motion/mobile |
| R3 | `feature_list.json` dice "web component" pero el SDD nunca lo pide; Shadow DOM rompería tokens/Tailwind | 🟠 Media | Decisión del leader **antes** de implementar (§5) |
| R4 | SDD §3 manda R3F+drei, pero R3F pelea con el reemplazo de DOM de `AsciiEffect` | 🟠 Media | Desviación justificada, aprobada por el leader (§1) |
| R5 | `strResolution` falta en `@types/three@0.185.1` | 🟡 Baja | Extensión de tipo local (§2) |
| R6 | `AsciiEffect` fuerza `courier new` inline, ignorando `--font-mono` | 🟡 Baja | CSS de mayor especificidad sobre `effect.domElement table` |
| R7 | Coste CPU del bucle de asciificación por frame | 🟡 Baja | Limitar a 24-30 fps + `resolution` conservadora + `dpr` acotado |
| R8 | `resolution`/`scale` inmutables tras construir | 🟡 Baja | Reconstruir el efecto al cambiar de breakpoint |
| R9 | Controles enganchados al canvas equivocado → arrastre muerto y sin error | 🟡 Baja | Siempre `effect.domElement` |
| R10 | Desincronización `three` ↔ `@types/three` (sin peerDependency que avise) | 🟡 Baja | Versiones exactas y actualizarlas juntas |

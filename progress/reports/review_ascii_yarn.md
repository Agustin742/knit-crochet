# Review — feature #14 `ascii_yarn`

> Reviewer. Fecha: 2026-07-25. Contrastado contra `docs/harness/{architecture,conventions,verification}.md`,
> `CHECKPOINTS.md`, `SDD-01 §7/§7.1/§9`, `RFC-01 §3 (D1/D2/D3)` y el `acceptance` de #14.

**Veredicto: APROBADO** — sin hallazgos bloqueantes ni mayores.

---

## 1. Verificación ejecutada por el reviewer (salida real, no la del informe)

`bash ./init.sh` -> **exit code 0**:

```
[OK]    lint verde
[OK]    typecheck verde
 RUN  v4.1.10 C:/_dev/projects/knit-crochet
 Test Files  37 passed | 1 skipped (38)
      Tests  356 passed | 6 skipped (362)
   Duration  48.08s
[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
```

`pnpm vitest run src/shared/ui/three` -> **Test Files 1 passed (1) | Tests 9 passed (9)**.

`pnpm build` -> **exit code 0**, 12/12 páginas estáticas generadas, 24 rutas + Proxy (Middleware).

**Cuadre de números.** Baseline de arranque de sesión: 338 passed | 6 skipped. Ahora: 356 | 6 -> **+18**,
y los 18 se explican exactamente: 9 tests nuevos de `ascii-yarn` + 1 test nuevo en `layout.test.tsx` +
8 tests generados por `no-hardcode.test.ts` (4 archivos nuevos x 2 casos: hex/rgb y px). Cero regresiones,
cero tests rotos. (La frase del informe §6 "el baseline era 355 tras la instalación" es incorrecta —
instalar dependencias no crea tests—, pero el total final es correcto y auditable.)

**Evidencia propia de que `three` NO entra al bundle inicial** (acceptance 3, "no bloquea el primer render"):

```
$ grep -rl "WebGLRenderer" .next/static/chunks/*.js
.next/static/chunks/316j2up0e2e0_.js
$ grep -rl "316j2up0e2e0_" .next/app-build-manifest.json .next/build-manifest.json .next/server/app/*.html
  -> not referenced in initial manifests/HTML
```

**Tokens en el CSS compilado** (verificado en `.next/static/chunks/2yz08qif6byj_.css`):

```
--bp-tablet:768px
--leading-ascii:1
table{font-family:var(--font-mono)!important}
.leading-ascii{--tw-leading:var(--leading-ascii);line-height:var(--leading-ascii)}
```

Esto importa: confirma que `--bp-tablet` **sí** se emite a `:root` en producción, así que la degradación
mobile de `useViewportSupports3d` no es un no-op silencioso (Tailwind v4 podría haberlo tree-shakeado).

---

## 2. Acceptance de #14, punto por punto

| # | Criterio | Estado | Evidencia |
|---|---|---|---|
| 1 | Componente React client-only en `src/shared/ui/three/` (**NO custom element**, D1) | **CUMPLE** | `src/shared/ui/three/ascii-yarn/AsciiYarn.tsx` es una función React con `"use client"`. `grep -rn "customElements\|attachShadow\|ShadowRoot" src/` -> **sin resultados** en todo el repo. |
| 1b | Montaje diferido `dynamic` `ssr:false` | **CUMPLE** | `AsciiYarn.tsx:14-17`. Único uso de `next/dynamic` del repo y su archivo empieza por `"use client"` (obligatorio en Next 16). El chunk de `three` queda fuera de los manifiestos iniciales. |
| 2 | Ovillo + agujas en ASCII vía `<AsciiRenderer />` de drei (D2) | **CUMPLE** | `AsciiYarnScene.tsx:3-4,64-70` usa `AsciiRenderer` + `OrbitControls` de `@react-three/drei` y `Canvas` de `@react-three/fiber`. `YarnMesh.tsx`: esfera + 6 toros + 2 agujas (cilindro + casquete). **Plan A, no hubo caída al plan B** de cablear `AsciiEffect` a mano. |
| 2b | Auto-rota y se arrastra (OrbitControls) | **CUMPLE** | `autoRotate` + `autoRotateSpeed`, `enableDamping`, sin `enabled={false}`. El arrastre se habilita con `interactive` (hero); en modo fondo va `pointer-events:none`, que es justo lo que pide el propio criterio. |
| 2c | Vive en `--z-bg-3d`, `pointer-events:none` salvo hero interactivo | **CUMPLE** | El z-index lo aporta el slot `data-slot="bg-3d"` del `AppShell` (`[z-index:var(--z-bg-3d)]`, `AppShell.tsx:45-51`) y el componente se inyecta ahí desde `AppShellClient.tsx`. Doble gate de puntero: clase del host (`AsciiYarn.tsx:50`) **y** `style.pointerEvents` del `<Canvas>` (`AsciiYarnScene.tsx:44`) para pisar el inline `auto` de R3F. |
| 3 | `prefers-reduced-motion` apaga la auto-rotación y **mantiene el arrastre** (D3) | **CUMPLE** | `autoRotate={!prefersReducedMotion}` con los controles **siempre** `enabled` (`AsciiYarnScene.tsx:56-62`). El test "apaga la auto-rotación pero mantiene el arrastre con 'reduce'" verifica **las tres cosas**: `data-auto-rotate="false"` + `data-enabled="true"` + canvas con `pointer-events: auto`. No es un test de "monta y ya". Hay además test del caso positivo (`autoRotate=true` sin preferencia) y de reacción en caliente al cambio de la media query. |
| 3b | No bloquea el primer render | **CUMPLE** | `dynamic` con `loading: () => null` + chunk aislado verificado arriba. |
| 4 | Verificación SDD §9: smoke + reduced-motion + init.sh + build, **sin testear píxeles** | **CUMPLE** | 9 tests de comportamiento/contrato. **No hay ni un test de apariencia o fidelidad visual** — revisado archivo por archivo. Mocks puestos en el borde (las dos librerías), no del componente propio; `YarnMesh` y los elementos intrínsecos de three se renderizan de verdad. |

---

## 3. Puntos de atención del mandato

**D1 — OK.** Componente React en `src/shared/ui/three/`. Cero `customElements.define`, cero Shadow DOM.

**D2 — OK, con evidencia real (no inventada).** `pnpm-lock.yaml` modificado, **no existe `package-lock.json`,
`npm-shrinkwrap.json` ni `yarn.lock`**. Instalado: `three@0.185.1`, `@react-three/fiber@9.6.1`,
`@react-three/drei@10.7.7`, `@types/three@0.185.1` (dev). Usa `<AsciiRenderer />` de drei (plan A).
Contrasté **yo mismo** las afirmaciones técnicas del informe §2 contra `node_modules`:

- `drei/core/AsciiRenderer.js` envuelve `AsciiEffect` de `three-stdlib@2.36.1` (presente en `node_modules/.pnpm/`). OK
- Pone `effect.domElement.style.pointerEvents = 'none'` y `gl.domElement.style.opacity = '0'` -> el arrastre lo
  sigue recibiendo el canvas WebGL. OK (por eso `OrbitControls` funciona sin pasarle `domElement`).
- `fgColor` se asigna como string CSS (`effect.domElement.style.color = fgColor`) -> `"var(--accent)"` es
  legítimo y lo resuelve el navegador. OK, vía token-first correcta.
- La justificación del fondo negro opaco es **verificable y correcta**: en `AsciiEffect.js`,
  `if (iAlpha == 0) fBrightness = 1` y `iCharIdx = floor((1-fBrightness)*(len-1))`, invertido después.
  Con negro opaco (brillo 0) -> idx 9 -> invert -> idx 0 -> `" "` (invisible); con canvas transparente ->
  brillo forzado a 1 -> invert -> `"@"` en todo el fondo. El razonamiento del informe es exacto, no adornado.

**D3 — OK.** Ver fila 3 de la tabla. El test cubre las dos mitades del criterio.

**Aislamiento client-only — OK.** `grep -rn "from \"three\|from \"@react-three\|three/addons\|three-stdlib" src/`
devuelve **exactamente 2 líneas**, ambas en `src/shared/ui/three/ascii-yarn/AsciiYarnScene.tsx`.
`AppShell.tsx` está limpio de `three` (recibe `background?: ReactNode`, sigue siendo presentación pura;
quien conoce la capa 3D es `AppShellClient.tsx`, capa de feature y ya cliente). La dirección de dependencia
`features/ -> shared/ui` se respeta. El `dynamic(..., { ssr:false })` vive en archivo `"use client"`.

**Cero hardcode — OK.** Los 4 archivos con estilos se añadieron a `no-hardcode.test.ts:24-27` y pasan
(8 tests nuevos verdes). Revisé a mano `AsciiYarn.tsx`, `AsciiYarnScene.tsx`, `YarnMesh.tsx`,
`useViewportSupports3d.ts` y `AppShell.tsx`: sin hex, sin `rgba(`, sin literales `px`. Los números de
`YarnMesh`/`AsciiYarnScene` son unidades de mundo 3D e intensidades de luz, no unidades CSS — correcto que
no cuenten como hardcode visual. El breakpoint se lee del token `--bp-tablet` en runtime.

**No se testean píxeles — OK.** Ningún test de apariencia. Se respeta SDD §9 (la fidelidad visual queda
como revisión humana).

**Primer render — OK.** Evidencia propia arriba (chunk aislado + `loading: () => null`).

---

## 4. Checkpoints

- **C1: [x]** — Arnés completo; `bash ./init.sh` exit code 0.
- **C2: [x]** — Exactamente **1** feature en `in_progress` (#14, correcto: el implementer no se auto-aprobó,
  cumpliendo su regla dura). Ninguna feature `done` sin tests. `progress/current.md` describe la sesión activa.
  (Ver hallazgo menor M1: le quedan restos de la sesión anterior.)
- **C3: [x]** — No hay backend tocado en esta slice (`src/proxy.ts`, `app/api/**`, `features/*/api` intactos;
  `git status` sólo lista UI/design-system/estado). Se respeta feature-first, la UI no toca DB, la capa 3D
  está aislada. Dependencias nuevas **justificadas explícitamente en `feature_list.json` #14 (D2)**.
  Sin `console.log`, sin TODOs, sin `any`, sin secretos.
- **C4: [x]** — lint + typecheck verdes; 356 passed | 6 skipped; los módulos con lógica no trivial
  (los dos hooks + el gate de puntero) tienen test de camino feliz **y** de camino alterno.
- **C5: [~]** — Sin artefactos sospechosos nuevos (`?? src/shared/ui/three/` y los `progress/reports/*.md`
  son el trabajo legítimo). Falta la entrada en `progress/history.md` y marcar #14 como `done`: **son tareas de
  cierre del leader, no del implementer**. No bloquean esta aprobación.

---

## 5. Hallazgos

### Bloqueantes

**Ninguno.**

### Mayores

**Ninguno.**

### Menores

**M1 — `progress/current.md` arrastra restos de la sesión anterior.** Conviven la sección nueva
("IMPLEMENTADA y verde, 356 passed") con dos bloques viejos que la contradicen: "Estado del proyecto ->
init.sh VERDE: 338 passed | 6 skipped" y "Próximo paso — feature #14", que sigue describiendo el plan
**derogado** (web component `<ascii-yarn>`, `AsciiEffect` a mano, "congela con prefers-reduced-motion" —
justo lo que D3 cambió por "apaga auto-rotación, mantiene arrastre"). Un agente futuro que lea sólo esa
sección implementará la decisión equivocada. Acción (leader, al cerrar): borrar el bloque "Próximo paso"
y actualizar el conteo.

**M2 — Las reglas de render del SDD §7.1 se aplican al host, pero el ASCII real no las lee.**
`AsciiEffect` fija **inline sobre su `<table>`** `fontFamily`, `fontSize`, `lineHeight`, `letterSpacing` y
`whiteSpace` (verificado en la fuente, `AsciiEffect.js` líneas 40-47). Las clases del host
(`font-mono leading-ascii whitespace-pre`, `AsciiYarn.tsx:49`) **no llegan a la tabla**; sólo lo hace el
override explícito `[&_table]:font-mono!`. En la práctica **no hay defecto**: la librería calcula
`fFontSize === fLineHeight === 2/resolution`, es decir ratio de línea exactamente 1, y pone `white-space: pre`
inline, así que el §7.1 se cumple igual. Pero el test que afirma que el host tiene `leading-ascii` **no es
prueba** de que el ASCII se renderice con `line-height: 1`. No pido cambio de código; sí que quede escrito
para que nadie lo lea como garantía.

### Nits

**N1 — `data-enabled="true"` del test de D3 comprueba el default del mock, no un valor que pase el componente.**
El componente no pasa `enabled` y el mock lo defaultea a `true` (`ascii-yarn.test.tsx:34`). Sigue siendo una
red útil (si alguien escribiera `enabled={false}` el test se pondría rojo, que es exactamente la regresión
que hay que evitar), pero la aserción sería más fuerte cubriendo también `enableRotate`, que es lo que
técnicamente habilita el arrastre.

**N2 — `getSnapshot()` de `useViewportSupports3d` llama a `getComputedStyle` en cada render.** Fuerza un
recálculo de estilo por render de `AsciiYarn`. Irrelevante a esta escala; si algún día hay varias instancias,
cachear el resultado por media query.

**N3 — Se sobreescribe la fuente a IBM Plex Mono pero el `letter-spacing` sigue calibrado para Courier New.**
`AsciiEffect` elige el `letterSpacing` negativo por tramos asumiendo métricas de "courier new". Ambas son
monospace con avance ~0.6em, así que el riesgo es bajo, pero si la retícula ASCII sale desalineada o clipada
por la derecha (`overflow:hidden` en la celda), la causa está ahí. Se detecta en la revisión visual humana.

**N4 — Imprecisión en el informe.** `impl_ascii_yarn.md` §6 dice que el baseline tras instalar era
"355 passed"; instalar dependencias no crea tests. El total (356) es correcto y cuadra (338 + 9 + 1 + 8).

---

## 6. Lo que este review reconoce como bien hecho

- La verificación empírica de D2 contra `node_modules` (§2 del informe) es **real y reproducible**: la
  contrasté línea a línea con la fuente de `drei` y de `three-stdlib` y no encontré ni una afirmación
  inventada. Incluye el hallazgo no obvio de que `enabled={false}` también apagaría la auto-rotación, que es
  precisamente lo que justifica hacer el gate por `pointer-events` y no por `enabled`.
- El doble gate de `pointer-events` (host + inline del `<Canvas>`) está bien razonado y comentado con el
  porqué, en la línea de `conventions.md` ("comentarios sólo para el porqué no obvio").
- `useSyncExternalStore` en vez de `useState` + `useEffect` es la API correcta para `matchMedia` y evita el
  lint `react-hooks/set-state-in-effect`.
- La degradación mobile leyendo el token con **fail-open** (si no hay token, se monta) es la política
  defensiva correcta: un fallo de lectura degrada a "funciona", no a "pantalla vacía".
- El implementer **no se auto-aprobó** ni tocó `feature_list.json` por su cuenta. Protocolo respetado.

---

## 7. Deuda técnica a registrar (ninguna bloquea)

Se confirman las 6 del informe §8; se priorizan y se añaden 2:

1. **`frameloop="always"`: la escena re-asciifica cada frame incluso con reduced-motion.** El bucle de
   asciificación es JS puro por frame. Candidata real a `frameloop="demand"` (drei invalida en `change`, el
   arrastre seguiría) o a limitar a ~24-30 fps. **La más relevante de todas: es coste de batería continuo en
   todas las páginas privadas.**
2. **Segunda instancia 3D en #19 `dashboard_ui`.** Hoy el ovillo es fondo global del `AppShell`. Al llegar el
   hero del Dashboard hay que decidir entre reemplazar el fondo en esa ruta o montar dos escenas — dos
   `AsciiEffect` simultáneos duplican el coste del punto 1. **Decidir antes de empezar #19.**
3. **A11y del modo `interactive` (nueva).** El hero será arrastrable con puntero pero es `aria-hidden` y su
   canvas no es focusable: **no habrá forma de rotarlo por teclado**. Como pieza decorativa de marca es
   defendible (y no viola axe, porque no hay descendiente focusable dentro del `aria-hidden`), pero conviene
   decidirlo explícitamente en #19 y no por omisión.
4. **`resolution` es inmutable tras construir el `AsciiEffect`**: cambiar densidad entre tablet y desktop
   exigiría remontar `<AsciiRenderer>` vía `key`.
5. **`three` y `@types/three` pinneados a 0.185.1 sin peer dependency que avise**: actualizar siempre juntos.
6. **Ajuste fino visual pendiente** (rampa, densidad, encuadre, velocidad): revisión humana contra el
   navegador, fuera de alcance por RFC-01 §7. Ver N3 si la retícula sale desalineada.
7. **Sin `glow`** (existe `--shadow-glow`): quedaría como `text-shadow` por token sobre el host.
8. **`tsconfig.tsbuildinfo` trackeado en git** (pre-existente, ya es la deuda 4 del `current.md`).

---

## 8. Acciones para el leader

1. Marcar **#14 `ascii_yarn` -> `done`** en `feature_list.json`.
2. Limpiar `progress/current.md` (hallazgo **M1**): el bloque "Próximo paso — feature #14" describe el plan
   derogado (web component + "congela") y contradice a D1/D3.
3. Añadir la entrada de sesión en `progress/history.md` y escribir el informe de síntesis
   `progress/informs/5.informe-ascii_yarn.md`.
4. Registrar las deudas 1, 2 y 3 de §7 como notas de alcance de **#19 `dashboard_ui`**.

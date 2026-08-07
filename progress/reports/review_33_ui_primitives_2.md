# Review — feature #33 `ui_primitives_2`

> Reviewer, 2026-08-06. Slice de **UI**: aplica el checklist visual del SDD §9
> (RTL + `user-event` + `axe` + `init.sh` + `build`). **No aplica smoke de ruta**: no hay página.
> Todo lo que sigue está **verificado por mí**, no leído del informe. `git status --porcelain` quedó
> **idéntico** antes y después de la revisión (mutaciones sobre copias en directorio ignorado, borradas).

**Veredicto: APPROVED — 0 bloqueantes.**

---

## Checkpoints

- C1: [x] — arnés completo; `bash ./init.sh` exit 0.
- C2: [x] — sólo **#33** en `in_progress`; `progress/current.md` describe la sesión activa y está al día.
- C3: [x] — `shared/ui` sigue siendo presentación pura (ni DB, ni fetch, ni import de `features/`);
  cero `console.*`, cero `TODO/FIXME`, cero `any`; `package.json` sin tocar (ninguna dependencia nueva).
- C4: [x] — lint + typecheck verdes; **60 passed | 3 skipped** archivos, **756 passed | 13 skipped** tests.
- C5: [ ] — **no bloqueante y no es del implementer.** No hay artefactos sospechosos sin trackear, pero
  `progress/history.md` todavía no tiene entrada de esta sesión y #33 sigue en `in_progress`: los dos son
  pasos de **cierre del leader**.

---

## 1. Números declarados — confirmados uno a uno

| Qué | Declarado | Medido por mí | |
|---|---|---|---|
| `bash ./init.sh` | verde | **exit 0** | OK |
| Archivos de test | 60 passed / 3 skipped | **60 passed / 3 skipped (63)** | OK |
| Tests | 756 passed / 13 skipped | **756 passed / 13 skipped (769)** | OK |
| Delta sobre baseline 54/602 | +6 archivos, +154 tests | **+6 / +154** | OK |
| `pnpm build` | OK | **OK** (15 páginas estáticas, 24 rutas, proxy) | OK |
| Smokes skipped y compilando | 3 | **3** | OK |

**#18 no se rompió.** Su trabajo (`src/features/projects/`, `src/app/api/projects/`, smoke de Neon, PRD,
RFC-05) ya está **commiteado** (`0351c4d`, `2cbfa00`, `4c7d323`) y ninguno de sus archivos aparece en el diff
de esta slice. Sus rutas compilan en el `build` y sus tests están dentro de los 756 verdes.

---

## 2. EL FOCO PRINCIPAL — el guardrail de no-hardcode reescrito

### 2.1 ¿Cubre AL MENOS todo lo que cubría antes? **SÍ. Verificado por enumeración.**

Comparé la lista fija de `HEAD:src/shared/ui/primitives/no-hardcode.test.ts` (**18 archivos**) contra el
resultado real del recorrido nuevo, ejecutando el mismo algoritmo del test sobre el árbol actual:

```
TOTAL barrido: 54 archivos
MISSING FROM SWEEP: []      <- los 18 de la lista vieja siguen dentro, sin excepción
```

**Los 18 que cubría antes y sigue cubriendo:**
`primitives/button/Button.tsx`, `primitives/button/button.variants.ts`, `primitives/card/Card.tsx`,
`primitives/card/card.variants.ts`, `primitives/field/Field.tsx`, `primitives/field/Input.tsx`,
`layout/account-band/AccountBand.tsx`, `layout/account-band/account-band.variants.ts`,
`layout/app-shell/AppShell.tsx`, `layout/archive-nav/ArchiveNav.tsx`,
`layout/archive-nav/archive-nav.variants.ts`, `layout/bottom-nav/BottomNav.tsx`,
`layout/bottom-nav/bottom-nav.variants.ts`, `three/ascii-yarn/AsciiYarn.tsx`,
`three/ascii-yarn/AsciiYarnScene.tsx`, `three/ascii-yarn/asciiFromPixels.ts`,
`three/ascii-yarn/createYarnScene.ts`, `three/ascii-yarn/useViewportSupports3d.ts`.

**Los 36 que cubre AHORA y antes no:** los 20 de esta slice
(`primitives/dialog/*`, `primitives/progress-bar/*`, `primitives/skeleton/*`, `primitives/toggle/*`,
`feedback/empty-state/*`, `feedback/error-state/*`, `feedback/state-panel/*`, `feedback/index.ts`,
`lib/usePrefersReducedMotion.ts`) **más 16 que llevaban meses sin vigilar**: los 12 barrels
(`index.ts` raíz, `primitives/index.ts`, `layout/index.ts`, `three/index.ts`, `three/ascii-yarn/index.ts`
y los `index.ts` de button/card/field/account-band/app-shell/archive-nav/bottom-nav),
`layout/nav-items.ts`, `lib/cn.ts` y `three/ascii-yarn/usePrefersReducedMotion.ts`.
Excluye, correctamente, los `*.test.*` (citan clases a propósito) y los `*.d.ts`.

**Es un superconjunto estricto. No se cayó nada.**

### 2.2 ¿Barre de más y por eso relajó la regla? **NO. El criterio de detección no se tocó.**

Comparé las tres expresiones de detección entre `HEAD` y la versión nueva. Son **idénticas byte a byte**
(`HEX_COLOR`, `RGB_COLOR`, `PX_LITERAL`), y los cuerpos de las dos aserciones por archivo también.
**No hay allowlist, no hay lista de excepciones, no hay `skip`, no hay `if` de escape.** La única diferencia
es de dónde sale la lista de entrada. Que 16 archivos que nunca habían estado vigilados entren y el
guardrail siga verde confirma lo que el informe dice en §2.6: el barrido no arrastró ningún arreglo ajeno a
la slice.

### 2.3 ¿Detecta lo que detectaba? **SÍ, en archivos viejos Y nuevos. Reproducido.**

La técnica de alias no alcanza aquí (el guardrail lee ficheros reales por `import.meta.url`), así que usé
otra: **copié el árbol `src/shared/ui` completo a un directorio ignorado, muté la copia y corrí el test real
sobre ella** con un config alternativo de Vitest. Baseline de la copia limpia: **111 passed**, exactamente
los 111 declarados (54 archivos x 2 + 3 tests de integridad del barrido).

Inyecté cinco hardcodes: **tres en archivos que ya estaban en la lista fija** y **dos en archivos nuevos de
#33 que la lista fija no cubría**. Cayeron los cinco:

```
x has no raw hex/rgb colors in primitives\button\button.variants.ts      <- lista vieja (hex)
x has no raw px sizes in layout\bottom-nav\bottom-nav.variants.ts        <- lista vieja (13px)
x has no raw hex/rgb colors in three\ascii-yarn\createYarnScene.ts       <- lista vieja (rgba)
x has no raw px sizes in feedback\state-panel\state-panel.variants.ts    <- NUEVO (7px)
x has no raw hex/rgb colors in primitives\toggle\toggle.variants.ts      <- NUEVO (hex)
Tests  5 failed | 106 passed (111)
```

Los tres primeros prueban que **no perdió poder**; los dos últimos prueban que **el cambio de radio sirve
para algo**: con la lista fija esos dos archivos habrían quedado mudos hasta que alguien se acordara.

### 2.4 El seguro del barrido: también lo verifiqué

Un recorrido roto devuelve cero archivos, cero infractores y **verde**. Rompí la recursión:

```
x encuentra los fuentes de shared/ui        AssertionError: expected 1 to be greater than 20
x llega a las cuatro capas de componentes   AssertionError: expected [ 'index.ts' ] to include 'primitives\button\button.variants.ts'
Tests  2 failed | 3 passed (5)
```

El seguro funciona.

### 2.5 El movimiento de carpeta no dejó nada huérfano

`git mv` correctamente registrado (`RM primitives/no-hardcode.test.ts -> no-hardcode.test.ts`). `UI_DIR` se
resuelve con `new URL("./", import.meta.url)` desde la ubicación nueva y apunta a `src/shared/ui/`.
No hay ningún `import` a la ruta vieja desde otro test ni desde código. `progress/current.md` documenta el
movimiento. Las referencias que quedan a la ruta vieja están en `progress/history.md` y `progress/informs/`,
que son **registro histórico** y describen el pasado correctamente.

### 2.6 Veredicto sobre el cambio de radio

**Bien hecho, y salda de verdad la familia de deudas 40/43/71 para este guardrail.** Pasó de vigilar 18
archivos nombrados a mano a vigilar los 54 fuentes reales de `shared/ui`, sin tocar el criterio de detección
y con tres tests que impiden que el barrido se apague en silencio. **El leader debería asentarlo**: es la
cuarta vez que el patrón "lista fija que hay que acordarse de actualizar" aparece en este repo, y es la
primera vez que uno de los tres guardrails se cura de raíz.

---

## 3. Segundo cambio de radio — la promoción de `usePrefersReducedMotion`

- La implementación se movió **sin cambiar una línea de lógica**: `subscribe`, `getSnapshot`,
  `getServerSnapshot` y `useSyncExternalStore` son los mismos; sólo cambió el docblock.
- `three/ascii-yarn/usePrefersReducedMotion.ts` quedó en **una línea de re-exportación**.
  `AsciiYarnScene.tsx` **no aparece en el diff**: sigue importando `./usePrefersReducedMotion` como siempre.
- **La capa 3D sigue aislada.** `three` se importa **sólo** desde `three/ascii-yarn/AsciiYarnScene.tsx` y
  `three/ascii-yarn/createYarnScene.ts`. Ni el hook promovido, ni la re-exportación, ni ningún primitivo
  nuevo lo tocan.
- **`Skeleton` no arrastra `three` a su grafo**: importa `@/shared/ui/lib/usePrefersReducedMotion` **por
  ruta directa**, no por el barrel `@/shared/ui` (que sí reexporta `./three`). Correcto y deliberado.
- **`ascii-yarn.test.tsx` mide lo mismo que antes**: no está modificado, mockea sólo `three` y conduce el
  hook **real** moviendo `happyDOM.settings.device.prefersReducedMotion`. Sigue verde en la corrida completa.
- `Skeleton.test.tsx` usa **exactamente esa misma técnica** (mismo `HappyDomWindow`, misma función
  `setReducedMotion`, mismos valores `reduce`/`no-preference`). No es un doble del hook: es el hook.

---

## 4. Los seis componentes

### 4.1 `Dialog` — los tres invariantes, **verificados por mutación, no leídos**

Copié el componente, muté la copia y corrí el test real contra ella. Los tres invariantes se caen, con los
**mismos nombres de test y los mismos conteos** que declara el informe:

| Invariante | Mutación | Rojos | Declarado |
|---|---|---|---|
| 1 — foco atrapado | el manejador ignora Tab | **3** (tabular en círculo, tabular hacia atrás, el ciclo recorre TODAS las paradas) | 3 OK |
| 2 — Escape cierra | se borra la rama de Escape | **4** (cierra con Escape, desde cualquier control de dentro, el foco vuelve a quien lo abrió, al disparador REAL) | 4 OK |
| 3 — foco al disparador | se borra el cleanup que reenfoca al disparador | **3** (vuelve a quien lo abrió, aunque se cierre desde el control de cierre, al disparador REAL) | 3 OK |

El test del ciclo no copia la lista de paradas: la **deriva del DOM del diálogo** y comprueba que la parada
siguiente a la última es la primera. El de "disparador REAL" abre con teclado y comprueba que el foco no
cae en el otro botón de la página. `aria-modal="true"` + `role="dialog"` + nombre accesible anclados al
literal (donde el literal *es* el contrato, correcto).

**El portal: la conclusión es correcta y el razonamiento es verificable — pero la causa que cita está mal.**
Lo comprobé:

- **Es cierto que el `Dialog` en el flujo quedaría enjaulado.** El contenido de página vive dentro del
  `main` del shell, que lleva `relative flex-1 z-(--z-base)`
  (`src/shared/ui/layout/app-shell/AppShell.tsx:67`). Ese `main` es **posicionado con z-index distinto de
  `auto`**, o sea **crea contexto de apilamiento**: todo descendiente suyo queda encerrado en el escalón
  `--z-base` = **1**, mientras `ArchiveNav` y `BottomNav` pintan en `z-(--z-nav)` = **100** desde fuera. El
  panel quedaría debajo del nav **aunque su `--z-modal` valga 300**. El portal al `body` es
  **obligatorio**, no una preferencia.
- **Pero el archivero no usa `transform`, y además no es ancestro del diálogo.** El archivero crea contexto
  de apilamiento con una propiedad arbitraria de `filter: drop-shadow(...)`
  (`archive-nav.variants.ts:72` y `:133`) — un `filter` distinto de `none` también lo crea —, y sus hojas
  son hermanas del `main`, no ancestros. La jaula real es el `main`, no el archivero.
- Los tokens existen y valen lo que el informe dice: `--z-nav: 100`, `--z-overlay: 200`, `--z-modal: 300`
  (`globals.css:232,247,248`), y compilan (ver §7).

**El hallazgo hay que ficharlo, pero con la causa correcta** (ver O1). El código está bien; la prosa que lo
explica señala el sitio equivocado, y eso es justo lo que hace que alguien lo "arregle" mañana.

Un test fija el portal en las dos direcciones (el diálogo **no** está en el `container` de RTL **y sí** en
`document.body`), y el `axe` corre sobre `document.body`, no sobre el `container` — que es REGLA 7 aplicada
bien: medir el contenedor no habría medido nada.

### 4.2 `Toggle` — superponible de verdad

- **Permite varios activos a la vez, comprobado sobre el DOM**: el arnés del test monta los **dos
  consumidores reales de RFC-02 §1** (selector de métrica con 3 combinables, botones de tipo con 2) con el
  estado arriba, y asierta el mapa completo de `aria-pressed` de los tres botones tras encender dos:
  Horas/Proyectos/Metros los tres en "true". Apagar uno deja los otros dos encendidos. Admite el conjunto
  vacío.
- **`aria-pressed` refleja el estado de cada uno, en los DOS valores.** La mutación clásica (que hace
  desaparecer el atributo cuando está apagado) tira **5** tests — el conteo declarado. Y la mutación a
  comportamiento de `Tabs` (una opción encendida ya no se puede apagar) tira **3**. Las dos direcciones
  cubiertas.
- Un test asierta que **no aparece** `tablist`/`tab`/`radiogroup`/`radio` en el árbol: si alguien "mejora"
  el control a selección única, se ve.
- **"Controlado + grupo tonto" sirve a los dos consumidores.** RFC-02 §1 pide métrica *conmutable y
  superponible* con **default horas** y filtro de tipo *combinable*: en los dos casos la selección es un
  conjunto que la página ya tiene que conocer (alimenta la query y decide qué cards pinta). Un estado
  interno por botón obligaría a la página a reconstruir ese conjunto espiando N callbacks, y permitiría que
  el botón y la pantalla discrepen tras un reset o una carga desde la URL. La decisión es correcta y está
  testeada ("no guarda estado propio: sin el prop, no se mueve").
- `ToggleGroup` como `role="group"` con nombre es lo correcto: da el "de qué conjunto son" sin prometer
  exclusividad. `type="button"` fijo (no configurable) cierra la trampa de las deudas 39/43.
- **Verificado contra el CSS realmente compilado**, no contra el string de `cva` (ver §7).

### 4.3 `ProgressBar` — el acotado llega a `aria-valuenow`

Mutación (el clamp devuelve el valor crudo) produce **6 rojos**, el conteo declarado, y el sexto **es
`axe`**:

```
x acota negativo / por encima del máximo / NaN / infinito positivo / infinito negativo
x no tiene violaciones de axe en sus estados relevantes
Tests  6 failed | 9 passed (15)
```

Cada caso fuera de rango asierta **las dos mitades**: `aria-valuenow` **y** el ancho real del relleno leído
del DOM. Acotar el ancho y no el atributo dejaría el DOM mintiéndole a un lector de pantalla, y aquí eso
está cerrado por dos vías independientes (la aserción explícita y `axe`, que marca un `aria-valuenow` fuera
de `valuemin`/`valuemax`). Menos 20 va a 0, 140 va a 100, y `NaN` e infinitos van a 0. El criterio de mandar
los no finitos a 0 y no a 100 está bien argumentado: llenar la barra ante un dato roto diría "terminado".
`label` obligatorio (nombre accesible) y relleno `aria-hidden` para no anunciar el dato dos veces. Correcto.

### 4.4 `Skeleton` — el argumento del JS es válido

**El argumento se sostiene.** En RTL con happy-dom **no hay hojas de estilo aplicadas**: la media query de
`globals.css` existe pero no produce ningún efecto observable desde el DOM, así que un test no puede
distinguir "animado" de "quieto". Se *podría* medir el CSS compilado (es lo que hace
`src/app/globals-css.test.ts` con postcss), pero eso demostraría que **la regla existe**, no que **este
componente la obedece** — que es lo que hay que vigilar. Resolverlo en JS y asertar sobre el elemento
renderizado es la decisión correcta, y es coherente con lo que ya hizo la capa 3D en D3.

Las dos direcciones caen (2 rojos cada una, los conteos declarados), más un tercer test que comprueba que
las dos clases son **excluyentes en las tres formas** — sin él, un `cn()` que dejara pasar ambas daría verde
en los dos primeros y animaría igual. El mock sigue la técnica ya establecida en `ascii-yarn.test.tsx` y
ejercita el hook real.

La deuda 86 que el implementer propone es **real y la confirmé** contra el CSS compilado: la animación de
`animate-pulse` trae duración y curva por defecto de Tailwind, y ninguna de las dos sale de los tokens de
movimiento del sistema.

### 4.5 `EmptyState` / `ErrorState` — la base compartida gana

**Sí gana, y está justificada con una medida, no con una opinión.** Un test asierta que las clases de
**layout** de los dos paneles son idénticas y que las de **marco** no lo son: eso es literalmente la
condición que hace que compartir base sea correcto — misma composición, distinto tono. Si mañana divergen
en layout, ese test cae y avisa de que la base dejó de servir. Es la forma buena de hacer esta apuesta.

- `StatePanel` **no es pública** y el ancla de superficie lo demuestra: añadirla al barrel pone el test en
  rojo (lo reproduje, ver §5).
- `ErrorState` **admite reintentar** y sólo monta el botón si hay `onRetry` (test: "sin onRetry no monta
  ningún botón muerto"), es alcanzable y activable con teclado, y su `type="button"` está asertado.
  Un `action` propio gana sobre el reintento (test: un solo botón en el árbol).
- Diferencias correctas: `role="alert"` sólo en el error (test: el vacío **no** tiene `alert`), marco en
  `--danger`, `section` + `aria-labelledby` en vez de `div` (sobre un `div` sin rol el atributo estaría
  prohibido y `axe` lo marcaría), `headingLevel` como prop.
- `axe` limpio en los cuatro estados (vacío con y sin acción, error con y sin reintento).

---

## 5. REGLA 2 — las dos piezas

**(a) Ancla al literal, y detecta lo que SOBRA.** Reproduje las dos direcciones sobre
`public-api.test.ts`:

```
quitar el export de error-state del barrel  -> Tests 2 failed | 2 passed (4)
añadir StatePanel (interno a propósito)     -> Tests 1 failed | 3 passed (4)
```

Los conteos declarados. Usa `toEqual` sobre la lista ordenada, no `toContain`: **cae al quitar y al añadir**.
Lo mismo con `DIALOG_SIZES`, `PROGRESS_TONES`, `SKELETON_SHAPES`, `STATE_PANEL_TONES` y
`STATE_PANEL_HEADING_LEVELS`, todos derivados del objeto que alimenta la `cva` en vez de copiados a mano.

**(b) Comportamiento derivando.** El cuarto test del ancla (que el barrel raíz reexporte todo lo de sus
capas) **recorre las capas** en vez de copiar nombres: si mañana una capa exporta algo y el barrel raíz se
olvida, cae solo. El ciclo de tabulación del `Dialog` deriva las paradas del DOM. El `Skeleton` deriva las
formas de `SKELETON_SHAPES`. Correcto.

---

## 6. REGLA 3 — los números pegados cuadran con los reales

Reproduje **8 de los 11 gates** de forma independiente; los otros 3 también (el barrido en §2.3-2.4 y las
anclas de pertenencia por el mismo mecanismo que §5). **Todos los conteos y todos los nombres de test
coinciden exactamente con lo declarado.** A diferencia del precedente de #31 (declaró 9 rojos donde salían
12), aquí no hay ni una discrepancia:

| Gate | Declarado | Medido |
|---|---|---|
| Dialog inv. 1 | 3 | **3** OK |
| Dialog inv. 2 | 4 | **4** OK |
| Dialog inv. 3 | 3 | **3** OK |
| Toggle aria-pressed | 5 | **5** OK |
| Toggle superponible | 3 | **3** OK |
| Skeleton dir. A | 2 | **2** OK |
| Skeleton dir. B | 2 | **2** OK |
| ProgressBar acotado | 6 (incl. axe) | **6, con el axe dentro** OK |
| public-api quitar | 2 | **2** OK |
| public-api añadir | 1 | **1** OK |
| no-hardcode barrido roto | 2 | **2** OK |
| Verdes de partida | 19/15/8/15/111/4 | **19/15/8/15/111/4** OK |

**Archivos mutados byte a byte idénticos: confirmado.** `git status --porcelain` es idéntico al de antes de
la revisión — y no lo es sólo porque el implementer restauró: mis propias mutaciones se hicieron sobre
copias en un directorio ignorado, ya borrado.

---

## 7. REGLA 7 en versión UI — ningún gate corre sólo sobre el doble

Busqué específicamente tests que asertaran sobre el string crudo de `cva` o sobre un mock del componente.
**No hay ninguno.** Lo que hay es lo contrario:

- `Dialog.test.tsx:116` compara la salida de `cn(dialogPanelVariants({}))` contra el `className` **del nodo
  del DOM**.
- `ProgressBar.test.tsx:104,109` compara el `className` del relleno real contra la salida de `cn()`.
- `Skeleton.test.tsx:63-77` idem, y el ancho de la barra se lee del estilo del elemento real.
- El `axe` del `Dialog` corre sobre `document.body` porque el portal saca el nodo del `container`.
- El `Skeleton` ejercita el hook **real**, no un `vi.mock` suyo.

**Y el CSS compilado: lo verifiqué yo en `.next/static/chunks/*.css`**, no me fié del informe. Están las dos
reglas condicionadas a `aria-pressed` (fondo y primer plano, con sus `var(--color-…)`), las dos utilidades
de z-index del velo y del panel resolviendo a `var(--z-overlay)` y `var(--z-modal)`, las dos de animación
del skeleton, y el velo semitransparente con su `color-mix`. Las capas del `Dialog` y el estado activo del
`Toggle` **existen en producción**, no sólo en el atributo `class`. Esto es exactamente el espíritu de la
regla.

---

## 8. REGLA 1 y cero hardcode

- **`pnpm build` verde** y `src/app/globals-css.test.ts` verde: compila `globals.css` con postcss, comprueba
  que no se emite ningún `var()` con comodín y planta carnadas en `progress/`, `docs/` y `template/` para
  demostrar que siguen fuera del escaneo. `globals.css:17-19` mantiene los tres `@source not`.
- **El informe vive en `progress/`, que está excluido, y el guardrail lo demuestra.** No lo esquiva.
- **Clases literales en los tests nuevos**: `bg-brand-cream`, `bg-surface-sunken`, `bg-surface-raised`,
  `bg-surface` y `custom-class`. Todas siguen el precedente ya establecido (`Button.test.tsx:74`,
  `Card.test.tsx:25,37`, y el mismo `custom-class` en los dos), son clases que los archivos de producción
  **ya emiten** o, en el caso de `custom-class`, ni siquiera son una utilidad de Tailwind. No añaden ni una
  regla al CSS.
- Donde hacía falta un **prefijo** (que sí podría ensuciar), el implementer lo arma por concatenación en
  runtime. Correcto y coherente con `canonical-tailwind-classes.test.ts`.
- **Cero hardcode: 111/111 verdes sobre los 54 archivos.** Comprobé además que **todos** los tokens que
  consumen las piezas nuevas existen en `globals.css`: `--border` (48), `--danger` (49), `--success` (50),
  `--brand-cream` (34), `--surface-raised` (40), `--surface-sunken` (41), `--fg-inverse-muted` (45),
  `--space-4/5/12`, `--border-width` (188), `--border-width-heavy` (189), `--dur-fast` (222),
  `--dur-base` (223), `--z-overlay` (247), `--z-modal` (248), `--touch-target` (273).
  Ninguno cuelga de un token inexistente.
- Sintaxis canónica de Tailwind v4: `canonical-tailwind-classes.test.ts` ya barre todo `src/**` por
  recorrido, así que los 20 archivos nuevos entraron solos y están verdes.

---

## 9. Arquitectura, convenciones y ficha

- **Feature-first respetado.** Todo lo nuevo vive en `src/shared/ui/**`. Nada toca `features/`, `app/`,
  `proxy.ts`, la DB ni el backend. El design system sigue siendo **portable por contrato** (SDD §2):
  ningún archivo nuevo importa de una app consumidora.
- `cn()` en todo componente que acepta `className` (los seis). Variantes en un archivo `.variants.ts` con
  `cva` (los seis). Carpetas kebab-case, componentes PascalCase, constantes UPPER_SNAKE. Correcto.
- `"use client"` sólo donde hace falta: `Dialog` (efectos + `useSyncExternalStore`), `Toggle` (manejador de
  eventos), `Skeleton` (`useSyncExternalStore`) y el hook. `ProgressBar`, `ToggleGroup`, `StatePanel`,
  `EmptyState` y `ErrorState` van sin él, y **es correcto**: verifiqué en el dispatcher de RSC de React
  19.2.7 que `useId` y `forwardRef` **sí** están soportados en Server Components
  (`react-server-dom-turbopack-server.node.development.js:6045`), a diferencia de `useState`/`useEffect`.
  Mismo criterio que `Card.tsx` e `Input.tsx` ya seguían, y misma razón por la que `Field.tsx` sí lo lleva.
- **Los 7 criterios de aceptación de la ficha #33 están cumplidos**, incluido el explícito de que
  "Toggle NO es un Tabs" y el de "todas exportadas por el barrel de `shared/ui`" (anclado por
  `public-api.test.ts`).
- **Sirven a sus consumidores reales de RFC-02**: §2 pide barra de progreso en la card de activos y estado
  activo en los botones de tipo; §4 pide skeleton en las cards de métrica, estado vacío
  ("Todavía no tejiste nada en {año}" + botones de crear, que el slot `action` permite) y estado de error
  ("Se enredó la madeja" + reintentar, que `onRetry` permite); §1 pide el modal de creación con el `type`
  preseleccionado (`Dialog` controlado con `children` libre). §5 pide `aria-pressed` en tipo y métrica:
  está. La enmienda E1 (§7-bis) no añade requisitos sobre estas seis piezas — E1.1-E1.3 son del hero y del
  proxy, E1.4-E1.5 son de comparativas y de la tarjeta de metros, todo de #19.
- Las **8 deudas propuestas (86-93)** son reales y están bien argumentadas. Verifiqué la 86 contra el CSS
  compilado y la 91 contra el estado real de los guardrails. Que la 87 (scroll de fondo) y la 90 (foco
  inicial configurable) queden fichadas en vez de improvisadas es lo correcto para una slice de primitivas.

---

## 10. Observaciones (NINGUNA bloqueante — para el leader al cerrar)

- **O1 — La justificación del portal señala la causa equivocada.** `Dialog.tsx:82-85`,
  `dialog.variants.ts:8-11` y §2.4 del informe dicen que el archivero "apila 6 hojas con `transform`".
  **No hay ningún `transform` en el archivero** (usa una propiedad arbitraria de `filter: drop-shadow(...)`
  en `archive-nav.variants.ts:72` y `:133`, que también crea contexto de apilamiento), y además **el
  archivero no es ancestro del diálogo**. La jaula real es el `main` del shell con `relative` +
  `z-(--z-base)` en `AppShell.tsx:67`. **La conclusión es correcta y de hecho más fuerte de lo que dice el
  informe** (el portal es obligatorio, no conveniente), pero la prosa manda al próximo lector al sitio
  equivocado. Corregir la redacción en los tres sitios y **fichar el hallazgo con la causa buena**:
  *cualquier página del shell vive dentro de un contexto de apilamiento en `--z-base`, así que ningún
  overlay montado en el flujo puede superar al nav.* Es una regla que va a aplicar también a `Toast` y
  `Tooltip` cuando lleguen.
- **O2 — El hook promovido fue a `shared/ui/lib/`, pero el árbol del SDD §4 reserva `shared/ui/hooks/`**
  para `useMediaQuery`/`useReducedMotion` (línea 121 del SDD). La carpeta `hooks/` no existe hoy y `lib/`
  ya alojaba `cn.ts`, así que la decisión es defendible — pero es una desviación del SDD que el informe no
  menciona. Crear `hooks/` o enmendar el SDD.
- **O3 — El SDD se contradice sobre dónde va `Skeleton`.** El árbol de §4 (línea 128) lo pone en
  `feedback/`; el inventario de §6 (línea 173) lo pone en primitivos. El implementer siguió §6 y la ficha
  (que lo dice explícito), que es lo correcto. Reconciliar el SDD.
- **O4 — `progress/deudas.md:1006` todavía nombra `src/shared/ui/primitives/no-hardcode.test.ts`** (entrada
  de la deuda 71). Ruta obsoleta y deuda ahora saldada para ese guardrail. Actualizar al cerrar.
- **O5 — El umbral del seguro del barrido es "> 20" contra 54 archivos reales.** Un colapso parcial que
  conservara los 5 archivos ancla podría pasar. Subir el umbral o anclarlo a la cuenta por capa cuando toque
  la próxima slice de UI.
- **O6 — El informe (línea 466) escribe los nombres de token de movimiento con comodín**, exactamente la
  forma que rompió el build una vez. Es inerte (no es candidato a clase, y `progress/` está excluido y el
  guardrail lo demuestra), pero se apoya en el guardrail en vez de en la convención. Describirlo en
  palabras.

---

## Cambios requeridos

**Ninguno bloqueante.** Nada que impida cerrar #33. Las seis observaciones son trabajo de cierre del leader
(prosa, deudas y docs), no del implementer, y ninguna toca el comportamiento del código.

Lo único que **no debería quedar sin hacer** es **O1**: el razonamiento del portal es un hallazgo que vale
la pena guardar, y guardarlo con la causa equivocada es peor que no guardarlo.

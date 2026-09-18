# Review — lote de deudas 165 + 166

**Veredicto:** **APROBADO** (`APPROVED`)

**Bloqueantes:** ninguno.
**Deudas nuevas fichadas:** 2 (⚪ las dos, ninguna interrumpe).
**Eje visible:** **NO VERIFICADO** en esta sesión — dicho explícito, no aprobado
por omisión (ver sección 6).

---

## 0. `bash ./init.sh` — EXIT real

```
[OK]    lint verde
[OK]    typecheck verde
 Test Files  88 passed | 3 skipped (91)
      Tests  1613 passed | 13 skipped (1626)
   Duration  184.17s
[OK]    Entorno listo. Puedes empezar a trabajar.
EXIT=0
```

Corrido por mí, entero, sobre el árbol tal como lo dejó el implementer.
**EXIT 0.** `1587 → 1613` (+26), exactamente lo que el informe declara
(18 + 4 + 4).

---

## 1. El punto crítico: ¿el gate nuevo tiene dientes de verdad?

Esto no lo di por leído. **Corrí once mutaciones mías** contra
`bottom-nav.classes.test.ts`, cada una revertida, con el árbol comprobado
idéntico al backup después de cada tanda (`diff` limpio y `git diff --stat`
en +28/+17 antes y después).

| # | Mutación | Esperado | Resultado |
|---|---|---|---|
| M1 | `sticky` → `fixed` | 🔴 | **🔴 1 test** |
| M2 | quitar `bottom-0`, dejar `sticky` | 🔴 | **🔴 1 test** |
| M3 | quitar `sticky`, dejar `bottom-0` | 🔴 | **🔴 1 test** |
| M4 | `sticky` bajo variante `archive:` (la trampa de E12 b) | 🔴 | **🔴 1 test** |
| M5 | `pb-(--safe-area-bottom)` → número crudo | 🔴 | **🔴 3 tests** |
| M6 | quitar el `pb-` entero | 🔴 | **🔴 3 tests** |
| M7 | quitar `z-(--z-nav)` | 🔴 | **🔴 2 tests** |
| M8 | token a valor fijo, sin `env()` | 🔴 | **🔴 1 test** |
| M9 | `z-` apuntando a un token inexistente | 🔴 | **🔴 2 tests** |
| M10 | **añadir una clase INERTE** (la forma literal de la 165) | 🔴 | **🔴 1 test** |
| M11 | `bottom-0` → desplazamiento distinto de cero | 🔴 | **🟢 18 passed** ← deuda N1 |

**Las mutaciones que importan son las que importan.** M1 y M3 son las dos
mitades de E14 (a) y caen **por separado**, que es el fallo silencioso real.
M4 mide la advertencia de E12 (b) sobre la barra misma. **M10 es la deuda 165
reproducida literal** —una clase escrita que no compila a nada— y el gate la
caza. M8 demuestra que el token no es decorativo: cambiarlo por un valor fijo
pone rojo el aserto que dice medir eso.

**Lee CSS compilado de verdad, no nombres de clase.** Verificado en fuente:
`compileGlobalsCss()` (`shared/ui/testing/class-names-from-source.ts:74-84`)
pasa el **texto real de `globals.css`** por `postcss([tailwindcss()])` con
`from: GLOBALS_CSS` — el mismo compilador y el mismo escaneo de `src/**` que la
app. `rulesFor` / `declarationsOf` recorren el AST de PostCSS y **conservan las
reglas-arroba que envuelven** cada declaración; de ahí sale el
`unconditioned(...)`, que no es celo: es lo único que distingue "declarado" de
"declarado donde la barra vive". El control positivo de la línea 424 **compila
un `globals.css` mutado de verdad**. Nada de esto pregunta por nombres de clase.

### Verdes falsos: buscados uno por uno, no encontrados

El repo lleva tres fichas por lo mismo (160, 167), así que fui aserto por aserto:

- **Ni un aserto sobre posición, rects, visibilidad o hit-testing.** El gate
  ataca CSS compilado precisamente **porque `happy-dom` no maqueta**, y lo dice
  en su cabecera (líneas 44-49) en vez de prometer lo que no mide. Es lo
  contrario de la 167.
- **Los guardas anti-aire están puestos y son reales.** Líneas 327, 371 y 406:
  antes de comprobar "ningún token sin declarar" se comprueba que **haya**
  tokens que comprobar, y antes de exigir "sin condición" se comprueba que
  **existan** reglas con condición. Sin eso, comparar dos listas vacías sería
  verde perpetuo. M7 y M9 los confirman en rojo.
- **El barrido no puede devolver cero en silencio.** Líneas 188-244: cuenta de
  atributos del AST contra el **texto crudo**, `bypassed` vacío, `ambiguous`
  vacío, lista de fuentes externas **exacta**, y "todas las clases resueltas
  salen de un solo atributo". Comprobado a mano contra `BottomNav.tsx:43-77`:
  2 atributos escritos, 2 vistos, 1 productivo (el `nav`), externos exactamente
  `cn` / `className` / `bottomNavItemVariants`. Cuadra.
- **Ni un nombre de clase literal en el archivo de test** (la utilidad de
  posición se arma en ejecución, línea 91) — que es la trampa por la que un gate
  se autoalimenta y deja de depender del componente.

**No encontré ningún aserto estructuralmente incapaz de fallar.**

---

## 2. E14 (a): ¿pegajosa y no fija? ¿nadie compensó con relleno?

- `BottomNav.tsx:52` → **`"sticky bottom-0"`**. **No hay `fixed` en ninguna parte
  del diff**, y M1 lo deja anclado en el gate.
- **La barra no salió del flujo y nadie compensó**: `AppShell.tsx:61` sigue
  siendo `"relative flex min-h-dvh flex-col bg-bg"` — **cero `padding-bottom`,
  cero cambios**. El `AppShell` **no aparece en el diff**. El `main` tampoco.
- La geometría es la correcta: con contenido corto el `AppShell` mide `100dvh`,
  el `main` es `flex-1` y la barra queda apoyada en el borde; con contenido largo
  el pegado la sostiene contra el viewport. Es el razonamiento exacto de E14 (a),
  y es **por qué no hace falta relleno**.
- El `z-(--z-nav)` **no se tocó** y ahora sí abre contexto de apilamiento.

## 3. Lo que E14 dice que NO se toca

- **Interior de la barra** (6 accesos, tamaños táctiles, marca de la activa):
  `bottom-nav.variants.ts` **no aparece en el diff**; el bloque `items.map`
  (`BottomNav.tsx:64-76`) está **intacto**.
- **`archive:hidden`**: sigue en la línea 46, sin tocar.
- **`ArchiveNav`**: no aparece en el diff.
- **`feature_list.json`**: no aparece en el diff. Nada marcado `done`.

## 4. E14 (b): el token juzgado como pieza (el `viewport-fit` NO es hallazgo mío)

El implementer escaló que el inset del sistema sólo devuelve algo distinto de
cero con `viewport-fit: cover`, que este documento no declara, y **decidió no
añadirlo**. **Hizo bien y no lo cuento como bloqueante.** Lo que me toca es si la
pieza está bien construida para cuando esa decisión se tome:

- **Fallback a cero** presente, con unidad (`globals.css:443`). ✔
- **Sin números crudos** en el componente: consume el token. M5 (número crudo)
  → 🔴. ✔
- **En el sitio correcto**: dentro de `@theme` de `globals.css`, junto a
  `--touch-target`. El componente no escribe ni una medida. ✔
- **Emitido en un ámbito que aplica**: el gate lo comprueba en la raíz y **sin
  condiciones** sobre el compilado; M8 demuestra que el aserto muerde. ✔
- **Escrito donde se lee**: el comentario de `globals.css:432-442` avisa del
  agujero del `viewport-fit` "para que nadie lo lea de más", y el gate lo repite
  en su cabecera. ✔

**Veredicto sobre la pieza: bien construida.** Queda a la espera de una decisión
de caparazón, no de un arreglo.

## 5. E5 — el contador sin meta

| # | Mutación | Resultado |
|---|---|---|
| E5-M1 | condicional invertido | **🔴 9 tests** |
| E5-M2 | plural siempre (romper concordancia) | **🔴 1 test** |
| E5-M3 | `ProgressTab` vuelve a la fracción cruda | **🔴 3 tests** |
| E5-M4 | mayor-que-cero → distinto-de-cero | 🟢 (ver observación) |

- **E5 (a) sin meta**: `3 vueltas`, `1 vuelta`, `0 vueltas`. Concordancia
  correcta y **pineada al literal** en el test puro
  (`project-detail.test.ts:230-247`), no con la función contra sí misma.
- **E5 (a) con meta**: `3 / 40`. **No cambia nada.** El test de componente
  comprueba además que el texto sin denominador **no** aparece: un condicional
  invertido no pasa.
- **E5 (b)**: **el `0%` no se tocó.** `ProgressTab.tsx:182-183` sigue sin
  condicional. **Sin desviación de contrato.**
- **E5 (c)**: los dos casos con test, y además **la transición** (fijar la meta y
  ver la cuenta convertirse en fracción), que es donde vivía el defecto y que ni
  E5 pedía.
- **Copia en constantes del módulo**: `ROUNDS_UNIT` + `roundsCounterLabel` en
  `project-detail.ts:131-166`, mismo patrón que `moreMatchesHint`. **No queda
  ningún string suelto en el JSX** (`ProgressTab.tsx:187` sólo llama). ✔
- **Español**: `vuelta` / `vueltas`. ✔

## 6. Bloque de UI — el template es un SUELO, no un techo

- **¿Jerarquía visual?** El lote **no crea ni reestructura controles**; E14 no
  toca el interior de la barra por contrato y no lo tocó. Lo que sí hace es
  **devolver la navegación primaria al campo de visión**, que es una mejora de
  jerarquía por la vía de que exista. Nada pesa distinto que ayer.
- **¿Dos controles con comportamiento distinto renderizados igual?** No se
  renderiza ningún control nuevo. **No aplica** (nada de la clase de la 142).
- **¿Alguna decisión justificada por el coste del arnés?** Una a medias, y
  **queda fichada** (deuda N2): el implementer no cerró el agujero del resolvedor
  de literales de objeto, y una de sus tres razones es *"tocaría una pieza que
  comparten otros tres gates"*. **Eso solo no sería justificación válida.** Las
  otras dos sí lo son (ese objeto no lleva clases; las que produce viven en
  `bottom-nav.variants.ts`, que E14 **excluye explícitamente**) y el agujero
  está **pinchado con lista exacta**, no barrido bajo la alfombra. No es visual,
  es de cobertura. **Se ficha igual, para que nadie lo cite como cubierto.**
- **¿Toda acción con efecto tiene feedback VISIBLE?** El lote **no añade ninguna
  acción**. La única que roza es fijar la meta, que ya tenía su camino y cuyo
  efecto ahora es **más** visible (el texto cambia de forma, no sólo de número).
  Nada nuevo escondido en un `sr-only`.

### ⚠️ El eje visible queda SIN VERIFICAR, y lo escribo en vez de aprobarlo por omisión

Esta sesión **no tiene navegador**. Ningún gate de este repo mide lo que se ve
(deuda **141**), y el propio gate lo dice de sí mismo. **No hay verificación
visual ni de la 165 ni de la 166.** Lo demostrado es que **las declaraciones
existen en el CSS que el navegador va a recibir** — no que la barra se vea al
entrar. **REGLA 4: le toca al leader antes de cerrar.** Tres puntos concretos:

1. **A ~500 px**: que la barra esté en pantalla **al entrar, sin scroll**, y que
   al llegar al fondo del todo **no tape** el último elemento del contenido.
2. **Con contenido corto** (una página que no llene el viewport): que la barra
   siga apoyada abajo y no quede flotando a media pantalla.
3. **La cabecera del tab Progreso sin meta**: `3 vueltas` se pinta en
   `font-mono text-sm` —una tipografía elegida para una **fracción numérica**—
   al lado de un `0%` en `text-4xl`. Con un número quedaba natural; **con una
   palabra puede leerse raro**, y eso no lo mide ningún test. Mirada de medio
   segundo.

## 7. Checkpoints

- **C1:** [x] Archivos base y los 3 docs existen. `bash ./init.sh` → **EXIT 0**.
- **C2:** [x] `feature_list.json` intacto (24 `done` · **0 `in_progress`** ·
  9 `pending`); nada nuevo marcado `done`. `progress/current.md` describe la
  sesión activa, sin basura anterior.
- **C3:** [x] Sin acceso a DB desde UI (el lote es CSS y copia). Copia en el
  módulo del feature (`features/projects/ui/project-detail.ts`), token en
  `globals.css`, componente compartido en `shared/ui/layout`. Feature-first
  respetado. **Cero dependencias nuevas.** Cero `console.log`, cero `TODO`, cero
  secretos (verificado con búsqueda sobre los cuatro archivos de código).
- **C4:** [x] Los dos módulos con lógica tienen test, y los tests **muerden**
  (once mutaciones mías; 12 de 13 rojas donde debían). `lint` y `typecheck`
  verdes. **1613 passed | 13 skipped**, cero rojos.
- **C5:** [x] `progress/history.md` tiene entrada de la última sesión; el lote
  está reflejado en `current.md`. *Nota, no bloqueante:* `.atl/` y `.windsurf/`
  siguen sin trackear — artefactos de herramienta **preexistentes**, ajenos a
  este lote, ya declarados como pendiente de `.gitignore` en `current.md`.

### Observación que NO ficho como deuda

Mayor-que-cero frente a distinto-de-cero: **E5-M4 salió verde**, o sea que el
caso negativo no tiene test. La elección del implementer es la correcta y está
razonada, pero **el backend ya rechaza negativos** (entero no negativo), así que
el camino es inalcanzable desde producción. Endurecimiento defensivo sin
escenario de fallo: **no merece ficha**, queda escrito acá.

---

## 8. Deudas nuevas que ficho

**N1. ⚪ El gate de la barra comprueba que HAY desplazamiento inferior, pero no
CUÁNTO.** **Medido por mí (mutación M11):** con el desplazamiento cambiado a un
valor distinto de cero, el gate sale **verde con los 18 tests**. **Escenario de
fallo:** la barra pegada queda flotando por encima del borde y el contenido se ve
pasar por la rendija, con la suite entera en verde. **No hay defecto detrás hoy**
—el código escribe cero— por eso es ⚪ y no bloquea. **Cómo se salda:** en
`bottom-nav.classes.test.ts:288-295`, además de exigir que la declaración exista,
exigir que su valor resuelva a cero. Es un aserto.

**N2. ⚪ El interior de la barra no lo cubre ningún gate de CSS compilado.** Las
clases de los 6 accesos llegan por `bottomNavItemVariants({ active })`, y el
resolvedor compartido **no entra en literales de objeto**: las **denuncia**
(`unhandled: ["ObjectLiteralExpression"]`) y el gate las pinea con lista
**exacta**. El agujero está **declarado y vigilado**, pero **abierto**: una clase
inerte dentro de `bottom-nav.variants.ts` —tamaño táctil, marca de la activa—
sería **invisible para toda la suite**, que es la forma exacta de la deuda 165 un
nivel más adentro. **No bloquea este lote** porque E14 excluye el interior por
contrato y la decisión está escrita en el propio test (líneas 199-215). **Se
ficha porque una de las tres razones dadas es el coste del arnés**, y eso solo no
justifica dejar la pieza sin hacer. **Cómo se salda:** enseñar al resolvedor a
seguir la llamada a variantes, o darle a `bottom-nav.variants.ts` su propio gate
sobre compilado, en la tanda que toque el interior de la barra.

---

## 9. Por qué esto se aprueba

El lote hace **exactamente lo que las dos enmiendas pedían, ni una línea más**:
pegajosa y no fija, sin compensación en el caparazón, interior intacto,
`archive:hidden` intacto, `ArchiveNav` intacto, `0%` intacto, copia en constantes
del módulo y en español, los dos casos con test.

Y lo que de verdad se jugaba aquí —que el gate nuevo **no repitiera el error que
creó la 165**— resiste. Lo verifiqué yo, con once mutaciones propias incluida la
reproducción literal de la deuda, y **lee el CSS que sale del compilador de la
app**. La única que no cayó está fichada como N1.

El `viewport-fit` está **bien escalado**: es una decisión de caparazón, no un
apaño, y el implementer dijo que no podía mirarlo en vez de fingir que sí. La
mitad que le tocaba —el token— está bien construida.

**Lo único que este review NO puede firmar es el eje visible**, y queda dicho en
la sección 6 con los tres puntos que el leader tiene que mirar en pantalla antes
de cerrar. **Aprobar el código no es aprobar la pantalla.**

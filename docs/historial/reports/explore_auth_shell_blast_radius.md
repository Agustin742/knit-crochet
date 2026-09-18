# explore — radio de explosión de cablear la sesión en el shell (#31 `auth_ui`)

> **Nota de procedencia:** lo produjo un subagente `Explore` (solo lectura), que **no pudo escribir el
> archivo**. El leader lo volcó literalmente aquí. **Para futuros encargos: `Explore` no escribe.**

---

## 1. Estado actual de la cadena, tras el lote de higiene

**`src/features/auth/ui/AppShellClient.tsx`** quedó en una sola expresión: `:30-32` monta `AppShell` con
`AsciiYarn` como fondo y nada más. Sin estado, sin efectos, sin manejadores. Conserva `"use client"` (`:1`)
— deuda 30. Su JSDoc (`:11-29`) documenta explícitamente qué tiene que reponer #31: `GET /api/auth/me` y
`POST /api/auth/logout` + redirección a `/login`.

**`src/shared/ui/layout/app-shell/AppShell.tsx`** acepta `user?: ArchiveNavUser | null` (`:27`) y
`onLogout?: () => void` (`:29`), documentadas como RESERVADAS para #31 (`:19-29`), y las **propaga tal cual**
al `ArchiveNav` en `:61`. **No** las propaga al `BottomNav` (`:65` sólo recibe `items`) — `BottomNav.tsx:9-13`
ni siquiera declara esas props.

**`ArchiveNav` las declara y las tira.** `ArchiveNav.tsx:37` y `:39` las declaran en la interfaz, pero la
desestructuración de `:65` es `{ items = NAV_ITEMS, className }`: las dos props **ni se leen**. El JSDoc de
`:30-39` dice que se ignoran a propósito por E7.

**El test que lo fija:** `src/shared/ui/layout/layout.test.tsx:198-208`, describe *"utils reservados para #31
auth_ui (E7)"*, `it("acepta user/onLogout pero NO los renderiza")` en la **línea 199**. Asierta que
`queryByText("Ada")` es null (`:204`), que no hay botón accesible llamado "Salir" (`:205`) y que `onLogout`
no se invoca (`:206`).

**Lo que E7 borró**, recuperado de git (`ec97214:.../ArchiveNav.tsx:125-135`, eliminado en `6b48fae`): un
contenedor flex al final del header con (a) el nombre del usuario en mono, tamaño xs, con interletrado de
etiqueta y color de primer plano inverso atenuado, y (b) un `Button` de variante fantasma, tamaño md, con
`onClick={onLogout}` y texto "Salir". **Sin ningún parche de `className`** — confirma la corrección de la
ficha 17.

## 2. El gate que hay que reescribir

Los dos están en `src/features/auth/ui/AppShellClient.test.tsx`:

- **`:87-99`** — `it("fires no HTTP request at all when mounted")`. Espía `fetch` global (`:43-47`), espera
  microtarea (`:95`) y macrotarea (`:96`) y exige `expect(fetchSpy).not.toHaveBeenCalled()` (`:98`). **Cae en
  rojo con la primera línea de código de #31** si el shell vuelve a pedir `/api/auth/me` desde el cliente.
  Después tendría que decir: *"pide `/api/auth/me` exactamente una vez por montaje, y sólo eso"* — invertir
  la aserción pero **conservar el invariante de coste** que la motivó. **Alternativa que salvaría el gate
  intacto:** resolver el usuario en el **servidor** (el layout de `(app)` es un Server Component,
  `src/app/(app)/layout.tsx`) y pasarlo por props; entonces "montar el shell no dispara ningún fetch **de
  cliente**" sigue siendo cierto **y** verdadero.
- **`:101-114`** — `it("hands over neither user nor logout until feature #31 wires them")`. El doble del
  shell registra sus props (`:23`, `:33`) y se exige `props.user` y `props.onLogout` `toBeUndefined()`
  (`:112-113`). Después tendría que decir: *"entrega al shell el usuario que devuelve el endpoint y un
  `onLogout` que llama a `POST /api/auth/logout` y redirige a `/login`"*, más los casos que hoy no existen:
  401/sesión ausente y fallo de red.

También el JSDoc del propio archivo de test (`:14-22`) explica que el doble reemplazó a un botón "Salir" que
el test se fabricaba; hay que reescribirlo o vuelve a mentir.

## 3. La zona de utils: qué había, qué queda, y cuánto espacio libre hay

**Qué había:** la banda superior con wordmark a la izquierda y utils a la derecha (RFC-01 §3, líneas
107-112). La implementación del modelo fichero reservaba el ancho por token: `--nav-utils-width: 168px` en
desktop y `--nav-utils-width-tablet: 72px` (nombre oculto, sólo "Salir"), con `--nav-tab-inset-end`
**derivado** como `calc(ancho de utils + --space-6)` — `impl_archive_nav_fichero.md:65-66` y `:150-155`.

**Qué queda:** la banda existe y sigue siendo el sitio natural — `ArchiveNav.tsx:90-105` es un bloque
absoluto pegado a los lados y al techo, en flex, alineado al inicio, con relleno izquierdo por el token de
inicio del carril y respiro superior de `--space-2`. **No captura el puntero** salvo donde se rehabilita
explícitamente (hoy sólo el ancla del wordmark, `:101`). Estructuralmente sí está preparada para alojar un
control: bastaría un segundo hijo empujado al final y su propia rehabilitación de puntero. **Lo que NO
quedó** es la reserva de ancho: `--nav-utils-width` y `--nav-utils-width-tablet` desaparecieron de
`globals.css`, y `globals.css:101` dice `--nav-tab-inset-end: var(--nav-tab-inset-start)` — el carril es
simétrico *porque no hay utils*.

### El espacio libre, cuantificado

Todo derivado de `globals.css`, mismos tokens que usa `archive-nav.tokens.test.ts:238-246`:

| magnitud | valor |
|---|---|
| ancho de nacimiento `--bp-archive` | **1180px** |
| carril útil = 1180 − 24 − 24 | **1132px** |
| columna = 1132 / 6 | **188.67px** |
| texto por columna = 188.67 − 2×8 | **172.67px** |
| lo que pide la etiqueta más larga ("Calculadoras", 12 caracteres) = 12 × (0.72×18 + 1) | **167.52px** |
| **holgura por columna** | **+5.15px** |
| **holgura total convertible en margen derecho** | **+30.88px** |

`--nav-tab-inset-end` puede crecer de 24px a **54.88px** como máximo antes de que el gate caiga.
**Presupuesto disponible para un control nuevo: 30.88px.** Para comparar, la banda de utils que E7 quitó
reservaba **168px** (72px en tablet). Un control de logout no cabe en 30.88px por ningún camino: sólo el
relleno horizontal de un botón `md` del design system son 24px por lado (`button.variants.ts:53`).

**Sí, come del presupuesto, y lo come entero.** Para reservar 120px habría que subir `--bp-archive` a
≈**1269px**; para los 168px históricos, a ≈**1317px**. Eso **reabre la decisión que el usuario cerró** en
`progress/informs/9.informe-deudas_21_17_13_04.md:23-27` (etiqueta 18px ↔ nacimiento 1180px, "decisión
cerrada, no se reabre"): el archivero desaparecería de los portátiles de 1280-1366px.

### Tests que se ponen en rojo, con línea

- `archive-nav.tokens.test.ts:213-217` — *"el carril lleva el mismo margen a los dos lados (sin utils, E7)"*.
  Exige que la declaración de `--nav-tab-inset-end` **contenga** `--nav-tab-inset-start`. **Cae en el
  instante en que se reserve un milímetro a la derecha.** Es el gate más directo de todo el encargo.
- `archive-nav.tokens.test.ts:248-250` — *"la etiqueta más larga entra entera en su columna a
  `--bp-archive`"*. Cae si la reserva pasa de 30.88px sin subir el ancho de nacimiento.
- `archive-nav.tokens.test.ts:257-262` — *"los dos juegos de breakpoints declaran el mismo ancho de
  nacimiento"*. Cae si se sube uno y se olvida el otro.
- `archive-nav.tokens.test.ts:264-272` — *"por debajo de ese ancho NO cabrían las 6"* — **seguiría verde**
  aunque se suba el nacimiento (se mide contra `--bp-tablet`), así que no protege de nada aquí.

### ⚠️ El agujero peligroso, que es lo contrario de un test rojo

El invariante vertical de la banda sólo está asertado para la **izquierda**:

- `archive-nav.tokens.test.ts:179-190` — el wordmark (borde inferior a **34.4px** = 8 + 24×1.1) cabe por
  encima del techo del cajón (**44px**).
- `archive-nav.tokens.test.ts:192-211` — la pestaña de la **columna 1** en su peor caso (ranura 2, con el
  puntero encima) tiene su borde superior en **42px**, o sea 7.6px por debajo del wordmark.

Ese razonamiento vale para la columna 1 porque el índice 0 sólo puede caer en ranura 1 o 2
(`archive-nav.variants.ts:192-200`). **La columna 6 puede caer en la ranura 6**, y ahí el borde superior de
su pestaña está en **10px en reposo y 2px con el puntero encima**. Un control de logout en la banda a la
derecha, con respiro superior de 8px y alto de objetivo táctil (44px), ocuparía y=8..52: **se solapa con la
pestaña de la columna 6 en 4 de las 6 rutas, y ningún test lo detecta.** Es exactamente el patrón de la
deuda 23 (la mitad horizontal del invariante del wordmark sin gate), reproducido en el otro extremo.

Segundo detalle con test detrás: `layout.test.tsx:243-245` exige que **todos** los enlaces dentro del
elemento `nav` sean pestañas. Si el control de cuenta se monta como enlace **dentro del `nav`**, ese test
cae. Si es un `button`, o va en la banda del `header` (fuera del `nav`, donde vive el wordmark), sobrevive.

## 4. La deuda 19, revisada

**Sigue siendo cierta, pero se quedó corta.** El origen está en `impl_archive_nav_fichero.md:345-351`:
ocultar el nombre por debajo de desktop bajaba la reserva de utils de 168px a 72px, **+96px al carril, 16px
por columna** — la palanca que hizo cumplir E2.

Lo que la ficha no dice: desde **E4** el archivero **no existe** por debajo de `--bp-archive` (1180px).
`ArchiveNav.tsx:79` lo esconde por debajo de ese ancho y `BottomNav.tsx:29` lo sustituye. Así que hoy no es
"en tablet no se muestra el nombre": es que **entre 320px y 1179px no hay ninguna superficie de shell capaz
de alojar usuario ni logout**, porque `AppShell.tsx:65` no le pasa nada al `BottomNav` y `BottomNav` no tiene
props para recibirlo.

Implicación: cablear la sesión "en el shell" produce UI **sólo a partir de 1180px**. Cubrir el resto obliga a
tocar `BottomNav` (props nuevas, un séptimo elemento en una fila de 6 accesos táctiles que hoy se reparte el
ancho a partes iguales) o a inventar otro anfitrión. **Nadie ha tomado esa decisión.**

## 5. La variante fantasma de `Button`

**Sí, es la que parcheaba el archivero — pero al revés de lo que decía la ficha.** El commit `ec97214`
muestra el botón "Salir" con variante fantasma **sin ningún parche de color**, y la variante fantasma de
entonces fijaba el primer plano oscuro (`ec97214:button.variants.ts:33-34`), que resuelve al mismo tono que
el fondo de la app: el botón "Salir" era **invisible** sobre el archivero. La ficha 17 corregida
(`deudas.md:101-108`) ya lo registra.

**Hoy no tiene ningún consumidor:** la variante fantasma aparece sólo en su definición
(`button.variants.ts:49-50`), en los gates (`button.variants.test.ts:53` y `:120`) y en el barrido de axe
(`Button.test.tsx:82`). Cero usos en producción.

**Es la candidata natural** y **se leería bien sobre el archivero**, medido con la fórmula WCAG sobre los
valores de `globals.css`:

| par | contraste |
|---|---|
| lo que hereda (crema del `body`) sobre el fondo del header del nav (espresso) | **12.83 : 1** ✔ |
| lo mismo sobre la cara de una hoja (marrón de marca) | **8.00 : 1** ✔ |
| anillo de foco (rosa de marca) sobre el fondo del nav | **4.68 : 1** ✔ |
| anillo de foco sobre la cara de una hoja | **2.92 : 1** ✘ |

El header del nav no declara primer plano propio, así que la herencia llega intacta desde el `body`: el botón
sería legible. **Hallazgo nuevo, no fichado:** la deuda 31 midió el anillo de foco contra el fondo de la app
y las tres superficies claras, pero **no contra la cara de la hoja del archivero** (2.92:1, por debajo del
mínimo de 3:1). Sólo importa si el control acaba apoyado sobre una hoja o dentro de una pestaña; en la banda,
sobre el fondo del nav, cumple.

## 6. Inventario

**Archivos a tocar (mínimo, si el control vive en el archivero):**

1. `src/features/auth/ui/AppShellClient.tsx` — reponer la obtención del usuario y el logout; decidir la
   deuda 30 (si vuelve a tener estado, `"use client"` deja de ser una mentira y la ficha se salda sola; si se
   resuelve en servidor, hay que renombrar el módulo y repuntar sus tres importadores).
2. `src/features/auth/ui/AppShellClient.test.tsx` — 2 gates invertidos (`:87`, `:101`) + JSDoc (`:14-22`) +
   tests nuevos de 401 y de error.
3. `src/shared/ui/layout/app-shell/AppShell.tsx` — JSDoc `:19-29`.
4. `src/shared/ui/layout/archive-nav/ArchiveNav.tsx` — desestructurar en `:65`, montar el bloque de utils en
   la banda `:90-105`, JSDoc `:30-39` y `:60-63`.
5. `src/shared/ui/layout/archive-nav/archive-nav.variants.ts` — variante del bloque de utils.
6. `src/app/globals.css` — reponer el token de reserva de ancho, romper la simetría de `:100-101`, y (si el
   control necesita más de 30.88px) subir `--bp-archive` **y** `--breakpoint-archive`.
7. `src/shared/ui/layout/bottom-nav/BottomNav.tsx` + `AppShell.tsx:65` — sólo si la sesión debe verse por
   debajo de 1180px.
8. `docs/design/rfc/RFC-01-shell.md` — E7(b) (`:137`) dice literalmente que los utils vuelven cuando exista
   la pantalla de auth: hay que escribir la enmienda que documente **con qué geometría** vuelven, o E7 queda
   contradicha sin registro.
9. `progress/deudas.md` — saldar 29 y 30, corregir la 19, recalibrar 22/23/24.

**Tests en la zona de impacto: 56 en 3 archivos** — `layout.test.tsx` (29), `archive-nav.tokens.test.ts`
(23), `AppShellClient.test.tsx` (4).

| test | línea | qué pasa |
|---|---|---|
| "fires no HTTP request at all when mounted" | `AppShellClient.test.tsx:87` | **rojo**, hay que invertirlo |
| "hands over neither user nor logout…" | `AppShellClient.test.tsx:101` | **rojo**, hay que invertirlo |
| "acepta user/onLogout pero NO los renderiza" | `layout.test.tsx:199` | **rojo**, hay que invertirlo |
| "el carril lleva el mismo margen a los dos lados (sin utils, E7)" | `archive-nav.tokens.test.ts:213` | **rojo** en cuanto se reserve ancho |
| "la etiqueta más larga entra entera en su columna" | `archive-nav.tokens.test.ts:248` | **rojo** si la reserva > 30.88px |
| "los dos juegos de breakpoints…" | `archive-nav.tokens.test.ts:257` | rojo si se desincronizan al subir el nacimiento |
| "el canto a todo el ancho no es un enlace: lo es la pestaña" | `layout.test.tsx:230` | rojo si el control es un enlace dentro del `nav` |
| axe de `ArchiveNav` / `AppShell` | `layout.test.tsx:411`, `:422` | ya pasan `user`/`onLogout`; pasarían a ejercitar markup real (cobertura gratis) |
| gates verticales del wordmark | `archive-nav.tokens.test.ts:179`, `:192` | **verdes con el defecto puesto** — no cubren el extremo derecho |

**Veredicto: es "una vuelta más del archivero", no un cambio contenido fuera de él.** Las páginas de
login/register son trabajo contenido (2 páginas nuevas + formularios, cero archivos de shell). Cablear la
sesión toca 6-9 archivos, de los cuales 4 son geometría del archivero, obliga a reescribir 4 gates y a
reabrir una decisión de ancho cerrada hace un día, y deja sin cubrir el único invariante que de verdad
importa (la colisión en el extremo derecho de la banda).

## 7. Recomendación del explorador

**Dejar #31 en las dos páginas de auth y tratar el menú de cuenta como trabajo aparte.**

**Argumento en contra de su propia conclusión** (por qué convendría hacerlo en #31): la cadena está cortada y
documentada en tres fichas (19, 29, 30) — cada feature que pase por encima sin cerrarla la hereda. #31 es la
única feature que ya tiene los dos endpoints en su alcance mental y la única que sabe *dónde* debe vivir el
menú de cuenta, que es justo la decisión que el lote de higiene se negó a tomar por ella
(`deudas.md:169-172`). La deuda 30 se salda gratis si el módulo recupera estado. Y E7(b) redactó la retirada
como **temporal y con condición de vuelta explícita**: *"los utils vuelven cuando exista la pantalla de auth
que los justifica"* (`RFC-01-shell.md:137`) — #31 **es** esa condición, así que aplazarlo deja el RFC
apuntando a un momento que ya pasó.

**Argumento a favor:** E7 nombró a #31 como el momento en que existe la *justificación*, no como la slice que
debe *ejecutar* la vuelta — y la `acceptance` de #31 no menciona el shell ni una sola vez. Meterlo dentro es
ensanchar el alcance hacia el sitio más caro: 5.15px de holgura por columna contra los 168px que la banda
reservaba históricamente, con tres fichas abiertas (22, 23, 24) diciendo que esos márgenes ya están medidos
con instrumentos que mienten. Peor: el riesgo no está en los tests que caen —esos avisan— sino en el que
**no** existe, la colisión de un control a la derecha con la pestaña de la columna 6 (2px de borde superior
en el peor caso), que se entregaría con los 435 tests verdes y lo descubriría el usuario en pantalla, que es
exactamente cómo nacieron E5, E8, E9 y E10.

**Forma concreta que propone:** #31 entrega login + register (contenido, sin tocar `src/shared/ui/`). Los dos
gates de `AppShellClient.test.tsx` se quedan **como están** y siguen siendo verdad. El menú de cuenta se abre
como slice propia, precedida de una enmienda **E11** al RFC-01 que decida tres cosas antes de escribir
código: (a) dónde vive el control —dentro del carril del archivero, en la banda por encima de él, o fuera del
nav— sabiendo que sólo la tercera opción no come del presupuesto de las 6 etiquetas; (b) qué pasa por debajo
de 1180px; y (c) un gate para el extremo **derecho** de la banda, gemelo del de
`archive-nav.tokens.test.ts:192`, pero con la ranura 6 como peor caso.

**Si aun así se prefiere cerrarlo dentro de #31**, la opción de menor radio es resolver el usuario en el
layout servidor de `(app)` y montar el control **fuera del elemento `nav`**: salva el gate de "cero fetch de
cliente", salva el gate de "todo enlace del nav es una pestaña" y deja intacto el presupuesto horizontal.

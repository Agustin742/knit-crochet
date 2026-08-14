# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

## 🚧 IMPLEMENTER (2026-08-12) — Feature en curso: **20 — `projects_list_ui`**

**Plan (5 puntos):**
- **Config + cliente HTTP:** `NEEDLE_SIZES` (lista fija, E1(c)) y `COLOR_FAMILY_LABELS` en
  `src/shared/config`; **tercer clon** del cliente de navegador en
  `src/features/projects/ui/projects-client.ts` (E1(h)), **ensanchado** para devolver `status` también
  en el camino OK (201 vs 200 del quick-start, E1(e)).
- **Lógica pura de filtros** en `project-filters.ts`: buscar **en cliente por nombre** (E1(a) — el
  backend no tiene parámetro de texto y `?search=` responde 200 SIN filtrar), exclusividad del
  segmentado, etiqueta de lana **por color** (E1(d)).
- **UI:** `ProjectsToolbar` (dos `Toggle` en un `ToggleGroup` para activo/inactivo con la exclusividad
  en el consumidor E1(i); botones de tipo; `<details>` nativo para "más filtros" E1(g); buscar) +
  `ProjectsView` (los tres estados) + `src/app/(app)/proyectos/page.tsx` **fina**.
- **Card aditiva:** `ProjectCard` gana `onQuickStart`/`quickStartPending`. **Sin la prop, cero
  botones** (invariante del consumidor de #19); con ella, exactamente uno. No se mueve ni se renombra.
- **Gates:** composición dentro del `AppShellClient` real (deuda 111, **un solo ovillo**, no
  interactivo, dentro de `bg-3d`, un solo `h1`), `axe` sobre la vista, región viva **con nombre**
  (deuda 114), `Field` dentro de `Card` (deuda 31), y **condición doble** en cada gate nuevo.

**⚠️ Gate de arranque medido por el implementer: `bash ./init.sh` → `EXIT=1`.**
`Test Files 3 failed | 67 passed | 3 skipped (73)` · `Tests 4 failed | 1216 passed | 13 skipped (1233)`.
**Los cuatro rojos son `Test timed out in 5000ms`** en `src/shared/db/index.test.ts`,
`src/shared/lib/auth/password.test.ts` (bcrypt) y `src/features/auth/api/auth-service.test.ts` (bcrypt
×2) — **familia de la deuda 103**. La corrida entera duró **442,82 s**. Re-ejecutados los tres archivos
en aislamiento: **`3 passed (3)` · `11 passed (11)` en 16,03 s**. Es el flaky ya fichado, no un rojo
real, y **no lo tapo**: queda escrito porque el baseline del leader decía `EXIT=0`.

## 🚧 EN CURSO (2026-08-12) — deuda 120 primero, luego #20 `projects_list_ui`

**Encargo del usuario:** *"deuda 120 y luego #20"* (elegido sobre las alternativas de sólo-120,
sólo-#20, y barrer el lote 120-123). El orden lo pidió él: dejar el gate sano **antes** de meter
una feature grande encima.

### ✅ Gate de arranque VERDE — medido por el leader, no heredado

`bash ./init.sh` → **`EXIT_CODE=0`** · lint ✓ · typecheck ✓ ·
`Test Files 70 passed | 3 skipped (73)` · `Tests 1220 passed | 13 skipped (1233)`.
**Coincide exacto con lo que declaraba el bloque de cierre del 2026-08-10**: el libro mayor fue honesto.
*(Corrido con redirección a archivo, no por tubería — la trampa de `| tail` sigue vigente.)*

### 🔴 Corrección de libro mayor, del propio leader, ANTES de encargar nada

**La ficha 120 decía "dos tests" y son TRES.** Medido por barrido de `src/`:
`src/app/globals-css.test.ts:5`, `src/shared/ui/primitives/skeleton/skeleton.tokens.test.ts:5` y
**`src/app/yarn-host-responsive.test.ts:6`** — este último es **el gate que nació en el propio lote
117/118**, así que la ficha quedó desactualizada **por el trabajo de su misma sesión**.
`package.json:19` sólo declara `@tailwindcss/postcss`; **`postcss` a secas no aparece**.
No cambia el diagnóstico ni el arreglo, **agranda la superficie**. Corregido en `deudas.md`
**escribiendo la corrección, no borrándola**. Es la misma raíz ya registrada tres veces en este libro
mayor: *nadie volvió a la fuente a comprobarlo*.

### Cadena lanzada (dos carriles en paralelo)

| Carril | Subagente | Informe esperado |
|---|---|---|
| Deuda 120 | 1 `implementer` | `progress/reports/impl_deuda120_postcss.md` |
| #20 — filtros | `general-purpose` | `progress/reports/explore_20_filtros_backend.md` |
| #20 — card + quick-start | `general-purpose` | `progress/reports/explore_20_card_quickstart.md` |
| #20 — página, estados, gates | `general-purpose` | `progress/reports/explore_20_pagina_estados_gates.md` |

**Encargo de la 120, acotado a propósito:** toca **sólo** `package.json` + `pnpm-lock.yaml`; nada de
`src/**`; **no toca `deudas.md`** (el tachado es del leader al cerrar); y la **condición doble es de
ENTORNO, no de código** — hay que ver el typecheck **fallar en un clon limpio antes** y pasar después.
Si el "antes" no falla, **la ficha 120 es falsa y hay que decirlo**, no salvarla de oficio.
Se le pidió además **medir y reportar (no arreglar)** si hay más dependencias fantasma.

**La pregunta que puede frenar #20 antes de empezar:** si RFC-03 §2 pide filtros de toolbar
(**aguja**, **lana usada**, **buscar**) que `GET /api/projects` **no implementa**, eso es una decisión
de producto para el usuario, no algo que el implementer improvise. **El backend está cerrado**
(features 1-18 `done`), así que el hueco, si existe, no se tapa solo.

**#20 sigue `pending`**, no `in_progress`: no se arranca hasta que la 120 cierre y los tres informes
estén sobre la mesa.

### ✅ Los tres exploradores de #20 volvieron — y el hueco existe

**El toolbar pide cinco filtros y el backend tiene cuatro.** El que falta es **"buscar"**, y no es un
olvido de implementación: **nunca se especificó como dato**. `projectFiltersSchema` tiene exactamente
siete claves y ninguna es de texto; no hay `ilike`, ni `tsvector`, ni índice. **Y el PRD §6.2 tampoco lo
pide** — aparece por primera vez en RFC-03 §2, y **§3 del mismo RFC no lo respalda**. Contradicción
interna del RFC.

**Lo que hacía urgente cerrarlo antes de implementar, medido ejecutando zod 4.4.3:** el esquema es un
`z.object` **sin `.strict()`**, así que `?search=gorro` responde **200 con la lista sin filtrar**. No 400,
sin log. **Un buscador cableado contra un parámetro inexistente no falla: miente.**

### ✅ ENMIENDA E1 del RFC-03 escrita (§7-bis) — OCHO decisiones del usuario + UNA del leader

Las ocho las cerró el usuario el 2026-08-12; **E1(i) la asumo yo** (es técnica, no de producto).
Resumen: **(a)** buscar → **filtrado de cliente** · **(b)** rango de fechas → **fuera de #20**, deuda 127 ·
**(c)** aguja → **lista fija en `shared/config`** (derivar de la lista cargada es **circular**) ·
**(d)** lana → **sólo color**, deuda 128 · **(e)** quick-start → **sólo arranca, no es toggle** ·
**(f)** **la card NO es tocable en #20** · **(g)** "más filtros" → **`<details>` nativo** ·
**(h)** cliente HTTP → **tercer clon**, deuda 129 · **(i)** segmentado → **dos `Toggle`** con la
exclusividad en el consumidor.

**Los tres hechos medidos que mandan sobre el quick-start (no los re-derives):**
- **`POST /:id/sessions/start` es IDEMPOTENTE.** 201 si crea, **200 si REUTILIZA** una sesión abierta.
  Nunca 409, nunca duplica, nunca reinicia `start`. Un doble tap no puede corromper nada.
- **El 409 está en el STOP, no en el start.** Arrancar dos veces es gratis; parar dos veces es error
  visible. Es la asimetría **contraria** a la que uno supondría.
- **No hay forma de saber desde la lista si el cronómetro corre.** Ni columna, ni filtro, ni endpoint.
  E2.2 del RFC-02 ya descartó abrir el backend. **Un toggle habría tenido que mentir o pedir N veces.**

**El conflicto de la ficha, resuelto por E1(f):** RFC-03 dice *"quick-start… Tap → drawer"* — un control
dentro de otro. Pero **#21 está `pending`: el drawer no existe**, y **`<button>` dentro de `<a>` es HTML
inválido que `axe` marca** — y la card corre `axe` en su propio test. El tap lo añade #21.

**Marcado en el cuerpo del RFC, no sólo en la enmienda:** §1 y §2 llevan avisos que apuntan a E1(b),
E1(a), E1(f), E1(g) e E1(i), **para que nadie los "arregle" al revés** — que es exactamente lo que pasó
con la ficha de #31.

**Detalle que conviene saber:** `ActiveProjectsPanel.tsx:19` ya declara `PROJECTS_ROUTE = "/proyectos"` y
`:94-96` enlaza ahí. **Hoy es un enlace a un 404**; #20 lo repara.

### ✅ Deuda 120 — SALDADA y CERRADA. Review **APROBADO a la primera, 0 bloqueantes**

**Informe de cierre: `progress/informs/21.informe-deuda120_postcss.md`.**
`postcss` declarada con specifier **exacto `8.4.31`** (el `override` de `pnpm-workspace.yaml` ya obliga a
esa versión; un caret habría sido una **declaración falsa**). Ficha 120 **tachada y explicada**, con sus
**dos correcciones escritas, no borradas**.

**El reviewer no leyó el informe y ya: reconstruyó el experimento entero** con dos copias limpias propias.
Todos los números reprodujeron exactos. Y **atacó el barrido de fantasmas con controles positivos** en vez
de creerle el "cero" — quitar `postcss` del conjunto declarado hace aflorar los 3 archivos; quitar `zod`,
los suyos. Así se distingue un cero real de un **verde vacío**.

**Deudas nuevas fichadas: 130** (el `node_modules` fosilizado, ver abajo) y **131** (el barrido existió y
se tiró con el scratchpad).

### 🔴 DECISIÓN PENDIENTE DEL USUARIO — deuda 130, y es más grave que la 120

**`node_modules` de esta máquina: 378 entradas de primer nivel, 348 NO son symlink. En un install limpio
son 30 y 0.** pnpm **nunca** crea directorios reales de primer nivel — son **fósiles de una instalación
vieja con `npm`**. El reviewer aportó la prueba que faltaba: existe un **`node_modules/.package-lock.json`**
(artefacto de npm), ausente en un install limpio.

**Consecuencia: en esta máquina CUALQUIER paquete transitivo resuelve desde `src/`.** No es que a `postcss`
se le escapara la declaración — **este `node_modules` no puede detectar dependencias fantasma por
construcción**. La 120 fue la primera que asomó.

**Arreglo: `rm -rf node_modules && pnpm install`.** Su verificación **ya está hecha de antemano**: el
`init.sh` en copia limpia dio **exit 0, 1220 passed**, o sea que se sabe que el árbol sano pasa.
⚠️ **Al citar el 348, escribí el método**: el conteo ingenuo del reviewer dio **330/309 sobre el mismo
árbol**. El número no significa nada sin la receta al lado.

### ✅ #20 `projects_list_ui` — CERRADA. Review **APROBADO, 0 bloqueantes**

**Informe de cierre: `progress/informs/22.informe-projects_list_ui.md`.**
`init.sh` **EXIT 0** · `Test Files 74 passed | 3 skipped (77)` · **`Tests 1281 passed | 13 skipped
(1294)`** · `pnpm build` **EXIT 0**, **28 rutas**. **+4 archivos, +61 tests.**
**Es la SEGUNDA página de contenido del proyecto**, y **repara un 404**: el "Ver todos" del Dashboard
apuntaba a `/proyectos` desde #19 y esa ruta no existía.

**Lo que da valor a esta aprobación — el reviewer diseñó una inyección de fallo que nadie le pidió (A3).**
A1 y A2 tumban varias aserciones a la vez, así que **por sí solas no demuestran** que la tercera
—pertenencia al slot de fondo— sea independiente: podría estar de adorno. **A3 la aísla** (un solo ovillo,
no interactivo, pero fuera del slot) y **cae ella sola**. El gate discrimina en los tres ejes por separado.
Y **A1 confirma el agujero entero**: con `/proyectos` montando dos ovillos, `dashboard-page.test.tsx`
pasa **5 de 5**.

**Deudas nuevas: 132-135.** La **132 corrige una premisa del propio leader** (ver abajo).

**Aritmética cerrada al número por el reviewer**, porque el informe la dejó abierta con una hipótesis
falsa: `no-hardcode.test.ts` **genera 2 casos por archivo fuente** y #20 añade 5 → **+10**.
`1220 + 47 + 4 + 10 = 1281`, sin residuo.

### 🔴 Correcciones de libro mayor de esta sesión — dos, y una es MÍA

1. **La enmienda E1 se tituló "las ocho decisiones" y enumera NUEVE.** Conté las ocho del usuario y me
   olvidé de **E1(i), que la añadí yo** — y está marcada como tal tres líneas más abajo, **en mi propio
   documento**. **Lo levantó el implementer leyendo el texto en vez de fiarse del título.** Corregido en
   `RFC-03` §7-bis, escrito y no borrado.
2. **La ficha 120 decía "dos tests" y son TRES** (ver más arriba).

**Las dos son la misma raíz, que ya va por su cuarta aparición en este libro mayor: *nadie vuelve a la
fuente a comprobarlo*.** Y las dos las cazó un subagente, no yo.

### ⚠️ Deuda 132 — el leader escribió un dato falso en un encargo, y el reviewer lo midió

En el encargo al reviewer escribí que si el quick-start se colara "de serie", *"`DashboardView.test.tsx` y
su `axe` verían controles nuevos"*. **ES FALSO.** Con **todas** las tarjetas del Dashboard llevando botón,
ese archivo pasa **`31 passed (31)`**, `axe` incluido. Y **no existe** ningún `ActiveProjectsPanel.test.tsx`.
**Lo único que sostiene la invariante es `ProjectCard.test.tsx`**: el gate vive en el lado *productor*, y
el lado *consumidor* **no tiene ninguno**. Familia de las deudas 52 y 121.

### 🚧 Histórico del carril de #20 (cómo se llegó hasta aquí)

Marcada por el leader (diff de 2 líneas, formato preservado). Contrato: **E1 del RFC-03** + los tres
informes de exploración. **NO se marca `done` hasta después del review.**

#### ⚠️ El primer implementer MURIÓ por límite de gasto de la API, no por un fallo técnico

Cayó justo al entrar en la fase de verificación. **Dejó ~1620 líneas en 7 archivos nuevos y 5
modificados**, y el leader midió el árbol en vez de suponerlo:

- `bash ./init.sh` → **EXIT 0** · lint ✓ · typecheck ✓ · `Test Files 73 passed | 3 skipped (76)` ·
  **`Tests 1276 passed | 13 skipped (1289)`** (baseline de #20: 70 archivos / `1220 passed`) → **+3
  archivos, +56 tests**.
- `pnpm build` → **EXIT 0**, **28 rutas** (antes 27). **`/proyectos` ya es ruta real**, así que el
  `PROJECTS_ROUTE` de `ActiveProjectsPanel.tsx:19` **deja de apuntar a un 404**.

**Lo que el leader verificó del trabajo heredado** (no heredado de nadie):
- El quick-start es **opt-in** (`onQuickStart?`), así que la card **sigue sin botones para el Dashboard de
  #19**. `ProjectCard.test.tsx:128-136` lo fija **en las dos direcciones**: sin la prop → 0 botones; con
  ella → exactamente 1. Es la forma aditiva que pedía E2.1.
- Las regiones vivas llevan **`aria-label`** (`ProjectsView.tsx:208, 212-213`): **la deuda 114 se
  respetó**, no se repitió el `role="status"` anónimo de #19.
- `axe` presente en `ProjectsView.test.tsx`. `page.tsx` fina (12 líneas), con el motivo escrito dentro.

#### 🕳️ Los DOS huecos que dejó, confirmados buscándolos

1. **🔴 NO existe el gate de composición dentro del caparazón (deuda 111).**
   `src/app/(app)/proyectos/` tiene **sólo `page.tsx`**. Y ojo con lo que *parece* cubrirlo y no lo hace:
   `dashboard-page.test.tsx:131-148` **sí** usa `/proyectos`, **pero renderiza un `<p>Otra página</p>` de
   mentira**. **Hoy seguiría verde aunque `/proyectos` montara tres ovillos.**
2. **NO existe `progress/reports/impl_projects_list_ui.md`**, así que **no hay condición doble
   documentada** de ningún gate nuevo (REGLA 3).

**Segundo implementer lanzado, acotado SÓLO a esos dos huecos**, con instrucción explícita de **no
reescribir ni refactorizar** lo que ya está verde.

### ⏳ Pendiente de contabilidad al cerrar la sesión

**`progress/history.md` NO se ha tocado todavía**, a propósito: la sesión sigue viva con #20 en curso y una
entrada por implementación duplicaría la de sesión. **Se escribe al cerrar, cubriendo el lote entero.**
Se deja anotado aquí porque la **deuda 115** ficha justamente que éste es el paso del cierre que se salta,
*"porque nada lo verifica"* — `init.sh` valida `feature_list.json`, no el historial.

### 🔎 Deuda 120 — detalle de la medición (histórico del carril)

`progress/reports/impl_deuda120_postcss.md`. Diff total **4 líneas** (`package.json` +1, lock +3), nada de
`src/**`. **La ficha 120 era verdadera y se quedaba corta:** en entorno limpio no sólo falla el typecheck,
**caen los 3 archivos de test enteros** y `init.sh` sale **exit 1** (`1185` en vez de `1220`).

**Hallazgo colateral que puede valer más que el arreglo, y que NO doy por bueno todavía:** el informe
afirma que `node_modules` de esta máquina tiene **348 entradas de primer nivel que no son symlink** contra
**0** en un install limpio —fósiles de una instalación con `npm`— y que **por eso** la 120 era invisible
aquí. Si es cierto, **este `node_modules` no puede detectar dependencias fantasma por construcción**.
**Deliberadamente NO fichado todavía:** son números que sólo produjo quien los mide. El reviewer los está
verificando. *(Las deudas 127-129, en cambio, sí están fichadas: nacen de decisiones, no de mediciones.)*

---

## ✅ ESTADO AL CERRAR (2026-08-10) — VERDE. Lote de deudas 117 / 118 / 119 CERRADO

> **`bash ./init.sh` → `EXIT_CODE=0`.** `Test Files 70 passed | 3 skipped (73)` ·
> `Tests 1220 passed | 13 skipped (1233)`. `pnpm build` OK, 27 rutas.
> **Review APROBADO a la primera, 0 bloqueantes.** Informe de cierre:
> `progress/informs/20.informe-deudas_117_118_119.md`.
>
> **PRÓXIMA SESIÓN = #20 `projects_list_ui`.** Ver el bloque "PRÓXIMA — feature #20" más abajo, que
> sigue válido tal cual. **No se arrancó hoy, por decisión del usuario.**
>
> **⚠️ Lo único que necesita decisión tuya antes de seguir: la deuda 120** (`postcss` fantasma, un clon
> limpio falla `pnpm typecheck`). Arreglo de una línea, excluido a propósito de este lote.

**Encargo del usuario:** *"resuelve las deudas 117 118 119 y luego continua con la siguiente
implementación"*, acotado después a *"después de las deudas termina, lo de la implementación siguiente
lo vemos mañana"*. **NO fue una feature de `feature_list.json`**: ese archivo **no se tocó** en el lote
(aparece modificado por el saldo de la deuda 116, de la sesión anterior).

**Cadena:** leader (gate de arranque, **enmienda E12**, deuda 119 por su cuenta, **verificación en
navegador**) → 3 exploradores en paralelo → 1 implementer → 1 reviewer → **APROBADO, 0 bloqueantes**.

**Gate de arranque VERDE, medido por el leader, no heredado:** `bash ./init.sh` → `EXIT=0`,
lint ✓, typecheck ✓, `Test Files 69 passed | 3 skipped (72)`, `Tests 1200 passed | 13 skipped (1213)`.
Coincide con lo que declaraba el bloque de cierre del 2026-08-07.

### ✅ Deuda 119 — SALDADA por el leader (carril de configuración)

`next-env.d.ts` se **destrackea**: `.gitignore` + `git rm --cached` (el archivo sigue en disco).
**No es preferencia nuestra:** la doc de Next 16.2.10 **empaquetada en el propio `node_modules`** lo pide
literalmente, y context7 confirma con la plantilla de `create-next-app`. **Medido antes de decidir**: en un
worktree limpio, `tsc --noEmit` da errores idénticos con y sin el archivo. El motivo entero quedó escrito
**dentro de `.gitignore`**. Ficha 119 tachada y explicada.

### ✅ Deudas 117 + 118 — SALDADAS

Van **juntas** porque el explorador midió que **tocan la misma línea de los mismos dos archivos**.
Contrato: **enmienda E12 del RFC-01** (quinta tanda), escrita hoy por el leader con cinco decisiones
(a-e). **Motivo de que haya enmienda y no sólo arreglo:** se midió que **la rejilla de dos columnas de
auth NO ESTÁ ESPECIFICADA EN NINGÚN SITIO** — ni RFC-01 ni SDD-01 la mencionan. Era una decisión de
producto tomada a mano en `bdb11b0`, legítima pero **sin fuente de verdad**, así que no había documento
contra el que validar el comportamiento responsive. Ahora lo hay.

**Los tres datos medidos que mandan sobre el arreglo** (no los re-derives):
- **La ficha 118 acertaba y se quedaba CORTA.** `AsciiYarn` **no devuelve `null`** por debajo de
  `--bp-tablet`: devuelve **siempre** su host `h-full w-full` con la escena vacía dentro. Así que la
  segunda pista `1fr` **existe y reclama su mitad del ancho**. Y `minmax(0, 1fr)` deja que baje por
  debajo de su contenido mínimo → **no hay scroll horizontal que avise, simplemente se aplasta**.
  A 390px: **47px de formulario y 91px de columna vacía al lado.**
- **Las variantes del repo son MIN-WIDTH.** No hay ni un `@custom-variant` en `src/`; `tablet:` compila a
  `@media (width >= 768px)`. El SDD dice *"tablet-first"* como **prioridad de diseño, no como mecánica** —
  y el explorador sospecha que **ese malentendido es el origen de la 118**. Un arreglo pensado en clave
  max-width **no compila a nada**.
- **`px-20` es el ÚNICO valor de espaciado crudo de todo `src/`** (1 de 55) y **ningún guardrail puede
  verlo**: `PX_LITERAL` busca `<dígitos>px` y aquí el `px` va delante y significa *padding-inline*. Aporta
  **160 de los ~208px** que se pierden en móvil. Se tokeniza **conservando los 80px en tablet/desktop**:
  el diseño del usuario no se toca donde él lo mira.

### ⚠️ El hallazgo de MÉTODO de este lote, que es lo que hay que recordar

**Cero gates se rompen al arreglar la 118 — porque cero gates miden lo que la 118 denuncia.** Hoy se puede
borrar la variante responsive de `DashboardHero.tsx:58` y de los tres paneles del Dashboard y **la suite
entera sale verde**. Y como todo el hueco es `aria-hidden`, **`axe` tampoco lo ve**: el agujero es
**invisible para todos los gates que existen**. Es el mismo patrón que motivó `breakpoint-tokens.test.ts`
un piso más arriba — allí se ataron los **tokens**, aquí faltan **las clases que los consumen**.
Por eso **E12(e) hace el gate obligatorio**, y con dos condiciones: que llegue **al CSS compilado**
(una clase puede existir en el JSX y no compilar a ninguna media query) y que **descubra** los
consumidores en vez de enumerarlos, con ancla anti-descubrimiento-roto.

### ✅ VERIFICACIÓN EN NAVEGADOR REAL (REGLA 4) — hecha por el leader, con `next dev` y Chrome

La ficha 118 es de la familia de la regla 4 y el informe del explorador **no la sustituía**: su cuenta
de 47px era *aritmética con tokens medidos*. Ya no hace falta creerla. **El subagente `implementer` no
tiene herramientas de navegador, así que esta parte es del leader.**
Emulación de dispositivo sobre `/register` y `/login`:

| viewport | `grid-template-columns` | `padding-inline` | celda del ovillo | scroll horiz. |
|---|---|---|---|---|
| 390px (móvil) | `340.462px` (**una** pista) | `0px` | `display: none` | no |
| 767px | `340.462px` (**una** pista) | `0px` | `display: none` | no |
| **768px** (`--bp-tablet`) | `280px 280px` | `80px` | `display: block` | no |
| 1280px | `536px 536px` | `80px / 80px`, `column-gap: normal` | `display: block`, escena montada | no |

- **Conmuta EXACTAMENTE en `--bp-tablet`**: 767px y 768px son los dos lados del filo, medidos por separado.
- **El diseño del usuario está intacto de tablet para arriba**: dos columnas, 80px de relleno lateral y
  sin `gap`. Es la misma geometría que producía `px-20`, ahora por token.
- A 390px los campos miden **297px** (register) y **267px** (login), y el botón **45px de alto**
  (objetivo táctil ≥44px). `[data-slot="bg-3d"]` **ya no existe** en las dos páginas de auth.
- **Confirmación incidental de la 119:** `pnpm dev` corrió y `next-env.d.ts` **no apareció sucio**.

**Y la parte que más valía la pena — el estado ANTERIOR, reproducido y medido, no calculado.** Se inyectó
la geometría vieja por DOM en la página viva (sin tocar el árbol de trabajo): columnas de **91.2px** y
campos de **48px** a 390px. **La aritmética del explorador (91px / 47px) acertó dentro de 1px.** Y
confirma lo peor de la ficha: **no hay scroll horizontal que avise, simplemente se aplasta.**
Captura del antes: el título y "Contraseña" se salen de la tarjeta, los campos quedan cuadraditos y el
botón parte en dos líneas, con una columna vacía de 91px al lado.
*(Capturas en el scratchpad de la sesión, no versionadas: `register_390_ANTES.png` / `_DESPUES.png`.)*

### ✅ Lo que entregó el implementer, y lo que el reviewer le encontró

**Gate nuevo: `src/app/yarn-host-responsive.test.ts`** (20 casos, **+20 tests**). Cumple las tres
condiciones de E12(e): asierta sobre el **CSS compilado** (regla 7), **descubre** los anfitriones de
ovillo en vez de enumerarlos (medicina de las deudas 40/43/71/91) y lleva **dos** anclas
anti-descubrimiento-roto. **El descubrimiento no encontró ningún consumidor no conforme:**
`DashboardHero` ya cumplía, **sólo que nada lo vigilaba**.

**El número que justifica todo el encargo, verificado al dígito por el reviewer:** al matar
`--breakpoint-tablet`, los **seis** asertos que leen nombres de clase **siguen verdes** y sólo caen los
**ocho** del CSS compilado (`8 failed | 12 passed`). **Un gate que sólo mirara clases no habría servido
de nada** — una clase puede existir en el JSX y no compilar a ninguna media query.

**El reviewer atacó el gate en vez de leerlo**, y por eso vale su aprobación: rompió el descubrimiento a
propósito (salió rojo con **cuatro** asertos, **más red de la que el implementer presumía**), y **montó
una página sonda propia** para contestar si la exención del caparazón era una allowlist disfrazada.
Respuesta: **derivada, pero SÍ esquivable** → **deuda 123, prioridad alta la próxima vez que se toque
el gate**. Verificó además la restauración del árbol con seis sumas de control, y las cuatro citas del
`.gitignore` palabra por palabra contra `next@16.2.10`.

### 🔴 Corrección honesta, del propio leader

En el encargo al reviewer escribí *"los 12 casos de `auth-pages.test.tsx`"*, heredando la cuenta del
explorador. **Son 14.** Lo levantó el reviewer. No cambia el veredicto —el inventario está 1:1 y los dos
asertos ajustados son exactamente los que el contrato nombraba— pero **queda escrito**: es la misma raíz
que los dos incidentes de medición inventada ya registrados en este libro mayor, **nadie volvió a la
fuente a comprobarlo**.

### 🛑 ALCANCE DE ESTA SESIÓN, acotado por el usuario (2026-08-10)

**La sesión terminó al cerrar las deudas 117/118/119. `#20 projects_list_ui` NO se arrancó** — decisión
explícita del usuario: *"lo de la implementación siguiente lo vemos mañana"*. **No está `in_progress`.**
El bloque "PRÓXIMA — feature #20" de más abajo sigue siendo válido tal cual y es el punto de entrada de
la próxima sesión.

### 🆕 Deudas nuevas fichadas hoy (120-122), ninguna del encargo

- **120 — 🔴 la más grave, y salió de refilón:** `postcss` es **dependencia fantasma** (dos tests la
  importan, no está en `package.json`) y **un clon limpio falla `pnpm typecheck` hoy**. No se descubre por
  uso —sólo al clonar o en un CI limpio— y la ruta de descubrimiento es la peor: **parece un problema de
  TypeScript, no una dependencia que falta**. Arreglo: una línea. **NO se plegó al lote a propósito**
  (tocar `package.json` se sale del encargo que acotó el usuario) → **decisión pendiente del usuario**.
- **121** — el ovillo de auth pasó a `interactive={true}` y **nada lo vigila** (familia de la deuda 52).
  E12 decidió a propósito no resolverla.
- **122** — los cinco breakpoints de fábrica de Tailwind siguen en el compilado; nadie los usa hoy, pero
  nada impide saltarse el sistema de tokens y quedar fuera de `breakpoint-tokens.test.ts`.

### 🔴 Corrección de libro mayor

La nota del "Pendiente operativo" sobre la **eliminación de `tsconfig.tsbuildinfo` preparada en el índice**
**estaba obsoleta**: ya se resolvió en el commit `4973309`. Corregida abajo, no borrada.

---

## ✅ ESTADO AL CERRAR (2026-08-07) — VERDE

**`bash ./init.sh` → `EXIT_CODE=0`.** `Test Files 69 passed | 3 skipped (72)` ·
`Tests 1200 passed | 13 skipped (1213)`. `pnpm build` OK.
**Verificado por el leader por su cuenta**, no heredado de un subagente.

### Lo que pasó al final de la sesión, y conviene leer

El rediseño de las páginas de auth del usuario (commit `bdb11b0`) puso el ovillo **también en
register**, y el criterio de **#31** decía *"ovillo ASCII de fondo SOLO en login (no en register)"*, con
test que lo fijaba. **El árbol quedó en rojo, y el gate hizo exactamente su trabajo**: avisar de que se
estaba cambiando algo que alguien había fijado a propósito. No era un bug: era una **decisión de
producto**.

**Resuelto en la misma sesión** (deuda **116**, saldada): el gate se **reescribió a conciencia**, no se
borró ni se saltó (deuda 29). Ahora fija la realidad nueva y lleva escrito qué decía antes, qué cambió y
por qué — más un aviso a quien venga: **la ficha de #31 describe el criterio viejo, no lo "arregles" al
revés**. El criterio revertido quedó **anotado, no borrado**, en `feature_list.json` #31.

**Siguen VIVAS tres del mismo commit, y ninguna bloquea:**
- **117** — `data-slot="bg-3d"` ya no describe lo que hay debajo (es una celda de rejilla, no una capa
  de fondo). **Importa porque es la manija por la que los dos gates de auth agarran la pieza**;
  renombrarlo los arrastra a los dos a la vez.
- **118** — la rejilla de dos columnas **no tiene variante responsive**, y por debajo de `--bp-tablet` el
  ovillo **no se monta**: en móvil quedaría media pantalla vacía y el formulario a mitad de ancho.
  **NO MEDIDO en navegador** — es lectura de código. Familia de la **regla 4**.
- **119** — `next-env.d.ts` se comiteó pese al aviso de no hacerlo a ciegas.

## ✅ CERRADO — Feature #19 `dashboard_ui` (2026-08-07)

> **Feature `done`. Reviewer APROBÓ en la ronda 2.** Cadena: leader → 3 exploradores en paralelo →
> implementer → reviewer (**CAMBIOS REQUERIDOS, 1 bloqueante**) → ronda 2 → **APROBADO**.
> **Informe de cierre: `progress/informs/19.informe-dashboard_ui.md`.**
>
> `bash ./init.sh` **exit 0**: `1200 passed | 13 skipped` en **69 archivos** (partida: 788/13 en 62)
> → **+412 tests**. `pnpm build` OK. `pnpm lint` sin una sola línea de salida.
>
> **Es la primera página de contenido del proyecto**, y con ella nace `src/features/projects/ui/`
> con la card que **#20 va a reusar** (E2.1).

### Detalle del implementer

- **Feature:** 19 — `dashboard_ui`.
- **Baseline medido al arrancar** (`bash ./init.sh`, exit 0): `62 passed | 3 skipped` archivos,
  **`788 passed | 13 skipped`** tests.
- **Informe:** `progress/reports/impl_dashboard_ui.md`.

**Plan:**
- **E1.1** — `src/proxy.ts:14` deja de listar `/`; reescribir `src/proxy.test.ts:55-62` (sin recortarlo) y
  **añadir el gate positivo** que hoy no existe (sin token, `/` → 307 a `/login` con `next=/`); reescribir el
  enunciado de `:127-131`, que cambia de significado.
- **E1.2** — `AppShellClient` decide el fondo por `usePathname()`: en `/` no monta el fondo global (el hero
  es el único ovillo). Partir `AppShellClient.test.tsx:98-106` en el par, y **gate nuevo** en la página:
  `queryAllByTestId("ascii-yarn")` con longitud **exactamente 1** y `data-interactive="true"`.
- **UI** — `src/features/dashboard/ui/` (hero, selector conmutable/superponible, panel de métricas con
  comparativas E1.4/E1.5, filtros año+tipo, lista de activos por `updatedAt` con etiqueta honesta E2.2,
  estados loading/vacío/error, modal de creación con el `type`) y **`src/features/projects/ui/ProjectCard`**
  (E2.1: foto + nombre + progreso + tiempo, **sin quick-start**).
- **E2.3** — ampliar el barrido de `src/shared/ui/no-hardcode.test.ts` de `src/shared/ui/` a `src/`,
  ampliando también su seguro anti-barrido-roto.
- **Verificación** — `bash ./init.sh` + `pnpm build`, con **condición doble** (REGLA 3) en cada gate nuevo.

**✅ IMPLEMENTACIÓN TERMINADA — a la espera del reviewer.** `bash ./init.sh` **verde** (`EXIT=0`):
`68 passed | 3 skipped` archivos, **`1194 passed | 13 skipped`** tests (baseline 62/788).
`pnpm build` OK. Las ocho decisiones (E1.1-E1.5, E2.1-E2.3) implementadas, cada gate nuevo con su
**condición doble ejecutada en las dos direcciones y la salida pegada**. Además, **medido contra
servidor real**: sin sesión `/` → 307 a `/login?next=%2F`; con sesión → 200 y el HTML servido lleva
**un solo host de ovillo**, el hero (`data-interactive="true"`), con el slot `bg-3d` del caparazón
**vacío**. Informe: `progress/reports/impl_dashboard_ui.md`.

**Aviso de método de esta sesión (va en el informe §7):** mi primera sonda contra el servidor daba 307
con sesión y estuve a punto de ficharlo como fallo de entorno del proxy. **Era mío**: firmaba el token
con un secreto mal extraído de `.env`, y una comparación que hice para diagnosticarlo devolvió "104"
que **no era la longitud del secreto sino la del mensaje de error** de un `require` fallido capturado
en un `try`. Con la sonda bien montada (mismo secreto conocido en los dos lados) la ruta respondió 200
a la primera. **No hay ningún defecto de entorno que fichar.** *(El reviewer midió la causa real y es
mejor que la mía: el `JWT_SECRET` local está entre comillas y lleva un `$`, y `@next/env` **expande
variables**, así que el servidor usa 18 caracteres de los 24 escritos. Ficha de deuda en su §7.2.)*

### ✅ RONDA 2 — bloqueante B1 del review, RESUELTO (a la espera del segundo pase)

**El review dio CAMBIOS REQUERIDOS con 1 bloqueante, y NO era un bug de código: era una afirmación
falsa sobre el arnés en un comentario de producción.** `DashboardHero.tsx` decía que un test de tokens
obligaba a moverse juntos a la variante responsive de tablet y a `--bp-tablet`. **No existía**: el
único que ataba los dos namespaces era `archive-nav.tokens.test.ts:257-262`, y es del par `archive`.
El reviewer lo demostró desincronizando los tokens en `globals.css` y corriendo la suite entera:
**1194 passed, exit 0, cero rojos**.

**Resuelto por la vía 1 — se escribió el test que faltaba, y para los CUATRO pares:**
`src/shared/ui/breakpoint-tokens.test.ts`. **Los pares se DESCUBREN del propio `globals.css`, no se
enumeran** (una lista a mano dejaría suelto el quinto breakpoint el día que exista: patrón de las
deudas 40/43/71), se comparan **como conjuntos** (falla al añadir y al quitar) y hay **seguro
anti-descubrimiento-roto**, porque dos conjuntos vacíos son iguales entre sí, o sea verde con el
guardrail apagado. **Esto salda de nacimiento la deuda 1 de la §7 del review** ("sólo un par está
atado; los otros tres no").

**Condición doble, con la mutación EXACTA del reviewer sobre la suite entera:** de `exit 0` a
**`VITEST_EXIT=1`**. Los cuatro pares enrojecen uno a uno; la pertenencia enrojece en las dos
direcciones. `globals.css` restaurado y verificado por `md5sum` (`9aa85707662c00471d8a315c9fff7bfc`,
el mismo hash que anotó el reviewer). Salidas pegadas en el informe **§11**.

- `bash ./init.sh` **verde** (`EXIT=0`, sin tubería): `69 passed | 3 skipped` archivos,
  **`1200 passed | 13 skipped`** tests. `pnpm build` OK.
- **Ni una línea de producción cambiada en esta ronda**: +1 archivo de test (+6 tests) y **dos
  comentarios** (`DashboardHero.tsx`, que ahora **nombra el archivo** en vez de aludir a un test
  anónimo; y `NewProjectDialog.tsx:5`, con el motivo del import por ruta interna).
- Higiene del review cerrada: el informe corrige la afirmación falsa **dejando escrito qué decía
  antes**, corrige "54" → **55** archivos barridos, y reescribe en prosa las clases de Tailwind que
  citaba literalmente.
- **La feature sigue en `in_progress`.** No la marco `done`.

> **Veredicto final (reviewer, ronda 2): APROBADO.** Verificó los cuatro pares con **cuatro mutaciones
> independientes** —cada uno cae por separado— y, lo que se negó a dar por supuesto, **rompió el
> descubrimiento a propósito**: el bucle genera cero tests pero el ancla de inventario pone el archivo
> en rojo. **No hay verde silencioso.** Confirmó además que la ronda 2 no tocó ni una línea ejecutable
> de producción (comparación byte a byte contra sus copias de la ronda 1).

### Cómo se llegó hasta aquí — decisiones, mediciones y correcciones (leader)

**Gate de arranque:** `bash ./init.sh` **verde** — `788 passed | 13 skipped`, 62 archivos, lint ✓, typecheck ✓.
Ojo: la **primera** corrida salió en rojo por un timeout de `src/shared/db/index.test.ts` (5929ms contra un
techo de 5000ms). Aislado pasa en 3.12s y la segunda corrida completa salió verde sin tocar nada. **Es flaky,
no roto** → fichado como **deuda 103**.

### ⚠️ TRAMPA DE MÉTODO descubierta al verificar el gate

`bash ./init.sh | tail -40` **devuelve el código de salida de `tail`, no el del script**, así que el arnés
reportó `exit code 0` sobre una corrida que había **fallado**. `init.sh` hace `exit $EXIT_CODE` correctamente
(línea 117): el defecto era de la invocación, no del script. **Si vas a leer el código de salida de
`init.sh`, no lo pases por una tubería** — redirigí a archivo y leelo después.

### Informes de exploración (medidos, con archivo y línea) — NO repitas ese trabajo

- `progress/reports/explore_19_hero_fondo.md` — E1.2: cómo desmontar el fondo global sólo en `/`.
- `progress/reports/explore_19_proxy_ruta_privada.md` — E1.1: la línea del proxy y el test que cae.
- `progress/reports/explore_19_datos_y_primitivas.md` — contratos de datos, API de primitivas, patrones.

### 🔴 CORRECCIÓN DE LIBRO MAYOR: la enmienda E1.1 citaba una deuda que no existe

E1.1 decía *"Salda las deudas 1 y 13"*. **Falso.** La **deuda 13** es el interlineado del botón perdido por
`twMerge`, **saldada el 2026-07-31** con gate propio en `button.variants.test.ts`. No tiene nada que ver con
el proxy. El error nació de leer el `(#13)` del título de la deuda 1 —que por convención del libro mayor es
**el id de la FEATURE donde se detectó**, no otra deuda; la deuda 2 lleva el mismo `(#13)` y trata de otra
cosa— como si fuera un número de deuda. De ahí se propagó a `feature_list.json` #19 (dos sitios) y de ahí a
la enmienda.

**Corregido en los tres sitios, con la corrección escrita, no borrada.** **NO tachar la deuda 13 al cerrar
#19.** Verificado de forma independiente por el leader, no heredado del explorador.

> **Es la misma familia que el bloqueante de la sesión anterior**, pero por otra vía: allí un dato inventado
> se presentó como medición; acá una **procedencia** se leyó como **deuda** y se propagó por copia a través
> de tres archivos. Las dos comparten la raíz: **nadie volvió a la fuente a comprobarlo.**

### Las TRES decisiones que quedaban abiertas, cerradas por el usuario → enmienda **E2** (RFC-02 §7-ter)

E1 había cerrado cinco, pero quedaban tres. **Ninguna se reabre.**

- **E2.1 — la card de proyecto la crea #19, en `src/features/projects/ui/`, SIN quick-start.** La ficha decía
  "reusa la card de RFC-03" y **esa card no existía** (la carpeta tampoco). La versión de RFC-02 es
  **subconjunto estricto** de la de RFC-03, así que **#20 la extiende de forma aditiva** en vez de
  reescribirla. Se descartó dejar un slot de acción "preparado": un slot sin consumidor es código muerto que
  no se puede probar contra un consumidor real.
- **E2.2 — Q14 cerrada: orden por `updatedAt`, y la etiqueta DEJA de decir "último tejido".** El RFC
  recomendaba `updatedAt` apoyándose en que *"ya se bumpea al parar una sesión"*. **Medido: cierto pero
  incompleto.** También lo bumpean `PATCH` (renombrar, nota, foto, estado), sumar vueltas y marcar pasos; y
  **no** lo bumpea arrancar una sesión. O sea `updatedAt` es **"último toque"**, un superconjunto. Se compra
  el coste cero y **se corrige la etiqueta** para que no mienta. El camino de backend (`lastSessionAt` con un
  `MAX`) queda como deuda.
- **E2.3 — el guardrail de no-hardcode amplía su barrido de `src/shared/ui/` a `src/`.** Medido: hoy
  `no-hardcode.test.ts:27` sólo vigila `shared/ui`, así que `features/dashboard/ui/` y `features/projects/ui/`
  **nacerían sin red**. Es la medicina de las deudas **40/43/71**. **Los rojos preexistentes se fichan, no se
  arreglan aquí.**

### Lo que el implementer tiene encargado además, y que hoy NO existe

- **El gate de E1.2.** No hay **nada** que impida los dos ovillos: los cinco tests que mencionan el ovillo
  usan `getByTestId` **en singular**, y un singular **no falla con dos instancias**. Hoy E1.2 es **prosa, no
  invariante**.
- **El gate positivo de la deuda 1.** Sin token, `/` → 307 a `/login?next=/`. Sin él, un test que sólo
  enumera páginas públicas **nunca falla cuando alguien vuelve a añadir `/` a la lista**.

### Hechos medidos que el implementer NO debe re-derivar

- **`hours` viaja en SEGUNDOS**, y su `referenceValue` también → `SECONDS_PER_HOUR` de `@/shared/config`,
  nunca `3600` a mano. `Project.time` también en segundos.
- **Asimetría real:** `/api/dashboard/metrics` devuelve el objeto **plano**; `/api/projects` devuelve
  **`{ projects }`** envuelto.
- **⚠️ `ProjectRecord` MIENTE al cruzar la red:** declara `Date` y el JSON entrega **string ISO**.
  `p.updatedAt.getTime()` **compila y explota en runtime**, y afecta justo al orden de E2.2. No hay ninguna
  utilidad en el repo para esto.
- **Por debajo de `--bp-tablet` el ovillo no se monta:** el bloque de hero debe sostenerse sin él.
- **Zustand NO está instalado**, aunque `CLAUDE.md` lo nombre en el stack. No hay cliente HTTP de navegador:
  el único precedente es `src/features/auth/ui/auth-client.ts`.

---

## ✅ CERRADO — lote de deudas 86 / 87 / 90 / 94 (enablers de #19)

**NO es una feature de `feature_list.json`** (ese archivo **no se tocó**). Lote de deuda técnica sobre
`src/shared/ui/`, pedido por el usuario como enabler de **#19 `dashboard_ui`**.

**Cadena:** leader → implementer → reviewer (**CAMBIOS REQUERIDOS, 1 bloqueante**) → **corrección aplicada
por el leader** (el bloqueante era prosa en `progress/`, su carril). **Informe de cierre:
`progress/informs/18.informe-deudas_86_87_90_94.md`.**

### ⚠️ AVISO DE MÉTODO — el bloqueante fue un DATO INVENTADO en el libro mayor

El informe del implementer afirmaba **como dato medido** que *happy-dom sí enfoca un `input` deshabilitado*, y
esa frase se había escrito **también en la ficha 90 de `deudas.md`**. **Es falsa.** La levantó el reviewer;
**el leader no la dio por buena por venir de un reviewer** y montó una sonda con **las dos tesis enfrentadas
en el mismo archivo**: salió `1 failed | 1 passed` y cayó la del implementer. `focus()` sobre un control
deshabilitado es un **no-op**.

**Por qué importa más que un bug normal:** un dato falso presentado como medición **contamina a todos los que
vengan después** — el siguiente agente lo cita como hecho establecido sin volver a medirlo. **Un error de
código lo caza un test; una medición inventada no la caza nada.**

**El código era correcto** (derivar el repliegue de `focusableWithin` es lo acertado, por la razón buena: un
solo criterio de "enfocable" compartido con la trampa de foco). **Lo que estaba mal era la justificación.**
La corrección quedó **escrita en los dos sitios, no borrada.**

- `bash ./init.sh` **verde**: lint ✓, typecheck ✓, **62 passed | 3 skipped** archivos,
  **788 passed | 13 skipped** tests (baseline: 60/756). `pnpm build` OK.
- **+32 tests, 3 archivos nuevos**: `primitives/dialog/root-scroll-lock.ts`,
  `primitives/dialog/dialog.portal.tokens.test.ts`, `primitives/skeleton/skeleton.tokens.test.ts`.
- **`public-api.test.ts` NO cayó, y está bien**: no cambió ningún export de `primitives/` ni de `feedback/`
  (una prop no es un export; las constantes de clases del `Skeleton` nunca fueron públicas).
- **`deudas.md` pasa de 94 a 102 fichas**: 86, 87, 90 y 94 **tachadas y explicadas** (el reviewer verificó que
  ninguna está tachada de más); nuevas **95-102**.
- **Tres que #19 cierra casi gratis, porque va a tener la pantalla delante:** **95** y **102** (el shimmer
  **está en el bundle pero nadie lo ha visto moverse**; y la 95 añade dos motivos para mirarlo: el fondo **se
  repite**, así que un bloque ancho enseña **varias bandas a la vez**, y la forma redonda mide menos de un
  cuarto de la banda) y **101** (**nada obliga a que un test que monte un `Dialog` compruebe que soltó el
  bloqueo** — #19 va a montar uno, y si no lo suelta **contamina a los siguientes con todo en verde**, y el
  rojo sale en un archivo que no tiene la culpa).
- **Dos a tener en el radar al escribir el modal de #19:** **99** (el foco inicial se decide **una vez, al
  abrir**: si el contenido llega después, se aplica el repliegue **y no se reintenta**) y **97** (el bloqueo
  de scroll **no compensa el ancho de la barra**, así que el fondo **salta unos píxeles** al abrir).
- **Una honesta sobre el arreglo de la 94:** la **100** avisa de que el test del portal **lee `AppShell.tsx`
  como texto**, acoplando un primitivo portable a la capa de layout, y **cae sin que nada esté roto** si el
  `main` pasa a sacar sus clases de un `cva`, que es la convención del repo.

**Lo que #19 puede dar por hecho a partir de ahora:**
- El `Dialog` **bloquea el scroll del fondo** solo, sin que la página haga nada.
- El `Dialog` acepta **`initialFocusRef`** para enfocar el primer campo del formulario. **Sin la prop el
  comportamiento es idéntico al de antes** (enfoca el panel).
- El `Skeleton` anima con el **shimmer del template**, todo por token, y con movimiento reducido se queda
  quieto **sin desaparecer**.

**Plan ejecutado:**
- **86** — port 1:1 del shimmer del template (`template-src.html:25` y `:140`): `@keyframes kc-shimmer` +
  gradiente + banda + duración + curva, **todo tokenizado** en `globals.css` (`--animate-skeleton`).
  `prefers-reduced-motion` sigue resolviéndose en JS y el bloque quieto sigue siendo un bloque de carga.
  Gate sobre el **CSS compilado** (REGLA 7), no sobre el fuente.
- **87** — bloqueo de scroll del elemento raíz con **contador de referencias** de módulo: cubre desmontar
  sin cerrar, dos diálogos a la vez y no pisar un `overflow` previo.
- **90** — prop opcional de foco inicial; **el default no cambia**. Repliegue al panel cuando el objetivo
  no está montado o no es una parada de tabulación que la trampa ya reconozca.
- **94** — corregir la prosa del portal (la jaula es el `main` con `--z-base`, no un `transform` del
  archivero) y **convertirla en un test** que ate el portal a los tokens.
- Verificación: `bash ./init.sh` + `pnpm build`, condición doble (REGLA 3) en cada gate nuevo.
- Informe: `progress/reports/impl_deudas_86_87_90_94.md`.

- **Feature en curso:** ninguna. **LA FASE DE BACKEND ESTÁ COMPLETA** y las primitivas que #19 necesitaba ya
  existen. Siguiente = **#19 `dashboard_ui`**, con **sus cinco decisiones ya cerradas** en la enmienda **E1
  del RFC-02 (§7-bis)**.
- **Cerrado en esta sesión, en este orden — las CINCO APROBADAS A LA PRIMERA, 0 bloqueantes:**
  1. **Deuda 59** — primera subida real a Cloudinary. **No es una feature.** Informe:
     `progress/informs/13.informe-deuda59-smoke_cloudinary.md`.
  2. **#16 `dashboard_comparison_3metrics`** → **`done`**. leader (cierra 2 decisiones con el usuario y
     escribe el **PRD §8.1**) → implementer → reviewer. Informe:
     `progress/informs/14.informe-dashboard_comparison_3metrics.md`.
  3. **#17 `projects_detail_yarns`** → **`done`**, y con ella **la deuda 5 SALDADA**. leader (cierra 2
     decisiones con el usuario y escribe el **PRD §9.1**) → implementer → reviewer. Informe:
     `progress/informs/15.informe-projects_detail_yarns.md`.
  4. **#18 `patterns_used_by`** → **`done`**. **Última slice de backend.** leader (cierra la decisión de
     forma con el usuario y escribe el **PRD §9.2**) → implementer → reviewer. Informe:
     `progress/informs/16.informe-patterns_used_by.md`.
  5. **#33 `ui_primitives_2`** → **`done`**. **Slice NUEVA**, abierta hoy: la ficha de #19 asumía seis piezas
     del SDD §6 que **no existían**. leader (detecta el problema, lo lleva al usuario, cierra las **cinco
     decisiones de #19** en la enmienda **E1 del RFC-02**, abre la slice) → implementer → reviewer. Informe:
     `progress/informs/17.informe-ui_primitives_2.md`. **+154 tests: la slice con más cobertura del proyecto.**
- **Lo más valioso de #16 no fue el código, fue el método:** el test que protegía la conversión de unidades
  **pasaba en falso** (derivaba de la lista ya convertida, así que se movía *con* el bug). Lo destapó la
  **regla 3** al no verlo caer en rojo. El reviewer lo re-verificó por su cuenta en las dos direcciones del
  error, **sin tocar el árbol de trabajo** (copia al scratchpad + alias de módulo en un config alternativo de
  Vitest — técnica reutilizable para mutar sin ensuciar el repo). **Limitación medida:** no alcanza a lo que
  lee ficheros reales por `import.meta.url`.
- **Lo más valioso de #17, también método:** el implementer **no se conformó con el doble en memoria** y
  añadió `src/features/projects/api/store.test.ts`, que asierta el **SQL realmente emitido** por Drizzle. Es
  la lección de la **deuda 6** aplicada **antes** de que mordiera: las 5 columnas, el `WHERE` del scoping, el
  `ORDER BY` y el tipo de JOIN quedan fijados **sobre producción**, no sobre la réplica. **Copiá el patrón
  cuando toques el store.** Su precio está fichado como deuda **77**.
- **#18 MIDIÓ por qué ese patrón hace falta, y el número da miedo:** al borrar el filtro **de producción**, la
  suite entera quedó en **`2 failed | 600 passed | 13 skipped`**. Los 32 tests de ruta **siguieron verdes**,
  porque el **doble en memoria implementa el filtro por su cuenta** y sigue acotando aunque producción no lo
  haga. **Los únicos dos rojos fueron los del SQL emitido.** Es la **deuda 6 exacta, medida en vivo** y
  confirmada de forma independiente por el reviewer. → **REGLA 7** y deuda **81**.
- **#33 SALDÓ, sin que nadie se lo pidiera, la deuda que llevaba CUATRO apariciones:** el guardrail de
  no-hardcode pasó de **lista fija de 18 archivos** a **barrido por recorrido de directorios** (medicina de
  las **40/43/71**). El reviewer lo verificó a fondo porque reescribir un guardrail es la clase de cambio que
  lo debilita sin que se note: barre **54** archivos, **los 18 viejos siguen dentro**, las regexes son **byte
  a byte idénticas**, **sin allowlist**, y **5/5 rojos** al inyectar hardcode en archivos viejos y nuevos.
  **Quedan dos guardrails de lista fija (40 y 43) y ahora hay implementación de referencia: ~15 líneas cada
  uno** → deuda **91**.
- Última feature cerrada antes de hoy: **#15 `uploads_image`**, ya en `progress/history.md`. Informe:
  `progress/informs/12.informe-uploads_image.md`.

## Estado del proyecto

- **Fase 1 (PRD-01, features 1-11):** completa (`done`).
- **Fase 2 (UI, features 12-33):** en curso. **22 de 33 features `done`** — #12, #13, #14, #15, #16, #17,
  #18, **#19**, #31, #32 y #33. **Siguiente = #20 `projects_list_ui`.**
- **`/` ya no es pública** (deuda 1 saldada). Quedan públicas **sólo** `/login` y `/register`.
- **Ya existe la primera página de contenido.** Lo que queda es #20-#30: proyectos (3 slices), lanas (3),
  patrones (3), calculadoras y stash.
- **🎉 TODO EL BACKEND ESTÁ CERRADO.** Las features de datos/BFF (1-11) y las cuatro slices de backend de la
  fase 2 (**15, 16, 17, 18**) están `done`. **Lo que queda es UI**: #19-#30.
- **`feature_list.json` tiene ahora 33 features**, no 32: **#33 `ui_primitives_2` es nueva**, la abrió el
  leader el 2026-08-06 con el usuario. Es la única añadida fuera del plan original.
- `bash ./init.sh` VERDE: **788 passed | 13 skipped** (**62** archivos + 3 skipped, que son los tres smokes:
  Neon, auth y Cloudinary). `pnpm build` OK. **Verificado ejecutándolo**: el leader al arrancar (547/11),
  antes de #17 (577/13), de #18 (590/13) y de #33 (602/13); los reviewers al cerrar la deuda 59 (547/13),
  #16 (577/13), #17 (590/13), #18 (602/13) y #33 (756/13).
- **Git: #15 ESTÁ COMMITEADO** en `83ab95a feat: add upload image`, y el árbol arrancó la sesión **limpio**.
  La nota anterior que decía "todo #15 está sin commitear" **estaba desactualizada y queda corregida**
  (lo corrigió el usuario; verificado por el leader con `git status` + `git log`). **Sin commitear:** la
  **deuda 59** (`src/__smoke__/`, 2 líneas de `src/shared/lib/cloudinary/`), **#16** (`src/shared/config/`,
  `src/features/dashboard/`) y **#17** (`src/features/projects/`). **Ya están commiteados los tres** por el
  usuario en `0351c4d` (#16) y `2cbfa00` (#17); la nota anterior que hablaba de "cuatro commits pendientes"
  **quedó desactualizada y se corrige aquí**. **Sin commitear queda SÓLO #18** (`src/features/projects/`
  —validación, tipos, store, doble, tests—, `src/app/api/projects/`, el smoke de Neon) más el PRD, el
  RFC-05, `feature_list.json` y `progress/`. Es **un único commit coherente**.
- **La app ya acepta fotos**, aunque todavía no haya formulario que las mande: la puerta existe y está
  probada.

## Decisiones cerradas por el usuario (no se reabren)

- **Contrato de `POST /api/uploads/image` (PRD §11.9):** lista blanca `image/jpeg`, `image/png`,
  `image/webp` (**lo no enumerado se rechaza**); tope **4 MB**; **ambas comprobaciones ANTES** de llamar a
  Cloudinary; **`publicId` único por subida**, `folder` determinista por `userId`.
- **El tope de 4 MB está ATADO A LA PLATAFORMA, no elegido al gusto.** Se cerró primero en 5 MB y **no
  cabía**: Vercel limita el cuerpo de petición a **4,5 MB a nivel de infraestructura** (no configurable
  desde `vercel.json` ni desde el código) y devuelve un **413 `FUNCTION_PAYLOAD_TOO_LARGE`** *antes de que
  el handler exista*. **Quien quiera subir este tope tiene que resolver antes el límite de la plataforma**
  (subida directa navegador→Cloudinary con firma). Está en el PRD **y en el docstring de la constante**,
  que es donde lo va a leer quien lo intente.
- **Tamaño de etiqueta del archivero: 18px** (`--text-nav-tab`), y con él `--bp-archive: 1180px`. Ese token
  **determina a partir de qué ancho existe el archivero**. Los dos están atados por un test que obliga a
  moverlos juntos.
- **El menú de cuenta vive en una banda propia del `AppShell`, fuera del elemento `nav`** (enmienda E11 del
  RFC-01), rige en **todos** los anchos y **no toca `BottomNav`**. `--bp-archive` sigue en 1180px.
- **Para el envío de los formularios de auth se compró el arreglo mínimo** (declarar POST), no la Server
  Action. El resto es la **deuda 39**.
- **Comparativas del Dashboard para las 3 métricas (PRD §8.1, feature #16):** `comparison` es un **mapa**
  `{ hours, projects, yarnMeters }` y cada entrada es `{ label, referenceValue, times }`. **`referenceMeters`
  ya no existe** — el cambio de forma es **breaking a propósito**, y se hizo ahora porque **no lo consume
  nadie** (#19 está `pending`). `referenceValue` viaja en la **unidad de su métrica** (segundos / unidades /
  metros) para que `times` sea un cociente puro. Las **semillas de horas y proyectos** están en la tabla del
  PRD §8.1; las tres listas viven en `src/shared/config`.
- **Lanas en el detalle de proyecto (PRD §9.1, feature #17):** `GET /api/projects/:id` responde
  **`{ project, yarns }`** — clave **hermana**, no anidada, así que **`project` queda byte a byte como estaba**
  y sigue siendo un `ProjectRecord`. Cada lana lleva **exactamente cinco campos planos**
  `{ id, colorName, colorFamily, brandName, typeName }`; **`colorCode` e `image` se descartaron a propósito**
  (el RFC no los pide; añadir después es aditivo y barato, quitar no). Sin enlaces, `yarns` es **`[]`**, nunca
  `null` ni ausente. **`GET /api/projects` (la lista) NO las lleva.**
- **"Usado en proyectos" de un patrón (PRD §9.2, feature #18):** se expone como **filtro**,
  `GET /api/projects?patternId=<id>`. **`GET /api/patterns/:id` NO cambia.** Se descartó `usedBy` porque
  invertiría la dirección del grafo de FKs (`projects.patternId → patterns`), que `architecture.md` §S1
  obliga a tratar como **DAG** —es la forma exacta que esa regla salió a prohibir tras el ciclo de #7— y
  porque `?yarnId=` ya contesta la pregunta idéntica para lanas. **Precio aceptado:** el drawer del patrón
  hace **dos peticiones**. **Corolario vigente: `src/features/patterns/` no consulta `projects`.**

## ⚠️ REGLAS vigentes para todos los agentes

**1. Nunca escribas una clase de Tailwind con comodines o inventada** en código, tests, informes, docs o
comentarios. Citá una clase real o describila en prosa. Un informe de #13 escribió una clase con un asterisco
como abreviatura; Tailwind v4 la tomó por real, generó CSS inválido y **tumbó la app entera con 500 en todas
las rutas**. Hay guardrail (`@source not` en `globals.css` + test en `src/app/globals-css.test.ts`), pero la
higiene sigue valiendo. Detalle: `progress/informs/6.informe-bugfix-tailwind_source_guardrail.md`.

**2. El par que un test mide se DERIVA del código, no se elige a mano** — **pero un valor de contrato
necesita ADEMÁS su ancla.** #15 destapó la **forma espejo** de esta regla y conviene leerla entera. El
patrón correcto tiene **dos piezas**: **(a)** *un* test que ancla la constante al literal del contrato —el
único sitio donde escribir el número a mano se justifica, porque **ahí el literal ES el contrato**— y **(b)**
todos los tests de comportamiento **derivando** de la constante. En #15 estaba (b) impecable y faltaba (a):
*"acepta `MAX` y rechaza `MAX+1`"* sigue en verde **sea cual sea `MAX`**, así que se podía decuplicar el tope
y abrir la lista blanca a SVG y PDF con **27/27 verde**. Al arreglarlo, **no conviertas (b) a literales**:
eso crea la deuda 18/22/23 de cero. Familia: deudas 18, 22, 23, 33, 40, 43.

**3. CONDICIÓN DOBLE en todo gate nuevo.** Tiene que verse **caer en rojo** al quitar el arreglo y pasar en
verde al restaurarlo, ejecutado en las dos direcciones, **con la salida real pegada y los números tal cual
salgan** (en #31 un informe declaró 9 rojos donde salían 12). **Para un ancla de pertenencia, "las dos
direcciones" significa añadir un elemento Y quitar uno**: un `toContain` pasa la segunda y falla la primera,
porque no detecta lo que *sobra*.

**4. Para lo que se sirve al navegador, medí contra un servidor real.** Los dos defectos más serios de #31
—la pantalla de login vacía y las credenciales viajando por la URL— **no los vio ningún test**: aparecieron
levantando `pnpm start` y mirando la respuesta.

**5. NUEVA (#15) — un valor de contrato se contrasta contra la PLATAFORMA antes de anclarlo en un test.**
El defecto más serio de #15 **no estaba en el código: estaba en el contrato**, y por eso **ningún test podía
encontrarlo** — los tests miden el código contra el contrato, y lo que fallaba era el contrato contra Vercel.
Había un test en verde certificando un caso que en producción falla **siempre**. Lo encontró un reviewer que
fue a comprobar un valor ya cerrado contra el entorno real de despliegue. **Si el número tiene un límite
externo (plataforma, proveedor, navegador), atalo con un test que lo exprese**, como hizo #15 con
`VERCEL_REQUEST_BODY_LIMIT_BYTES`: convierte una ficha de deuda en un invariante ejecutable.

**6. Los subagentes `Explore` son de SOLO LECTURA: no pueden escribir su informe.** Para la regla
anti-teléfono-descompuesto de `CLAUDE.md`, usá **`general-purpose`**, o asumí el volcado desde el leader.

**7. NUEVA (#18) — UN GATE QUE SÓLO CORRE SOBRE EL DOBLE NO MIDE PRODUCCIÓN.** Es la regla 3 llevada un paso
más allá, y esta vez está **medida, no argumentada**. En #18 se borró un filtro **del código de producción** y
la suite entera quedó en **`2 failed | 600 passed | 13 skipped`**: los **32 tests de ruta siguieron verdes**,
porque el **doble en memoria implementa el filtro por su cuenta** y sigue acotando aunque producción haya
dejado de hacerlo. Los únicos rojos fueron los del **SQL realmente emitido** (`store.test.ts`, patrón que
introdujo #17). **Es la deuda 6 exacta.**
**Qué hacer:** cuando toques el store, **anclá el SQL emitido**, no sólo el comportamiento del doble. El
andamio (`recordListQuery`) **ya está escrito** — cuesta unas líneas. Hoy el ancla cubre **2 de los 7 filtros**
de `list`, y los tres que faltan (`@>` de jsonb, `exists` correlacionado, rango de fechas) son **justo los que
el doble traduce peor**: deuda **81**.
**Corolario:** *"los tests pasan"* no es lo mismo que *"el código funciona"* cuando el sujeto de la frase es
una réplica escrita a mano. Familia: deudas **6**, **73**, **81**, **82**.

## PRÓXIMA — feature #20 `projects_list_ui`

**La card de proyecto YA EXISTE**: la creó #19 en `src/features/projects/ui/ProjectCard.tsx`
(enmienda **E2.1**). **NO la reescribas** — reusala y **añadile el quick-start** del cronómetro, que es
aditivo: la versión que hizo #19 (foto + nombre + progreso + tiempo) es **subconjunto estricto** de la que
pide RFC-03 §2. El cableado de `POST /:id/sessions/start` es trabajo de #20, no de #19.

**Lo que #20 hereda gratis de #19:** el cliente HTTP de navegador (`dashboard-client.ts` como molde), el
formateo de números y duraciones (`src/shared/lib/format.ts`), el tipo de proyecto **serializado**
(`features/projects/ui/types.ts`) y el guardrail de no-hardcode **ya vigilando `src/features/**/ui/`**.

**Tres avisos antes de empezar:**
- **La deuda 109**: el tipo de la card es un `Pick`, así que un proyecto entero encaja igual. Nada impide
  que #20 empiece a leer campos que no le tocan. **Es justo el momento de la tentación.**
- **La deuda 111**: el gate de "un solo ovillo" existe para `/` **porque el implementer lo escribió**.
  `/proyectos` puede nacer sin su test de composición dentro del caparazón. Hermana de la 92 y la 101.
- **Las deudas 74 y 79** hay que decidirlas **antes de #21**, y son la misma pregunta desde dos verbos:
  hay **dos formas** de "las lanas de un proyecto" en el mismo recurso, y `PATCH :id` devuelve el proyecto
  **sin** `yarns`.

## ~~PRÓXIMA — feature #19 `dashboard_ui`~~ (CERRADA el 2026-08-07 — se conserva el contexto)

**Cambia el modo de trabajo: se acabó el backend, empieza la UI.** Aplica el checklist visual del **SDD §9**
(RTL + axe + smoke + `init.sh` + `build`).

La página Dashboard: hero con el ovillo + selector de métrica conmutable **y superponible** (horas/proyectos/
metros, default horas) + las comparativas de las 3 + filtros de año y tipo + lista de activos con orden y
"ver todos" + modal de creación con el tipo preseleccionado. Página en `src/app/(app)/page.tsx`, UI en
`src/features/dashboard/ui/`. Fuente: **RFC-02** entero **+ su enmienda E1 (§7-bis)**.

**✅ LAS CINCO DECISIONES ESTÁN CERRADAS** (RFC-02 §7-bis, enmienda E1, 2026-08-06). Resumen:
**E1.1** `/` pasa a **privada**, sin landing (salda deudas **1** y **13**) · **E1.2** el hero **reemplaza** al
fondo global en `/`, **nunca dos ovillos vivos** · **E1.3** el hero **no** será operable por teclado, a
propósito, y **hay que documentarlo en el código** · **E1.4** formato `≈ 2,1 veces <etiqueta>`, con frase
propia si `times < 1` y **sin comparativa** si `times = 0` (salda la **69**) · **E1.5** la tarjeta de metros
lleva marca de **"total histórico"** (salda la **66**).

**⚠️ LO QUE SIGUE ABIERTO EN #19, y hay que decidirlo al planificarla:** la ficha dice *"reusa la card de
proyecto de RFC-03"*, y **esa card NO existe** — la crea **#20**, que va después. O #19 la crea (y #20 la
reusa), o la lista de activos se cae a #20. **#33 NO la incluyó a propósito.**

**✅ Las tres deudas de #33 que #19 iba a chocar (87, 90, 94) están SALDADAS**, más la **86**. Ver el bloque
del lote arriba. **Lo que #19 puede dar por hecho:** el `Dialog` **bloquea el scroll del fondo solo**, acepta
**`initialFocusRef`** para enfocar el primer campo (y **sin la prop se comporta idéntico a antes**), y el
`Skeleton` anima con el **shimmer del template**, todo por token, quedándose quieto **sin desaparecer** con
movimiento reducido.

## Notas para consumidores del design system (acumulado #12-#18, #31, #32, #33)

- **⚠️ SEIS PIEZAS NUEVAS (#33) — leelo antes de escribir cualquier página.** `ProgressBar`, `Skeleton`,
  `Toggle`/`ToggleGroup` y `Dialog` en `shared/ui/primitives/`; `EmptyState` y `ErrorState` en
  **`shared/ui/feedback/`** (carpeta nueva). Todas por `@/shared/ui`. **`StatePanel` NO es pública.**
  - **`Toggle` es CONTROLADO y SUPERPONIBLE** (varios activos a la vez, `aria-pressed`) — **no es un `Tabs`**,
    que tendría exactamente uno activo. El estado vive en la página. **Envolvelos en `ToggleGroup` con
    etiqueta**, o el conjunto se anuncia como botones sueltos.
  - **`ProgressBar` EXIGE `label`.** Sin él `axe` cae. Acota los valores imposibles **también en
    `aria-valuenow`**, no sólo en el ancho.
  - **`Dialog` es controlado (`open` + `onClose`) y se monta en PORTAL al `body`.** Para buscarlo en un test
    usá `screen`/`document.body`, **no el `container` de `render()`**. El portal es **obligatorio**: el `main`
    lleva `--z-base` = 1 y el nav pinta en `--z-nav` = 100 desde fuera, así que sin portal el modal queda
    debajo del nav **aunque `--z-modal` valga 300**. (El comentario del código culpa a un `transform` del
    archivero que **no existe** → deuda **94**.)
  - **`Skeleton` es `aria-hidden`:** si montás varios, **anunciá la carga UNA vez** desde el contenedor.
- **El guardrail de no-hardcode YA NO TIENE LISTA:** barre `shared/ui/**` por recorrido de directorios, así
  que un componente nuevo queda vigilado **solo**. No hace falta registrarlo en ningún sitio.
- **`public-api.test.ts` VA A CAER** cuando añadas un export a `primitives/` o `feedback/`. **Es lo que tiene
  que pasar:** actualizá la lista **a conciencia**, es el contrato del template portable.

- **⚠️ CONTRATO DE `GET /api/dashboard/metrics` (#16) — leelo antes de escribir #19.** `comparison` **ya no
  es un objeto suelto**: es un **mapa** `{ hours, projects, yarnMeters }` y cada entrada es
  `{ label, referenceValue, times }`. **`referenceMeters` no existe.** `referenceValue` viaja en la **unidad
  de su métrica**: **segundos** para `hours` (¡no horas!), unidades para `projects`, metros para
  `yarnMeters`. `times` es un **cociente puro** y **puede ser menor que 1, o exactamente 0** — cómo se
  redondea y se pluraliza **no está decidido** (deuda 69). Y `comparison.yarnMeters` **no se mueve** con
  `year`/`type`, porque metros es lifetime (deuda 66).

- **Layout listo:** `src/shared/ui/layout/` (AppShell, **AccountBand**, ArchiveNav, BottomNav) — presentación
  pura. `AppShell` acepta `user`/`onLogout` y **son reales**. `ArchiveNav` **ya no las declara**.
- **`AccountBand` (#32):** nombre + botón "Salir", **en el flujo** y **antes** del `header` del archivero,
  fuera del elemento `nav`, **sin variante responsive**. **No monta nada si falta el usuario O el callback**.
  Su gate asegura **que siga en el flujo**. **Ojo: sólo mira las clases propias de la banda, así que se la
  puede superponer desde fuera vía `className` o un contenedor posicionado → deuda 52.**
- **El usuario se resuelve en el SERVIDOR**, no en cliente: `getSessionUser()` en el layout de `(app)`. Por
  eso el gate *"montar el caparazón no dispara ningún fetch de cliente"* **sigue siendo verdad**. Si añadís
  datos al caparazón, **hacelo por el mismo camino** o romperás ese invariante. Precio fichado: deuda 50.
- **⚠️ CONTRATO DE SUBIDA DE IMAGEN (#15) — leelo antes de cablear la foto en #22, #25 o #28.** Son tres
  slices en tres sesiones distintas y cada una lo cableará por su cuenta; **la primera que asuma un 200 se
  romperá**, y lo hará en el navegador y no en un test, porque el mock lo escribe quien escribe el consumidor.
  - **Éxito: `201`** (no 200), con `{ url }`. Es **un endpoint único y compartido**, no uno por entidad.
  - El campo del formulario se llama **`file`**, y es el **único** que se lee.
  - Errores `{ error }`: **400** (ausente, vacío, formato no admitido o más de 4 MB), **401** (sin sesión),
    **502** (falló Cloudinary), **500** (falta configuración).
  - **No mandes `folder` ni `publicId`:** se ignoran **a propósito** (deuda 3). Los deriva el servidor del
    JWT. Nada del body puede influir en la ruta de destino.
  - El mensaje de error del tamaño **deriva** de la constante, así que la cifra que ve el usuario no puede
    desincronizarse del tope real.
  - **Ya está MEDIDO contra la cuenta real de Cloudinary** (deuda 59 saldada, 2026-08-05): la firma se acepta
    y la URL devuelta sirve la imagen. Antes esto era una suposición apoyada en `fetch` mockeado. Para
    reproducirlo: `SMOKE_CLOUDINARY=1 pnpm vitest run src/__smoke__/cloudinary.smoke.test.ts`. **Lo que
    sigue SIN medir es tu mitad:** que la cookie del navegador llegue al endpoint en una petición real
    (deuda **64**) — el primer formulario que cablee la foto es quien lo va a descubrir.
- **Piezas de auth reutilizables** (`src/features/auth/ui/`): `AuthPanel`, `AuthFormError` (**es el `Alert`
  que el SDD §6 lista como pendiente**; candidato a promover a `shared/ui` con un segundo consumidor),
  `focus-first-invalid.ts`, `next-path.ts` (**guarda de seguridad: todo redirect construido desde un valor de
  URL pasa por aquí**) y `field-errors.ts`.
- **Regla de superficies:** *una superficie que elige su fondo elige también su primer plano*. La variante
  fantasma de `Button` **hereda** el color del contexto. `Card` ya lo hace bien.
- **Trampas de formulario ya pagadas, no las repitas:** `Button` es `type="button"` por defecto (pasá
  `type="submit"`); **todo formulario debe declarar su método** (si no envía por GET y filtra lo que lleve
  nombre — deudas 39 y 43); `Field` **no anuncia errores tardíos**, hay que mover el foco al campo; montá
  formularios sobre la variante elevada de `Card`, la única superficie donde el anillo de foco cumple
  contraste (deuda 31).
- **Semántica de errores de auth (contraintuitiva a propósito):** el login devuelve **el mismo mensaje** para
  email inexistente y password errónea → se pinta **a nivel de formulario, nunca en el campo email**. El alta
  devuelve un código propio para email duplicado **sin decir qué campo**.
- **Capa 3D lista:** `<AsciiYarn />` en `src/shared/ui/three/`. Props: `interactive?`, `glow?`, `cols`/`rows`
  (default 96×44) y `className`. Siempre `aria-hidden`. Por debajo del breakpoint de tablet **no se monta**.
- **`AsciiYarnScene.tsx` y `createYarnScene.ts` son los únicos archivos que pueden importar `three`.**
- **Activa por ruta:** `isRouteActive` + `usePathname` (exacto para `/`, prefijo para subrutas).
- **Responsive token-first:** variantes `tablet:`/`mobile:`/`desktop:`. Para gates que deban **desmontar**,
  leer `--bp-*` con `matchMedia` como `useViewportSupports3d`.
- **Cero hardcode** enforced por `no-hardcode.test.ts`. Tests de UI: `// @vitest-environment happy-dom` +
  mockear `next/navigation` y `fetch`. **Asertá sobre la salida real de `cn()`, no sobre el string crudo de
  `cva`.**
- **No importes desde el barrel `@/features/auth`** en cliente: arrastra Drizzle. Importá por ruta directa.
- **Para cuerpos `multipart` usá `readFormData`** de `@/shared/lib/http` (hermana de `readJsonBody`, #15).
- Gotcha vigente: no usar la secuencia de cierre de comentario dentro de `bg-*/text-*` en `globals.css`.

## Deuda técnica acumulada

> ### ⚠️ ESTE RESUMEN ESTÁ DESFASADO — el libro mayor manda
>
> **Hoy son 115 fichas**, no 94. Nuevas de **#19**: **104-115**, más la **103** (flaky del gate de
> arranque). **Saldada la deuda 1** (`/` deja de ser pública). **Una nació saldada** (los cuatro pares de
> breakpoints). ⚠️ **NO se tacha la 13**: la enmienda E1.1 la citaba por error — era una **procedencia**
> (el id de la feature donde se detectó la deuda 1), no un número de deuda. Corregido en los tres sitios.
>
> **Las tres de #19 que piden la misma medicina y conviene tapar juntas:** **104** (no hay primitivo de
> enlace), **105** (ni de `select`), **106** (el componente de alerta sigue sin promover) — **las tres ya
> tienen su segundo consumidor**, que es el umbral que este repo se puso para promover algo a `shared/ui`.
>
> **La 112 ya costó tiempo a dos agentes:** el `JWT_SECRET` **local** está entre comillas y lleva un `$`,
> y el cargador de entorno de Next **expande variables** — de 24 caracteres escritos, el servidor usa
> **18**. Cualquiera que monte una sonda contra el servidor real vuelve a tropezar.
>
> El resto de lo que sigue es de sesiones anteriores y **no se ha revisado**: contrastá contra
> `progress/deudas.md` antes de citarlo.
>
> Vive en **`progress/deudas.md`** — libro mayor, **no se vacía nunca**. Hoy: **85 fichas**; saldadas y
> tachadas 1, 2, 4, 8, 13, 17, 19, 21, 29, 30, 32, 36, 37, 38, 46, la **3** y la **55** (por #15), la **59**
> y —por **#17**— la **5**. La **45** está **recalificada** (de deuda de datos a deuda de presentación), no
> saldada. Nuevas del saldo de la 59: **63-65**. Nuevas de **#16**: **66-71**. Nuevas de **#17**: **72-79**.
> Nuevas de **#18**: **80-85**. Nuevas de **#33**: **86-94**. **Total: 94 fichas.**
>
> **La 66 y la 69 quedan CERRADAS por decisión** (enmienda E1.4/E1.5 del RFC-02), no por código: se
> implementan en #19.
>
> **De #33, tres las choca #19 de inmediato:** la **87** (el `Dialog` no bloquea el scroll del fondo), la
> **90** (no permite elegir el foco inicial, y un formulario quiere el primer campo) y la **94** (el
> comentario del portal señala la causa equivocada, que es justo el comentario que evita que lo quiten).
>
> **Dos de método, las dos son barridos:** la **91** (quedan los guardrails **40** y **43** con lista fija, y
> ahora hay implementación de referencia: **~15 líneas cada uno**) y la **92** (**ningún gate obliga a que un
> componente nuevo traiga su test de `axe`** — hoy es sólo disciplina).
>
> **Las otras de #33:** **86** (la animación del skeleton no sale de los tokens y el guardrail no lo ve;
> además el template pedía otro efecto → **pendiente de revisión humana**), **88** (foco robado por script
> externo; prioridad baja), **89** (el ciclo de tabulación no distingue lo oculto por CSS y **no se puede
> medir sin navegador real** — familia de la regla 4, hermana de 26/51/53) y **93** (el ancla de superficie
> pública no cubre `layout/` ni `three/`).
>
> **De #18, la más valiosa es la 81, y hay que leerla con el recuadro que la precede en `deudas.md`:** el
> ancla de SQL emitido cubre hoy **2 de los 7 filtros** de `list`, y los tres que faltan (`@>` de jsonb,
> `exists` correlacionado, rango de fechas) son **justo los que el doble traduce peor**. Ya sabemos qué pasa
> sin ancla: **600 tests en verde con el filtro borrado de producción** (→ **REGLA 7**). **Arreglo ~30
> líneas** con el andamio ya escrito.
>
> **La 83 merece mirada:** `createProject`/`updateProject` **no comprueban que `patternId` sea del usuario**
> (enlazar una lana sí). **No es agujero de lectura** —el reviewer buscó camino de fuga y no lo hay— pero sí
> **del modelo**: se puede grabar una referencia a un patrón que no se puede leer, y al borrarse ese patrón
> ajeno el proyecto **cambia solo**. **Preexistente de #5/#10.** Hermana de la **78**. Arreglo: un
> `assert-pattern-ref.ts` calcado del de lanas.
>
> **Las otras de #18:** **80** (el filtro no distingue *sin uso* / *no existe* / *ajeno* — los tres dan `[]`;
> es **coherente a propósito** con `?yarnId=` y esa ambigüedad **es la mitad buena de la seguridad**, pero el
> drawer dirá "no se usa" de un patrón borrado → decisión de producto para **#26**), **82** (la 73 queda
> adelantada **sólo** para este filtro), **84** (la línea del PRD que enumera los filtros no está anclada por
> ningún test) y **85** (un parámetro de query mal escrito devuelve **todos** los proyectos, no un 400).
>
> **De #17, la que más merece atención (lo dice el reviewer): la 73** — *la corrida hermética nunca ejecuta
> el JOIN contra Postgres*. El test del SQL comprueba la consulta **emitida** (resuelve con cero filas) y el
> doble comprueba el **comportamiento**; que ese SQL **devuelva filas** sólo se verifica en el smoke de Neon,
> apagado por defecto. **Mismo patrón que destapó la deuda 6.** Hermana de la **59** y la **64**: familia de
> la **regla 4**.
>
> **Dos de #17 hay que decidirlas juntas y ANTES de #21** (son la misma pregunta desde dos verbos): la **74**
> (hay **dos formas** de "las lanas de un proyecto" en el mismo recurso — el `GET` da objetos, enlazar da
> sólo ids; la tab Lanas o re-fetchea todo o mantiene dos representaciones) y la **79** (`PATCH :id` devuelve
> `{ project }` **sin** `yarns`, así que tras editar la UI se queda sin lanas).
>
> **Las otras de #17:** **72** (el orden lo deciden **dos criterios distintos** —colación de Postgres vs
> *code point* de JS— y el verde no prueba que coincidan con acentos o mayúsculas), **75** (el doble aplana
> los catálogos), **76** (asimetría de scoping dentro del store: el método nuevo lleva dueño, el viejo no),
> **77** (el truco del SQL emitido depende de internos de Drizzle) y **78** (el JOIN a catálogos no filtra
> por `userId`: hoy lo tapa una invariante de **escritura**, no de lectura; **el arreglo es un `AND`**).
>
> **De #16, las dos que hay que cerrar ANTES de #19** (lo pide el reviewer y el leader lo suscribe): la
> **66** (el payload no marca que la comparativa de metros es lifetime → el usuario verá moverse dos
> comparativas y quedarse una, y parecerá un bug) y la **69** (`times` menor que 1 sin redondeo, plural ni
> texto del caso vacío decididos). Las otras: **67** (el guardrail no distingue comentario de código),
> **68** (nada obliga *por tipos* a que una métrica nueva traiga su comparativa; hoy sólo lo protege un
> test), **70** (higiene, prioridad baja).
>
> **La 71 merece leerse aparte: es la CUARTA aparición del mismo patrón.** El guardrail de no-hardcode del
> dashboard funciona **nombrando dos archivos a mano**, como el de la **43**, que ya era la tercera de la
> **40**. Y aquí es **peor**: allí la lista fija cubría el 100% de los archivos de su clase; aquí **no
> cubre** `store.ts` ni `index.ts` ni el doble en memoria, que ya existen en la misma capa. Hoy no hay nada
> abierto (verificado), pero un archivo nuevo se le escapa con los 577 tests en verde. **Misma medicina que
> la 40 y la 43 — tapalas juntas.**
>
> **La 59 quedó SALDADA (2026-08-05) y sin sorpresa:** existe `src/__smoke__/cloudinary.smoke.test.ts`
> (flag propio `SMOKE_CLOUDINARY`) que subió un PNG real a la cuenta real por la cadena completa → **201**,
> y el `GET` de la URL devolvió la imagen. **La firma de `buildUploadSignature` funcionó a la primera y la
> respuesta real sí trae `secure_url`.** A diferencia de su hermana la deuda 6, **no destapó ningún bug de
> producción**. La **58** queda **matizada**: el rechazo real de Cloudinary se midió **una vez, a ojo**, no
> lo guarda un `expect` — ver la **63**.
>
> **Las tres nuevas, en una línea cada una:** la **63** dice que el caso 2 de ese smoke es un embudo (pasa
> aunque la petición nunca llegue a Cloudinary; **con la firma rota siguió verde**); la **64**, que nadie
> mide todavía *cookie del navegador → `userId`* en una ruta privada (se cierra con #22/#25/#28); la **65**,
> que cada corrida deja una carpeta vacía en la cuenta real (hoy limpiadas a mano, cuenta en `total_count 0`).
>
> **Tres que sólo se cierran con una pantalla delante, y conviene mirarlas juntas:** la **26** (la escalera
> del archivero en las 6 rutas), la **51** (la banda con una sesión real) y la **53**. Hoy son imposibles:
> sólo existe la ruta `/`.
>
> **TRES que conviene taparse juntas:** la **40**, la **43** y —desde #16— la **71** piden la misma medicina
> (barrido por recorrido de directorios en vez de lista fija). La **71** es la **cuarta** aparición.
>
> **Dos caveats honestos de #31:** la deuda **39** pide verificarse **con el JavaScript desactivado**; y la
> **41** está **razonada pero no medida con un lector de pantalla real**.
>
> **De #15 quedan vivas**: **56** (el cuerpo se carga entero en memoria antes de mirar el
> tamaño; muy mitigada por el corte de Vercel), **57** (rama redundante que ningún test distingue), **58**
> (se confía en el `Content-Type` declarado, no se miran los *magic bytes*), **60** (el contrato de respuesta
> no está donde lo vean sus tres consumidores — mitigado por el bloque de arriba), **61** (las imágenes
> reemplazadas quedan huérfanas para siempre) y **62** (sin límite de frecuencia ni volumen por usuario).
>
> **No copies deudas de vuelta aquí.** Si una tarea toca una, citála por número.

## Pendiente operativo (no bloquea)

- **#15 ya está commiteado** (`83ab95a`). Lo único sin commitear es el saldo de la **deuda 59**:
  `src/__smoke__/cloudinary.smoke.test.ts`, `src/__smoke__/env.ts`, las 2 líneas de
  `src/shared/lib/cloudinary/`, los 2 smokes de Neon refactorizados y `progress/`. Es **un único commit
  coherente**.
- ~~El destrackeo de `tsconfig.tsbuildinfo` dejó una **eliminación preparada en el índice** de git.~~
  **OBSOLETO, corregido el 2026-08-10:** ya se resolvió en el commit `4973309`; **no queda nada preparado
  en el índice** por ese motivo. Verificado con `git status`.
- ~~**`next-env.d.ts` aparece modificado y NO es trabajo de nadie:** no lo comitees a ciegas.~~
  **RESUELTO el 2026-08-10 (deuda 119): el archivo está DESTRACKEADO.** Ya no puede ensuciar un diff.
  Sigue en disco y lo regeneran solos `next build` / `next dev` / `next typegen`; `tsconfig.json` lo sigue
  listando en `include`, que es lo correcto. El motivo está escrito dentro de `.gitignore`.

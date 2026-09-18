# Explore — Red de tests que se mueve al arreglar `/proyectos` (fix de la feature #20)

**Fecha:** 2026-08-13
**Alcance:** sólo lectura. No se editó ningún archivo de `src/**`.
**Método:** lectura completa de cada archivo citado + ejecución real de la suite
con `pnpm vitest run`. Las líneas de sondeo de `axe` se midieron con un script
en el scratchpad (happy-dom + axe-core reales del `node_modules` del repo), no
por memoria. Todo lo que no pude medir va marcado **NO VERIFICADO**.

## 0. Línea base medida (no estimada)

```
pnpm vitest run src/features/projects/ui "src/app/(app)/proyectos"
→ Test Files 4 passed (4) | Tests 55 passed (55)

pnpm vitest run src/features/dashboard/ui/DashboardView.test.tsx "src/app/(app)/dashboard-page.test.tsx"
→ Test Files 2 passed (2) | Tests 36 passed (36)   (31 + 5)

pnpm vitest run src/shared/ui/no-hardcode.test.ts
→ Tests 446 passed (446)
```

---

## 1. Inventario COMPLETO de tests que tocan `ProjectsToolbar` / `ProjectsView` / `ProjectCard`

Búsqueda hecha, no supuesta:
`grep "ProjectsToolbar|ProjectsView|ProjectCard"` sobre `src/**` → 11 archivos,
de los cuales 4 son de test. Además se buscó quién importa el barrel
`@/features/projects/ui` (3 tests) para cazar los consumidores indirectos.

| Archivo | Tests | Qué asierta a grandes rasgos |
|---|---|---|
| `C:\_dev\projects\knit-crochet\src\features\projects\ui\ProjectsView.test.tsx` | **24** | Smoke/composición (3), filtros que viajan al servidor (6), buscar de cliente E1(a) (4), `<details>` "Más filtros" E1(g) (2), tres estados carga/vacío/error (4), quick-start del cronómetro (5). Además un aserto **en el `afterEach`** (`:216`) sobre el bloqueo de scroll. |
| `C:\_dev\projects\knit-crochet\src\features\projects\ui\ProjectCard.test.tsx` | **13** | Las cuatro piezas de RFC-02 §2, escala 0-100 directa a la barra, nombre de la barra, duración legible, hueco de foto sin foto, foto decorativa fuera del árbol a11y, nivel de encabezado, **gate aditivo del quick-start (deuda 132)**, callback y estado `loading`, y 2 de `axe`. |
| `C:\_dev\projects\knit-crochet\src\features\projects\ui\project-filters.test.ts` | **13** | Puro dominio, **sin DOM**: `STATUS_FILTERS` (2), `toTypeFilter` (3), `filterByName` (5), `toYarnChoices` (3). No renderiza ningún componente. |
| `C:\_dev\projects\knit-crochet\src\app\(app)\proyectos\projects-page.test.tsx` | **5** | Gate de composición dentro del caparazón (3) + smoke de ruta (2). Detalle: **sirve `{ projects: [] }`** (`:68-73`), así que sus 5 tests pasan por la rama de **estado vacío**. |
| `C:\_dev\projects\knit-crochet\src\shared\ui\no-hardcode.test.ts` | 2 por archivo fuente (446 en total) | Barrido de `src/**`. Genera literalmente `has no raw hex/rgb colors in features\projects\ui\ProjectsToolbar.tsx` y `has no raw px sizes in features\projects\ui\ProjectsToolbar.tsx` (ídem `ProjectsView.tsx` y `ProjectCard.tsx`) — verificado ejecutándolo con `--reporter=verbose`. También ancla en `:91-99`: `expect(RELATIVE_FILES).toContain(["features","projects","ui","ProjectCard.tsx"].join(sep))`. |
| `C:\_dev\projects\knit-crochet\src\shared\ui\canonical-tailwind-classes.test.ts` | 1 gate global (`:92`) | Barre `src/**` buscando la forma larga `utilidad-[var(--token)]`. Cualquier clase nueva escrita así en los tres componentes lo pone en rojo. |
| `C:\_dev\projects\knit-crochet\src\features\dashboard\ui\DashboardView.test.tsx` | **31** | **Renderiza `ProjectCard` indirectamente** vía `ActiveProjectsPanel.tsx:116` (`<ProjectCard project={project} />`, sin `onQuickStart`). Sus fixtures tienen `image: null` (`:74`), o sea **todas** las tarjetas del Dashboard pintan el hueco de foto. |

**No tocan estos componentes** (comprobado): `src/app/(app)/dashboard-page.test.tsx`
renderiza el Dashboard pero sirve `{ projects: [] }` (`:55-73`), así que **no monta
ni una `ProjectCard`**; `src/app/yarn-host-responsive.test.ts` sólo descubre
anfitriones de `AsciiYarn` y su inventario (`:409-418`) no incluye ninguno de
estos tres archivos; `src/features/dashboard/ui/filters.test.ts` sólo importa el
**tipo** `SerializedProject`.

---

## 2. Cambio por cambio: qué aserciones caen

### (A) Reagrupar el toolbar en una sola superficie `Card`

**Aserciones que caen si sólo cambia la caja (flex → Card): NINGUNA.**
Todo lo que el toolbar tiene atado son **roles y nombres accesibles**, no la
disposición. Lo que hay que conservar palabra por palabra para no romper nada:

- `ProjectsView.test.tsx:191` — `const group = screen.getByRole("group", { name: STATUS_GROUP_LABEL });` (helper `statusToggle`, usado por los tests de `:264` y `:279`)
- `ProjectsView.test.tsx:193` — `return within(group).getByRole("button", { name: option?.label ?? "" });`
- `ProjectsView.test.tsx:226-228` — `expect(screen.getByRole("group", { name: STATUS_GROUP_LABEL })).toBeInTheDocument();`
- `ProjectsView.test.tsx:229-231` — `expect(screen.getByRole("group", { name: TYPE_GROUP_LABEL })).toBeInTheDocument();`
- `ProjectsView.test.tsx:291` — `const typeGroup = screen.getByRole("group", { name: TYPE_GROUP_LABEL });`
- `ProjectsView.test.tsx:356` / `:368` / `:379` / `:389` — `await userEvent.type(screen.getByLabelText(SEARCH_LABEL), "…");`
- `ProjectsView.test.tsx:311-314` — `await userEvent.selectOptions(screen.getByLabelText(NEEDLE_LABEL), String(size),);`
- `ProjectsView.test.tsx:333` — `await userEvent.selectOptions(screen.getByLabelText(YARN_LABEL), CRUDO.id);`
- `ProjectsView.test.tsx:401-403` — `const details = container.querySelector("details");` / `expect(details).not.toBeNull();` / `expect(details?.open).toBe(false);`
- `ProjectsView.test.tsx:404` — `expect(within(details as HTMLElement).getByText(MORE_FILTERS_LABEL)).toBeInTheDocument();` → el `<summary>` tiene que seguir **dentro** del `<details>`; meter el `<details>` dentro de un `Card` no lo rompe, sustituirlo por un `Dialog` sí.
- `ProjectsView.test.tsx:405` — `expect(screen.queryByRole("dialog")).toBeNull();`
- `ProjectsView.test.tsx:411-416` — `const options = within(select).getAllByRole("option");` … `expect(options.map((option) => option.textContent)).toEqual([ANY_OPTION_LABEL, ...NEEDLE_SIZES.map((size) => needleOptionLabel(size)),]);`
- `ProjectsView.test.tsx:216` (**en el `afterEach`, corre en los 24 tests**) — `expect(leftover, "algo se fue sin soltar el bloqueo de scroll").toBe("");`
- `ProjectsView.test.tsx:548` — `expect(screen.queryAllByRole("link")).toHaveLength(0);` → **si el toolbar nuevo mete un enlace (p. ej. "limpiar filtros" como `<a>`), este test cae**. Con un `<button>` no cae.
- Guardrails: `no-hardcode.test.ts` (`has no raw px sizes in features\projects\ui\ProjectsToolbar.tsx`) y `canonical-tailwind-classes.test.ts:92` si las clases nuevas usan `p-[var(--space-3)]` en vez de `p-(--space-3)`.
- `axe`: `ProjectsView.test.tsx:241` y `:247` (ver §5).

**La pregunta incómoda:** el toolbar **no tiene ni un solo test de estructura**.
Nada asierta la fila `flex items-end`, ni que los campos vivan dentro de un
`Card`, ni siquiera la región propia del toolbar: `TOOLBAR_LABEL`
(`ProjectsToolbar.tsx:15`, `"Filtros de proyectos"`) se **exporta y se usa en el
`aria-label` del `<section>` (`:81`) pero NINGÚN test lo importa ni lo busca**
(verificado con grep sobre `src/**`). Motivo estructural: la suite de #20 se
escribió contra roles y contratos de red (qué URL sale, qué anuncia la región
viva), que es lo que el RFC define; la disposición visual nunca entró en el
contrato, y `axe` no ve maquetado. Consecuencia práctica: **A se puede
implementar casi sin miedo, pero también se puede empeorar sin que nada avise.**

### (B) Quitar (o acortar) el `hint` del campo de buscar

**Aserciones que caen: NINGUNA. Verificado.**
`grep SEARCH_HINT` sobre `src/**` devuelve exactamente dos apariciones, las dos
en el fuente: `ProjectsToolbar.tsx:19` (declaración) y `:116`
(`<Field label={SEARCH_LABEL} hint={SEARCH_HINT}>`). Ningún test lo importa ni
repite su texto.

Efecto colateral medido en el primitivo: quitar el `hint` hace que `Field` deje
de cablear `aria-describedby` (`Field.tsx:41-50`: `const hasMessage = …` →
`"aria-describedby": hasMessage ? messageId : undefined`). **Nada asierta ese
`aria-describedby`** para este campo; `getByLabelText(SEARCH_LABEL)` funciona por
el `<label htmlFor>` (`Field.tsx:55-60`) y no se ve afectado.

**La pregunta incómoda:** ¿por qué no hay test que lo fije? Porque el copy de
ayuda sólo se gateó donde el RFC lo exigía como antimentira. El caso gemelo del
Dashboard **sí** está atado: `DashboardView.test.tsx:399` —
`expect(screen.getByText(SORT_HINT)).toBeInTheDocument();` y `:405` —
`expect(screen.queryByText(/último tejido/i)).toBeNull();` (enmienda E2.2: el
hint impide leer el orden como algo que el dato no mide). El hint de buscar no
tenía una enmienda detrás, así que nació sin gate. Es texto libre: **se puede
borrar hoy y la suite entera sigue verde.**

### (C) Hacer visible el mensaje del quick-start

**Aserciones que caen: NINGUNA por hacerlo visible** (medido: `axe` no marca
nada, ver §5). Pero hay **tres aserciones muy frágiles** que condicionan *cómo*
se hace:

- `ProjectsView.test.tsx:196-198` (helper): `return screen.getByRole("status", { name: QUICK_START_REGION_LABEL });`
  → el nodo tiene que **seguir teniendo `role="status"` y seguir llamándose
  `"Cronómetro"`**. Si se pasa a `role="alert"`, o se pierde el `aria-label`
  porque ahora "ya se ve el texto", caen los tres tests siguientes.
- `ProjectsView.test.tsx:485-489` — `await waitFor(() => expect(quickStartRegion().textContent).toBe(quickStartStartedMessage(BUFANDA.name)),);`
- `ProjectsView.test.tsx:507-511` — `await waitFor(() => expect(quickStartRegion().textContent).toBe(quickStartResumedMessage(GORRO.name)),);`
- `ProjectsView.test.tsx:526-528` — `await waitFor(() => expect(quickStartRegion().textContent).toBe("El proyecto no existe."),);`

**La trampa concreta:** son `toBe` sobre `textContent`, no `toHaveTextContent`.
Cualquier texto extra **dentro del mismo elemento** —un icono textual (`"✓"`),
un prefijo, un botón "Cerrar" con texto, un `<span>` de etiqueta— hace que
`textContent` deje de ser exactamente el mensaje y **los tres caen**. Si el
mensaje visible necesita chrome, el chrome tiene que ir **fuera** del nodo con
`role="status"`.

Riesgo colateral crítico, y afecta a **todo el archivo**:
`ProjectsView.test.tsx:175-181` (`settle()`) hace
`expect(screen.getByRole("status", { name: LOADING_REGION_LABEL }).textContent).toBe("")`
y lo usan ~20 de los 24 tests; `projects-page.test.tsx:94-100` tiene el mismo
helper y lo usan sus 5. **Si C reorganiza las dos regiones vivas y toca el
nombre de la de carga, caen 25 tests de golpe.**

**La pregunta incómoda (hay un agujero real aquí):** ningún test asierta que la
región viva del cronómetro **esté montada antes de que llegue el mensaje**, que
es justo la condición para que un lector de pantalla anuncie el cambio. Los tres
tests la consultan **después** de pulsar. Si C la convierte en un render
condicional (`{message !== "" && <p role="status">…}`), la suite sigue verde y la
región deja de anunciar. Es la deuda 114 por la otra cara.

### (D) Distinguir "no tenés proyectos" de "tus filtros no devolvieron nada"

**Aserciones que caen — y aquí sí hay un rojo casi garantizado:**

- `ProjectsView.test.tsx:438` — `expect(screen.getByText(EMPTY_TITLE)).toBeInTheDocument();`
- `ProjectsView.test.tsx:439-441` — `for (const label of Object.values(CREATE_PROJECT_LABELS)) { expect(screen.getByRole("link", { name: label })).toBeInTheDocument(); }`

Ese test (`:435`, *"ofrece los dos botones de crear cuando el cesto está
vacío"*) monta con `renderReady({ projects: [] })` y **sin tocar ningún filtro**
— pero el estado por defecto **ya es un filtro**: `DEFAULT_STATUS_FILTER =
"active"` y la primera carga manda `?active=true` (anclado en `:261`:
`expect(listUrls()[0]).toBe(\`${PROJECTS_ENDPOINT}?active=true\`);`). **Si la
regla nueva es "hay filtros aplicados → mensaje de filtros", el segmentado por
defecto la dispara y este test se va a rojo por las dos aserciones.** La regla
tiene que ser "filtros **distintos de los de por defecto**", o el vacío
"de verdad" tiene que deducirse de otra señal.

Aserciones que **sobreviven si se reutiliza `NO_MATCHES_TITLE`** para la variante
de filtros, y que caen si se renombra la constante que usa la rama de búsqueda:

- `ProjectsView.test.tsx:391` — `expect(screen.getByText(NO_MATCHES_TITLE)).toBeInTheDocument();`
- `ProjectsView.test.tsx:392` — `expect(screen.queryByText(EMPTY_TITLE)).toBeNull();`

También pasan por la rama vacía (sirven `{ projects: [] }`) los 5 tests de
`projects-page.test.tsx`; sus aserciones (`:118`, `:130`, `:147`, `:158`, `:166`)
sólo caen si la rama nueva añade un `<h1>` o un ovillo — hoy `EmptyState` usa
`headingLevel = 2` por defecto (`StatePanel.tsx:52`), así que en principio no.

Y el `axe` del vacío: `ProjectsView.test.tsx:247` —
`expect(await axe(container)).toHaveNoViolations();` — ahora medirá la rama que
toque, no necesariamente la de hoy.

**La pregunta incómoda:** el caso "los filtros del servidor no devolvieron nada"
**no tiene ni un test hoy**. Ningún test de `ProjectsView.test.tsx` combina un
filtro no-default con una lista vacía; el único vacío filtrado que existe es el
de **búsqueda en memoria** (`:386`), que es otra rama del código
(`searchHidEverything`, `ProjectsView.tsx:197-198`). El motivo se ve en el fuente:
`listIsEmpty` (`ProjectsView.tsx:196`) es `projects.length === 0` a secas, no
sabe nada de filtros, así que no había nada que distinguir y por tanto nada que
probar. El defecto y la falta de gate son la misma omisión.

### (E) Reescribir `EMPTY_DESCRIPTION`

**Aserciones que caen: NINGUNA. Verificado.**
`grep EMPTY_DESCRIPTION` sobre `src/**` → sólo `ProjectsView.tsx:40`
(declaración) y `:244` (`description={EMPTY_DESCRIPTION}`). Ningún test lo
importa ni repite el string. Idéntico para `NO_MATCHES_DESCRIPTION`
(`ProjectsView.tsx:44` y `:262`) y para `DASHBOARD_ROUTE` (`:47` y `:250`).

**La pregunta incómoda:** los **títulos** están atados (`EMPTY_TITLE`,
`NO_MATCHES_TITLE`, `ERROR_TITLE` se importan y se buscan) y las **descripciones**
no, ni una. El patrón se repite en toda la suite: se gatea *qué estado se
muestra* (el título es la etiqueta del estado) y no *qué se le explica al
usuario*. Por eso una descripción que le cuenta al usuario la tripa del proyecto
("…es donde hoy se crea en dos pasos") pudo pasar review y quedarse: ningún gate
mide copy. Nota adicional: la frase dice "los dos botones de acá abajo" y lo
único que los ata es `:440`, que comprueba que existen **como `link`**, no que
sean botones — o sea el texto ya es literalmente inexacto y la suite está verde.

### (F) Rediseñar el hueco de la foto (`image === null`)

**Aserciones que caen según lo que se elija:**

- `ProjectCard.test.tsx:79` — `expect(container.querySelector("img")).toBeNull();`
  (del test `:76` *"keeps the photo frame when there is no photo"*) → **cae si el
  hueco nuevo usa un `<img>`** (placeholder en data-URI, SVG servido como `img`,
  etc.). Con `<svg>` inline, `<div>` o pseudo-elemento no cae.
- `ProjectCard.test.tsx:81-83` — `expect(screen.getByRole("heading", { name: BUFANDA.name })).toBeInTheDocument();` (mismo test; sólo cae si el hueco se lleva por delante el nombre).
- `ProjectCard.test.tsx:181-182` — `const without = render(cardWith({ image: null }));` / `expect(await axe(without.container)).toHaveNoViolations();` → **medido empíricamente**: un `<div role="img">` **sin nombre accesible** produce la violación `role-img-alt` y este test cae; un `<svg>` sin `role` no produce ninguna (ver §5).
- `ProjectCard.test.tsx:128` — `expect(screen.queryAllByRole("button")).toHaveLength(0);` → **cae si el hueco se vuelve pulsable** ("subí una foto") sin `onQuickStart`.
- `ProjectCard.test.tsx:129` — `expect(screen.queryAllByRole("link")).toHaveLength(0);` → cae si el hueco es un `<a>`.
- `ProjectCard.test.tsx:135` — `expect(screen.queryAllByRole("button")).toHaveLength(1);` → cae si el hueco añade un segundo control cuando sí hay `onQuickStart`.
- Guardrails: `no-hardcode.test.ts` → `has no raw px sizes in features\projects\ui\ProjectCard.tsx` y `has no raw hex/rgb colors in …` (cae con cualquier `11px`/`#…`/`rgb(` literal); `canonical-tailwind-classes.test.ts:92` con la forma larga de `var()`.

**NO caen** (comprobado leyendo el test): `ProjectCard.test.tsx:95-96` —
`expect(container.querySelector("img")).toHaveAttribute("alt", "");` y
`expect(screen.queryAllByRole("img")).toHaveLength(0);` — porque ese test
(`:92`) renderiza **con** foto (`cardWith()` usa `BUFANDA.image`, una URL), o sea
no pasa por la rama del hueco.

**La pregunta incómoda:** el hueco de hoy **no tiene ni una aserción sobre su
contenido ni sobre su forma**. Nada busca la inicial (`initialOf`,
`ProjectCard.tsx:168-170`, sin ninguna aparición en tests — verificado con grep),
nada asierta `aspect-video`, nada mide el tamaño de fuente. El único test de esa
rama (`:76`) comprueba dos cosas negativas: que no hay `<img>` y que el nombre
sigue ahí. Por qué: la decisión documentada era *"que no colapse la altura"*
(JSDoc `ProjectCard.tsx:130-133`), y eso es CSS puro — happy-dom no hace layout,
así que **no se puede medir con esta suite**; medirlo pedía un test de CSS
compilado (la técnica que sí usa `yarn-host-responsive.test.ts`) o un snapshot
visual, y ninguno de los dos existe para las tarjetas. Traducción para quien
implemente: **F se puede rehacer entero sin romper nada, y también sin ninguna
red que avise de una regresión visual.**

---

## 3. Dependencia de los literales exportados

**Se importa la constante** (⇒ cambiar el copy **no** rompe el test):

| Constante | Dónde se declara | Quién la importa |
|---|---|---|
| `SEARCH_LABEL`, `NEEDLE_LABEL`, `YARN_LABEL`, `ANY_OPTION_LABEL`, `MORE_FILTERS_LABEL`, `STATUS_GROUP_LABEL`, `TYPE_GROUP_LABEL`, `needleOptionLabel` | `ProjectsToolbar.tsx:16-24, 27` | `ProjectsView.test.tsx:12-21` |
| `EMPTY_TITLE`, `NO_MATCHES_TITLE`, `ERROR_TITLE`, `PAGE_TITLE`, `LOADING_MESSAGE`, `LOADING_REGION_LABEL`, `QUICK_START_REGION_LABEL`, `CREATE_PROJECT_LABELS`, `quickStartStartedMessage`, `quickStartResumedMessage` | `ProjectsView.tsx:29-61` | `ProjectsView.test.tsx:22-34` |
| `LOADING_REGION_LABEL` | `ProjectsView.tsx:32` | también `projects-page.test.tsx:8` |
| `CRAFT_TYPE_LABELS`, `STATUS_FILTERS` | `project-filters.ts` | `ProjectsView.test.tsx:35`, `project-filters.test.ts:5-15` |
| `quickStartLabel` | `ProjectCard.tsx:17` | `ProjectsView.test.tsx:11`, `ProjectCard.test.tsx:10` |

**Se exporta pero NADIE lo importa ni repite** (⇒ el copy es libre; también
significa que no está gateado): `TOOLBAR_LABEL` (`ProjectsToolbar.tsx:15`),
`SEARCH_HINT` (`:19`), `EMPTY_DESCRIPTION` (`ProjectsView.tsx:40`),
`NO_MATCHES_DESCRIPTION` (`:44`), `DASHBOARD_ROUTE` (`:47`).

**Se repite el string a mano** (⇒ cambiar el copy **sí** rompe, y en un archivo
distinto del que lo declara — trampa clásica):

- `projects-page.test.tsx:157-159` — `expect(screen.getByRole("heading", { level: 1, name: "Proyectos" })).toBeInTheDocument();` → **repite `PAGE_TITLE` a mano**. Si se tocara el título de la página, `ProjectsView.test.tsx` (que lo importa) seguiría verde y el rojo saldría aquí.
- `ProjectsView.test.tsx:452` — `await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));` → repite a mano `ERROR_STATE_RETRY_LABEL` (`src/shared/ui/feedback/error-state/ErrorState.tsx:7`).
- `ProjectsView.test.tsx:448` (`"La base se cayó."`) y `:527` (`"El proyecto no existe."`) son **fixtures propias del test**, no copy del producto: no atan nada del componente.

---

## 4. El gate de composición de `/proyectos`

Está en `C:\_dev\projects\knit-crochet\src\app\(app)\proyectos\projects-page.test.tsx`
(5 tests, todos verdes en la línea base). Transcripción de lo que asierta:

- Un solo ovillo — `:118`
  `expect(screen.queryAllByTestId("ascii-yarn")).toHaveLength(1);`
  (con el comentario `:117`: *"`queryAllByTestId` y no `getByTestId`: el singular no falla con dos."*)
- No interactivo — `:128-130`
  `const yarns = screen.queryAllByTestId("ascii-yarn");`
  `expect(yarns).toHaveLength(1);`
  `expect(yarns[0]).toHaveAttribute("data-interactive", "false");`
- Pertenencia al slot de fondo — `:145-147`
  `const slot = container.querySelector('[data-slot="bg-3d"]');`
  `expect(slot).not.toBeNull();`
  `expect(slot?.querySelectorAll('[data-testid="ascii-yarn"]')).toHaveLength(1);`
- Un solo `h1` — `:166`
  `expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);`
- Smoke de ruta — `:157-159`
  `expect(screen.getByRole("heading", { level: 1, name: "Proyectos" })).toBeInTheDocument();`

**¿Lo tocan A-F?** No directamente: ninguno añade ovillos, ni `h1`, ni toca el
slot `bg-3d`. **Dos avisos verificados**, porque este archivo depende de la vista
más de lo que parece:

1. Los 5 tests llaman a `settle()` (`:94-100`), que hace
   `expect(screen.getByRole("status", { name: LOADING_REGION_LABEL }).textContent).toBe("")`
   importando `LOADING_REGION_LABEL` de `ProjectsView`. **Cualquier cambio de C
   sobre la región viva de carga (rol, nombre, existencia) tumba los 5.**
2. Los 5 sirven `{ projects: [] }` (`:68-73`), o sea **renderizan la rama de
   estado vacío**. Si D mete un `<h1>` en la variante nueva, `:166` cae; con el
   `headingLevel = 2` por defecto de `StatePanel.tsx:52` no cae.

---

## 5. `axe`: dónde corre, con qué configuración y qué se podría activar

**Archivos que corren `axe` sobre estas vistas** (los tres importan
`import { axe } from "vitest-axe";`):

- `ProjectsView.test.tsx:241` — `expect(await axe(container)).toHaveNoViolations();` (lista cargada)
- `ProjectsView.test.tsx:247` — `expect(await axe(container)).toHaveNoViolations();` (estado vacío, `{ projects: [] }`)
- `ProjectCard.test.tsx:178` — `expect(await axe(withPhoto.container)).toHaveNoViolations();`
- `ProjectCard.test.tsx:182` — `expect(await axe(without.container)).toHaveNoViolations();` (sin foto)
- `ProjectCard.test.tsx:190` — `expect(await axe(container)).toHaveNoViolations();` (con quick-start)
- `DashboardView.test.tsx:638, :646, :653` — con datos, vacío y con error (**y con datos monta `ProjectCard`s con `image: null`**)
- `projects-page.test.tsx` **no corre `axe`** (verificado: no importa `vitest-axe`).

**Configuración (medida, no supuesta):**

- `vitest.setup.ts:1-9`: sólo registra el matcher `toHaveNoViolations`. **No hay
  ninguna config global de `axe`**, ni `rules`, ni `tags`, ni `impactLevels`.
- Todas las llamadas son `axe(container)` **sin segundo argumento** ⇒ ruleset por
  defecto de `axe-core@4.12.1` (verificado en `node_modules`): 105 reglas, de las
  que sólo están apagadas de fábrica `aria-roledescription`, `audio-caption`,
  `color-contrast-enhanced`, `duplicate-id-active`, `duplicate-id`,
  `identical-links-same-purpose`, `landmark-complementary-is-top-level`,
  `meta-refresh-no-exceptions`, `target-size`.
- `vitest-axe@0.1.0`, `dist/matchers.js`: el matcher **sólo mira
  `results.violations`**. `results.incomplete` se ignora por completo.

**Dos hechos medidos con happy-dom + axe-core reales** (script en el scratchpad,
mismos paquetes del repo):

1. **`color-contrast` cae siempre en `incomplete`, nunca en `violations`.** En
   los cinco marcados que probé, `color-contrast en: incomplete`. Como el matcher
   ignora `incomplete`, **el contraste NO está gateado en esta suite**: un
   toolbar nuevo con texto ilegible sale verde. Esto es importante para A y C,
   que son justo cambios de superficie/color (el JSDoc de
   `ProjectsToolbar.tsx:61-64` y de `ActiveProjectsPanel.tsx:71-75` razona sobre
   contraste — ese razonamiento **no tiene gate**).
2. **`region`, `landmark-one-main` y `page-has-heading-one` salen
   `inapplicable`** al correr sobre un `container` (un `<div>` suelto), no sobre
   `document`. O sea: anidar `<section>`s en el toolbar (cambio A) **no** puede
   activar `region` ni `landmark-unique` en estos tests.

**Reglas que sí se podrían activar con estos cambios:**

- **(C) región viva visible:** medido — marcado `<p role="status" aria-label="Cronómetro">texto</p>` visible ⇒ **0 violaciones**. `axe` no tiene ninguna regla contra hacer visible un `status`. El riesgo de C es de aserciones (§2), no de `axe`.
- **(A) toolbar reagrupado:** medido con el toolbar entero dentro de un `Card` con `<section>` + dos `role="group"` + `label/input` + `details/summary` + `select` ⇒ **0 violaciones**. Las reglas que podrían despertarse si el marcado nuevo se tuerce: `label` y `form-field-multiple-labels` (si un campo queda con dos etiquetas o ninguna), `aria-allowed-attr` / `aria-allowed-role` (si se pone `role="toolbar"`/`role="search"` con atributos que no admite), `nested-interactive` (si el `<summary>` acaba envolviendo controles), `aria-hidden-focus` (si algo `aria-hidden` conserva foco).
- **(F) hueco de foto:** medido — `<div role="img">` **sin nombre accesible** ⇒ violación **`role-img-alt`** (rompería `ProjectCard.test.tsx:182` y, por arrastre, `DashboardView.test.tsx:638`). `<svg>` inline sin `role` ⇒ 0 violaciones. Un `<img>` con `src` de placeholder y sin `alt` activaría `image-alt` (regla habilitada, no la probé con ese marcado exacto — **NO VERIFICADO**, pero `image-alt` está `ENABLED` según la consulta al audit de axe-core).
- **(D) segundo estado vacío:** `heading-order` está habilitada; si la variante nueva se monta con un `headingLevel` que salte un nivel dentro de la vista (la vista tiene `h1` en `ProjectsView.tsx:202` y las tarjetas van a `h2` por `headingLevel={2}` en `:273`), podría marcarse. No lo probé con el marcado final — **NO VERIFICADO**.

---

## 6. La invariante de la card del Dashboard (deuda 132) y el efecto de (F)

Transcripción literal de `ProjectCard.test.tsx:125-137`, con su JSDoc `:108-124`
(que es donde está escrito el porqué):

```tsx
  it("mounts no control at all without the quick-start prop", () => {
    render(cardWith());

    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("mounts exactly one control with the quick-start prop, and no link", () => {
    render(<ProjectCard project={BUFANDA} onQuickStart={() => {}} />);

    expect(screen.queryAllByRole("button")).toHaveLength(1);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });
```

Del JSDoc, literal (`:115-119`): *"**Sin `onQuickStart` la tarjeta no monta ningún
control**, que es la invariante que su consumidor de #19 —el Dashboard, que no
pasa la acción— conserva intacta; **con la prop monta exactamente uno**."*
El consumidor real que lo sostiene es `ActiveProjectsPanel.tsx:116`:
`<ProjectCard project={project} />` — sin `onQuickStart`.

**¿Qué tests del Dashboard se ven afectados por (F)?**

`src/app/(app)/dashboard-page.test.tsx` — **ninguno, y es verificable**: su
`emptyPayload` (`:55-73`) devuelve `{ projects: [] }` para todo lo que no sea
métricas, así que **no se monta ni una `ProjectCard`** en sus 5 tests. F no puede
tocarlos.

`src/features/dashboard/ui/DashboardView.test.tsx` — **sí**, porque sus fixtures
usan `project()` con `image: null` (`:74`), o sea **todas** sus tarjetas pintan el
hueco. Lo que se vería afectado, por orden de probabilidad:

- `:636-654` (`axe` con datos, vacía y con error) — `:638`
  `expect(await axe(withData.container)).toHaveNoViolations();` → **cae si el
  hueco nuevo es un `role="img"` sin nombre (`role-img-alt`, medido) o un `<img>`
  sin `alt`**.
- `:393-396` — `const names = within(activeRegion()).getAllByRole("heading", { level: 3 }).map((heading) => heading.textContent);` / `expect(names).toEqual(["Zoquetes", "Alfombra"]);` → cae si el hueco introduce **cualquier encabezado** dentro de la tarjeta (la tarjeta del Dashboard usa el `headingLevel = 3` por defecto).
- `:414-417` — mismo patrón en *"cambia el orden desde la UI"*: `expect(names).toEqual(["Alfombra", "Zoquetes"]);`
- `:430` — `expect(screen.getAllByRole("progressbar")).toHaveLength(MAX_ACTIVE_PROJECTS);` → sólo cae si el hueco monta otra `progressbar` (p. ej. un indicador de carga de imagen con ese rol).
- Si el hueco se hace **pulsable**, los tests del Dashboard que buscan botones por
  nombre (`:220`, `:240`, `:515`, `:537`…) **no** caen porque son `getByRole` con
  `name`, pero **sí** cae `ProjectCard.test.tsx:128` (`toHaveLength(0)`). O sea:
  la invariante de la deuda 132 la protege la tarjeta, no el Dashboard.
- `:445-452` (*"dice que no hay proyectos en curso"*) monta con `projects: []`:
  sin tarjetas, no le afecta.

---

## Resumen operativo para quien implemente

1. **Rojo casi seguro:** (D), por `ProjectsView.test.tsx:438` y `:439-441` — el
   filtro por defecto `active=true` **no** puede contar como "hay filtros".
2. **Rojo posible y caro:** (C) si toca el `role`/`aria-label` de las regiones
   vivas (25 tests cuelgan de `settle()`), o si mete texto extra dentro del nodo
   `role="status"` (3 `toBe` sobre `textContent`).
3. **Rojo condicional:** (F) si el hueco usa `<img>` (`ProjectCard.test.tsx:79`),
   `role="img"` sin nombre (`:182` y `DashboardView.test.tsx:638`) o se hace
   pulsable (`:128`/`:135`).
4. **Sin red, cero tests que caigan:** (A) la disposición del toolbar, (B) el
   hint de buscar, (E) las descripciones de los estados vacíos, y el **contraste
   de color** en todos ellos (`color-contrast` sale `incomplete` y el matcher lo
   ignora). Se puede mejorar libremente; también empeorar sin aviso.
5. **Guardrails que aplican a los tres archivos aunque no los nombren:**
   `no-hardcode.test.ts` (nada de `px`/`#hex`/`rgb()`) y
   `canonical-tailwind-classes.test.ts:92` (forma `p-(--space-3)`, nunca
   `p-[var(--space-3)]`).

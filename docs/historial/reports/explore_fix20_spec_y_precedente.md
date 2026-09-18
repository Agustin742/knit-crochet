# explore — Fix visual de #20: qué dice la especificación y qué precedente existe

> **Alcance.** Informe de **sólo lectura**. Todo lo que sigue está transcrito de los archivos citados.
> Donde una fuente no dice nada, está escrito con esas palabras: **NO ESTÁ ESPECIFICADO EN NINGÚN SITIO**.
> No hay ninguna inferencia presentada como si fuera fuente.

---

## 1. `docs/design/rfc/RFC-03-proyectos.md` — lo visual

### 1.1 §1 "Decisiones que fija este RFC" (líneas 10-24)

Transcripción íntegra de las líneas que tocan el layout y la card:

```
## 1. Decisiones que fija este RFC

- **Detalle en drawer lateral**; **crear/editar en modal**; **ver y editar por separado** (el drawer abre en modo ver; "editar" abre el modal).
- **Filtros principales:** activo/inactivo, tipo, rango de fechas. **Resto** (aguja, lana usada) en **"más filtros"**.
  → ⚠️ **El rango de fechas NO entra en #20** (enmienda **E1(b)**, §7-bis): §2 no lo pone en el toolbar y
  la ficha de #20 tampoco. El backend sí lo soporta. **No lo añadas "arreglando" esta línea.**
- **Activo/inactivo** = toggle **segmentado aparte**, default **activos**.
- **Botones de tipo** (agujas/crochet) **filtran** la lista.
- **Card = solo** foto, nombre, `kc-progress`, tiempo total (los detalles se ven al abrir).
- **Detalle en tabs:** General · Progreso · Lanas · Sesiones.
- **Rounds** con controles **+/−**.
- **Pasos (checklist):** si el proyecto **no** tiene patrón, **se ocultan** y se ofrece **"crear patrón"**.
- **Cronómetro:** Start/Stop + tiempo en vivo + histórico; **quick-start desde la card**.
- **Lanas enlazadas:** buscador/selector del inventario; se muestra el **color de la lana** + marca + tipo.
- **Patrón:** se puede **elegir de biblioteca** o **crear embebido** (ambas opciones).
```

**Lo único que §1 dice del layout de la lista** (`RFC-03-proyectos.md:13` y `:16`) es la **agrupación
lógica** de los filtros: "filtros principales" (activo/inactivo, tipo, rango de fechas) frente a "resto"
(aguja, lana usada) dentro de **"más filtros"**; y que activo/inactivo es un **"toggle segmentado
aparte"**. Nótese: **"aparte"** es la única palabra de §1 sobre disposición espacial.

**Lo que §1 dice de la card** (`:18`): `- **Card = solo** foto, nombre, ` + "`kc-progress`" + `, tiempo total (los detalles se ven al abrir).`

### 1.2 §2 "Estructura y componentes" (líneas 26-41)

Transcripción íntegra de las dos viñetas de la página de lista:

```
- **Toolbar:** segmentado activo/inactivo (`kc-tabs`/toggle) + botones de tipo (`kc-btn`) + "más filtros" (desplegable) + buscar.
  → ⚠️ **`kc-tabs` no existe en el repo**: el segmentado son **dos `Toggle`** con la exclusividad impuesta
  por el consumidor (**E1(i)**). **"Más filtros"** es un **`<details>` nativo**, no un modal (**E1(g)**).
  **"Buscar" NO tiene backend** y se filtra **en cliente** (**E1(a)**) — §3 de este mismo RFC no lo respalda.
- **Lista:** grilla de cards de proyecto: foto, nombre, `kc-progress`, tiempo, y **quick-start** de cronómetro (`kc-btn--icon`). Tap → drawer.
  → ⚠️ **En #20 la card NO es tocable** (**E1(f)**): el drawer es la feature **#21**, que está `pending` y
  **no existe** cuando se implementa #20. Además un `<button>` dentro de un `<a>` es HTML inválido y `axe`
  lo marca. **El tap lo añade #21**, de forma aditiva.
```

### 1.3 Preguntas concretas contra §1 y §2

| Pregunta | Qué dice la fuente |
|---|---|
| **Dónde va el toolbar** | §2 lo enumera **antes** de la lista (`:28` antes de `:32`), y esa es toda la información de posición que hay. **Que el toolbar vaya arriba de la grilla es lo único deducible del orden de las viñetas; no hay ninguna frase que lo fije.** No hay palabra sobre si el toolbar va dentro de una superficie, con qué separación, ni si es sticky. |
| **Cómo se agrupan los filtros** | §1:13 → principales (activo/inactivo, tipo, [fechas, excluidas por E1(b)]) vs. "resto" (aguja, lana usada) dentro de **"más filtros"**. §1:16 → "Activo/inactivo = toggle **segmentado aparte**". §2:28 → orden dentro del toolbar: **segmentado → botones de tipo → "más filtros" → buscar**. |
| **Jerarquía de la página** | **NO ESTÁ ESPECIFICADO EN NINGÚN SITIO.** El RFC-03 **no menciona ningún `h1`, ningún título de página, ningún ancho máximo, ningún contenedor, ninguna sección con título, ni ningún hero.** Compárese con RFC-02 §2, que sí abre con `- **Hero:** ...` y nombra dos paneles con sus títulos. RFC-03 §2 empieza directamente en "Toolbar". |
| **Qué muestra la card** | §1:18 "**Card = solo** foto, nombre, `kc-progress`, tiempo total"; §2:32 "foto, nombre, `kc-progress`, tiempo, y **quick-start** de cronómetro (`kc-btn--icon`)". |
| **Qué proporción tiene la card / la foto** | **NO ESTÁ ESPECIFICADO EN NINGÚN SITIO.** Ni RFC-03, ni RFC-02, ni el SDD dicen aspect-ratio, alto, número de columnas de la grilla ni breakpoints de la grilla. La palabra "grilla" aparece en §2:32 (`**Lista:** grilla de cards`) sin ningún parámetro. |
| **Qué pasa cuando no hay foto** | **NO ESTÁ ESPECIFICADO EN NINGÚN SITIO.** Ni RFC-03 ni el SDD mencionan placeholder, imagen por defecto, inicial, ni el caso `image === null`. Ver §4 de este informe. |

### 1.4 §4 "Estados" (líneas 52-57) — transcripción íntegra

```
## 4. Estados

- **Loading:** `kc-skeleton` en las cards.
- **Vacío:** `kc-empty` → "Tu cesto está vacío — empezá un proyecto" + los 2 botones de crear.
- **Error:** `kc-error` → "Se soltó un punto" + reintentar.
- **Borrado:** confirmación siempre (`kc-dialog`); si el proyecto tiene lanas/sesiones, la cascada la maneja la FK (ya resuelto en backend).
```

### 1.5 §5 "Accesibilidad" (líneas 59-61) — transcripción íntegra

```
## 5. Accesibilidad

- Segmentado con `aria-pressed`; rounds +/− con labels; cronómetro con `aria-live` para el tiempo; drawer con foco atrapado y `aria-modal`.
```

> Ojo: el `aria-live` que §5 pide es **"para el tiempo"** del cronómetro (feature #21, tab Sesiones).
> §5 **no dice nada** sobre feedback del quick-start de la card.

### 1.6 Enmienda E1 (§7-bis) — el contrato vigente de #20, **entera** (líneas 72-230)

Transcripción íntegra:

```
## 7-bis. Enmienda E1 — las nueve decisiones de #20, cerradas (2026-08-12)

> 🔴 **CORRECCIÓN (2026-08-12, leader).** Esta enmienda se tituló *"las **ocho** decisiones"* y enumera
> **nueve** (a-i). **Queda corregida, no borrada.** El desajuste nació de contar sólo las **ocho que
> cerró el usuario** y olvidar que **E1(i) la añadió el leader** — está marcada como tal en su propio
> encabezado. **Son nueve en total: ocho del usuario + una del leader.** Lo levantó el implementer de
> #20 (§6.1 de `progress/reports/impl_projects_list_ui.md`), leyendo el documento en vez de fiarse del
> título. Es la misma raíz que este proyecto lleva registrada cuatro veces: *nadie volvió a la fuente a
> contar*.

> **Por qué existe esta enmienda.** Al planear **#20 `projects_list_ui`** se midió el repo contra este
> RFC y aparecieron **nueve** puntos que ninguna fuente cerraba —y uno que este mismo RFC **se
> contradice a sí mismo**—. No son detalles de implementación: son decisiones que el implementer no
> puede improvisar sin inventarse el contrato. **Ocho las cerró el usuario** el 2026-08-12; **E1(i) la
> asumió el leader** por ser técnica y no de producto.
> Informes de medición: `progress/reports/explore_20_filtros_backend.md`,
> `explore_20_card_quickstart.md`, `explore_20_pagina_estados_gates.md`.

### E1(a) — "Buscar" se resuelve **en cliente**, filtrando por nombre. No se toca el backend.

**§2 pide un buscador que §3 no respalda.** Medido: `projectFiltersSchema`
(`src/features/projects/validation.ts:39-50`) tiene **exactamente siete** claves —`active`, `type`,
`needle`, `yarnId`, `patternId`, `from`, `to`— y **ninguna es de texto**. No hay `ilike`, ni `tsvector`,
ni índice de texto en `src/features/projects/schema.ts`. **Y el PRD §6.2 tampoco lo pide**: el buscador
aparece por primera vez en §2 de este RFC. No es que el backend se lo olvidara — **nunca se especificó
como dato**.

**Lo que decide el motivo:** el endpoint **no pagina** (`store.list` no aplica `.limit()` ni `.offset()`,
y el test ancla `projects-routes.test.ts:310-320` lo impide con `toEqual`), así que **la lista ya se trae
entera de todas formas**. Filtrar en memoria **no empeora nada**. Es además el precedente que ya sentó
#19: el orden y el tope de activos son de cliente porque el contrato no los tiene
(`ActiveProjectsPanel.tsx:36`, `filters.ts:56`).

**Se descartó** ampliar el backend: rompería "backend cerrado" (features 1-18 `done`) y obligaría a tocar
el test ancla del contrato, el PRD §9 y §3 de este RFC. Es una feature de backend, no un detalle de #20.

> ⚠️ **Modo de fallo silencioso que hace urgente esta decisión, medido ejecutando zod 4.4.3:**
> `projectFiltersSchema` es un `z.object` **sin `.strict()`**, y el modo por defecto de zod es *strip*.
> `GET /api/projects?search=gorro` responde **200 con la lista sin filtrar** — no un 400, sin log, sin
> aviso. **Un buscador cableado contra un parámetro inexistente no falla: miente.**

### E1(b) — El **rango de fechas NO entra** en el toolbar de #20. Se ficha como deuda.

Contradicción interna del RFC: **§1 lo declara filtro *principal*** y el PRD §6.2 lo lista, pero **§2 —la
línea que describe el toolbar— no lo menciona**, y el `acceptance` de #20 tampoco. El backend **sí** lo
soporta (`?from=&to=`, `gte`/`lte` sobre **`startDate`**, `store.ts:103-108`).

Se deja fuera para **mantener #20 pegada a su ficha**, que ya es una slice grande. Como el backend existe,
añadirlo después es **aditivo y barato**. La contradicción se resuelve a propósito más adelante, no de
refilón dentro de otra slice.

### E1(c) — Las opciones de **aguja** salen de una **lista fija en `src/shared/config`**.

Medido: **no existe ningún endpoint de "medidas de aguja usadas"**. `needles` es una columna **jsonb por
proyecto** (`number[]`), y el filtro `?needle=` es **contención jsonb** (`projects.needles @> '[4]'::jsonb`,
`store.ts:77-81`) — o sea *"el array de agujas contiene esta medida"*, un solo valor por petición.

**Se descartó derivar las opciones de los proyectos ya cargados porque es circular**: la lista que tenés ya
está filtrada, así que elegir 4mm reduciría la lista y 4mm podría quedar como única opción. Las medidas de
aguja son un **conjunto estándar del dominio**, no un dato del usuario — van donde el proyecto ya guarda
este tipo de listas.

### E1(d) — La lana se etiqueta **sólo por color** en su selector. La limitación se ficha.

`GET /api/yarns` devuelve la **fila cruda**: `brandId`/`typeId` son **UUIDs, no nombres**
(`src/features/yarns/api/store.ts:244-249`). El único sitio del repo que aplana los nombres es
`listLinkedYarns` (`store.ts:177-199`), y **sólo sirve al detalle de un proyecto**, no a un selector global.

Se usa `colorName` (y `colorFamily` si hace falta desambiguar). **Precio aceptado y escrito:** dos lanas de
la misma marca con el mismo nombre de color **no se distinguen** en el desplegable. Se descartó pedir
marcas y tipos aparte: triplicaría el fetch de un desplegable secundario que vive **dentro** de "más
filtros".

### E1(e) — El quick-start **sólo arranca**. No es un toggle start/stop.

Es lo que este RFC dice **literalmente**: §1 línea 20 y §2 línea 27 dicen *"quick-**start**"*, y **nunca**
"toggle" ni "quick-stop". Start/Stop aparece siempre asociado al **drawer / tab Sesiones** (§2 línea 32),
no a la card.

**Los tres hechos medidos que lo sostienen** (el implementer no los re-deriva):

1. **`POST /:id/sessions/start` es IDEMPOTENTE.** `start-session.ts:28-31`: si ya hay una sesión abierta,
   la **reutiliza** y responde **200**; si crea, **201**. **Nunca 409, nunca duplica, nunca reinicia
   `start`.** Un doble tap no puede corromper nada, así que el botón puede ser optimista.
2. **El 409 está en el STOP, no en el start.** `PATCH /:id/sessions/stop` responde **409
   `"No hay ninguna sesión de tejido en marcha."`** si no hay ninguna corriendo. Arrancar dos veces es
   gratis; parar dos veces es un error visible. Es la asimetría contraria a la que uno supondría.
3. **No hay forma de saber desde la lista si un proyecto tiene el cronómetro corriendo.** Ni columna
   (`schema.ts:17-40` no tiene `activeSessionId` ni `runningSince`), ni filtro (`active` es el **status**
   del proyecto, no el cronómetro), ni endpoint agregado (`findActive` es **por proyecto** e interno del
   servidor). La enmienda **E2.2 del RFC-02 ya descartó** abrir el backend para esto.

**Por eso un toggle era inviable sin mentir:** obligaría a una petición extra **por card**, o a un estado
en memoria que **se pierde al recargar** y pinta el botón equivocado tras un F5. El estado "corriendo" se
aprende **al tocar** (201 vs 200), no antes.

> **Nota para el cliente HTTP:** el molde de #19 (`dashboard-client.ts:68`) mira sólo `response.ok`, que
> **funde 200 y 201**. Si #20 quiere distinguir "arranqué yo" de "ya estaba corriendo", tiene que
> devolver el `status` **también en el camino OK** — es un ensanchamiento del molde, no una copia.

### E1(f) — En #20 **la card no es tocable**. Sólo el quick-start es interactivo.

§2 dice, en la misma frase, *"quick-start (`kc-btn--icon`). **Tap → drawer**"* — un control dentro de otro
control. Pero **la feature 21 `projects_detail_ui` está `pending`: el drawer NO EXISTE** en el momento de
#20, y **ninguna fuente dice qué debe hacer el tap mientras tanto**.

**El motivo técnico que cierra la decisión:** anidar un `<button>` dentro de un `<a>` es **HTML inválido y
`axe` lo marca** — y la card **corre `axe` en su propio test** (`ProjectCard.test.tsx:119-126`). Además la
raíz de la card es un `div` (`Card.tsx:16`), y un `div` con `onClick` **no es alcanzable por teclado**.

**#21 añade el tap cuando el drawer exista**, y será aditivo igual que lo es ahora el quick-start. Se
descartó enlazar a una ruta inexistente (dejaría un 404 cableado) y adelantar un drawer mínimo (se come el
alcance de #21 y rompe "una sola feature a la vez").

### E1(g) — "Más filtros" se hace con **`<details>`/`<summary>` nativo**.

Medido: **no existe primitivo de disclosure, popover ni desplegable** en `src/shared/ui/`. Lo más cercano
es `Dialog` (modal en portal).

`<details>` es **accesible de fábrica**, no necesita primitivo nuevo, no usa portal, y **no arrastra el
gate de bloqueo de scroll** que sí exigiría el `Dialog` (deuda 101: nada obliga a que un test que monta un
`Dialog` compruebe que soltó el bloqueo; #19 se lo escribió a mano en `DashboardView.test.tsx:185`). Para
**dos campos** dentro de una toolbar, un modal es desproporcionado.

Se descartó crear un primitivo nuevo: tocaría `public-api.test.ts`, que está **anclado al literal**, y es
una slice de design system, no de #20.

### E1(h) — #20 escribe su **propio `projects-client.ts`**: tercer clon, y se ficha como deuda.

Medido: **no hay cliente HTTP compartido de navegador.** `src/shared/lib/http.ts` importa `next/server` y
es **exclusivamente de Route Handlers**. Hay **dos clones** del mismo patrón (`auth-client.ts` y
`dashboard-client.ts`), con `readErrorMessage` **copiado literal** entre los dos.

Se duplica por tercera vez **a propósito**: extraer un cliente compartido toca **dos features ya `done` y
revisadas** (auth y dashboard) y sus tests — es refactor de `shared/lib`, no trabajo de esta slice.
**Queda fichado** para no llegar a cinco copias en #21/#22.

**Las cinco decisiones del molde que el clon hereda** (`dashboard-client.ts:8-16`): endpoints y mensajes
como **constantes exportadas** (para que los tests los importen en vez de reescribirlos), `fetch` pelado
con `credentials: "same-origin"`, resultado como **unión discriminada** en vez de excepciones,
**`status: 0` = la petición no llegó a salir**, y lector de error defensivo (un 500 puede responder HTML;
un 200 con cuerpo ilegible se trata como error).

### E1(i) — El segmentado activo/inactivo son **dos `Toggle` con la exclusividad impuesta desde el consumidor**. *(Decisión del leader, no del usuario.)*

§2 escribe *"`kc-tabs`/toggle"*, pero **en el repo sólo existe la mitad `toggle`**. `ToggleGroup` es
`role="group"` y **su JSDoc dice explícitamente que NO impone exclusividad**, y que no es `radiogroup` ni
`tablist` porque esos prometen exactamente una opción activa.

Se resuelve con **dos `Toggle`** dentro de un `ToggleGroup` (que aporta el `aria-label` obligatorio), y la
exclusividad la impone el consumidor. Cumple lo que pide §5 (*"segmentado con `aria-pressed`"*) sin crear
un primitivo nuevo ni tocar `public-api.test.ts`.

**Default = activos**, y ojo con esto: **el backend NO tiene default de "activos"**. Sin el parámetro
devuelve **todo** (`store.ts:68-73`). El *"default activos"* de §1 es una decisión de **cliente**: la
página tiene que mandar `?active=true` **explícitamente**, igual que ya hace
`dashboard-client.ts:123-126`. Y `active` **sólo acepta las cadenas `"true"`/`"false"`**: `?active=1` da
**400**.
```

> **Lectura de E1 en clave visual:** las nueve decisiones son de **contrato y de mecánica**
> (qué filtra dónde, qué elemento HTML, qué status HTTP). **Ninguna de las nueve fija nada visual**:
> ni espaciado, ni superficie, ni jerarquía, ni tamaño de card, ni columnas de grilla.
> **El fix visual de #20 no tiene contrato que romper en E1 — tampoco tiene contrato que lo guíe.**

### 1.7 §7 "Adaptación al harness" (líneas 67-70)

```
- Página `src/app/(app)/proyectos/`. UI en `src/features/projects/ui/`.
- Verificación: RTL (filtros, rounds, enlazar lana, cronómetro start/stop) + axe + smoke + build.
```

---

## 2. `docs/design/SDD-01-design-system.md`

### 2.1 Superficies, elevación y sombras

**Lo único que el SDD dice de superficies y sombras está en la tabla de tokens de §5**
(`SDD-01-design-system.md:150` y `:156`), transcrito:

```
| **Color — rol** | `--bg`, `--surface`, `--surface-raised`, `--fg`, `--fg-muted`, `--accent`, `--accent-fg`, `--border`, `--danger`, `--success`, `--focus` | Se mapean **roles**, no colores crudos. |
```

```
| **Sombras** | `--shadow-hard` (offset sólido), `--shadow-glow` (neón) | Brutalismo + ciber. |
```

Y en la tabla de drivers de §1 (`:57`):

```
| **Brutalismo** | Tokens de **borde grueso**, **radios chicos o 0**, **sombra dura** (offset sólido, sin blur), tipografía de alto contraste de peso. |
```

En §6, la única mención de sombra en un componente concreto (`:179`, `ArchiveNav`):

```
- **`ArchiveNav`** — navegación tipo **archivero**: pestañas como **fichas/carpetas flotantes** (esquinas
  redondeadas, **sombra suave**, **alturas escalonadas**) ...
```

**Cuándo se usa una superficie elevada y cuándo no: NO ESTÁ ESPECIFICADO EN NINGÚN SITIO.**
El SDD **nombra** el token `--surface-raised` y el token `--shadow-hard`, pero **no da ninguna regla de
uso**: no dice qué contenido va en `--surface` y cuál en `--surface-raised`, ni cuándo una zona merece
elevación. Tampoco lo dice ningún RFC. Lo más cercano a una regla vive **en el código**, no en la doc:

- `src/shared/ui/primitives/card/card.variants.ts:19-28` — las dos variantes de `Card`:
  ```
      variants: {
        variant: {
          raised: "bg-surface-raised shadow-hard-lg",
          flat: "bg-surface shadow-none",
        },
      },
      defaultVariants: {
        variant: "raised",
      },
  ```
- `card.variants.ts:3-12` (comentario, transcrito):
  ```
  /* Ref: .kc-card / .kc-card--flat. Borde grueso + radio chico (brutalismo).
     raised = superficie elevada con sombra dura; flat = superficie plana sin sombra.

     La tarjeta declara su PRIMER PLANO junto a su fondo (deuda 32). Las dos
     variantes son superficies claras, pero la app es oscura: `globals.css` pone el
     crema en el `body`, así que todo lo que no declare primer plano lo hereda —
     incluida esta tarjeta, que pintaba crema sobre crema (1.14:1, invisible). Una
     superficie que decide su fondo tiene que decidir también qué se lee encima ... */
  ```
- `RFC-01-shell.md:37` es la **única frase de toda la documentación** que reparte fondo y superficie:
  ```
  - Fondo app: espresso (`--bg`) + `--texture-dots-dark`; superficies de contenido en crema + `--texture-paper`.
  ```
- Valores reales en `src/app/globals.css:39-41`:
  ```
  --surface: #fbf6eb;
  --surface-raised: #fffdf6;
  --surface-sunken: #eadfcb;
  ```
  y `globals.css:210-214`:
  ```
  --shadow-hard: 4px 4px 0 var(--border);
  --shadow-hard-lg: 6px 6px 0 var(--border);
  --shadow-glow: 0 0 18px rgba(228, 100, 155, 0.6);
  --shadow-glow-lg: 0 0 26px rgba(228, 100, 155, 0.5);
  --shadow-paper: 4px 2px 4px rgba(0, 0, 0, 0.35);
  ```
  > Nota: `--surface-sunken`, `--shadow-hard-lg`, `--shadow-glow-lg` y `--shadow-paper` **existen en el
  > código pero NO están en la tabla de tokens del SDD §5**, que lista sólo `--surface`,
  > `--surface-raised`, `--shadow-hard` y `--shadow-glow`.

**La regla operativa de facto que sí está escrita** (tres veces, en código, siempre por la misma razón):
los campos de formulario van **dentro de un `Card`** y no sueltos sobre el fondo. Transcrito de
`src/features/dashboard/ui/DashboardView.tsx:199-202`:

```
          {/* La tarjeta no es decoración: `Field` pinta su etiqueta con el
              primer plano oscuro, ilegible sobre el fondo de la app, y la
              variante elevada es la única donde el anillo de foco llega al
              contraste mínimo (deuda 31). */}
```

Repetido en `ActiveProjectsPanel.tsx:71-75` y en `ProjectsToolbar.tsx:61-64` (este último ya en #20).

### 2.2 §9 "Verificación (definición de 'done' por componente)" — transcripción íntegra (líneas 259-271)

```
## 9. Verificación (definición de "done" por componente)

1. **Test de componente / interacción** con **React Testing Library + `user-event`** sobre un entorno
   DOM (`happy-dom`). Se prueba **comportamiento y accesibilidad** (roles, foco, estados, callbacks),
   **no píxeles**.
2. **Smoke de render:** cada componente monta sin explotar.
3. **Assertions de a11y** con `axe` en los primitivos.
4. **Typecheck + lint + build** verdes como puerta.
5. **Fidelidad visual = revisión manual** contra el mockup de referencia. *Opcional a futuro:* regresión
   visual automatizada.

> No se testea "que se vea lindo": eso lo valida el humano contra el mockup. Sí se testea comportamiento,
> a11y y que **cero valores estén hardcodeados** (todo por token).
```

> **Dato relevante para este fix:** §9.5 remite a "el mockup de referencia". **No existe ningún mockup
> ni brief de identidad visual en el repo**: `docs/` sólo contiene `design/` (SDD + 8 RFC), `harness/` y
> `product/`. El SDD §5 dice que los valores de identidad "viven en el **brief de identidad visual**
> (documento companion)" (`SDD-01-design-system.md:15-17`) y §6:202 cita un `visual.md`. **Ni el brief ni
> `visual.md` existen en el repo** (`find` sobre todo el árbol, excluyendo `node_modules`, no devuelve
> ningún archivo con "visual" en el nombre). Es decir: **el checklist visual del SDD apunta a un
> documento que no existe, así que "fidelidad visual" hoy sólo puede significar juicio del usuario.**

### 2.3 ¿Regla sobre feedback visible de acciones, toasts/avisos, o estados vacíos?

**Toast / avisos.** El SDD lo **nombra dos veces, en inventario**, y nunca da una regla de cuándo usarlo:

- `SDD-01-design-system.md:159` (tokens z-index): `` --z-bg-3d`, `--z-base`, `--z-nav`, `--z-overlay`, `--z-modal`, `--z-toast ``
- `:174` (primitivos): ``- `Tabs`, `Dialog`/`Modal`, `Tooltip`, `Toast`.``
- `:184-185` (feedback):
  ```
  **Feedback** (`feedback/`)
  - `EmptyState`, `ErrorState`, patrón estándar de loading.
  ```
- `:250` (a11y): ``- HTML semántico; roles/aria correctos en `Dialog`, `Tabs`, `Toast`, `Tooltip`.``

**No hay ninguna regla en el SDD sobre feedback visible de acciones del usuario: NO ESTÁ ESPECIFICADO EN
NINGÚN SITIO.** El SDD no dice cuándo una acción debe confirmarse en pantalla, ni con qué componente.

**Estado del `Toast` en el repo: NO EXISTE.** El barrel `src/shared/ui/index.ts` exporta
`feedback` + `layout` + `primitives` + `three`; `src/shared/ui/primitives/index.ts:1-7` exporta
`button, card, dialog, field, progress-bar, skeleton, toggle` — **sin `toast`**; y
`src/shared/ui/feedback/index.ts` cubre sólo `EmptyState` / `ErrorState` (con `StatePanel` como base no
exportada). El token `--z-toast: 400` sí existe (`globals.css:305`) y `dialog.variants.ts:7` lo cita como
techo del z-index del modal, pero **no hay componente que lo consuma**.

**Estados vacíos — lo que sí hay:**
- SDD §6 `feedback/`: `EmptyState`, `ErrorState`, patrón estándar de loading (`:184-185`).
- RFC-03 §4 (transcrito arriba en 1.4): copy exacto `"Tu cesto está vacío — empezá un proyecto"` + los 2
  botones de crear; error `"Se soltó un punto"` + reintentar.
- La regla de tono la escribe el código, no la doc — `src/shared/ui/feedback/empty-state/EmptyState.tsx:10-19`:
  ```
  /**
   * Estado vacío (SDD §6, RFC-02 §4): no hay nada que mostrar **y no pasa nada**.
   *
   * Tono neutro a propósito: un vacío no es un fallo. La diferencia con
   * `ErrorState` no es sólo el color — éste no interrumpe ni se anuncia solo,
   * porque el usuario acaba de llegar a una lista que todavía no llenó.
   *
   * El `action` es un slot: quien lo monta decide si ofrece "Crear proyecto",
   * dos botones de creación (RFC-02 §4) o nada.
   */
  ```
- Y su forma visual, `state-panel.variants.ts:21-46`:
  ```
  const statePanelTones = {
    neutral: "border-border bg-surface text-fg shadow-none",
    danger: "border-danger bg-surface text-fg shadow-hard",
  } as const;
  ...
  export const statePanelVariants = cva(
    [
      "flex flex-col items-center gap-(--space-3) text-center",
      "p-(--space-8)",
      "border-(length:--border-width) border-solid rounded-md",
    ],
  ```
  → **El panel vacío es `bg-surface` (crema plano, sin sombra), centrado, `p-(--space-8)`.** El de error
  es la misma composición con borde `--danger` y `shadow-hard`.

### 2.4 §8 "Accesibilidad (baseline no negociable)" — transcripción íntegra (líneas 248-256)

```
## 8. Accesibilidad (baseline no negociable)

- HTML semántico; roles/aria correctos en `Dialog`, `Tabs`, `Toast`, `Tooltip`.
- **Foco visible** en todo interactivo (token `--focus`); navegación por teclado completa.
- `prefers-reduced-motion` respetado por la animación 2D **y** por la capa 3D.
- Contraste suficiente (el alto contraste brutalista ayuda; validar los roles de color).
- Targets táctiles ≥ 44×44 px en tablet (co-primaria con desktop, §1); el layout se adapta también a
  desktop (puntero) y a mobile (secundario).
```

Y §1:67, que es la regla de tamaños de pantalla que manda:

```
| **Dos pantallas primarias: tablet y desktop** | Se diseñan **tablet y desktop como co-primarios**; mobile existe pero es secundario. Targets táctiles ≥ 44×44 px en tablet (§6, §8). |
```

---

## 3. Precedente del Dashboard (#19) — `src/features/dashboard/ui/`

Archivos leídos enteros: `DashboardView.tsx`, `DashboardHero.tsx`, `MetricsPanel.tsx`,
`ActiveProjectsPanel.tsx`, `NewProjectDialog.tsx` (+ `filters.ts`, `metrics-display.ts`,
`dashboard-client.ts` en lo pertinente).

### 3.1 Cómo agrupa el Dashboard sus filtros (año + tipo)

`src/features/dashboard/ui/DashboardView.tsx:194-261`, transcrito:

```jsx
      <section
        aria-label="Filtros y creación"
        className="flex flex-col gap-(--space-4) desktop:flex-row desktop:items-end desktop:justify-between"
      >
        <div className="flex flex-wrap items-end gap-(--space-4)">
          {/* La tarjeta no es decoración: `Field` pinta su etiqueta con el
              primer plano oscuro, ilegible sobre el fondo de la app, y la
              variante elevada es la única donde el anillo de foco llega al
              contraste mínimo (deuda 31). */}
          <Card className="flex items-end gap-(--space-2) p-(--space-3)">
            <Button size="icon" aria-label={PREVIOUS_YEAR_LABEL} onClick={() => stepYear(-1)}>−</Button>
            <Field label={YEAR_LABEL} error={yearIsValid ? undefined : YEAR_RANGE_MESSAGE}>
              <Input ... className="field-sizing-content" />
            </Field>
            <Button size="icon" aria-label={NEXT_YEAR_LABEL} onClick={() => stepYear(1)}>+</Button>
          </Card>

          <ToggleGroup label={TYPE_GROUP_LABEL} className="flex flex-wrap gap-(--space-2)">
            {CRAFT_TYPE_ORDER.map((candidate) => (
              <Toggle key={candidate} pressed={types.includes(candidate)} onPressedChange={() => toggleType(candidate)}>
                {CRAFT_TYPE_LABELS[candidate]}
              </Toggle>
            ))}
          </ToggleGroup>
        </div>

        <div className="flex flex-wrap gap-(--space-3)">
          {CRAFT_TYPE_ORDER.map((candidate) => (
            <Button key={candidate} variant="primary" onClick={() => setNewProjectType(candidate)}>
              {CREATE_PROJECT_LABELS[candidate]}
            </Button>
          ))}
        </div>
      </section>
```

Respuestas exactas:

- **Agrupación:** una `<section aria-label="Filtros y creación">` que en desktop es
  `desktop:flex-row desktop:items-end desktop:justify-between`: **filtros a la izquierda, botones de
  crear a la derecha**. Dentro, los filtros son un `div` `flex flex-wrap items-end gap-(--space-4)`.
- **¿Sobre el espresso o dentro de una superficie?** **Mixto, y la regla es por tipo de control:**
  el **campo de año va dentro de un `Card`** (`p-(--space-3)`, variante por defecto = `raised`), porque
  `Field` pinta su etiqueta con `text-fg` (oscuro) y sobre el espresso sería ilegible; **los `Toggle` de
  tipo van sueltos sobre el fondo** dentro de un `ToggleGroup` sin superficie. La página entera vive
  sobre `--bg` (espresso, `RFC-01-shell.md:37`).
- **Clases del contenedor de página** (`DashboardView.tsx:185`):
  `className="flex flex-col gap-(--space-8) p-(--space-6)"` — sin `max-w`, sin `mx-auto`, sin `Container`.
  (`ProjectsView.tsx:201` usa **exactamente la misma cadena**.)
- **Títulos de sección** (`MetricsPanel.tsx:55-60`, `ActiveProjectsPanel.tsx:63-68`):
  `className="font-display text-2xl leading-tight text-fg-inverse"` sobre `<h2 id=...>` con
  `aria-labelledby` en la `<section>`. El `h1` del Dashboard vive en el hero
  (`DashboardHero.tsx:47-52`): `font-display text-3xl leading-tight text-fg-inverse desktop:text-hero`.
- **Grilla de cards** (`ActiveProjectsPanel.tsx:112`):
  `className="grid grid-cols-1 gap-(--space-4) tablet:grid-cols-2 desktop:grid-cols-3"`
  — idéntica a la de #20 (`ProjectsView.tsx:267`).

**Diferencia estructural medida entre las dos páginas** (dato, no opinión):
el Dashboard divide su contenido en **dos `<section>` con `<h2>` visible** (`"Tu año en números"`,
`"Proyectos en curso"`), cada una con sus controles **en la fila del título**
(`tablet:flex-row tablet:items-center tablet:justify-between`, `MetricsPanel.tsx:54`;
`tablet:items-end tablet:justify-between`, `ActiveProjectsPanel.tsx:62`).
`ProjectsView` tiene **un `h1` suelto** (`ProjectsView.tsx:202-204`) y **ninguna `<section>` con título
visible**: el toolbar es una `<section aria-label={TOOLBAR_LABEL}>` **sin encabezado visible**
(`ProjectsToolbar.tsx:80-83`) y la grilla es un `<ul>` pelado sin sección contenedora
(`ProjectsView.tsx:265-268`).

### 3.2 Cómo pinta el Dashboard vacío / carga / error

- **Error** — `DashboardView.tsx:263-268`:
  ```jsx
      {errorMessage !== null ? (
        <ErrorState
          title={ERROR_TITLE}
          description={errorMessage}
          onRetry={reload}
        />
  ```
  con `ERROR_TITLE = "Se enredó la madeja"` (`DashboardView.tsx:42`). **Reusa `ErrorState`.**
- **Vacío** — `DashboardView.tsx:269-273`:
  ```jsx
      ) : isEmpty ? (
        <EmptyState
          title={emptyStateTitle(year)}
          description={EMPTY_STATE_DESCRIPTION}
        />
  ```
  con (`DashboardView.tsx:44-49`):
  ```ts
  export function emptyStateTitle(year: number): string {
    return `Todavía no tejiste nada en ${year}`;
  }

  export const EMPTY_STATE_DESCRIPTION =
    "Estrená el año con un proyecto: los botones de arriba lo crean en dos pasos.";
  ```
  **Reusa `EmptyState`. Sin `action`** — el copy remite a los botones de la toolbar en vez de repetirlos.
  (RFC-02 §4 pedía `"Todavía no tejiste nada en {año}" + botones de crear`; la implementación puso el
  puntero textual y no los botones.)
- **Vacío secundario** — `ActiveProjectsPanel.tsx:102-107`, con `headingLevel={3}`:
  ```ts
  export const NO_ACTIVE_PROJECTS_TITLE = "No tenés proyectos en curso";
  export const NO_ACTIVE_PROJECTS_DESCRIPTION =
    "Cuando empieces uno, aparece acá con su progreso y su tiempo.";
  ```
- **Carga** — dos mecanismos:
  1. **Región viva `sr-only` única de página** (`DashboardView.tsx:188-192`):
     ```jsx
      {/* Región viva única de la página: los bloques de carga son `aria-hidden`
          y no anuncian nada por su cuenta. */}
      <p role="status" className="sr-only">
        {loading ? LOADING_MESSAGE : ""}
      </p>
     ```
     con `LOADING_MESSAGE = "Cargando tu resumen."` (`DashboardView.tsx:41`).
  2. **Skeletons con la silueta del contenido**, `aria-busy` en la lista contenedora
     (`MetricsPanel.tsx:87-100` y `ActiveProjectsPanel.tsx:144-160`). El de la lista de proyectos, íntegro:
     ```jsx
      <ul aria-busy="true" className="grid grid-cols-1 gap-(--space-4) tablet:grid-cols-2 desktop:grid-cols-3">
        {[0, 1, 2].map((slot) => (
          <li key={slot}>
            <Card className="flex flex-col gap-(--space-3)">
              <Skeleton shape="block" className="aspect-video w-full" />
              <Skeleton className="w-full" />
              <Skeleton shape="block" className="h-(--space-3) w-full" />
            </Card>
          </li>
        ))}
      </ul>
     ```
     (#20 clona esta pieza con 6 slots: `ProjectsView.tsx:307-324`.)
  3. **Los datos viejos sobreviven al cambio de filtro** (`DashboardView.tsx:107-109`, mismo patrón en
     `ProjectsView.tsx:111-113`): sólo la **primera** carga muestra skeletons.

### 3.3 ¿Existe en la app algún feedback VISIBLE (no `sr-only`) de una acción del usuario?

**Sí, existe — pero sólo para ERRORES, y siempre dentro de un formulario o como panel que reemplaza al
contenido. NO existe ni un solo caso de confirmación visible de una acción que SALIÓ BIEN.**

Barrido completo (`grep` de `role="alert"|role="status"|aria-live|Toast|toast` sobre todo `src/`):

| Sitio | Qué es | ¿Visible? |
|---|---|---|
| `src/features/auth/ui/AuthFormError.tsx:23-28` | `<div role="alert">` con `<p>` de borde `--danger` | **VISIBLE** — error de formulario (401/409/500/red) |
| `src/features/dashboard/ui/NewProjectDialog.tsx:106-113` | `<p role="alert" className="font-body text-sm leading-base text-danger">` | **VISIBLE** — error de alta dentro del modal |
| `src/shared/ui/feedback/error-state/ErrorState.tsx:50` | `role="alert"` en el panel de error | **VISIBLE** — panel que reemplaza el contenido |
| `src/features/dashboard/ui/DashboardView.tsx:190` | `<p role="status" className="sr-only">` | **sr-only** — carga |
| `src/features/projects/ui/ProjectsView.tsx:208` | `<p role="status" ... className="sr-only">` | **sr-only** — carga |
| `src/features/projects/ui/ProjectsView.tsx:211-217` | `<p role="status" aria-label={QUICK_START_REGION_LABEL} className="sr-only">` | **sr-only** — **el resultado del quick-start** |
| `src/shared/ui/three/ascii-yarn/AsciiYarn.tsx:46` | comentario, no código | — |

**El precedente a copiar para un error visible** es `AuthFormError.tsx`, transcrito entero:

```jsx
/**
 * Error a nivel de formulario. Vive aquí y no en `shared/ui` porque el design
 * system todavía no tiene primitivo de feedback (SDD §6) y esto es UI de la
 * feature, no del template.
 *
 * Por qué existe pudiendo usar `Field`: el mensaje de `Field` es un `span`
 * normal asociado por `aria-describedby`, o sea que **no se anuncia** cuando
 * aparece después del envío, salvo que el foco esté en ese campo. El contenedor
 * va montado SIEMPRE (aunque esté vacío) para que el lector de pantalla tenga la
 * región viva registrada antes de que llegue el texto; si la región naciera
 * junto al mensaje, el anuncio se pierde en parte de los lectores.
 *
 * El color de peligro se lee a 4.86:1 sobre la superficie elevada de `Card`, que
 * es donde se monta (misma pareja de tokens que usa el mensaje de `Field`).
 */
export function AuthFormError({ message }: AuthFormErrorProps) {
  return (
    <div role="alert">
      {message ? (
        <p className="border-(length:--border-width) border-solid border-danger rounded-sm p-(--space-3) font-mono text-sm text-danger">
          {message}
        </p>
      ) : null}
    </div>
  );
}
```

**Dato importante, y hay que decirlo con todas las letras: en TODA la app NO EXISTE ningún feedback
visible de una acción exitosa.** No hay `Toast`, no hay banner de éxito, no hay confirmación en línea, no
hay ningún uso del token `--success` en `src/features/**` ni en `src/shared/ui/**` fuera de su
declaración. Concretamente, **el quick-start de #20 —la única acción de escritura de la página— sólo
anuncia su resultado por `sr-only`** (`ProjectsView.tsx:211-217`), con estos textos
(`ProjectsView.tsx:55-61`):

```ts
export function quickStartStartedMessage(projectName: string): string {
  return `Empezaste a tejer ${projectName}.`;
}

export function quickStartResumedMessage(projectName: string): string {
  return `${projectName} ya tenía el cronómetro en marcha.`;
}
```

y el motivo escrito por el implementer (`ProjectsView.tsx:174-177`):

```
   * El resultado se anuncia en **una sola región viva de página** y no en un
   * `role="alert"` por tarjeta: en una grilla hay N botones y N alertas
   * multiplicarían los anuncios.
```

> **Consecuencia para el fix:** un usuario vidente que toca ▶ en una card **no ve absolutamente nada**
> salvo el spinner momentáneo del botón (`Button loading`). No hay precedente que copiar para el caso
> "salió bien"; el precedente más cercano en forma (recuadro con borde de color + `font-mono text-sm`,
> región viva montada siempre aunque vacía) es `AuthFormError`, y la única regla del SDD sobre esto es
> que el `Toast` está en el inventario de §6 pero **no construido**.

---

## 4. El hueco de la foto — `src/features/projects/ui/ProjectCard.tsx`

### 4.1 Cómo pinta el caso `image === null` (transcripción íntegra, líneas 126-170)

```jsx
/**
 * La foto es **decorativa**: el nombre del proyecto está justo debajo, así que
 * un texto alternativo que lo repitiera sólo haría que un lector de pantalla lo
 * dijera dos veces. Por eso `alt=""` y no una descripción.
 *
 * Sin foto se pinta un hueco con la misma silueta en vez de colapsar el bloque:
 * si no, las tarjetas de una misma fila tendrían alturas distintas según quién
 * subió imagen.
 */
function ProjectPhoto({ name, image }: { name: string; image: string | null }) {
  const frame =
    "aspect-video w-full overflow-hidden rounded-sm border-(length:--border-width) border-solid border-border bg-surface-sunken";

  if (image === null) {
    return (
      <div className={`${frame} flex items-center justify-center`}>
        <span aria-hidden="true" className="font-mono text-lg text-fg-muted">
          {initialOf(name)}
        </span>
      </div>
    );
  }

  /* Etiqueta `img` y no `next/image`: las fotos son URLs de Cloudinary, o sea un
     host remoto arbitrario, y `next/image` exigiría declarar
     `images.remotePatterns` en `next.config.ts`. Eso es una decisión de la
     canalización de imágenes —quién optimiza, con qué presupuesto y contra qué
     hosts— y no de esta tarjeta. Cuando exista esa configuración, el cambio es
     de un solo sitio. */
  return (
    // eslint-disable-next-line @next/next/no-img-element -- ver el comentario de arriba
    <img
      src={image}
      alt=""
      loading="lazy"
      decoding="async"
      className={`${frame} object-cover`}
    />
  );
}

/** Inicial del proyecto, como marca del hueco. Vacío si el nombre no da ninguna. */
function initialOf(name: string): string {
  return name.trim().slice(0, 1).toUpperCase();
}
```

### 4.2 Respuestas

- **De dónde sale la letra:** de `initialOf(name)` (`ProjectCard.tsx:168-170`) =
  `name.trim().slice(0, 1).toUpperCase()`. Es **la primera letra del nombre del proyecto**, en mayúscula.
  Si el nombre es vacío o sólo espacios, **la cadena queda vacía y el hueco no muestra nada**.
- **Tokens que usa el hueco:**
  - marco (compartido con la `<img>`): `aspect-video`, `w-full`, `overflow-hidden`, `rounded-sm`,
    `border-(length:--border-width)`, `border-solid`, `border-border`, **`bg-surface-sunken`**
    (= `#eadfcb`, `globals.css:41`; el token **no está en la tabla del SDD §5**).
  - la letra: **`font-mono`**, **`text-lg`**, **`text-fg-muted`**, y `aria-hidden="true"` (decorativa,
    no la lee ningún lector de pantalla).
  - centrado: `flex items-center justify-center`.
- **La proporción `aspect-video` (16:9)** sale de aquí y de ningún documento.
- **¿El RFC o el SDD dicen algo sobre el placeholder de imagen?**
  **NO ESTÁ ESPECIFICADO EN NINGÚN SITIO.** Ni RFC-03, ni RFC-02, ni el SDD-01 mencionan el caso "sin
  foto", ni placeholder, ni imagen por defecto, ni inicial, ni proporción de la foto. RFC-03 §1:18 y
  §2:32 dicen sólo la palabra **"foto"**. El SDD §6 lista `Avatar` entre los primitivos
  (`SDD-01-design-system.md:172`) — **`Avatar` no está construido** (no aparece en
  `src/shared/ui/primitives/index.ts`).
- **Contexto que sí está escrito** (razón del hueco, `ProjectCard.tsx:131-133`): *"Sin foto se pinta un
  hueco con la misma silueta en vez de colapsar el bloque: si no, las tarjetas de una misma fila tendrían
  alturas distintas según quién subió imagen."* Es decir: la decisión documentada es **"no colapsar"**;
  **qué se pinta dentro del hueco es invención del implementer, sin fuente.**
- **Resto de la card** (`ProjectCard.tsx:80-124`), para contexto del fix: raíz `Card` (variante por
  defecto = `raised`, `bg-surface-raised shadow-hard-lg p-(--space-5)`), dentro un
  `flex flex-col gap-(--space-3)` con: foto → fila `justify-between` con el título
  (`font-display text-xl leading-tight text-fg`) y el botón ▶ (`Button size="icon"`) → `ProgressBar` →
  `<p className="flex items-baseline justify-between font-mono text-sm leading-base text-fg-muted">`
  con `{progress}%` a la izquierda y la duración a la derecha.

---

## 5. Nomenclatura y copy

### 5.1 ¿Hay guía de tono/voz en `docs/`?

**NO ESTÁ ESPECIFICADO EN NINGÚN SITIO.** Barrido de todo `docs/` (13 archivos .md) con
`grep -i "voseo|tono|voz|copy|microcopy|Empezá|Probá|rioplatense"`: sólo tres coincidencias, y ninguna es
una guía de tono:

- `docs/design/rfc/RFC-03-proyectos.md:55` — el copy concreto del estado vacío (*"empezá un proyecto"*).
- `docs/design/rfc/RFC-01-shell.md:110` y `:127` — *"tono de página"*, que ahí significa **color**
  (el tono del `ArchiveNav`), no voz.

**La única regla de lenguaje escrita en toda la documentación** es
`docs/harness/conventions.md:6-10`, transcrita íntegra:

```
## Idioma (regla del PRD §4)

- **El código está en inglés:** nombres de tablas, clases, atributos, enums,
  rutas de API y archivos.
- **La UI y la prosa van en español.**
```

**No dice "voseo", no dice "rioplatense", no dice nada sobre tono, registro, persona ni longitud.**
Tampoco existe brief de identidad visual ni `visual.md` (ver §2.2 de este informe).

**Conclusión: el copy nuevo se decide por precedente.** Sigue la lista completa.

### 5.2 Inventario de textos de interfaz ya existentes en `src/features/**/ui/`

**Etiquetas de control**

| Texto | Origen |
|---|---|
| `"Año"` | `dashboard/ui/DashboardView.tsx:37` |
| `"Año anterior"` | `dashboard/ui/DashboardView.tsx:38` |
| `"Año siguiente"` | `dashboard/ui/DashboardView.tsx:39` |
| `"Tipo de tejido"` | `dashboard/ui/DashboardView.tsx:40` y `projects/ui/ProjectsToolbar.tsx:17` |
| `"Ordenar por"` | `dashboard/ui/ActiveProjectsPanel.tsx:17` |
| `"Ver todos"` | `dashboard/ui/ActiveProjectsPanel.tsx:18` |
| `"Métricas visibles"` | `dashboard/ui/MetricsPanel.tsx:18` |
| `"Nombre del proyecto"` | `dashboard/ui/NewProjectDialog.tsx:19` |
| `"Crear proyecto"` | `dashboard/ui/NewProjectDialog.tsx:20` |
| `"Filtros de proyectos"` | `projects/ui/ProjectsToolbar.tsx:15` |
| `"Estado del proyecto"` | `projects/ui/ProjectsToolbar.tsx:16` |
| `"Buscar"` | `projects/ui/ProjectsToolbar.tsx:18` |
| `"Más filtros"` | `projects/ui/ProjectsToolbar.tsx:21` |
| `"Aguja"` | `projects/ui/ProjectsToolbar.tsx:22` |
| `"Lana usada"` | `projects/ui/ProjectsToolbar.tsx:23` |
| `"Todas"` | `projects/ui/ProjectsToolbar.tsx:24` |
| `"Cronómetro"` (nombre de región) | `projects/ui/ProjectsView.tsx:35` |
| `"Estado de la lista de proyectos"` | `projects/ui/ProjectsView.tsx:32` |
| `"Dos agujas"` / `"Crochet"` | `dashboard/ui/filters.ts:10-11`, `projects/ui/project-filters.ts:11-12` |
| `"Nuevo dos agujas"` / `"Nuevo crochet"` | `dashboard/ui/filters.ts:16-17`, `projects/ui/ProjectsView.tsx:51-52` |
| `"Activos"` / `"Inactivos"` | `projects/ui/project-filters.ts:32-33` |
| `"Nombre"` / `"Progreso"` (orden) | `dashboard/ui/filters.ts:70-71` |
| `"Horas"` / `"Proyectos"` | `dashboard/ui/metrics-display.ts:22-23` |
| `"horas tejidas"` / `"proyectos"` (unidades) | `dashboard/ui/metrics-display.ts:29-30` |
| `` `Empezar a tejer ${projectName}` `` (aria-label del ▶) | `projects/ui/ProjectCard.tsx:17-19` |
| `` `Progreso de ${project.name}` `` | `projects/ui/ProjectCard.tsx:111` |
| `"Tiempo tejido: "` (`sr-only`) | `projects/ui/ProjectCard.tsx:117` |

**Títulos de sección / página**

| Texto | Origen |
|---|---|
| `"Tu año en números"` | `dashboard/ui/MetricsPanel.tsx:17` |
| `"Proyectos en curso"` | `dashboard/ui/ActiveProjectsPanel.tsx:16` |
| `"Proyectos"` (h1 de #20) | `projects/ui/ProjectsView.tsx:29` |
| `"Tu taller: lo que tejiste, lo que estás tejiendo y lo que falta."` | `dashboard/ui/DashboardHero.tsx:53-55` |
| `` `Nuevo proyecto de ${CRAFT_TYPE_LABELS[type].toLowerCase()}` `` | `dashboard/ui/NewProjectDialog.tsx:22-24` |
| `"Le podés poner el resto de los datos más adelante."` | `dashboard/ui/NewProjectDialog.tsx:94` |

**Estados (vacío / error / carga)**

| Texto | Origen |
|---|---|
| `"Se enredó la madeja"` | `dashboard/ui/DashboardView.tsx:42` |
| `` `Todavía no tejiste nada en ${year}` `` | `dashboard/ui/DashboardView.tsx:44-46` |
| `"Estrená el año con un proyecto: los botones de arriba lo crean en dos pasos."` | `dashboard/ui/DashboardView.tsx:48-49` |
| `"Cargando tu resumen."` | `dashboard/ui/DashboardView.tsx:41` |
| `"No tenés proyectos en curso"` | `dashboard/ui/ActiveProjectsPanel.tsx:20` |
| `"Cuando empieces uno, aparece acá con su progreso y su tiempo."` | `dashboard/ui/ActiveProjectsPanel.tsx:21-22` |
| `"Elegí al menos una métrica para ver el resumen."` | `dashboard/ui/MetricsPanel.tsx:19-20` |
| `"Se soltó un punto"` | `projects/ui/ProjectsView.tsx:37` |
| `"Tu cesto está vacío"` | `projects/ui/ProjectsView.tsx:39` |
| `"Empezá un proyecto: los dos botones de acá abajo te llevan al inicio, que es donde hoy se crea en dos pasos."` | `projects/ui/ProjectsView.tsx:40-41` |
| `"Ningún proyecto coincide con la búsqueda"` | `projects/ui/ProjectsView.tsx:43` |
| `"Probá con otro nombre o vaciá el campo de búsqueda."` | `projects/ui/ProjectsView.tsx:44-45` |
| `"Cargando tus proyectos."` | `projects/ui/ProjectsView.tsx:33` |
| `` `Mostrando ${visible.length} de ${projects.length}.` `` | `dashboard/ui/ActiveProjectsPanel.tsx:122` |

**Ayudas y notas al pie**

| Texto | Origen |
|---|---|
| `"Filtra por nombre sobre los proyectos ya cargados, sin volver a pedirlos."` | `projects/ui/ProjectsToolbar.tsx:19-20` |
| `"La actividad cuenta cualquier cambio en el proyecto, no sólo el tiempo tejido."` | `dashboard/ui/filters.ts:78-79` |
| `"Total histórico: no cambia con los filtros"` | `dashboard/ui/metrics-display.ts:41` |
| `"4,5 mm"` (formato de aguja, vía `Intl`) | `projects/ui/ProjectsToolbar.tsx:26-29` |

**Mensajes de resultado / error de red** (los tres clientes usan **exactamente el mismo par**:
`auth-client.ts:5-8`, `dashboard-client.ts:20-23`, `projects-client.ts:39-42`)

| Texto | Origen |
|---|---|
| `"No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo."` | los tres `*-client.ts` |
| `"Algo salió mal. Intentá de nuevo en unos segundos."` | los tres `*-client.ts` |
| `` `Empezaste a tejer ${projectName}.` `` (`sr-only`) | `projects/ui/ProjectsView.tsx:55-57` |
| `` `${projectName} ya tenía el cronómetro en marcha.` `` (`sr-only`) | `projects/ui/ProjectsView.tsx:59-61` |

**Patrón observable del tono** (descripción de lo medido, no una regla escrita en ningún sitio):

1. **Voseo consistente**, siempre: `Empezá`, `Probá`, `Estrená`, `Elegí`, `Revisá`, `intentá`, `vaciá`,
   `tenés`, `podés`, `tejiste`, `empieces`.
2. **Segunda persona directa y posesivo "tu"**: `"Tu año en números"`, `"Tu cesto está vacío"`,
   `"Tu taller: ..."`, `"Cargando tus proyectos."`, `"Revisá tu conexión"`.
3. **Metáforas de tejido para los errores**: `"Se enredó la madeja"` (#19),
   `"Se soltó un punto"` (#20) — ambos venían literalmente de sus RFC (§4 de RFC-02 y de RFC-03).
4. **Descripción = qué hacer a continuación, en una frase**, a menudo con dos puntos:
   `"Estrená el año con un proyecto: los botones de arriba lo crean en dos pasos."`,
   `"Empezá un proyecto: los dos botones de acá abajo te llevan al inicio, ..."`.
5. **Rioplatense también en el léxico**: `"acá"`, `"acá abajo"` (no "aquí").
6. Los mensajes terminan **con punto** cuando son frases; los títulos, **sin punto**.

---

## 6. Resumen de huecos — lo que NO ESTÁ ESPECIFICADO EN NINGÚN SITIO

Cada uno verificado leyendo RFC-03 entero, SDD-01 entero, RFC-01 §2-§3, RFC-02 §1-§7-bis (inicio),
`docs/harness/conventions.md` §Idioma y el árbol de `docs/`:

1. **Jerarquía visual de la página `/proyectos`**: si hay hero, cuántas secciones, si la grilla lleva
   título visible, ancho máximo, contenedor.
2. **Posición y tratamiento del toolbar**: si va dentro de una superficie, si es sticky, cómo se separa
   de la grilla. (Sólo se sabe el **orden interno** de sus controles, RFC-03 §2:28.)
3. **Cuándo usar `--surface` vs `--surface-raised`** (regla general de elevación). El SDD nombra los
   tokens; la única regla escrita es la de código: *"los `Field` van dentro de un `Card`"* (deuda 31).
4. **Proporción de la card y de la foto**, y **número de columnas de la grilla** por breakpoint.
5. **Placeholder de imagen** cuando `image === null`: qué se pinta, con qué token, con qué letra.
6. **Feedback visible de una acción exitosa**: no hay regla en el SDD, no hay `Toast` construido, no hay
   ni un solo precedente en `src/`.
7. **Guía de tono/voz**: no existe. Sólo `conventions.md:6-10` ("la UI y la prosa van en español").
8. **Mockup de referencia** al que remite el SDD §9.5 y el **brief de identidad visual** que cita el
   SDD §5 y el `visual.md` del SDD §6: **ninguno de los tres existe en el repo.**

> Precedente citado por el usuario: es el mismo modo de fallo que la rejilla de auth — el RFC-01 daba por
> hecho un layout que ninguna línea fijaba, y se resolvió con la enmienda **E12** tras el rediseño del
> usuario (`RFC-01-shell.md:21-27`). Aquí el hueco es más grande: **RFC-03 no describe la página, sólo
> sus piezas.**

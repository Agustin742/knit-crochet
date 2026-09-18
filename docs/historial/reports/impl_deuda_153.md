# impl — deuda 153

**Estado:** listo para review
**Fecha:** 2026-08-24
**Encargo:** saldar la deuda técnica 153 aplicando la enmienda **E4 (a)(b)(c)(d)** de
`docs/design/rfc/RFC-02-dashboard.md` §7-quinquies. **No es feature: `feature_list.json` no se tocó.**

## Qué pedía la especificación y qué hice con cada cláusula

| Cláusula | Qué pedía | Dónde quedó |
|---|---|---|
| **E4 (a)** | `getActiveProjects` no recibe ni manda `year` | `dashboard-client.ts` (tipos + firma) y la llamada en `DashboardView.tsx` |
| **E4 (b)** | `isEmpty` deja de exigir `projects.length === 0`; comentario actualizado citando E4 | `DashboardView.tsx:189-199` |
| **E4 (c)** | El camino al estado vacío queda anclado por test | `DashboardView.test.tsx`, 5 tests nuevos |
| **E4 (d)** | El vacío sustituye al panel de **métricas**; "Proyectos en curso" se pinta siempre que haya activos | `DashboardView.tsx` (`showActiveProjects` + composición) |

No reabrí ninguna decisión de producto. Nada del código me sugirió una salida distinta.

## Archivos modificados (3, ninguno creado)

- `src/features/dashboard/ui/dashboard-client.ts`
- `src/features/dashboard/ui/DashboardView.tsx`
- `src/features/dashboard/ui/DashboardView.test.tsx`

### 1. `dashboard-client.ts` — E4 (a)

`DashboardQuery` lo compartían las dos peticiones y `getMetrics` **sí** necesita `year`, así que el
campo no se podía borrar del tipo. Se partió en dos:

- `TypeQuery = { type?: CraftType }` — lo único común. Se lleva el comentario que explica por qué
  "los dos marcados" y "ninguno marcado" piden lo mismo.
- `DashboardQuery = TypeQuery & { year: number }` — sigue exportado con el mismo nombre y la misma
  forma para `getMetrics`; ningún consumidor cambia.

`getActiveProjects(query: TypeQuery)`: ya no puede recibir `year`. Es un cambio de tipos con dientes —
el `queryString` no cambia porque ya era correcto: **el defecto era que la firma mentía**, y ahora
pasarle `year` no compila.

### 2. `DashboardView.tsx` — E4 (a)(b)(d)

- Llamada: `getActiveProjects({ type })`.
- `isEmpty = data !== null && data.metrics.hours === 0 && data.metrics.projects === 0`.
- El comentario de `:185-187` se reescribió tal como pedía el encargo: ahora explica que quedan fuera
  **dos** cosas por el **mismo** motivo —los metros (E1.5) y la lista de en curso (E4 b)— y cierra con
  el criterio general: *"el título promete algo sobre el año; la condición no puede pedir hechos que
  no sean del año"*.
- `showActiveProjects = !isEmpty || (data?.projects.length ?? 0) > 0`. El `?.` no es cosmético:
  `isEmpty` es un booleano derivado y TypeScript **no** estrecha `data` a partir de él, así que
  `data.projects` no compilaría aunque el cortocircuito lo haga inalcanzable en tiempo de ejecución.
- Composición: el ternario de tres ramas (error / vacío / los-dos-paneles) pasa a dos ramas
  (error / contenido), y dentro del contenido el vacío alterna **sólo** con `MetricsPanel`, mientras
  `ActiveProjectsPanel` se pinta bajo su propia condición.

Efecto en cada escenario:

| Escenario | Antes | Ahora |
|---|---|---|
| Año en cero, **sin** activos | vacío solo | **igual**: vacío solo |
| Año en cero, **con** activos | métricas en cero + panel de activos (**el vacío no salía nunca**) | vacío + panel de activos |
| Año con datos | métricas + activos | **igual** |
| Cargando (`data === null`) | los dos paneles con bloques de carga | **igual** (`isEmpty` es `false` con `data === null`) |

## 3. Tests (E4 c) — rojo antes, verde después

Cinco tests nuevos en `DashboardView.test.tsx`, ninguno borrado.

**Corrida ANTES del arreglo** (tests escritos, código sin tocar):

```
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  src/features/dashboard/ui/DashboardView.test.tsx > estados de carga, vacío y error (RFC-02 §4) > da el año por vacío aunque quede un proyecto vivo de otro año
 FAIL  src/features/dashboard/ui/DashboardView.test.tsx > estados de carga, vacío y error (RFC-02 §4) > el vacío del año NO esconde el proyecto que sigue en curso
 Test Files  1 failed (1)
      Tests  2 failed | 39 passed (41)
```

**Corrida DESPUÉS** (mismo archivo y sus vecinos de carpeta):

```
 Test Files  4 passed (4)
      Tests  81 passed (81)
```

Qué ancla cada uno:

1. **`da el año por vacío aunque quede un proyecto vivo de otro año`** — el caso que hoy fallaba.
   Métricas del año en cero **con `projects: [ALFOMBRA]`**, que es lo que producción sí produce
   (REGLA 7: el test viejo del vacío pasaba `projects: []`, algo que producción **nunca** devuelve si
   hay un proyecto abierto; por eso estuvo verde sobre un estado inalcanzable). Comprueba que sale el
   vacío **y** que el que se va es el panel de métricas.
2. **`el vacío del año NO esconde el proyecto que sigue en curso`** — E4 (d). No mira sólo el título
   del vacío: busca el encabezado "Alfombra" **dentro de la región "Proyectos en curso"**.
3. **`sin proyectos en curso el vacío del año se queda sin vecinos`** — la otra mitad de E4 (d): sin
   activos no hay región "Proyectos en curso" y la página queda en el vacío puro.
4. **`no da por vacío un año con métricas, aunque no haya nada en curso`** — control en la dirección
   contraria. Sacar `projects` de la condición abre el riesgo simétrico (que el vacío salte de más):
   `hours: 0, projects: 2` con lista de activos vacía **no** es un año vacío, y el panel de métricas
   se queda.
5. **`no filtra los proyectos en curso por año`** — E4 (a) asertado sobre la **URL realmente pedida**
   (`lastProjectsUrl()`), no sobre la firma, y comprobado **también después de mover el año**, que es
   cuando un filtro colado se notaría.

**Honestidad sobre el color de cada uno:** rojo→verde son el **1** y el **2**. Los tests **3**, **4**
y **5** estaban verdes antes y después, y es lo esperado: el 3 y el 4 describen comportamiento que E4
conserva y quedan como red de seguridad de la recomposición; el 5 pasaba porque la URL **ya** era
correcta —el defecto de E4 (a) era una firma que aceptaba un parámetro que ignoraba—, y su valor es
impedir que alguien "arregle" la mentira en la otra dirección, mandando el año de verdad.

## 4. Verificación — `bash ./init.sh`, salida real

```
── 1. Verificando entorno ─────────────────────────────
[OK]    node -> v24.11.1
[OK]    pnpm -> 11.9.0

── 2. Verificando archivos base del arnés ──────────────
[OK]    Existe AGENTS.md
[OK]    Existe feature_list.json
[OK]    Existe progress/current.md
[OK]    Existe docs/harness/architecture.md
[OK]    Existe docs/harness/conventions.md
[OK]    Existe docs/harness/verification.md
[OK]    Existe CHECKPOINTS.md

── 3. Validando feature_list.json ──────────────────────
[OK]    feature_list.json válido (33 features)

── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet


 Test Files  81 passed | 3 skipped (84)
      Tests  1424 passed | 13 skipped (1437)
   Start at  14:12:58
   Duration  84.93s (transform 6.29s, setup 62.80s, import 72.74s, tests 48.73s, environment 27.96s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**EXIT 0.**

**Aritmética, sin residuo:**

- Archivos: `81 passed | 3 skipped (84)` → **igual** que el punto de partida. No creé archivos de test;
  los 5 tests van al archivo que ya existía.
- Tests: partida **1419 passed | 13 skipped (1432)**. Añado **5**. `1419 + 5 = 1424` y
  `1432 + 5 = 1437`. Skipped intacto: **13**. Cierra exacto.
- Ningún timeout ni fallo intermitente en toda la sesión. La suite tardó 84,93 s.

Guardrail de **no-hardcode**: verde. No escribí ningún valor con unidad ni color literal en los
comentarios nuevos (lo tuve presente al redactarlos); el gate no se tocó.

## 5. Decisiones no obvias

- **Partir `DashboardQuery` en vez de duplicar la forma.** La alternativa era declarar un objeto
  anónimo `{ type?: CraftType }` en la firma de `getActiveProjects`, pero entonces el comentario que
  explica el filtro combinable se duplicaba o se perdía. `TypeQuery` + intersección deja **un** sitio
  donde está escrito qué significa `type`.
- **La petición de activos se sigue disparando al cambiar de año.** Va en el mismo `Promise.all` y el
  `useEffect` depende de `requestKey`, que incluye `year`. Podría haberla sacado a su propio efecto,
  pero eso es un cambio de la arquitectura de carga fuera del alcance de E4 y con riesgo propio (dos
  efectos, dos claves, dos formas de quedarse cargando). Queda **fichado como deuda nueva** más abajo,
  medido, en vez de colado aquí.
- **No toqué la copia del vacío.** E4 dice explícitamente que *"§4 no cambia de texto"*. El problema
  que eso deja abierto va como deuda nueva, no como arreglo silencioso.
- **Trabajo ajeno en el árbol.** Al llegar ya había cambios sin commitear en
  `src/shared/ui/breakpoint-tokens.test.ts`, `.../account-band/account-band.tokens.test.ts`,
  `.../app-shell/app-shell.classes.test.ts`, `.../archive-nav/archive-nav.tokens.test.ts` y
  `src/shared/ui/testing/class-names-from-source.ts` (mtimes 13:33–13:53, anteriores a esta sesión:
  es la deuda 158). **No los toqué** y forman parte del punto de partida de 1419 tests.

## 6. Verificación en navegador — NO la pude hacer

**No tengo herramientas de navegador en esta sesión** (sólo archivos y shell), así que **no miré la
pantalla**. Los 1424 tests en verde **no son evidencia de que se vea bien**: en este repo ya se
cerraron dos pantallas rotas con la suite entera verde (deudas 118 y 141). Lo que sí puedo afirmar del
marcado, y lo que queda por mirar:

- El vacío ocupa **exactamente la ranura** que ocupaba `MetricsPanel`: mismo padre, mismo
  `flex flex-col gap-(--space-8)`, misma posición. No cambia el espaciado de la página.
- `EmptyState` es un `section` con nombre accesible propio, igual que los dos paneles, y `axe` corre
  sobre el marcado real: no hay región sin nombre ni salto de nivel de encabezado (el vacío usa `h2`,
  como el `h2` de métricas al que sustituye).
- **Pendiente de mirar por alguien con navegador:** cómo conviven el panel de vacío y el de
  "Proyectos en curso" **uno encima del otro** —una composición que hasta hoy era imposible de ver— y
  si el vacío, con su superficie clara sobre el fondo espresso, no pesa más que el panel de proyectos
  que tiene debajo. Es justo el eje que ningún gate mide.

## 7. Deuda nueva detectada

**A. 🟠 El vacío del año le dice "empezá el primero" a quien tiene un proyecto en pantalla.**
Al volverse alcanzable con proyectos activos (E4 b/d), el estado vacío pinta su descripción
`EMPTY_STATE_DESCRIPTION` = *"Empezá el primero y acá van a estar tus horas, tus proyectos y lo que
llevás tejido de cada uno."* **justo encima** del panel "Proyectos en curso" con el proyecto dentro.
**Escenario concreto:** proyecto abierto en 2026 y todavía en las agujas; el 2 de enero de 2027, sin
tiempo registrado aún, el Dashboard muestra a la vez *"Todavía no tejiste nada en 2027"* + *"Empezá el
primero…"* y, debajo, *"Proyectos en curso — Alfombra, 80%"*. **Medición:** es exactamente el DOM que
produce el test `el vacío del año NO esconde el proyecto que sigue en curso` (el título del vacío y el
encabezado "Alfombra" coexisten en el árbol, y `EmptyState` pinta su `description` sin condición).
**Por qué NO lo arreglé aquí:** E4 fija que *"§4 no cambia de texto"*, así que cambiar la copia sería
tomar por mi cuenta una decisión de producto que la enmienda cerró. **Es la misma familia que la 153
que acabo de saldar** —una afirmación *lifetime* ("el primero") dentro de un estado *anual*—, sólo que
en la copia en vez de en la condición. **Arreglo sugerido:** una descripción que no presuponga cero
proyectos de por vida, o dos descripciones según haya o no activos.

**B. 🟡 Cada paso de año dispara una petición idéntica y redundante a `/api/projects`.**
`getActiveProjects` ya no lleva `year`, pero sigue dentro del `Promise.all` de un `useEffect` cuya
dependencia `requestKey` **sí** incluye el año. **Escenario concreto:** el usuario pulsa "Año anterior"
cinco veces para mirar de 2025 a 2021. **Medición:** salen **10** peticiones GET, de las cuales **5**
son a `/api/projects?active=true` con la **misma** query y la **misma** respuesta; verificable con
`requestedUrls()` en `DashboardView.test.tsx`, que crece de dos en dos por cada cambio de año. Coste
bajo (la lista es de ~15 proyectos) y hoy tiene una ventaja: la lista se mantiene fresca. **Arreglo
sugerido si molesta:** separar la carga de activos a su propio efecto con clave `type|reloadToken`.
**Riesgo del arreglo:** duplicar la máquina de "estar cargando", que hoy es una sola clave y por eso no
se puede desincronizar.

**Ninguna de las dos se volcó a `progress/deudas.md`:** eso lo hace el leader al cerrar.

---

## Tanda 2 — review RECHAZADO: bloqueante 1 (ancla imposible) + E4 (e)

**Arrancada:** 2026-08-24, tras `progress/reports/review_deudas_158_153.md`.
El comportamiento implementado queda verificado como correcto; lo que falla es un **ancla**.

Plan:

- [ ] Leer el review y `src/features/dashboard/api/store.ts` (`countProjects`).
- [ ] **Bloqueante 1:** los dos tests del vacío montan un proyecto con `startDate` en el AÑO MIRADO,
      y `countProjects` cuenta "iniciado O terminado en el año" -> producción habria devuelto
      `projects >= 1` y el vacio no habria salido. Derivar el `startDate` de un anio ANTERIOR a
      `CURRENT_YEAR` (derivado, nunca escrito a mano) y **corregir el comentario**.
- [ ] **E4 (e):** escribir la clausula en `docs/design/rfc/RFC-02-dashboard.md` §7-quinquies PRIMERO,
      luego implementar la copia doble del vacio (con activos / sin activos) y anclarla en las dos
      direcciones.
- [ ] `bash ./init.sh` EXIT 0. Partida: `1424 passed | 13 skipped (1437)`.
- [ ] NO tocar nada de la deuda 158 ni los gates de tokens.

### Resultado de la tanda 2

**Estado: listo para re-review.** Los dos encargos hechos; `bash ./init.sh` EXIT 0.

#### 2.1 Bloqueante 1 — el ancla imposible. **Aceptado sin peros.**

El reviewer tiene razón y el defecto es exactamente el que dice. `countProjects`
(`src/features/dashboard/api/store.ts:83-95`) cuenta *"iniciado **O** terminado en el año"*; el fixture
`project()` trae `startDate: "2026-01-01"` y hoy `CURRENT_YEAR` **es** 2026, así que producción habría
devuelto `projects >= 1` para ese proyecto y el vacío **no habría salido**. Mis dos tests aseguraban un
estado que la app no puede alcanzar, y encima el comentario afirmaba lo contrario. **Es la deuda 153
reaparecida dentro de su propio arreglo**: verde sobre un escenario que producción no produce.

Cómo quedó, en `DashboardView.test.tsx`:

- Fixture nuevo **`BUFANDA_DEL_ANO_PASADO`**, justo debajo de `CURRENT_YEAR`, con
  `startDate: \`${CURRENT_YEAR - 1}-11-02T00:00:00.000Z\`` — **derivado**, no la constante escrita a
  mano, para que el test siga diciendo la verdad el 1 de enero que viene. `endDate: null` (sigue en las
  agujas) por el default del fixture.
- Su comentario explica el porqué con la regla del store citada: un proyecto empezado **dentro** del año
  mirado obliga a `metrics.projects >= 1`, así que `projects: 0` junto a él sería otra mentira verde.
- Los dos tests del vacío con activos pasan a `projects: [BUFANDA_DEL_ANO_PASADO]` y el de E4 (d) busca
  el encabezado **"Bufanda"** dentro de la región "Proyectos en curso".
- **Comentario corregido:** el de `da el año por vacío…` decía que el fixture era el caso real cuando no
  lo era. Ahora remite al fixture y dice qué lo hace posible.

El escenario resultante es **el que E4 (d) describe**: año en blanco (`hours: 0`, `projects: 0` — sin
sesiones ni altas ni finales este año) y **proyecto vivo empezado el año anterior**. Producción lo
produce tal cual.

Los otros usos de `ALFOMBRA` que quedan en el archivo (líneas ~725 y ~775) son de tests preexistentes
que **no** tocan el estado vacío: usan métricas por defecto, así que su `startDate` no miente sobre nada.

#### 2.2 E4 (e) — la copia doble

**Primero el RFC, luego el código**, como pedía el encargo.

- **`docs/design/rfc/RFC-02-dashboard.md` §7-quinquies**: cláusula nueva **"E4 (e) — la copia del vacío
  se desdobla (decisión del usuario, 2026-08-24)"**, con su motivación medida, su tabla de qué se fija
  (título intacto; descripción desdoblada; sin activos = copia de la deuda 147 intacta; con activos =
  copia sólo del año; las dos direcciones ancladas) y un párrafo explícito sobre **qué le pasa a
  *"§4 no cambia de texto"***: sigue valiendo para el **título** y deja de valer para la descripción, para
  que nadie lea las dos frases como una contradicción.
- **`DashboardView.tsx`**: `EMPTY_STATE_WITH_ACTIVE_DESCRIPTION` =
  *"El año todavía está en blanco. En cuanto le dediques un rato a lo que tenés en curso, acá van a
  aparecer tus horas y tus proyectos."* Voseo, cercano, habla **sólo del año**, no presupone cero
  proyectos de por vida y nombra lo que el usuario tiene justo debajo. `EMPTY_STATE_DESCRIPTION` **no se
  tocó**: es la copia de la 147 y sigue con su ancla. El título tampoco.
- La elección se hace con **`hasActiveProjects`**, extraído a nombre propio: es **el mismo hecho** que
  decide si hay panel debajo (`showActiveProjects = !isEmpty || hasActiveProjects`), así que la frase no
  puede desincronizarse de lo que se ve en la misma pantalla. Un booleano aparte sí podría.

**Dos tests nuevos, las dos direcciones:**

1. `con un proyecto a la vista, el vacío habla del año y no del primero` — sale la nueva, **no** sale la
   vieja, **no** aparece `/el primero/i` en ningún sitio, y el **título sigue siendo el de §4**.
2. `sin nada en curso, el vacío sigue siendo el de quien empieza de cero` — control inverso: sale la de
   la 147 y **no** la nueva.

**Rojo medido, no supuesto.** Revertí a mano la descripción a la constante única, corrí el archivo y
restauré:

```
 FAIL  src/features/dashboard/ui/DashboardView.test.tsx > estados de carga, vacío y error (RFC-02 §4) > con un proyecto a la vista, el vacío habla del año y no del primero
 Test Files  1 failed (1)
      Tests  1 failed | 42 passed (43)
```

y con E4 (e) puesta:

```
 Test Files  1 passed (1)
      Tests  43 passed (43)
```

#### 2.3 Verificación

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet


 Test Files  81 passed | 3 skipped (84)
      Tests  1426 passed | 13 skipped (1439)
   Start at  19:17:25
   Duration  84.02s (transform 5.65s, setup 63.22s, import 70.51s, tests 48.62s, environment 28.13s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**EXIT 0.** Aritmética: partida **1424 passed | 13 skipped (1437)**, añado **2** →
`1424 + 2 = 1426` y `1437 + 2 = 1439`. Skipped intacto (**13**), archivos intactos (**84**): el
bloqueante 1 **no** añade tests, cambia el fixture de dos que ya existían. Cierra sin residuo.
Sin timeouts; la suite tardó 84,02 s. Guardrail de no-hardcode verde, sin tocarlo.

#### 2.4 Lo que NO toqué

- **Nada de la deuda 158** ni los gates de tokens (`breakpoint-tokens.test.ts`,
  `account-band.tokens.test.ts`, `app-shell.classes.test.ts`, `archive-nav.tokens.test.ts`,
  `class-names-from-source.ts`). Siguen exactamente como estaban al llegar.
- `feature_list.json`, intacto.
- El **título** del estado vacío y `EMPTY_STATE_DESCRIPTION`, intactos.

#### 2.5 Sigue en pie: no pude mirar la pantalla

Sin herramientas de navegador en esta sesión. **Los 1426 verdes no dicen cómo se ve.** Queda por mirar
lo mismo que en la tanda 1 —vacío y "Proyectos en curso" uno encima del otro, que hasta hoy era
imposible de ver— y ahora además **la frase nueva en su caja**: es más larga que la de la 147 (dos
oraciones) y `StatePanel` no la trunca, así que en móvil ocupará más alto; nada indica que rompa, pero
**no lo vi**.

#### 2.6 Deuda nueva tras esta tanda

- La **A** de la tanda 1 (*"empezá el primero"* con un proyecto a la vista) queda **saldada por E4 (e)**:
  ya no hay que ficharla.
- La **B** sigue viva tal como se describió (petición redundante a `/api/projects` en cada paso de año).
- **C. 🟡 El fixture `project()` de `DashboardView.test.tsx` tiene fechas de 2026 escritas a mano**
  (`startDate`, `createdAt`, `updatedAt`), y `CURRENT_YEAR` se deriva del reloj. **Hoy coinciden; el 1 de
  enero de 2027 dejan de coincidir.** Escenario de fallo: `ALFOMBRA` y `ZOQUETES` pasan a ser proyectos
  "del año pasado", y cualquier test futuro que cruce el fixture con métricas del año heredará justo la
  incoherencia que acaba de costar este rechazo. **Medición:** 6 literales `2026-…` en el archivo
  (`grep -c "2026-" DashboardView.test.tsx`), ninguno derivado de `CURRENT_YEAR`; mis dos fixtures nuevos
  sí lo derivan. **Arreglo sugerido:** derivar las tres fechas del fixture base de `CURRENT_YEAR`. **No lo
  hice aquí** porque toca fixtures compartidos por ~40 tests preexistentes y eso es un lote propio, no un
  arreglo de paso dentro de un rechazo.

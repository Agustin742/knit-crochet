# impl — E7: el alta es UNA y el cronómetro se ve desde la tarjeta

> Informe **incremental**. Se escribe ANTES de tocar código y se actualiza al cerrar cada pieza.
> Contrato: `docs/design/rfc/RFC-03-proyectos.md` §7-octies (E7). Fichas **185** y **186**.

## Estado

- [ ] Plan escrito
- [ ] B3 — `GET /api/projects` devuelve la sesión abierta por proyecto
- [ ] B1 — el botón de la tarjeta se transforma (empezar ↔ parar)
- [ ] B2 — el tiempo transcurrido se ve en la tarjeta
- [ ] B4 — muere la copia efímera (`QUICK_START_NOTES`)
- [ ] A — el Dashboard usa `ProjectFormDialog`; muere `NewProjectDialog`
- [ ] `bash ./init.sh` EXIT 0

## Plan

1. **B3 (el dato, primero: desbloquea el resto).** `list-projects` / el store devuelven, por proyecto,
   su sesión abierta (`{ id, inicio }`) o `null`. Varios proyectos pueden tener cronómetro a la vez
   (invariante de `start-session.ts`: como mucho una sesión abierta **por proyecto**).
2. **B1.** `ProjectCard` recibe el estado de sesión; el mismo botón cambia etiqueta, icono y acción.
   Sin segundo botón (deuda 142).
3. **B2.** Reloj en la tarjeta calculado desde el `inicio` real del servidor, siguiendo el molde de
   `SessionsTab.tsx`: el reloj de segundos NO es `aria-live` (E4 (a)); se anuncian minutos y cambios
   de estado.
4. **B4.** Fuera `QUICK_START_NOTES`; se queda el aviso de acción por `role="status"`.
5. **A.** El Dashboard monta `ProjectFormDialog` con su preselección de tipo; se borran
   `NewProjectDialog.tsx` y el `createProject` de `dashboard-client.ts`; sus tests se migran.

## Bitácora

- (pendiente)

### Pieza 1 — B3 backend: la sesión abierta viaja con la lista ✅

**Rojo primero:** 14 tests nuevos fallando (`store.listActiveSessions is not a function`,
`activeSession` ausente en servicio y en ruta). Verde después: 446 passed en
`src/features/projects` + `src/app/api/projects` + `src/features/time-tracking`.

**Archivos:**
- `src/features/projects/types.ts` — `ActiveProjectSession` (`{id, start}`), `ActiveSessionRow`
  (+`projectId`), `ProjectListItem` (`ProjectRecord & {activeSession}`).
- `src/features/projects/api/store.ts` — `listActiveSessions(userId)`: **una sola consulta** a
  `craft_sessions` (`user_id = $1 and end is null`, `order by start desc`). Importa `craftSessions`
  por su `schema.ts` directo (misma puerta que usa `time-tracking/api/store.ts` en sentido contrario;
  sin ciclo, la capa de schema está por debajo de la de servicios).
- `src/features/projects/api/testing/in-memory-store.ts` — réplica del mismo criterio.
- `src/features/projects/api/list-projects.ts` — compone: `list()` + índice por proyecto. Con lista
  vacía **no pide sesiones**.

**Decisiones no obvias:**
1. **Dos consultas, no un `LEFT JOIN`.** El join multiplicaría filas de proyecto por sesiones y
   obligaría a deduplicar; una consulta por proyecto sería N+1 en la pantalla que más filas pinta.
2. **Se traen TODAS las sesiones abiertas del usuario**, no las de una lista de ids: `inArray` con
   array vacío no es una condición SQL sino la ausencia de una, y el caso "lista vacía" ya se corta
   antes. Como mucho hay una sesión abierta por proyecto, así que el conjunto es diminuto.
3. **`{id, start}` y no la sesión entera:** en una sesión abierta `end` es siempre `null` y
   `duration` siempre `0`. Anclado con un test que cuenta las claves del JSON.
4. **El detalle (`GET /:id`) NO cambia** — hay test que lo ancla (`["project","yarns"]`).

### Pieza 2 — cliente: la lista trae el cronómetro y arrancar devuelve la sesión ✅

- `src/features/projects/ui/types.ts` — `SerializedActiveSession`, `SerializedProjectListItem`,
  `SessionPayload`; `ProjectListPayload` pasa a llevar list items.
- `src/features/projects/ui/projects-client.ts` — `getProjects` devuelve list items; `startCraftSession`
  **desenvuelve la sesión** (antes tiraba el cuerpo como `unknown`), que es lo que deja el reloj en el
  segundo real cuando el servidor responde 200 (sesión reutilizada, arranque viejo).
- Tests: 5 nuevos en `projects-client.test.ts` (rojo primero en los dos del `start`).

### Pieza 3 — B1 + B2: el botón se transforma y el reloj se ve ✅

- `src/features/projects/ui/ProjectCard.tsx` — `"use client"`; **una sola prop `timer`**
  (`{session, pending?, onStart, onStop}`) sustituye a `onQuickStart`/`quickStartPending`/`quickStartNote`.
  Nuevo `SessionClock` interno con su intervalo. Nuevos `quickStopLabel` y `runningTimerLabel`.
- **Por qué una prop objeto y no props sueltas:** con `session` y `onStop` opcionales e independientes
  seguiría siendo representable el estado *"corriendo y sin forma de pararlo"*, que **es la ficha 186**.
  Así no se puede ni escribir. Y la invariante de la deuda 132 (sin la prop, cero controles) se conserva.
- **El intervalo vive en la tarjeta que corre**, no en la vista: sólo tickan las que tienen algo que
  contar y cada tick repinta esa tarjeta, no la rejilla. Probado: **0 intervalos parado, 1 corriendo,
  0 tras desmontar** (`vi.getTimerCount()` con sólo `Date`/`setInterval`/`clearInterval` intervenidos).
- **`aria-live`: NO** (E4 a). La tarjeta no monta ninguna región viva — anclado con un test que busca
  `role=status`, `role=alert` y `aria-live` en el contenedor. Los segundos son `aria-hidden`; lo legible
  es un `sr-only` en grano de **minuto**. Motivo reforzado: en una rejilla puede haber **varios**
  cronómetros, así que serían N metrónomos.
- Tests: 39 en `ProjectCard.test.tsx` (bloque nuevo de 15 para E7).

### Pieza 4 — B4 + cableado de la vista ✅

- `src/features/projects/ui/ProjectsView.tsx` — muere `QUICK_START_NOTES` y su estado
  `quickStartNotes`; nace `quickStopMessage` y `handleQuickStop`; `patchSession()` parchea **en el sitio**
  el proyecto tocado (sin recargar la lista). El `time` recalculado que devuelve parar se usa.
- `handleSaved` **conserva `activeSession`** al reemplazar el proyecto editado: `PATCH /:id` no lo trae, y
  sin eso guardar el nombre apagaría en pantalla un cronómetro que sigue corriendo.
- `project-filters.ts` — `filterByName` se hace **genérico**: filtrar no transforma, y un retorno fijo
  recortaba `activeSession` justo antes de pintarlo.
- Tests: bloque nuevo de 10 en `ProjectsView.test.tsx` (estado que sobrevive al F5, dos cronómetros a la
  vez, parar con su endpoint, 409, tiempo tejido actualizado, axe).
- **Comprobación por mutación:** alargando el intervalo del reloj ×100000, **2 tests se ponen rojos**
  (el de la tarjeta y el de la vista). No son asertos incapaces de fallar.

### Pieza 5 — A: el alta de proyecto es UNA ✅

- `src/features/dashboard/ui/NewProjectDialog.tsx` — **BORRADO**.
- `src/features/dashboard/ui/dashboard-client.ts` — `createProject` **retirado** (queda un comentario que
  dice qué había y por qué se fue; el endpoint sigue llegando por `projects-client.ts`).
- `src/features/dashboard/ui/DashboardView.tsx` — monta `ProjectFormDialog` con
  `target={{mode:"create", type: newProjectType}}`. **Los dos botones y su preselección de tipo no
  cambian**: sólo cambia qué modal abren.
- `src/features/projects/ui/index.ts` — el barrel expone `ProjectFormDialog`, la copia del formulario
  (`FORM_FIELD_LABELS`, `CREATE_SUBMIT_LABEL`, `createFormTitle`…) y `PATTERNS_ENDPOINT`, para que quien lo
  monte desde otro feature importe los textos y pueda doblar su petición en tests.

**Nada de lo que `NewProjectDialog` tenía se perdió** (se comprobó línea a línea):

| Lo que tenía el viejo | Dónde está ahora |
|---|---|
| Validación con el **schema del endpoint** por **ruta interna** (el barrel arrastra Drizzle) | `ProjectFormDialog.tsx:18-21`, con el mismo comentario y el mismo motivo |
| **Foco al campo inválido** (deuda 38) | `reportIssues()` + `FOCUS_ORDER`, y además **en orden de pantalla** |
| `initialFocusRef` al primer campo | `ProjectFormDialog` lo hace igual |
| `<form noValidate method="post">` (deudas 39 y 43) | igual en el formulario nuevo |
| Error del servidor sin cerrar el modal | `ActionError` (`role="alert"`, montado sólo si hay mensaje) |
| `<Button loading={pending}>` | igual |
| Título por tipo (`Nuevo proyecto de …`) | `createFormTitle()`, **el mismo texto** |

**Tests migrados, no tirados** (`DashboardView.test.tsx`): los cinco de "creación rápida" siguen ahí, con
los textos **importados** en vez de escritos a mano. Lo único reescrito es lo que de verdad cambió: el
cuerpo del `POST`, que ahora lleva el formulario entero. **Y se añade el gate de la ficha 185**: el modal
del Dashboard ofrece los seis campos, no sólo el nombre.

### Pieza 6 — el cajón le cuenta a la lista qué pasó con el cronómetro ✅

**Esto no estaba en el encargo y hay que justificarlo.** El encargo dice *"el cajón de detalle no se
toca"*. Lo que se detectó al terminar B1: con el estado del cronómetro pintado en la tarjeta, **arrancar o
parar dentro del cajón y cerrarlo dejaba la tarjeta afirmando lo contrario** — literalmente la ficha 186
entrando por otra puerta, y un camino que cualquiera recorre probando esta misma feature.

**Se juzgó DENTRO de la valla** porque la valla es sobre lo que se ve: *"su cronómetro y su botón siguen
igual"*, y siguen exactamente igual — mismo reloj, mismo botón, mismo historial, mismo comportamiento. Lo
único que se añade es un aviso hacia arriba, **por el camino que ya existía** para el tiempo total
(`onTimeChange`, que está en ese mismo componente y por el mismo motivo).

- `SessionsTab.tsx` — nueva prop `onRunningChange`, llamada en `start()` (con la sesión que devuelve el
  servidor) y en `stop()` (con `null`). **No se llama si el servidor falló**: un 409 significa que no se
  paró nada.
- `ProjectDetailDrawer.tsx` — la pasa hacia arriba; **el cajón no la usa**.
- `ProjectsView.tsx` — la conecta a `patchSession(detailId, session)`.
- Tests: 3 en `SessionsTab.test.tsx` + 2 de integración en `ProjectsView.test.tsx` (arrancar/parar dentro
  del cajón, cerrar, mirar el botón de la tarjeta). **Comprobados por mutación**: quitando el puente, los
  2 de integración se ponen rojos.
- El doble de red de `ProjectsView.test.tsx` pasa a tener **memoria de sesiones** (arrancar deja una
  abierta que el historial devuelve): sin eso el tab pedía su historial tras arrancar y veía una lista
  vacía, que es un estado que el backend no puede producir (REGLA 7).

## Verificación

```
bash ./init.sh
[OK]    lint verde
[OK]    typecheck verde
 Test Files  98 passed | 3 skipped (101)
      Tests  1837 passed | 13 skipped (1850)
[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**EXIT 0.** Partía de **1792 passed | 13 skipped** → **+45 tests**.
`pnpm build` también verde: compila las 28 rutas, las nueve de proyectos incluidas.

### El fantasma del entorno, confirmado otra vez

La **primera** pasada de `init.sh` de esta sesión salió **roja en typecheck**, y **no era del código**:

```
.next/dev/types/validator.ts(244,8): error TS1005: ';' expected.
```

`rm -rf .next` y verde sin tocar una línea. Es la misma familia que el 404 con `text/html` en las subrutas
anidadas que describe la enmienda: **caché de Turbopack**.

## Lo que NO se pudo verificar

Se dice en vez de simularse con un aserto incapaz de fallar (fichas 160, 167, 174, 176 y las dos del review
de T2).

1. **NADA se miró en un navegador.** Esta sesión **no tiene herramientas de navegador** (ni Playwright ni
   MCP): sólo lectura/escritura de archivos y consola. Por lo tanto **no está verificado** el eje visible:
   cómo se ve el reloj junto al botón, si la fila de la tarjeta aguanta un nombre largo con el reloj al
   lado, el contraste real del color de acierto sobre la tarjeta, ni cómo se lee el botón lleno de acento
   cuando hay varias tarjetas corriendo. **REGLA 4 pendiente**, y es la que decide si esto está bien.
2. **"Mismo sitio, misma caja táctil"** (E7 b1) no es medible en `happy-dom`: no maqueta ni mide cajas. Lo
   más cerca que se llegó —y se llegó— es que **el nodo del DOM del botón es el mismo** al cambiar de
   estado (React lo reusa en su sitio) y que **sigue habiendo exactamente uno**. Que ocupe los mismos
   píxeles es verificación humana.
3. **El SQL real de `listActiveSessions` no se ejecutó contra Postgres.** Lo que se mide es el **SQL
   emitido** (proyección, `WHERE`, `ORDER BY`, ausencia de JOIN) con el interceptor que ya existía en
   `store.test.ts`. No hay base de datos de test en el repo.
4. **El endpoint no se probó de punta a punta contra Neon.** Hacerlo exige credenciales y escribe en los
   datos del usuario; el contrato se mide con el Route Handler real sobre el doble de datos.
5. **La lectura por lector de pantalla real** (VoiceOver/NVDA) no se probó: lo que se mide es el marcado
   —qué es `aria-hidden`, qué texto queda legible, y que **no hay ninguna región viva por tarjeta**—.

## Decisiones no obvias, en una lista

1. **`{id, start}` y no la sesión entera** en el payload de la lista, con test que cuenta las claves.
2. **Dos consultas y no un `LEFT JOIN`** para colgar el cronómetro de cada proyecto.
3. **Una prop objeto (`timer`) en `ProjectCard`** en vez de props sueltas, para que el estado *"corriendo
   sin forma de parar"* no sea representable.
4. **El intervalo vive en la tarjeta que corre**, no en la vista.
5. **Cero `aria-live` por tarjeta**: en una rejilla serían N metrónomos (E4 a llevada a su consecuencia).
6. **`filterByName` pasa a ser genérico**: filtrar no transforma, y un retorno fijo recortaba
   `activeSession` justo antes de pintarlo.
7. **El 409 al parar no borra el estado local**: si el servidor no paró nada, la tarjeta no puede decir
   que paró. Se anuncia el motivo y el botón se queda como estaba.
8. **`handleSaved` conserva `activeSession`** al reemplazar el proyecto editado.
9. **El puente del cajón** (pieza 6), justificado arriba.

## Fichas

- **185** y **186**: atendidas por este lote. **No se tachan acá**: las da por saldadas el reviewer.
- **187** y **188**: **abiertas** por este lote y escritas en `progress/deudas.md` con su escenario.

---

## Cierre del bloqueante B1 del review (sesión de seguimiento)

**Encargo:** el review `progress/reports/review_e7.md` §2 dejó **un solo bloqueante**: la garantía
*"`handleSaved` conserva `activeSession`"* estaba **declarada y bien implementada, pero sin ningún test
debajo** — forzar ese valor a `null` dejaba los 66 tests del archivo en verde.

**No se tocó una línea de producción.** El código era correcto; lo que faltaba era la red.

### El test añadido

- **Dónde:** `src/features/projects/ui/ProjectsView.test.tsx`, dentro del bloque
  `describe("ProjectsView — cronómetro en la tarjeta (E7 b)")` — el que ya tiene relojes falsos con la hora
  del sistema fijada en `NOW` y `openSession(...)`, que es lo que hace medible el reloj.
- **Cómo se llama:** `guardar una edición no apaga el cronómetro de la tarjeta`.
- **Qué recorre**, entero y como un usuario: lista con **`activeSession` abierta** (65 s) → tap en la
  tarjeta → cajón → **Editar** → se cambia el nombre a *"Bufanda corta"* → **Guardar cambios** → se espera
  al `PATCH` real → se **cierra el cajón** → se mira **la tarjeta**.
- **Qué exige:** que el botón siga siendo el de **parar** (`quickStopLabel`), que **no** haya reaparecido el
  de empezar (`quickStartLabel`), y que el reloj **siga pintando** `formatClock(65)`. El nombre del botón se
  comprueba con el **nombre editado**, así que el aserto no puede pasar mirando una tarjeta que no se
  actualizó: exige las dos cosas a la vez —el dato nuevo del parche **y** la sesión vieja conservada—.
- **Un detalle no obvio del test:** el cajón se cierra **por su botón `Cerrar`** y no con `Escape`. `Escape`
  viaja por el `keydown` del panel del `Dialog`, y justo después de que el modal de edición se desmonte el
  foco todavía no está dentro del cajón, así que la tecla no llegaba a ningún sitio (se comprobó: el cajón
  seguía abierto). Cerrar por el botón es además lo que hace un usuario con ratón o táctil.
  Se importa `DIALOG_CLOSE_LABEL` de `@/shared/ui` en vez de escribir "Cerrar" a mano.

### La comprobación por mutación, en las DOS direcciones

Es la única evidencia que vale, así que va con sus números:

| Paso | Estado de `ProjectsView.tsx:459` | md5 del archivo | Resultado de `pnpm vitest run src/features/projects/ui/ProjectsView.test.tsx` |
|---|---|---|---|
| 1. Antes | `? { ...saved, activeSession: entry.activeSession }` | `b2942595a245bb9d6c069315ca987521` | **67 passed (67)** — verde |
| 2. **Mutado** | `? { ...saved, activeSession: null }` | (mutado) | **1 failed \| 66 passed (67)** — **ROJO**, y el único rojo es el test nuevo |
| 3. Restaurado | `? { ...saved, activeSession: entry.activeSession }` | `b2942595a245bb9d6c069315ca987521` | **67 passed (67)** — verde |

El rojo del paso 2 es exactamente:

```
× guardar una edición no apaga el cronómetro de la tarjeta
FAIL src/features/projects/ui/ProjectsView.test.tsx > ProjectsView — cronómetro en la tarjeta (E7 b)
     > guardar una edición no apaga el cronómetro de la tarjeta
```

El **md5 del paso 3 coincide con el del paso 1**: el árbol quedó igual que antes de la mutación, sin
residuos.

### El camino hermano (el Dashboard): **NO aplica, y este es el motivo**

Se revisó, porque el Dashboard monta desde E7 (a) **el mismo `ProjectFormDialog`**. El agujero **no puede
existir ahí**, por tres razones independientes:

1. **Ahí sólo se crea, nunca se edita.** `DashboardView.tsx:368-379` monta el modal con
   `target={{ mode: "create", type: newProjectType }}`; no hay ninguna entrada a `mode: "edit"` en todo el
   feature del Dashboard. Sin edición no hay `PATCH`, y el defecto es de la respuesta del `PATCH`.
2. **Su `onSaved` recarga**, no parchea el estado en el sitio: `setNewProjectType(null); reload();`. La lista
   vuelve del servidor con su `activeSession` fresca, así que no hay nada local que perder. Ya está anclado
   por `DashboardView.test.tsx:831` — *"recarga la lista tras un alta confirmada"*.
3. **Las tarjetas del Dashboard no tienen cronómetro.** `ActiveProjectsPanel.tsx:119` monta
   `<ProjectCard project={project} />` **sin la prop `timer`**, y sin esa prop la tarjeta no monta ningún
   control ni ningún reloj (invariante de la deuda 132, anclada en `ProjectCard.test.tsx:228`). No hay
   estado de cronómetro que apagar.

Por eso **no se añade test ahí**: sería un aserto sobre un estado que esa pantalla no puede alcanzar
(REGLA 7). Si algún día el Dashboard estrena edición o cronómetro en sus tarjetas, este párrafo es la
advertencia de que ese camino hay que anclarlo.

### Verificación

```
bash ./init.sh
[OK]    lint verde
[OK]    typecheck verde
 Test Files  98 passed | 3 skipped (101)
      Tests  1838 passed | 13 skipped (1851)
[OK]    tests verdes
[OK]    Entorno listo. Puedes empezar a trabajar.
EXIT=0
```

**EXIT 0.** Se partía de **1837 passed | 13 skipped** → **+1 test**, que es exactamente el bloqueante y nada
más. No hizo falta borrar `.next` en esta pasada: lint y typecheck salieron verdes a la primera.

### Lo que sigue sin verificarse (y no lo arregla este cambio)

- **El eje visible sigue pendiente (REGLA 4).** Esta sesión tampoco tiene herramientas de navegador: sólo
  archivos y consola. Los diez puntos de §4 del review —el botón en el mismo sitio en los dos estados, la
  caja táctil real, el nombre largo con el reloj al lado, el contraste sobre la tarjeta, las dos cifras
  monoespaciadas, varias tarjetas corriendo, el modal de seis campos del Dashboard— **siguen sin medirse**.
  Este test no dice nada de cómo se ve nada: dice que el **estado** no se pierde al guardar.
- **Observación fuera de encargo, sin tocar:** `ProjectCard.test.tsx` arrastra nombres de test en **inglés**
  de la época de RFC-02 (líneas 55-287 y 640). No son de este lote —los bloques nuevos de E7 están en
  español— y no se tradujeron para no meter ruido en un cierre quirúrgico. Queda dicho por si se quiere
  fichar como deuda blanca.

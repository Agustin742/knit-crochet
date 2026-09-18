# Migración de referencias de proceso en `docs/`

**Fecha:** 2026-09-18
**Alcance:** sólo `docs/`. No se tocó `src/`, `openspec/`, `.claude/` ni nada fuera de `docs/`.

## Qué se hizo

El repositorio abandonó el arnés multi-agente propio y pasó al proceso **SDD**
(*Spec-Driven Development*) de gentle-ai. Los archivos `AGENTS.md`,
`CHECKPOINTS.md`, `init.sh`, `feature_list.json`, `progress/current.md`, el
`CLAUDE.md` de proyecto y `.claude/agents/{leader,implementer,reviewer}.md`
desaparecieron; `progress/` se movió bajo `docs/historial/`.

Este trabajo **re-apunta la fontanería de proceso** de la documentación. No
cambia sustancia de producto: criterios de aceptación, contratos de datos,
nombres de ruta, formas de endpoint, decisiones de diseño, historial de
enmiendas (E1, E2, E3, E4, E6, E7, E12, E13…) y numeración de RFC quedan
exactamente igual.

## Mapeo aplicado

| Referencia vieja | Referencia nueva |
|---|---|
| `bash ./init.sh` | `pnpm lint`, `pnpm typecheck`, `pnpm test` (+ `pnpm build` donde la frase ya lo pedía) |
| `feature_list.json` (cola de trabajo) | `docs/product/backlog-ui.md` |
| `feature_list.json` (estado en curso) | `openspec/changes/<cambio>/tasks.md` · `apply-progress.md` |
| `CHECKPOINTS.md` | `docs/harness/verification.md` (verificación) · `docs/harness/architecture.md` (capas) |
| `AGENTS.md` / `.claude/agents/` | `openspec/config.yaml` + `openspec/changes/<cambio>/` |
| `progress/current.md` | artefactos del cambio SDD activo |
| `progress/deudas.md` | `docs/historial/deuda-tecnica.md` |
| `progress/history.md` | `docs/historial/bitacora.md` |
| `progress/informs/` | `docs/historial/informes/` |
| `progress/reports/` | `docs/historial/reports/` |
| estados `pending`/`in_progress`/`done`/`blocked` | el backlog es una cola, no un registro de estado; el bloqueo se declara en la propia entrada (entrada 30, `stash-ui`) |

Los checkpoints de contabilidad del arnés viejo (que existan los archivos del
arnés, que haya exactamente una feature `in_progress`, que `current.md` esté
ordenado) **se eliminaron en vez de reubicarse**: ya no describen nada real.

---

## Cambios por archivo

### `docs/design/rfc/RFC-00-proceso.md` (11 referencias)

Es el índice de proceso, así que concentró el trabajo editorial.

| Sitio | Antes | Después y razón |
|---|---|---|
| Cabecera (blockquote) | «se construye esta fase con el arnés de agentes… cada slice de UI aterriza en `feature_list.json`» | «con el proceso SDD… aterriza en el backlog de UI (`docs/product/backlog-ui.md`)». También `features 1-11, todas \`done\`` → `features 1-11, ya entregadas`, porque `done` era un valor de estado de `feature_list.json`. |
| §1, título | «Entorno de agentes (cómo se construye esta fase)» | «Proceso de construcción (cómo se construye esta fase)». El título nombraba el arnés borrado. |
| §1, párrafo de entrada | «arnés multi-agente de Claude Code (líder → implementer → reviewer). Las reglas del arnés (ver `.claude/agents/` y `AGENTS.md`)» | Proceso SDD gobernado por `openspec/config.yaml`, con la lista de artefactos del cambio. **Reescritura no mecánica:** la frase entera existía para decir *dónde están escritas las reglas del proceso*; se conserva ese propósito apuntando a `openspec/config.yaml` y a la carpeta del cambio. |
| §1, viñeta «Una slice a la vez» | implementer se autoverifica con `bash ./init.sh`; reviewer aprueba contra `docs/harness/` y `CHECKPOINTS.md` | Fases *apply* (código + tests) y *verify* (contra spec/diseño/tareas + `docs/harness/verification.md` para verificación y `architecture.md` para capas). **Se preserva el requisito**: alguien distinto de quien escribe comprueba el trabajo antes de cerrar. |
| §1, viñeta de estado | «El estado real se rastrea en `feature_list.json` (`pending`/`in_progress`/`done`)… campo `rfc_ref`» | Separa las dos cosas que `feature_list.json` hacía a la vez: la **cola** es `docs/product/backlog-ui.md` y el **estado en curso** son `tasks.md`/`apply-progress.md`. El vínculo `rfc_ref` se conserva como «cada entrada del backlog apunta a la sección exacta de su RFC». |
| §1, viñeta de verificación | `bash ./init.sh` verde (`lint` + `typecheck` + `test`) + `pnpm build` OK | `pnpm lint`, `pnpm typecheck` y `pnpm test` en verde + `pnpm build` OK. El paréntesis ya nombraba los tres niveles, así que la traducción es exacta. Además `SDD §9` → `SDD-01 §9` con una cláusula de desambiguación: *Software Design Document*, no el proceso SDD. |
| §3, tabla de índice | «mapeo a `feature_list.json`» | «mapeo al backlog de UI». |
| §3, orden de implementación | «El orden fino se respeta por `id` en `feature_list.json`» | «por el `id` de la tabla del §4». La tabla del §4 sobrevive intacta, así que el orden sigue teniendo fuente. |
| §4, título | «Mapeo RFC → `feature_list.json` (la capa ejecutable)» | «Mapeo RFC → slices de UI (la capa ejecutable)». |
| §4, párrafo | «Cada slice de los RFC es una feature real en `feature_list.json`… con `rfc_ref`» | **Reescritura no mecánica:** la tabla del §4 mezcla ids ya entregados (12-21) con ids abiertos (22-30). El párrafo ahora dice explícitamente cuál es cuál y que sólo los abiertos están en el backlog, para que nadie busque la entrada 19 ahí. La tabla y la nota sobre #31 `auth_ui` quedan intactas. |
| §5 | «dos secciones fijas que conectan con el arnés»; «§ Slices de implementación (→ `feature_list.json`)»; `SDD §9` | «que conectan con el proceso»; «(→ backlog de UI)»; `SDD-01 §9`. `§ Adaptación al harness` **no se toca**: `docs/harness/` conserva su nombre. |
| §6 | «Una feature no sale de `pending` hasta que su RFC tenga resueltas las decisiones abiertas»; «El **líder** resuelve/eleva estos puntos antes de despachar la feature» | «Una entrada del backlog no se convierte en un cambio SDD hasta que…»; «Estos puntos se resuelven —o se elevan al usuario— antes de abrir el cambio SDD». **El rol `líder` ya no existe**, así que la acción se atribuye al proceso, no a un agente. Se añade una línea que conecta el pendiente de RFC-07 con la entrada 30 marcada como bloqueada en el backlog, que es donde vive ahora ese `blocked`. |

### `docs/design/rfc/RFC-01-shell.md` (15 referencias)

- Cabecera: `- **Proceso / arnés:**` → `- **Proceso:**`, y el paréntesis
  «(entorno de agentes, jerarquía de verdad, mapeo a `feature_list.json`)» →
  «(proceso SDD, jerarquía de verdad, mapeo al backlog de UI)».
- 10 rutas `progress/reports/…` → `docs/historial/reports/…` (D4, E7, E8/E10,
  E12, E13 y la nota del gate de la banda de cuenta). Cambio puramente de ruta;
  los archivos existen todos bajo el nombre nuevo.
- 2 rutas `progress/informs/…` → `docs/historial/informes/…`
  (`9.informe-deudas_21_17_13_04.md`, `25.informe-deudas_146_147_148.md`).
- E12, nota sobre §2: «misma política que se siguió en `feature_list.json` #31»
  → «…en la ficha de la feature #31». **No mecánico:** es un hecho histórico
  (qué se hizo en su día con la ficha #31), no una instrucción; se conserva el
  hecho sin apuntar al archivo borrado.
- §8, definición de done: `bash ./init.sh` verde → `pnpm lint`, `pnpm typecheck`
  y `pnpm test` en verde.
- §9: título «(→ `feature_list.json`)» → «(→ backlog de UI)»; «Cada slice es una
  implementación (implementer → reviewer)» → «Cada slice es un cambio SDD»; los
  IDs se remiten a la tabla de RFC-00 §4 y las entradas abiertas al backlog.

### `docs/design/rfc/RFC-02-dashboard.md` (7 referencias)

- Cabecera igual que RFC-01.
- E-de-la-deuda-13: «se propagó a `feature_list.json` #19» → «a la ficha de la
  feature #19». Hecho histórico, misma lógica que en RFC-01.
- «Verificado… contra `progress/deudas.md`» → `docs/historial/deuda-tecnica.md`.
- 2 rutas `progress/reports/` y 1 `progress/informs/` re-apuntadas.
- §8: título y párrafo de IDs, igual que RFC-01 §9.

### `docs/design/rfc/RFC-03-proyectos.md` (9 referencias)

- Cabecera igual que RFC-01.
- 5 rutas `progress/reports/…` re-apuntadas (E1, E2, E4(b), E6).
- E2: «`feature_list.json` **no se toca**; #20 sigue `done`» → «No abre una
  entrada nueva en el backlog de UI; **#20 sigue cerrada**». **No mecánico:** la
  frase afirmaba dos cosas —que la enmienda es deuda y no una feature nueva, y
  que #20 no se reabre—; ambas se conservan sin el vocabulario de estado.
- §8: título y párrafo de IDs.

### `docs/design/rfc/RFC-04-lanas.md`, `RFC-05-patrones.md`, `RFC-06-calculadoras.md`, `RFC-07-stash.md` (3 cada uno)

Los tres mismos sitios en cada archivo: la cabecera `**Proceso / arnés:**`, el
título de la sección §8 y el párrafo de IDs. RFC-06 y RFC-07 usan el singular
(«ID real…», «Slice de implementación»), respetado en la reescritura.

### `docs/harness/architecture.md` (1)

- «Qué NO hacer»: «Añadir una dependencia pesada sin justificarla en
  `feature_list.json`» → «…sin justificarla en el cambio SDD que la introduce
  (`openspec/changes/<cambio>/proposal.md` o `design.md`)». **La regla
  sobrevive**: sigue exigiendo justificación escrita; sólo cambia dónde se
  escribe. `proposal.md` y `design.md` son los artefactos donde
  `openspec/config.yaml` pide declarar enfoque y alternativas descartadas.

### `docs/harness/conventions.md` (1)

- Ruta del informe del guardrail de Tailwind:
  `progress/informs/6.informe-…` → `docs/historial/informes/6.informe-…`.

### `docs/harness/verification.md` (5) — reescritura real

La sección «Verificación final antes de cerrar» estaba construida entera
alrededor de `init.sh` y no sobrevivía a un buscar-y-reemplazar.

1. **Anti-patrón** «Marcar la feature como `done` sin pasar `bash ./init.sh`» →
   «Dar un trabajo por terminado sin la cadena de verificación completa en
   verde». El anti-patrón era «cerrar sin evidencia»; se conserva sin depender
   ni del script ni del estado `done`.
2. **Sección final:** el bloque con `bash ./init.sh # debe terminar con [OK]
   Entorno listo` se reemplaza por el bloque de cuatro comandos (`pnpm lint`,
   `pnpm typecheck`, `pnpm test`, `pnpm build`) en orden.
3. Se añade **por qué `pnpm build` está en la lista y `init.sh` no lo corría**:
   el App Router sólo detecta en compilación ciertos errores de frontera
   cliente/servidor. Esto no inventa requisito: `openspec/config.yaml` ya
   declara `verify.build_command: pnpm build`, y la definición de done de
   RFC-00 §1 y SDD-01 §9 ya exigía build verde para UI.
4. Se conecta la cadena con su fuente ejecutable: `verify.test_command`,
   `verify.build_command` y `verify.additional_gates` de `openspec/config.yaml`,
   más el listón adicional de SDD-01 §9 para UI, con la cláusula que aclara que
   ese «SDD» es *Software Design Document* y no el proceso.
5. «Anota el bloqueo en `progress/current.md` con estado `blocked` en
   `feature_list.json`» → «Anota el bloqueo en los artefactos del cambio activo
   (`tasks.md` y `apply-progress.md`)». **La obligación de registrar el bloqueo
   se conserva**, sólo cambia el soporte.
6. **Nota final obsoleta eliminada.** Decía que mientras no hubiera
   `package.json` los niveles se reportaban como `[WARN]`. El proyecto tiene
   `package.json` desde la feature 1 y el scaffold de Next.js existe, así que la
   nota describía un estado que ya no puede darse. En su lugar queda la regla de
   pnpm (nunca `npm`/`npx`), que sí sigue vigente.

### `docs/product/PRD-01-estructura-funcional.md` (4)

- **§0, título:** «Proceso de implementación (entorno de agentes)» → «Proceso de
  implementación».
- **§0, párrafo y dos primeras viñetas:** se reescriben al proceso SDD. La
  viñeta «Fuente de verdad → alcance ejecutable» conservaba un dato importante
  —que cada feature apuntaba de vuelta a la sección del PRD vía `prd_ref`—; se
  traduce a «la propuesta de cada cambio cita la sección exacta de este
  documento», que es lo que `openspec/config.yaml` exige en `rules.proposal`.
  La viñeta «Una feature a la vez» conserva sus dos exigencias: se escribe
  código **y tests**, y alguien verifica contra `docs/harness/` antes de cerrar.
- **§0, resto:** «Cómo construir» y «Qué construir» (donde el PRD gana al
  harness en alcance funcional) quedan **intactas**.
- **§12, nota del checklist:** «El estado real… se rastrea en `feature_list.json`
  (`pending`/`in_progress`/`done`)» → el estado histórico está en
  `docs/historial/` y el estado en curso en los artefactos del cambio SDD. La
  frase sobre los tests (`require_tests_to_close` era un campo del JSON) se
  conserva en sustancia: «los tests no son un entregable aparte, son parte de
  los criterios de aceptación de cada uno». Los 11 checkboxes de abajo **no se
  tocan**.

### `docs/historial/informes/README.md` — recontextualizado

Documentaba el protocolo de informe de cierre del rol `leader`, que ya no
existe. Según lo pedido, **el archivo y su plantilla se conservan**, marcados
como histórico:

- Título: «Informes de cierre (síntesis del leader)» → «Informes de cierre
  (archivo histórico)».
- Se antepone un aviso que dice sin rodeos: esto es el archivo del proceso
  anterior, el rol `leader` no existe, el trabajo nuevo se registra en
  `openspec/changes/<cambio>/`, y **no se escriben informes nuevos acá**.
- Las descripciones del protocolo pasan a pasado («escrito por el leader al
  cerrar», «cuándo se generaba») para que se lea como documentación de archivo y
  no como instrucción vigente.
- Rutas `progress/reports/` y `progress/informs/` → `docs/historial/…`, también
  dentro del bloque de ejemplo y de la plantilla.
- «independiente del id de `feature_list.json`» → «independiente del id de la
  feature»; la razón de la numeración secuencial (cubrir tareas que no son
  features) se conserva.
- En la plantilla, «Resultado de `bash ./init.sh` (nº de tests), `pnpm build`» →
  la cadena pnpm completa. La línea «Cadena de agentes: leader → … → reviewer»
  **se conserva**: es un campo de informes ya escritos y describe lo que de
  hecho pasó.

## Lo que NO se cambió, a propósito

- **`docs/product/backlog-ui.md` línea 4** menciona `feature_list.json`
  deliberadamente, para explicar a qué sustituye el backlog. Es la única
  mención que queda en `docs/` fuera de `docs/historial/reports/`, y es
  correcta: describe algo que dejó de existir, no apunta a ello como proceso.
- **`docs/historial/reports/**`** (los reports crudos de los subagentes) y los
  31 informes de `docs/historial/informes/`: son el registro de lo que pasó, con
  el vocabulario de su época. Reescribirlos falsearía el archivo.
- **`docs/harness/` conserva su nombre** y sus tres archivos, y la sección
  «§ Adaptación al harness» de cada RFC también.
- Ninguna enmienda (E1…E14), decisión (D1…D4), contrato de endpoint, criterio de
  aceptación ni numeración de RFC se tocó.

## Verificación

Búsqueda recursiva final de `init.sh`, `feature_list`, `CHECKPOINTS`,
`AGENTS.md` y `progress/` sobre `docs/design`, `docs/harness`, `docs/product` y
`docs/historial/informes/README.md`: **1 resultado**, la mención histórica
intencionada de `docs/product/backlog-ui.md:4`.

`git status` confirma que las modificaciones quedaron dentro de `docs/`.

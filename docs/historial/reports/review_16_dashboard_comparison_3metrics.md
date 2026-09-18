# Review — feature #16 `dashboard_comparison_3metrics`

**Veredicto:** APPROVED — **0 bloqueantes**

- **Agente:** reviewer. **Fecha:** 2026-08-05.
- **Alcance revisado:** backend puro. No se aplica el checklist visual del SDD §9 (no hay UI, ni RTL, ni
  axe): su ausencia **no** se penaliza.
- **Entradas:** `progress/reports/impl_16_dashboard_comparison_3metrics.md`, ficha #16 de
  `feature_list.json`, **PRD §8.1** (manda) + §9, RFC-02 §1/§3/§8, `docs/harness/*`, `CHECKPOINTS.md`,
  `git status` + `git diff` completo.

---

## 0. Resumen en una frase

La slice cumple las **cinco decisiones cerradas por el usuario**, las **tres** aceptaciones de la ficha y las
reglas 2 y 3 del arnés; **reproduje yo mismo, sin tocar el árbol de trabajo, los rojos declarados** de la
trampa de unidades (las dos direcciones), del ancla de semilla (añadir **y** quitar) y del invariante
lifetime de metros, y los nombres de test y los conteos **cuadran** con los del informe. Quedan **cuatro
observaciones no bloqueantes**, la primera de las cuales el implementer **no** fichó.

---

## 1. Verificación ejecutada por mí (no copiada del informe)

| Comprobación | Resultado |
|---|---|
| `bash ./init.sh` | **exit 0**. lint OK, typecheck OK, **Test Files 53 passed / 3 skipped (56)**, **Tests 577 passed / 13 skipped (590)** |
| Contra la baseline del leader (52/3 archivos, 547/13 tests) | **+1 archivo, +30 tests**, `skipped` idéntico |
| Los 3 smokes de `src/__smoke__/` | siguen **skipped** (3 archivos / 13 tests) y **compilan**: el typecheck está verde |
| `pnpm build` | **compila**; las 27 rutas se listan y `/api/dashboard/metrics` sigue dinámica |
| `pnpm vitest run src/features/dashboard src/app/api/dashboard src/shared/config` | **5 passed (5) / 53 passed (53)** — coincide con el "verde de partida" del informe |
| `git status` antes y después de mi revisión | **idéntico**: no toqué ni un archivo del repo |
| Dependencias nuevas | **ninguna** (`git diff package.json` vacío) |

**Método de las mutaciones, sin tocar producción.** Copié `comparison.ts` / `shared/config/index.ts` al
scratchpad, apliqué ahí la mutación y corrí Vitest con un **config alternativo** que redirige por `alias`
sólo ese módulo (`--config <scratch>/vitest.X.config.ts`). El árbol de trabajo del repo **nunca se modificó**
(verificado con `git status --porcelain` al terminar). Los tests que corrieron son los reales del repo.

---

## 2. Las 5 decisiones cerradas por el usuario — cumplimiento

| # | Decisión | Veredicto |
|---|---|---|
| 1 | `comparison` es un **mapa** `{ hours, projects, yarnMeters }`, la clave se conserva | OK — `types.ts:28-33` (`MetricComparisons`), `metrics.ts:45` |
| 2 | Cada entrada `{ label, referenceValue, times }`; `referenceMeters` desaparece | OK — `types.ts:16-22`. `grep -rn referenceMeters src/` da **cero** |
| 3 | `referenceValue` en la unidad de su métrica; `times` cociente puro | OK — `comparison.ts:31-49` (horas → segundos vía `SECONDS_PER_HOUR`; proyectos y metros ya en su unidad) |
| 4 | Las tres listas en `src/shared/config`, fijas y editables, cero hardcode en el servicio | OK — `src/shared/config/index.ts:38-58`; el servicio sólo hace `map` sobre ellas |
| 5 | Semillas exactas del PRD §8.1; `YARN_COMPARISONS` intacta | OK — ver §2.1 |

### 2.1 Contraste etiqueta por etiqueta contra el PRD §8.1 (acentos incluidos)

Horas (`src/shared/config/index.ts:39-46`) — **6/6 exactas**:
"Un partido de fútbol" 1,5 · "Un vuelo a Bariloche" 2,3 · "El Señor de los Anillos (extendida)" 11,4 ·
"Un vuelo a Madrid" 12,5 · "Una semana laboral" 45 · "Un mes de trabajo" 180.

Proyectos (`src/shared/config/index.ts:50-56`) — **5/5 exactas**:
"Un par" 2 · "Un equipo de fútbol" 11 · "Una docena" 12 · "Un aula" 30 · "Un colectivo lleno" 60.

`YARN_COMPARISONS`: el `git diff` de `src/shared/config/index.ts` **no muestra ni una línea** dentro de ese
bloque — ni valores ni el nombre del campo `meters`. Cumple "metros no se toca".

Extra verificado: `1.5*3600`, `2.3*3600`, `11.4*3600`, `12.5*3600`, `45*3600`, `180*3600` dan **enteros
exactos** en JS (5400, 8280, 41040, 45000, 162000, 648000). No viaja basura de coma flotante en el payload.

---

## 3. La trampa de unidades — **verificada empíricamente, cae en rojo**

Éste era el riesgo nº1 y la parte que el encargo pedía no dar por buena. **No basta con que el test exista y
esté verde; comprobé que cae.**

**Mutación A — quitar la conversión** (`value: reference.hours` en `comparison.ts:34`):

```
FAIL comparison-service.test.ts > hours: metric in SECONDS vs reference list in HOURS
     > exposes the reference list already converted to seconds
FAIL comparison-service.test.ts > ... > matches a seconds metric with its own reference in seconds
     AssertionError: expected 'Un mes de trabajo' to be 'Un vuelo a Bariloche'
FAIL metrics-service.test.ts > getDashboardMetrics · comparison map (PRD §8.1)
     > compares hours in SECONDS, not in the hours of the config list
     AssertionError: expected 180 to be 648000
 Test Files  2 failed | 3 passed (5)
      Tests  3 failed | 50 passed (53)
```

**Mutación B — el cruce espejo** (convertir la MÉTRICA a horas, `metrics.hours / SECONDS_PER_HOUR`):

```
FAIL metrics-service.test.ts > ... > returns one comparison per metric, each in its own unit
FAIL metrics-service.test.ts > ... > compares hours in SECONDS, not in the hours of the config list
FAIL metrics-service.test.ts > ... > moves the hours/projects comparisons with year and type, but never the yarn one
FAIL dashboard-routes.test.ts > ... > returns the metrics contract for the requested year and type
 Test Files  2 failed | 3 passed (5)
      Tests  4 failed | 49 passed (53)
```

**Los nombres de los tests que caen son exactamente los declarados en §4 A1/A2 del informe** (3 y 4
respectivamente). La diferencia de totales (yo 53, el informe 39) es sólo el conjunto de archivos corrido:
ver NB-2.

**Por qué el test de hoy sí distingue las unidades** (lo confirmo también sobre el código, no sólo por la
corrida): los dos anclajes derivan de la lista **sin convertir**, no de la ya convertida.

- `comparison-service.test.ts:136-148` compara `HOURS_REFERENCES` contra `HOURS_COMPARISONS.hours *
  SECONDS_PER_HOUR` **y además** asserta `not.toEqual` contra las horas crudas. Es la mitad que impide que el
  test sea invariante a la unidad.
- `metrics-service.test.ts:230-238` reconstruye la referencia mayor **en segundos** desde
  `HOURS_COMPARISONS × SECONDS_PER_HOUR`, con el comentario explicando por qué NO deriva de
  `HOURS_REFERENCES`.
- `comparison-service.test.ts:164-177` ("would pick a different reference if the units were crossed") es un
  **meta-test**: verifica que la semilla es capaz de distinguir las dos unidades, o sea, protege al ancla de
  convertirse en tautología si la lista cambiara.

**El hallazgo autoinculpatorio del informe (D6 / §4.A1) es cierto y está bien resuelto.** Un test de servicio
que derive de `HOURS_REFERENCES` se mueve con el bug y pasa en falso; el de hoy no. Reproducido.

---

## 4. Regla 2 del arnés — **las dos piezas**

**(a) Ancla al literal del PRD.** SÍ, y para las **tres** listas, en el mismo sitio y con el mismo patrón que
la de metros: `src/shared/config/index.test.ts` (`HOURS_COMPARISONS` :58-81, `PROJECTS_COMPARISONS` :83-111,
`SECONDS_PER_HOUR` :113-117). Es un `toEqual` sobre el mapa `label -> valor` **más** un `toHaveLength`
derivado del mismo literal (que tapa el hueco del mapa: etiqueta duplicada con el mismo valor).
`SECONDS_PER_HOUR` se ancla contra `60 * 60`, no contra sí mismo. De paso se añadió el ancla de longitud
**también a `YARN_COMPARISONS`**, que antes no la tenía: mejora colateral.

**(b) Los tests de comportamiento derivan.** SÍ. Revisado archivo por archivo:

- `comparison-service.test.ts`: cero literales de semilla; los casos se construyen con `at(references, n)`
  sobre la lista ordenada.
- `metrics-service.test.ts`: `edges()` deriva menor/mayor de cada lista; el caso de horas deriva de
  `HOURS_COMPARISONS × SECONDS_PER_HOUR`. Los únicos números a mano (`usedQuantity: 2, length: 350`) **no son
  de semilla** y las aserciones sobre ellos son relacionales (`toEqual` entre llamadas, `toBeGreaterThan(0)`).
- `dashboard-routes.test.ts`: `smallest()` deriva de las tres listas; el `toEqual` del mapa usa
  `label`/`value` derivados. Lo único literal son **las tres claves del mapa**, que **son** el contrato de §9:
  correcto que estén escritas.

Verificado empíricamente que ninguna de las dos piezas está de adorno: al **añadir** una referencia de horas
en config, y al **quitarla**, cae **el ancla y sólo el ancla**, sin moverse ni un test de comportamiento —
que es exactamente lo que la regla 2 persigue.

---

## 5. Regla 3 — condición doble, **con la dirección de "sobra" incluida**

Los 5 gates declarados existen y son ejecutables. Reproduje 4 de forma independiente:

| Gate | Declarado en el informe | Mi reproducción |
|---|---|---|
| A1 unidades (sin conversión) | 3 rojos | **3 rojos, mismos nombres** |
| A2 unidades (cruce espejo) | 4 rojos | **4 rojos, mismos nombres** |
| B1 semilla **AÑADIR** horas | 1 rojo (1 failed / 52 passed) | **1 failed / 52 passed (53)**, mismo test |
| B2 semilla **QUITAR** horas | 1 rojo (1 failed / 52 passed) | **1 failed / 52 passed (53)**, mismo test |
| E1 metros alimentado por métrica filtrada | 3 rojos | **3 rojos, mismos nombres** |
| C no-hardcode | 2 rojos + 1 espontáneo | **no reproducido**: el guardrail lee el fichero real por `import.meta.url`, así que la técnica de alias no lo alcanza sin escribir en el repo. Verificado **por lectura** (`comparison-service.test.ts:209-237`): lee el fuente y asserta `includes(label) === false`, regex de valor y regex del puente. Cae si se reescribe la semilla en el servicio. |
| D cableado del mapa | 3 rojos | **no reproducido tal cual**; E1 es la misma clase de cruce y cae igual |

**La dirección que un `toContain` no ve (añadir un elemento) está cubierta y la comprobé.** El ancla es
`toEqual` sobre un mapa + longitud, no `toContain`: B1 (añadir) y B2 (quitar) fallan **ambas**, con el mismo
test. Es lo que la regla 3 pide para un ancla de pertenencia.

**Los números declarados cuadran con los reales.** No hay ningún "9 rojos donde salían 12" (el precedente de
#31). Única imprecisión, documental y menor: NB-2.

---

## 6. Aceptación de la ficha

| Aceptación | Veredicto | Dónde |
|---|---|---|
| 1. El endpoint devuelve `comparison` para las 3 métricas | CUMPLE | `dashboard-routes.test.ts:94-146`: `toEqual` sobre el **mapa completo**, tres entradas con `label`/`referenceValue`/`times`. Reforzado, no debilitado: antes se asertaban 2 campos de una comparativa suelta |
| 2. Listas de las 3 en `shared/config`, sin hardcode en el servicio | CUMPLE (con NB-1) | `shared/config/index.test.ts` (3 anclas) + guardrail de fuente `comparison-service.test.ts:186-238` |
| 3. Tests de selección **por cada métrica** y **por año/tipo** | CUMPLE, **completo, con el contraste que importa** | ver abajo |

**Punto 3 — el contraste `yarnMeters` lifetime vs `hours`/`projects` filtradas: SÍ existe y es el bueno.**
`metrics-service.test.ts:270-355` ("moves the hours/projects comparisons with year and type, but never the
yarn one") hace **tres** llamadas —2026 sin tipo, 2026 `knitting`, 2025 vacío— y asserta las **dos** mitades:

- las comparativas de **horas y proyectos cambian de etiqueta** entre 2026-todo y 2026-knitting
  (`hours.largest.label` -> `hours.smallest.label`; ídem proyectos), y en 2025 caen a la referencia menor con
  `times: 0`;
- `comparison.yarnMeters` sale **idéntica** (`toEqual`) en las tres, con `times > 0` para que la igualdad no
  sea trivial.

No es cosmético: mi mutación C (alimentar la comparativa de metros con una métrica **sí** filtrada) tira ese
test en rojo. El punto 3 **no** está a medias.

**Criterio de selección — se conservó para las tres.** `describe.each` sobre las tres listas
(`comparison-service.test.ts:56-114`), 5 casos × 3 métricas: mayor referencia que cabe (`times >= 1`) ·
ajuste exacto (`times = 1`) · **nada cabe -> la menor con `times < 1`** · **valor 0 -> la menor con
`times = 0` exacto** (`toBe(0)`, no `toBeCloseTo`) · independencia del orden en que se escriba la lista. El
`throw` de lista vacía sobrevivió y tiene test propio (`comparison-service.test.ts:116-120`).

**Generalización a `pickComparison(metric, references)`:** comparé el cuerpo viejo y el nuevo línea a línea.
El algoritmo es **idéntico** —copia defensiva, `sort` ascendente, guarda de lista vacía,
`filter(value <= metric)`, `at(-1) ?? smallest`, `times = metric / chosen.value`—; sólo cambian el nombre del
campo y el texto del error (que deja de decir "de lana" porque la función ya no sabe qué compara, D1
justificado). **No se perdió ningún matiz.**

---

## 7. Regresión de los consumidores: **adaptados, no debilitados**

- `metrics-service.test.ts`: se retiró el `describe("pickComparison (PRD §8 selection)")` de 4 tests. Los 4
  comportamientos **reaparecen y se multiplican**: "mayor que cabe", "cae a la menor" y "times = 0" pasan a
  `comparison-service.test.ts` ejecutándose **×3 métricas**, y "se ve a través de `getDashboardMetrics`" pasa
  a "returns one comparison per metric". Los describes de `hours`, `projects` y `yarnMeters` (incluidos el
  scoping por `userId` con filas de `user-2` y el `usedQuantity × length` = 400) **siguen intactos**. Neto:
  10 tests en el archivo, sin cobertura perdida.
- `dashboard-routes.test.ts`: los 4 casos siguen ahí (401 sin sesión, contrato, query vacía = sin filtro, 400
  inválido). El caso del contrato pasó de 2 asserts sobre una comparativa suelta a un `toEqual` del mapa
  completo: **más fuerte**. Matiz menor: al pasar de `usedQuantity: 2, length: 350` a `usedQuantity: 1,
  length: 12`, el producto deja de ejercitarse **en el test de ruta** — pero está cubierto en el servicio
  (`metrics-service.test.ts:139-149`, 3×100 + 2×50 = 400), que es su sitio. No es pérdida.
- **Ningún otro consumidor:** `grep -rn "comparison" src` da 7 archivos, todos del propio feature o sus
  tests; `referenceMeters` da **cero**. El breaking de §8.1 no deja huérfanos.

---

## 8. Arquitectura y convenciones

- **Lógica en `features/dashboard/api/`**: todo el cambio vive en `comparison.ts` + `metrics.ts`.
- **Route Handler fino y sin tocar**: `route.ts` no aparece en el diff; sigue leyendo query, validando con
  `metricsFiltersSchema` (zod), delegando en `getDashboardMetrics` y serializando. Que el cambio de forma no
  lo rozara es la mejor prueba de que la capa estaba bien puesta.
- **Scoping por `userId`**: `withSession` sigue inyectando el `userId` del JWT y el servicio lo propaga a las
  tres consultas; los tests mantienen filas de `user-2` que no deben contarse.
- **Feature-first y `shared/config` para comparativas**: es literalmente lo que pide `conventions.md`.
- **Tipos**: sin `any`; `Comparison`, `MetricComparisons`, `ComparisonReference` en PascalCase; constantes en
  UPPER_SNAKE; comillas dobles; código en inglés y prosa en español.
- **Comentarios**: abundantes pero todos explican un *por qué* no obvio (la trampa de unidades, por qué un
  test no deriva de la lista convertida). Es el caso que la convención permite.
- **Higiene**: sin temporales, sin artefactos, sin `console.log` nuevo (los que hay son de los smokes de la
  deuda 59, preexistentes), sin TODOs sin contexto, **sin dependencias nuevas**.
- **Trabajo ajeno (deuda 59) intacto**: `src/__smoke__/` y las 2 líneas de `src/shared/lib/cloudinary/`
  aparecen en el diff pero **no** los tocó esta feature; los 3 smokes siguen skipped y compilando.
  `feature_list.json` sigue con #16 en `in_progress` (el implementer no lo tocó) y `progress/deudas.md` llega
  hasta la 65: las deudas 66-70 quedan **propuestas**, no asentadas. Correcto.

---

## 9. Checkpoints

- **C1:** [x] Arnés completo; `bash ./init.sh` **exit 0** (ejecutado por mí).
- **C2:** [x] Una sola feature `in_progress` (#16); las `done` tienen tests verdes; `progress/current.md`
  describe la sesión activa sin basura de sesiones anteriores.
- **C3:** [x] Capas respetadas (lógica en `features/dashboard/api`, Route Handler fino con zod, scoping por
  `userId`, la UI no toca DB, no hay UI); estructura feature-first; **sin dependencias nuevas**; sin
  `console.log` de debug ni TODOs sin contexto; sin secretos.
- **C4:** [x] Cada módulo con lógica no trivial tiene test; lint y typecheck verdes; **577 passed / 13
  skipped**, todo verde.
- **C5:** [x] Sin archivos sospechosos (los sin trackear son informes/reports y el test nuevo, más lo de la
  deuda 59); `progress/history.md` tiene entrada por la última sesión cerrada; #16 sigue en `in_progress`, su
  estado correcto **hasta que el leader la cierre** (el volcado a `history.md` y el paso a `done` son del
  cierre, no de esta review).

---

## 10. Observaciones **no bloqueantes** (para el leader; ninguna impide aprobar)

**NB-1 — El guardrail de no-hardcode es un guardrail de LISTA FIJA: cuarta aparición del patrón de las deudas
40 y 43, y el implementer no lo fichó.**
`comparison-service.test.ts:187` declara `SERVICE_FILES = ["./comparison.ts", "./metrics.ts"]`. Es un clon
estructural de `src/shared/ui/primitives/no-hardcode.test.ts:17-35` (lista fija + `readFileSync` por
`import.meta.url` + regex), que es **exactamente** lo que la deuda 43 ficha como patrón recurrente y lo que la
40 propone sustituir por un **barrido por recorrido de directorios**, como hace
`canonical-tailwind-classes.test.ts` "para que un archivo nuevo quede cubierto solo".
**Escenario de fallo concreto:** #19 (o cualquier slice futura) añade
`src/features/dashboard/api/comparison-labels.ts` con las etiquetas escritas a mano, o cuela una etiqueta en
`store.ts`; el guardrail **no lo mira**, la aceptación #2 queda incumplida en el código y los 577 tests siguen
verdes. Aquí es un punto peor que en la 43: allí la lista fija cubría el **100%** de los archivos existentes
de su clase; aquí **no** cubre `store.ts`, `index.ts` ni `testing/in-memory-store.ts`, que ya existen en la
misma capa de servicio. Hoy ninguno guarda datos de referencia (lo verifiqué), así que **no hay nada
abierto**, pero la clase está sin proteger.
**Medicina:** recorrer `src/features/dashboard/**` en vez de nombrar dos archivos. **Se tapa junto con las 40
y 43: es la misma medicina.** La deuda **67** que propone el implementer describe otra cosa (que el escaneo no
distingue comentario de código); **esto hay que ficharlo aparte.**

**NB-2 — El preámbulo de §4 del informe no describe bien las corridas de los gates A, D y E.**
Dice que "todas las corridas son sobre `src/shared/config`, `src/features/dashboard` y
`src/app/api/dashboard`", pero ese conjunto son **5 archivos / 53 tests** (como confirman el "verde de
partida" del propio informe y mi corrida), mientras las salidas pegadas de A1/A2/D1/E1 dicen **3 archivos /
39 tests**: ésas se corrieron con tres rutas de archivo explícitas. **Los rojos son verdaderos** (reproduje
sus nombres y sus conteos uno a uno), así que no es un número inflado como el de #31; es una descripción
imprecisa del comando. Anotado porque la regla 3 pide la salida real **y** saber sobre qué se obtuvo.

**NB-3 — El test de la ruta importa por camino interno pudiendo hacerlo por el barrel.**
`dashboard-routes.test.ts:4-9` importa de `@/features/dashboard/api/comparison`, cuando `@/features/dashboard`
ya reexporta esos símbolos. `conventions.md` pide consumir un feature ajeno por su `index.ts`. Es una
desviación **preexistente** en ese mismo archivo (ya importaba `api/store` y `api/testing/in-memory-store`,
este último obligatorio porque el barrel no lo expone), así que es coherencia local y no una regresión. Nit
de estilo.

**NB-4 — Deudas propuestas 66-70: las cinco están bien vistas y las suscribo.** Destaco la **66** (el payload
no marca que `comparison.yarnMeters` es lifetime: el usuario cambiará el año, verá moverse dos comparativas y
quedarse una, y nada en el dato lo explica) y la **69** (`times < 1` no tiene decidido redondeo, plural ni
texto para el caso vacío) porque **las dos las va a chocar #19**, y conviene cerrarlas **antes** de escribir
esa UI, no durante.

---

## 11. Cambios requeridos

**Ninguno.** Se aprueba tal cual. NB-1 a NB-4 son fichas de deuda para el leader, no correcciones a esta
slice.

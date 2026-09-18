# impl — feature #16 `dashboard_comparison_3metrics`

- **Agente:** implementer. **Fecha:** 2026-08-05.
- **Alcance:** backend puro (no aplica el checklist visual del SDD §9: no hay UI, ni RTL, ni axe).
- **Fuentes:** PRD §8 + **§8.1** (manda) + §9 · RFC-02 §1/§3/§8 · `docs/harness/{architecture,conventions,verification}.md`.
- **Estado:** implementado y verde. **NO** he tocado `feature_list.json` (sigue `in_progress`) ni `progress/deudas.md`.

---

## 1. Qué se construyó y dónde

### Archivos modificados

| Archivo | Qué cambió |
|---|---|
| `src/shared/config/index.ts` | **+`SECONDS_PER_HOUR`**, **+`HOURS_COMPARISONS`** (6 refs, **en horas**) y **+`PROJECTS_COMPARISONS`** (5 refs, en unidades), con sus tipos `HoursComparison` / `ProjectsComparison`. `YARN_COMPARISONS` **no se tocó** (ni valores ni el nombre del campo `meters`). |
| `src/shared/config/index.test.ts` | **Anclas de semilla** de las dos listas nuevas + de `SECONDS_PER_HOUR`, con el mismo patrón que la de metros (mapa `label → valor` con `toEqual`, invariante de orden ascendente) y **una comprobación de longitud** añadida a las tres. También un invariante nuevo: las referencias de proyectos son enteras. |
| `src/features/dashboard/types.ts` | `Comparison` pasa a `{ label, referenceValue, times }` (**breaking a propósito**, PRD §8.1). Nuevo `MetricComparisons = { hours, projects, yarnMeters }`. `DashboardMetrics.comparison` pasa de `Comparison` a `MetricComparisons`. |
| `src/features/dashboard/api/comparison.ts` | `pickComparison(metric, references)` **una sola función parametrizada**; tres listas de referencia normalizadas y exportadas (`HOURS_REFERENCES` **en segundos**, `PROJECTS_REFERENCES`, `YARN_METERS_REFERENCES`); nuevo `pickMetricComparisons()` que arma el mapa. Tipo público nuevo `ComparisonReference`. |
| `src/features/dashboard/api/metrics.ts` | `comparison: pickMetricComparisons({ hours, projects, yarnMeters })`. Docstring actualizado (la comparativa de metros tampoco se mueve con los filtros). |
| `src/features/dashboard/api/metrics-service.test.ts` | Se retiró el bloque `pickComparison` (se movió y amplió al archivo nuevo) y se añadió `getDashboardMetrics · comparison map`: mapa completo por métrica, **trampa de unidades a nivel de servicio** y **contraste año/tipo**. |
| `src/app/api/dashboard/metrics/dashboard-routes.test.ts` | El contrato del endpoint ahora asserta el **mapa completo** (`toEqual` sobre las tres entradas), con los valores **derivados** de `shared/config`. |

### Archivo creado

- `src/features/dashboard/api/comparison-service.test.ts` — 25 tests: la regla de selección **parametrizada por métrica** (`describe.each` sobre las tres listas), el camino de error (lista vacía), la **trampa de unidades** y el **guardrail de no-hardcode** sobre el fuente del servicio.

### Lo que NO cambió

- `src/app/api/dashboard/metrics/route.ts` — el Route Handler sigue fino (valida con zod y delega); el cambio de forma viaja solo. Es la señal de que la capa estaba bien puesta.
- `src/features/dashboard/api/store.ts` y el doble en memoria: la feature no toca datos.
- `YARN_COMPARISONS`: intacta (PRD §8.1, "metros no se toca").

---

## 2. Decisiones tomadas (y por qué)

**D1 — Una sola `pickComparison` parametrizada por lista, no tres funciones.**
El criterio de §8/§8.1 es literalmente el mismo para las tres métricas ("la mayor referencia que cabe; si
ninguna cabe, la menor"). Tres copias serían tres sitios donde arreglar el mismo borde (el `0`, el empate,
la lista vacía) y, sobre todo, tres sitios donde **una podría desviarse en silencio**. La firma pasó de
`pickComparison(yarnMeters)` a `pickComparison(metric, references)`. El coste de la generalización es que
la función ya no sabe *qué* métrica compara: por eso el mensaje de error dejó de decir "de lana".

**D2 — Las listas se normalizan a `{ label, value }` en la capa de servicio, y cada lista de config conserva
un campo nombrado por su unidad** (`hours`, `projects`, `meters`).
Las dos opciones eran: (a) unificar el campo en config (`value` en las tres) o (b) traducir en el servicio.
Elegí (b) por dos razones. La primera es que §8.1 dice "metros **no se toca**" y renombrar `meters → value`
lo habría tocado. La segunda es más importante: **el nombre del campo es donde se lee la unidad**.
`{ label: "Un vuelo a Madrid", hours: 12.5 }` se autoexplica al humano que edite la lista; `value: 12.5`
no dice si son horas o segundos, que es exactamente la ambigüedad que muerde en esta feature. La traducción
vive en tres `map` de tres líneas en `comparison.ts`, y es **ahí** donde ocurre la conversión de unidad,
en un solo sitio y con nombre.

**D3 — `Comparison` se mantiene como el tipo de UNA entrada; el mapa es un tipo nuevo, `MetricComparisons`.**
La UI de #19 va a querer nombrar una comparativa suelta (la de la métrica que esté mostrando). Reciclar
`Comparison` para el mapa habría dejado sin nombre al elemento. Las claves del mapa son **exactamente** las
de las métricas (`hours` / `projects` / `yarnMeters`) para que la UI pueda indexar por la métrica activa
sin traducción. *(Limitación conocida: hoy nada obliga por tipos a que una 4ª métrica traiga su comparativa
— ver deuda propuesta 68.)*

**D4 — Lista vacía sigue **lanzando** (comportamiento heredado, no lo cambié).**
Una lista de comparativas vacía no es un caso de usuario: es un error de configuración del propio repo, y
las listas son constantes del código (no datos de la DB). Devolver `null` obligaría a toda la cadena
—servicio, endpoint, UI— a tratar un caso que no puede ocurrir sin que alguien vacíe un `const` a mano.
Lanzar convierte ese error en ruidoso e inmediato. Está cubierto por un test explícito
(`throws when the configured list is empty`).

**D5 — El puente de unidades es una constante en `shared/config`, no un `3600` en el servicio.**
`SECONDS_PER_HOUR` vive junto a las listas porque es parte del contrato de la lista de horas (la lista se
escribe en horas *porque* existe el puente). El guardrail comprueba que la cifra **no aparezca escrita en la
capa de servicio, ni siquiera en un comentario** (ver §4, gate C: el guardrail cazó mi propio docstring en
la primera pasada y reescribí el comentario para nombrar la constante).

**D6 — La trampa de unidades se ancla en DOS niveles, y el de servicio NO deriva de `HOURS_REFERENCES`.**
Esto lo descubrí ejecutando el gate, no razonándolo: mi primera versión del test de servicio derivaba de
`HOURS_REFERENCES` y por eso era **invariante a la unidad** (al romper la conversión, la lista se movía con
el bug y el test seguía verde — ver el rojo parcial en §4.A1). El test de servicio ahora deriva de
`HOURS_COMPARISONS × SECONDS_PER_HOUR`, que es lo que el contrato de §8.1 exige de verdad. Es el mismo
patrón de la regla 2 llevado a las unidades: **derivar de la constante equivocada anula el gate**.

**D7 — El guardrail de no-hardcode se mide sobre el fuente real de `comparison.ts` y `metrics.ts`**
(etiquetas de semilla, valores de semilla —en su unidad y convertidos— y el número del puente). Es la
lectura ejecutable de la aceptación #2, que si no queda como una afirmación de informe.

---

## 3. Cobertura de la aceptación de la ficha

| Aceptación | Dónde se demuestra |
|---|---|
| 1. El endpoint devuelve `comparison` para las 3 métricas | `dashboard-routes.test.ts` → "returns the metrics contract…": `toEqual` sobre el mapa completo (las tres entradas con `label`/`referenceValue`/`times`). |
| 2. Listas de las 3 en `shared/config`, sin hardcode en el servicio | `shared/config/index.test.ts` (3 anclas de semilla + orden) y `comparison-service.test.ts` → "the dashboard service holds no reference data of its own" (escaneo del fuente). |
| 3. Tests de selección **por cada métrica** y **por año/tipo** | `comparison-service.test.ts` → `describe.each` con las tres listas (5 casos × 3 métricas). Año/tipo: `metrics-service.test.ts` → "moves the hours/projects comparisons with year and type, but never the yarn one". |

Sobre el punto 3 y `yarnMeters`: el test de año/tipo hace **tres** llamadas (2026 sin tipo, 2026 `knitting`,
2025 vacío) y comprueba que las comparativas de horas y proyectos **cambian de etiqueta** entre ellas
mientras `comparison.yarnMeters` sale **idéntica** (`toEqual`) en las tres — que es el contraste que pide
el PRD §11.2 (metros es lifetime). Los datos se construyen para que los totales caigan **exactamente** sobre
una referencia (knitting = la referencia menor, knitting+crochet = la mayor), así que la etiqueta esperada
se deriva de la lista **sin reimplementar el criterio de selección en el test**.

---

## 4. Condición doble de cada gate nuevo (regla 3) — salidas reales

> Todas las corridas son `pnpm vitest run <rutas>` sobre `src/shared/config`, `src/features/dashboard` y
> `src/app/api/dashboard`. Los números son los que salieron, sin redondear ni interpretar.

### Verde de partida (arreglo puesto)

```
 Test Files  5 passed (5)
      Tests  53 passed (53)
```

### Gate A — trampa de unidades (horas en segundos vs lista en horas)

**A1 · rojo — quitar la conversión** (`value: reference.hours` en vez de `reference.hours * SECONDS_PER_HOUR`):

```
 FAIL  src/features/dashboard/api/comparison-service.test.ts > hours: metric in SECONDS vs reference list in HOURS > exposes the reference list already converted to seconds
AssertionError: expected [ 1.5, 2.3, 11.4, 12.5, 45, 180 ] to deeply equal [ 5400, 8280, 41040, 45000, …(2) ]
 FAIL  src/features/dashboard/api/comparison-service.test.ts > hours: metric in SECONDS vs reference list in HOURS > matches a seconds metric with its own reference in seconds
AssertionError: expected 'Un mes de trabajo' to be 'Un vuelo a Bariloche' // Object.is equality
 FAIL  src/features/dashboard/api/metrics-service.test.ts > getDashboardMetrics · comparison map (PRD §8.1) > compares hours in SECONDS, not in the hours of the config list
AssertionError: expected 180 to be 648000 // Object.is equality
 Test Files  2 failed | 1 passed (3)
      Tests  3 failed | 36 passed (39)
```

> ⚠️ **Hallazgo del propio gate, honesto:** la **primera** corrida de A1 dio **2 rojos en 1 archivo**
> (`Tests 2 failed | 37 passed`), todos en `comparison-service`. El test de servicio pasaba en falso porque
> derivaba de `HOURS_REFERENCES`, la lista ya convertida, que se movía junto con el bug. Reescribí ese test
> para derivar de `HOURS_COMPARISONS × SECONDS_PER_HOUR` (decisión D6) y **entonces** salieron los 3 rojos
> de arriba, ya con el servicio incluido. El gate se compró con la corrida, no con el razonamiento.

**A2 · rojo — el cruce espejo** (convertir la MÉTRICA a horas en vez de la lista a segundos:
`pickComparison(metrics.hours / SECONDS_PER_HOUR, HOURS_REFERENCES)`):

```
 FAIL  src/features/dashboard/api/metrics-service.test.ts > … > returns one comparison per metric, each in its own unit
AssertionError: expected { label: 'Un partido de fútbol', …(2) } to deeply equal { label: 'Un mes de trabajo', …(2) }
 FAIL  src/features/dashboard/api/metrics-service.test.ts > … > compares hours in SECONDS, not in the hours of the config list
AssertionError: expected 5400 to be 648000 // Object.is equality
 FAIL  src/features/dashboard/api/metrics-service.test.ts > … > moves the hours/projects comparisons with year and type, but never the yarn one
AssertionError: expected 'Un partido de fútbol' to be 'Un mes de trabajo' // Object.is equality
 FAIL  src/app/api/dashboard/metrics/dashboard-routes.test.ts > api/dashboard/metrics route handler > returns the metrics contract for the requested year and type
AssertionError: expected { hours: { …(3) }, …(2) } to deeply equal { hours: { …(3) }, …(2) }
 Test Files  2 failed | 1 passed (3)
      Tests  4 failed | 35 passed (39)
```

**A · verde al restaurar:** `Test Files 5 passed (5)` · `Tests 53 passed (53)`.

### Gate B — anclas de semilla (las DOS direcciones: añadir Y quitar)

**B1 · rojo — AÑADIR una referencia de horas** (`{ label: "Una temporada de sobremesa", hours: 200 }`):

```
 FAIL  src/shared/config/index.test.ts > HOURS_COMPARISONS (PRD §8.1 seed, expressed in HOURS) > contains the fixed seed with the exact hours
AssertionError: expected { 'Un partido de fútbol': 1.5, …(6) } to deeply equal { 'Un partido de fútbol': 1.5, …(5) }
 Test Files  1 failed | 4 passed (5)
      Tests  1 failed | 52 passed (53)
```

**B2 · rojo — QUITAR una referencia de horas** (`Un mes de trabajo`):

```
 FAIL  src/shared/config/index.test.ts > HOURS_COMPARISONS (PRD §8.1 seed, expressed in HOURS) > contains the fixed seed with the exact hours
AssertionError: expected { 'Un partido de fútbol': 1.5, …(4) } to deeply equal { 'Un partido de fútbol': 1.5, …(5) }
 Test Files  1 failed | 4 passed (5)
      Tests  1 failed | 52 passed (53)
```

**B3 · rojo — AÑADIR una referencia de proyectos** (`{ label: "Un vagón de subte", projects: 90 }`):

```
 FAIL  src/shared/config/index.test.ts > PROJECTS_COMPARISONS (PRD §8.1 seed, expressed in projects) > contains the fixed seed with the exact counts
AssertionError: expected { 'Un par': 2, …(5) } to deeply equal { 'Un par': 2, …(4) }
 Test Files  1 failed | 4 passed (5)
      Tests  1 failed | 52 passed (53)
```

**B4 · rojo — QUITAR una referencia de proyectos** (`Un colectivo lleno`):

```
 FAIL  src/shared/config/index.test.ts > PROJECTS_COMPARISONS (PRD §8.1 seed, expressed in projects) > contains the fixed seed with the exact counts
AssertionError: expected { 'Un par': 2, …(3) } to deeply equal { 'Un par': 2, …(4) }
 Test Files  1 failed | 4 passed (5)
      Tests  1 failed | 52 passed (53)
```

**B · verde al restaurar cada una:** `Tests 53 passed (53)`.
El ancla es un `toEqual` sobre el mapa `label → valor`, **no** un `toContain`: por eso cae en las dos
direcciones. El hueco que el mapa deja (una etiqueta duplicada con el mismo valor) lo tapa la comprobación
de longitud, derivada del mismo literal de la semilla.

### Gate C — no-hardcode en el servicio

**C1 · rojo — volver a escribir la lista de proyectos dentro de `comparison.ts`:**

```
 FAIL  src/features/dashboard/api/comparison-service.test.ts > the dashboard service holds no reference data of its own > repeats no seed label in ./comparison.ts
AssertionError: Un par found in ./comparison.ts: expected true to be false // Object.is equality
 FAIL  src/features/dashboard/api/comparison-service.test.ts > the dashboard service holds no reference data of its own > repeats no seed value in ./comparison.ts
AssertionError: 2 found in ./comparison.ts: expected true to be false // Object.is equality
 Test Files  1 failed | 4 passed (5)
      Tests  2 failed | 51 passed (53)
```

**C2 · rojo espontáneo, durante la implementación:** el guardrail cazó mi propio docstring, que decía
"un `times` equivocado por un factor de 3600":

```
 FAIL  src/features/dashboard/api/comparison-service.test.ts > … > spells the hour conversion by name, not as a bare number, in ./comparison.ts
AssertionError: bare 3600 in ./comparison.ts: expected true to be false // Object.is equality
```

Lo arreglé nombrando la constante en el comentario. **Es un falso positivo asumido a propósito**: el
guardrail lee texto plano y no distingue comentario de código (deuda propuesta 67).

**C · verde al restaurar:** `Tests 53 passed (53)`.

### Gate D — cableado del mapa (que cada métrica alimente SU comparativa)

**D1 · rojo — `projects: pickComparison(metrics.yarnMeters, PROJECTS_REFERENCES)`:**

```
 FAIL  src/features/dashboard/api/metrics-service.test.ts > … > returns one comparison per metric, each in its own unit
AssertionError: expected { label: 'Un colectivo lleno', …(2) } to deeply equal { label: 'Un par', …(2) }
 FAIL  src/features/dashboard/api/metrics-service.test.ts > … > moves the hours/projects comparisons with year and type, but never the yarn one
AssertionError: expected 'Un colectivo lleno' to be 'Un par' // Object.is equality
 FAIL  src/app/api/dashboard/metrics/dashboard-routes.test.ts > … > returns the metrics contract for the requested year and type
AssertionError: expected { hours: { …(3) }, …(2) } to deeply equal { hours: { …(3) }, …(2) }
 Test Files  2 failed | 1 passed (3)
      Tests  3 failed | 36 passed (39)
```

### Gate E — "la comparativa de metros NO se mueve con los filtros"

**E1 · rojo — `yarnMeters: pickComparison(metrics.hours, YARN_METERS_REFERENCES)`** (así la comparativa de
metros pasa a depender de una métrica **sí** filtrada):

```
 FAIL  src/features/dashboard/api/metrics-service.test.ts > … > returns one comparison per metric, each in its own unit
AssertionError: expected { label: 'El Everest', …(2) } to deeply equal { label: 'El Everest', …(2) }
 FAIL  src/features/dashboard/api/metrics-service.test.ts > … > moves the hours/projects comparisons with year and type, but never the yarn one
AssertionError: expected { label: 'La Torre Eiffel', …(2) } to deeply equal { label: 'El Everest', …(2) }
 FAIL  src/app/api/dashboard/metrics/dashboard-routes.test.ts > … > returns the metrics contract for the requested year and type
AssertionError: expected { hours: { …(3) }, …(2) } to deeply equal { hours: { …(3) }, …(2) }
 Test Files  2 failed | 1 passed (3)
      Tests  3 failed | 36 passed (39)
```

**D/E · verde al restaurar ambas:** `Test Files 5 passed (5)` · `Tests 53 passed (53)`, con `git diff`
confirmando que `comparison.ts` volvió exactamente a la versión entregada.

---

## 5. Verificación final

### `bash ./init.sh` (completo)

```
── 3. Validando feature_list.json ──────────────────────
[OK]    feature_list.json válido (32 features)

── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet


 Test Files  53 passed | 3 skipped (56)
      Tests  577 passed | 13 skipped (590)
   Start at  19:19:01
   Duration  64.80s (transform 5.08s, setup 52.19s, import 56.59s, tests 32.38s, environment 16.67s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**Contra la baseline del líder** (`52 passed | 3 skipped` archivos, `547 passed | 13 skipped` tests, que
**reverifiqué yo mismo antes de tocar nada** y salió idéntica): **+1 archivo** (el nuevo
`comparison-service.test.ts`) y **+30 tests**. Los **3 smokes siguen skipped** (Neon, auth, Cloudinary) y
siguen compilando: el typecheck está verde.

### `pnpm build`

```
✓ Compiled successfully in 13.4s
✓ Generating static pages using 3 workers (15/15) in 418ms
```

Las 27 rutas siguen listándose, `/api/dashboard/metrics` entre ellas (ƒ, dinámica). Sin warnings nuevos.

---

## 6. Deudas nuevas propuestas (desde la **66**; no las asenté yo)

**66. La comparativa de `yarnMeters` es lifetime y no se mueve con el filtro, pero el endpoint no lo dice.**
Un consumidor recibe `comparison.yarnMeters` dentro de una respuesta que sí trae `year`/`type` aplicados a
las otras dos métricas, y nada en el payload marca que ésa no se filtra. En pantalla el usuario cambiará el
año, verá moverse dos comparativas y quedarse una, sin explicación. Está en el PRD (§11.2) y ahora también
en un test, pero **no en el dato**. Se cierra en #19 con una nota en la UI, o antes marcando la entrada.

**67. El guardrail de no-hardcode lee texto plano y no distingue comentario de código.** Ya provocó un rojo
legítimo pero incómodo (un docstring que citaba la cifra del puente de unidades, ver §4 gate C2), y daría
un falso positivo si alguna semilla llegara a valer un número que aparece de forma natural en el código
(hoy ninguna vale `0` ni `1`, que son los únicos dígitos del servicio). Medicina: parsear o, más barato,
escanear sólo las líneas que no empiezan por `*` o `//`. Familia de la **40**/**43** (escaneos de fuente).

**68. Nada obliga por tipos a que una métrica nueva traiga su comparativa.** `MetricComparisons` declara sus
tres claves a mano; si mañana `DashboardMetrics` gana una cuarta métrica, el compilador **no** dirá nada y
la UI recibirá un mapa incompleto. El test del endpoint asserta las tres claves, así que caería en rojo —
pero por un test, no por el tipo. Medicina: derivar las claves de un único origen (una constante de claves
de métrica, o `Record<MetricKey, Comparison>`).

**69. `times` puede ser menor que 1 y nadie ha decidido cómo se lee.** Con poco tejido la respuesta es del
tipo "0,41 colectivos", y con `times = 0` es "0 partidos de fútbol". El backend está bien (el cociente es
correcto y el caso está testeado), pero el PRD no fija redondeo, plural ni un texto alternativo para el
caso vacío, y RFC-02 §4 sí define un estado vacío para la página. Lo va a descubrir #19; conviene decidirlo
**antes** de escribir esa UI.

**70. `pickComparison` ordena la lista en cada llamada.** Son 5-6 elementos y tres llamadas por request, así
que hoy es irrelevante y no propongo tocarlo — pero las listas ya vienen ordenadas de config (hay un
invariante que lo exige) y el `sort` defensivo se repite en cada petición. Ficha de higiene, prioridad baja;
si se toca, el test "does not depend on the order in which the list is written" es el que protege el cambio.

---

## 7. Notas para el reviewer

- El **cambio de forma es breaking a propósito** (§8.1): `comparison` ya no es un objeto suelto y
  `referenceMeters` ya no existe. Verificado que **no queda ningún consumidor**: `grep` de `referenceMeters`
  en `src/**` da cero, y `#19 dashboard_ui` sigue `pending`.
- El Route Handler **no se tocó**: es la comprobación de que la lógica estaba en la capa correcta.
- Los tests de comportamiento **no escriben ni un número ni una etiqueta de semilla**: todos derivan de
  `shared/config`. Los únicos literales de contrato están en `src/shared/config/index.test.ts` (regla 2a) y
  las tres claves del mapa en el test del endpoint, que es el contrato de §9.
- Si querés reproducir cualquier rojo de §4, cada mutación está descrita con el código exacto que la produce.

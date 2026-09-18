# Informes de cierre (archivo histórico)

> ⚠️ **Proceso histórico.** Esta carpeta es el **archivo** del arnés multi-agente
> anterior, en el que un rol `leader` escribía un informe de síntesis al cerrar
> cada implementación. Ese rol ya no existe: el repositorio trabaja ahora con el
> proceso **SDD** (*Spec-Driven Development*), y el trabajo nuevo se registra en
> `openspec/changes/<cambio>/` (`proposal.md`, spec, `design.md`, `tasks.md`,
> `apply-progress.md`). **No se escriben informes nuevos acá.**
>
> Lo que sigue documenta cómo se escribieron los informes 1-31 que ya están en
> esta carpeta, para que se puedan leer con su contexto.

## Qué es cada carpeta

- `docs/historial/reports/` → informes **crudos y técnicos** de los subagentes
  (`impl_<feature>.md` del implementer, `review_<feature>.md` del reviewer).
  Son el detalle de bajo nivel.
- `docs/historial/informes/` (esta) → **un informe por implementación**, escrito
  por el leader al **cerrar** (después de que el reviewer aprobaba). Explica el
  trabajo en lenguaje técnico **pero traduciendo cada término** para que se
  entienda sin ser experto. Apunta a los `reports/` para el detalle crudo.

## Nombre de archivo

`N.informe-<implementacion>.md`, donde **N es secuencial** (1, 2, 3…),
independiente del id de la feature. Así la numeración cubría también tareas que
no eran una feature (arquitectura, bugfix, migración). Ejemplos:

```
docs/historial/informes/
  1.informe-dashboard_metrics.md
  2.informe-calculators.md
  3.informe-bugfix-<algo>.md
```

## Cuándo se generaba

**Solo al cerrar**, una vez que el reviewer aprobaba y la feature quedaba
cerrada. Reflejaba lo realmente entregado, no lo planeado.

## Estructura del informe

Cada informe responde **qué, cómo, por qué y dónde**, con el vocabulario técnico
explicado:

```markdown
# N. Informe — <implementación>

- **Feature / tarea:** #<id o "n/a"> <nombre>
- **Fecha de cierre:** YYYY-MM-DD
- **Cadena de agentes:** leader → … → reviewer (resultado)
- **Reports crudos:** docs/historial/reports/impl_<x>.md, review_<x>.md

## El QUÉ — qué se construyó
Descripción funcional de lo entregado: qué puede hacer ahora la app que antes no.

## El CÓMO — cómo se construyó
Enfoque técnico y decisiones. Cada término técnico va seguido de una explicación
en paréntesis o frase aparte. Ej: "se validó con **zod** (una librería que
comprueba en runtime que los datos entrantes tienen la forma esperada y rechaza
lo que no cumple)".

## El PORQUÉ — por qué así y no de otra forma
Justificación de las decisiones: qué alternativa se descartó y el motivo, qué
regla del PRD o de arquitectura lo obliga, qué riesgo se evita.

## El DÓNDE — dónde vive el código
Rutas concretas de los archivos tocados/creados, agrupadas por capa
(`src/features/<x>/`, `src/app/api/<x>/`, `src/shared/`), con una línea de qué
hace cada una.

## Verificación
Resultado de `pnpm lint`, `pnpm typecheck`, `pnpm test` (nº de tests) y
`pnpm build`, más cualquier smoke manual.

## Deuda o notas abiertas
Lo que quedó pendiente y por qué no bloquea.
```

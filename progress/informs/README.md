# Informes de cierre (síntesis del leader)

> Esta carpeta la escribe **el leader**, no los subagentes. Es una capa de
> síntesis **por encima** de `progress/reports/`.

## Qué es cada carpeta

- `progress/reports/` → informes **crudos y técnicos** de los subagentes
  (`impl_<feature>.md` del implementer, `review_<feature>.md` del reviewer).
  Son el detalle de bajo nivel.
- `progress/informs/` → **un informe por implementación**, escrito por el
  leader al **cerrar** (después de que el reviewer aprueba). Explica el trabajo
  en lenguaje técnico **pero traduciendo cada término** para que se entienda sin
  ser experto. Apunta a los `reports/` para el detalle crudo.

## Nombre de archivo

`N.informe-<implementacion>.md`, donde **N es secuencial** (1, 2, 3…),
independiente del id de `feature_list.json`. Así la numeración cubre también
tareas que no son una feature (arquitectura, bugfix, migración). Ejemplos:

```
progress/informs/
  1.informe-dashboard_metrics.md
  2.informe-calculators.md
  3.informe-bugfix-<algo>.md
```

## Cuándo se genera

**Solo al cerrar**, una vez que el reviewer aprobó y la feature quedó `done`.
Refleja lo realmente entregado, no lo planeado.

## Estructura obligatoria del informe

Cada informe responde **qué, cómo, por qué y dónde**, con el vocabulario técnico
explicado:

```markdown
# N. Informe — <implementación>

- **Feature / tarea:** #<id o "n/a"> <nombre>
- **Fecha de cierre:** YYYY-MM-DD
- **Cadena de agentes:** leader → … → reviewer (resultado)
- **Reports crudos:** progress/reports/impl_<x>.md, review_<x>.md

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
Resultado de `bash ./init.sh` (nº de tests), `pnpm build`, y cualquier smoke.

## Deuda o notas abiertas
Lo que quedó pendiente y por qué no bloquea.
```

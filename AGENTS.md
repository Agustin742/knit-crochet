# AGENTS.md — Mapa de navegación para agentes de IA

> Este archivo es el **punto de entrada** para cualquier agente que trabaje en este
> repositorio. NO es una biblia de reglas: es un **mapa**. Lee solo lo que
> necesites cuando lo necesites (divulgación progresiva).

---

## 1. Antes de empezar (obligatorio)

1. Ejecuta `bash ./init.sh` y verifica que termina sin errores. Si falla, **para**
   y resuelve el entorno antes de tocar código.
2. Lee `progress/current.md` para entender en qué estado quedó la última sesión.
3. Lee `feature_list.json` y elige **una** tarea con estado `pending`. No
   trabajes en más de una a la vez.

## 2. Mapa del repositorio

| Archivo / carpeta            | Qué contiene                                              | Cuándo leerlo |
|------------------------------|-----------------------------------------------------------|---------------|
| `feature_list.json`          | Lista de tareas con estado (pending / in_progress / done) | Siempre, al empezar |
| `progress/current.md`        | Estado de la sesión actual                                | Siempre, al empezar |
| `progress/history.md`        | Bitácora append-only de sesiones anteriores               | Si necesitas contexto histórico |
| `progress/reports/`          | Informes de subagentes (`impl_*`, `review_*`, `explore_*`) | Si orquestas o auditas una feature |
| `docs/product/PRD-01-estructura-funcional.md` | **Fuente única de verdad**: qué debe hacer el producto | Antes de planear una feature |
| `visual.md`                  | Dirección estética, paleta, referencias, uso de 3D (fase visual) | Antes de tocar UI |
| `docs/harness/architecture.md` | Cómo construir: stack, feature-first, reglas de capas   | Antes de implementar |
| `docs/harness/conventions.md`  | Reglas de estilo, nombres, dónde va cada cosa            | Antes de escribir código |
| `docs/harness/verification.md` | Cómo verificar que tu trabajo funciona                   | Antes de declarar una tarea como `done` |
| `CHECKPOINTS.md`             | Criterios objetivos de "estado final correcto"            | Para auto-evaluarte |
| `.claude/agents/`            | Definiciones de subagentes (líder, implementador, revisor) | Si orquestas trabajo |
| `src/app/`                   | App Router (thin: routing + composición) + `api/**` (BFF) | Para rutas/endpoints |
| `src/features/<x>/`          | Feature autocontenido (schema, api, validation, store…)   | Para implementar lógica |
| `src/shared/`                | `db` (Drizzle+Neon), `lib` (jwt, cloudinary…), `config`, `ui` | Para infra compartida |

## 3. Reglas duras (no negociables)

- **Una sola feature a la vez.** No mezcles cambios de varias tareas en la misma sesión.
- **No declares una tarea `done` sin verificación verde.** Ejecuta `bash ./init.sh`
  y asegúrate de que lint, typecheck y tests pasan.
- **Respeta la arquitectura feature-first** (`docs/harness/architecture.md`): la UI
  no accede a la DB, la lógica vive en `features/<x>/api/`, todo scoping por `userId`.
- **El PRD manda.** Ante duda de alcance, `docs/product/PRD-01-...md` es la fuente de verdad.
- **Documenta lo que haces** en `progress/current.md` mientras trabajas, no al final.
- **Si no sabes algo, busca en `docs/`** antes de inventarlo.

## 4. Cómo elegir una tarea

```
1. Abre feature_list.json
2. Filtra por status == "pending"
3. Coge la de menor "id" (respeta el orden de dependencias)
4. Cambia su status a "in_progress" y guarda
5. Anota en progress/current.md: feature, hora de inicio, plan breve
```

## 5. Cierre de sesión (lifecycle)

Antes de terminar:

1. Ejecuta `bash ./init.sh` — todo verde.
2. Si la tarea está acabada: marca `status: "done"` en `feature_list.json`.
3. Mueve el resumen de `progress/current.md` al final de `progress/history.md`.
4. Vacía `progress/current.md` dejando solo la plantilla.
5. No dejes archivos temporales, ni `console.log` de debug, ni TODOs sin contexto.

## 6. Si te bloqueas

- Relee la sección relevante de `docs/`.
- Si la herramienta no hace lo que esperas, **no inventes un workaround**:
  documenta el bloqueo en `progress/current.md` y para la sesión.

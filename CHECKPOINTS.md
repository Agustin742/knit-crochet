# CHECKPOINTS — Evaluación del estado final

> En sistemas multi-agente no se evalúa el camino, se evalúa el destino.
> Estos son los checkpoints objetivos que un juez (humano o IA) puede usar
> para decidir si el proyecto está sano.

## C1 — El arnés está completo

- [ ] Existen los archivos base: `AGENTS.md`, `init.sh`, `feature_list.json`,
      `progress/current.md`.
- [ ] Existen los 3 docs: `docs/harness/architecture.md`,
      `docs/harness/conventions.md`, `docs/harness/verification.md`.
- [ ] `bash ./init.sh` termina con exit code 0.

## C2 — El estado es coherente

- [ ] Como mucho una feature en `in_progress` en `feature_list.json`.
- [ ] Toda feature `done` tiene tests asociados que pasan.
- [ ] `progress/current.md` está vacío o describe la sesión activa
      (no contiene basura de sesiones anteriores).

## C3 — El código respeta la arquitectura

- [ ] Las capas de `docs/harness/architecture.md` se respetan: la UI no accede a
      la DB; la lógica vive en `features/<x>/api/`; el acceso a Drizzle vive en
      `shared/db` + el feature; los Route Handlers son finos (parsean, validan
      con zod, delegan) y hacen scoping por `userId`.
- [ ] La estructura sigue feature-first (`src/{app,features,shared}`).
- [ ] No hay dependencias nuevas sin justificar en `feature_list.json`.
- [ ] No hay `console.log` sueltos para debug, ni TODOs sin contexto.
- [ ] No hay secretos hardcodeados (usar variables de entorno).

## C4 — La verificación es real

- [ ] Cada módulo con lógica no trivial tiene al menos un test.
- [ ] `pnpm lint` y el typecheck (`tsc --noEmit` o `pnpm typecheck`) pasan.
- [ ] Los tests corren y todos están verdes.

## C5 — La sesión se cerró bien

- [ ] No hay archivos sin trackear sospechosos (`*.tmp`, artefactos de build
      fuera del `.gitignore`).
- [ ] `progress/history.md` tiene una entrada por la última sesión.
- [ ] La última feature trabajada está reflejada en su estado correcto.

---

**Cómo usar este archivo:** un agente revisor (`.claude/agents/reviewer.md`)
recorre cada checkbox, marca `[x]` o `[ ]`, y rechaza el cierre de sesión
si quedan boxes vacíos en C1-C5.

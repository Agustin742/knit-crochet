# Informe — Tarea de arquitectura: capa de schema (S1 + S2)

Fecha: 2026-07-22. No es una feature de `feature_list.json`; ese archivo **no se tocó**.
Fuente de verdad aplicada: `docs/harness/architecture.md` §"Capa de schema" (reglas S1 y
S2 + tabla de `onDelete`) y la excepción de imports de `docs/harness/conventions.md`.

---

## Parte 1 — Regla S1: romper el ciclo de imports

Los `schema.ts` ahora importan tablas ajenas por su `schema.ts` directo.
El brief listaba 6 imports en 3 archivos; el grep encontró **7 en 4 archivos**:
`patterns/schema.ts` también importaba `@/features/auth`. Se corrigió igualmente,
porque la regla S1 es "ningún `schema.ts` importa un `index.ts`" y el brief pedía
verificar eso con grep.

| Archivo | Antes | Ahora |
|---|---|---|
| `src/features/projects/schema.ts` | `@/features/auth` | `@/features/auth/schema` |
| `src/features/projects/schema.ts` | `@/features/patterns` | `@/features/patterns/schema` |
| `src/features/projects/schema.ts` | `@/features/yarns` | `@/features/yarns/schema` |
| `src/features/time-tracking/schema.ts` | `@/features/auth` | `@/features/auth/schema` |
| `src/features/time-tracking/schema.ts` | `@/features/projects` | `@/features/projects/schema` |
| `src/features/yarns/schema.ts` | `@/features/auth` | `@/features/auth/schema` |
| `src/features/patterns/schema.ts` (extra) | `@/features/auth` | `@/features/auth/schema` |

En cada archivo se dejó un comentario de una línea apuntando a la regla S1, para que
el siguiente implementer no lo "arregle" de vuelta al barrel.

Verificación:

```
$ grep -rn "from \"@/features/[a-z-]*\"" src/features/*/schema.ts
OK: ningun schema.ts importa un index.ts
```

Grafo resultante (acíclico, DAG): `auth/schema` ← `patterns/schema`, `yarns/schema`;
`{auth,patterns,yarns}/schema` ← `projects/schema`; `{auth,projects}/schema` ←
`time-tracking/schema`. La capa de schema ya no conoce la capa de servicios.

## Parte 2 — Regla S2: cascadas declaradas en la FK

Aplicado exactamente lo de la tabla de `architecture.md`:

- `projects.userId`, `patterns.userId`, `brands.userId`, `yarns.userId`,
  `craftSessions.userId` → `onDelete: "cascade"` (posesión).
- `projectYarns.projectId` → `cascade`; `craftSessions.projectId` → `cascade`.
- `projects.patternId` → `set null` (la columna ya era nullable, no cambió).
- `projectYarns.yarnId`, `yarnTypes.brandId`, `yarns.brandId`, `yarns.typeId` →
  se dejaron **sin `onDelete`**, es decir `no action`. No se añadió
  `{ onDelete: "no action" }` explícito: es el default de Drizzle/Postgres y
  escribirlo generaría el mismo SQL con más ruido. El *por qué* queda documentado
  en el comentario de `project_yarns` (409 + `?force=true`, PRD §4.5).

## Parte 3 — Migración inicial regenerada

Como no se ha aplicado ninguna migración a Neon, se borró `drizzle/0000_cold_marrow.sql`
y `drizzle/meta/` completo, y se regeneró con `pnpm db:generate` (nunca npx).
Nuevo archivo: **`drizzle/0000_cold_ben_urich.sql`** (+ `drizzle/meta/0000_snapshot.json`
y `_journal.json` nuevos). 8 tablas, 12 FKs.

> Ojo para quien despliegue: **el nombre del archivo de migración cambió**
> (`0000_cold_marrow` → `0000_cold_ben_urich`). Irrelevante porque nada se aplicó.

Fragmento generado con las cláusulas `ON DELETE` (líneas 96-107):

```sql
ALTER TABLE "patterns" ADD CONSTRAINT "patterns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "brands" ADD CONSTRAINT "brands_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "yarn_types" ADD CONSTRAINT "yarn_types_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "yarns" ADD CONSTRAINT "yarns_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "yarns" ADD CONSTRAINT "yarns_brand_id_brands_id_fk" FOREIGN KEY ("brand_id") REFERENCES "public"."brands"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "yarns" ADD CONSTRAINT "yarns_type_id_yarn_types_id_fk" FOREIGN KEY ("type_id") REFERENCES "public"."yarn_types"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "project_yarns" ADD CONSTRAINT "project_yarns_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "project_yarns" ADD CONSTRAINT "project_yarns_yarn_id_yarns_id_fk" FOREIGN KEY ("yarn_id") REFERENCES "public"."yarns"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "projects" ADD CONSTRAINT "projects_pattern_id_patterns_id_fk" FOREIGN KEY ("pattern_id") REFERENCES "public"."patterns"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "craft_sessions" ADD CONSTRAINT "craft_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "craft_sessions" ADD CONSTRAINT "craft_sessions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;
```

Cotejo contra la tabla de `architecture.md`: coincidencia exacta, 12/12 FKs.

## Parte 4 — Retirada de la limpieza manual

- `src/features/projects/api/store.ts`: eliminados `removeYarnLinks` y
  `removeCraftSessions` del **tipo** `ProjectStore` y de la implementación Drizzle.
  Como consecuencia, el store ya no importa `craftSessions` de time-tracking:
  `ProjectStore` deja de conocer una tabla ajena (el síntoma que levantó el reviewer
  de #7). Sigue importando `yarns` para `findYarn`, que es scoping cruzado legítimo
  de lectura, no limpieza.
- `src/features/projects/api/delete-project.ts`: eliminadas las dos llamadas y
  reescrito el docblock. **Intacto**: `findById` con `userId` antes de borrar,
  `ProjectNotFoundError` (→404) para ajeno/inexistente, y el segundo `if (!deleted)`.
- `src/features/projects/api/testing/in-memory-store.ts`: eliminados los dos métodos
  del doble.

### Cómo el doble simula la cascada

El doble en memoria ahora replica el comportamiento de Postgres dentro de `remove`:

```ts
async remove(userId, id) {
  const index = rows.findIndex((row) => row.userId === userId && row.id === id);
  if (index === -1) return false;          // ajeno o inexistente: no cascada
  rows.splice(index, 1);
  cascadeDelete(links, (link) => link.projectId === id);
  cascadeDelete(sessions, (session) => session.projectId === id);
  return true;
}
```

Tres detalles deliberados:

1. La cascada ocurre **después** del check de propiedad y solo si se borró la fila.
   Así el test "no toca ninguna sesión si el proyecto es de otro usuario" sigue
   siendo significativo (el doble no borra nada cuando `remove` devuelve `false`).
2. `cascadeDelete` es un helper que **muta el array in place** (`splice`), no lo
   reasigna. Es obligatorio: `InMemoryCraftSessionStore` comparte *literalmente* la
   misma referencia de array `projects.sessions`. Si se reemplazara el array, el
   doble de time-tracking seguiría viendo las sesiones viejas y los tests de #7
   pasarían a mentir.
3. El filtro es por `projectId` y nada más, igual que la FK: no toca sesiones ni
   enlaces de otros proyectos.

## Conteo de tests: 169 antes → **169 después** (20 archivos, sin cambio)

No se borró ningún test. **Ningún test llamaba a `removeYarnLinks`/`removeCraftSessions`
directamente** (se comprobó por grep en `*.test.ts`): todos ejercitaban la costura a
través de `deleteProject` o del Route Handler, por lo que la retirada de los métodos
no dejó ningún test huérfano. Los que cubren la costura siguen existiendo y pasando:

- `src/features/projects/api/project-service.test.ts` → "clears the yarn links before
  deleting the project".
- `src/features/time-tracking/api/project-deletion.test.ts` → los 3 (borra sesiones,
  no toca las de otros proyectos, no toca nada si el proyecto es ajeno).
- `src/app/api/projects/session-routes.test.ts` → `DELETE /api/projects/:id with craft
  sessions` (204 sin huérfanos + conserva las de otros proyectos).

Único cambio en archivos de test: **dos comentarios** que afirmaban `ON DELETE no
action` y ahora habrían quedado mintiendo (`project-deletion.test.ts` y
`session-routes.test.ts`). Cero cambios en aserciones.

## Verificación

`bash ./init.sh` — **verde**:

```
── 3. Validando feature_list.json ──────────────────────
[OK]    feature_list.json válido (11 features)

── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
 Test Files  20 passed (20)
      Tests  169 passed (169)
   Duration  19.22s
[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

`pnpm build` — **OK** (13 Route Handlers + Proxy compilados, sin warnings nuevos).

## Archivos tocados

Modificados:
- `src/features/auth/schema.ts` — sin cambios (no importa nada de otro feature).
- `src/features/patterns/schema.ts`
- `src/features/yarns/schema.ts`
- `src/features/projects/schema.ts`
- `src/features/time-tracking/schema.ts`
- `src/features/projects/api/store.ts`
- `src/features/projects/api/delete-project.ts`
- `src/features/projects/api/testing/in-memory-store.ts`
- `src/features/time-tracking/api/project-deletion.test.ts` (solo comentario)
- `src/app/api/projects/session-routes.test.ts` (solo comentario)

Borrados: `drizzle/0000_cold_marrow.sql`, `drizzle/meta/*` (regenerados).
Creados: `drizzle/0000_cold_ben_urich.sql`, `drizzle/meta/0000_snapshot.json`,
`drizzle/meta/_journal.json`.

No se tocó: `feature_list.json`, ningún `route.ts`, ninguna `validation.ts`, ningún
servicio salvo `delete-project.ts`. Comportamiento observable de los endpoints:
idéntico.

---

## Riesgos y puntos de atención para el reviewer

1. **Riesgo principal: la cascada nunca se ha ejecutado contra Postgres real.** Igual
   que toda la app (deuda técnica #7 de `current.md`), esto está validado contra el
   doble en memoria y contra el SQL generado leído a ojo, no contra Neon. La
   equivalencia "doble simula la FK" es una convención que mantenemos a mano; si
   divergen, los tests seguirán verdes y la DB fallará. **Punto concreto a confirmar
   en el primer smoke con Neon**: `DELETE FROM projects` con enlaces y sesiones.
2. **Nuevo contrato implícito del doble**: a partir de ahora, quien añada una tabla
   con FK `cascade` hacia `projects` debe acordarse de añadir su `cascadeDelete`
   correspondiente en `remove`. No hay nada que lo fuerce. Lo mismo aplicará a #8 si
   `yarns` gana hijos.
3. **`projects.patternId` → `set null`** implica que borrar un patrón deja proyectos
   con `patternId = null` en silencio. Es lo que dice la doc, pero cuando #9
   (`patterns`) implemente su DELETE, conviene decidir si el usuario merece un aviso.
   No lo he implementado: fuera de scope.
4. **`no action` implícito vs explícito**: opté por no escribir
   `{ onDelete: "no action" }`. Si el reviewer prefiere que la intención sea visible
   en el código y no solo en el comentario, es un cambio de una línea por FK y no
   altera el SQL. Lo señalo por si es criterio del proyecto.
5. **#8 hereda trabajo real**: `yarn_types → brands`, `yarns → brands` y
   `yarns → yarn_types` quedan `no action`, así que borrar una marca con hijos hoy
   daría **500**, no 409. La decisión de producto está tomada (409) pero **la lógica
   no existe todavía** — es responsabilidad explícita de #8. Mismo patrón exacto que
   causó el rechazo de #6: conviene nombrarlo en el brief de #8.
6. El nombre del archivo de migración cambió; cualquier script o doc que citara
   `0000_cold_marrow.sql` por nombre está desactualizado (grep: solo lo menciona
   `progress/current.md`, texto histórico).

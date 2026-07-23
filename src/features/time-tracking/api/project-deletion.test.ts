import { describe, expect, it } from "vitest";

import { createProject } from "@/features/projects/api/create-project";
import { deleteProject } from "@/features/projects/api/delete-project";
import { startSession } from "@/features/time-tracking/api/start-session";
import { stopSession } from "@/features/time-tracking/api/stop-session";
import {
  createInMemoryCraftSessionStore,
  type InMemoryCraftSessionStore,
} from "@/features/time-tracking/api/testing/in-memory-store";

const T0 = new Date("2026-03-01T10:00:00Z");
const T0_PLUS_60S = new Date("2026-03-01T10:01:00Z");

async function seedProject(
  store: InMemoryCraftSessionStore,
  name: string,
): Promise<string> {
  const project = await createProject(
    "user-1",
    { name, type: "knitting" },
    store.projects,
  );
  return project.id;
}

/**
 * Frontera #6↔#7: `craft_sessions.project_id` es `ON DELETE cascade` (regla S2
 * de `architecture.md`), así que borrar un proyecto con sesiones se lleva las
 * sesiones y solo las suyas. El doble en memoria simula esa cascada.
 */
describe("features/projects deleteProject with craft sessions", () => {
  it("deletes a project that has sessions leaving no orphans", async () => {
    const store = createInMemoryCraftSessionStore();
    const projectId = await seedProject(store, "Bufanda");
    await startSession("user-1", projectId, store, T0);
    await stopSession("user-1", projectId, store, T0_PLUS_60S);
    await startSession("user-1", projectId, store, T0_PLUS_60S);

    await expect(
      deleteProject("user-1", projectId, store.projects),
    ).resolves.toBeUndefined();

    expect(store.projects.rows).toHaveLength(0);
    expect(store.sessions).toHaveLength(0);
  });

  it("does not delete the sessions of other projects", async () => {
    const store = createInMemoryCraftSessionStore();
    const doomed = await seedProject(store, "Bufanda");
    const kept = await seedProject(store, "Gorro");
    await startSession("user-1", doomed, store, T0);
    await startSession("user-1", kept, store, T0);

    await deleteProject("user-1", doomed, store.projects);

    expect(store.sessions).toHaveLength(1);
    expect(store.sessions[0]?.projectId).toBe(kept);
    expect(store.projects.rows.map((row) => row.id)).toEqual([kept]);
  });

  it("does not touch any session when the project belongs to another user", async () => {
    const store = createInMemoryCraftSessionStore();
    const projectId = await seedProject(store, "Bufanda");
    await startSession("user-1", projectId, store, T0);

    await expect(
      deleteProject("user-2", projectId, store.projects),
    ).rejects.toThrow();

    expect(store.sessions).toHaveLength(1);
    expect(store.projects.rows).toHaveLength(1);
  });
});

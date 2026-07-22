import { describe, expect, it } from "vitest";

import { createProject } from "@/features/projects/api/create-project";
import { deleteProject } from "@/features/projects/api/delete-project";
import { ProjectNotFoundError } from "@/features/projects/api/errors";
import { getProject } from "@/features/projects/api/get-project";
import { calculateProgress } from "@/features/projects/api/progress";
import { updateProject } from "@/features/projects/api/update-project";
import { createInMemoryProjectStore } from "@/features/projects/api/testing/in-memory-store";

describe("features/projects calculateProgress", () => {
  it("returns the rounded percentage of rounds over targetRounds", () => {
    expect(calculateProgress(0, 100)).toBe(0);
    expect(calculateProgress(50, 100)).toBe(50);
    expect(calculateProgress(1, 3)).toBe(33);
    expect(calculateProgress(2, 3)).toBe(67);
    expect(calculateProgress(100, 100)).toBe(100);
  });

  it("returns 0 when targetRounds is 0 instead of dividing by zero", () => {
    expect(calculateProgress(0, 0)).toBe(0);
    expect(calculateProgress(42, 0)).toBe(0);
    expect(Number.isFinite(calculateProgress(42, 0))).toBe(true);
  });

  it("clamps the result to 0..100", () => {
    expect(calculateProgress(500, 100)).toBe(100);
    expect(calculateProgress(-500, 100)).toBe(0);
  });
});

describe("features/projects services", () => {
  it("creates a project scoped to the user with the calculated progress", async () => {
    const store = createInMemoryProjectStore();

    const project = await createProject(
      "user-1",
      { name: "Bufanda", type: "knitting", rounds: 25, targetRounds: 100 },
      store,
    );

    expect(project.userId).toBe("user-1");
    expect(project.name).toBe("Bufanda");
    expect(project.progress).toBe(25);
    expect(project.status).toBe("in_progress");
    expect(store.rows).toHaveLength(1);
  });

  it("creates a project with progress 0 when there is no target", async () => {
    const store = createInMemoryProjectStore();

    const project = await createProject(
      "user-1",
      { name: "Amigurumi", type: "crochet", rounds: 10 },
      store,
    );

    expect(project.targetRounds).toBe(0);
    expect(project.progress).toBe(0);
  });

  it("recalculates progress when rounds or targetRounds change", async () => {
    const store = createInMemoryProjectStore();
    const created = await createProject(
      "user-1",
      { name: "Bufanda", type: "knitting", rounds: 10, targetRounds: 100 },
      store,
    );

    const withRounds = await updateProject(
      "user-1",
      created.id,
      { rounds: 40 },
      store,
    );
    expect(withRounds.progress).toBe(40);

    const withTarget = await updateProject(
      "user-1",
      created.id,
      { targetRounds: 80 },
      store,
    );
    expect(withTarget.progress).toBe(50);

    const clamped = await updateProject(
      "user-1",
      created.id,
      { rounds: 999 },
      store,
    );
    expect(clamped.progress).toBe(100);

    const noTarget = await updateProject(
      "user-1",
      created.id,
      { targetRounds: 0 },
      store,
    );
    expect(noTarget.progress).toBe(0);
  });

  it("ignores a progress sent by the client and keeps the calculated one", async () => {
    const store = createInMemoryProjectStore();
    const created = await createProject(
      "user-1",
      { name: "Bufanda", type: "knitting", rounds: 10, targetRounds: 100 },
      store,
    );

    const updated = await updateProject(
      "user-1",
      created.id,
      { name: "Bufanda larga" },
      store,
    );

    expect(updated.name).toBe("Bufanda larga");
    expect(updated.progress).toBe(10);
  });

  it("hides another user's project behind ProjectNotFoundError", async () => {
    const store = createInMemoryProjectStore();
    const created = await createProject(
      "user-1",
      { name: "Bufanda", type: "knitting" },
      store,
    );

    await expect(getProject("user-1", created.id, store)).resolves.toMatchObject(
      { id: created.id },
    );
    await expect(getProject("user-2", created.id, store)).rejects.toBeInstanceOf(
      ProjectNotFoundError,
    );
    await expect(
      updateProject("user-2", created.id, { name: "Robada" }, store),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
    await expect(
      deleteProject("user-2", created.id, store),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect(store.rows).toHaveLength(1);
  });

  it("deletes an owned project and fails for an unknown id", async () => {
    const store = createInMemoryProjectStore();
    const created = await createProject(
      "user-1",
      { name: "Bufanda", type: "knitting" },
      store,
    );

    await expect(
      deleteProject("user-1", created.id, store),
    ).resolves.toBeUndefined();
    expect(store.rows).toHaveLength(0);
    await expect(
      deleteProject("user-1", created.id, store),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });

  it("clears the yarn links before deleting the project", async () => {
    const store = createInMemoryProjectStore();
    const created = await createProject(
      "user-1",
      { name: "Bufanda", type: "knitting" },
      store,
    );
    store.links.push({
      projectId: created.id,
      yarnId: "22222222-2222-4222-8222-222222222222",
    });

    await expect(
      deleteProject("user-1", created.id, store),
    ).resolves.toBeUndefined();

    expect(store.rows).toHaveLength(0);
    expect(store.links).toHaveLength(0);
  });
});

import { describe, expect, it } from "vitest";

import { addRounds } from "@/features/projects/api/add-rounds";
import { createProject } from "@/features/projects/api/create-project";
import {
  ProjectNotFoundError,
  YarnNotFoundError,
} from "@/features/projects/api/errors";
import {
  linkProjectYarn,
  unlinkProjectYarn,
} from "@/features/projects/api/project-yarns";
import { setCompletedSteps } from "@/features/projects/api/set-completed-steps";
import {
  createInMemoryProjectStore,
  type InMemoryProjectStore,
  type InMemoryYarnRow,
} from "@/features/projects/api/testing/in-memory-store";

const YARN_ID = "22222222-2222-4222-8222-222222222222";
const OTHER_YARN_ID = "33333333-3333-4333-8333-333333333333";

/** El enlace sólo mira id y dueño; los campos del swatch los fija el detalle. */
function yarnRow(id: string, userId: string): InMemoryYarnRow {
  return {
    id,
    userId,
    colorName: "Azul Profundo",
    colorFamily: "blue",
    brandName: "Malabrigo",
    typeName: "Rios",
  };
}

async function seedProject(
  store: InMemoryProjectStore,
  rounds = 0,
  targetRounds = 0,
): Promise<string> {
  const project = await createProject(
    "user-1",
    { name: "Bufanda", type: "knitting", rounds, targetRounds },
    store,
  );
  return project.id;
}

describe("features/projects addRounds", () => {
  it("adds a positive delta and recalculates progress", async () => {
    const store = createInMemoryProjectStore();
    const id = await seedProject(store, 10, 100);

    const updated = await addRounds("user-1", id, 15, store);

    expect(updated.rounds).toBe(25);
    expect(updated.progress).toBe(25);
  });

  it("subtracts a negative delta and recalculates progress", async () => {
    const store = createInMemoryProjectStore();
    const id = await seedProject(store, 40, 100);

    const updated = await addRounds("user-1", id, -15, store);

    expect(updated.rounds).toBe(25);
    expect(updated.progress).toBe(25);
  });

  it("never lets rounds go below 0", async () => {
    const store = createInMemoryProjectStore();
    const id = await seedProject(store, 3, 100);

    const updated = await addRounds("user-1", id, -50, store);

    expect(updated.rounds).toBe(0);
    expect(updated.progress).toBe(0);
  });

  it("keeps progress at 0 when there is no target and clamps at 100", async () => {
    const store = createInMemoryProjectStore();
    const noTarget = await seedProject(store, 0, 0);
    const withTarget = await seedProject(store, 0, 10);

    expect((await addRounds("user-1", noTarget, 42, store)).progress).toBe(0);
    expect((await addRounds("user-1", withTarget, 999, store)).progress).toBe(
      100,
    );
  });

  it("hides another user's project behind ProjectNotFoundError", async () => {
    const store = createInMemoryProjectStore();
    const id = await seedProject(store, 5, 10);

    await expect(addRounds("user-2", id, 1, store)).rejects.toBeInstanceOf(
      ProjectNotFoundError,
    );
    expect(store.rows[0]?.rounds).toBe(5);
  });
});

describe("features/projects setCompletedSteps", () => {
  it("stores the steps deduplicated and sorted", async () => {
    const store = createInMemoryProjectStore();
    const id = await seedProject(store);

    const updated = await setCompletedSteps("user-1", id, [3, 0, 3, 1], store);

    expect(updated.completedSteps).toEqual([0, 1, 3]);
  });

  it("replaces the previous set (an empty array clears it)", async () => {
    const store = createInMemoryProjectStore();
    const id = await seedProject(store);

    await setCompletedSteps("user-1", id, [0, 1, 2], store);
    const cleared = await setCompletedSteps("user-1", id, [], store);

    expect(cleared.completedSteps).toEqual([]);
  });

  it("hides another user's project behind ProjectNotFoundError", async () => {
    const store = createInMemoryProjectStore();
    const id = await seedProject(store);

    await expect(
      setCompletedSteps("user-2", id, [1], store),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});

describe("features/projects project yarns", () => {
  function storeWithYarn(): InMemoryProjectStore {
    const store = createInMemoryProjectStore();
    store.yarns.push(yarnRow(YARN_ID, "user-1"));
    store.yarns.push(yarnRow(OTHER_YARN_ID, "user-2"));
    return store;
  }

  it("links a yarn without touching its stock", async () => {
    const store = storeWithYarn();
    const id = await seedProject(store);

    const result = await linkProjectYarn("user-1", id, YARN_ID, store);

    expect(result.changed).toBe(true);
    expect(result.yarnIds).toEqual([YARN_ID]);
    expect(store.links).toEqual([{ projectId: id, yarnId: YARN_ID }]);
  });

  it("is idempotent when the same yarn is linked twice", async () => {
    const store = storeWithYarn();
    const id = await seedProject(store);

    await linkProjectYarn("user-1", id, YARN_ID, store);
    const second = await linkProjectYarn("user-1", id, YARN_ID, store);

    expect(second.changed).toBe(false);
    expect(second.yarnIds).toEqual([YARN_ID]);
    expect(store.links).toHaveLength(1);
  });

  it("unlinks a yarn and is idempotent when there is nothing to unlink", async () => {
    const store = storeWithYarn();
    const id = await seedProject(store);
    await linkProjectYarn("user-1", id, YARN_ID, store);

    const removed = await unlinkProjectYarn("user-1", id, YARN_ID, store);
    const again = await unlinkProjectYarn("user-1", id, YARN_ID, store);

    expect(removed.changed).toBe(true);
    expect(removed.yarnIds).toEqual([]);
    expect(again.changed).toBe(false);
    expect(store.links).toHaveLength(0);
  });

  it("rejects a yarn owned by another user with YarnNotFoundError", async () => {
    const store = storeWithYarn();
    const id = await seedProject(store);

    await expect(
      linkProjectYarn("user-1", id, OTHER_YARN_ID, store),
    ).rejects.toBeInstanceOf(YarnNotFoundError);
    await expect(
      unlinkProjectYarn("user-1", id, OTHER_YARN_ID, store),
    ).rejects.toBeInstanceOf(YarnNotFoundError);
    expect(store.links).toHaveLength(0);
  });

  it("rejects a project owned by another user with ProjectNotFoundError", async () => {
    const store = storeWithYarn();
    const id = await seedProject(store);
    store.yarns.push(yarnRow(OTHER_YARN_ID, "user-2"));

    await expect(
      linkProjectYarn("user-2", id, OTHER_YARN_ID, store),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect(store.links).toHaveLength(0);
  });
});

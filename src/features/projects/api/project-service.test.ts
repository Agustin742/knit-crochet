import { describe, expect, it } from "vitest";

import { createProject } from "@/features/projects/api/create-project";
import { deleteProject } from "@/features/projects/api/delete-project";
import { ProjectNotFoundError } from "@/features/projects/api/errors";
import { getProject } from "@/features/projects/api/get-project";
import { calculateProgress } from "@/features/projects/api/progress";
import { updateProject } from "@/features/projects/api/update-project";
import {
  createInMemoryProjectStore,
  type InMemoryProjectStore,
  type InMemoryYarnRow,
} from "@/features/projects/api/testing/in-memory-store";
import type { LinkedYarn } from "@/features/projects/types";

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
      { project: { id: created.id } },
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

describe("features/projects getProject linked yarns", () => {
  /** La lana tal y como la espera el payload: la fila sin su dueño. */
  function swatchOf(yarn: InMemoryYarnRow): LinkedYarn {
    return {
      id: yarn.id,
      colorName: yarn.colorName,
      colorFamily: yarn.colorFamily,
      brandName: yarn.brandName,
      typeName: yarn.typeName,
    };
  }

  function yarnRow(
    id: string,
    overrides: Partial<InMemoryYarnRow> = {},
  ): InMemoryYarnRow {
    return {
      id,
      userId: "user-1",
      colorName: "Azul Profundo",
      colorFamily: "blue",
      brandName: "Malabrigo",
      typeName: "Rios",
      ...overrides,
    };
  }

  async function seedProject(store: InMemoryProjectStore): Promise<string> {
    const project = await createProject(
      "user-1",
      { name: "Bufanda", type: "knitting" },
      store,
    );
    return project.id;
  }

  /** Enlaza en el orden dado: el orden del resultado no puede depender de él. */
  function linkAll(
    store: InMemoryProjectStore,
    projectId: string,
    ...rows: InMemoryYarnRow[]
  ): void {
    for (const row of rows) {
      store.links.push({ projectId, yarnId: row.id });
    }
  }

  it("returns the linked yarns next to the project, not inside it", async () => {
    const store = createInMemoryProjectStore();
    const projectId = await seedProject(store);
    const yarn = yarnRow("22222222-2222-4222-8222-222222222222");
    store.yarns.push(yarn);
    linkAll(store, projectId, yarn);

    const detail = await getProject("user-1", projectId, store);

    expect(detail.project).toEqual(store.rows[0]);
    expect(detail.yarns).toEqual([swatchOf(yarn)]);
  });

  it("returns an empty list when the project has no linked yarns", async () => {
    const store = createInMemoryProjectStore();
    const projectId = await seedProject(store);
    store.yarns.push(yarnRow("22222222-2222-4222-8222-222222222222"));

    const detail = await getProject("user-1", projectId, store);

    expect(detail.yarns).toEqual([]);
  });

  // Un enlace a una lana ajena no se puede crear por la API (link comprueba los
  // dos extremos), pero `project_yarns` no tiene dueño: si la consulta filtrase
  // sólo por `projectId`, cualquier fila así filtraría inventario de otro.
  it("never leaks a yarn owned by another user through the link table", async () => {
    const store = createInMemoryProjectStore();
    const projectId = await seedProject(store);
    const own = yarnRow("22222222-2222-4222-8222-222222222222");
    const foreign = yarnRow("33333333-3333-4333-8333-333333333333", {
      userId: "user-2",
      brandName: "Marca Ajena",
    });
    store.yarns.push(own, foreign);
    linkAll(store, projectId, foreign, own);

    const detail = await getProject("user-1", projectId, store);

    expect(detail.yarns).toEqual([swatchOf(own)]);
  });

  it("hides another user's project even when it has linked yarns", async () => {
    const store = createInMemoryProjectStore();
    const projectId = await seedProject(store);
    const yarn = yarnRow("22222222-2222-4222-8222-222222222222");
    store.yarns.push(yarn);
    linkAll(store, projectId, yarn);

    await expect(getProject("user-2", projectId, store)).rejects.toBeInstanceOf(
      ProjectNotFoundError,
    );
  });

  it("orders the yarns by brand, then type, then color name", async () => {
    const store = createInMemoryProjectStore();
    const projectId = await seedProject(store);
    const alpacaDoble = yarnRow("11111111-1111-4111-8111-111111111111", {
      brandName: "Alpaca Sur",
      typeName: "Doble",
      colorName: "Zafiro",
    });
    const alpacaFinaAzul = yarnRow("22222222-2222-4222-8222-222222222222", {
      brandName: "Alpaca Sur",
      typeName: "Fina",
      colorName: "Azul",
    });
    const alpacaFinaRojo = yarnRow("33333333-3333-4333-8333-333333333333", {
      brandName: "Alpaca Sur",
      typeName: "Fina",
      colorName: "Rojo",
    });
    const bergamota = yarnRow("44444444-4444-4444-8444-444444444444", {
      brandName: "Bergamota",
      typeName: "Aguja",
      colorName: "Ambar",
    });
    store.yarns.push(bergamota, alpacaFinaRojo, alpacaDoble, alpacaFinaAzul);
    linkAll(
      store,
      projectId,
      bergamota,
      alpacaFinaRojo,
      alpacaDoble,
      alpacaFinaAzul,
    );

    const detail = await getProject("user-1", projectId, store);

    expect(detail.yarns).toEqual([
      swatchOf(alpacaDoble),
      swatchOf(alpacaFinaAzul),
      swatchOf(alpacaFinaRojo),
      swatchOf(bergamota),
    ]);
  });

  it("breaks a tie between identical labels with the yarn id", async () => {
    const store = createInMemoryProjectStore();
    const projectId = await seedProject(store);
    const first = yarnRow("11111111-1111-4111-8111-111111111111");
    const second = yarnRow("22222222-2222-4222-8222-222222222222");
    store.yarns.push(second, first);
    linkAll(store, projectId, second, first);

    const detail = await getProject("user-1", projectId, store);

    expect(detail.yarns.map((yarn) => yarn.id)).toEqual([first.id, second.id]);
  });
});

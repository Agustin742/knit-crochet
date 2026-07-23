import { describe, expect, it } from "vitest";

import { createPattern } from "@/features/patterns/api/create-pattern";
import { deletePattern } from "@/features/patterns/api/delete-pattern";
import { PatternNotFoundError } from "@/features/patterns/api/errors";
import { getPattern } from "@/features/patterns/api/get-pattern";
import { listPatterns } from "@/features/patterns/api/list-patterns";
import { updatePattern } from "@/features/patterns/api/update-pattern";
import {
  createInMemoryPatternStore,
  type InMemoryPatternStore,
} from "@/features/patterns/api/testing/in-memory-store";
import type { CreatePatternInput } from "@/features/patterns/types";

function patternInput(
  overrides: Partial<CreatePatternInput> = {},
): CreatePatternInput {
  return {
    name: "Gorro básico",
    type: "knitting",
    ...overrides,
  };
}

describe("features/patterns create + read", () => {
  it("creates a pattern scoped to the user with defaults", async () => {
    const store = createInMemoryPatternStore();

    const created = await createPattern(
      "user-1",
      patternInput({
        instructions: [{ key: "Paso 1", value: "Montar 40 puntos" }],
        metadata: [{ key: "size", value: "M" }],
      }),
      store,
    );

    expect(created.userId).toBe("user-1");
    expect(created.inLibrary).toBe(false);
    expect(created.instructions).toEqual([
      { key: "Paso 1", value: "Montar 40 puntos" },
    ]);
    expect(created.metadata).toEqual([{ key: "size", value: "M" }]);
    expect(store.rows).toHaveLength(1);
  });

  it("defaults instructions and metadata to empty arrays", async () => {
    const store = createInMemoryPatternStore();

    const created = await createPattern("user-1", patternInput(), store);

    expect(created.instructions).toEqual([]);
    expect(created.metadata).toEqual([]);
  });

  it("returns an owned pattern and hides another user's", async () => {
    const store = createInMemoryPatternStore();
    const mine = await createPattern("user-1", patternInput(), store);
    const foreign = await createPattern("user-2", patternInput(), store);

    await expect(getPattern("user-1", mine.id, store)).resolves.toMatchObject({
      id: mine.id,
    });
    await expect(getPattern("user-1", foreign.id, store)).rejects.toBeInstanceOf(
      PatternNotFoundError,
    );
  });
});

describe("features/patterns list filters", () => {
  it("filters by type", async () => {
    const store = createInMemoryPatternStore();
    await createPattern("user-1", patternInput({ type: "knitting" }), store);
    await createPattern("user-1", patternInput({ type: "crochet" }), store);

    const crochet = await listPatterns("user-1", { type: "crochet" }, store);

    expect(crochet).toHaveLength(1);
    expect(crochet[0]?.type).toBe("crochet");
  });

  it("filters by inLibrary (biblioteca vs embebido)", async () => {
    const store = createInMemoryPatternStore();
    await createPattern("user-1", patternInput({ inLibrary: true }), store);
    await createPattern("user-1", patternInput({ inLibrary: false }), store);

    const library = await listPatterns("user-1", { inLibrary: true }, store);
    const embedded = await listPatterns("user-1", { inLibrary: false }, store);

    expect(library).toHaveLength(1);
    expect(library[0]?.inLibrary).toBe(true);
    expect(embedded).toHaveLength(1);
    expect(embedded[0]?.inLibrary).toBe(false);
  });

  it("only lists patterns owned by the user", async () => {
    const store = createInMemoryPatternStore();
    await createPattern("user-1", patternInput(), store);
    await createPattern("user-2", patternInput(), store);

    const mine = await listPatterns("user-1", {}, store);

    expect(mine).toHaveLength(1);
    expect(mine[0]?.userId).toBe("user-1");
  });
});

describe("features/patterns update", () => {
  it("updates an owned pattern and publishes it to the library", async () => {
    const store = createInMemoryPatternStore();
    const created = await createPattern("user-1", patternInput(), store);

    const updated = await updatePattern(
      "user-1",
      created.id,
      { name: "Gorro avanzado", inLibrary: true },
      store,
    );

    expect(updated.name).toBe("Gorro avanzado");
    expect(updated.inLibrary).toBe(true);
  });

  it("rejects updating another user's pattern with 404", async () => {
    const store = createInMemoryPatternStore();
    const foreign = await createPattern("user-2", patternInput(), store);

    await expect(
      updatePattern("user-1", foreign.id, { name: "X" }, store),
    ).rejects.toBeInstanceOf(PatternNotFoundError);
  });
});

describe("features/patterns delete", () => {
  it("deletes an owned pattern", async () => {
    const store = createInMemoryPatternStore();
    const created = await createPattern("user-1", patternInput(), store);

    await deletePattern("user-1", created.id, store);

    expect(store.rows).toHaveLength(0);
  });

  it("rejects deleting another user's pattern with 404", async () => {
    const store = createInMemoryPatternStore();
    const foreign = await createPattern("user-2", patternInput(), store);

    await expect(
      deletePattern("user-1", foreign.id, store),
    ).rejects.toBeInstanceOf(PatternNotFoundError);
    expect(store.rows).toHaveLength(1);
  });

  // Costura: FK `projects.pattern_id → patterns` es `ON DELETE set null` (S2).
  // Al borrar el patrón, el proyecto que lo usaba sobrevive con patternId = null.
  it("sets patternId to null on referencing projects (set null)", async () => {
    const store = createInMemoryPatternStore();
    const pattern = await createPattern(
      "user-1",
      patternInput({ inLibrary: true }),
      store,
    );
    const project = await store.projects.create({
      userId: "user-1",
      name: "Bufanda",
      type: "knitting",
      patternId: pattern.id,
    });

    await deletePattern("user-1", pattern.id, store);

    const surviving = store.projects.rows.find((row) => row.id === project.id);
    expect(surviving).toBeDefined();
    expect(surviving?.patternId).toBeNull();
  });
});

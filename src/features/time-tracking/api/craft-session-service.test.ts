import { describe, expect, it } from "vitest";

import { createProject } from "@/features/projects/api/create-project";
import { ProjectNotFoundError } from "@/features/projects/api/errors";
import { NoActiveSessionError } from "@/features/time-tracking/api/errors";
import { listSessions } from "@/features/time-tracking/api/list-sessions";
import { startSession } from "@/features/time-tracking/api/start-session";
import {
  calculateDuration,
  stopSession,
} from "@/features/time-tracking/api/stop-session";
import {
  createInMemoryCraftSessionStore,
  type InMemoryCraftSessionStore,
} from "@/features/time-tracking/api/testing/in-memory-store";

const T0 = new Date("2026-03-01T10:00:00Z");
const T0_PLUS_90S = new Date("2026-03-01T10:01:30Z");
const T1 = new Date("2026-03-02T10:00:00Z");
const T1_PLUS_10S = new Date("2026-03-02T10:00:10Z");

async function seedProject(
  store: InMemoryCraftSessionStore,
  userId = "user-1",
): Promise<string> {
  const project = await createProject(
    userId,
    { name: "Bufanda", type: "knitting" },
    store.projects,
  );
  return project.id;
}

function projectTime(
  store: InMemoryCraftSessionStore,
  projectId: string,
): number | undefined {
  return store.projects.rows.find((row) => row.id === projectId)?.time;
}

describe("features/time-tracking calculateDuration", () => {
  it("returns whole seconds truncated downwards", () => {
    expect(calculateDuration(T0, T0_PLUS_90S)).toBe(90);
    expect(
      calculateDuration(T0, new Date("2026-03-01T10:00:01.999Z")),
    ).toBe(1);
  });

  it("never returns a negative duration when the clock goes backwards", () => {
    expect(calculateDuration(T0_PLUS_90S, T0)).toBe(0);
  });
});

describe("features/time-tracking startSession", () => {
  it("creates an open session with end = null and duration 0", async () => {
    const store = createInMemoryCraftSessionStore();
    const projectId = await seedProject(store);

    const { session, started } = await startSession(
      "user-1",
      projectId,
      store,
      T0,
    );

    expect(started).toBe(true);
    expect(session.end).toBeNull();
    expect(session.duration).toBe(0);
    expect(session.start).toEqual(T0);
    expect(session.projectId).toBe(projectId);
    expect(session.userId).toBe("user-1");
    expect(store.sessions).toHaveLength(1);
  });

  it("reuses the running session on a double start instead of opening a second one", async () => {
    const store = createInMemoryCraftSessionStore();
    const projectId = await seedProject(store);

    const first = await startSession("user-1", projectId, store, T0);
    const second = await startSession("user-1", projectId, store, T1);

    expect(second.started).toBe(false);
    expect(second.session.id).toBe(first.session.id);
    expect(second.session.start).toEqual(T0);
    expect(store.sessions).toHaveLength(1);
  });

  it("opens a new session once the previous one has been stopped", async () => {
    const store = createInMemoryCraftSessionStore();
    const projectId = await seedProject(store);

    await startSession("user-1", projectId, store, T0);
    await stopSession("user-1", projectId, store, T0_PLUS_90S);
    const reopened = await startSession("user-1", projectId, store, T1);

    expect(reopened.started).toBe(true);
    expect(store.sessions).toHaveLength(2);
  });

  it("hides another user's project behind ProjectNotFoundError", async () => {
    const store = createInMemoryCraftSessionStore();
    const projectId = await seedProject(store);

    await expect(
      startSession("user-2", projectId, store, T0),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect(store.sessions).toHaveLength(0);
  });
});

describe("features/time-tracking stopSession", () => {
  it("closes the session computing duration in seconds and caches Project.time", async () => {
    const store = createInMemoryCraftSessionStore();
    const projectId = await seedProject(store);
    await startSession("user-1", projectId, store, T0);

    const { session, time } = await stopSession(
      "user-1",
      projectId,
      store,
      T0_PLUS_90S,
    );

    expect(session.end).toEqual(T0_PLUS_90S);
    expect(session.duration).toBe(90);
    expect(time).toBe(90);
    expect(projectTime(store, projectId)).toBe(90);
  });

  it("accumulates Project.time as the sum of every session duration", async () => {
    const store = createInMemoryCraftSessionStore();
    const projectId = await seedProject(store);

    await startSession("user-1", projectId, store, T0);
    await stopSession("user-1", projectId, store, T0_PLUS_90S);
    await startSession("user-1", projectId, store, T1);
    const { time } = await stopSession("user-1", projectId, store, T1_PLUS_10S);

    expect(time).toBe(100);
    expect(projectTime(store, projectId)).toBe(100);
  });

  it("resyncs a drifted Project.time because it recomputes the sum", async () => {
    const store = createInMemoryCraftSessionStore();
    const projectId = await seedProject(store);
    await startSession("user-1", projectId, store, T0);
    await stopSession("user-1", projectId, store, T0_PLUS_90S);

    const index = store.projects.rows.findIndex((row) => row.id === projectId);
    const drifted = store.projects.rows[index];
    if (drifted) {
      store.projects.rows[index] = { ...drifted, time: 99999 };
    }

    await startSession("user-1", projectId, store, T1);
    const { time } = await stopSession("user-1", projectId, store, T1_PLUS_10S);

    expect(time).toBe(100);
    expect(projectTime(store, projectId)).toBe(100);
  });

  it("rejects a double stop with NoActiveSessionError and does not touch Project.time", async () => {
    const store = createInMemoryCraftSessionStore();
    const projectId = await seedProject(store);
    await startSession("user-1", projectId, store, T0);
    await stopSession("user-1", projectId, store, T0_PLUS_90S);

    await expect(
      stopSession("user-1", projectId, store, T1),
    ).rejects.toBeInstanceOf(NoActiveSessionError);
    expect(projectTime(store, projectId)).toBe(90);
    expect(store.sessions).toHaveLength(1);
  });

  it("rejects a stop without any previous start", async () => {
    const store = createInMemoryCraftSessionStore();
    const projectId = await seedProject(store);

    await expect(
      stopSession("user-1", projectId, store, T0),
    ).rejects.toBeInstanceOf(NoActiveSessionError);
    expect(projectTime(store, projectId)).toBe(0);
  });

  it("hides another user's project behind ProjectNotFoundError", async () => {
    const store = createInMemoryCraftSessionStore();
    const projectId = await seedProject(store);
    await startSession("user-1", projectId, store, T0);

    await expect(
      stopSession("user-2", projectId, store, T0_PLUS_90S),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
    expect(store.sessions[0]?.end).toBeNull();
  });

  it("keeps each project's time independent", async () => {
    const store = createInMemoryCraftSessionStore();
    const first = await seedProject(store);
    const second = await seedProject(store);

    await startSession("user-1", first, store, T0);
    await stopSession("user-1", first, store, T0_PLUS_90S);
    await startSession("user-1", second, store, T1);
    await stopSession("user-1", second, store, T1_PLUS_10S);

    expect(projectTime(store, first)).toBe(90);
    expect(projectTime(store, second)).toBe(10);
  });
});

describe("features/time-tracking listSessions", () => {
  it("returns the project history newest first", async () => {
    const store = createInMemoryCraftSessionStore();
    const projectId = await seedProject(store);

    await startSession("user-1", projectId, store, T0);
    await stopSession("user-1", projectId, store, T0_PLUS_90S);
    await startSession("user-1", projectId, store, T1);

    const history = await listSessions("user-1", projectId, store);

    expect(history).toHaveLength(2);
    expect(history[0]?.start).toEqual(T1);
    expect(history[0]?.end).toBeNull();
    expect(history[1]?.duration).toBe(90);
  });

  it("only returns the sessions of the requested project", async () => {
    const store = createInMemoryCraftSessionStore();
    const first = await seedProject(store);
    const second = await seedProject(store);

    await startSession("user-1", first, store, T0);
    await startSession("user-1", second, store, T1);

    const history = await listSessions("user-1", first, store);

    expect(history).toHaveLength(1);
    expect(history[0]?.projectId).toBe(first);
  });

  it("hides another user's project behind ProjectNotFoundError", async () => {
    const store = createInMemoryCraftSessionStore();
    const projectId = await seedProject(store);
    await startSession("user-1", projectId, store, T0);

    await expect(
      listSessions("user-2", projectId, store),
    ).rejects.toBeInstanceOf(ProjectNotFoundError);
  });
});

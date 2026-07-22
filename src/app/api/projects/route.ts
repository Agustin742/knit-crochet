import { NextResponse } from "next/server";

import {
  createProject,
  createProjectSchema,
  listProjects,
  projectFiltersSchema,
} from "@/features/projects";
import {
  readJsonBody,
  validationErrorResponse,
  withSession,
} from "@/shared/lib/http";

/** Un parámetro vacío (`?active=`) significa "sin filtro", no un valor inválido. */
function readFilters(request: Request): Record<string, string> {
  const entries = [...new URL(request.url).searchParams].filter(
    ([, value]) => value !== "",
  );
  return Object.fromEntries(entries);
}

export const GET = withSession(
  "GET /api/projects",
  async (userId: string, request: Request) => {
    const parsed = projectFiltersSchema.safeParse(readFilters(request));
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const projects = await listProjects(userId, parsed.data);
    return NextResponse.json({ projects }, { status: 200 });
  },
);

export const POST = withSession(
  "POST /api/projects",
  async (userId: string, request: Request) => {
    const parsed = createProjectSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    const project = await createProject(userId, parsed.data);
    return NextResponse.json({ project }, { status: 201 });
  },
);

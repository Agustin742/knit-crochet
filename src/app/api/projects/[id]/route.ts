import { NextResponse } from "next/server";

import {
  deleteProject,
  getProject,
  ProjectNotFoundError,
  projectIdSchema,
  updateProject,
  updateProjectSchema,
} from "@/features/projects";
import {
  errorResponse,
  readJsonBody,
  validationErrorResponse,
  withSession,
} from "@/shared/lib/http";

type RouteContext = { params: Promise<{ id: string }> };

const notFound = (): NextResponse => errorResponse("El proyecto no existe.", 404);

/** Un id con formato inválido no puede existir: se responde 404, no 400. */
async function readProjectId(context: RouteContext): Promise<string | null> {
  const { id } = await context.params;
  const parsed = projectIdSchema.safeParse(id);
  return parsed.success ? parsed.data : null;
}

export const GET = withSession(
  "GET /api/projects/:id",
  async (userId: string, _request: Request, context: RouteContext) => {
    const id = await readProjectId(context);
    if (!id) {
      return notFound();
    }

    try {
      const project = await getProject(userId, id);
      return NextResponse.json({ project }, { status: 200 });
    } catch (error) {
      if (error instanceof ProjectNotFoundError) {
        return errorResponse(error.message, 404);
      }
      throw error;
    }
  },
);

export const PATCH = withSession(
  "PATCH /api/projects/:id",
  async (userId: string, request: Request, context: RouteContext) => {
    const id = await readProjectId(context);
    if (!id) {
      return notFound();
    }

    const parsed = updateProjectSchema.safeParse(await readJsonBody(request));
    if (!parsed.success) {
      return validationErrorResponse(parsed.error);
    }

    try {
      const project = await updateProject(userId, id, parsed.data);
      return NextResponse.json({ project }, { status: 200 });
    } catch (error) {
      if (error instanceof ProjectNotFoundError) {
        return errorResponse(error.message, 404);
      }
      throw error;
    }
  },
);

export const DELETE = withSession(
  "DELETE /api/projects/:id",
  async (userId: string, _request: Request, context: RouteContext) => {
    const id = await readProjectId(context);
    if (!id) {
      return notFound();
    }

    try {
      await deleteProject(userId, id);
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      if (error instanceof ProjectNotFoundError) {
        return errorResponse(error.message, 404);
      }
      throw error;
    }
  },
);

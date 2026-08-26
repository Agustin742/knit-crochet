// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
} from "@/features/uploads/validation";

import {
  NETWORK_ERROR_MESSAGE,
  PATTERNS_ENDPOINT,
  PROJECTS_ENDPOINT,
  UPLOADS_IMAGE_ENDPOINT,
  UPLOAD_CREATED_STATUS,
  UPLOAD_FILE_FIELD,
  UPLOAD_IMAGE_REJECTED_MESSAGE,
  UPLOAD_PROVIDER_DOWN_MESSAGE,
  UPLOAD_UNAUTHORIZED_MESSAGE,
  UNEXPECTED_ERROR_MESSAGE,
  SESSION_CREATED_STATUS,
  createProject,
  deleteProject,
  getPatterns,
  getProjects,
  projectDetailEndpoint,
  sessionStartEndpoint,
  startCraftSession,
  updateProject,
  uploadProjectImage,
} from "./projects-client";
import type {
  SerializedPattern,
  SerializedProject,
  SerializedProjectListItem,
} from "./types";

/**
 * El CRUD de cliente del formulario de proyectos (enmienda **E6 (f)** y **(h)**
 * del RFC-03, #22 tanda 1).
 *
 * **Vive dentro de `projects-client.ts` a propósito.** La deuda 129 dice que el
 * cliente HTTP de navegador va por su **tercer clon** y que el momento natural de
 * extraerlo era antes de #22; bajo la moratoria de gates no interrumpe, pero
 * escribir el CRUD nuevo en un archivo aparte habría abierto un **cuarto** clon a
 * cambio de nada.
 *
 * Lo que se mide acá son los **contratos del backend que un error de cliente
 * rompe en silencio**: el 201 de creación y de subida, el 204 **sin cuerpo** del
 * borrado —donde `response.json()` lanza— y el `multipart/form-data` con el campo
 * `file`.
 */
const fetchSpy = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Un 500 que responde HTML, o un cuerpo truncado: pasa, y el cliente lo aguanta. */
function unreadableResponse(status: number): Response {
  return new Response("<!doctype html><html>vaya</html>", {
    status,
    headers: { "content-type": "text/html" },
  });
}

const PROYECTO = {
  id: "6f1c2a54-6c6e-4a58-9a1e-2b0f0a2a1111",
  name: "Cárdigan",
  type: "knitting",
} as unknown as SerializedProject;

const PATRON = {
  id: "b0d2c0f2-1111-4a58-9a1e-2b0f0a2a2222",
  name: "Punto arroz",
  type: "knitting",
  inLibrary: true,
} as unknown as SerializedPattern;

function ultimaLlamada(): [string, RequestInit | undefined] {
  const call = fetchSpy.mock.calls.at(-1);
  if (!call) {
    throw new Error("no se hizo ninguna petición");
  }
  return [String(call[0]), call[1] as RequestInit | undefined];
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
  fetchSpy.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createProject — el alta completa", () => {
  it("manda el formulario entero y devuelve el proyecto creado (201)", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(201, { project: PROYECTO }));

    const result = await createProject({
      name: "Cárdigan",
      type: "knitting",
      targetRounds: 40,
      needles: [4.5],
      notes: "Lana gruesa",
    });

    expect(result).toEqual({ ok: true, status: 201, data: PROYECTO });

    const [url, init] = ultimaLlamada();
    expect(url).toBe(PROJECTS_ENDPOINT);
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("same-origin");
    /* Los campos que el `createProject` del Dashboard no sabía mandar: su JSDoc
       decía literalmente que el resto era trabajo de #22. */
    expect(JSON.parse(String(init?.body))).toEqual({
      name: "Cárdigan",
      type: "knitting",
      targetRounds: 40,
      needles: [4.5],
      notes: "Lana gruesa",
    });
  });

  it("devuelve el mensaje del servidor cuando rechaza", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(400, { error: "El nombre es obligatorio." }),
    );

    const result = await createProject({ name: "", type: "knitting" });

    expect(result).toEqual({
      ok: false,
      status: 400,
      message: "El nombre es obligatorio.",
    });
  });

  it("sin red devuelve status 0, no una excepción", async () => {
    fetchSpy.mockRejectedValue(new Error("sin red"));

    await expect(
      createProject({ name: "Cárdigan", type: "knitting" }),
    ).resolves.toEqual({
      ok: false,
      status: 0,
      message: NETWORK_ERROR_MESSAGE,
    });
  });
});

describe("updateProject — el parche genérico", () => {
  it("manda PATCH con sólo los campos tocados y devuelve el proyecto (200)", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, { project: PROYECTO }));

    const result = await updateProject(PROYECTO.id, {
      name: "Cárdigan v2",
      notes: "",
    });

    expect(result).toEqual({ ok: true, status: 200, data: PROYECTO });

    const [url, init] = ultimaLlamada();
    expect(url).toBe(projectDetailEndpoint(PROYECTO.id));
    expect(init?.method).toBe("PATCH");
    /* Un parche genérico manda lo que le den: el que ya existía
       (`updateProjectTargetRounds`) sabía mandar UN solo campo. */
    expect(JSON.parse(String(init?.body))).toEqual({
      name: "Cárdigan v2",
      notes: "",
    });
  });

  it("propaga el error del servidor", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(404, { error: "No existe." }));

    const result = await updateProject(PROYECTO.id, { name: "x" });

    expect(result).toEqual({ ok: false, status: 404, message: "No existe." });
  });
});

describe("deleteProject — el 204 sin cuerpo", () => {
  /**
   * **El punto de todo este bloque.** `DELETE /api/projects/:id` responde **204
   * sin cuerpo**, y el camino feliz del ayudante normal llama a
   * `response.json()`, que sobre un 204 **lanza**: un borrado correcto se leería
   * como un fallo. Por eso reutiliza `requestWithoutBody`, que existe justo por
   * esto. El test manda una respuesta 204 de verdad, sin cuerpo.
   */
  it("borra y trata el 204 sin cuerpo como éxito", async () => {
    fetchSpy.mockResolvedValue(new Response(null, { status: 204 }));

    const result = await deleteProject(PROYECTO.id);

    expect(result).toEqual({ ok: true, status: 204, data: null });

    const [url, init] = ultimaLlamada();
    expect(url).toBe(projectDetailEndpoint(PROYECTO.id));
    expect(init?.method).toBe("DELETE");
  });

  it("un id inexistente responde 404 con su mensaje", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(404, { error: "El proyecto no existe." }),
    );

    const result = await deleteProject(PROYECTO.id);

    expect(result).toEqual({
      ok: false,
      status: 404,
      message: "El proyecto no existe.",
    });
  });
});

describe("getPatterns — la biblioteca para elegir", () => {
  it("sin filtros pide la lista entera y la desenvuelve", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, { patterns: [PATRON] }));

    const result = await getPatterns();

    expect(result).toEqual({ ok: true, status: 200, data: [PATRON] });
    expect(ultimaLlamada()[0]).toBe(PATTERNS_ENDPOINT);
  });

  it("manda los dos filtros que el endpoint acepta, como cadenas", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, { patterns: [] }));

    await getPatterns({ type: "crochet", inLibrary: true });

    const [url] = ultimaLlamada();
    const query = new URL(url, "https://kc.test").searchParams;
    expect(query.get("type")).toBe("crochet");
    /* El filtro es un `z.enum(["true","false"])` con transformación: `?inLibrary=1`
       responde 400. */
    expect(query.get("inLibrary")).toBe("true");
  });

  it("un filtro sin poner no viaja en la query", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, { patterns: [] }));

    await getPatterns({ inLibrary: false });

    const query = new URL(ultimaLlamada()[0], "https://kc.test").searchParams;
    expect(query.get("inLibrary")).toBe("false");
    expect(query.has("type")).toBe(false);
  });
});

describe("uploadProjectImage — el contrato de la subida (E6 h, deuda 60)", () => {
  function imagen(type = "image/png"): File {
    return new File(["bytes"], "cardigan.png", { type });
  }

  /**
   * **El aviso con ficha, medido.** El endpoint responde **201**, no 200
   * (`app/api/uploads/image/route.ts:44`). #22 es su **primer consumidor real
   * desde un navegador**, así que ésta es la primera vez que ese error puede
   * manifestarse de verdad.
   */
  it("trata el 201 como el éxito y devuelve la URL", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(UPLOAD_CREATED_STATUS, {
        url: "https://res.cloudinary.test/kc/u/1.png",
      }),
    );

    const result = await uploadProjectImage(imagen());

    expect(result).toEqual({
      ok: true,
      status: 201,
      data: "https://res.cloudinary.test/kc/u/1.png",
    });
    expect(UPLOAD_CREATED_STATUS).toBe(201);
  });

  /**
   * **Un 200 NO es el contrato.** Si el endpoint dejara de responder 201, esto
   * sale a la luz acá en vez de romperse en el navegador de alguien. Sin este
   * caso, un cliente escrito contra `response.ok` pasaría los tests igual.
   */
  it("un 200 no se acepta como subida hecha", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(200, { url: "https://res.cloudinary.test/kc/u/1.png" }),
    );

    const result = await uploadProjectImage(imagen());

    expect(result.ok).toBe(false);
  });

  it("manda multipart con el campo `file` y sin fijar el tipo de contenido", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(201, { url: "https://res.cloudinary.test/kc/u/1.png" }),
    );

    const archivo = imagen();
    await uploadProjectImage(archivo);

    const [url, init] = ultimaLlamada();
    expect(url).toBe(UPLOADS_IMAGE_ENDPOINT);
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("same-origin");

    const body = init?.body;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get(UPLOAD_FILE_FIELD)).toBe(archivo);
    expect(UPLOAD_FILE_FIELD).toBe("file");

    /* Fijar el tipo de contenido a mano rompe el multipart: el navegador tiene
       que poner el suyo CON la frontera, que sólo él conoce. Un servidor que no
       encuentra la frontera responde 400 y el fallo parece del archivo. */
    expect(init?.headers).toBeUndefined();
  });

  it("un formato o un tamaño rechazados devuelven el motivo del servidor", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(400, { error: "Formato no admitido. Usa image/jpeg." }),
    );

    const result = await uploadProjectImage(imagen("image/gif"));

    expect(result).toEqual({
      ok: false,
      status: 400,
      message: "Formato no admitido. Usa image/jpeg.",
    });
  });

  /**
   * Los tres estados que el usuario va a ver. Cuando el cuerpo no se puede leer
   * —un 500 que responde HTML, o un cuerpo truncado— el mensaje genérico no
   * ayuda a nadie: cada status trae el suyo.
   */
  it("con el cuerpo ilegible, cada status trae un mensaje que dice qué hacer", async () => {
    const casos: [number, string][] = [
      [400, UPLOAD_IMAGE_REJECTED_MESSAGE],
      [401, UPLOAD_UNAUTHORIZED_MESSAGE],
      [502, UPLOAD_PROVIDER_DOWN_MESSAGE],
    ];

    for (const [status, message] of casos) {
      fetchSpy.mockResolvedValue(unreadableResponse(status));
      await expect(uploadProjectImage(imagen())).resolves.toEqual({
        ok: false,
        status,
        message,
      });
      expect(message).not.toBe(UNEXPECTED_ERROR_MESSAGE);
    }
  });

  /** El mensaje del rechazo NOMBRA los límites reales, y los saca del servidor. */
  it("el mensaje de rechazo nombra los formatos y el tamaño de verdad", () => {
    for (const tipo of ACCEPTED_IMAGE_TYPES) {
      const extension = tipo.split("/")[1] ?? "";
      expect(UPLOAD_IMAGE_REJECTED_MESSAGE.toLowerCase()).toContain(extension);
    }
    expect(UPLOAD_IMAGE_REJECTED_MESSAGE).toContain(
      String(MAX_IMAGE_BYTES / (1024 * 1024)),
    );
  });

  it("sin red devuelve status 0, no una excepción", async () => {
    fetchSpy.mockRejectedValue(new Error("sin red"));

    await expect(uploadProjectImage(imagen())).resolves.toEqual({
      ok: false,
      status: 0,
      message: NETWORK_ERROR_MESSAGE,
    });
  });
});

/**
 * El cronómetro que llega con la lista y el que devuelve arrancar (E7 b3/b1).
 *
 * Lo que se mide acá es **lo que el cliente desenvuelve**: sin esto, la tarjeta
 * no puede saber si el cronómetro corre, que es la causa raíz de la deuda 186.
 */
describe("getProjects — la lista trae el cronómetro (E7 b3)", () => {
  const CORRIENDO = {
    ...(PROYECTO as unknown as Record<string, unknown>),
    activeSession: {
      id: "9a1e2b0f-0a2a-4a58-9a1e-2b0f0a2a3333",
      start: "2026-08-26T10:00:00.000Z",
    },
  } as unknown as SerializedProjectListItem;

  it("desenvuelve la lista conservando la sesión abierta de cada proyecto", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, { projects: [CORRIENDO] }));

    const result = await getProjects({ active: true });

    expect(result.ok).toBe(true);
    expect(result.ok ? result.data[0]?.activeSession : null).toEqual({
      id: "9a1e2b0f-0a2a-4a58-9a1e-2b0f0a2a3333",
      start: "2026-08-26T10:00:00.000Z",
    });
  });

  it("conserva el null del proyecto parado en vez de convertirlo en undefined", async () => {
    fetchSpy.mockResolvedValue(
      jsonResponse(200, {
        projects: [{ ...CORRIENDO, activeSession: null }],
      }),
    );

    const result = await getProjects({ active: true });

    expect(result.ok ? result.data[0]?.activeSession : undefined).toBeNull();
  });
});

describe("startCraftSession — devuelve la sesión que arrancó (E7 b1)", () => {
  const SESION = {
    id: "9a1e2b0f-0a2a-4a58-9a1e-2b0f0a2a4444",
    projectId: PROYECTO.id,
    start: "2026-08-26T10:00:00.000Z",
    end: null,
    duration: 0,
  };

  it("desenvuelve la sesión del 201 (la arrancó el usuario)", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(201, { session: SESION }));

    const result = await startCraftSession(PROYECTO.id);

    expect(result).toEqual({
      ok: true,
      status: SESSION_CREATED_STATUS,
      data: SESION,
    });
  });

  // El 200 es "ya había una abierta y te devuelvo ESA": su `start` es el de
  // antes, no el de ahora, y es justo lo que deja el reloj de la tarjeta en el
  // segundo real en vez de en cero.
  it("desenvuelve también la sesión reutilizada del 200, con su arranque viejo", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(200, { session: SESION }));

    const result = await startCraftSession(PROYECTO.id);

    expect(result.ok ? result.status : null).toBe(200);
    expect(result.ok ? result.data.start : null).toBe(
      "2026-08-26T10:00:00.000Z",
    );
  });

  it("sin cuerpo que enviar: el esquema del endpoint rechaza cualquier campo", async () => {
    fetchSpy.mockResolvedValue(jsonResponse(201, { session: SESION }));

    await startCraftSession(PROYECTO.id);

    const [url, init] = ultimaLlamada();
    expect(url).toBe(sessionStartEndpoint(PROYECTO.id));
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeUndefined();
  });
});

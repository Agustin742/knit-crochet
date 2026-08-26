// @vitest-environment happy-dom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { axe } from "vitest-axe";

import { MAX_IMAGE_BYTES } from "@/features/uploads/validation";

import { ProjectFormDialog } from "./ProjectFormDialog";
import {
  CREATE_SUBMIT_LABEL,
  EDIT_SUBMIT_LABEL,
  FORM_CANCEL_LABEL,
  FORM_FIELD_LABELS,
  NAME_REQUIRED_ERROR,
  NEEDLES_ADD_BUTTON_LABEL,
  NEEDLES_ADD_LABEL,
  NO_PATTERN_OPTION_LABEL,
  PATTERNS_EMPTY,
  PATTERNS_UNAVAILABLE,
  PHOTO_REMOVE_LABEL,
  PHOTO_STATUS_REGION_LABEL,
  PHOTO_UPLOADING,
  createFormTitle,
  editFormTitle,
  patternOptionLabel,
} from "./project-form";
import { TARGET_ROUNDS_ERROR } from "./project-detail";
import {
  PATTERNS_ENDPOINT,
  PROJECTS_ENDPOINT,
  UPLOADS_IMAGE_ENDPOINT,
  UPLOAD_FILE_FIELD,
  UPLOAD_PROVIDER_DOWN_MESSAGE,
  UPLOAD_UNAUTHORIZED_MESSAGE,
  projectDetailEndpoint,
} from "./projects-client";
import { CRAFT_TYPE_LABELS } from "./project-filters";
import { needleOptionLabel } from "./ProjectsToolbar";
import type { SerializedPattern, SerializedProject } from "./types";

const fetchSpy = vi.fn();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function project(patch: Partial<SerializedProject> = {}): SerializedProject {
  return {
    id: "bufanda",
    userId: "u",
    name: "Bufanda",
    image: null,
    type: "knitting",
    status: "in_progress",
    rounds: 12,
    targetRounds: 40,
    progress: 30,
    needles: [4],
    startDate: "2026-01-01T00:00:00.000Z",
    endDate: null,
    time: 0,
    patternId: null,
    completedSteps: [],
    notes: "Con lana gruesa",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...patch,
  };
}

const GORRO: SerializedPattern = {
  id: "3f1c4d3a-1111-4111-8111-111111111111",
  userId: "u",
  name: "Gorro básico",
  image: null,
  type: "crochet",
  instructions: [],
  metadata: [],
  inLibrary: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

type Scenario = {
  patterns?: SerializedPattern[];
  patternsStatus?: number;
  saveStatus?: number;
  saveError?: string;
  uploadStatus?: number;
  uploadBody?: unknown;
};

function serve(next: Scenario = {}) {
  fetchSpy.mockImplementation((url: string) => {
    const target = String(url);

    if (target.startsWith(UPLOADS_IMAGE_ENDPOINT)) {
      const status = next.uploadStatus ?? 201;
      return Promise.resolve(
        jsonResponse(
          status,
          next.uploadBody ?? (status === 201 ? { url: UPLOADED_URL } : {}),
        ),
      );
    }
    if (target.startsWith(PATTERNS_ENDPOINT)) {
      const status = next.patternsStatus ?? 200;
      return Promise.resolve(
        status === 200
          ? jsonResponse(200, { patterns: next.patterns ?? [GORRO] })
          : jsonResponse(status, { error: "roto" }),
      );
    }
    if (target.startsWith(PROJECTS_ENDPOINT)) {
      const status = next.saveStatus ?? 201;
      return Promise.resolve(
        status === 201 || status === 200
          ? jsonResponse(status, { project: project({ id: "nuevo" }) })
          : jsonResponse(status, { error: next.saveError ?? "roto" }),
      );
    }
    throw new Error(`URL inesperada en el test: ${target}`);
  });
}

const UPLOADED_URL = "https://res.cloudinary.com/demo/foto.png";

/** Las llamadas que salieron de verdad, con su método y su cuerpo. */
function calls(prefix: string): { url: string; init?: RequestInit }[] {
  /* Los argumentos del espía son `any[]`, o sea una lista de longitud
     desconocida: desestructurarla como tupla de dos no compila. Se leen por
     índice y se tipa lo que se lee. */
  return fetchSpy.mock.calls
    .map((call) => ({
      url: String(call[0]),
      init: call[1] as RequestInit | undefined,
    }))
    .filter((call) => call.url.startsWith(prefix));
}

function saveCalls(): { url: string; init?: RequestInit }[] {
  return calls(PROJECTS_ENDPOINT).filter(
    (call) => call.init?.method === "POST" || call.init?.method === "PATCH",
  );
}

function bodyOf(call: { init?: RequestInit }): Record<string, unknown> {
  return JSON.parse(String(call.init?.body ?? "{}")) as Record<string, unknown>;
}

function dialog(): HTMLElement {
  return screen.getByRole("dialog");
}

/** Espera a que la biblioteca de patrones termine de llegar. */
async function ready() {
  await waitFor(() => {
    expect(
      screen.queryByLabelText(FORM_FIELD_LABELS.pattern) ??
        screen.queryByText(PATTERNS_UNAVAILABLE) ??
        screen.queryByText(PATTERNS_EMPTY),
    ).not.toBeNull();
  });
}

async function renderCreate(next: Scenario = {}, onSaved = vi.fn(), onClose = vi.fn()) {
  serve(next);
  const view = render(
    <ProjectFormDialog
      target={{ mode: "create", type: "knitting" }}
      onClose={onClose}
      onSaved={onSaved}
    />,
  );
  await ready();
  return { ...view, onSaved, onClose };
}

async function renderEdit(
  source: SerializedProject = project(),
  next: Scenario = {},
  onSaved = vi.fn(),
  onClose = vi.fn(),
) {
  serve({ saveStatus: 200, ...next });
  const view = render(
    <ProjectFormDialog
      target={{ mode: "edit", project: source }}
      onClose={onClose}
      onSaved={onSaved}
    />,
  );
  await ready();
  return { ...view, onSaved, onClose };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
});

afterEach(() => {
  cleanup();
  fetchSpy.mockReset();
  vi.unstubAllGlobals();
  const leftover = document.documentElement.style.overflow;
  document.documentElement.style.overflow = "";
  expect(leftover, "algo se fue sin soltar el bloqueo de scroll").toBe("");
});

describe("ProjectFormDialog — sin objetivo no existe", () => {
  /**
   * Ciclo de vida copiado del cajón de #21: **el hijo no tiene estado `open`** y
   * devuelve `null` sin dato. Así "qué estoy editando" vive en un solo sitio.
   */
  it("no pinta nada cuando no hay nada que editar ni crear", () => {
    serve();
    render(<ProjectFormDialog target={null} onClose={vi.fn()} onSaved={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("ProjectFormDialog — el alta (RFC-03 §2)", () => {
  it("monta los siete campos del formulario", async () => {
    await renderCreate();

    const form = dialog();
    expect(
      within(form).getByLabelText(FORM_FIELD_LABELS.name),
    ).toBeInTheDocument();
    expect(
      within(form).getByLabelText(FORM_FIELD_LABELS.type),
    ).toBeInTheDocument();
    expect(
      within(form).getByLabelText(FORM_FIELD_LABELS.targetRounds),
    ).toBeInTheDocument();
    expect(
      within(form).getByRole("group", { name: FORM_FIELD_LABELS.needles }),
    ).toBeInTheDocument();
    expect(
      within(form).getByLabelText(FORM_FIELD_LABELS.image),
    ).toBeInTheDocument();
    expect(
      within(form).getByLabelText(FORM_FIELD_LABELS.pattern),
    ).toBeInTheDocument();
    expect(
      within(form).getByLabelText(FORM_FIELD_LABELS.notes),
    ).toBeInTheDocument();
  });

  /** El botón de origen ya decidió el tipo: el título lo confirma. */
  it("el título nombra la clase de tejido que eligió el botón", async () => {
    await renderCreate();

    expect(
      screen.getByRole("heading", { name: createFormTitle("knitting") }),
    ).toBeInTheDocument();
  });

  it("preselecciona el tipo del botón de origen", async () => {
    await renderCreate();

    expect(screen.getByLabelText(FORM_FIELD_LABELS.type)).toHaveValue(
      "knitting",
    );
  });

  /** Un formulario quiere el primer campo, no el panel (`initialFocusRef`). */
  it("el foco inicial cae en el nombre", async () => {
    await renderCreate();

    await waitFor(() => {
      expect(screen.getByLabelText(FORM_FIELD_LABELS.name)).toHaveFocus();
    });
  });

  it("manda el formulario entero y avisa con el proyecto que devolvió el servidor", async () => {
    const user = userEvent.setup();
    const { onSaved } = await renderCreate();

    await user.type(
      screen.getByLabelText(FORM_FIELD_LABELS.name),
      "Bufanda de invierno",
    );
    await user.selectOptions(
      screen.getByLabelText(FORM_FIELD_LABELS.type),
      "crochet",
    );
    await user.type(screen.getByLabelText(FORM_FIELD_LABELS.targetRounds), "40");
    await user.type(screen.getByLabelText(FORM_FIELD_LABELS.notes), "Lana gruesa");
    await user.selectOptions(screen.getByLabelText(NEEDLES_ADD_LABEL), "4");
    await user.click(screen.getByRole("button", { name: NEEDLES_ADD_BUTTON_LABEL }));
    await user.click(screen.getByRole("button", { name: CREATE_SUBMIT_LABEL }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });

    const sent = saveCalls();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.init?.method).toBe("POST");
    expect(bodyOf(sent[0] ?? {})).toEqual({
      name: "Bufanda de invierno",
      type: "crochet",
      targetRounds: 40,
      needles: [4],
      notes: "Lana gruesa",
      image: null,
      patternId: null,
    });
    expect(onSaved).toHaveBeenCalledWith(project({ id: "nuevo" }));
  });

  /**
   * La meta vacía es **cero**, no un error: es el default de la tabla y el
   * estado inicial de todo proyecto nuevo.
   */
  it("sin meta manda cero", async () => {
    const user = userEvent.setup();
    await renderCreate();

    await user.type(screen.getByLabelText(FORM_FIELD_LABELS.name), "Bufanda");
    await user.click(screen.getByRole("button", { name: CREATE_SUBMIT_LABEL }));

    await waitFor(() => {
      expect(saveCalls()).toHaveLength(1);
    });
    expect(bodyOf(saveCalls()[0] ?? {}).targetRounds).toBe(0);
  });

  it("el error del servidor se ve y el modal no se cierra", async () => {
    const user = userEvent.setup();
    const { onSaved, onClose } = await renderCreate({
      saveStatus: 409,
      saveError: "Ya tenés un proyecto con ese nombre.",
    });

    await user.type(screen.getByLabelText(FORM_FIELD_LABELS.name), "Bufanda");
    await user.click(screen.getByRole("button", { name: CREATE_SUBMIT_LABEL }));

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Ya tenés un proyecto con ese nombre.");
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("ProjectFormDialog — la validación es la del endpoint (deuda 38)", () => {
  it("sin nombre no sale a la red, lo dice y devuelve el foco al campo", async () => {
    const user = userEvent.setup();
    await renderCreate();

    await user.click(screen.getByRole("button", { name: CREATE_SUBMIT_LABEL }));

    expect(screen.getByText(NAME_REQUIRED_ERROR)).toBeInTheDocument();
    expect(screen.getByLabelText(FORM_FIELD_LABELS.name)).toHaveFocus();
    expect(saveCalls()).toHaveLength(0);
  });

  /**
   * Las vueltas se cuentan enteras. Se comprueba antes de salir porque un 400 de
   * validación se leería como "algo salió mal".
   */
  it("con una meta que no es un entero no sale a la red y enfoca la meta", async () => {
    const user = userEvent.setup();
    await renderCreate();

    await user.type(screen.getByLabelText(FORM_FIELD_LABELS.name), "Bufanda");
    await user.type(screen.getByLabelText(FORM_FIELD_LABELS.targetRounds), "4,5");
    await user.click(screen.getByRole("button", { name: CREATE_SUBMIT_LABEL }));

    expect(screen.getByText(TARGET_ROUNDS_ERROR)).toBeInTheDocument();
    expect(screen.getByLabelText(FORM_FIELD_LABELS.targetRounds)).toHaveFocus();
    expect(saveCalls()).toHaveLength(0);
  });
});

describe("ProjectFormDialog — la edición", () => {
  it("el título nombra el proyecto y los campos vienen rellenos", async () => {
    await renderEdit();

    expect(
      screen.getByRole("heading", { name: editFormTitle("Bufanda") }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(FORM_FIELD_LABELS.name)).toHaveValue("Bufanda");
    expect(screen.getByLabelText(FORM_FIELD_LABELS.targetRounds)).toHaveValue("40");
    expect(screen.getByLabelText(FORM_FIELD_LABELS.notes)).toHaveValue(
      "Con lana gruesa",
    );
    expect(screen.getByText(needleOptionLabel(4))).toBeInTheDocument();
  });

  /**
   * **Sólo lo tocado.** Mandar el formulario entero pisaría con el valor del
   * formulario lo que otra pantalla haya cambiado mientras el modal estaba
   * abierto — y el tab Progreso mueve la meta desde el cajón que hay detrás.
   */
  it("manda sólo el campo que cambió", async () => {
    const user = userEvent.setup();
    const { onSaved } = await renderEdit();

    await user.clear(screen.getByLabelText(FORM_FIELD_LABELS.name));
    await user.type(screen.getByLabelText(FORM_FIELD_LABELS.name), "Bufanda larga");
    await user.click(screen.getByRole("button", { name: EDIT_SUBMIT_LABEL }));

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledTimes(1);
    });

    const sent = saveCalls();
    expect(sent).toHaveLength(1);
    expect(sent[0]?.url).toBe(projectDetailEndpoint("bufanda"));
    expect(sent[0]?.init?.method).toBe("PATCH");
    expect(bodyOf(sent[0] ?? {})).toEqual({ name: "Bufanda larga" });
  });

  /**
   * Un parche vacío responde **400** ("No hay nada que actualizar."), así que
   * guardar sin tocar nada tiene que cerrar, no enseñar un error.
   */
  it("guardar sin tocar nada cierra sin salir a la red", async () => {
    const user = userEvent.setup();
    const { onClose, onSaved } = await renderEdit();

    await user.click(screen.getByRole("button", { name: EDIT_SUBMIT_LABEL }));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(saveCalls()).toHaveLength(0);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("quitar la foto manda el nulo, no la omisión", async () => {
    const user = userEvent.setup();
    await renderEdit(project({ image: UPLOADED_URL }));

    await user.click(screen.getByRole("button", { name: PHOTO_REMOVE_LABEL }));
    await user.click(screen.getByRole("button", { name: EDIT_SUBMIT_LABEL }));

    await waitFor(() => {
      expect(saveCalls()).toHaveLength(1);
    });
    expect(bodyOf(saveCalls()[0] ?? {})).toEqual({ image: null });
  });
});

describe("ProjectFormDialog — la foto, cableada de verdad (E6 h)", () => {
  function imageFile(name = "foto.png", type = "image/png"): File {
    return new File(["contenido"], name, { type });
  }

  it("sube en multipart al endpoint compartido y guarda la URL en el alta", async () => {
    const user = userEvent.setup();
    await renderCreate();

    await user.upload(
      screen.getByLabelText(FORM_FIELD_LABELS.image),
      imageFile(),
    );
    await waitFor(() => {
      expect(calls(UPLOADS_IMAGE_ENDPOINT)).toHaveLength(1);
    });

    const upload = calls(UPLOADS_IMAGE_ENDPOINT)[0];
    expect(upload?.init?.method).toBe("POST");
    const body = upload?.init?.body;
    expect(body).toBeInstanceOf(FormData);
    expect((body as FormData).get(UPLOAD_FILE_FIELD)).toBeInstanceOf(File);
    /* El navegador tiene que poner su propia cabecera CON la frontera del
       multipart: fijarla a mano deja al servidor sin frontera. */
    expect(upload?.init?.headers).toBeUndefined();

    await user.type(screen.getByLabelText(FORM_FIELD_LABELS.name), "Bufanda");
    await user.click(screen.getByRole("button", { name: CREATE_SUBMIT_LABEL }));

    await waitFor(() => {
      expect(saveCalls()).toHaveLength(1);
    });
    expect(bodyOf(saveCalls()[0] ?? {}).image).toBe(UPLOADED_URL);
  });

  /** Mientras sube, el estado **se ve** además de anunciarse (enmienda E2 d). */
  it("anuncia y muestra que la foto está subiendo", async () => {
    const user = userEvent.setup();
    /* La subida se deja colgada a propósito para poder mirar la pantalla a
       mitad. El resolvedor se guarda en una LISTA y no en una variable suelta:
       TypeScript no sigue una asignación hecha dentro de una función que todavía
       no ha corrido, así que la variable se quedaba estrechada a `null` y
       llamarla no compilaba. La lista además conserva el modo de fallo — si la
       subida nunca sale, el test revienta en vez de pasar de largo. */
    const uploadResolvers: ((response: Response) => void)[] = [];
    serve();
    fetchSpy.mockImplementation((url: string) => {
      if (String(url).startsWith(UPLOADS_IMAGE_ENDPOINT)) {
        return new Promise<Response>((resolve) => {
          uploadResolvers.push(resolve);
        });
      }
      return Promise.resolve(jsonResponse(200, { patterns: [GORRO] }));
    });
    render(
      <ProjectFormDialog
        target={{ mode: "create", type: "knitting" }}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    await ready();

    await user.upload(
      screen.getByLabelText(FORM_FIELD_LABELS.image),
      imageFile(),
    );

    const region = screen.getByRole("status", {
      name: PHOTO_STATUS_REGION_LABEL,
    });
    await waitFor(() => {
      expect(region).toHaveTextContent(PHOTO_UPLOADING);
    });
    expect(region.className.split(/\s+/)).not.toContain("sr-only");

    const resolveUpload = uploadResolvers[0];
    if (resolveUpload === undefined) {
      throw new Error("la subida no llegó a salir");
    }
    resolveUpload(jsonResponse(201, { url: UPLOADED_URL }));
    await waitFor(() => {
      expect(region).toHaveTextContent("");
    });
  });

  /**
   * **Los tres estados que el usuario puede ver.** El 400 llega con el motivo
   * del servidor (dice si falló el formato o el peso); el 401 y el 502 tienen su
   * propio repliegue porque el status ya dice qué hacer.
   */
  it("enseña el motivo del servidor cuando rechaza la imagen (400)", async () => {
    const user = userEvent.setup();
    await renderCreate({
      uploadStatus: 400,
      uploadBody: { error: "Formato no admitido. Usa image/jpeg, image/png, image/webp." },
    });

    await user.upload(
      screen.getByLabelText(FORM_FIELD_LABELS.image),
      imageFile("foto.png", "image/png"),
    );

    expect(
      await screen.findByText(
        "Formato no admitido. Usa image/jpeg, image/png, image/webp.",
      ),
    ).toBeInTheDocument();
  });

  it("dice que caducó la sesión con un 401", async () => {
    const user = userEvent.setup();
    await renderCreate({ uploadStatus: 401, uploadBody: {} });

    await user.upload(
      screen.getByLabelText(FORM_FIELD_LABELS.image),
      imageFile(),
    );

    expect(
      await screen.findByText(UPLOAD_UNAUTHORIZED_MESSAGE),
    ).toBeInTheDocument();
  });

  it("distingue el proveedor caído (502) del archivo malo", async () => {
    const user = userEvent.setup();
    await renderCreate({ uploadStatus: 502, uploadBody: {} });

    await user.upload(
      screen.getByLabelText(FORM_FIELD_LABELS.image),
      imageFile(),
    );

    expect(
      await screen.findByText(UPLOAD_PROVIDER_DOWN_MESSAGE),
    ).toBeInTheDocument();
  });

  /**
   * El archivo se valida con el **mismo esquema del endpoint**
   * (`uploadImageInputSchema`), así que lo que no puede pasar **no sale a la
   * red**: subir cuatro megas para que te digan que no es un viaje regalado, y
   * más en datos móviles. El mensaje es literalmente el del servidor.
   */
  it("un archivo demasiado grande se rechaza sin salir a la red", async () => {
    const user = userEvent.setup();
    await renderCreate();
    const enorme = new File(
      [new Uint8Array(MAX_IMAGE_BYTES + 1)],
      "enorme.png",
      { type: "image/png" },
    );

    await user.upload(screen.getByLabelText(FORM_FIELD_LABELS.image), enorme);

    expect(
      await screen.findByText(/supera el máximo de 4 MB/),
    ).toBeInTheDocument();
    expect(calls(UPLOADS_IMAGE_ENDPOINT)).toHaveLength(0);
  });

  it("el error de la foto devuelve el foco al selector de archivo", async () => {
    const user = userEvent.setup();
    await renderCreate({ uploadStatus: 502, uploadBody: {} });

    await user.upload(
      screen.getByLabelText(FORM_FIELD_LABELS.image),
      imageFile(),
    );

    await waitFor(() => {
      expect(screen.getByLabelText(FORM_FIELD_LABELS.image)).toHaveFocus();
    });
  });

  it("sin foto no ofrece quitarla", async () => {
    await renderCreate();

    expect(
      screen.queryByRole("button", { name: PHOTO_REMOVE_LABEL }),
    ).not.toBeInTheDocument();
  });
});

describe("ProjectFormDialog — el patrón se ELIGE de biblioteca (E6 a)", () => {
  it("pide sólo los de biblioteca y los ofrece con su clase de tejido", async () => {
    await renderCreate();

    expect(calls(PATTERNS_ENDPOINT)[0]?.url).toContain("inLibrary=true");
    const options = within(screen.getByLabelText(FORM_FIELD_LABELS.pattern))
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).toEqual([NO_PATTERN_OPTION_LABEL, patternOptionLabel(GORRO)]);
  });

  it("manda el patrón elegido", async () => {
    const user = userEvent.setup();
    await renderCreate();

    await user.type(screen.getByLabelText(FORM_FIELD_LABELS.name), "Gorro");
    await user.selectOptions(
      screen.getByLabelText(FORM_FIELD_LABELS.pattern),
      GORRO.id,
    );
    await user.click(screen.getByRole("button", { name: CREATE_SUBMIT_LABEL }));

    await waitFor(() => {
      expect(saveCalls()).toHaveLength(1);
    });
    expect(bodyOf(saveCalls()[0] ?? {}).patternId).toBe(GORRO.id);
  });

  it("una biblioteca vacía se dice, y no se pinta un desplegable sin nada", async () => {
    await renderCreate({ patterns: [] });

    expect(screen.getByText(PATTERNS_EMPTY)).toBeInTheDocument();
    expect(
      screen.queryByLabelText(FORM_FIELD_LABELS.pattern),
    ).not.toBeInTheDocument();
  });

  /**
   * **No poder traer la biblioteca no es tenerla vacía** (criterio de E2 e). Y lo
   * que importa de verdad: editando, `patternId` **no viaja en el parche**, así
   * que un fallo de la biblioteca no le borra el patrón a nadie.
   */
  it("una biblioteca que falló se dice, y editar no pierde el patrón", async () => {
    const user = userEvent.setup();
    await renderEdit(project({ patternId: GORRO.id }), { patternsStatus: 500 });

    expect(screen.getByText(PATTERNS_UNAVAILABLE)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(FORM_FIELD_LABELS.name));
    await user.type(screen.getByLabelText(FORM_FIELD_LABELS.name), "Otro");
    await user.click(screen.getByRole("button", { name: EDIT_SUBMIT_LABEL }));

    await waitFor(() => {
      expect(saveCalls()).toHaveLength(1);
    });
    expect(bodyOf(saveCalls()[0] ?? {})).toEqual({ name: "Otro" });
  });

  it("el tipo elegido NO filtra la biblioteca", async () => {
    const user = userEvent.setup();
    await renderCreate();

    await user.selectOptions(
      screen.getByLabelText(FORM_FIELD_LABELS.type),
      "knitting",
    );

    expect(
      within(screen.getByLabelText(FORM_FIELD_LABELS.pattern)).getByRole(
        "option",
        { name: patternOptionLabel(GORRO) },
      ),
    ).toBeInTheDocument();
    expect(patternOptionLabel(GORRO)).toContain(CRAFT_TYPE_LABELS.crochet);
  });
});

describe("ProjectFormDialog — salir sin guardar", () => {
  it("cancelar cierra sin pedir nada al servidor", async () => {
    const user = userEvent.setup();
    const { onClose } = await renderCreate();

    await user.click(screen.getByRole("button", { name: FORM_CANCEL_LABEL }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(saveCalls()).toHaveLength(0);
  });

  it("Escape cierra", async () => {
    const user = userEvent.setup();
    const { onClose } = await renderCreate();

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ProjectFormDialog — accesibilidad", () => {
  it("no tiene violaciones de axe en el alta", async () => {
    // `baseElement` y no `container`: el modal vive en un portal al `body`.
    const { baseElement } = await renderCreate();

    await expect(axe(baseElement)).resolves.toHaveNoViolations();
  });

  it("no tiene violaciones de axe editando, con foto y patrón", async () => {
    const { baseElement } = await renderEdit(
      project({ image: UPLOADED_URL, patternId: GORRO.id, needles: [4, 5] }),
    );

    await expect(axe(baseElement)).resolves.toHaveNoViolations();
  });
});

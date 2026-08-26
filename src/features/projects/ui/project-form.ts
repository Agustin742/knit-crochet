import type { UpdateProjectPayload } from "@/features/projects/validation";
import { NEEDLE_SIZES, type CraftType } from "@/shared/config";

import { CRAFT_TYPE_LABELS } from "./project-filters";
import { needleOptionLabel } from "./ProjectsToolbar";
import type { SerializedPattern, SerializedProject } from "./types";

/**
 * Copia y helpers puros del **modal de crear/editar** (RFC-03 §2, enmienda
 * **E6**).
 *
 * Viven aparte del componente por lo mismo que `project-detail.ts` y
 * `project-filters.ts`: son datos y funciones sin estado, se prueban sin montar
 * nada, y los tests **importan los textos en vez de reescribirlos**.
 *
 * `UpdateProjectPayload` se importa **como tipo y por ruta interna**, no por el
 * barrel del feature: el barrel arrastra `./api` → Drizzle al bundle del
 * navegador (mismo motivo, escrito entero, que en `NewProjectDialog.tsx`).
 * `import type` se borra en la compilación, así que no cuesta un byte.
 */

/* ---------------------------------------------------------------------------
   Copia
   --------------------------------------------------------------------------- */

/** Las siete etiquetas del formulario (RFC-03 §2). La UI va en español. */
export const FORM_FIELD_LABELS = {
  name: "Nombre del proyecto",
  type: "Tipo de tejido",
  targetRounds: "Meta de vueltas",
  needles: "Agujas",
  notes: "Notas",
  image: "Foto del proyecto",
  pattern: "Patrón",
} as const;

export const CREATE_SUBMIT_LABEL = "Crear proyecto";
export const EDIT_SUBMIT_LABEL = "Guardar cambios";
export const FORM_CANCEL_LABEL = "Cancelar";

/**
 * El título del alta nombra **la clase de tejido que eligió el botón de origen**,
 * igual que el del Dashboard: el tipo ya está decidido antes de abrir, y
 * repetirlo en el título es lo que confirma que se abrió el que se quería.
 */
export function createFormTitle(type: CraftType): string {
  return `Nuevo proyecto de ${CRAFT_TYPE_LABELS[type].toLowerCase()}`;
}

/**
 * El título de la edición nombra **el proyecto**. El modal se abre encima del
 * cajón de detalle, así que un "Editar proyecto" genérico obligaría a mirar
 * detrás del velo para saber sobre qué se está escribiendo.
 */
export function editFormTitle(name: string): string {
  return `Editar ${name}`;
}

export const NAME_REQUIRED_ERROR = "El nombre es obligatorio.";

/* --- Agujas (E6 e) --------------------------------------------------------- */

export const NEEDLES_ADD_LABEL = "Añadir una aguja";
export const NEEDLES_ADD_BUTTON_LABEL = "Añadir";
export const NEEDLES_EMPTY = "Todavía no anotaste ninguna aguja.";
/**
 * **Lo que se dice cuando ya no queda nada que ofrecer**, que en esta pantalla
 * es "anotaste todas las medidas del catálogo" y **no** "llegaste al tope": el
 * catálogo tiene diecisiete medidas y el tope del esquema son veinte, así que
 * por la interfaz el tope es **inalcanzable**. Decir "el máximo" sería nombrar
 * un límite que nadie puede tocar.
 */
export const NEEDLES_FULL_HINT = "Ya anotaste todas las medidas.";
export const NEEDLES_LIST_LABEL = "Agujas anotadas";

/** En una lista de N medidas, "Quitar" a secas no dice cuál. */
export function removeNeedleLabel(size: number): string {
  return `Quitar la aguja de ${needleOptionLabel(size)}`;
}

/* --- Foto (E6 h) ----------------------------------------------------------- */

export const PHOTO_CHOOSE_LABEL = "Elegir una foto";
export const PHOTO_UPLOADING = "Subiendo la foto…";
export const PHOTO_REMOVE_LABEL = "Quitar la foto";
/**
 * Nombre de la región viva de la subida. **Distinto del de la lista y del
 * cajón** (deuda 114): las tres pueden estar montadas a la vez y dos regiones
 * homónimas vuelven ambiguo el selector con el que se espera a una de ellas.
 */
export const PHOTO_STATUS_REGION_LABEL = "Estado de la foto";

/* --- Patrón (E6 a: sólo ELEGIR) -------------------------------------------- */

export const NO_PATTERN_OPTION_LABEL = "Sin patrón";
export const PATTERNS_EMPTY = "Todavía no tenés patrones en tu biblioteca.";
/**
 * La biblioteca **no se pudo traer**, que no es lo mismo que estar vacía. Se
 * distinguen por lo mismo que en el tab Lanas: decirle "no tenés patrones" a
 * quien tiene veinte es la mentira que la enmienda E2(e) vino a corregir.
 */
export const PATTERNS_UNAVAILABLE =
  "No pudimos traer tu biblioteca de patrones. Podés guardar el proyecto igual y elegirlo más adelante.";

/**
 * Nombre del patrón **y su clase de tejido**.
 *
 * La lista **no se filtra por el tipo elegido en el formulario** a propósito: el
 * tipo se puede cambiar con el modal abierto, y filtrar haría desaparecer en
 * silencio el patrón ya elegido. Se muestra la clase y decide quien mira.
 */
export function patternOptionLabel(pattern: SerializedPattern): string {
  return `${pattern.name} · ${CRAFT_TYPE_LABELS[pattern.type]}`;
}

/* ---------------------------------------------------------------------------
   Los campos del formulario, ya normalizados
   --------------------------------------------------------------------------- */

/**
 * Lo que el formulario sabe de un proyecto, **con los tipos que viajan al
 * endpoint**. `targetRounds` es un número acá: el texto crudo vive en el estado
 * del componente y pasa por `parseTargetRounds` antes de llegar aquí.
 */
export type ProjectFormFields = {
  name: string;
  type: CraftType;
  targetRounds: number;
  needles: number[];
  notes: string;
  image: string | null;
  patternId: string | null;
};

/** Un alta: sólo el tipo viene decidido, por el botón que abrió el modal. */
export function emptyFields(type: CraftType): ProjectFormFields {
  return {
    name: "",
    type,
    targetRounds: 0,
    needles: [],
    notes: "",
    image: null,
    patternId: null,
  };
}

/**
 * Una edición arranca con lo que el proyecto tiene hoy. **Las agujas se copian**
 * en vez de compartir la referencia: el formulario muta esa lista al añadir y
 * quitar, y compartirla dejaría el "antes" mutando junto al "después" — que es
 * cómo un parche sale vacío sin que nadie entienda por qué.
 */
export function fieldsOf(project: SerializedProject): ProjectFormFields {
  return {
    name: project.name,
    type: project.type,
    targetRounds: project.targetRounds,
    needles: [...project.needles],
    notes: project.notes,
    image: project.image,
    patternId: project.patternId,
  };
}

/**
 * La meta tecleada, o `null` si no es lo que el backend acepta.
 *
 * **Vacío es cero, no un error**: un proyecto sin meta es el caso normal —es el
 * default de la tabla— y obligar a teclear un 0 sería pedir un dato que la
 * aplicación ya sabe. Se comprueba antes de salir porque un 400 de validación se
 * leería como "algo salió mal" cuando lo que pasa es que las vueltas se cuentan
 * enteras. Es la misma regla que el campo de la meta del tab Progreso.
 */
export function parseTargetRounds(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") {
    return 0;
  }
  return /^\d+$/.test(trimmed) ? Number(trimmed) : null;
}

/* ---------------------------------------------------------------------------
   Agujas
   --------------------------------------------------------------------------- */

/** El tope del esquema (`needlesSchema`, `validation.ts`). */
export const MAX_NEEDLES = 20;

/**
 * Añade una medida **ordenada y sin repetir**, y sin pasar del tope.
 *
 * No se repite porque anotar dos veces la misma medida no dice nada que la lista
 * no dijera ya, y el filtro de agujas es de **contención**: buscar "4 mm"
 * encuentra igual al proyecto que la tenga una vez que dos.
 */
export function addNeedle(needles: readonly number[], size: number): number[] {
  if (needles.includes(size) || needles.length >= MAX_NEEDLES) {
    return [...needles];
  }
  return [...needles, size].sort((a, b) => a - b);
}

export function removeNeedle(needles: readonly number[], size: number): number[] {
  return needles.filter((entry) => entry !== size);
}

/**
 * Las medidas que se pueden añadir: el catálogo fijo del dominio
 * (`NEEDLE_SIZES`) **menos las ya anotadas**.
 *
 * Se ofrece el catálogo y no un campo libre para que lo que se anota sea
 * exactamente lo que el filtro de "más filtros" sabe buscar: una medida fuera de
 * la lista quedaría anotada y **nunca encontrable**.
 *
 * Quitar lo ya anotado es el mismo criterio que `linkableYarns`: ofrecer algo
 * cuyo efecto no se ve es un control que parece roto.
 */
export function needleChoices(needles: readonly number[]): number[] {
  return NEEDLE_SIZES.filter((size) => !needles.includes(size));
}

/* ---------------------------------------------------------------------------
   El parche
   --------------------------------------------------------------------------- */

/**
 * Lo que cambió, y **nada más**.
 *
 * `PATCH /api/projects/:id` acepta el esquema de alta en versión parcial, así
 * que mandar el formulario entero funcionaría — pero pisaría con el valor del
 * formulario cualquier campo que otra pantalla haya tocado mientras el modal
 * estaba abierto (el tab Progreso mueve `targetRounds` desde el mismo cajón que
 * hay detrás). Mandar sólo lo tocado es lo que hace que editar el nombre no
 * pueda revertir una vuelta.
 *
 * Un parche **vacío** es la señal de que no hay nada que pedir: el endpoint
 * responde 400 ("No hay nada que actualizar."), así que quien llama tiene que
 * cerrar sin salir a la red.
 *
 * El nulo **sí viaja**: quitar la foto o el patrón es un cambio a `null`, y
 * omitirlo dejaría el valor viejo y la acción parecería no haber hecho nada.
 */
export function projectPatch(
  before: ProjectFormFields,
  after: ProjectFormFields,
): UpdateProjectPayload {
  const patch: UpdateProjectPayload = {};

  if (after.name !== before.name) {
    patch.name = after.name;
  }
  if (after.type !== before.type) {
    patch.type = after.type;
  }
  if (after.targetRounds !== before.targetRounds) {
    patch.targetRounds = after.targetRounds;
  }
  if (!sameNeedles(before.needles, after.needles)) {
    patch.needles = [...after.needles];
  }
  if (after.notes !== before.notes) {
    patch.notes = after.notes;
  }
  if (after.image !== before.image) {
    patch.image = after.image;
  }
  if (after.patternId !== before.patternId) {
    patch.patternId = after.patternId;
  }

  return patch;
}

/** Las agujas se comparan **por contenido**: las dos listas están ordenadas. */
function sameNeedles(before: readonly number[], after: readonly number[]): boolean {
  return (
    before.length === after.length &&
    before.every((size, index) => size === after[index])
  );
}

/** Copia de la biblioteca mientras viaja su petición. */
export const PATTERNS_LOADING = "Cargando tu biblioteca de patrones.";
/**
 * Nombre de la región viva de la biblioteca. **Distinto del de la foto y del de
 * la lista** (deuda 114): las tres pueden estar montadas a la vez y dos regiones
 * homónimas vuelven ambiguo el selector con el que se espera a una de ellas.
 */
export const PATTERNS_STATUS_REGION_LABEL = "Estado de la biblioteca de patrones";

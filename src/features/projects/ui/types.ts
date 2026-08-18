import type { ProjectRecord } from "@/features/projects/types";
import type { YarnRecord } from "@/features/yarns/types";

/**
 * Un `ProjectRecord` **tal y como llega al navegador**.
 *
 * ⚠️ El tipo del dominio MIENTE al cruzar la red. `ProjectRecord` declara `Date`
 * en las cuatro columnas de fecha porque así las infiere Drizzle de la tabla,
 * pero el Route Handler responde con `NextResponse.json`, que serializa con
 * `JSON.stringify`, y `JSON.stringify` invoca `Date.prototype.toJSON`: lo que
 * viaja es una **cadena ISO-8601**. Tipar la respuesta como `ProjectRecord` deja
 * que TypeScript acepte `project.updatedAt.getTime()`, que **compila y explota
 * en runtime** con "getTime is not a function".
 *
 * Por eso el cliente tiene su propio tipo, y por eso se deriva del de dominio en
 * vez de reescribirse a mano: si mañana la tabla gana una columna, ésta la gana
 * también, y si pierde una fecha el `Omit` deja de compilar.
 *
 * El `import type` se borra en la compilación (`verbatimModuleSyntax`), así que
 * esto **no arrastra Drizzle al bundle del navegador** aunque el módulo de
 * origen lo importe.
 */
type SerializedDates = "startDate" | "endDate" | "createdAt" | "updatedAt";

export type SerializedProject = Omit<ProjectRecord, SerializedDates> & {
  startDate: string;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Payload de `GET /api/projects`: la lista viaja **envuelta** (PRD §9). */
export type ProjectListPayload = { projects: SerializedProject[] };

/**
 * Lo que la tarjeta necesita, y nada más (RFC-02 §2 / enmienda E2.1): foto,
 * nombre, progreso, tiempo **y la clase de tejido**. Se declara como subconjunto
 * del proyecto real para que un `SerializedProject` entero encaje sin adaptador
 * y para que la tarjeta no pueda leer campos que no le tocan.
 *
 * `type` entra con la enmienda **E2(g)**: cuando no hay foto, el hueco nombra la
 * clase de tejido en vez de ser un rectángulo liso con una letra diminuta. Es un
 * dato **del proyecto**, así que el `Pick` puede crecer sin contradecir la deuda
 * 109 —que lo que prohíbe es meter aquí cosas que **no** son del proyecto, como
 * "hay una petición en vuelo"—.
 */
export type ProjectCardData = Pick<
  SerializedProject,
  "id" | "name" | "image" | "progress" | "time" | "type"
>;

/**
 * Lo único que el desplegable de "lana usada" necesita (RFC-03, enmienda E1(d)).
 *
 * Son tres campos y no la fila entera **a propósito**: `GET /api/yarns` devuelve
 * la fila cruda de `yarns`, con `brandId`/`typeId` como **UUID y sin nombres**,
 * y con `lot`/`createdAt`/`updatedAt` que —igual que en `SerializedProject`—
 * declaran `Date` y cruzan la red como cadena. Ninguno de los tres que quedan es
 * una fecha, así que este `Pick` no necesita el tratamiento de serialización: lo
 * que se puede leer aquí no puede mentir.
 *
 * Precio aceptado y escrito en la enmienda: dos lanas de la misma marca con el
 * mismo nombre de color **no se distinguen** salvo por su familia.
 */
export type YarnOption = Pick<
  YarnRecord,
  "id" | "colorName" | "colorFamily"
>;

/** Payload de `GET /api/yarns`: la lista también viaja **envuelta**. */
export type YarnListPayload = { yarns: YarnOption[] };

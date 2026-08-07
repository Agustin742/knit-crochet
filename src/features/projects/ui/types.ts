import type { ProjectRecord } from "@/features/projects/types";

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
 * nombre, progreso y tiempo. Se declara como subconjunto del proyecto real para
 * que un `SerializedProject` entero encaje sin adaptador y para que la tarjeta
 * no pueda leer campos que no le tocan.
 */
export type ProjectCardData = Pick<
  SerializedProject,
  "id" | "name" | "image" | "progress" | "time"
>;

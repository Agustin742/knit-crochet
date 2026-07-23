import type { KeyValue, patterns } from "@/features/patterns/schema";
import type { CraftType } from "@/shared/config";

export type PatternRecord = typeof patterns.$inferSelect;
export type NewPatternRecord = typeof patterns.$inferInsert;

export type { KeyValue };

/**
 * Campos que el cliente puede enviar al crear un patrón. `id`/`userId`/
 * `createdAt`/`updatedAt` los gestiona el servidor. El "completado" de los
 * pasos NO vive aquí: es por proyecto (`Project.completedSteps`, PRD §4.3).
 */
export type CreatePatternInput = {
  name: string;
  type: CraftType;
  image?: string | null;
  /** Pasos ordenados clave-valor; el orden del array es significativo. */
  instructions?: KeyValue[];
  /** Metadata flexible clave-valor (size, muestra, largo…). */
  metadata?: KeyValue[];
  /** `true` = biblioteca (reusable en N proyectos); `false` = embebido. */
  inLibrary?: boolean;
};

export type UpdatePatternInput = Partial<CreatePatternInput>;

/** Parche interno hacia la capa de datos. */
export type PatternPatch = UpdatePatternInput & { updatedAt?: Date };

export type PatternFilters = {
  type?: CraftType;
  inLibrary?: boolean;
};

import type {
  YarnFilters,
  YarnListItem,
  YarnRecord,
} from "@/features/yarns/types";

export type { YarnFilters };

/**
 * `YarnListItem` tal y como llega al navegador. Igual trampa que
 * `SerializedProject` (`features/projects/ui/types.ts`): Drizzle infiere
 * `Date` en `lot`/`createdAt`/`updatedAt`, pero `NextResponse.json` serializa
 * con `JSON.stringify`, y lo que viaja es una cadena ISO-8601.
 */
type SerializedYarnDates = "lot" | "createdAt" | "updatedAt";

export type SerializedYarnListItem = Omit<YarnListItem, SerializedYarnDates> & {
  lot: string;
  createdAt: string;
  updatedAt: string;
};

export type YarnListPayload = { yarns: SerializedYarnListItem[] };

/**
 * La forma exacta de `PATCH /api/yarns/:id` (design D2): la fila cruda, sin
 * `brandName`/`typeName` — a diferencia de `SerializedYarnListItem`, que sí
 * los trae porque `GET /api/yarns` los suma con un join (E1(a)). Nombrarla
 * aparte es lo que vuelve `return patched` en `mergeYarnPatch` un error de
 * tipos: la trampa de la mezcla es un error de compilación, no una prueba.
 */
export type SerializedYarnRecord = Omit<YarnRecord, SerializedYarnDates> & {
  lot: string;
  createdAt: string;
  updatedAt: string;
};

export type YarnDetailPayload = { yarn: SerializedYarnRecord };

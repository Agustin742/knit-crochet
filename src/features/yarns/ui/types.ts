import type { YarnFilters, YarnListItem } from "@/features/yarns/types";

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

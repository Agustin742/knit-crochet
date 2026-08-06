import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Helper compartido por los smoke tests: lee una variable de `process.env` y,
 * si no está, la busca en el `.env` del repo (Vitest no lo inyecta).
 *
 * Vive en un módulo aparte y **no** hace nada al importarse: la lectura del
 * disco solo ocurre cuando alguien llama a la función, que en los smokes pasa
 * dentro de `beforeAll`. Así, en la corrida hermética (`pnpm test`) los smokes
 * quedan SKIPPED sin tocar el sistema de archivos.
 *
 * Este archivo NO termina en `.test.ts`, así que el `include` de
 * `vitest.config.ts` no lo recoge como suite.
 */
export function resolveEnvValue(name: string): string {
  const fromEnv = process.env[name];
  if (fromEnv) {
    return fromEnv;
  }
  const raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const match = line.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+)\\s*$`));
    if (match?.[1]) {
      return match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  throw new Error(`${name} no encontrada ni en env ni en .env`);
}

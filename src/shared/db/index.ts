import { neon } from "@neondatabase/serverless";
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http";

export class MissingDatabaseUrlError extends Error {
  constructor() {
    super(
      "DATABASE_URL no está definida. Configúrala en el entorno antes de usar la base de datos (ver .env.example).",
    );
    this.name = "MissingDatabaseUrlError";
  }
}

export function createDbClient(connectionString?: string): NeonHttpDatabase {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new MissingDatabaseUrlError();
  }
  const sql = neon(url);
  return drizzle({ client: sql });
}

let cachedClient: NeonHttpDatabase | undefined;

function resolveClient(): NeonHttpDatabase {
  return (cachedClient ??= createDbClient());
}

// Inicialización perezosa: importar este módulo no abre conexión ni lanza si
// falta DATABASE_URL. El driver neon-http es lazy y el error nombrado aparece
// en el primer uso real del cliente (compatible con serverless/edge).
export const db = new Proxy({} as NeonHttpDatabase, {
  get(_target, property) {
    const client = resolveClient();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});

// Barrel de schemas Drizzle. La feature #2 solo deja el pipeline listo; las
// entidades reales (User, Project, Yarn, …) las añade la feature #3
// re-exportando cada `features/<x>/schema.ts` desde aquí. `drizzle.config.ts`
// apunta a este archivo como fuente única de tablas para las migraciones.
export {};

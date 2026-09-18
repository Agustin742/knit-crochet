import { fileURLToPath } from "url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Default node: no rompe los tests de backend. Los tests de UI declaran
    // `// @vitest-environment happy-dom` por archivo.
    environment: "node",
    setupFiles: ["./vitest.setup.ts"],
    // Tope por test. El defecto de vitest (5000 ms) se queda corto en esta base:
    // medido en una pasada completa, el test genérico más lento es el axe de
    // `ProjectsView` con 3219 ms — sólo 1.5x de margen, así que una máquina algo
    // más cargada lo tumbaba y el verde de la verificación pasaba a depender del ruido
    // (deuda 145). 10 s = ~3x sobre ese peor caso medido, y sigue cazando un
    // cuelgue de verdad en 10 s, no en minutos.
    //
    // Los archivos con coste de CPU DELIBERADO (bcrypt cost 12) o arranque en
    // frío pesado suben su propio tope con `vi.setConfig` dentro del archivo:
    // `src/shared/lib/auth/password.test.ts`,
    // `src/features/auth/api/auth-service.test.ts`,
    // `src/app/api/auth/auth-routes.test.ts` y el primer `it` de
    // `src/shared/db/index.test.ts`. No se abarata el hasheo para caber aquí.
    testTimeout: 10_000,
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

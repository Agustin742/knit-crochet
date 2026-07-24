import * as axeMatchers from "vitest-axe/matchers";
import { expect } from "vitest";

import "@testing-library/jest-dom/vitest";

// Registra el matcher `toHaveNoViolations` (vitest-axe). Sólo importa chalk, no
// axe-core, así que es seguro en el entorno `node` de los tests de backend; el
// runner `axe` (que sí necesita DOM) se importa aparte en los tests de UI.
expect.extend(axeMatchers);

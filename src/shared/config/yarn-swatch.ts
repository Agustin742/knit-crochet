import type { ColorFamily } from "./index";

/**
 * El color de cada familia sale de un **token**, nunca de un valor escrito
 * acá. Es un `switch` exhaustivo (TypeScript exige las trece) y no un objeto
 * indexado — "multicolor" se dibuja como imagen, no como color plano.
 *
 * **Devuelve una clase de utilidad, no un color** (deuda 168 / D4): `Swatch`
 * es genérico y sin concepto de tinte propio, así que la clase entra por el
 * `className` que ya es obligatorio en todo componente.
 */
export function yarnSwatchClass(family: ColorFamily): string {
  switch (family) {
    case "red":
      return "bg-yarn-red";
    case "orange":
      return "bg-yarn-orange";
    case "yellow":
      return "bg-yarn-yellow";
    case "green":
      return "bg-yarn-green";
    case "blue":
      return "bg-yarn-blue";
    case "violet":
      return "bg-yarn-violet";
    case "pink":
      return "bg-yarn-pink";
    case "brown":
      return "bg-yarn-brown";
    case "gray":
      return "bg-yarn-gray";
    case "black":
      return "bg-yarn-black";
    case "white":
      return "bg-yarn-white";
    case "neutral":
      return "bg-yarn-neutral";
    case "multicolor":
      return "bg-(image:--yarn-multicolor)";
  }
}

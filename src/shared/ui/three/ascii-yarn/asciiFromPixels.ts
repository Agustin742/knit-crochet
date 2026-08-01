/**
 * Rampa de densidad creciente del template (`template/ascii-yarn.js`): 13
 * caracteres, del espacio (fondo) a `@` (brillo máximo). Es contrato visual —
 * no se "mejora" sin revisar la referencia.
 */
export const ASCII_RAMP = " .`:;-=+*x#%@";

/** Coeficientes de luminancia relativa (Rec. 709), igual que la referencia. */
const LUMA_R = 0.2126;
const LUMA_G = 0.7152;
const LUMA_B = 0.0722;
const CHANNEL_MAX = 255;
const CHANNELS_PER_PIXEL = 4;

/**
 * Convierte el buffer RGBA leído del `WebGLRenderTarget` (1 píxel = 1
 * carácter) en el bloque de texto del `<pre>`.
 *
 * Las filas se recorren de abajo hacia arriba porque `readRenderTargetPixels`
 * devuelve el framebuffer con el origen abajo-izquierda y el texto se escribe
 * de arriba hacia abajo.
 */
export function asciiFromPixels(
  pixels: Uint8Array,
  cols: number,
  rows: number,
): string {
  let out = "";

  for (let y = rows - 1; y >= 0; y--) {
    for (let x = 0; x < cols; x++) {
      const offset = (y * cols + x) * CHANNELS_PER_PIXEL;
      const red = pixels[offset] ?? 0;
      const green = pixels[offset + 1] ?? 0;
      const blue = pixels[offset + 2] ?? 0;
      const luminance =
        (LUMA_R * red + LUMA_G * green + LUMA_B * blue) / CHANNEL_MAX;
      const index = Math.min(
        ASCII_RAMP.length - 1,
        Math.trunc(luminance * ASCII_RAMP.length),
      );
      out += ASCII_RAMP.charAt(index);
    }
    out += "\n";
  }

  return out;
}

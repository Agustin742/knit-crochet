// bcrypt trunca la password a 72 bytes: la validación zod la limita a 72
// caracteres para que dos passwords distintas no colisionen en silencio.
export const PASSWORD_MAX_LENGTH = 72;
export const PASSWORD_MIN_LENGTH = 8;

/* Viven aparte de `password.ts` porque ese módulo importa `bcryptjs` en su
   primera línea, y quien consume estas constantes es `features/auth/
   validation.ts`, que desde #31 se importa TAMBIÉN desde el navegador: los dos
   formularios de auth validan con los MISMOS schemas del servidor para no
   divergir en reglas ni en mensajes.

   Medido: con el import antiguo (`validation.ts` → `password.ts` → `bcryptjs`)
   el bundler ya sacudía bcrypt del bundle de cliente, así que esto no arregla un
   peso real hoy. Lo que arregla es la DEPENDENCIA: el grafo de imports del
   cliente deja de tocar el módulo de hashing —que es server-only por
   naturaleza— en vez de confiar en que el tree-shaking siga acertando cuando
   `password.ts` gane una función con efectos o el bundler cambie de versión. */

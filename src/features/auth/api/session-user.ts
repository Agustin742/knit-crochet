import { getCurrentUser } from "@/features/auth/api/current-user";
import { UserNotFoundError } from "@/features/auth/api/errors";
import type { AuthUserStore } from "@/features/auth/api/store";
import type { PublicUser } from "@/features/auth/types";
import { getSessionUserId } from "@/shared/lib/auth/session";

/**
 * Usuario de la sesión actual leído **en el servidor**, o `null` si no hay
 * sesión válida.
 *
 * Existe para que el caparazón de `(app)` pueda mostrar quién está dentro sin
 * pedir nada desde el navegador: el layout del grupo es un Server Component, así
 * que resuelve esto y lo entrega por props. Es lo que mantiene verdadero el gate
 * de coste de `AppShellClient.test.tsx` —montar el shell no dispara ninguna
 * petición de cliente— en vez de invertirlo (deuda 29).
 *
 * Devuelve `null` también cuando la cookie es válida pero el usuario ya no
 * existe (cuenta borrada con la sesión aún viva): para el caparazón eso es una
 * visita sin sesión, no un error de servidor. El endpoint `GET /api/auth/me`
 * sigue distinguiendo los dos casos con su 404, porque ahí sí es información
 * útil para quien llama.
 */
export async function getSessionUser(
  store?: AuthUserStore,
): Promise<PublicUser | null> {
  const userId = await getSessionUserId();
  if (!userId) {
    return null;
  }

  try {
    return await getCurrentUser(userId, store);
  } catch (error) {
    if (error instanceof UserNotFoundError) {
      return null;
    }
    throw error;
  }
}

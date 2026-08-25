# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

## ▶️ SIGUIENTE: #22 `projects_form_ui` — o lo que elija el usuario

**Estado:** limpio y verde. `init.sh` **EXIT 0** · `1587 passed | 13 skipped (1600)`.
`feature_list.json`: **24 `done` · 0 `in_progress` · 9 `pending`** sobre 33.
**Backend completo. Faltan 9 páginas para el MVP.**

### ⚖️ MORATORIA DE GATES (sigue en vigor)

> ***Una deuda sólo interrumpe una feature si un usuario puede verla.***

⚪ y **no se abren**: **160**, **161**, **164**, **167**, **168**, **169**, **170**, **171**.

### 🧭 REGLAS DE MÉTODO para la verificación en navegador (REGLA 4)

Nacidas de **dos falsos positivos en una sola sesión** (2026-08-25):

1. **Las coordenadas de `computer` NO son fiables sin comprobación.** Van en px **físicos** mientras
   `getBoundingClientRect` da px **CSS**, y **el factor no es estable entre capturas**. **Antes de
   reportar cualquier cosa medida con clics: confirma DÓNDE CAYÓ el puntero** con una escucha de
   `mousemove` en captura (cuatro líneas). Un clic desviado **imita perfectamente a un bug real**.
2. **Antes de culpar a la app, descarta el entorno.** Un `500` resultó ser el `next dev` **degradado**
   por el arnés. Con servidor limpio: `200`.
3. **Si sólo quieres VER un panel, cambia de pestaña por código** — es más honesto que fingir una
   medición de *hit-testing* que no estás haciendo.
4. **No midas la pantalla mientras otro agente muta el árbol.**
5. **Si arrancas un cronómetro para probar, PÁRALO.** En el historial del usuario hay una sesión de
   **281 h** de la verificación de #20, que se dejó corriendo.

### El móvil: cómo se desbloqueó y qué falta

**Lo desbloquea el usuario**, no un agente: la ventana de Chrome tiene que estar **restaurada (ni
maximizada ni minimizada) y en primer plano**. Con eso se llegó a **502 px** — Chrome impone un mínimo
de ~500 px y `resize_window` **informa éxito aunque no cambie nada**. **El móvil real (≤390 px) sigue
fuera de alcance por esta vía**; haría falta emulación por CDP.

### Deudas VISIBLES pendientes (🟠 — un usuario las ve)

- **165** — la **navegación móvil no está pegada abajo**: en angosto sólo aparece scrolleando hasta el
  fondo, y es la única navegación que hay. **Preexistente.**
- **166** — el tab Progreso muestra **`1 / 0`** cuando no hay meta de vueltas.
- **155**, **159**, **162**, **163** — de sesiones anteriores.

### Al arrancar la siguiente feature

1. `bash ./init.sh`.
2. **Comprueba qué piezas da por hechas la ficha y NO existen** — este control ha pagado en #19 y en #21.
3. Si el RFC tiene decisiones abiertas: **resolverlas con el usuario y escribirlas en el RFC ANTES de
   tocar código**. Es lo que ha funcionado en E13, E4 (RFC-02) y E3 (RFC-03).
4. **REGLA 4 antes de cerrar**, con el árbol quieto.

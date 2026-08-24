# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

## ▶️ SIGUIENTE: #21 `projects_detail_ui` — y la regla que rige desde ahora

**Estado del repo:** limpio y verde. `init.sh` **EXIT 0** · `1426 passed | 13 skipped (1439)`.
`feature_list.json`: 33 features — **23 `done`, 10 `pending`, 0 `in_progress`**.

### ⚖️ MORATORIA DE GATES (decisión del usuario, 2026-08-24)

> ***Una deuda sólo interrumpe una feature si un usuario puede verla.***

El backend está **completo**. Para el MVP faltan **10 páginas** (#21-#30) y **nada más**. Las deudas
abiertas de tipo ⚪ —**160**, **161**, **164**— son trabajo sobre los *gates*: **ningún usuario puede
verlas**, no bloquean ninguna feature y **no se abren** hasta que las páginas estén.

**Lo que el leader NO debe volver a hacer** (pasó el 2026-08-24, dos veces en una sesión): meter una
deuda en un lote porque *"está medida y es corta"*. Cada decisión era defendible por separado; sumadas,
la sesión terminó sin una página nueva. Ver el informe 27 §4.

### Al arrancar #21

1. `bash ./init.sh` (verde al cerrar la sesión anterior).
2. Leer **RFC-03** (`docs/design/rfc/RFC-03-proyectos.md`) y comprobar si la ficha de #21 tiene
   **decisiones abiertas**: si las tiene, se resuelven **con el usuario y se escriben en el RFC antes de
   tocar código** — es lo que funcionó con E4 y con E13.
3. Marcar #21 `in_progress` y anotar aquí el plan.
4. **Deudas visibles que tocan al Dashboard/proyectos y sí valen la pena si caen de camino:**
   **162** 🟠 (peticiones redundantes al cambiar de año), **163** 🟠 (el vacío se re-rotula mientras
   carga), **159** 🟠 (la fila de "Proyectos en curso", tres líneas de base), **155** 🟠.
5. **REGLA 4 al cerrar:** mirar la pantalla. Lleva **una sesión sin pagarse** y el móvil **cinco**.

# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

## 🟡 EN CURSO — #21 `projects_detail_ui`, **TANDA 1** (2026-08-24)

`feature_list.json`: #21 en **`in_progress`** con nota de alcance. 23 `done` · 1 `in_progress` · 9 `pending`.
Punto de partida: `bash ./init.sh` **EXIT 0** · `1426 passed | 13 skipped (1439)`.

### ⚖️ Rige la MORATORIA DE GATES

> ***Una deuda sólo interrumpe una feature si un usuario puede verla.***

Las deudas **160**, **161** y **164** son ⚪ y **no se abren**. El implementer lleva la orden explícita
de no tocarlas ni de refilón.

### El control que volvió a pagar: qué piezas NO existían

Antes de lanzar nada, el leader comprobó si las piezas que la ficha de #21 da por hechas existen — **el
mismo control que en #19 destapó que la ficha asumía componentes inexistentes**. Resultado:

| pieza | ¿existe? |
|---|---|
| Foco atrapado, `Escape`, `aria-modal`, portal, scroll lock, devolver foco | ✅ **SÍ**, en `Dialog` |
| `Drawer` lateral | ❌ **no** — le falta **sólo geometría** |
| `Tabs` | ❌ **no** — `SegmentedControl` es `role="group"`, y su comentario dice *"no tablist"* |

**La buena noticia:** lo caro del drawer (la jaula de foco) **ya está escrito y probado**.

### Las cuatro decisiones — enmienda E3 de RFC-03, escritas ANTES de tocar código

- **E3 (a)** · *usuario* — **#21 en DOS tandas.** T1 = `Tabs` + `Drawer` + tab **General** + **tap en la
  card**. Al cerrar T1 el detalle **se abre y se usa**. T2 = Progreso, Lanas y Sesiones.
- **E3 (b)** · *leader* — el `Drawer` es **variante del `Dialog`**, no componente nuevo. Reescribir una
  jaula de foco ya probada es regalar bugs de accesibilidad.
- **E3 (c)** · *leader* — `Tabs` nace como **primitiva compartida** con `tablist`/`tab`/`tabpanel` y
  flechas. RFC-04 y RFC-05 también la piden.
- **E3 (d)** · *usuario* — **los botones sin destino NO se pintan.** "Editar" llega con #22, "crear
  patrón" con #26-28, **de forma aditiva**. Mismo criterio que **E1(f)** usó en #20 y funcionó.

### Estado

| paso | estado |
|---|---|
| Inventario de piezas | ✅ hecho |
| Enmienda E3 en RFC-03 | ✅ escrita |
| #21 → `in_progress` | ✅ hecho |
| **T1 — implementer** | 🟡 **en vuelo** |
| T1 — reviewer | ⏳ |
| **REGLA 4 (mirar la pantalla)** | ⏳ — **se debe desde la sesión anterior** |
| T2 — Progreso / Lanas / Sesiones | ⏳ |

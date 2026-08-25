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

---

## Bitácora en vivo — #21 T1

### ✅ T1 IMPLEMENTADA — `init.sh` EXIT 0 · `1485 passed | 13 skipped (1498)` = 1426 **+59**, sin residuo

Piezas nuevas: `src/shared/ui/primitives/tabs/` (primitiva), la **colocación lateral** del `Dialog`
(variante, no componente nuevo), `ProjectDetailDrawer.tsx` + `project-detail.ts`, y el **tap** en
`ProjectCard.tsx`.

### ✅ REGLA 4 PAGADA — `progress/reports/verificacion_navegador_21_t1.md`

**Pagada por el leader, con el árbol quieto** (la regla que salió del incidente del 2026-08-20). Chrome
real, viewport 1536×730, un proyecto de verdad.

| medición | resultado |
|---|---|
| rect del panel | **x=864, y=0, 672×730** → pegado al lateral (`864+672 = 1536` exacto) y alto completo |
| `aria-modal` / `tablist` / `aria-selected` | ✅ los tres |
| **`Escape`** | cierra, **devuelve el foco al botón de la card** y **libera el bloqueo de scroll** |
| `<button>` dentro de `<a>` (aviso de E1 f) | **resuelto**: el tap es un `<button aria-label="Ver detalle de …">`, no un ancla envolvente |

> **Vale doble:** `happy-dom` no maqueta y `axe` no mide el foco real. Es el eje que **ningún gate del
> repo puede ver**, y está sano.

### 🟠 HALLAZGO de la REGLA 4 — el hueco de la foto vacía, y es una deuda YA CURADA que reaparece

**Medido:** el hueco de la foto ocupa `612×344` = **47 % del alto del viewport**, con
`hasRealImage: false` —un rectángulo vacío con una letra—, y el `<dl>` de los datos reales termina en
**y=727, a 3 px del borde**. En una pantalla más baja nacen fuera de vista.

**De quién es la deuda:** es **E2(g) del RFC-03**, titulada *"El hueco de la foto vacía deja de ser un
vacío del 61 % de la tarjeta"*. Se curó **en la card** y el cajón **nació con el mismo defecto**, porque
el arreglo se hizo en una pieza y no como criterio compartido. **Arreglo: mirar qué hizo E2(g) y aplicar
el mismo criterio**, no inventar un tamaño a ojo.

### ⚠️ MÓVIL — la causa queda CONFIRMADA, y la salida NO la puede ejecutar un agente

```
resize_window(420x860) -> "Successfully resized window ... to 420x860 pixels"
medido después:  innerWidth 1536 (SIN CAMBIAR) · matchMedia('(max-width: 640px)') === false
```

**La herramienta informa un éxito que no ocurrió.** Causa: la ventana de Chrome está **maximizada**.
**Pedido al usuario:** desmaximizar (botón restaurar o `Win`+`↓`). Con eso se mide en dos minutos y se
cierra una deuda de cinco sesiones.

### ⏸️ Review de T1 — CORTADA POR CUOTA (segunda vez en la sesión), reanudada

`progress/reports/review_21_t1.md`. **Árbol comprobado por el leader: el reviewer no tocó código.**

**Bloques cerrados:** A (gates duros) y B (`Tabs`) — `init.sh` EXIT 0 y aritmética verificados **por él**,
**cero clases inertes comprobado por él y no deducido**, patrón ARIA completo, contrato de API pública
(REGLA 2a) pagado. **Hasta aquí, cero bloqueantes**: todos los hallazgos son ⚪, incluido uno que dice
que **el informe del implementer afirma algo que no es cierto** sobre `cn()` (A.4).

**Falta:** el bloque de tests (REGLA 7, fixtures y las fechas de la deuda 164) y el veredicto.

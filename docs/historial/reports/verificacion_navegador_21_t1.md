# REGLA 4 — Verificación en navegador de #21 T1 (drawer + tabs + General)

**Quién y cuándo:** el leader, 2026-08-24, con **el árbol quieto** (ningún agente mutando: es la regla
que salió del incidente del 2026-08-20, cuando se midió la pantalla mientras el reviewer mutaba el CSS).

**Cómo:** `pnpm dev` arrancado por el leader (Next 16.2.10, Turbopack, listo en 1.8 s), Chrome con la
sesión del usuario ya activa. Viewport **1536×730 CSS**, dpr 1.25. Datos reales: **un proyecto**
(`asdasd`, dos agujas, 0%, 0 min, empezado el 14 de agosto de 2026, **sin foto**).
Coordenadas en CSS px medidas con `getBoundingClientRect`.

---

## ✅ Lo que funciona, medido y no deducido

### 1. El cajón es lo que E3(b) prometía

| medición | valor | veredicto |
|---|---|---|
| rect del panel | **x=864, y=0, 672×730** | pegado al lateral derecho (`864+672 = 1536` = ancho exacto) y **alto completo** |
| `aria-modal` | `"true"` | ✅ |
| `role="tablist"` presente | 612×46 en y=79 | ✅ |
| pestaña General | `aria-selected="true"`, `tabIndex=0` | ✅ |

**La variante del `Dialog` era la decisión correcta:** el panel se coloca al lateral sin que se rompa
nada del mecanismo heredado.

### 2. El teclado funciona en un navegador de verdad, no sólo en `happy-dom`

`Escape` → el cajón **se cierra**, el foco **vuelve al botón de la card** (`aria-label="Ver detalle de
asdasd"`) y el **bloqueo de scroll se libera** (`overflow: visible` en el `html`).

> **Esto vale doble:** `happy-dom` no maqueta y `axe` no mide el foco real. Es justo el eje que ningún
> gate del repo puede ver, y **está sano**.

### 3. El `<button>` dentro de `<a>` quedó resuelto

E1(f) avisaba de que la card ya lleva dentro el quick-start del cronómetro y de que anidar un botón en
un enlace es HTML inválido que `axe` marca. La solución medida: el tap es un **`<button
aria-label="Ver detalle de asdasd">`**, no un ancla envolvente. **Los dos controles conviven.**

---

## 🟠 HALLAZGO — el hueco de la foto vacía se come media pantalla, **y es una deuda YA CONOCIDA que reaparece**

**Medido:**

| pieza | rect | % del alto |
|---|---|---|
| hueco de la foto (**placeholder, `hasRealImage: false`**) | `886,141 612×344` | **47 % del viewport** |
| `<dl>` con los datos de verdad | `886,505 612×222` | acaba en **y=727**, a 3 px del borde |

O sea: **casi la mitad del alto del cajón es un rectángulo vacío con una letra "A"**, y los datos reales
—tipo, estado, fechas, agujas, notas— quedan **justo en el pliegue**. En cualquier ventana más baja
nacen ya fuera de vista.

**Por qué esto no es una opinión estética:** es **literalmente la deuda que el RFC-03 ya resolvió para
la lista**. La enmienda **E2(g)** se titula *"El hueco de la foto vacía deja de ser un vacío del 61 % de
la tarjeta"*. **El cajón nació con el mismo defecto que la card ya tenía curado**, porque el arreglo se
hizo en la card y no en un criterio compartido.

**Es 🟠 con la escala nueva:** un usuario lo ve —es lo primero que ve al abrir un proyecto— pero no le
impide nada.

**Ojo con el arreglo ingenuo:** E2(g) ya dejó escrito cómo se resolvió en la card. Lo que toca es
**mirar qué hizo E2(g) y aplicar el mismo criterio**, no inventar un tamaño nuevo a ojo.

---

## ⚠️ El MÓVIL: quinta sesión sin medir, pero la causa queda CONFIRMADA y con salida

La sesión pasada dejó la hipótesis de que `resize_window` no cambia el ancho porque la ventana de Chrome
está **maximizada**. **Confirmada por medición directa hoy:**

```
resize_window(420 x 860)  ->  "Successfully resized window ... to 420x860 pixels"
medido después:  innerWidth 1536  (SIN CAMBIAR)   outerWidth 1536
                 matchMedia('(max-width: 640px)').matches === false
```

**La herramienta informa éxito y no hace nada con el ancho.** Sólo mueve el alto.

**Salida concreta, y cuesta cinco segundos:** que **el usuario desmaximice** la ventana de Chrome (el
botón de restaurar, o `Win`+`↓`). Con la ventana en modo restaurado, `resize_window` sí puede estrechar
y el móvil se mide en dos minutos. **Es la única pieza que falta y no la puede resolver ningún agente.**

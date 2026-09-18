# Verificación en navegador real de `/proyectos` (#20) — leader, 2026-08-13

**Motivo:** el usuario pidió revisarla visualmente. #20 se cerró con `init.sh` verde, `axe` y un
review aprobado a la primera, pero **nadie la había abierto en un navegador**. Es la REGLA 4.

**Cómo:** `next dev` ya corriendo del usuario (puerto 3000, PID 32584), sesión propia del usuario ya
activa en Chrome. Viewport **1521×753 CSS**, dpr 1.25. Datos reales: **un solo proyecto** (`asdasd`,
`type: knitting`, progreso 0, tiempo 0) y **cero lanas** (`GET /api/yarns` → `{"yarns":[]}`).
Todas las coordenadas de abajo son CSS px relativas al viewport, medidas con `getBoundingClientRect`.

---

## 🔴 1. El buscador se ve como un modal flotante, y es geometría, no gusto

`ProjectsToolbar.tsx:84` abre la fila `flex flex-wrap items-end gap-(--space-4)` con **tres** hijos:

| hijo | rect medido |
|---|---|
| `ToggleGroup` estado (Activos/Inactivos) | `24,164 206x44` |
| `ToggleGroup` tipo (Dos agujas/Crochet) | `246,164 224x44` |
| **`Card` con el buscador** (`:115`) | **`487,86 509x123`** |

La `Card` mide **123px de alto** (borde + `p-(--space-3)` + etiqueta + `Input` de 44px + la pista de
`hint`) contra **44px** de los botones. Con `items-end`, los botones se pegan al borde inferior de la
fila y la `Card` se queda arriba → **~78px de hueco muerto** encima de los botones y la tarjeta
"flotando" a la derecha.

Y encima la `Card` trae `bg-surface-raised` + `shadow-hard-lg`, o sea **una superficie elevada con
sombra dura, centrada, sobre el ovillo ASCII**: el ojo la lee como un diálogo abierto, no como un
campo del toolbar.

**Ojo con el arreglo ingenuo:** el `Card` **no es decorativo**, está puesto a propósito y documentado
en `:61-64` — `Field` pinta su etiqueta con el primer plano oscuro, ilegible sobre el espresso, y la
variante elevada es la única superficie donde el anillo de foco llega al contraste mínimo
(**deuda 31**). Quitar el `Card` sin resolver eso rompe legibilidad y contraste de foco.

## 🔴 2. El quick-start funciona y es INDISTINGUIBLE de un botón roto

Medido pulsando el ▶ de `asdasd`:

- `+150ms` → `disabled=true`, el glifo pasa a `✳`.
- `+2s` → `disabled=false`, vuelve a `▶`, y el aviso aparece en la región viva:
  `Cronómetro: "asdasd ya tenía el cronómetro en marcha."`

**El problema es dónde aparece ese aviso.** Las dos regiones vivas miden `23,188 **1x1**`, con
`class="sr-only"`, `position:absolute`, `clip-path: inset(50%)`. O sea: **el único feedback del
quick-start es para lector de pantalla**. Quien mira la pantalla ve un parpadeo de 200ms y después
nada: la card sigue diciendo `0%` y `0 min`, el botón vuelve a su estado inicial, no hay toast.

Esto **no lo puede cazar ningún gate existente**, y explica por qué pasó el review: los tests
asertan sobre la región viva (nombre accesible, deuda 114) y `axe` sobre el árbol accesible.
**El eje que falla es el único que nadie mide: el visible.**

*(Nota de dato: la respuesta fue "ya tenía el cronómetro en marcha", o sea **200 = reutilizada**.
Hay una sesión abierta en `asdasd` de antes de esta prueba; no la creé yo y no la paré.)*

## 🟠 3. El estado vacío MIENTE cuando el vacío lo produjo un filtro

`ProjectsView.tsx:241` decide con `listIsEmpty` (la lista que devuelve el servidor) y pinta
`EMPTY_TITLE` / `EMPTY_DESCRIPTION` (`:39-41`):

> **Tu cesto está vacío** — *Empezá un proyecto: los dos botones de acá abajo te llevan al inicio…*

Medido, ese mensaje sale con **"Inactivos"** activo y con **"Aguja = 3 mm"**, teniendo el usuario un
proyecto. Le está diciendo "no tenés proyectos" a alguien que sí tiene, y lo empuja a crear otro.

**Sólo el buscador de cliente lo hace bien** (`:259`): "Ningún proyecto coincide con la búsqueda".
La asimetría es exactamente la de E1(a): lo que se filtra en cliente distingue, lo que se filtra en
servidor no.

## 🟠 4. El copy del vacío le explica la tripa del proyecto al usuario

*"…los dos botones de acá abajo te llevan al inicio, **que es donde hoy se crea en dos pasos**."*
Eso es una nota de implementación (el formulario de #22 no existe todavía) escrita en la cara del
usuario. El "hoy" delata que es una excusa de andamiaje.

## 🟠 5. El hueco de la foto es el bloque más grande de la página y no dice nada

Card `480x405`. Dentro, el `aspect-video` de la foto mide **`437x246`** — **61% de la altura de la
card** — y con `image: null` es un rectángulo beige liso con **una letra de 11×28px** (`A`) centrada.
El nombre del proyecto, en cambio, ocupa `56x26`.

## 🟠 6. La lista es un escaparate sin puerta

No hay ni un `<a href="/proyectos/:id">` en toda la página: **la card no es tocable**. Es la decisión
**E1(f)** tomada a propósito (el detalle es #21 y `<button>` dentro de `<a>` es HTML inválido que
`axe` marca), así que no es un bug — pero es media explicación de la sensación de "esto no está
terminado": se ve una lista y no se puede entrar a nada.

## ℹ️ 7. "Lana usada" con una sola opción NO es un bug del filtro

El `<select>` de lana trae 1 sola opción ("Todas") porque `GET /api/yarns` devuelve `{"yarns":[]}`:
no hay lanas cargadas. El de aguja trae sus 18 (lista fija de `shared/config`, E1(c)) y filtra bien.

---

## ✅ Lo que SÍ funciona, medido (no supuesto)

- **Segmentado activo/inactivo:** exclusividad correcta (`Activos=false | Inactivos=true`), refetch, y
  la lista cambia.
- **Filtro de tipo:** pide `path=/api/projects, active=true, type=knitting`. Con "Crochet" la lista
  queda vacía y el proyecto es `knitting` → **correcto**.
- **Filtro de aguja:** con `3 mm` la lista se vacía; con "Todas" vuelve.
- **Buscar de cliente:** `"zzzz"` → sin resultados con su mensaje propio; `"ASD"` → encuentra
  `asdasd` (**insensible a mayúsculas**); vaciar restaura.
- **Estado pendiente del botón:** `disabled` + glifo, correcto mientras vuela la petición.
- **Consola limpia:** cero errores, cero warnings de React/hidratación (sólo `[HMR] connected`).
- **Rejilla:** `grid-cols-1 tablet:2 desktop:3`, columnas de `480.263px`. Correcta.
- **Un solo `h1`** ("Proyectos"). Regiones vivas **con nombre** (deuda 114 respetada).

## ⚠️ Corrección honesta, mía

Estuve **a punto de ficharte el filtro de tipo como roto**: en una instantánea temprana leí la lista
antes de que resolviera la petición y vi el proyecto con "Crochet" pulsado. Al instrumentar `fetch` y
mirar los parámetros reales, el filtro estaba bien. **Lo escribo porque es la misma raíz que este
libro mayor lleva registrada cuatro veces: dar por medido lo que sólo se miró de reojo.**

## 🚫 No verificado en esta pasada

- **Móvil / responsive.** `resize_window` reporta éxito pero `window.innerWidth` se queda en 1536 (la
  ventana está maximizada), y no hay emulación de dispositivo disponible en esta sesión. **La fila del
  toolbar es la primera sospechosa** en angosto, por el `flex-wrap` con una `Card` de 509px.
- **Estados de error y de carga**: no se forzaron.

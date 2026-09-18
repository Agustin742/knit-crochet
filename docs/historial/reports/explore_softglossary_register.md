# explore — mecánica real del "archivero" de softglossary.space

> **Autor:** leader. **Método:** inspección **en vivo** con el MCP de Chrome
> (`getComputedStyle` + `getBoundingClientRect` + volcado de `document.styleSheets`),
> viewport 1440×900, el 2026-07-27.
>
> **Por qué existe este archivo.** `docs/design/SDD-01-design-system.md` §0 dice de esta
> referencia: *"(La web no respondió al fetch; se captura de las capturas y la descripción
> del usuario…)"*. Es decir: **nadie había visto nunca el CSS real**. El `ArchiveNav` de
> `src/` y el `.kc-folder` de `template/template-src.html` se construyeron sobre una
> reconstrucción de segunda mano, y por eso ambos implementan un modelo equivocado.
> Este archivo es la medición de primera mano. **Manda sobre cualquier descripción previa.**

---

## 1. El modelo es un fichero vertical, no una fila de pestañas

La intuición equivocada (la que está hoy en el repo) es *"pestañas de navegador solapadas
en horizontal"*. Lo que hace la referencia es lo contrario:

> **N hojas a todo el ancho del viewport, apiladas en vertical, de cada una asoma un canto
> de 10px. La pestaña de cada hoja está a una x distinta para que todas las etiquetas se
> lean a la vez.** Es un fichero visto desde arriba.

El escalonado de alturas que el SDD §0 llama *"alturas escalonadas"* **no se dibuja a mano**:
sale gratis de apilar hojas de 10px en un contenedor `column`.

---

## 2. CSS literal extraído (verbatim de `document.styleSheets`)

```css
.register {
  display: flex;
  width: 100vw;
  flex-direction: column;   /* ← LA CLAVE: columna, no fila */
  gap: 0px;
  align-items: baseline;
}

.register-card {
  display: flex;
  height: 10px;             /* ← sólo asoma el canto de la hoja */
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
  padding: 0px;
  background-color: transparent;
  max-width: 100vw;
  filter: drop-shadow(rgba(0,0,0,0.06) 6px -5px 7px);  /* ← sombra hacia ARRIBA */
  transition: 0.2s ease-in;
}

.register-card:hover {
  height: 2px;              /* ← la hoja encoge… */
  margin-bottom: 8px;       /* …y se despega: sale del cajón */
  transition: 0.3s ease-in;
}

.register-card-1 { order: 2; z-index: 40; }
.register-card-2 { order: 1; z-index: 30; }
/* .register-card-0 (la activa) no lleva regla propia → z-index: 50 computado */

.link-box {                 /* ← la pestaña */
  border-bottom: none;
  border-radius: 10px 10px 0 0;
  background-color: var(--white);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1em 1em 5px;
  flex: 0 0 auto;
  order: 0;
  margin: 0 2em;
}

/* offsets horizontales por índice, uno por pestaña */
.link-box-1 { margin-left: calc(2em + 241px) !important; }
.link-box-2 { margin-left: calc(3em + 542px) !important; }
.link-box-3 { margin-left: calc(6em + 949px) !important; }

.register-link {
  color: var(--black);
  text-decoration: none;
  font-family: "New Edge";
  text-transform: uppercase;
  font-size: 2em;           /* = 36px computado */
  line-height: 0.5em;
  font-variation-settings: "wght" 200, "MONO" 0;
  display: flex;
  gap: 5px;
}
.register-link:hover { letter-spacing: 0px; }
```

## 3. Geometría medida (viewport 1440, `getBoundingClientRect`)

| elemento | x | y | w | h | z-index |
|---|---|---|---|---|---|
| `.register` (contenedor) | 0 | 66 | 1442 | **30** | auto |
| `.register-card-2` (última) | 0 | **66** | **1442** | **10** | **30** |
| `.register-card-1` | 0 | **76** | **1442** | **10** | **40** |
| `.register-card-0` (**activa**) | 0 | **86** | **1442** | **10** | **50** |
| `.link-box-0` (pestaña SPACE) | 36 | 35 | 198 | 41 | auto |
| `.link-box-1` (pestaña GLOSSARY) | 277 | 25 | 266 | 41 | auto |
| `.link-box-2` (pestaña INSPIRATION) | 596 | 15 | 292 | 41 | auto |

Leyendo la tabla:

- **Paso vertical = 10px exactos** entre hojas (66 → 76 → 86) y también entre pestañas
  (15 → 25 → 35). Es el mismo `height: 10px` de la hoja: el stack *es* el escalonado.
- **La hoja activa es la de más abajo** (y=86, la más cercana al contenido) y la de
  **mayor z-index (50)**. La profundidad decrece hacia arriba: 50 → 40 → 30.
- **Las hojas son full-bleed**: w=1442 = ancho del viewport. Esto es lo que hace que se lea
  como un cajón y no como fichas sueltas.
- **La pestaña desborda su hoja hacia arriba**: la hoja mide 10px pero la pestaña 41px, con
  `justify-content: flex-end` y overflow visible. La pestaña *cuelga* del canto.
- **La x de cada pestaña es un offset creciente** (36 → 277 → 596), no un solape.
  Las pestañas **nunca se tocan**: por eso las 3 etiquetas se leen enteras.

## 4. Interacción y profundidad

- **Hover = `height: 10px → 2px` + `margin-bottom: 0 → 8px`.** La hoja adelgaza y se
  despega del resto: literalmente *sacar la ficha del cajón*. **No** es un `translateY`.
  El alto total del stack no cambia (2+8 = 10), así que **nada de abajo se mueve**: es un
  hover sin reflow del layout. Detalle fino y deliberado.
- **Sombra hacia arriba**: `drop-shadow(6px -5px 7px rgba(0,0,0,.06))`. La `y` es
  **negativa** porque cada hoja proyecta sombra sobre la de *atrás*, que está *encima*
  en pantalla. Una sombra hacia abajo (lo que tenemos hoy) invierte la lectura de
  profundidad y es parte de por qué no se lee como un fichero.
- **Sombra muy tenue** (alpha 0.06) y **sin borde**: la separación entre hojas la da la
  sombra, no una línea.

## 5. Ojo con esto al portar

1. **El `order: 2 / order: 1` de la referencia es un apaño de su markup Svelte y no cuadra
   con la geometría medida.** No lo copies. **El contrato es la tabla de §3**: la hoja
   activa/primera abajo con el z-index más alto, y la profundidad decreciendo hacia arriba.
   Consíguelo como sea más limpio en nuestro markup (orden del DOM + z-index por índice).
2. **La referencia tiene 3 ítems; nosotros tenemos 6.** El paso de 10px escala:
   6 × 10 = 60px de stack + ~41px de pestaña ≈ **100px**, que cae casi exacto sobre el
   `--nav-height: 104px` que ya existe. El token no necesita cambiar.
3. **La referencia no tiene wordmark en la fila de pestañas** (sólo `INFO`/`IMPRINT`
   arriba a la derecha, en mono chico). Nosotros sí lo necesitamos (RFC-01 §3): ver la
   decisión **D4** en `docs/design/rfc/RFC-01-shell.md` §3.
4. **Los offsets `calc(2em + 241px)` de la referencia son valores a mano, uno por pestaña.**
   No los copies como números: con 6 ítems hay que **derivar la rampa** de tokens.
5. La referencia es blanco-sobre-blanco; nosotros somos dark-on-dark. La estética (paleta,
   texturas, tipografías) **no** se toca — se porta la **mecánica**, que es lo que el SDD §0
   dice que aporta esta referencia ("estructura e interacción, no su minimalismo B/N").

## 6. Qué tiene mal lo que hay hoy (medido en `localhost:3000`, mismo viewport)

| aspecto | referencia | `src/shared/ui/layout/archive-nav/` hoy |
|---|---|---|
| dirección del contenedor | `column` | fila (`flex items-end`) |
| ancho de cada ítem | full-bleed (1442px) | el de su propio texto (150-230px) |
| escalonado vertical | 10px por hoja | **ninguno** — las 6 pestañas en y=40 |
| relación entre ítems | offset horizontal, sin tocarse | solape `margin-left: -16px` |
| profundidad | z-index 50/40/30 por hoja | sin z-index por ítem (sólo la activa) |
| hover | `height` 10→2 + `margin-bottom` 8 | `translateY(-6px)` |
| sombra | `6px **-5px** 7px` alpha .06 | `4px **2px** 4px` alpha .35 |
| escalón tonal | ninguno (lo da la sombra) | `--folder-tone-1..6`: `#382a1e`→`#423427`, delta invisible |

El mismo modelo equivocado está en `template/template-src.html` (`.kc-nav__folders` en fila
+ `.kc-folder + .kc-folder { margin-left: -16px }`). **Por decisión del usuario el template
NO se toca en esta implementación** — queda como referencia histórica del prototipo, igual
que pasó con `<ascii-yarn>` en la decisión D1.

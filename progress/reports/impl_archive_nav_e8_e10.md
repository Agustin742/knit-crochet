# impl — `ArchiveNav`: enmiendas E8, E9 y E10 (corrección de #13 `ui_shell_nav`)

**Feature:** #13 `ui_shell_nav` — **sigue `done`, `feature_list.json` NO se tocó.**
**Contrato:** `docs/design/rfc/RFC-01-shell.md` §3 D4, invariantes 3, 5, 8, 8-bis y 10 + tabla
"Tercera tanda de enmiendas (E8-E10)".
**Alcance:** sólo el `ArchiveNav`. `BottomNav`, `template/template-src.html` y las deudas 13, 16, 17 y 18
quedaron intactos.

---

## 1. Archivos tocados

| Archivo | Qué |
|---|---|
| `src/shared/ui/layout/archive-nav/ArchiveNav.tsx` | Reestructurado: la hoja deja de ser el enlace; el enlace es la pestaña. Se resuelve la hoja **abierta** y se calculan columna y profundidad por separado. |
| `src/shared/ui/layout/archive-nav/archive-nav.variants.ts` | `leafVariants` (inerte + variante `open`), `leafSheetVariants` (canto suelto), `tabTrackVariants` (anclado al borde inferior de su hoja), `tabVariants` (el enlace, con hover/foco propios y lift por crecimiento). `navLeafPosition` → `navTabColumn`; nueva `navLeafDepth`. |
| `src/app/globals.css` | Token nuevo `--nav-tab-height-lifted`; comentarios del presupuesto vertical, del lift y de la rampa de z reescritos. |
| `src/shared/ui/layout/layout.test.tsx` | 2 tests reescritos + 8 nuevos (E8 ×3, E9 ×1, E10 ×4). |
| `src/shared/ui/layout/archive-nav/archive-nav.tokens.test.ts` | Presupuesto vertical partido en nominal (5 cantos) + degenerado (6 cantos); test del lift reescrito para E9; prosa de dos `describe` actualizada (E1 → E10). |
| `progress/current.md` | Feature en curso + plan. |

No se añadieron dependencias. No se tocó backend ni `AppShell`: el contrato público del componente
(`items`, `user`, `onLogout`, `className`) es idéntico.

---

## 2. E8 — hover y clic sólo en la pestaña

**Antes:** el `<a>` era la hoja entera (`w-full`, el canto a todo el ancho del shell) y llevaba el
marcador de grupo; el lift de la pestaña colgaba de la variante de hover de ese grupo. Consecuencia
medida por el leader: el puntero levantaba —y navegaba— una pestaña desde cualquier x de la franja.

**Ahora:** el árbol es

```
nav (flex-col-reverse)
└── div  [data-slot=leaf]    ← decoración inerte, NO es un enlace, bloquea el puntero
    ├── span [data-slot=sheet]  ← el canto (sólo si la hoja no es la abierta)
    └── span [data-slot=track]  ← carril de columnas, sigue sin capturar el puntero
        └── a  [data-slot=tab]  ← EL ENLACE: href, aria-label, aria-current, hover y foco
```

- La hoja pasó de `<a>` a `<div>` y lleva bloqueo de puntero en toda su caja; la pestaña lo rehabilita
  para sí misma (mismo mecanismo que ya usaba el carril).
- Desapareció el marcador de grupo del archivero: no queda ninguna variante de hover ni de foco fuera de
  la pestaña. Hay un test que lo fija recorriendo hoja, canto y carril.
- **A11y preservada:** el `<a>` conserva `href`, `aria-label={item.label}` y `aria-current="page"` en la
  activa. El anillo de foco pasó de la forma indirecta (variante de foco del grupo) a estar **en el propio
  enlace** — es el mismo anillo (`--focus`, grosor `--border-width-heavy`, offset `--border-width`), pero
  ahora sale del elemento que realmente recibe el foco. Comprobado en el CSS compilado: las reglas de foco
  se generan sobre el selector del enlace. El orden del DOM (= orden de tabulación) sigue siendo el de la
  lista de páginas.

---

## 3. E9 — la pestaña no puede despegarse

**Decisión propia (el RFC deja libre el cómo):** el lift **deja de ser un desplazamiento y pasa a ser
crecimiento de alto con la base anclada**.

- En reposo la pestaña mide `--nav-tab-height` (44px); con el puntero encima o con foco de teclado mide
  `--nav-tab-height-lifted` = `calc(--nav-tab-height + --nav-tab-lift)` (52px).
- La pestaña cuelga de un carril anclado al **borde inferior de su hoja**, así que al crecer **la base no
  se mueve**: sube sólo el borde superior.
- **Por qué esto cierra el defecto por construcción y no por afinado:** con un desplazamiento, la región
  que la pestaña cubría en reposo (incluido el canto entero de su propia hoja, con su filo claro) queda
  parcialmente destapada, y eso es lo que aparecía como una arista cruzando justo por debajo. Creciendo,
  la región cubierta **sólo puede aumentar**: no existe ningún punto que estuviera tapado en reposo y deje
  de estarlo al levantarse, sea cual sea el tono que haya detrás. El invariante deja de depender de que
  el salto sea menor que el canto (que era la garantía frágil de E5, y que además ya no aplica a la hoja
  abierta, porque ésa no tiene canto).
- Efecto secundario querido: desaparece cualquier posibilidad del parpadeo hover/unhover, porque la caja
  sensible crece bajo el puntero en vez de escaparse.
- La transición pasa de la propiedad de transformación a la de alto, con la misma duración y curva por
  token (`--dur-base`, `--ease-entrance`), y **sigue degradando sola** con la media global de
  `prefers-reduced-motion` de `globals.css`.

Coste asumido y anotado: la etiqueta va centrada en la pestaña, así que al crecer 8px el lockup sube 4px
en vez de 8. El movimiento del **borde** de la pestaña sí es de 8px, que es lo que se lee como "la ficha
sale del cajón".

---

## 4. E10 — 5 cantos, no 6

- **La hoja de la ruta activa es la hoja ABIERTA:** no monta la superficie del canto (no hay elemento
  `sheet`) y su caja no ocupa alto. Los cantos dibujados pasan a ser 5.
- **Baja al fondo del cajón** con el orden de flexión: el cajón se apila en columna invertida, así que el
  primero del orden de flexión es el de más abajo. Se usa la utilidad de "primero del orden" **sólo** en
  la hoja abierta; el **orden del DOM no cambia** (sigue siendo el de la lista, que es el de lectura y
  tabulación). Su cara es el área de contenido de la página, que queda justo debajo.
- **Profundidad = posición en el stack.** `navLeafDepth(index, openIndex)` devuelve 1 para la abierta (el
  fondo, la que pinta encima de todas) y 2…6 para las demás en el orden de la lista. Los tokens
  `--z-nav-leaf-1..6` pasan a numerar **ranuras del stack**, no índices de la lista; el comentario de
  `globals.css` lo dice explícitamente para que nadie los "corrija".
- **La columna horizontal NO se reordena.** `navTabColumn(index)` depende sólo del índice en la lista:
  Dashboard siempre en la columna 1, Stash siempre en la 6. Es lo que acota el coste de derogar E1, y
  tiene test propio: se renderiza en `/` y en `/stash`, se comprueba que el mapa etiqueta→columna es
  idéntico y —para que el test no sea trivial— que las profundidades **sí** cambiaron entre las dos rutas.
- **Caso degenerado explícito:** si el pathname no coincide con ninguna página de la lista, no hay hoja
  abierta; el cajón conserva el orden de la lista y vuelve a dibujar sus 6 cantos. Está cubierto por test
  (componente y tokens) porque es el peor caso del presupuesto vertical.
- Sólo puede haber **una** hoja abierta: se resuelve con un `findIndex` sobre la lista, no evaluando la
  ruta hoja por hoja. El fondo del cajón es una posición y no se puede compartir.

### Presupuesto vertical y la holgura de 10px

Nominal: 5 × 10 (cantos) + 44 (pestaña) = **94px** dentro de los **104px** de `--nav-height`.
**Sobran 10px y se dejaron vacíos, a propósito** (lo pedía el encargo: no rellenar sin decirlo). El
efecto es que todo el cajón baja 10px respecto de la versión anterior, con lo que la pestaña más alta
pasa de empezar en y=10 a empezar en y=20 y el wordmark (que llega hasta y≈34) gana aire. El test del
wordmark se sigue midiendo contra el **peor caso** (6 cantos), que es el que manda.

---

## 5. Tests

**Nuevos (8):**

- E8 — la hoja no es un enlace y cada hoja contiene exactamente un enlace, que es su pestaña; todos los
  enlaces del cajón son pestañas y todas tienen `href`.
- E8 — la hoja, el canto y el carril bloquean el puntero; la pestaña lo recibe (extiende el test que ya
  existía, que sólo cubría el carril).
- E8 — no queda marcador de grupo ni variante de hover/foco en hoja, canto ni carril; la pestaña lleva las
  dos, incluido el anillo de foco.
- E9 — la pestaña declara alto de reposo y alto levantado por token, y **no** lleva ninguna utilidad de
  desplazamiento.
- E10 — con ruta activa se dibujan **5** cantos y la hoja abierta no tiene el suyo.
- E10 — la abierta lleva la utilidad de "primero del orden" (y ninguna otra) y el mapa de profundidades es
  exactamente `[2,3,1,4,5,6]` con Lanas activa.
- E10 — sin ruta activa: 6 cantos y profundidades en el orden de la lista.
- E10 — la columna de cada página es la misma en `/` y en `/stash`, y las profundidades cambian.

**Reescritos con intención (2 + 2):**

- `layout.test.tsx` "stacks one leaf per page…": leía `aria-label` de la hoja, que ya no lo tiene (lo lleva
  la pestaña). Ahora lee la etiqueta a través de la pestaña de cada hoja; sigue fijando lo mismo, que es
  que **el orden del DOM no se reordena al navegar**.
- `layout.test.tsx` "marks the active route ON ITS TAB, leaving every leaf identical": **fijaba E1**, que
  E10 deroga — exigía que las 6 hojas fueran idénticas, y ahora la abierta es distinta por contrato. Se
  reescribió para fijar lo que de E1 sobrevive: la marca de activa (tono de página + acento) vive en la
  **pestaña**, y entre dos rutas cambian exactamente **dos** pestañas (la que se activa y la que se
  desactiva). Lo que E1 pedía y ya no se cumple está cubierto, en positivo, por los tests de E10.
- `archive-nav.tokens.test.ts` "las 6 hojas más una pestaña entran en el alto del nav": partido en dos —
  el presupuesto **nominal** de E10 (5 cantos, con la holgura asertada) y el **degenerado** (6 cantos).
- `archive-nav.tokens.test.ts` "el salto del hover no despega la pestaña de su canto (E5)": exigía
  `--nav-tab-lift ≤ --nav-leaf-height`, una condición que (a) ya no es necesaria con el lift por
  crecimiento y (b) es **imposible** de cumplir para la hoja abierta, que no tiene canto. Reescrito para
  fijar el mecanismo de E9: el alto levantado se deriva de alto de reposo + salto.

Otros dos `describe` cambiaron sólo de prosa (rampa de profundidad: "primera hoja" → "fondo del cajón";
marca de activa: E1 → E10). Ningún test se borró sin reemplazo.

---

## 6. Verificación

`bash ./init.sh` — **verde**:

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet


 Test Files  40 passed | 1 skipped (41)
      Tests  419 passed | 6 skipped (425)
   Start at  16:35:48
   Duration  49.61s (transform 3.72s, setup 39.94s, import 49.35s, tests 19.66s, environment 9.57s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

**Baseline 411 passed | 6 skipped → 419 passed | 6 skipped.** De dónde sale cada uno de los +8:

- `layout.test.tsx`: **+7**. Uno de los tests viejos (el del carril y el puntero) se convirtió en un
  `describe` de **3** para E8 (+2); `describe` nuevo de E9 (+1); `describe` nuevo de E10 con **4** (+4).
- `archive-nav.tokens.test.ts`: **+1**, el presupuesto vertical partido en nominal + degenerado.
- Skipped sin cambios (6).

`pnpm build` — **OK** (12 páginas estáticas + las 22 rutas de API, sin warnings nuevos).

**Comprobación extra del CSS generado** (compilando `globals.css` con el mismo método de
`globals-css.test.ts`, script temporal borrado después): existen y son correctas las reglas de
`order: -9999`, `height: var(--nav-leaf-height)`, `height: var(--nav-tab-height)`,
`transition-property: height`, y las de hover y de foco visible con
`height: var(--nav-tab-height-lifted)`. El token `--nav-tab-height-lifted` se emite en `:root`. Cero
`var(--…*)` inválidos.

**Guardrails del arnés, todos verdes:** cero hardcode (`no-hardcode.test.ts` — hubo que quitar dos
medidas en píxeles que se me colaron **en comentarios** del archivo de variantes: el guardrail no
distingue código de prosa, y hace bien), sintaxis canónica de Tailwind v4
(`canonical-tailwind-classes.test.ts`), alcance de escaneo (`globals-css.test.ts`), y `axe` sin
violaciones en `ArchiveNav`, `BottomNav` y `AppShell`.

---

## 7. Decisiones no obvias (para el reviewer)

1. **El lift por crecimiento en vez de por desplazamiento** (§3). Es la decisión de fondo. Alternativa
   descartada: mantener el desplazamiento y taparle el hueco con una sombra sólida hacia abajo del color
   de la pestaña. Funcionaba, pero (a) obligaba a dos tokens de sombra distintos porque la pestaña activa
   tiene otro tono, (b) durante la transición la sombra se interpola con opacidad y se veía una banda
   translúcida a mitad de camino, y (c) dejaba el invariante dependiendo de que dos números siguieran
   cuadrando. El crecimiento lo cierra por construcción.
2. **La reordenación vertical se hace con el orden de flexión, no reordenando el array.** El orden del
   DOM es el de lectura y tabulación y tiene que seguir siendo el de la lista de páginas; mover el array
   habría reordenado también el foco de teclado en cada navegación.
3. **La pestaña se lleva su propia sombra proyectada.** Antes la heredaba del canto, porque el carril
   colgaba dentro del elemento del canto y el filtro se aplica a todo el subárbol. Al separarlos (E8), la
   pestaña se quedaba sin relieve: se le dio el mismo filtro por token para no cambiar la piel.
4. **Se mantiene una `<div>` por hoja aunque ya no sea interactiva.** Es la que sostiene el alto del canto,
   la ranura de profundidad y el orden en el stack; convertirla en fragmento obligaría a poner esas tres
   cosas en el canto, que es justo el elemento que E10 hace desaparecer en la hoja abierta.
5. **`data-open`, `data-column` y `data-depth`** sustituyen al viejo `data-position` (que mezclaba columna
   y profundidad en un solo número, algo que E10 vuelve imposible). Son atributos de test, no de estilo.
6. La media de hover de Tailwind v4 envuelve las reglas de hover en `@media (hover: hover)`: en un
   dispositivo táctil la pestaña no crece. No es un cambio (el comportamiento anterior era idéntico) y por
   debajo de `--bp-archive` manda el `BottomNav`.

## 8. Qué queda abierto

- **Validación visual humana en el navegador.** Los tests fijan estructura, tokens y a11y, no píxeles: que
  la hoja abierta se lea de verdad como continuación del área de contenido, y que el crecimiento de la
  pestaña se lea como "sale del cajón", es revisión humana (SDD §9).
- **Los 10px de holgura vertical** quedan vacíos por decisión explícita. Si se quiere aprovecharlos, la
  palanca natural es subir `--nav-leaf-height` o el alto de la pestaña, no meter un elemento nuevo.
- Deudas **13, 16, 17 y 18** de `progress/current.md`: intactas, estaban fuera de alcance.
- La deuda **15** (comentario de `no-hardcode.test.ts` que cita clases literales) sigue viva: no toqué ese
  archivo.

---

# 9. Ajuste posterior — la hoja abierta pierde la CARA, no el ALTO

Encargo del leader tras su validación visual (E8, E9 y E10 confirmados en el navegador a 1536px). Defecto
reportado por el usuario: con la hoja abierta a **alto cero** no ocupaba ranura, así que su pestaña y la
del canto más bajo caían **al mismo nivel** (Dashboard y Proyectos las dos en y 60–104). La escalera del
fichero arrancaba plana y se perdía la lectura de "esta ficha está fuera del cajón".

**Regla nueva:** la hoja abierta **conserva su ranura de `--nav-leaf-height`**; lo único que no monta es la
superficie del canto. Como lo dijo el usuario: *no baja Dashboard, suben los 5 cantos*.

## 9.1 Qué cambió

| Archivo | Cambio |
|---|---|
| `archive-nav.variants.ts` | El alto de la hoja sube a la base de `leafVariants` (lo llevan las seis, siempre); la variante `open` se queda **sólo** con la utilidad de "primero del orden". Desaparece la de alto cero. |
| `ArchiveNav.tsx` | Sólo comentarios: el JSDoc y la nota del canto explican que son **5 cantos sobre 6 ranuras**. |
| `globals.css` | El comentario del presupuesto vertical vuelve a contarse en **ranuras** (6 × 10 + 44 = 104 exactos) y explica por qué la hoja abierta ocupa ranura aunque no pinte canto. |
| `archive-nav.tokens.test.ts` | Presupuesto reunificado en un test; wordmark con gate nuevo; prosa de dos tests actualizada. |
| `layout.test.tsx` | Test nuevo: las seis hojas declaran el alto de ranura y ninguna lleva alto cero. |

Es un cambio de **una línea de clases**: el alto pasa de la variante a la base. Que fuera tan pequeño es
consecuencia de que la geometría vertical ya salía del apilado y no de offsets a mano (invariante 4).

## 9.2 Geometría resultante (Dashboard activa)

El cajón vuelve a medir 60px (6 ranuras) y arranca en y=44. Cada pestaña se ancla a la base de **su**
ranura, así que la escalera sale sola:

| hoja | ranura | canto | base de su pestaña |
|---|---|---|---|
| Dashboard (abierta) | 94–104 | **sin canto** | 104 |
| Proyectos | 84–94 | 84–94 | 94 |
| Lanas | 74–84 | 74–84 | 84 |
| Patrones | 64–74 | 64–74 | 74 |
| Calculadoras | 54–64 | 54–64 | 64 |
| Stash | 44–54 | 44–54 | 54 |

Coincide con la tabla del encargo. La ranura 94–104 queda sin cara: se ve el fondo del header (espresso +
puntos), que es el mismo tono del área de contenido que empieza en 104, con la pestaña abierta cruzándola.
La lectura es la buscada: ahí no hay hoja, hay contenido.

**Siguen siendo 5 cantos dibujados.** El invariante de E10 es sobre cantos **pintados**, no sobre ranuras,
y no se aflojó: el test que cuenta 5 superficies y el que comprueba que la abierta no tiene la suya están
intactos y verdes.

## 9.3 Qué pasó con la partición nominal/degenerado

**Se eliminó, y con ella los 10px de holgura.** En la ronda anterior había partido el presupuesto vertical
en dos tests —el "nominal" (5 cantos = 94px, con 10px de aire asertados) y el "degenerado" (6 cantos = 104px
cuando ninguna ruta de la lista está activa)—. Esa partición existía **sólo** porque el alto del stack
dependía de si había ruta activa o no. Al ocupar ranura la hoja abierta, el alto del cajón es **siempre**
6 × 10 + 44 = 104 = `--nav-height`: no hay dos casos que medir. Los dos tests volvieron a ser **uno**, con
la prosa reescrita para dejar claro que se cuenta en **ranuras** y que los cantos pintados son 5 (el error
que la partición invitaba a cometer).

Efecto colateral bueno: desaparece la única cifra de la geometría que dependía de la ruta, así que el
wordmark, el techo del cajón y la pestaña más alta dejan de moverse al navegar.

## 9.4 E7 verificado (la colisión no vuelve)

La pestaña más alta vuelve a empezar en **y=10** (y=2 levantada) y el wordmark llega a **y≈34.4**, así que
la pregunta es legítima. Se cumple, y ahora está **clavado por test** en vez de razonado en prosa:

- **Los cantos** (que son lo que E7 prohíbe cruzar por debajo del wordmark) tienen su techo en **y=44**:
  el test de siempre (`34.4 ≤ 44`) sigue midiendo eso y no depende ya de la ruta.
- **Las pestañas** sí desbordan por encima de ese techo, pero cada una en su columna. La única que comparte
  banda horizontal con el wordmark es la de la **columna 1** (x≈24–154 contra x≈24–185 del wordmark); de la
  columna 2 en adelante caen a la derecha de donde acaba el wordmark.
- Su peor caso es la **ranura 2 con el puntero encima**: la primera página de la lista o es la hoja abierta
  (ranura 1, la más baja de todas) o es la primera de las cinco que se apilan encima, o sea la ranura 2.
  Da tope superior **y=42** contra los 34.4 del wordmark: **7.6px de margen**.
- **Test nuevo** en `archive-nav.tokens.test.ts` ("la pestaña que comparte columna con el wordmark no lo
  alcanza"), derivado de los mismos tokens: si alguien agranda la etiqueta, el salto del hover o el
  wordmark hasta comerse ese margen, cae. Es la grieta que E7 había dejado sin gate.

## 9.5 Verificación

`bash ./init.sh` — **verde**:

```
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet


 Test Files  40 passed | 1 skipped (41)
      Tests  420 passed | 6 skipped (426)
   Start at  00:42:22
   Duration  34.71s (transform 2.68s, setup 28.78s, import 33.72s, tests 13.97s, environment 6.75s)

[OK]    tests verdes
```

`pnpm build` — **OK** (`✓ Compiled successfully`, mismo mapa de rutas).

**419 passed | 6 skipped → 420 passed | 6 skipped.** El +1 neto sale de tres movimientos:

- **−1** en `archive-nav.tokens.test.ts`: los dos tests del presupuesto (nominal + degenerado) vuelven a
  ser uno solo (§9.3).
- **+1** en `archive-nav.tokens.test.ts`: el gate nuevo de la pestaña de la columna 1 contra el wordmark
  (§9.4).
- **+1** en `layout.test.tsx`: las seis hojas declaran el alto de ranura y ninguna lleva alto cero — el
  test que fija este ajuste y evita que alguien vuelva a poner a cero la hoja abierta.

Ningún test se borró sin reemplazo. Lint, typecheck, cero hardcode, sintaxis canónica de Tailwind v4,
alcance de escaneo y `axe` siguen verdes. E8 y E9 no se tocaron; `BottomNav`, `template/`,
`feature_list.json` y las deudas 13, 15, 16, 17 y 18, intactos.

## 9.6 Qué queda abierto

- Los **7.6px de margen** entre la pestaña de la columna 1 levantada y el wordmark son el punto más
  ajustado de la geometría vertical. Está bajo test, pero es el número a mirar si alguien sube el tamaño de
  la etiqueta (deuda abierta: la decisión pendiente del usuario sobre 18px vs 36px) o el salto del hover.
- Sigue pendiente la **validación visual humana** de este último ajuste: que la escalera se lea monótona y
  que la ranura sin cara del fondo se lea como continuación del contenido, no como un hueco.

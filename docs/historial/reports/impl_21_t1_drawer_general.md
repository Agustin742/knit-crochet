# impl 21 — tanda 1: Drawer + Tabs + tab General

**Estado:** terminada, pendiente de review.
**Feature:** #21 `projects_detail_ui` (tanda 1 de 2). NO marcar `done`.

## Plan (previo a leer nada)

- [ ] Leer RFC-03 E3 (§7-quater) entera + §1/§2/§4/§5; SDD-01 §9; architecture/conventions.
- [ ] Primitiva `Tabs` nueva (`role=tablist/tab/tabpanel`, flechas), NO sobre `SegmentedControl`.
- [ ] `Drawer` como variante de `Dialog` (sólo geometría lateral en `dialog.variants.ts`, patrón `DIALOG_SIZES`).
- [ ] Tab General (nombre, foto, tipo, status, needles, fechas, notas).
- [ ] Tap en card de proyecto abre drawer, sin anidar `<button>` dentro de `<a>`.
- [ ] Tests RTL (abre desde card, foco atrapado, Escape devuelve foco, flechas en tabs) + axe.
- [ ] `bash ./init.sh` EXIT 0; aritmética de tests cierra desde 1426 passed | 13 skipped (1439), 84 archivos.

## Bitácora

- (inicio) informe creado antes de leer.

## Medición previa (antes de tocar código)

- `Dialog` ya tiene jaula de foco, `Escape`, `aria-modal`, portal al `body`, bloqueo de scroll y
  devolución del foco (`src/shared/ui/primitives/dialog/Dialog.tsx`). El drawer sólo necesita geometría.
- `dialogSizes` → `DIALOG_SIZES` es el patrón de ancla de contrato a imitar (REGLA 2a).
- `public-api.test.ts` está anclado al literal: `Tabs` se paga ahí (E3 c, precedente E2(c)).
- Cliente HTTP: **existe** `features/projects/ui/projects-client.ts` (tercer clon, E1 h). Se **reusa**
  añadiéndole `getProjectDetail`; no se crea un cuarto.
- `projects-ui.classes.test.ts` cubre 3 componentes de /proyectos con CSS compilado; su lista
  `EXTERNAL_SOURCES` se compara EXACTA **y** contra los atributos vacíos → usar `cn()` en un componente
  de esta carpeta rompería el gate (un nombre externo que no deja ningún atributo vacío). Por eso el
  overlay de la card no usa `cn`.
- Gates de tokens (deudas 158/160/161) en moratoria: **no** se crea un `.tokens.test.ts` para `Tabs`.

## Bitácora — tanda de trabajo 1 (código escrito, verificación parcial)

Archivos NUEVOS:
- `src/shared/ui/primitives/tabs/{Tabs.tsx,tabs.variants.ts,index.ts,Tabs.test.tsx}`
- `src/features/projects/ui/{ProjectDetailDrawer.tsx,ProjectDetailDrawer.test.tsx}`
- `src/features/projects/ui/{project-detail.ts,project-detail.test.ts}`

Archivos MODIFICADOS:
- `dialog.variants.ts` (+`placement`: velo y panel; `DIALOG_PLACEMENTS` derivado como `DIALOG_SIZES`),
  `Dialog.tsx` (pasa `placement`), `dialog/index.ts`, `Dialog.test.tsx` (+3 tests del cajón).
- `shared/ui/primitives/index.ts`, `shared/ui/public-api.test.ts` (+`Tabs`, +`DIALOG_PLACEMENTS`).
- `shared/lib/format.ts` (+`formatDate`, en UTC) y `format.test.ts` (+3).
- `ProjectCard.tsx` (+`onOpenDetail`, capa de tap, `ProjectPhoto` exportada) y su test (+5).
- `ProjectsView.tsx` (estado `detailId` + monta el cajón) y su test (+6, doble del detalle).
- `projects-client.ts` (+`getProjectDetail`), `ui/types.ts` (+`SerializedProjectDetail`).
- `projects-ui.classes.test.ts` (el cajón entra al gate de CSS compilado).

Parciales verdes: tabs 11, dialog 46 (archivo), drawer 13, card 26, view 42, project-detail 7, format 16.

---

# INFORME FINAL — #21 tanda 1 (Drawer + Tabs + tab General + tap en la card)

**Estado:** implementada, **NO marcada `done`** (quedan la tanda 2 y la review).

## 1. Qué se hizo, y contra qué cláusula

| Alcance pedido | Dónde vive | Nota |
|---|---|---|
| Primitiva `Tabs` (E3 c) | `src/shared/ui/primitives/tabs/` | `tablist`/`tab`/`tabpanel`, flechas + `Home`/`End` con vuelta en los extremos, `tabindex` rotatorio, activación automática. **No** se construyó sobre `SegmentedControl`. |
| `Drawer` = variante del `Dialog` (E3 b) | `dialog.variants.ts` + `Dialog.tsx` | Nueva variante **`placement`** (`center` \| `side`) en **velo y panel**. Cero mecanismo duplicado: foco atrapado, `Escape`, `aria-modal`, portal y bloqueo de scroll se heredan tal cual. |
| Tab General (RFC-03 §2) | `ProjectDetailDrawer.tsx` | foto, tipo, estado, agujas, fechas y notas. El **nombre** es el título del cajón (su nombre accesible), así que no se repite dentro. |
| Tap en la card (E1 f) | `ProjectCard.tsx` + `ProjectsView.tsx` | Capa transparente **hermana** del quick-start. |

### El ancla de contrato, como pide REGLA 2a
`DIALOG_PLACEMENTS` se **deriva** del objeto `dialogPlacements` con `Object.keys`, igual que
`DIALOG_SIZES` de `dialogSizes`, y se ancla al literal en `Dialog.test.tsx`. La geometría del panel va en
un objeto aparte anotado `Record<DialogPlacement, string>`: **añadir una colocación sin su geometría no
compila**.

### Cómo se resolvió el `<button>` dentro de `<a>` (el motivo por el que E1(f) aplazó esto)
La tarjeta **no** es un enlace ni un botón envolvente. Dentro del contenido (`relative`) va **primero**
una capa `absolute inset-0` que es un `<button>` con su nombre accesible en texto oculto
(`Ver detalle de <nombre>`), y el quick-start va **después** en el DOM con `relative`, así que se pinta
por encima sin necesidad de escalones de `z-index`. **Son hermanos, ninguno dentro del otro**: marcado
válido, `axe` limpio con los dos montados, y los dos alcanzables por teclado (test explícito de que
ninguno contiene al otro, comprobado en las dos direcciones).

**Precio, escrito:** la capa cubre el **contenido** de la tarjeta, no la franja de relleno de la `Card`.
Un tap en ese borde no abre nada. Alcanzarlo exigiría que la `Card` del design system se posicionara a sí
misma, o pasarle la utilidad de posición por `className` desde `ProjectCard` — y esto último **rompe el
gate** `projects-ui.classes.test.ts`, que compara la lista de fuentes externas contra los atributos que
quedan vacíos: hoy `className` está en las dos listas porque `<Card className={className}>` es el único
atributo que resuelve a cero clases. Misma razón por la que **no se usó `cn()`** en esta carpeta.

## 2. Datos: se reusó el cliente, no se creó el cuarto clon
`getProjectDetail` + `projectDetailEndpoint` se añadieron a **`features/projects/ui/projects-client.ts`**
(el tercer clon que E1(h) ya fichó). No hay cliente nuevo.

El cajón **pide `GET /api/projects/:id` al abrirse** aunque la lista ya traiga esos campos. Motivo escrito
en el JSDoc: la lista es una foto del momento en que se cargó y el detalle es la fuente de verdad (la
misma que #22 va a desactualizar en cuanto guarde), y ese endpoint es el único que trae las lanas
enlazadas de las que vive la tanda 2. El **título y la foto** salen de lo que la lista ya tiene, así que
no parpadean mientras viaja la petición.

## 3. Decisiones no obvias

1. **El `tablist` tiene UNA pestaña hoy, y es deliberado.** Pintar Progreso/Lanas/Sesiones sin contenido
   sería exactamente lo que **E3(d)** prohíbe (prometer en pantalla lo que la app no cumple). `DETAIL_TABS`
   es la lista, con un test que ancla que hoy vale `["general"]`; la tanda 2 la amplía y no toca nada más.
   **Lo digo como pide el encargo: un carril de una sola pestaña es un estado transitorio, no la forma
   final.** Se lee como una pestaña de carpeta rotulada "General" sobre la línea del carril; no queda un
   hueco raro, pero el control no aporta nada hasta la tanda 2.
2. **Fechas en UTC.** `formatDate` (nuevo, en `shared/lib/format.ts`) formatea con `timeZone: "UTC"`.
   `startDate`/`endDate` son fechas de calendario guardadas como medianoche UTC: pintadas en la zona del
   lector, **cualquiera al oeste de Greenwich vería el día anterior** — para Buenos Aires, el 100% de las
   fechas. Devuelve `null` con una fecha ilegible; el texto de repuesto lo elige la pantalla.
3. **Tres ausencias, tres textos** (`Sin anotar`, `Todavía no`, `Sin notas`): "no anotaste agujas" y
   "todavía no lo terminaste" no son la misma ausencia, y un guion para las dos no diría ninguna.
4. **Copy duplicado a propósito:** `DETAIL_ERROR_TITLE` repite "Se soltó un punto" en vez de importarlo de
   `ProjectsView`, que es quien monta el cajón: importarlo haría un ciclo entre los dos módulos por una
   cadena de texto.
5. **`ProjectPhoto` se exportó** desde `ProjectCard.tsx` y se reusa en el tab General: el mismo marco, la
   misma proporción y el mismo hueco de E2(g). Así el proyecto no se ve de dos maneras según desde dónde
   se mire.
6. **El cajón entró al gate de CSS compilado** (`projects-ui.classes.test.ts`): es la misma página y sus
   clases se quedarían sin comprobar. Sigue verde, con la lista de fuentes externas intacta.

## 4. Los tests, y las dos reglas que costaron rechazos

- **REGLA 7 — el doble tiene que poder existir en producción.** En el test del cajón, el proyecto que la
  lista le pasa y el que responde el endpoint son **el mismo objeto** (`renderDrawer`): servir dos
  payloads distintos para el mismo id mediría un estado inalcanzable. En `ProjectsView.test.tsx` el doble
  responde el detalle **desde la misma lista que sirvió**, y devuelve **404** si el id no está.
  El estado de **carga** se mide con una respuesta **retenida** (`serveLater`), no con un mock instantáneo:
  sin eso el fotograma de carga no existe y el aserto pasaba por accidente — fue el primer rojo real de la
  sesión.
- **Fechas derivadas (deuda 164).** Ni un año escrito a mano: `String(new Date().getUTCFullYear() - 1)`
  compone los ISO y los textos esperados. El día y el mes sí son del fixture, que es lo que se afirma.
- **Cobertura pedida:** el cajón **abre desde la card** (`ProjectsView.test.tsx`), **atrapa el foco**
  (cajón + `Dialog`), **`Escape` cierra devolviendo el foco a la card** (a la card concreta por su nombre
  accesible, no a "algún" botón), y las **tabs se mueven con flechas** (izquierda, derecha, vuelta en los
  dos extremos, `Home`/`End`). `axe` sin violaciones en: `Tabs`, el cajón con el detalle cargado (portal
  incluido, vía `baseElement`), la card con los dos controles montados, y la lista entera con el cajón
  abierto.
- **Higiene heredada:** el `afterEach` del cajón comprueba que **no queda bloqueo de scroll** (deuda 101),
  y el de `ProjectsView` se actualizó: ahora esa pantalla **sí** bloquea mientras el cajón está abierto.

## 5. Verificación

```
$ bash ./init.sh
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"
 Test Files  84 passed | 3 skipped (87)
      Tests  1485 passed | 13 skipped (1498)
   Duration  139.98s
[OK]    tests verdes
── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
EXIT=0
```

`pnpm build` → `✓ Compiled successfully in 10.4s` (SDD §9 pide build verde y `init.sh` no lo corre).

### La aritmética, sin residuo
Punto de partida: **1426 passed | 13 skipped (1439)**, 84 archivos (81 verdes + 3 saltados).
Ahora: **1485 passed | 13 skipped (1498)**, 87 archivos (84 verdes + 3 saltados).

**+59 tests, +3 archivos.** Desglose:

| Dónde | + |
|---|---|
| `Tabs.test.tsx` (nuevo) | 11 |
| `ProjectDetailDrawer.test.tsx` (nuevo) | 13 |
| `project-detail.test.ts` (nuevo) | 7 |
| `Dialog.test.tsx` (cajón: ancla de nombres + geometría + jaula de foco) | 3 |
| `ProjectCard.test.tsx` (tap al detalle) | 5 |
| `ProjectsView.test.tsx` (cajón de punta a punta) | 6 |
| `format.test.ts` (`formatDate`) | 3 |
| `projects-ui.classes.test.ts` (un `it` más: el cuarto componente) | 1 |
| `no-hardcode.test.ts` (**se genera por archivo**: 5 fuentes nuevas x 2) | 10 |
| **Total** | **59** |

1439 + 59 = **1498**. Cierra exacto. Ningún test previo cambió de resultado; `public-api.test.ts` no suma
tests (lo que creció son sus dos listas literales: `Tabs` y `DIALOG_PLACEMENTS`).

**El guardrail de no-hardcode saltó una vez, y se arregló el texto, no el gate:** un comentario mío hablaba
del borde de la `Card` en píxeles. El barrido incluye comentarios. Reescrito sin unidad.

**Fui el único corriendo la suite.** Ningún timeout: el único rojo de la primera pasada completa fue ese
literal en un comentario, reproducible y arreglado.

## 6. Lo que NO se hizo (y por qué)

- **Tabs Progreso, Lanas y Sesiones:** tanda 2. **No pinté sus pestañas** (E3 d).
- **"Editar" y "crear patrón":** E3(d). Hay un test que ancla que el **único** botón del cajón es
  "Cerrar" y que no hay ningún enlace dentro.
- **Deudas 158/160/161 (gates de tokens):** en moratoria, no se abrieron. En concreto **no** se creó un
  `tabs.tokens.test.ts`: SDD §9 pide RTL + smoke + `axe`, no un gate de tokens por primitivo.
- **`feature_list.json`:** intacto (#21 sigue `in_progress`).
- **`progress/deudas.md`:** intacto, como pide el encargo.

## 7. Verificación en navegador: NO la pude hacer

**No tengo herramientas de navegador en esta sesión** (ni Playwright, ni MCP de navegador, ni captura de
pantalla). Lo que sí pude medir sin ojos, y lo que queda sin medir:

**Medido:**
- **Cero clases inertes.** Las 41 utilidades de `tabs.variants.ts` y las 60 de las dos colocaciones del
  `Dialog` (`center` y `side`, con sus dos tamaños) se compilaron contra el CSS real de `globals.css` y
  **todas emiten regla**. Comprobado con la misma técnica del gate (`compileGlobalsCss` + `emitsRule`) en
  un archivo temporal que **borré** — el design system no tiene un gate de CSS compilado propio, y crear
  uno es una slice de arnés, no de esta feature (ver deuda 1, abajo).
- Los conflictos de utilidades los resuelve `cn()`/`twMerge` en el orden correcto: en la colocación
  lateral, el radio nulo gana al redondeado y la sombra nula a la sombra dura.

**Sin medir (el eje visible):** que el cajón se vea de verdad pegado al lateral y a alto completo, que el
carril de pestañas no se corte en angosto, que la foto en un cajón ancho no se coma media pantalla, y que
la rejilla de dos columnas de los datos aguante en móvil. **`happy-dom` no maqueta y `axe` no mide
contraste real.** Esto necesita el paso del líder (REGLA 4).

## 8. Deuda nueva (aquí, no en `deudas.md`)

1. **[Se puede publicar una pantalla con estilos que no existen, con todo en verde]** — `shared/ui/`
   **no tiene gate de CSS compilado**. `features/dashboard/ui/` y `features/projects/ui/` sí lo tienen
   (`*-ui.classes.test.ts`), así que una utilidad mal escrita en una **página** se caza y la misma
   utilidad mal escrita en un **primitivo** no. *Escenario de fallo concreto:* si `TAB_CLASSES` pidiera un
   radio superior que el tema no define, la pestaña saldría con esquinas rectas y `pnpm test`, `lint`,
   `typecheck` y `build` seguirían **verdes**. *Medición:* lo comprobé a mano en esta sesión con un archivo
   temporal (41 clases de `Tabs`, 60 del `Dialog`, 0 inertes) y lo borré: dejarlo puesto sería crear un
   gate nuevo sin decisión de arnés. Coste estimado: un archivo; la técnica ya está extraída en
   `shared/ui/testing/class-names-from-source.ts`.
2. **[El usuario ve una pestaña sola que no lleva a ninguna parte]** — el carril de detalle tiene **una**
   pestaña hasta la tanda 2. *Escenario:* alguien abre un proyecto y ve "General" como única pestaña; no
   hay nada roto, pero el control no sirve para nada todavía. *Se salda con la tanda 2*, así que no
   propongo apaño.
3. **[El usuario toca el borde de una tarjeta y no pasa nada]** — la capa del tap cubre el contenido, no el
   relleno de la `Card`. *Escenario:* un tap en la franja entre el borde dibujado y la foto no abre el
   detalle. *Medición:* esa franja es `--space-5`. Arreglarlo bien pide que `Card` acepte posicionarse
   (design system) o desbloquear `cn()` en esta carpeta, que hoy rompe el gate de clases descrito en §1.

---

## ⚠️ CORRECCIÓN del leader (2026-08-24), tras el review de T1

**Una afirmación de este informe es FALSA y se corrige aquí en vez de dejarla correr**, porque la regla
del proyecto es que **una ficha que miente es peor que no tenerla**.

Este informe afirma que `cn()` / `twMerge` resuelve el conflicto entre `shadow-hard-lg` (colocación
centrada) y `shadow-none` (colocación lateral). **No es cierto.** El reviewer lo **midió**: las dos
utilidades **sobreviven** a `cn()` —`twMerge` no las reconoce como el mismo grupo— y **el ganador lo
decide el orden en el CSS compilado**, no la fusión de clases.

**No cambia el resultado en pantalla** —la REGLA 4 confirmó el cajón bien pintado— y **por eso no fue
bloqueante**. Lo que cambia es el motivo: quien lea esto tiene que saber que la sombra se está
resolviendo por **cascada**, no por `cn()`. Si mañana alguien reordena el CSS, el razonamiento de este
informe no lo protege.

Detalle completo y medición en `progress/reports/review_21_t1.md` §A.4.

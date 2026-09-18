# impl — lote de deudas 165 + 166

> **Informe incremental (anti-congelación).** Se escribió ANTES de empezar y se
> fue actualizando al cerrar cada deuda.

**Contrato:** `docs/design/rfc/RFC-01-shell.md` §"Séptima tanda — E14" (deuda 165)
y `docs/design/rfc/RFC-03-proyectos.md` §"7-sexies. Enmienda E5" (deuda 166).
Fichas crudas: `progress/deudas.md` líneas 2509-2523.

**Modo:** strict TDD (test en rojo primero, después el código) en las dos deudas.
**Fuera de alcance, respetado:** `feature_list.json` no se tocó; nada se marcó
`done`; no se tocó el **interior** de la barra (6 accesos, tamaños táctiles, marca
de la activa), ni `archive:hidden`, ni el `ArchiveNav`, ni el `0%` sin meta.

---

## Estado

- [x] Deuda 165 — la barra móvil se pega al borde inferior
- [x] Deuda 166 — el contador sin meta deja de leerse como `1 / 0`
- [x] `bash ./init.sh` → **EXIT 0**

---

## Archivos

### Creados

| Archivo | Qué es |
|---|---|
| `src/shared/ui/layout/bottom-nav/bottom-nav.classes.test.ts` | **El gate de E14 (c)**, sobre CSS **compilado**. 18 tests. |
| `progress/reports/impl_deudas_165_166.md` | Este informe. |

### Modificados

| Archivo | Qué cambió |
|---|---|
| `src/app/globals.css` | Token nuevo `--safe-area-bottom`, dentro de `@theme`, con su porqué escrito. |
| `src/shared/ui/layout/bottom-nav/BottomNav.tsx` | La barra pasa a pegajosa con anclaje inferior + relleno del área segura por token. Comentarios del porqué. |
| `src/features/projects/ui/project-detail.ts` | Función de copia `roundsCounterLabel(rounds, targetRounds)` + `ROUNDS_UNIT`. |
| `src/features/projects/ui/ProgressTab.tsx` | La cabecera consume esa función en vez de componer la fracción en el JSX. |
| `src/features/projects/ui/project-detail.test.ts` | 4 tests puros de `roundsCounterLabel`. |
| `src/features/projects/ui/ProgressTab.test.tsx` | 4 tests de la cabecera del tab (sin meta, singular, con meta y la **transición**). |

---

## Deuda 165 — la navegación móvil no estaba pegada abajo

### Qué se cambió

`BottomNav.tsx` ganó **tres** cosas en su atributo de clase, todas sin variante:

1. **Posición pegajosa** (`sticky`, no `fixed`) — E14 (a). No sale del flujo, así
   que el caparazón no compensa con relleno y la barra **no puede tapar el final
   del contenido**: al llegar abajo del todo se apoya en su sitio.
2. **Anclaje inferior** (`bottom-0`). Sin él, una posición pegajosa **no se pega
   a nada**: con el desplazamiento en su valor automático el elemento se
   comporta como uno relativo y se queda donde estaba. Son dos mitades de la
   misma decisión y por eso van a dos asertos distintos.
3. **Relleno del área segura** (`pb-(--safe-area-bottom)`) — E14 (b), sin
   números crudos.

El `z-(--z-nav)` que ya estaba escrito **no se tocó**: ahora, por fin, significa
algo (sobre un elemento estático el `z-index` era inerte, que es literalmente la
causa de la ficha).

**Ninguna de las tres lleva variante, y eso es deliberado**: las variantes de
este repo son de **ancho mínimo** (E12 b), así que una regla escrita "para que
aplique sólo hacia abajo" no compila a nada — que es exactamente cómo nació esta
deuda.

### El token nuevo

```
--safe-area-bottom: env(safe-area-inset-bottom, 0px);
```

Va en `@theme` de `globals.css`, que es donde viven los valores; el componente no
escribe ningún número. Se comprobó que Tailwind **sí lo emite**: v4 hace
tree-shaking de los tokens del tema y sólo los declara cuando algo los consume
(probado: un token de prueba sin consumidor no aparece en el compilado, y éste
aparece en cuanto el `pb-(--safe-area-bottom)` existe en un fuente escaneado).

### Qué mide el gate nuevo (`bottom-nav.classes.test.ts`, 18 tests)

Todo sobre el **CSS compilado con el compilador de la app**, no sobre nombres de
clase, usando `shared/ui/testing/class-names-from-source.ts` (precedentes:
`projects-ui.classes.test.ts` y `app-shell.classes.test.ts`).

1. **El barrido no se deja nada**: cuenta de atributos contra los escritos en el
   texto crudo, cero caminos esquivados, cero nombres pisados, lista **exacta**
   de fuentes externas, y que **todas las clases resueltas salen de un solo
   atributo** (el del `nav`) — que es lo que permite decir "la barra está
   posicionada Y lleva el escalón" en vez de "alguna clase del archivo hace una
   cosa y alguna otra hace la otra".
2. **Ninguna clase escrita queda inerte** (Tailwind genera regla para todas).
3. **`position` declarada, con el valor pegajoso, y sin condición.**
4. **Desplazamiento inferior declarado, sin condición.**
5. **`z-index` con el token del nav**, sin condición, + la otra mitad de la
   pinza: **ningún** token consumido en un `z-index` de la barra puede estar sin
   declarar en un ámbito que aplique.
6. **Relleno inferior con el token del área segura**, ese token declarado en la
   raíz y **sin condición**, y su valor consultando al sistema (`env(...)`) — un
   valor fijo sería el número crudo que E14 (b) prohíbe. Más la misma pinza de
   tokens sin declarar.
7. **Controles positivos.** (a) Las variantes de la barra **sí** salen envueltas
   en condición y es un **límite inferior de ancho** — o sea que los
   `sin condición` de arriba no son adorno, y queda medida la advertencia de
   E12 (b). (b) Se compila un `globals.css` **mutado de verdad** metiendo el
   token del área segura en una consulta de medios inalcanzable, y se comprueba
   que el gate **se pone rojo** — y verde con el token como está hoy.

### Mutaciones corridas contra el gate (que se ponga rojo, medido)

| Mutación | Resultado |
|---|---|
| Quitar la posición pegajosa (dejando el anclaje) | 🔴 1 test |
| Cambiar pegajosa por **fija** | 🔴 1 test |
| Dejar la posición pegajosa **sólo bajo una variante de ancho mínimo** | 🔴 1 test |
| Token del área segura con **una letra de más** | 🔴 4 tests |
| Quitar el anclaje inferior (dejando la posición) | 🔴 1 test |
| Meter el token en una consulta de medios inalcanzable | 🔴 (control positivo, dentro del propio gate) |

Antes de escribir el código, el gate salía **9 rojos / 18** (TDD).

---

## Deuda 166 — el tab Progreso mostraba `1 / 0` sin meta

### Qué se cambió

La copia salió del JSX y fue **al módulo de copia del feature**
(`project-detail.ts`), siguiendo el patrón que ya usa `moreMatchesHint` (una
función, porque el texto depende de un número):

```ts
export function roundsCounterLabel(rounds: number, targetRounds: number): string
```

- `targetRounds > 0` → **no cambia nada**: `12 / 40`.
- `targetRounds === 0` → **sin denominador**: `3 vueltas`.
- Concordancia: `1 vuelta` / `3 vueltas` / `0 vueltas`.

`ProgressTab.tsx:184` pasa a llamarla. **No queda ningún string suelto en el JSX.**

### Decisiones no obvias

- **No se montó infraestructura de idioma.** El repo no tiene helper de plural
  (se buscó: no existe), y E5 pide resolverlo local y simple. Dos formas de una
  palabra en una constante del módulo, igual que `moreMatchesHint`.
- **La concordancia se decide sobre el número YA FORMATEADO**, no sobre el crudo.
  `formatInteger` redondea y localiza; decidir el singular con el valor crudo
  podría pintar `1` y escribir `vueltas` (o al revés) si alguna vez llega un
  valor no entero. El comentario lo dice en el código.
- **`targetRounds > 0` y no `!== 0`**: un negativo (que el backend no acepta)
  tampoco es una meta, y con `> 0` los dos casos caen del mismo lado.
- **El `0%` sin meta se dejó como está**, por E5 (b). No es alcance.

### Tests

- **Puros** (`project-detail.test.ts`, 4): con meta, sin meta en plural, sin meta
  en singular, y el caso del **proyecto recién creado** (cero vueltas, cero meta).
- **De componente** (`ProgressTab.test.tsx`, 4): sin meta, singular, con meta —y
  cada uno comprueba además que **el otro texto NO está**, para que un
  condicional invertido no pase—, más la **transición**: se fija la meta y la
  cuenta de vueltas se convierte en fracción. Los dos extremos pintados bien por
  separado no dicen nada del puente entre ellos, que es donde vive el defecto.

### Mutaciones corridas (medido)

| Mutación | Resultado |
|---|---|
| Invertir el condicional (siempre la cuenta nombrada) | 🔴 7 tests (1 puro + 6 de componente) |
| Plural siempre (romper la concordancia) | 🔴 1 test |
| Devolver `ProgressTab` a la fracción sin condicional | 🔴 3 tests de componente |

Todas las mutaciones se revirtieron; el árbol quedó en el estado bueno
(`git diff --stat` verificado después de cada tanda).

---

## Verificación

```
bash ./init.sh
...
[OK]    lint verde
[OK]    typecheck verde

 Test Files  88 passed | 3 skipped (91)
      Tests  1613 passed | 13 skipped (1626)
   Duration  101.55s

[OK]    tests verdes
── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.

EXIT 0
```

**1587 → 1613** tests (+26: 18 del gate nuevo, 4 puros y 4 de componente de E5).

---

## LO QUE **NO** PUDE VERIFICAR (dicho explícito, no simulado)

Esto es la parte que importa leer. Las deudas 160 y 167 de este repo son
exactamente asertos que prometían medir algo que su entorno no puede medir.

1. **NO miré la pantalla.** Esta sesión no tiene herramientas de navegador
   disponibles. **No hay verificación visual de la deuda 165 ni de la 166.** El
   gate demuestra que las declaraciones **existen en el CSS que el navegador va a
   recibir**; no demuestra que la barra se vea al entrar a una página. Eso es la
   REGLA 4 y le toca al leader antes de cerrar.
2. **`happy-dom` no maqueta.** No hay ni un aserto en el gate sobre posición real,
   rects, ni visibilidad: **no se puede medir en esta suite y no se fingió**. Por
   eso el gate ataca el CSS compilado y no el DOM montado.
3. **⚠️ EL AGUJERO REAL DE E14 (b), y es una decisión que NO tomé yo.**
   `env(safe-area-inset-bottom)` sólo devuelve un valor distinto de cero cuando
   **el documento se declara a pantalla completa** (`viewport-fit: cover` en la
   etiqueta de viewport). **`src/app/layout.tsx` HOY no lo hace** (su `viewport`
   declara sólo `width` e `initialScale`).

   Consecuencia honesta: **tal como está el documento hoy, ese relleno vale cero
   en todos los dispositivos.** El navegador ya excluye la barra de gestos del
   viewport de maquetación cuando no hay `viewport-fit: cover`, así que **no hay
   defecto visible hoy** — el token es la mitad correcta de la respuesta y queda
   **listo** para el día en que el caparazón se declare a pantalla completa.

   **Por qué no añadí `viewportFit: "cover"`:** es un cambio de **documento
   entero**, no de la barra. Hace que el contenido pase por debajo de la muesca y
   de los bordes laterales en toda la app (banda de cuenta, archivero, todas las
   páginas), no tiene gate, y **no puedo mirarlo en pantalla en esta sesión**.
   Meterlo de tapadillo dentro de una deuda de la barra sería justo el tipo de
   expansión de alcance sin verificar que el arnés prohíbe.

   **Propuesta al leader: ficha esto como deuda nueva** ("el área segura está
   cableada pero el documento no la pide: falta decidir `viewport-fit`"), o
   dímelo y lo hago en una tanda propia con su verificación. Está escrito también
   en el comentario del token en `globals.css` y en la cabecera del gate, para
   que nadie lo lea de más.
4. **El resolvedor de clases compartido no entra en literales de objeto.** El
   acceso táctil pide sus variantes con `{ active }` y eso queda **denunciado**
   (`unhandled`), no resuelto. El gate lo fija con una lista **exacta**, así que
   una forma nueva sin seguir lo pone en rojo. **No lo arreglé** porque ese
   objeto no lleva ninguna clase, las clases que produce viven en
   `bottom-nav.variants.ts` —que E14 explícitamente no toca— y enseñarle al
   resolvedor a entrar ahí sólo movería la denuncia un nodo más adentro (el
   acceso a propiedad del enlace) tocando una pieza que comparten otros tres
   gates. Queda escrito en el propio test.

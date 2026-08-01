# Review (3a pasada) — corrección de #13 `ui_shell_nav`: los 5 defectos de la revisión visual (E4-E7)

> ## ⚠️ ESTE INFORME ESTÁ TRUNCADO — NO LO LEAS COMO COMPLETO
>
> Se corta a mitad de la §3. Las **8 observaciones menores** que anuncia más abajo (línea 13)
> **nunca se escribieron**, así que el implementer de la 3ª ronda nunca las recibió. Es consistente con
> el incidente de la 3ª ronda: el reviewer murió por el límite de gasto mensual de la cuenta.
> Lo detectó la 4ª review (`review_archive_nav_fichero_r4.md` §5).
>
> Consecuencia práctica: **no des por revisado lo que este archivo dice que iba a revisar.** En
> particular la observación 2 (el JSDoc de `AppShell` que miente) quedó sin escribir y la volvió a
> levantar la 4ª review como **H1**, esta vez con el coste medido. El veredicto APROBADO de abajo vale
> para lo que sí alcanzó a verificar (§1 y §2), no para las observaciones que faltan.

**Veredicto: APROBADO**

Releí `RFC-01-shell.md` §3 con la segunda tanda de enmiendas (**E4-E7**, invariantes **8** reescrito y
**8-bis** nuevo) y revalidé **contra ese texto**, no contra el D4 de la ronda 2. Los 5 defectos están
arreglados, y —lo que importaba— **cerrados por construcción y por test**, no por casualidad del
viewport que midió el leader. `bash ./init.sh` y `pnpm build` verdes, corridos por mí, con
**411 passed | 6 skipped** (exactamente lo que reporta el implementer). Nada de lo aprobado en las
rondas 1 y 2 se degradó. Los tres guardrails están **intactos** (mtime del 25-jul frente al 27-jul
21:42-21:58 de los archivos de esta ronda) y verdes dentro de los 411.

Quedan **8 observaciones menores**, ninguna bloqueante. La 3 (aritmética del informe que no
reproduce) y la 2 (JSDoc de `AppShell` que sigue mintiendo) son las que conviene tapar antes de
cerrar la sesión.

---

## 1. Verificación propia (salida literal)

`bash ./init.sh` — exit code 0:

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet


 Test Files  40 passed | 1 skipped (41)
      Tests  411 passed | 6 skipped (417)
   Start at  22:12:04
   Duration  44.59s (transform 3.52s, setup 37.92s, import 43.89s, tests 16.31s, environment 8.62s)

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

`pnpm build` — exit code 0:

```
✓ Generating static pages using 3 workers (12/12) in 283ms
  Finalizing page optimization ...

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /api/auth/login
…
ƒ  Proxy (Middleware)
```

**Saldo de tests, verificado sobre el diff (no sobre el informe).** Baseline 408 → 411, +3:

| archivo | antes | ahora | movimiento |
|---|---|---|---|
| `archive-nav.tokens.test.ts` | 18 | **21** | conté los 21 en el archivo: 7 geometría + 4 presupuesto horizontal + 3 rampa + 4 legibilidad + 3 activa |
| `layout.test.tsx` | 19 | **19** | −2 (los dos autorizados: nombre de usuario y click en "Salir") +2 (utils ignorados, área sensible del puntero) |
| `AppShellClient.test.tsx` | 3 | **3** | ninguno borrado; los dos de la costura se reescribieron contra un doble del shell |

**Sólo las 2 bajas autorizadas.** Ningún archivo de test perdido. Ninguna dependencia nueva
(`git diff HEAD -- package.json` sólo muestra `three`/`@types/three`, que son de #14). Cero
`console.log`, cero `TODO`/`FIXME` en lo tocado, cero secretos.

---

## 2. Los 5 defectos, uno por uno

### 2.1 Defecto 1 — área sensible (invariante 8-bis). Cerrado, y sin depender del z-index

Esto era lo que más me importaba y está bien resuelto, con **dos mecanismos independientes**:

**(a) El que mata el defecto es z-independiente.** El carril lleva `pointer-events-none`
(`archive-nav.variants.ts:72`) y la pestaña `pointer-events-auto` (`:103`). Las 5 columnas vacías del
rectángulo de 1442×44 dejan de existir para el hit-testing **cualquiera que sea la profundidad**. Que
la hoja de mayor z se "tragara" el nav era un síntoma; la causa era el rectángulo, y el rectángulo ya
no captura. Verificado en el CSS emitido del build de producción: `.pointer-events-none` y
`.pointer-events-auto` existen (si no compilaran, el arreglo sería nada).

**(b) Donde sí hay solape real, la garantía es una propiedad monótona, no un número afinado.** La
pestaña de la hoja N cuelga hacia arriba y cruza los cantos de las hojas N+1..6 — es decir, **sólo**
las que están encima en pantalla, que por la rampa tienen z **estrictamente menor**
(`--z-nav-leaf-1..6` = 6..1, `globals.css:211-216`). Así que la pestaña siempre gana sobre el canto
que cruza, para cualquier N y cualquier tamaño de pestaña. Y "estrictamente decreciente" está clavado
por test (`archive-nav.tokens.test.ts:250-254`), no escrito a mano en la confianza de que nadie lo
toque. Horizontalmente el solape es imposible: cada pestaña vive en su columna del grid
(`col-start-N` + `max-w-full`, `:105-121`).

**Qué queda sensible, y es legítimo.** El enlace-hoja mide exactamente un canto
(`h-(--nav-leaf-height)`, `variants:24`) a todo el ancho: es el canto de 10px que el invariante 8-bis
autoriza explícitamente, y activa **su propia** hoja. Ninguna zona vacía activa nada: la franja de
44px por encima del stack es la banda del wordmark, que es `pointer-events-none` salvo el propio
anchor (`ArchiveNav.tsx:75,84`). Esto explica y respalda el barrido de 7966 puntos del leader.

**Test de la propiedad:** `layout.test.tsx:207-232`, recorre las 6 hojas y exige `pointer-events-none`
en el carril y `pointer-events-auto` en la pestaña. Sin motor de layout no hay `elementFromPoint`, así
que se verifica el contrato que produce el comportamiento — correcto. Y arma los nombres de clase por
concatenación (`:210-212`) para no sembrar utilidades reales en el CSS desde un test: es exactamente
la higiene que exige el guardrail de `@source`.

### 2.2 Defecto 2 — E5: el hover ya no encoge la hoja. Cero huecos, por construcción

`leafSheetVariants` (`variants:53-58`) **no tiene ninguna variante de hover**: alto fijo
`h-(--nav-leaf-height)`, sin `gap`, apiladas en `flex-col-reverse` (`ArchiveNav.tsx:94`). Un hueco
entre cantos consecutivos no puede abrirse porque **nada cambia de tamaño**: los 6 cantos ocupan
siempre 60px contiguos. No es una compensación aritmética que haya que verificar (esa era la mecánica
vieja, y su test desapareció con ella, correctamente) — es que la magnitud ya no existe.

**Cero reflow:** el único movimiento es `group-hover:-translate-y-(--nav-tab-lift)` (`variants:108`),
y el CSS emitido confirma que sale como `translate`, no como una propiedad de layout:
`--tw-translate-y:calc(var(--nav-tab-lift) * -1);translate:…`. Transform puro, fuera del flujo.

**Degradación por `prefers-reduced-motion`:** sigue saliendo de la media global
(`globals.css:268-277`), igual que en las rondas anteriores.

**La trampa que sí podía volver, y está tapada por test.** Al subir, la pestaña libera una franja
abajo; si el salto superara el canto, esa franja quedaría sin nada que reciba el puntero → hover
apagado → pestaña abajo → hover encendido → parpadeo infinito. `tokens.test:152-160` exige
`0 < --nav-tab-lift ≤ --nav-leaf-height` (8 ≤ 10). Buena captura del implementer; es el tipo de
invariante que no se ve leyendo el CSS. Complementado por `:162-169`: la pestaña más alta con hover
puesto sigue dentro del nav (104 − 5×10 − 44 − 8 = 2 ≥ 0), que es justo el margen que midió el leader.

### 2.3 Defecto 3 — E6: etiqueta a 18px. Correcto, con un matiz (obs. 1)

`--text-nav-tab: 18px` (`globals.css:127`), utilidad emitida por Tailwind y verificada en el build.
El valor **coincide** con `--text-lg: 18px` (`:132`) y el test lo ancla al piso de la escala
(`tokens.test:220-223`). Pero es un literal duplicado, no una referencia — ver **observación menor 1**.
No hay conflicto de interlineado: esa utilidad sólo emite el tamaño y el interlineado va aparte
(`variants:133`); y `tabLabelVariants` no pasa por `twMerge` (cva usa `clsx`), así que la deuda 13 no
aplica aquí.

### 2.4 Defecto 4 — E4: el archivero nace en 1180. Es el punto más sólido de la ronda

**Rehice la aritmética yo, desde los tokens, sin mirar el informe:**

| | cuenta | resultado |
|---|---|---|
| carril útil a `--bp-archive` | 1180 − `--nav-tab-inset-start` (24) − `--nav-tab-inset-end` (24) | **1132px** |
| columna | 1132 / 6 | **188.67px** |
| texto disponible | 188.67 − 2 × `--nav-tab-padding-x` (8) | **172.67px** |
| pide "CALCULADORAS" (12 car.) | 12 × (0.72 × `--text-nav-tab` + `--tracking-label`) = 12 × 13.96 | **167.52px** |
| **holgura** | | **+5.15px (3.0%)** |

Entra, con la cota conservadora de avance. A 768px la misma cuenta da **104px** disponibles contra los
mismos 167.52 → no entra por un 61%. **Las dos direcciones están asertadas**
(`tokens.test:216-218` y `:232-240`), así que "por debajo manda el `BottomNav`" no es prosa: es un
test que cae si alguien la vuelve falsa.

**¿Está derivado o fijado a ojo?** Derivado *en el sentido fuerte que este arnés permite*. Una media
query no puede computar `var()`, así que el ancho **no puede** ser una expresión; lo que sí puede —y
es lo que hay— es que el **acoplamiento** entre tamaño de etiqueta y ancho de nacimiento esté cerrado
en las dos direcciones por un test que lee **los mismos tokens que consume el componente** (márgenes
del carril, padding de pestaña, tamaño, tracking) y **el texto real de `NAV_ITEMS`**. Subir la
etiqueta sin subir el ancho tumba el test; añadir una página de nombre más largo, también. Lo acepto
como "derivado". El mínimo real implícito por la fórmula es **1149.1px** (6 × (167.52 + 16) + 48), y
1180 está por encima: hay margen deliberado, no un ajuste al filo.

**Sincronía de los dos juegos de tokens (mi observación 5.1 de la r2 / deuda 18): cerrada donde
sostiene la garantía.** `tokens.test:225-230` exige que el par de archivo declare el mismo ancho en
los dos juegos. Y verifiqué que ese es **el único par que sostiene algo**: tras E4 no queda ni una
variante responsive de tablet, desktop o mobile en todo `src/**` (grep sobre `src/`), y `--bp-tablet`
sólo lo lee `useViewportSupports3d` por `matchMedia`, que no tiene contraparte de media query. Ver
obs. 4.

**Frontera del gate: coherente, sin ventana muerta ni solape.** `ArchiveNav.tsx:62` esconde por
defecto y muestra a partir del breakpoint de archivo; `BottomNav.tsx:29` hace lo contrario sobre un
`flex` base. Lo verifiqué **en el CSS emitido del build de producción**, no en el código: ambas reglas
salen dentro de **una sola** `@media (min-width:1180px)`, complementarias (`display:block` /
`display:none`) y después de las utilidades base en el orden de cascada. Por debajo de 1180 →
archivero oculto + bottom-nav visible; a partir de 1180 → al revés. **No hay ancho en el que se vean
los dos ni ninguno.**

**Referencias huérfanas al breakpoint viejo: ninguna.** El grep de los dos juegos de tokens y de las
variantes responsive sobre `src/**` devuelve sólo: las declaraciones de `globals.css`, el gate de los
dos navs, el `--bp-tablet` del gate 3D (otro concern, correctamente intacto) y el test del "a 768 no
cabría". También comprobé que no sobrevive ningún token de las rondas anteriores
(`--nav-utils-width`, `--nav-leaf-height-hover`, `--nav-leaf-gap-hover`, `--folder-prefix`): cero
ocurrencias en `src/**`.

### 2.5 Defecto 5 — E7: wordmark y utils

**(a) Ninguna hoja cruza el wordmark, y las hojas no se recortaron.** El invariante 2 está intacto:
`nav absolute inset-x-0` + `w-full` por hoja (`ArchiveNav.tsx:94`, `variants:23`). Quien se apartó es
el wordmark: una sola línea en la banda, con su caja asertada contra la banda libre
(`tokens.test:171-179`: `--space-2` + `--text-xl` × `--leading-tight` = 8 + 26.4 = **34.4** ≤ 104 − 60
= **44**). Coincide exactamente con lo que midió el leader (y=8..34 vs hoja en y=44). Cayeron el
subtítulo en mono y el monograma de la r2 — correcto: el monograma existía para ganar holgura en
tablet, y en tablet ya no hay archivero. Ver obs. 6 por el eje horizontal.

**(b) Utils fuera.** Cero botones en el header; el único interactivo de la banda es el anchor del
wordmark. Concuerda con la medición del leader.

**Juicio sobre las props `user`/`onLogout` mantenidas: ACEPTABLE, no es una API que mienta — en
`ArchiveNav`.** Tres razones: (i) están documentadas como reservadas para #31 en el sitio donde se
declaran (`ArchiveNav.tsx:29-38`), no en un informe que nadie leerá; (ii) "ignoradas" no es una
promesa verbal, **es un test**: se le pasan y se exige que no aparezca ni el nombre ni el botón y que
el callback no se invoque (`layout.test.tsx:195-205`); (iii) quitarlas obligaría a desmontar
`AppShellClient` (fetch de `/api/auth/me` + logout) para rehacerlo entero dos features después, y esa
lógica hoy sigue cubierta. Es andamiaje declarado, no un contrato falso. **Pero en `AppShell` sí
miente** — ver observación menor 2, que es la única corrección que pediría con algo de énfasis.

**Bajas de tests: sólo las 2 autorizadas.** Verificado sobre el diff. En `AppShellClient.test.tsx` no
se borró ninguno: los dos de la costura se reescribieron contra un doble del shell, con el porqué
escrito en el propio archivo (`:17-24`). Es la decisión correcta —borrarlos habría dejado el fetch de
`/api/auth/me` y el logout **sin cobertura ninguna**— aunque tiene un coste que conviene saber
(obs. 8).

---

## 3. Lo ya aprobado: sin regresiones

Revisado uno por uno contra el código, no contra el informe:

- **Calibración del contraste (r1):** los cuatro tokens de cara, filo y las dos sombras siguen
  **byte-idénticos** (`globals.css:63-64,80-81`). Los 4 tests de legibilidad (`tokens.test:261-278`),
  incluido el que deja constancia de que una sombra negra sola no llegaría a 1.5:1, siguen ahí.
- **Profundidad por z-index (r1):** rampa 6..1 intacta + los 3 tests (`tokens.test:243-259`). El
  `z-index` sigue aplicando porque las hojas son ítems flex del `nav`, y el filtro de la superficie
  sigue creando el contexto de apilamiento correcto (la pestaña no puede escaparse de su hoja).
- **Orden estable / activa en su sitio (E1):** la pestaña activa cae al tono de página, etiqueta en
  acento, `aria-current`; el test que compara dos renders y exige que **la hoja no cambie** y las 6
  sigan idénticas está intacto (`layout.test.tsx:153-179`), igual que los 3 contrastes que decidieron
  dónde va la marca (`tokens.test:287-301`).
- **Filo de 1px (E3):** sigue como sombra interior superior, emitida en el build.
- **Hojas full-bleed apiladas:** intacto (ver 2.5a).
- **Presupuesto vertical:** 6 × 10 + 44 = 104 = `--nav-height`, asertado (`tokens.test:139-144`) y
  ahora reforzado por el test de la pestaña más alta con hover.
- **`--nav-height` y `--z-nav`:** sin tocar (104px / 100).
- **Guardrails:** `no-hardcode.test.ts`, `canonical-tailwind-classes.test.ts` y `globals-css.test.ts`
  con mtime del **25-jul**, frente al 27-jul 21:42-21:58 de todo lo de esta ronda: **no se tocaron**, y
  están verdes dentro de los 411. Los archivos-carnada de `globals-css.test.ts` se limpian en su
  `afterAll` y no quedó ninguno en el árbol.

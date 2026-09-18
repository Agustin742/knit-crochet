# Review — lote de higiene: deudas 21, 17, 13 y 4

**Veredicto: CAMBIOS REQUERIDOS**

> No es una feature de `feature_list.json`. **Confirmado que no se tocó** (`git status` limpio de ese
> archivo; `init.sh` sigue validando 31 features).
> Todo lo que sigue está **verificado por mí**, ejecutando: `bash ./init.sh`, `twMerge` directo, compilación
> real de `globals.css` con `@tailwindcss/postcss`, y la fórmula de WCAG sobre los tokens. **Ningún número de
> este informe está copiado del informe del implementer.**

---

## 0. Lo que sí está bien (para que no se pierda entre los hallazgos)

El lote es serio y la mayoría de sus afirmaciones son **ciertas y comprobables**. Verificado uno a uno:

- **`bash ./init.sh` VERDE, exit code 0.** Corrido por mí: `Test Files 41 passed | 1 skipped (42)`,
  **`Tests 433 passed | 6 skipped (439)`**. El número declarado es exacto (+13 sobre el baseline de 420).
- **Alcance respetado.** `git status` muestra exactamente 7 modificados + 1 nuevo. **No se tocó**
  `src/app/api/auth/me/route.ts`, ni el archivero, ni `feature_list.json`, ni `next-env.d.ts`
  (efectivamente devuelto a su estado: no aparece en el diff).
- **Deuda 4: impecable.** `.gitignore` añade las dos entradas con comentario del porqué; `git status`
  muestra **una sola** operación de git preparada (la eliminación de `tsconfig.tsbuildinfo` del índice) y
  **nada más** staged. Cero commits, cero ramas. El aviso al usuario es correcto y pertinente.
- **Deuda 13: el arreglo funciona de verdad.** No me fié del informe: compilé `globals.css` y las dos
  utilidades se emiten con el interlineado correcto — la de tamaño normal emite
  `font-size: var(--text-base)` con `line-height: var(--leading-tight)`, y la de icono
  `var(--text-lg)` con `var(--leading-tight)`. El borde heredado del hover emite
  `border-color: currentcolor`. **Las clases nuevas existen y se generan**; no son inventadas.
- **Higiene de clases: cumplida.** Ni el código, ni los tests, ni `deudas.md` escriben clases con comodín.
  El test nuevo arma cada nombre por concatenación en runtime (`button.variants.test.ts:26`).
- **`deudas.md`: bien hecho.** Las 4 fichas **tachadas, no borradas**, con el cómo y el dónde; la ficha 17
  **corregida antes** de tacharla; las 5 nuevas (29-33) con escenario concreto de fallo.

---

## 1. BLOQUEANTE — La deuda 17 no está saldada: está **mudada**, y en peor sitio

Esto era el juicio central del encargo. Medí el contraste yo mismo con la fórmula de WCAG sobre los valores
literales de `globals.css` (`--brand-espresso: #33241a`, `--brand-cream: #f5eddf`,
`--surface-raised: #fffdf6`, `--surface: #fbf6eb`, `--surface-sunken: #eadfcb`).

Dato de partida que hay que tener presente: `globals.css:271` pone `color: var(--fg-inverse)` (crema) en el
`body`. Eso es **lo que hereda cualquier cosa que no fije su propio primer plano**.

| Superficie | ANTES (la variante fijaba el primer plano oscuro) | AHORA (hereda del contexto) |
|---|---|---|
| Fondo de la app (`--bg`) | **1.00** — invisible | **12.83** — **arreglado** |
| Tarjeta elevada (`--surface-raised`) | **14.65** — perfecto | **1.14** — **roto por este lote** |
| Tarjeta plana (`--surface`) | **13.84** — perfecto | **1.08** — **roto por este lote** |
| Superficie hundida (`--surface-sunken`) | **13.60** — perfecto | **1.13** — **roto por este lote** |

**El lote no redujo el problema: lo multiplicó.** Antes había **1 superficie de 4** en la que el botón
fantasma era invisible. Ahora hay **3 de 4**. Es el mismo defecto con el signo cambiado.

### Por qué esto no es "la deuda 32, que es otra cosa"

El implementer registra honestamente el límite (ficha 17: *"heredar sólo funciona si la superficie declara
su primer plano, y hay una que no lo hace → deuda 32"*). Pero saca la conclusión equivocada. Hay que
separar dos cosas:

- **Que `Card` no declare primer plano para su propio texto** (un párrafo suelto dentro de una tarjeta sale
  crema sobre crema) **sí es un defecto preexistente y legítimamente separado.** Ahí el implementer tiene
  razón: ya estaba roto antes del lote y no era su encargo. Ficha 32, bien.
- **Que un botón fantasma dentro de una tarjeta sea invisible NO es preexistente.** Antes del lote se leía a
  **14.65:1**. Lo rompió este cambio. Eso no es deuda heredada: es una **regresión introducida por el
  arreglo**, y está dentro del alcance de quien la introdujo.

Un arreglo no puede cerrarse como "saldado" cuando **crea el mismo defecto que dice cerrar**, aunque lo cree
en otro sitio. Y el coste de cerrarlo bien es mínimo: **una clase de primer plano en la base de
`cardVariants`**, junto al fondo que ya declara (`src/shared/ui/primitives/card/card.variants.ts:7-9`). Es
el primitivo que el propio implementer identificó como "el límite de la solución": está dentro del radio de
explosión de su decisión, no fuera.

**Atenuante, y lo digo para que se dimensione bien:** verifiqué que la variante fantasma **no tiene ningún
consumidor real** — su única aparición en todo `src` es `Button.test.tsx:82`. Así que **hoy no hay ninguna
regresión visible para el usuario**. No es una emergencia. Es bloqueante por otro motivo: la ficha 17 queda
**tachada** en `deudas.md`, y una ficha tachada es una ficha que nadie vuelve a mirar. Se está archivando
como resuelto algo que empeoró.

**Salida aceptable (cualquiera de las dos):**
1. **Arreglar `Card` dentro de este lote** (declarar su primer plano junto a su fondo) y entonces sí tachar
   la 17. Es lo que recomiendo: una línea, y la 17 pasa a ser cierta.
2. **Des-tachar la ficha 17** y dejarla como *parcialmente saldada*, diciendo explícitamente que el defecto
   se movió del fondo oscuro a las superficies claras y que no se cierra hasta la 32.

Lo que no es aceptable es la combinación actual: ficha tachada + defecto vivo en 3 superficies.

---

## 2. BLOQUEANTE — Hay un test que **certifica como buena justo la situación rota**

`src/shared/ui/primitives/button/button.variants.test.ts:212-214` asierta que el contraste entre `--fg` y
`--surface-raised` es mayor o igual a 4.5, bajo el nombre *"lo que hereda sobre una superficie clara
también"*. Da 14.65 y pasa.

**Pero la variante fantasma no recibe `--fg` sobre ninguna superficie clara de este proyecto.** Tras el
cambio lleva el color heredado, así que recibe lo que declare su ancestro — y **ningún contenedor de `src`
declara un primer plano oscuro para su subárbol**. Lo comprobé barriendo el repo: el rol `--fg` se consume
exactamente en tres sitios (`button.variants.ts:39` variante secundaria, `Field.tsx:57`, `Input.tsx:13`) y
**los tres son componentes que fijan su propio primer plano junto a su propio fondo**, no superficies que lo
propaguen a sus hijos.

Es decir: **el test asierta un par de tokens que ningún camino del código puede producir.** El valor real de
ese escenario es **1.14:1**, y el test lo declara verde a 14.65.

Es exactamente el patrón que el proyecto ya arrastra en las deudas **18, 22 y 23** — *"el test mide tokens,
el layout consume clases"* — reproducido **dentro del lote de higiene que venía a limpiar**. Y es peor que
la ausencia de test: el describe se llama *"variante fantasma legible sobre cualquier superficie (deuda
17)"*, así que quien lo lea concluirá que la cobertura está hecha y no volverá a mirar.

**Requerido:** ese test tiene que medir **lo que el componente hereda de verdad** (hoy `--fg-inverse`,
porque viene del `body`) contra las superficies claras. Si se arregla `Card` como digo en §1, medirá el par
correcto y seguirá verde por el motivo correcto. Si no se arregla, **debe caer en rojo**, porque el defecto
existe.

> Los otros tres tests de contraste (`:202`, `:208`, `:216`) sí miden pares alcanzables y son correctos. El
> problema es sólo el de la superficie clara.

---

## 3. Los tres juicios que salen APROBADOS

### 3.1 Borrar `handleLogout` fue CORRECTO — verificado, no aceptado

La afirmación del implementer es cierta y la comprobé por mi cuenta:

- `ArchiveNav.tsx:37-39` acepta `user`/`onLogout` y **no renderiza ningún control ligado a ellas**.
- `layout.test.tsx:199-206` lo **fija con un test**: el botón "Salir" no existe en el árbol y `onLogout`
  nunca se invoca.
- Barrido de `"Salir"` en todo `src`: sólo aparece en comentarios y en ese test de fijación. **Ningún
  componente real lo renderiza.**

No existía camino alguno desde la UI real hasta `handleLogout`. El test que lo cubría montaba su propio
botón "Salir" **dentro del doble de `@/shared/ui`** (visible en las líneas eliminadas del diff). El sujeto
era del test, no de la app.

**No se perdió cobertura real, se perdió cobertura falsa.** Y la falsa era activamente dañina: daba por
cableado un logout que no existía. El razonamiento del implementer (dónde vive el menú de cuenta es decisión
de #31) es además arquitectónicamente correcto. Bien resuelto y bien anotado en dos sitios (JSDoc del propio
archivo + deuda 29, que además avisa de que #31 tendrá que **reescribir** el gate, no sólo añadir código —
ese detalle es fino y es el que evita el próximo tropiezo).

### 3.2 Los 3 tests eliminados de `AppShellClient.test.tsx` — los tres justificados

| Test eliminado | Garantía única que aportaba | ¿Se perdió algo? |
|---|---|---|
| *"hands the shell the user from GET /api/auth/me"* | que el shell pide el usuario | **No.** Probaba exactamente la conducta que la deuda 21 ordena eliminar; mantenerlo habría sido incoherente. La salud del endpoint sigue cubierta por sus 9 tests, intactos. |
| *"logs out via POST /api/auth/logout and redirects to /login"* | que el logout llama al endpoint y redirige | **No.** Sujeto fabricado (§3.1). Cubría código que ya no existe; la garantía queda correctamente diferida a #31 vía deuda 29. |
| *"still renders the shell when /api/auth/me fails"* | que el shell sobrevive a un fetch fallido | **No.** Sin fetch no hay camino de error. La mitad que seguía siendo real (que el shell renderiza) se conserva en *"renders its children inside the shell"*. |

El neto +1 es honesto y el gate nuevo (*"fires no HTTP request at all when mounted"*) es una garantía
**nueva y real**, con el detalle correcto de esperar microtarea **y** macrotarea antes de asertar.

*(No bloqueante, sólo nota: el gate espía el `fetch` global, así que no cazaría una regresión hecha con
`XMLHttpRequest` u otro cliente. Como el proyecto usa `fetch` en todas partes, no merece ficha.)*

### 3.3 Deuda 33 — **CONFIRMADA**, y el escenario está bien descrito y bien acotado

La reproduje ejecutando `twMerge` directamente sobre las clases del archivero: pasarle la base de
`tabLabelVariants` seguida del color de la variante activa devuelve la cadena **sin el tamaño de etiqueta**.
El control con una talla reconocida de la escala (el tamaño grande estándar) **sí sobrevive** al mismo
merge. **El mecanismo es tal cual lo describe el implementer:** `twMerge` no reconoce `nav-tab` como talla,
lo clasifica como color de texto, y el color de la variante activa
(`archive-nav.variants.ts:165`) llega después y lo desplaza.

El acotamiento también es correcto: `ArchiveNav.tsx:159` usa `tabLabelVariants({ active: open })` **directo,
sin `cn()`**, así que hoy no se dispara. Los dos disparadores que lista (envolver el componente para aceptar
`className`, o configurar `cva` con `twMerge`) son los reales.

**Un matiz que el implementer no vio y que conviene añadir a la ficha 33** (no bloqueante): esa misma
clasificación errónea es hoy lo que **protege** el interlineado de la etiqueta. Como el tamaño de etiqueta
no cuenta como talla, no entra en conflicto con el interlineado y la etiqueta conserva su 1.1 — lo
verifiqué: el interlineado sobrevive al merge. Consecuencia: **si alguien "arregla" la 33 renombrando la
utilidad a algo que `twMerge` reconozca como talla, la etiqueta cae directamente en la deuda 13** y pierde
el interlineado en silencio, con el test de la 33 en verde. Las dos deudas están acopladas y la ficha
debería decirlo, para que quien la tape use la forma tamaño+interlineado unida y no repita el ciclo.

*(El token se queda en 18px: decisión cerrada del usuario. Aquí sólo se evalúa el riesgo.)*

---

## 4. NO BLOQUEANTE (merece ficha) — el gate de la deuda 13 tiene dos agujeros plausibles

La **forma** elegida es la buena, y lo verifiqué: al pasar por `twMerge` un interlineado suelto seguido de
la clase que lleva tamaño e interlineado unidos, **sobrevive la unida**; y el CSS compilado emite el
interlineado correcto. Frente a "sólo reordenar", efectivamente es más robusta. Hasta ahí, de acuerdo.

Pero la afirmación del informe —*"no hay reordenación, refactor ni `twMerge` que pueda quedarse con una
mitad"*— **es demasiado fuerte**. Hay dos ediciones plausibles que rompen el interlineado con los 12 tests
en verde:

**(a) El test combinatorio asierta la ausencia de lo malo, no la presencia de lo bueno.**
`button.variants.test.ts:63-71` sólo comprueba presencia con `classesOf({ size })`, es decir con la variante
**por defecto**. El barrido de las 8 combinaciones (`:81-90`) sólo comprueba que no aparezca el interlineado
suelto — y eso **pasa igual si el interlineado desaparece del todo**. Escenario concreto: alguien añade un
`compoundVariants` a la `cva` con un tamaño de texto dentro (los compound se aplican **después** de `size`);
esa combinación pierde tamaño e interlineado de golpe y **los 12 tests siguen verdes**. Se tapa cambiando el
barrido de "no contiene el suelto" a "contiene el que lleva el interlineado pegado", que es la aserción que
de verdad se quiere.

**(b) El llamador sigue pudiendo tirarlo desde fuera.** `Button.tsx:21` hace
`cn(buttonVariants({ variant, size }), className)`. Un consumidor que pase un tamaño de texto suelto en
`className` **descarta el interlineado** — la deuda 13 exacta, ahora desde el sitio de llamada. El test de
`:92-95` sólo demuestra el caso *intencionado* (cambiar el interlineado a propósito), no éste. Con #15-#31
instanciando botones en masa, es cuestión de tiempo.

Es el patrón conocido (18/22/23) en su versión suave: el gate mide bien el objeto de hoy, pero no cubre el
eje por el que va a cambiar mañana. **Merece ficha nueva** con estos dos escenarios; no bloquea porque hoy
no hay `compoundVariants` ni ningún llamador que pase tamaños.

---

## 5. NO BLOQUEANTE (nota) — imprecisión menor en la ficha 31

La ficha 31 dice que el anillo de foco se queda corto sobre "las superficies CLARAS" y da 2.95 y 2.41. Mis
medidas: `--surface` **2.95** (correcto), `--surface-sunken` **2.41** (correcto), pero **`--surface-raised`
da 3.13**, que **sí** supera el umbral de 3:1. Como `--surface-raised` es justamente la variante **por
defecto** de `Card`, la ficha es más alarmista de lo que corresponde en el caso más común. Sólo una nota:
añadir el tercer valor para que quien la tape no mueva un token de identidad creyendo que falla en todas.

---

## 6. Checkpoints

- **C1 — El arnés está completo: [x]** — archivos base y los 3 docs presentes; **`bash ./init.sh` exit code
  0, corrido por mí**.
- **C2 — El estado es coherente: [x]** — `feature_list.json` intacto (31 features válidas), ninguna feature
  cambió de estado (correcto: esto no es una feature). `current.md` describe la sesión activa y marca el
  bloque anterior explícitamente como *"Sesión anterior (pendiente de volcar a `history.md`)"*: está
  etiquetado, no es basura.
- **C3 — El código respeta la arquitectura: [x]** — no se tocaron capas de datos ni route handlers; la UI
  sigue sin acceder a la DB; `AppShellClient` (feature) y `AppShell` (design system, presentación pura)
  mantienen su separación. Sin `console.log`, sin secretos, sin dependencias nuevas.
- **C4 — La verificación es real: [ ]** ← **Razón:** lint, typecheck y los 433 tests están verdes, pero
  `button.variants.test.ts:212-214` **no verifica lo que dice verificar**: asierta el par `--fg` /
  `--surface-raised`, que ningún camino del código produce, mientras el valor real de ese escenario es
  1.14:1 (§2). Un test que certifica en verde un caso roto no es verificación real.
- **C5 — La sesión se cerró bien: [ ]** ← **Razón:** sin artefactos sospechosos (los únicos sin trackear son
  el informe del implementer y el test nuevo, ambos legítimos) y `.gitignore` correcto, pero
  `progress/history.md` **no tiene entrada de esta sesión**. Es el paso de cierre del leader, no del
  implementer: no lo cuento como falta suya, pero el checkbox no se puede marcar todavía.

---

## 7. Cambios requeridos

1. **(Bloqueante — §1)** Cerrar la regresión que el propio arreglo introdujo: **`Card` debe declarar su
   primer plano junto a su fondo** en la base de `src/shared/ui/primitives/card/card.variants.ts`, para que
   la herencia de la variante fantasma tenga de dónde heredar en superficies claras.
   **Alternativa aceptable si se prefiere no tocar `Card` en este lote:** **des-tachar la ficha 17** en
   `deudas.md` y dejarla como *parcialmente saldada*, diciendo explícitamente que el defecto se desplazó del
   fondo oscuro a las 3 superficies claras (1.14 / 1.08 / 1.13) y que no se cierra hasta la 32.
   Lo que no puede quedar es ficha tachada con el defecto vivo en más superficies que antes.
2. **(Bloqueante — §2)** Corregir `button.variants.test.ts:212-214` para que mida **el primer plano que la
   variante hereda realmente** sobre las superficies claras, no el par `--fg` / `--surface-raised` que
   ningún camino produce. Si se aplica el punto 1, quedará verde por el motivo correcto; si no se aplica,
   **tiene que quedar en rojo**.
3. **(No bloqueante — §4)** Ficha nueva con los dos escenarios del gate de la deuda 13: (a) un
   `compoundVariants` con tamaño de texto se lleva el interlineado con los 12 tests en verde, porque el
   barrido asierta la *ausencia* del interlineado suelto en vez de la *presencia* del pegado al tamaño;
   (b) un llamador que pase un tamaño de texto en `className` reproduce la deuda 13 desde fuera, caso no
   cubierto.
4. **(No bloqueante — §3.3)** Añadir a la ficha 33 el acoplamiento con la 13: hoy la clasificación errónea
   de `twMerge` es lo que **protege** el interlineado de la etiqueta del archivero, así que taparla
   renombrando la utilidad a una talla reconocida la haría caer en la deuda 13 en silencio.
5. **(No bloqueante — §5)** Añadir a la ficha 31 el valor de `--surface-raised` (**3.13**, que sí pasa el
   umbral), para no dar por rotas las tres superficies claras cuando la más usada cumple.

---

**Veredicto final: CAMBIOS REQUERIDOS.** Dos bloqueantes, ambos sobre la deuda 17: el arreglo desplazó el
defecto de 1 superficie a 3, y el test que debía cazarlo mide un par de tokens inalcanzable y lo tapa. Las
deudas 21, 13 y 4 están **bien saldadas** y las tres decisiones de juicio (borrar `handleLogout`, los 3
tests eliminados, y el hallazgo de la deuda 33) son **correctas y verificadas**. Arreglados los dos puntos
bloqueantes, el lote se aprueba.

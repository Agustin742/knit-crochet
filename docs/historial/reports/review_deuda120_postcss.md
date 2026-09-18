# Review — Deuda 120: `postcss` dependencia fantasma

> **NO es una feature.** `feature_list.json` no se tocó (verificado) y este review no lo toca.
> `progress/deudas.md` tampoco se tocó: el tachado de la ficha es del leader.

**Veredicto: APROBADO — 0 bloqueantes.**

Todas las afirmaciones centrales del informe se **reprodujeron de forma independiente**, con copias
limpias propias e install fresco. **Ningún número salió inflado.** Los que cito abajo son los míos,
medidos en esta revisión, no copiados del informe.

---

## 0. Método de la revisión

No acepté ninguna medición del informe. Monté **mis propias dos copias** del árbol de trabajo en el
scratchpad (`rev-before`, `rev-after`), excluyendo `node_modules`, `.next`, `.git` y
`tsconfig.tsbuildinfo`, con `pnpm install --frozen-lockfile` desde cero en cada una:

- **`rev-before`**: `package.json` y `pnpm-lock.yaml` revertidos a `HEAD` (`git show HEAD:…`) → **sin** el arreglo.
- **`rev-after`**: el árbol de trabajo tal cual → **con** el arreglo.

Ambos installs: `INSTALL_EXIT=0` y **`downloaded 0, added 441`** en los dos. Confirmo el punto del
informe: **ninguna diferencia entre las dos direcciones viene de la red**.

`bash ./init.sh` **siempre redirigido a archivo** (`> log 2>&1; echo $?`), **nunca por tubería**, en las
tres corridas. Las dos copias quedaron **borradas** al terminar.

---

## 1. Condición doble de ENTORNO (REGLA 3) — REPRODUCIDA, exacta

Medido por mí, no leído del informe:

| | **rev-before** (sin arreglo) | **rev-after** (con arreglo) |
|---|---|---|
| `bash ./init.sh` exit | **1** | **0** |
| typecheck | `[FAIL] typecheck en rojo` | `[OK] typecheck verde` |
| Archivos de test | `3 failed / 67 passed / 3 skipped (73)` | `70 passed / 3 skipped (73)` |
| Tests | `1185 passed / 13 skipped (1198)` | `1220 passed / 13 skipped (1233)` |

**Coincide dígito a dígito con lo que declaró el implementer.** Los tres archivos rojos en `rev-before`
son **exactamente** los tres nombrados, ni uno más:

```
FAIL  src/app/globals-css.test.ts
FAIL  src/app/yarn-host-responsive.test.ts
FAIL  src/shared/ui/primitives/skeleton/skeleton.tokens.test.ts
```

Y los tres `TS2307` salieron con la misma posición exacta que reporta el informe —
`globals-css.test.ts(5,21)`, `yarn-host-responsive.test.ts(6,21)`,
`skeleton.tokens.test.ts(5,21)`.

**Aritmética verificada aparte:** corrida aislada de los tres archivos en `rev-after` →
`Test Files 3 passed (3)`, **`Tests 35 passed (35)`**, exit 0. Y **1220 − 1185 = 35**. Cierra.

**Mecanismo, comprobado directamente** (es lo que hace que la deuda sea real y no teórica):

- `rev-before/node_modules/postcss` → **no existe**.
- `rev-after/node_modules/postcss` → **symlink** a `.pnpm/postcss@8.4.31/node_modules/postcss`.

---

## 2. Árbol principal — verde

`bash ./init.sh` corrido por mí en `C:/_dev/projects/knit-crochet`, redirigido a archivo:

```
INIT_MAIN_EXIT=0
[OK]    lint verde
[OK]    typecheck verde
 Test Files  70 passed | 3 skipped (73)
      Tests  1220 passed | 13 skipped (1233)
[OK]    Entorno listo. Puedes empezar a trabajar.
```

Idéntico al gate de arranque del leader. **El arreglo no movió un solo test**, que es lo que debía pasar.

---

## 3. El diff — 4 líneas, sin churn de resolución. CONFIRMADO

`git diff --stat` → `package.json | 1 +`, `pnpm-lock.yaml | 3 +++`, **`2 files changed, 4 insertions(+)`**.

La afirmación «no se movió la resolución de nada más» **no hay que creerla: se ve en el propio diff**. El
diff del lockfile es de **3 líneas y están las tres dentro de `importers['.'].devDependencies`**. Al ser
el diff completo, queda demostrado por construcción que **no hay ni una línea nueva en `packages:` ni en
`snapshots:`**. `postcss@8.4.31` ya estaba en el lockfile por transitividad (`:3844` vía
`@tailwindcss/postcss`, `:5296` vía `next`) — verificado.

**`pnpm-workspace.yaml` no se tocó**: no aparece en `git diff --stat`. La suma de control del informe es
correcta.

---

## 4. El specifier exacto `8.4.31` — el override existe y dice lo que dice

Verificado en `pnpm-workspace.yaml:7-8`:

```yaml
overrides:
  postcss: 8.4.31
```

precedido (`:3-6`) por exactamente el motivo que cita el informe (vite 8.1.5 pide `^8.5.17`, no publicada;
se fija a la que Next ya usa). **La cita es fiel, no adornada.**

**Juzgo el pin exacto CORRECTO.** Con un `overrides` global, el specifier de `package.json` **no decide
nada**: cualquier rango habría resuelto a 8.4.31. Escribir `^8.4.31` diría "me vale cualquier 8.x" cuando
la regla de al lado lo prohíbe — sería una declaración falsa. El exacto deja el mismo número en los dos
archivos. Hay precedente en el repo (`three` / `@types/three` a `0.185.1`).

**Ubicación correcta**: `devDependencies`. Verifiqué que **los únicos tres importadores de `postcss` son
archivos de test**; `postcss.config.mjs` no lo importa (usa la clave `@tailwindcss/postcss`, que está en
`dependencies`). No hay código de producción que lo necesite.

*(Observación NO bloqueante: el pin exacto crea un acoplamiento implícito con el override. Si mañana
alguien sube el override, `package.json` quedará discrepando en silencio, porque el override gana igual.
Riesgo de mantenimiento menor y muy inferior al de mentir con un caret; lo señalo, no pido cambiarlo.)*

---

## 5. §6, el hallazgo colateral — VERIFICADO, y los dos números son EXACTOS

Esto era lo que más margen tenía para estar inflado. **No lo está.**

Reproduje la métrica del implementer (su `stale.mjs`, que sigue en el scratchpad: salta las entradas que
empiezan por `.` y **desciende dentro de los directorios `@scope`** para contar paquetes, no namespaces):

| | entradas de primer nivel | NO son symlink |
|---|---|---|
| **Árbol principal** | **378** | **348** |
| **Mi copia limpia (`rev-after`)** | **30** | **0** |

**378 / 348 y 30 / 0 — coincidencia exacta con la tabla del informe.**

*Aviso de reproducibilidad para quien venga detrás: el número depende de la métrica. Mi primer conteo
ingenuo (todas las entradas de primer nivel, incluyendo dotfiles y contando `@babel` como una) daba
**330 / 309**. No es una contradicción, es otra vara de medir. **El «348» sólo es reproducible con el
método de `stale.mjs`**, y conviene que la ficha lo diga al lado del número.*

**La clasificación del linker también es exacta:**

- `node_modules/.modules.yaml:1517` → `"nodeLinker": "isolated"` ✔
- `node_modules/.modules.yaml:123-125` → `"postcss@8.4.31": { "postcss": "private" }` ✔

**La corrección que el implementer le hace a la ficha 120 es CORRECTA.** La ficha dice que aquí funcionaba
*"porque el almacén de pnpm la tiene por transitividad"*. Eso es **falso, y lo demuestra mi propia copia
limpia**: `rev-before` tenía el almacén completo y la misma transitividad (`downloaded 0`), y aun así
`node_modules/postcss` **no existía** y el typecheck cayó. Con linker `isolated` + clasificación
`private`, un paquete transitivo **no** es resoluble desde `src/`.

**Corroboración independiente que el informe NO tenía y añado yo:** el árbol principal contiene
**`node_modules/.package-lock.json`**, un artefacto que **escribe `npm`, no `pnpm`**; mi install limpio con
pnpm **no lo genera** (`false`). Es evidencia directa, y separada del conteo, de que por este
`node_modules` pasó un `npm install`. **Refuerza el diagnóstico de fósil.**

**Coincido con la gravedad que le asigna:** con 348 entradas resolubles desde `src/`, este `node_modules`
**no puede detectar dependencias fantasma por construcción**. Es candidata a ficha propia, y el
implementer hizo bien en **medirla y no arreglarla** (tocaba `node_modules`, fuera de su alcance).

---

## 6. §7, el barrido — ATACADO. El "cero" es real, no un descubrimiento roto

Este era el otro punto con olor a las deudas 40/43/71/91. **Lo sometí a controles positivos**, que es lo
único que distingue un cero verdadero de un pipeline que devuelve vacío:

| Corrida | Resultado |
|---|---|
| Barrido normal | `296 archivos`, `21 paquetes detectados`, **`NO DECLARADOS: 0`** |
| **Control: quito `postcss` del set declarado** | **`NO DECLARADOS: 1` → `postcss`**, señalando **los 3 archivos exactos** |
| **Control: quito `zod`** | **`NO DECLARADOS: 1` → `zod`**, señalando `features/auth/validation.ts` y 2 más |

**El descubrimiento funciona de punta a punta**: cuando hay algo que encontrar, lo encuentra y lo
localiza. Los `296` archivos y los `21` paquetes coinciden con el informe. Confirmo además que
`sweep.mjs` **recorre directorios de verdad** (`walk` recursivo sobre `src/`), no una lista escrita a mano.

**Busqué las formas de import que la regex podría no cubrir.** Todas dan cero ocurrencias reales:

- `require.resolve` → **0** · `vi.doMock` → **0** · `vi.importMock` → **0** · `createRequire` → **0**
- `/// <reference types=…>` en `src/` → **0** (la afirmación del informe estaba **bien acotada a `src/`**).
  Las 2 que existen están en `next-env.d.ts` y apuntan a `next`, **declarada**.

**Y revisé las zonas ciegas de verdad del método** — referencias a paquetes que **no son imports** y que
el barrido no puede ver por construcción:

- `tsconfig.json:22-26` → `"plugins": [{ "name": "next" }]` → `next` está **declarada**.
- `postcss.config.mjs` → clave `"@tailwindcss/postcss"` en `plugins` → **declarada**.
- No hay `.ts/.mjs` en la raíz fuera de los 6 configs barridos, salvo `next-env.d.ts` (cubierto arriba).
  `template/` y `drizzle/` no contienen fuentes.

**Ninguna zona ciega esconde un fantasma. El "cero fantasmas" se sostiene.** El informe además **declara
por su cuenta el límite real del método** (valida *declarado sí/no*, no `dependencies` frente a
`devDependencies`) en vez de vendérselo como completo — que es exactamente lo que se pide aquí.

---

## 7. Higiene y alcance — limpio

- **Copias del scratchpad borradas**: `clean/` y `clean-after/` **ya no existen** ✔. Los `.log` y los `.mjs`
  siguen ahí, y **es un acierto**: me dejaron auditar `sweep.mjs` y `stale.mjs` línea a línea en vez de
  tener que fiarme de la prosa. El informe sólo prometió borrar **las copias**, y las borró.
- **`src/` → CERO archivos tocados** por este trabajo ✔
- **`feature_list.json` y `progress/deudas.md` → NO tocados por el implementer.** Verificado con su propio
  `baseline-gitstatus.txt`: **ya aparecían modificados al arrancar su sesión** (son del lote 117/118/119 y
  del leader). Su delta real es **exactamente** `M package.json` + `M pnpm-lock.yaml`.
- **`pnpm-workspace.yaml` → no tocado** ✔ (`git diff` vacío).
- Los archivos ajenos (`RFC-03-proyectos.md`, los tres `explore_20_*.md`) **son del leader y de los
  exploradores de #20**, como el propio leader confirma. **No se le imputan.** Declararlos en vez de
  callarlos es la conducta correcta.

*(Nit sin consecuencia: §5 lista `RFC-03-proyectos.md` dentro de su delta, pero su propio
`after-gitstatus.txt` no lo contiene — apareció después de esa captura. No cambia nada, y la conclusión
—«no es mío»— es correcta.)*

---

## Checkpoints

- **C1 — El arnés está completo: [x]** — archivos base y los 3 docs presentes; `bash ./init.sh` **exit 0**.
- **C2 — El estado es coherente: [x]** — `in_progress: 0` (≤1); `feature_list.json` válido (33 features);
  `current.md` describe la sesión activa.
- **C3 — El código respeta la arquitectura: [x]** — **no hay cambios de código**: el diff son 4 líneas de
  declaración de dependencia. Cero `console.log` de debug en `src/` no-test. Sin secretos.
  *Matiz anotado: el checkbox de dependencias nuevas sin justificar no aplica aquí — `postcss` **no es una
  dependencia nueva** en el árbol (ya estaba instalada y en uso), esto sólo **declara** la que ya se
  usaba; y `feature_list.json` está fuera de alcance por encargo.*
- **C4 — La verificación es real: [x]** — lint verde, typecheck verde, `1220 passed | 13 skipped`.
  Los 3 archivos que dependían de la corrección tienen tests y pasan (**35**).
- **C5 — La sesión se cerró bien: [x]** — sin `*.tmp` ni artefactos de build sin trackear (lo no trackeado
  son informes de `progress/`, lo normal del arnés). *Pendiente del leader, por diseño y no por defecto:
  el tachado de la ficha 120 y la entrada en `progress/history.md`.*

---

## Cambios requeridos

**Ninguno. Cero bloqueantes.**

## Recomendaciones para el leader (no bloquean el cierre)

1. **Al tachar la ficha 120, incorporar las dos correcciones del §6/§10**, que verifiqué y son ciertas:
   (a) no sólo falla `pnpm typecheck` — **caen 3 archivos de test enteros e `init.sh` sale exit 1**
   (`1185` frente a `1220`); (b) la causa que da la ficha (*"el almacén de pnpm la tiene por
   transitividad"*) es **falsa** — linker `isolated`, `postcss` clasificada `private`.
2. **Abrir ficha nueva por el `node_modules` contaminado** (348 entradas no-symlink contra 0 en install
   limpio, más el `.package-lock.json` de npm que encontré yo). **Es la causa de que la 120 fuera
   invisible y sigue viva.** Al escribirla, **anotar la métrica junto al número** (la de `stale.mjs`), o no
   será reproducible: un conteo ingenuo da 330/309 sobre el mismo árbol.
3. **Consta que el arreglo natural ya está pre-verificado**: `rm -rf node_modules && pnpm install` deja el
   árbol en el estado que tanto el implementer como yo medimos en limpio → **exit 0, 1220 passed**.

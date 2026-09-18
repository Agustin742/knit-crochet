# impl_21_cierre — cierre de la feature #21 `projects_detail_ui`

**Alcance:** trámite de cierre. **Cero código de aplicación nuevo.** Sólo un
comentario de test y un cambio de estado en `feature_list.json`.

---

## 1. Arreglo de coste cero pedido por el reviewer (observación **D9**)

**Archivo:** `src/features/projects/ui/ProjectCard.test.tsx` (test *"convive con
el quick-start sin que uno quede dentro del otro"*).

El comentario que precedía a `await userEvent.click(quickStart)` decía:

```ts
// Y cada uno hace lo suyo: tocar el cronómetro no abre el detalle.
```

Eso prometía **convivencia de capas** (que el puntero llegue al quick-start y no
a la capa del tap), y ese eje **happy-dom no lo puede medir**: no hay
hit-testing ni layout, y `userEvent.click` despacha directo sobre el elemento,
así que el aserto es **estructuralmente incapaz de fallar** por solapamiento.

Se sustituyó por un comentario que (a) dice qué mide de verdad — el **cableado**:
cada botón invoca a su propio manejador—, (b) explica por qué **no** puede medir
la geometría, y (c) remite a la verificación **a mano en navegador** del leader
(`progress/reports/verificacion_navegador_21_t2.md`, sección **"RESOLUCIÓN"**:
clic real sobre el quick-start → el cajón **no** se abre y la sesión **sí**
arranca), cerrando con *"no cites este aserto como evidencia de esa
convivencia"*.

**Lo que NO se hizo, a propósito:** no se borró el test (mide algo real y útil:
el cableado, el no-anidamiento y la ausencia de `<a>`), y **no se añadió ningún
gate nuevo** — la **moratoria de gates** está en vigor y D9 es ⚪ (ningún usuario
ve nada). El aserto queda igual; sólo deja de mentir sobre su alcance.

## 2. `feature_list.json`

Feature **#21 `projects_detail_ui`**: `in_progress` → **`done`**. Única feature
que cambia de estado. Recuento verificado parseando el JSON:

```
{"done":24,"pending":9}  total 33   f21 -> done
```

→ **24 done, 0 in_progress, 9 pending** sobre 33. ✅ Coincide con lo pedido.

---

## Archivos modificados (2)

- `src/features/projects/ui/ProjectCard.test.tsx` — sólo el comentario.
- `feature_list.json` — sólo el `status` de #21.

**No se tocó** `progress/deudas.md`, ni los RFC, ni `current.md`, ni
`history.md` (son del leader). El `pnpm dev` del puerto 3000 sigue vivo.

---

## Verificación — `bash ./init.sh`, salida real

```
── 3. Validando feature_list.json ──────────────────────
[OK]    feature_list.json válido (33 features)

── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  87 passed | 3 skipped (90)
      Tests  1587 passed | 13 skipped (1600)
   Start at  15:24:39
   Duration  179.53s

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
EXIT=0
```

**EXIT 0.** El recuento es **idéntico** al punto de partida —`1587 passed | 13
skipped (1600)`, **90 archivos**—, como debía ser: sólo cambió un comentario y
un JSON.

## Nota de honestidad

No se abrió navegador en esta sesión ni hacía falta: no hay cambio visible para
ningún usuario. La cobertura del eje geométrico de #21 sigue siendo, y seguirá
siendo hasta que exista un gate capaz de medirlo, **la verificación en navegador
del leader** ya registrada en
`progress/reports/verificacion_navegador_21_t2.md`.

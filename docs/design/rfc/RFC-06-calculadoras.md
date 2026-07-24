# RFC-06 — Calculadoras

- **Alcance:** las dos herramientas de cálculo (aumentos + regla de 3), lógica pura sin DB.
- **Estado:** borrador. Depende de **RFC-01**.
- **Proceso / arnés:** ver **[RFC-00](RFC-00-proceso.md)** (entorno de agentes, jerarquía de verdad, mapeo a `feature_list.json`).
- **Estética:** template adaptable.

---

## 1. Decisiones que fija este RFC

- **Una página con las dos herramientas en `kc-tabs`** (Aumentos · Regla de 3).
- **Aumentos:** resultado en **card destacada** con `kc-focusframe`; se muestra la **frase final** + el **desglose** (base/remainder).
- **Regla de 3:** **historial efímero** de cálculos en la sesión (no se persiste; se pierde al recargar).

## 2. Estructura y componentes

- **Tabs** (`kc-tabs`): "Aumentos" / "Regla de 3".
- **Aumentos:** dos `kc-input` (P = puntos actuales, A = aumentos) + `kc-btn--primary` "Calcular". Resultado en `kc-card` + `kc-focusframe`: la **instrucción legible** (`--font-display`) + un renglón de desglose (`--font-mono`: `base=… remainder=…`).
- **Regla de 3:** tres `kc-input` (skeinsA, lengthA, lengthB) + "Calcular" → resultado `skeinsB` destacado. **Historial** debajo (`kc-list`): cada cálculo con sus entradas y su resultado, en la sesión.

## 3. Datos / backend

- **Ninguno.** Lógica 100% en cliente. Reusa `src/features/calculators` (ya implementado: `calculateIncreases`, `calculateRuleOfThree`, `InvalidCalculatorInputError`).
- **Sin cambios de backend, sin endpoints, sin persistencia.**

## 4. Estados

- **Validación:** entradas inválidas (P/A ≤ 0 o no enteros; lengthA = 0) → `kc-field.has-error` con el mensaje del error nombrado. Sin resultado hasta que sea válido.
- Sin loading/empty/error de red (no hay red).

## 5. Accesibilidad

- Resultado en `aria-live` para que el lector lo anuncie al calcular; inputs con labels y `inputmode="numeric"`.

## 6. Fuera de alcance

- Cualquier persistencia del historial (es efímero por decisión).

## 7. Adaptación al harness

- Página `src/app/(app)/calculadoras/`. UI en `src/features/calculators/ui/` (la lógica pura ya existe).
- Verificación: RTL (caso canónico P=40/A=6, validaciones, regla de 3 con redondeo, historial efímero) + axe + smoke + build.

## 8. Slices de implementación (→ `feature_list.json`)

ID real en `feature_list.json` (mapeo en [RFC-00 §4](RFC-00-proceso.md)):

- **feature 29 `calculators_ui`** — página con tabs; form + resultado (card+focusframe+desglose) de
  aumentos; form + resultado + historial efímero de regla de 3. Sin backend (reusa la lógica de feature 11).

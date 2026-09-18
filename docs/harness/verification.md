# Verificación — Cómo demostrar que el trabajo funciona

> Regla de oro: **el agente no dice "funciona", lo demuestra**.
> Toda feature termina con evidencia ejecutable, no con afirmaciones.

## Niveles de verificación

### Nivel 0 — Estático (obligatorio)

El código compila, tipa y pasa el linter:

```bash
pnpm lint
pnpm exec tsc --noEmit        # o pnpm typecheck si existe el script
```

### Nivel 1 — Tests unitarios (obligatorio)

Toda función/módulo con lógica no trivial en `src/` tiene al menos un test que:

1. Cubre el camino feliz.
2. Cubre al menos un camino de error si la unidad puede fallar.

```bash
pnpm test
```

### Nivel 2 — Integración de endpoints (obligatorio para features de API)

Las features que añaden Route Handlers se verifican probando el handler real:
input válido → status/JSON esperado; input inválido → 400/401/404 según
corresponda. Usa una DB de test o dobles acotados, nunca datos de producción.

### Nivel 3 — Smoke test manual (opcional pero recomendado)

Antes de cerrar la sesión, levanta la app y ejerce el flujo end-to-end:

```bash
pnpm dev
# navega el flujo afectado en el navegador
```

## Anti-patrones (no hacer)

- ❌ "He añadido el endpoint, debería funcionar." → falta test ejecutable.
- ❌ Test que solo verifica que la función no lanza. → comprueba el resultado.
- ❌ Dar un trabajo por terminado sin la cadena de verificación completa en verde.
- ❌ Verificar contra la DB de producción de Neon.

## Verificación final antes de cerrar

La cadena completa, en este orden. Los cuatro comandos tienen que terminar en
verde antes de cerrar un cambio:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Los tres primeros son los niveles 0 y 1 de arriba. `pnpm build` se añade porque
el App Router de Next.js sólo detecta en compilación ciertos errores de frontera
cliente/servidor (por ejemplo, importar código de servidor desde un componente
de cliente): un test verde no los ve.

Esta cadena es la que ejecuta la fase de **verify** del proceso SDD
(*Spec-Driven Development*), declarada en `openspec/config.yaml` bajo
`verify.test_command`, `verify.build_command` y `verify.additional_gates`. Para
trabajo de UI hay además el listón del **SDD-01 §9** —el *Software Design
Document* del design system, que no tiene relación con el proceso SDD—:
tests de React Testing Library sobre comportamiento y accesibilidad,
`axe` en los primitivos, smoke de render y cero valores hardcodeados.

Si algún comando queda en rojo, **no cierres el cambio**. Anota el bloqueo en
los artefactos del cambio activo (`openspec/changes/<cambio>/tasks.md` y
`apply-progress.md`), que son los que llevan el estado en curso.

> Gestor de paquetes: **pnpm**, siempre. Nunca `npm`/`npx`.

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
- ❌ Marcar la feature como `done` sin pasar `bash ./init.sh`.
- ❌ Verificar contra la DB de producción de Neon.

## Verificación final antes de cerrar

```bash
bash ./init.sh          # debe terminar con [OK] Entorno listo
```

Si `bash ./init.sh` está rojo, **no** marques nada como `done`. Anota el
bloqueo en `progress/current.md` con estado `blocked` en `feature_list.json`.

> Nota: mientras el proyecto no tenga `package.json`/scripts todavía, `init.sh`
> reporta esos niveles como `[WARN]` (pendientes), no como fallo. En cuanto
> exista el scaffold de Next.js, pasan a ser obligatorios.

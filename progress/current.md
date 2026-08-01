# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** ninguna. Última sesión cerrada: **lote de higiene (deudas 21, 17, 13, 4 y 32)**,
  volcada a `progress/history.md`. Informe de cierre:
  `progress/informs/9.informe-deudas_21_17_13_04.md`.
- **Agente:** leader → implementer → reviewer (CAMBIOS REQUERIDOS) → implementer (2ª vuelta) → reviewer
  (APROBADO).

## Estado del proyecto

- **Fase 1 (PRD-01, features 1-11):** completa (`done`).
- **Fase 2 (UI, features 12-31):** en curso. **#12, #13 y #14 `done`**; siguiente pendiente por id =
  **#15 `uploads_image`**.
- `bash ./init.sh` VERDE: **435 passed | 6 skipped** (41 archivos + 1 skipped). `pnpm build` OK.

## Decisiones cerradas por el usuario (no se reabren)

- **Tamaño de etiqueta del archivero: 18px** (`--text-nav-tab`), y con él `--bp-archive: 1180px`. Ese token
  **determina a partir de qué ancho de pantalla existe el archivero**: a 24px desaparecería de los portátiles
  de 1280-1366px y a los 36px de la referencia sólo lo verían monitores grandes. Los dos tokens están atados
  por un test que obliga a moverlos juntos.

## ⚠️ REGLA para todos los agentes (nace de un bug real)

**Nunca escribas una clase de Tailwind con comodines o inventada en un informe, doc o comentario.** Citá una
clase real o describila en prosa. Un informe de #13 escribió una clase con un asterisco como abreviatura;
Tailwind v4 la tomó por una clase real, generó CSS inválido y **tumbó la app entera con 500 en todas las
rutas**. Ya hay guardrail (`@source not` para `progress/`, `docs/` y `template/` en `globals.css`, con test
de regresión en `src/app/globals-css.test.ts`), así que hoy no rompe nada — pero la higiene sigue valiendo.
Detalle: `progress/informs/6.informe-bugfix-tailwind_source_guardrail.md`.

## ⚠️ LECCIÓN de método del último lote (aplica a cualquier gate nuevo)

**El par que un test mide se DERIVA del código, no se elige a mano.** El lote de higiene fue rechazado en su
primera vuelta porque el test escrito para probar el arreglo medía un par de tokens que **ningún camino del
código puede producir**, y por eso tapaba en verde justo el caso roto. Es el patrón que ya arrastran las
deudas 18, 22, 23 y 33: *"el test mide tokens, el layout consume clases"*.

**Criterio de aceptación que se usó y conviene repetir: la condición doble.** Un gate nuevo tiene que verse
**caer en rojo** al quitar el arreglo y **pasar en verde** al restaurarlo, ejecutado en las dos direcciones.
Un test verde sólo vale si se lo ha visto fallar por la razón correcta.

## Próximo paso — feature #15 `uploads_image`

Endpoint **único** y compartido `POST /api/uploads/image` que cablea el helper de Cloudinary ya existente
(#5): recibe un archivo (multipart/Blob), lo sube y devuelve `{ url }`. Lo usan los forms de Project (#22),
Yarn (#25) y Pattern (#28) — **no es un endpoint por entidad**. Aquí se salda la **deuda 3**: `folder`/
`publicId` se derivan del `userId` del JWT **validado con zod**, nunca del body crudo. Tests: subida OK con
el cliente de Cloudinary mockeado en el borde, 401 sin sesión, input inválido (zod). Fuente: RFC-03/04/05 §8
+ PRD §11.7. Es una slice de **backend**, no de UI: no aplica el checklist visual del SDD §9.

## Notas para consumidores del design system (acumulado #12-#14 + lote de higiene)

- **Layout listo:** `src/shared/ui/layout/` (AppShell, ArchiveNav, BottomNav) — presentación pura. `AppShell`
  acepta `user`/`onLogout` **pero hoy nadie las alimenta y `ArchiveNav` las ignora**: son contrato reservado
  para **#31 `auth_ui`**, que tendrá que **reescribir** el gate de "cero fetch al montar" (deuda 29), no sólo
  añadir código.
- **Regla de superficies (nace del lote de higiene):** *una superficie que elige su fondo elige también su
  primer plano*. La variante fantasma de `Button` **hereda** el color del contexto, así que un contenedor
  nuevo que declare fondo y no declare texto deja invisible a lo que contenga. `Card` ya lo hace bien.
- **Capa 3D lista:** `<AsciiYarn />` en `src/shared/ui/three/`. Props: `interactive?: boolean` (default
  `false` → `pointer-events:none` + `aria-hidden`), `glow?: boolean` (halo `--shadow-glow`, default off),
  `cols`/`rows` (retícula ASCII, default 96×44) y `className` (fusionado con `cn()`). **Un loader debe poner
  su propio `role="status"` con texto alrededor** — el componente es siempre `aria-hidden`.
- **`AsciiYarnScene.tsx` y `createYarnScene.ts` (en `src/shared/ui/three/ascii-yarn/`) son los únicos
  archivos del repo que pueden importar `three`.** En tests, mockeá `three` en el borde.
- **Activa por ruta:** helper `isRouteActive` + `usePathname` (exacto para `/`, prefijo para subrutas).
- **Responsive token-first:** variantes `tablet:`/`mobile:`/`desktop:` (namespace `--breakpoint-*`). Para
  gates que deban **desmontar** (no sólo esconder), leer `--bp-*` con `matchMedia` como
  `useViewportSupports3d`.
- **Cero hardcode** enforced por `no-hardcode.test.ts`. Tests de UI: `// @vitest-environment happy-dom` +
  mockear `next/navigation` y `fetch`. **Asertá sobre la salida real de `cn()`, no sobre el string crudo de
  `cva`** — asertar sobre el crudo es lo que dejó pasar la deuda 13 durante años.
- **`prefers-reduced-motion` en JS:** ya existe `usePrefersReducedMotion` en
  `src/shared/ui/three/ascii-yarn/`. Si hace falta fuera del 3D, promoverlo a `shared/ui/lib/`.
- Gotcha vigente: no usar la secuencia de cierre de comentario dentro de `bg-*/text-*` en `globals.css`.

## Deuda técnica acumulada

> Vive en **`progress/deudas.md`** — es el libro mayor y **no se vacía nunca**. Hoy: **34 fichas**, de las
> cuales **saldadas y tachadas** 1, 2, 8, 4, 13, 17, 21 y 32.
>
> **No copies deudas de vuelta aquí.** Si una tarea toca una, citála por número.

## Pendiente operativo (no bloquea)

- Bastante trabajo sin commitear (features #8-#14 + `informs/` + `docs/design/rfc` + `template/` + este
  lote). Commit(s) limpios cuando el usuario lo indique.
- El destrackeo de `tsconfig.tsbuildinfo` deja una **eliminación preparada en el índice** de git: entra en el
  próximo commit. El archivo sigue en disco.

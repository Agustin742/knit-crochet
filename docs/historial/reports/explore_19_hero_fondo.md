# Explore #19 — Hero del Dashboard vs. fondo global de `<AsciiYarn />` (enmienda E1.2)

> **Tipo:** investigación de solo lectura. **No se tocó `src/**`.**
> **Nota de honestidad:** en este informe **no se ejecutó la suite de tests ni el build**. Todo lo que
> dice "se rompe" / "no se rompe" es **inferencia por lectura de código**, marcada como tal. Lo que sí
> es dato duro son las rutas y los números de línea: están leídos del archivo.
> **Nota de seguridad Tailwind:** este informe describe las clases **en prosa** y no transcribe
> literales de utilidades. `src/app/globals.css:17` ya excluye `progress/` del escaneo
> (`@source not "../../progress"`), pero la regla se respeta igual por defensa en profundidad.

---

## 1. Dónde y cómo se monta hoy el fondo

Hay **exactamente dos** sitios en `src/` que montan `<AsciiYarn />` (verificado por barrido de
`AsciiYarn|useViewportSupports3d` sobre todo el repo):

| # | Archivo | Línea | Qué monta |
|---|---------|-------|-----------|
| 1 | `src/features/auth/ui/AppShellClient.tsx` | 57 | fondo global de **todo** el grupo `(app)` |
| 2 | `src/app/(auth)/login/page.tsx` | 47 | fondo de la pantalla de acceso (fuera de `(app)`) |

### La cadena de montaje, de servidor a cliente

**`src/app/(app)/layout.tsx`** — **Server Component** (`async`, sin `"use client"`).

- Línea 17-18: `export default async function AppLayout(...)` → `const user = await getSessionUser()`.
- Línea 21: renderiza `<AppShellClient user={user ? { name: user.name } : null}>`.
- **Por qué es servidor:** el JSDoc (líneas 6-16) lo dice explícitamente — la sesión se resuelve aquí
  para que el caparazón **no pida nada desde el navegador**, y sólo cruza a cliente el `name`, no el
  registro entero. Esto es lo que mantiene vivo el gate de coste de la deuda 21/29 (ver §4).
- **No pasa ninguna prop de fondo ni de ruta.** El layout no sabe en qué ruta está (ver §3, opción (a)).

**`src/features/auth/ui/AppShellClient.tsx`** — **Client Component** (línea 1: `"use client"`).

- Línea 3: `import { useRouter } from "next/navigation"` (ya importa de ese módulo).
- Línea 6: `import { AppShell, type AccountUser, AsciiYarn } from "@/shared/ui"`.
- Líneas 48-54: `handleLogout` con `useCallback` → `postLogout()` + `router.replace/refresh`.
- **Línea 57 — EL PUNTO EXACTO:**
  `<AppShell user={user} onLogout={handleLogout} background={<AsciiYarn />}>`
  El fondo se pasa **duro, sin condición**, para todas las rutas de `(app)`.
- **Por qué es cliente:** necesita `useRouter` y un handler de `onClick` para el logout. Es la
  "costura" (su palabra, JSDoc línea 20-21) entre el design system puro y la app.

**`src/shared/ui/layout/app-shell/AppShell.tsx`** — **sin directiva** (server-compatible; se vuelve
cliente por herencia porque su único consumidor en `(app)` es `AppShellClient`).

- Líneas 12-17: la prop `background?: ReactNode` es **opcional** y está documentada como "se inyecta
  desde fuera para que este módulo siga siendo presentación pura y no importe `three`".
- Líneas 52-58: el slot `data-slot="bg-3d"`, con `aria-hidden="true"`, posicionamiento fijo a los
  cuatro lados, sin captura de puntero, y en el token de capa `--z-bg-3d`. Dentro va `{background}`.
- Línea 67: el `main` va en el token de capa `--z-base`, es decir **por encima** del slot de fondo.
- **Dato clave para el radio de explosión:** como `background` ya es opcional, pasar `undefined`
  **renderiza el slot vacío sin ningún cambio en el design system**. No hace falta tocar
  `shared/ui` para apagar el fondo.

### Dónde ya se lee la ruta (precedente existente)

`usePathname()` **ya se usa dentro del caparazón**, así que leer la ruta en esta capa no es una
técnica nueva en el repo:

- `src/shared/ui/layout/archive-nav/ArchiveNav.tsx:3` (import) y `:60` (`usePathname() ?? "/"`).
- `src/shared/ui/layout/bottom-nav/BottomNav.tsx:3` y `:23` (idem).
- `src/shared/ui/layout/nav-items.ts:16` define `NAV_ITEMS` con `href: "/"` para el Dashboard, y
  `isRouteActive()` (líneas 28-33) trata `"/"` como **coincidencia exacta** — la semántica que hace
  falta aquí (`/proyectos` no debe apagar el fondo).

---

## 2. API pública exacta de `<AsciiYarn />`

**Archivo:** `src/shared/ui/three/ascii-yarn/AsciiYarn.tsx`.
**Barrel:** `src/shared/ui/three/ascii-yarn/index.ts:1` → `src/shared/ui/three/index.ts` →
`src/shared/ui/index.ts:6` (`export * from "./three"`). Se importa como `import { AsciiYarn } from "@/shared/ui"`.

### Props (interfaz en líneas 19-34, defaults en la firma, líneas 48-54)

| Prop | Tipo | Default | Efecto |
|------|------|---------|--------|
| `interactive` | `boolean` | `false` | Con `true` el host **captura puntero** y el `<pre>` se puede arrastrar; con `false` no captura eventos. Se refleja en el DOM como `data-interactive="true"/"false"` (línea 61). |
| `glow` | `boolean` | `false` | Aplica el halo por token `--shadow-glow` (línea 66). Apagado como en el template. |
| `cols` | `number` | *(pasa a la escena)* | Columnas de la retícula ASCII. Default real **96**, definido en `AsciiYarnScene.tsx:12` (`DEFAULT_COLS`). |
| `rows` | `number` | *(pasa a la escena)* | Filas. Default real **44**, `AsciiYarnScene.tsx:13` (`DEFAULT_ROWS`). |
| `className` | `string` | — | Se fusiona con `cn()`; "tamaño y posición los decide el consumidor" (línea 32). |

### Invariantes que el hero **no puede** romper

- **Siempre `aria-hidden="true"`** (línea 59). No es opcional. Esto es justo lo que hace que **E1.3
  (hero no operable por teclado) pase axe sin trabajo extra**.
- Color por `currentColor` heredado del token de acento fijado en el host (línea 63).
- La escena real va tras `dynamic(..., { ssr: false, loading: () => null })` (líneas 14-17): `three`
  **nunca** entra en el bundle del servidor y no reserva espacio mientras carga.

### Gate de viewport (`useViewportSupports3d`)

**Archivo:** `src/shared/ui/three/ascii-yarn/useViewportSupports3d.ts`.

- Lee el token CSS `--bp-tablet` de `documentElement` (líneas 5, 12-19) — no literaliza el
  breakpoint, porque las media queries no resuelven `var()`.
- `useSyncExternalStore` (línea 49) con `getServerSnapshot()` → **`false`** (líneas 39-41): en SSR
  nunca se monta.
- **Falla abierto**: si el token no existe, `getSnapshot` devuelve `true` (línea 36).
- Consumo en `AsciiYarn.tsx:55` y `69-71`: por debajo de `--bp-tablet` **no se renderiza
  `<AsciiYarnScene>` en absoluto** → `three` ni se descarga (JSDoc líneas 43-47).

> **Consecuencia para #19 que conviene escribir en el código:** en móvil (`< --bp-tablet`) el hero
> **no pinta nada**. El bloque de hero del Dashboard tiene que verse bien con el ovillo ausente
> (wordmark/saludo solos), no dejar un hueco. Es inferencia por lectura del hook (no medido en
> navegador).

---

## 3. Opciones reales para que la ruta decida su fondo

### (a) Prop en `AppShellClient` que el layout servidor derive de la ruta — **NO VIABLE**

`src/app/(app)/layout.tsx` es un Server Component y **no recibe el pathname**: los layouts de App
Router reciben `children` y `params`, nada más. Verificado además que `src/proxy.ts` **no inyecta
ninguna cabecera** con la ruta — `proxy()` (líneas ~72-98) sólo devuelve `NextResponse.next()`,
`.json()` o `.redirect()`, nunca un `next({ request: { headers } })`.

Para hacerla viable habría que **añadir una cabecera en el proxy** y leerla con `headers()` en el
layout. Coste: toca `src/proxy.ts` (archivo con la advertencia explícita de las líneas 6-8 sobre su
grafo de imports), obliga a actualizar `src/proxy.test.ts`, convierte el layout en dinámico por
`headers()`, y añade un acoplamiento nuevo middleware→layout que hoy no existe. **Peor relación
coste/beneficio de las cuatro.**

### (b) `AppShellClient` lee `usePathname()` y decide el fondo — **RECOMENDADA**

Un solo cambio, en la línea 57 de `src/features/auth/ui/AppShellClient.tsx`: pasar el fondo sólo
cuando la ruta **no** sea `/`, apoyándose en que `background` ya es opcional.

**Por qué es la de menor radio:**

1. **Cero archivos nuevos y cero cambios en `shared/ui`.** El design system ya soporta el caso
   (`AppShell.tsx:17`, prop opcional). No se toca `AppShell`, ni el barrel, ni ningún `.tokens.test`.
2. **Cero fronteras de cliente nuevas.** `AppShellClient` ya es `"use client"` (línea 1) y ya importa
   de `next/navigation` (línea 3). `usePathname` lee del contexto del router, **no dispara red** →
   el gate de "cero fetch al montar" sigue siendo verdad (inferencia, no medido; ver §4).
3. **Precedente idéntico ya en producción**: `ArchiveNav` y `BottomNav` derivan su estado activo de
   `usePathname` exactamente igual, y la comparación exacta con `"/"` ya está resuelta en
   `isRouteActive` (`nav-items.ts:28-33`).
4. **La decisión queda en la costura app↔design-system**, que es donde el JSDoc de `AppShellClient`
   (líneas 20-21) dice que vive el conocimiento de la app. `AppShell` sigue siendo presentación pura.
5. **Sin parpadeo ni doble montaje.** La decisión se toma en el render del padre, antes de que el
   hijo exista: nunca llega a instanciarse un `WebGLRenderer` que después haya que tirar.

**Archivos que toca:** `src/features/auth/ui/AppShellClient.tsx` (1 línea + JSDoc) y
`src/features/auth/ui/AppShellClient.test.tsx` (ver §4, hay un test que **cae**).

**Detalle de implementación a encargar explícitamente:** la constante de la ruta del Dashboard **no
debe importarse de `src/proxy.ts`** (aunque `src/proxy.ts:26` exporte `HOME_PATH = "/"`): eso
arrastraría el módulo del middleware al grafo de un componente de cliente. Definir la constante local
en `features/auth/ui/` o reutilizar `NAV_ITEMS`/`isRouteActive` de `shared/ui`.

### (c) Slot / children que la página rellene — **NO VIABLE tal cual, y peligroso si se fuerza**

En App Router **el layout renderiza antes que la página**, así que la página no puede "avisar hacia
arriba" durante el render. Las dos variantes:

- **Contexto + efecto desde la página:** el fondo se monta en el primer render y se desmonta en el
  segundo. Eso es exactamente lo que E1.2 prohíbe — **hay una ventana con dos ovillos vivos** y se
  paga la inicialización de un `WebGLRenderer` para tirarlo. Descartar.
- **Rutas paralelas (`@background`):** técnicamente correcta y sí resuelve E1.2, pero obliga a crear
  un slot nuevo, un `default.tsx`, y a que cada ruta de `(app)` declare su fondo. Radio de explosión
  desproporcionado para un booleano.

### (d) Dos grupos de rutas hermanos dentro de `(app)`, cada uno con su layout — **DESCARTADA**

Funciona (cada layout monta `AppShellClient` con un fondo distinto), pero exige mover **todas** las
páginas de `(app)` a subcarpetas y, sobre todo, **navegar entre grupos hermanos remonta el layout
entero** — es decir, el caparazón y el ovillo se reinician en cada navegación entre el Dashboard y
cualquier otra página. Es justo el coste que la deuda 21 vino a eliminar.

### Veredicto

**(b)**, sin dudas. Es literalmente el "coste aceptado" que la enmienda E1.2 ya presupuestó
("hay que dar al caparazón una forma de que la ruta decida su fondo… es fontanería acotada"), y
resulta ser **una línea**.

---

## 4. CRÍTICO — gates existentes que se rompen

### 4.1 SE ROMPE: `src/features/auth/ui/AppShellClient.test.tsx:98-106`

```
 98  it("hands the 3D layer to the shell as its background", () => {
 99    render(
100      <AppShellClient>
101        <p>Panel</p>
102      </AppShellClient>,
103    );
104
105    expect(screen.getByTestId("ascii-yarn")).toBeInTheDocument();
106  });
```

**Por qué cae:** el archivo mockea `next/navigation` en la línea 17 con **`usePathname: () => "/"`**.
Es decir, el doble de la ruta **ya devuelve el Dashboard**. En cuanto `AppShellClient` empiece a
consultar `usePathname`, este test se ejecutará en la ruta `/`, donde E1.2 dice que **no** debe haber
fondo → `getByTestId("ascii-yarn")` lanzará.

> Curiosidad útil: ese `usePathname` de la línea 17 **hoy no lo usa nadie** (el archivo mockea
> `@/shared/ui` entero en la línea 44, así que `ArchiveNav`/`BottomNav` reales no se montan). Está
> ahí de más — lo cual significa que el mock **ya está listo** y el implementer no tendrá que tocarlo,
> sólo hacerlo controlable (`vi.fn()` con `mockReturnValue`, como en
> `src/shared/ui/layout/layout.test.tsx:11-19`, que es el patrón ya usado en el repo).

**Qué debe pasar a decir:** dos tests en lugar de uno — en `/` **no** hay fondo global; en cualquier
otra ruta (p. ej. `/proyectos`) **sí** lo hay. Ese par **es** el gate ejecutable de E1.2 en esta capa.

### 4.2 NO SE ROMPE: gate de "cero fetch al montar" — `AppShellClient.test.tsx:119-131`

```
119  it("fires no HTTP request when mounted, not even with a session", async () => {
...
130    expect(fetchSpy).not.toHaveBeenCalled();
131  });
```

Y su pareja, `:208-225` (`"costs one request per press, and none per mount"`, `:220`
`expect(fetchSpy).not.toHaveBeenCalled()` tras un rerender).

**Análisis:** `usePathname()` lee del contexto del router de Next; no abre red, no monta efectos, no
suspende. **Inferencia (no medido): estos dos gates NO se ven afectados por la opción (b).** El
comentario de las líneas 108-117 explica que el gate protege contra "pedir el usuario desde el
navegador", que es un eje distinto.

**Contraste importante:** la opción **(a)** sí los pondría en riesgo indirecto, porque movería lógica
al layout servidor y obligaría a tocar `src/app/(app)/app-layout.test.tsx:68`
(`expect(fetchSpy).not.toHaveBeenCalled()`), que es el gate gemelo del lado servidor.

### 4.3 NO SE ROMPE con la opción (b): `src/app/(app)/app-layout.test.tsx`

Mockea `@/features/auth/ui` entero (líneas 26-38) reemplazando `AppShellClient` por un doble que sólo
pinta `data-user`. No sabe nada de fondos. Sus tres tests (líneas 54, 71, 82) siguen verdes.
**Con la opción (a) habría que reescribirlo entero.**

### 4.4 NO SE ROMPE: `src/shared/ui/layout/layout.test.tsx:36-45`

```
36  it("renders the injected background inside the 3D slot", () => {
38      <AppShell background={<span data-testid="bg-scene" />}>
42    const slot = container.querySelector("[data-slot='bg-3d']");
43    expect(slot).not.toBeNull();
44    expect(slot?.querySelector("[data-testid='bg-scene']")).not.toBeNull();
```

Prueba el **caso inyectado**, no el caso ausente, y la opción (b) no toca `AppShell`. Sigue verde.
**No existe hoy su contrapartida** (que sin `background` el slot quede vacío); es barata de añadir y
sería el complemento natural del gate nuevo de §5.

### 4.5 NO SE ROMPE: `src/app/(auth)/auth-pages.test.tsx`

- `:84-92` — login **sí** monta el ovillo y el slot `data-slot="bg-3d"` con `aria-hidden`.
- `:190-193` — register **no** lo monta (`queryByTestId("ascii-yarn")` ausente y el slot `toBeNull()`).

Grupo `(auth)`, fuera de `(app)`. Intacto. **Nota:** este par es exactamente el molde a copiar para el
gate nuevo de §5 — mismo repo, misma técnica, ya aprobada por review.

### 4.6 Gates de barrido que se activan solos si #19 añade archivos

Ninguno se rompe por la fontanería del fondo, pero **cualquier archivo nuevo de `#19` cae bajo ellos
automáticamente** (barren por recorrido de directorios, no por lista):

- `src/shared/ui/no-hardcode.test.ts` — recorre **todo** `src/shared/ui/**` (líneas 32-46) exigiendo
  cero hex, cero `rgb(`, cero literales en píxeles (líneas 49-51). Sólo aplica si #19 mete algo en
  `shared/ui`; el hero debería vivir en `src/features/dashboard/ui/` según RFC-02 §7.
- `src/shared/ui/canonical-tailwind-classes.test.ts` — recorre **todo `src/`** (línea 50,
  `SRC_DIR = ../../` desde `src/shared/ui/`). Aplica sí o sí al Dashboard.
- `src/shared/ui/public-api.test.ts:20-57, 65-72` — listas **literales y exactas** de exports
  (`toEqual`, no `toContain`, deliberadamente: JSDoc líneas 15-18). Si #19 exporta **cualquier cosa
  nueva** desde `shared/ui/primitives` o `shared/ui/feedback`, este test cae hasta que se actualice la
  lista. Un componente de dashboard en `features/` **no** lo toca.

### 4.7 Fuera de E1.2 pero dentro de #19: `src/proxy.test.ts` cae por E1.1

Al quitar `/` de `PUBLIC_PAGES` (`src/proxy.ts:14`):

- `src/proxy.test.ts:55-62` — `it("lets public pages through without token")` itera
  `["/", "/login", "/register"]` esperando `200` (línea 58). **Cae**: `/` pasará a `307`.
- `src/proxy.test.ts:127-131` — `it("deja entrar al Dashboard, que es una página como cualquier otra")`
  con token válido espera `200`. **Sigue verde** (con sesión, `/` entra igual).
- `:89-101` y `:103-116` (redirección de `/login` a `/` **con** sesión) siguen verdes.

---

## 5. ¿Existe hoy un gate de "un solo AsciiYarn"?

# **NO. No existe. Hay que crearlo en #19.**

Verificado por barrido: no hay **ni una sola** aparición de `getAllByTestId` / `toHaveLength(1)`
asociada a `ascii`, `yarn` o `bg-3d` en todo `src/`. Los cinco archivos de test que mencionan el
ovillo son:

| Archivo | Qué asierta sobre el ovillo | ¿Cuenta instancias? |
|---------|-----------------------------|---------------------|
| `src/features/auth/ui/AppShellClient.test.tsx:98-106` | que **existe** uno como fondo | **No** (`getByTestId`, singular) |
| `src/app/(auth)/auth-pages.test.tsx:84-92` / `:190-193` | presencia en login / ausencia en register | **No** |
| `src/shared/ui/three/ascii-yarn/ascii-yarn.test.tsx` | comportamiento del componente aislado (host, escena diferida, `interactive`, `glow`, `--bp-tablet`, rotación, reduced-motion) | **No** |
| `src/shared/ui/layout/layout.test.tsx:36-45` | que el slot recibe lo inyectado | **No** |
| `src/shared/ui/no-hardcode.test.ts:64` | que el barrido llega al archivo de la escena | **No** |

**Y tampoco hay un test de la página del Dashboard.** `src/app/(app)/page.tsx` (hoy 12 líneas, un
título y un párrafo) **no tiene ningún archivo de test asociado** — el único test del grupo `(app)`
es `app-layout.test.tsx`, y mockea el shell. **No hay suite e2e** en el repo (no existen `e2e/` ni
`tests/`; el único runner es vitest).

### Gate que #19 debe crear para que E1.2 sea ejecutable y no prosa

Un `getByTestId` en singular **no falla** si hay dos ovillos — falla `getAllByTestId(...).length`.
Recomendación concreta al implementer:

1. **En `AppShellClient.test.tsx`** (reemplazando el test roto de §4.1): con `usePathname` devolviendo
   `/`, `queryAllByTestId("ascii-yarn")` debe tener **longitud 0**; con `/proyectos`, **longitud 1**.
2. **En el test nuevo de la página del Dashboard**: renderizar la página **dentro** del
   `AppShellClient` real (con `@/shared/ui` doblado en el borde, tal como hace
   `auth-pages.test.tsx:18-20`) y asertar que `queryAllByTestId("ascii-yarn")` tiene **exactamente
   longitud 1**, y que esa única instancia lleva `data-interactive="true"` — el atributo ya existe en
   `AsciiYarn.tsx:61` y distingue el hero del fondo **sin inventar nada**.
3. Opcional y barato (§4.4): que `<AppShell>` sin `background` deje el slot `data-slot="bg-3d"` vacío.

Sin el punto 2, E1.2 se puede violar en el futuro sin que ningún test lo note.

---

## 6. Resumen ejecutable para el leader

- **Camino de menor radio:** opción **(b)** — `usePathname()` en `AppShellClient.tsx:57`.
  **Toca 1 archivo de producción** (`src/features/auth/ui/AppShellClient.tsx`) y **0 archivos de
  `shared/ui`**, porque `AppShell.background` ya es opcional (`AppShell.tsx:17`).
- **Único gate que cae por E1.2:** `src/features/auth/ui/AppShellClient.test.tsx:98-106` — hay que
  partirlo en el par `/` sin fondo / otra ruta con fondo.
- **Gates de coste (cero fetch al montar) NO afectados** por (b): `AppShellClient.test.tsx:119-131` y
  `:208-225`, y `app-layout.test.tsx:68`. *(Inferencia por lectura; no ejecuté la suite.)*
- **Gate faltante que #19 debe crear:** conteo `queryAllByTestId("ascii-yarn")` = 1 en `/`, con
  `data-interactive="true"`. Hoy **no existe nada** que impida los dos ovillos.
- **Aparte, por E1.1:** `src/proxy.test.ts:55-62` cae al quitar `/` de `PUBLIC_PAGES`
  (`src/proxy.ts:14`).
- **Recordatorio para el hero:** el ovillo del Dashboard va **en el flujo de la página** (dentro del
  `main`, capa `--z-base`), **no** en el slot `data-slot="bg-3d"` — ese slot es fijo a pantalla, está
  `aria-hidden` y no captura puntero; RFC-02 §2 quiere el hero acompañado del wordmark. Y en móvil
  (`< --bp-tablet`) el ovillo **no se pinta**: el bloque de hero debe sostenerse sin él.

# impl — Feature #19 `dashboard_ui`

> **Estado:** implementación terminada y verificada. `feature_list.json` queda en **`in_progress`**:
> la cierra el reviewer, no yo.
>
> **Honestidad de las cifras.** Lo que dice **MEDIDO** se ejecutó en esta sesión y la salida está pegada
> tal cual salió. Lo que dice **inferencia** es lectura de código, no ejecución. Si algo no lo corrí, lo digo.

---

## 0. Verificación (lo primero, porque es lo que se comprueba)

**Baseline al arrancar** — `bash ./init.sh`, `EXIT=0`:

```
 Test Files  62 passed | 3 skipped (65)
      Tests  788 passed | 13 skipped (801)
```

**Final** — `bash ./init.sh`, `EXIT=0` (ejecutado sin tubería, para que el código de salida sea el del script):

```
[OK]    lint verde
[OK]    typecheck verde

 Test Files  68 passed | 3 skipped (71)
      Tests  1194 passed | 13 skipped (1207)

[OK]    Entorno listo. Puedes empezar a trabajar.
```

**`pnpm build`** — OK:

```
✓ Compiled successfully in 8.9s
✓ Generating static pages using 3 workers (15/15) in 346ms
Route (app)
┌ ƒ /
…
└ ○ /register
```

**Delta: +6 archivos de test, +406 tests.** El grueso (+325) es mecánico: ampliar el barrido de
`no-hardcode.test.ts` de 55 a 216 archivos multiplica sus `it` por archivo (§5). Los tests de
comportamiento nuevos son **81**.

`src/shared/db/index.test.ts` **no** falló por timeout en ninguna de las tres corridas completas
(deuda 103 no apareció).

---

## 1. Archivos creados

| Archivo | Qué es |
|---|---|
| `src/shared/lib/format.ts` | Formato de números y duraciones (es-AR). Lo consumen dos features. |
| `src/shared/lib/format.test.ts` | 15 tests. |
| `src/features/projects/ui/types.ts` | `SerializedProject` (fechas como `string`), `ProjectListPayload`, `ProjectCardData`. |
| `src/features/projects/ui/ProjectCard.tsx` | **La card de proyecto (E2.1)**: foto + nombre + progreso + tiempo. Sin quick-start. |
| `src/features/projects/ui/ProjectCard.test.tsx` | 9 tests + axe. |
| `src/features/projects/ui/index.ts` | Barrel de UI, **aparte** del de la feature (ese arrastra Drizzle). |
| `src/features/dashboard/ui/dashboard-client.ts` | Costura HTTP de cliente (métricas, activos, alta). |
| `src/features/dashboard/ui/metrics-display.ts` | Claves/etiquetas de métrica, conversión de unidades y **E1.4/E1.5**. |
| `src/features/dashboard/ui/metrics-display.test.ts` | 11 tests. |
| `src/features/dashboard/ui/filters.ts` | Año, tipo, orden (**E2.2**), tope de la lista. |
| `src/features/dashboard/ui/filters.test.ts` | 11 tests, con el ancla del rango de años. |
| `src/features/dashboard/ui/DashboardHero.tsx` | Hero: wordmark + saludo + **el único ovillo** (E1.2/E1.3). |
| `src/features/dashboard/ui/MetricsPanel.tsx` | Selector conmutable/superponible + tarjetas + skeletons. |
| `src/features/dashboard/ui/ActiveProjectsPanel.tsx` | Lista de activos, orden, tope y "ver todos". |
| `src/features/dashboard/ui/NewProjectDialog.tsx` | Modal de creación rápida con el `type` preseleccionado. |
| `src/features/dashboard/ui/DashboardView.tsx` | Orquestador: estado, fetch, y los tres estados de RFC-02 §4. |
| `src/features/dashboard/ui/DashboardView.test.tsx` | **31 tests** + axe en tres estados. |
| `src/features/dashboard/ui/index.ts` | Barrel de UI. |
| `src/app/(app)/dashboard-page.test.tsx` | **El gate nuevo de E1.2** + smoke de ruta (5 tests). |

## 2. Archivos modificados

| Archivo | Cambio |
|---|---|
| `src/proxy.ts` | `PUBLIC_PAGES` pierde `/` (**E1.1**) + JSDoc en las dos allowlists. |
| `src/proxy.test.ts` | Reescrito el test que cae, **añadido el gate positivo**, reescrito el que cambia de significado. |
| `src/features/auth/ui/AppShellClient.tsx` | El fondo 3D lo decide la ruta vía `usePathname()` (**E1.2**). |
| `src/features/auth/ui/AppShellClient.test.tsx` | `usePathname` pasa a ser controlable; el test del fondo se parte en el par. |
| `src/app/(app)/page.tsx` | Placeholder de 12 líneas → composición del Dashboard. |
| `src/shared/ui/no-hardcode.test.ts` | Raíz del barrido `src/shared/ui/` → `src/` (**E2.3**) + seguro ampliado. |
| `src/shared/config/index.ts` | `SECONDS_PER_MINUTE`, hermana de `SECONDS_PER_HOUR`. |
| `src/shared/config/index.test.ts` | Su ancla. |
| `src/features/dashboard/validation.ts` | `METRICS_YEAR_MIN`/`MAX` extraídos y exportados (mismos valores). |
| `progress/current.md` | Bloque de feature en curso + plan. |

**No toqué:** `LOGIN_PATH`, `HOME_PATH`, `isPublicPath`, `unauthorized`, `AUTH_PAGES`, el `matcher`,
`src/shared/ui/**` (ni un archivo), `src/app/(app)/layout.tsx`, `app-layout.test.tsx`, `next-path.ts`,
`LoginForm`, `RegisterForm`, `feature_list.json`, `progress/deudas.md`.
**No fusioné `PUBLIC_PAGES` con `AUTH_PAGES`** aunque hoy tengan el mismo contenido; ambos JSDoc explican
por qué no.

---

## 3. Las ocho decisiones, y qué se hizo con cada una

### E1.1 — `/` privada

`src/proxy.ts:22` → `const PUBLIC_PAGES = ["/login", "/register"];`. Una línea de producción.

- El test que caía (`proxy.test.ts:55-62`) se **reescribió, no se recortó**: conserva el invariante
  ("la puerta de entrada se puede abrir sin sesión") y su comentario ya no dice "las tres".
- **Gate positivo nuevo**, que no existía: sin token, `/` → **307**, `location.pathname === "/login"`,
  `next === "/"`.
- `proxy.test.ts:127-131` conservado y **reescrito de título y comentario**: pasa de "una página como
  cualquier otra" a "el destino del rebote es alcanzable con sesión, y por eso no hay bucle".

### E1.2 — el hero reemplaza al fondo global en `/`

`AppShellClient` lee `usePathname()` y pasa `background={undefined}` en `/`. **Cero cambios en
`shared/ui`** (`AppShell.background` ya era opcional). **No se importa `HOME_PATH` de `src/proxy.ts`**:
hay una constante local `HERO_PATHS` con el motivo escrito (arrastraría el módulo del middleware al
grafo de un componente de cliente).

El gate nuevo está en `src/app/(app)/dashboard-page.test.tsx` y monta la página **dentro del
`AppShellClient` real**, no contra dos mitades dobladas. Cuenta con `queryAllByTestId(...).length`
(el singular no falla con dos instancias) y comprueba que la única instancia lleve
`data-interactive="true"`. Tiene su par en la otra dirección (`/proyectos` → 1 ovillo, decorativo).

### E1.3 — el hero no es operable por teclado, a propósito

Documentado en `DashboardHero.tsx` con el razonamiento entero y un **"no lo arregles"** explícito.
`AsciiYarn` es siempre `aria-hidden`, así que axe pasa solo (MEDIDO: los tres `axe` de
`DashboardView.test.tsx` pasan).

**También documentado ahí** que por debajo de `--bp-tablet` el ovillo no se monta, y que por eso su
hueco se apaga con la misma condición de ancho —la utilidad de ocultación de Tailwind, revertida a
bloque por la variante responsive de tablet— en vez de quedarse como un agujero.

> **CORREGIDO EN RONDA 2 (bloqueante B1 del review).** La primera versión de este párrafo, y la del
> comentario de `DashboardHero.tsx`, afirmaban que *"un test de tokens los obliga a moverse juntos"*.
> **Era falso cuando se escribió:** el único test que ataba los dos namespaces era
> `archive-nav.tokens.test.ts:257-262`, y es del par **`archive`**. Ahora es verdad, porque el test
> **se escribió** — `src/shared/ui/breakpoint-tokens.test.ts`, para los **cuatro** pares. Detalle y
> condición doble en §11.

### E1.4 — `≈ N veces <etiqueta>`

`formatComparison` en `metrics-display.ts`, con las tres ramas: `times === 0` → **nada**;
`times < 1` → *"Todavía no llegás a X"*; resto → `≈ N veces X`.

**Un detalle que decidí yo y conviene que el reviewer mire:** la palabra se concuerda con el número
**ya formateado**. `times = 1.04` se pinta como `"1"`, y *"≈ 1 veces El Obelisco"* sería justo el texto
roto que E1.4 salió a evitar, así que ahí dice *"vez"*. **No reabre la enmienda** (no toca las
etiquetas ni el formato: E1.4 descartó pluralizar *las etiquetas de config*, no la palabra que ella
misma introdujo), pero es una decisión de implementación mía y está escrita en el JSDoc.

El redondeo y la coma decimal son míos: **no existía ningún helper de formato** (MEDIDO en la
exploración; confirmado al escribirlo). Salieron a `src/shared/lib/format.ts` con `Intl.NumberFormat`
en `es-AR`, porque los consumen dos features.

### E1.5 — marca de "total histórico" en metros

`LIFETIME_METRIC_NOTE` + `isLifetimeMetric()`. El gate comprueba las **dos** direcciones de la
pertenencia: con metros visible hay **exactamente una** marca, y con horas y proyectos visibles hay
**cero**.

### E2.1 — la card de proyecto, en `projects/ui/`, sin quick-start

Foto + nombre + barra de progreso + tiempo. **Nada más**, y **ningún slot de acción "preparado"**.
Hay un gate negativo explícito: la card no monta ni un `button` ni un `link`.

`progress` se le pasa **directo** a `ProgressBar` (ya viene 0-100 entero) y hay un test que lo fija.
`time` se formatea como duración legible, con un test que además comprueba que **no** se pintan los
segundos crudos.

### E2.2 — orden por `updatedAt`, con etiqueta honesta

La opción por defecto se llama **"Actividad reciente"**, y el `hint` del campo dice con todas las
letras *"La actividad cuenta cualquier cambio en el proyecto, no sólo el tiempo tejido."*. Hay un test
que asierta que **en ninguna parte de la pantalla** aparece "último tejido".

El orden es de cliente (`sortProjects`), igual que el tope de 15: el contrato no acepta `limit`,
`offset` ni ordenación.

### E2.3 — el barrido de no-hardcode se amplía a `src/`

Ver §5, que lleva la medición completa.

---

## 4. La trampa de `ProjectRecord`, y cómo se resolvió

El tipo del dominio declara `Date` en las cuatro fechas, pero por HTTP llegan **cadenas ISO**:
`p.updatedAt.getTime()` compila y explota en el navegador. Es directamente el eje del orden por
`updatedAt`.

**Elegido: un tipo propio de cliente, derivado del de dominio**, en
`src/features/projects/ui/types.ts`:

```ts
type SerializedDates = "startDate" | "endDate" | "createdAt" | "updatedAt";
export type SerializedProject = Omit<ProjectRecord, SerializedDates> & { … string … };
```

Por qué derivar y no reescribir: si la tabla gana una columna, el tipo de cliente la gana también, y si
pierde una fecha el `Omit` deja de compilar. El `import type` se borra en compilación
(`verbatimModuleSyntax: true`), así que **no arrastra Drizzle al bundle** — MEDIDO indirectamente:
`pnpm build` OK y el servidor real sirve la página sin error.

`sortProjects` parsea con `Date.parse` y una fecha ilegible cuenta como 0 (el fondo de la lista) en vez
de propagar un `NaN`, que en un comparador da un orden distinto por motor.

---

## 5. E2.3 — el barrido ampliado, con la medición

**Antes de tocar el test** barrí `src/` con las mismas tres expresiones para saber cuántos rojos se
encendían. MEDIDO:

```
total files 203
(ninguna línea de infractor)
```

**Cero infractores preexistentes.** Por eso **no hay allowlist ni exclusiones**, y lo dejé escrito en
el JSDoc: abrir una lista vacía "por si acaso" es invitar a que la primera excepción entre sin motivo.
**No hay, por tanto, ninguna deuda de rojos fichados**: no se encendió ninguno.

El seguro anti-barrido-roto se amplió con un `it` nuevo que ancla **tres rutas que sólo existen fuera
del design system** (`features/dashboard/ui/DashboardView.tsx`,
`features/projects/ui/ProjectCard.tsx`, `app/(app)/page.tsx`). Sin él, la raíz se podía volver a
estrechar sin que nada avisara: el seguro viejo (>20 archivos + las cuatro capas) seguiría en verde.

El barrido pasa de **55** a **216** archivos (203 preexistentes + 13 fuentes nuevos de esta slice).

> **CORREGIDO EN RONDA 2.** Esta línea decía "de **54** a 216". Son **55**, y lo dice la salida que
> el propio informe pega en §6.3 (`expected 55 to be greater than 100`). El texto contradecía a su
> propia medición; el número bueno es el de la salida.

---

## 6. CONDICIÓN DOBLE de cada gate nuevo (REGLA 3) — salida real

### 6.1 E1.1 — el gate positivo del proxy

**Con el arreglo (`/` fuera de `PUBLIC_PAGES`):**
```
 Test Files  1 passed (1)
      Tests  14 passed (14)
```

**Quitando el arreglo (se vuelve a añadir `"/"` a `PUBLIC_PAGES`):**
```
 FAIL  src/proxy.test.ts > proxy > redirects the Dashboard to login when there is no session
AssertionError: expected 200 to be 307 // Object.is equality
 Test Files  1 failed (1)
      Tests  1 failed | 13 passed (14)
```

**Restaurado:** `14 passed (14)`.

> Nota deliberada: el test que **enumera** páginas públicas **no** cae en esa dirección. Es exactamente
> el motivo por el que el gate positivo era obligatorio.

### 6.2 E1.2 — un solo ovillo, en las dos direcciones

**Dirección A — el fondo global vuelve a montarse SIEMPRE** (`background={<AsciiYarn />}`):
```
     × no monta el fondo global en el Dashboard: el hero es el único ovillo
     × monta EXACTAMENTE un ovillo en '/', y es el hero interactivo
     × deja vacío el slot de fondo del caparazón en '/'
 Test Files  2 failed (2)
      Tests  3 failed | 12 passed (15)
```

**Dirección B — el fondo global NO se monta NUNCA** (`background={undefined}`):
```
     × hands the 3D layer to the shell as its background outside the Dashboard
     × mantiene el fondo global en cualquier otra ruta de (app)
 Test Files  2 failed (2)
      Tests  2 failed | 13 passed (15)
```

**Restaurado:** `15 passed (15)`.

### 6.3 E2.3 — el barrido ampliado, en las dos direcciones

**A1 — hardcode inyectado en `features/projects/ui/ProjectCard.tsx`, raíz `src/`:**
```
     × has no raw hex/rgb colors in features\projects\ui\ProjectCard.tsx
     × has no raw px sizes in features\projects\ui\ProjectCard.tsx
 Test Files  1 failed (1)
      Tests  2 failed | 434 passed (436)
```

**A2 — EL MISMO hardcode, con la raíz estrechada de nuevo a `src/shared/ui/`:**
```
     × encuentra los fuentes de src/
     × llega a las cuatro capas del design system
     × llega también a la UI de features y a las páginas
AssertionError: expected 55 to be greater than 100
AssertionError: expected [ …(55) ] to include 'shared\ui\primitives\button\button.va…'
AssertionError: expected [ …(55) ] to include 'features\dashboard\ui\DashboardView.t…'
 Test Files  1 failed (1)
      Tests  3 failed | 111 passed (114)
```

Esta corrida mide **las dos cosas a la vez**, y es la más valiosa del informe:
1. con la raíz vieja, **el hardcode inyectado NO enciende nada** (los dos `it` de `ProjectCard` ni
   siquiera existen) → la ampliación es lo que lo caza;
2. el seguro **nuevo** cae al estrechar la raíz → la ampliación no se puede deshacer en silencio.

**Restaurado:** `445 passed (445)` sobre los dos archivos.

### 6.4 E1.4 — las ramas de la comparativa

Quitando las dos ramas especiales de `formatComparison`:
```
     × uses a sentence of its own when the metric does not reach the reference
     × paints nothing at all when the metric is zero
     × paints nothing for a broken quotient
     × no pinta comparativa cuando la métrica vale cero
 Test Files  2 failed (2)
      Tests  4 failed | 38 passed (42)
```

### 6.5 E1.5 — la marca de total histórico

Quitando el bloque de la marca en `MetricsPanel.tsx`:
```
     × marca la tarjeta de metros como total histórico, y sólo ésa
 Test Files  1 failed (1)
      Tests  1 failed | 30 passed (31)
```

### 6.6 E2.2 — el orden por `updatedAt`

Cambiando el orden "reciente" para que mire `startDate` (que es lo que el backend ya devuelve, o sea
el error más probable):
```
     × puts the most recently touched project first
     × reads the timestamp out of the ISO string it really receives
     × sends an unreadable date to the bottom instead of poisoning the order
     × ordena por actividad reciente y lo dice sin mentir
 Test Files  2 failed | 1 passed (3)
      Tests  4 failed | 49 passed (53)
```

### 6.7 E2.1 — la card sin quick-start

Colando un `<button>Empezar a tejer</button>` en la card:
```
     × mounts no action control: the quick-start belongs to #20
 Test Files  1 failed (1)
      Tests  1 failed | 8 passed (9)
```

**Todas las mutaciones se revirtieron** y se verificó por `grep` que no quedó ninguna
(`times < 1` presente, `isLifetimeMetric(metricKey)` presente, `timestampOf(b.updatedAt)` presente,
cero `<button` en la card), más el `init.sh` final en verde.

---

## 7. REGLA 4 — medido contra un servidor real

Levanté el servidor y le pedí las rutas. **Todo lo de aquí es MEDIDO, no inferido.**

**Sin sesión, contra `pnpm start` (producción):**
```
=== GET / (sin sesion) ===
HTTP/1.1 307 Temporary Redirect
location: /login?next=%2F
=== GET /login ===
status=200
=== GET /proyectos (sin sesion) ===
HTTP/1.1 307 Temporary Redirect
location: /login?next=%2Fproyectos
```

**Con sesión** (servidor arrancado con un `JWT_SECRET` conocido y una cookie firmada con ese mismo
secreto): `GET /` → **200**, y sobre el HTML servido:

```
HOSTS de ovillo en el HTML servido: 1
   <div aria-hidden="true" data-slot="ascii-yarn" data-interactive="true" class="…pointer-events-auto">
--- entorno del slot bg-3d ---
<div aria-hidden="true" data-slot="bg-3d" class="pointer-events-none fixed inset-0 z-(--z-bg-3d)"></div>
```

Es decir: **un solo ovillo, es el hero, y el slot de fondo del caparazón está vacío**. E1.2 verificada
contra el render real, no sólo contra el doble. Las otras cuatro apariciones de la cadena
`ascii-yarn` en el HTML son la ruta del chunk diferido de la escena, no hosts.

Otros marcadores presentes en el HTML servido: `Knit&amp;Crochet`, `Tu taller`, `Proyectos en curso`,
`Nuevo dos agujas`, `Nuevo crochet`, `Ordenar por`, `Actividad reciente`, `Ver todos`,
`Cargando tu resumen` (el estado de carga es lo que se renderiza en servidor, porque los datos los pide
el cliente), `role="status"`.

`GET /login` → 200 con **un** ovillo, decorativo: no se rompió.
`grep -iE "error|warn|Unhandled|hydrat"` sobre el log del servidor: **sin resultados**.

### Aviso de método sobre esta medición (importa, y es sobre mí)

Mi **primera** tanda de sondas con sesión daba 307 y me llevó a sospechar de un fallo de entorno del
proxy. **Era mío**: extraje el `JWT_SECRET` de `.env` con una expresión regular y me quedé con un
prefijo, así que firmaba con un secreto que no era el del servidor. Además, un intento de comparar mi
lectura con el `dotenv` de Next me devolvió `24` contra `104` y **casi lo apunto como hallazgo**: el
`104` no era la longitud del secreto, era la longitud del **mensaje de error** de un `require` que
fallaba, capturado dentro de un `try` que devolvía la cadena `"ERR …"`. Lo cacé al comprobarlo, no
antes.

Lo dejo escrito porque es exactamente el patrón contra el que avisa el aviso de método de
`progress/current.md`: **un número que sale de una sonda mal montada parece una medición**. Al montar
la sonda con un secreto conocido en los dos lados —servidor y token—, la ruta respondió 200 a la
primera. **No hay ningún defecto de entorno del proxy que fichar.**

### Lo que NO pude medir contra el servidor

- **El fondo global en una ruta de `(app)` que no sea `/`, en navegador.** No existe todavía ninguna
  otra ruta de `(app)`: `/proyectos` es 404. Esa mitad está medida sólo con RTL (§6.2, dirección B).
  Es la familia de las deudas 26/51/53.
- **La pantalla con datos reales.** Las sondas se hicieron con una cookie firmada a mano; no creé un
  usuario ni datos en Neon, porque escribir en la base del proyecto no estaba en el encargo. Lo que se
  midió en servidor es el **estado de carga** renderizado en servidor, que es lo que corresponde.
- **Fidelidad visual.** Es revisión humana por contrato (`conventions.md`), y no la hice.

---

## 8. Decisiones no obvias que tomé (y que el reviewer debería mirar)

1. **Los datos se piden desde el navegador, no en el Server Component.** Motivo: los filtros cambian
   sin navegar, y el estado de carga con skeletons que pide RFC-02 §4 sólo existe si hay una carga que
   mostrar. **Zustand no está instalado** (verificado): estado con `useState`. El gate de "el caparazón
   no dispara ningún fetch al montar" **sigue intacto** — quien pide es la página, no `AppShellClient`.

2. **"Estar cargando" se DERIVA, no se guarda.** Es una comparación entre la clave de lo pedido
   (`año|tipo|token`) y la de lo que llegó. Nació de que `eslint` prohíbe `setState` síncrono dentro de
   un efecto, pero acabó siendo mejor: con un booleano hay que encenderlo en cada sitio que cambia un
   filtro, y un olvido deja la pantalla cargando para siempre. Además los datos **viejos** sobreviven al
   cambio de filtro, así que la pantalla no parpadea a vacío en cada tecla.

3. **`SECONDS_PER_MINUTE` en `shared/config`, y `MINUTES_PER_HOUR` derivado de los dos.** El dominio
   guarda segundos y la UI enseña horas y minutos. Poner el `60` suelto en un componente era
   exactamente lo que el docstring de `SECONDS_PER_HOUR` prohíbe. Los minutos por hora **no** se
   escriben: se derivan (`SECONDS_PER_HOUR / SECONDS_PER_MINUTE`), para que no puedan desincronizarse.

4. **`METRICS_YEAR_MIN`/`MAX` extraídos de `metricsFiltersSchema`.** Mismos valores, cero cambio de
   comportamiento. Sin esto la UI se inventaba su propio rango y dejaría pasar años que el endpoint
   contesta con 400. Hay **ancla** (un test con los literales `1970`/`9999`) y **derivación** (todo lo
   demás sale de las constantes), que es el patrón de la regla 2.

5. **La foto de la card es decorativa (`alt=""`).** El nombre del proyecto está justo debajo; un texto
   alternativo lo repetiría. El gate lo mide en los dos sitios: el atributo está vacío **y** no queda
   ningún rol de imagen que anunciar.

6. **`<img>` y no `next/image`.** Las URLs son de Cloudinary, o sea un host remoto arbitrario, y
   `next/image` exigiría declarar `images.remotePatterns` en `next.config.ts` — una decisión de la
   canalización de imágenes, no de una tarjeta. Está el motivo escrito y un `eslint-disable-next-line`
   acotado a esa línea. **`pnpm lint` queda sin warnings.**

7. **Los `Field` van dentro de una `Card`, y no es decoración.** `Field` pinta su etiqueta con el
   primer plano oscuro, que sobre el espresso del `body` sería ilegible; y la variante elevada es la
   única superficie donde el anillo de foco llega al contraste mínimo (deuda 31).

8. **El modal de creación valida con `createProjectSchema`, el mismo schema del endpoint.** Así el
   mensaje que ve el usuario antes de enviar es el que devolvería el servidor, en vez de una regla
   paralela que puede divergir.

9. **Los dos botones de creación se pintan UNA vez**, en la barra de filtros, y el estado vacío los
   referencia en vez de duplicarlos. Dos juegos de botones con el mismo nombre accesible harían
   ambiguo cualquier `getByRole` y, peor, duplicarían la acción en pantalla.

10. **Con ninguna métrica marcada se pinta un aviso**, no una pantalla muerta. Consideré impedir apagar
    la última, pero un `Toggle` que ignora un clic se lee como roto.

11. **El estado "vacío" excluye los metros** del cálculo, porque son lifetime: con ellos dentro, quien
    hubiera cargado una lana alguna vez no vería nunca el mensaje del año.

12. **Copié el `afterEach` de `Dialog.test.tsx`** (limpia y asierta el bloqueo de scroll) en
    `DashboardView.test.tsx`, que es el único test mío que abre el modal. Deuda 101 atendida en el
    consumidor.

---

## 9. Deuda técnica nueva que encontré

*(No la escribí en `progress/deudas.md`: ese libro lo lleva el leader. Aquí van las fichas propuestas.)*

1. **No hay primitivo de enlace en el design system, y ya van dos consumidores.** `LoginForm.tsx:29`
   define `LINK_CLASSES` a mano y `ActiveProjectsPanel.tsx` ha tenido que definir `SEE_ALL_CLASSES`,
   casi idéntico salvo el color del primer plano (uno vive sobre superficie clara y el otro sobre el
   fondo oscuro). Es el segundo consumidor: toca promoverlo a `shared/ui`. **Ojo con la regla de
   superficies** — el enlace tiene que heredar el primer plano, como la variante fantasma del botón.

2. **No hay primitivo de `select`, y ya hay uno en producción.** El control de orden usa un `<select>`
   nativo con `inputClasses`. Funciona (`inputClasses` se exportó justo para esto), pero el estado de
   error, el foco y la flecha del nativo no están cubiertos por ningún test del design system.

3. **El error del modal de alta es un `<p role="alert">` local**, no `AuthFormError`. Ese componente
   está en `features/auth/ui/` y `progress/current.md` ya lo señala como *"el `Alert` que el SDD §6
   lista como pendiente; candidato a promover con un segundo consumidor"*. **Ya hay segundo
   consumidor.** No lo promoví porque tocar el barrel de `shared/ui` hace caer `public-api.test.ts` y
   eso es una decisión de contrato, no de esta slice.

4. **"Ver todos" apunta a `/proyectos`, que hoy es un 404.** Igual que las seis pestañas del archivero
   desde #13. Se cierra con #20; lo apunto para que nadie lo lea como un defecto de #19.

5. **El año inicial se toma del reloj del cliente en el inicializador de `useState`.** En el render de
   servidor eso corre con el reloj del servidor. Si servidor y cliente estuvieran en años distintos
   (medianoche del 31 de diciembre a caballo de dos husos), React avisaría de una discrepancia de
   hidratación en el `value` del campo. **No lo medí** — es una ventana de minutos al año y evitarlo
   costaba enseñar la pantalla sin año en el primer render.

6. **`ProjectCardData` no obliga a nadie a mantenerse en el subconjunto.** Está definido como un `Pick`
   de `SerializedProject`, así que un `SerializedProject` entero encaja; nada impide que un día la card
   empiece a leer campos que no le tocan. Hoy sólo lo protege la disciplina.

7. **La utilidad de ocultación sólo-para-lectores que lleva la etiqueta del tiempo no está vigilada
   por ningún gate de tokens.** Es una utilidad del core de Tailwind, no un token, y el guardrail no
   la mira. Coherente con el precedente del ancho máximo de contenedor que usa `AuthPanel`, pero
   conviene saber que la frontera "escala de Tailwind sí / valor suelto no" es hoy disciplina, no
   test.

8. **Ningún gate obliga a que una ruta de `(app)` traiga su test de composición dentro del caparazón.**
   El gate de "un solo ovillo" existe para `/` porque yo lo escribí; `/proyectos` (#20) puede nacer sin
   él. Es hermana de la deuda 92 (nada obliga a traer el test de `axe`).

---

## 10. Qué NO hice, y por qué

- **No marqué la feature como `done`.** La cierra el reviewer.
- **No toqué `progress/deudas.md` ni `feature_list.json`.** Son del leader.
- **No arreglé ningún rojo de no-hardcode ajeno**: no había ninguno (MEDIDO, §5). Y **no abrí una
  allowlist vacía** por si acaso.
- **No promoví `AuthFormError` ni creé un primitivo de enlace o de `select`.** Los tres tocan el
  contrato público de `shared/ui` (`public-api.test.ts` con `toEqual`), que es una decisión de design
  system y no de una página. Fichados en §9.
- **No añadí Zustand.** No está instalado y añadirlo sería una decisión nueva.
- **No puse quick-start en la card, ni un slot preparado para él** (E2.1, explícito).
- **No fusioné `PUBLIC_PAGES` con `AUTH_PAGES`** (explícito).
- **No toqué `src/shared/ui/**`**, salvo `no-hardcode.test.ts` (lo que E2.3 encarga) y, en la ronda 2,
  el archivo de test nuevo `breakpoint-tokens.test.ts`. Ningún componente.
- **No hice el CRUD de proyectos**: el modal pide sólo nombre y tipo, que es lo que RFC-02 §6 permite.
  Foto, patrón, agujas y vueltas objetivo son de #22.
- **No validé fidelidad visual** contra el mockup: es revisión humana por contrato.
- **No creé datos en Neon** para la sonda contra servidor real (§7).

---

## 11. RONDA 2 — respuesta al review (`progress/reports/review_dashboard_ui.md`)

Veredicto recibido: **CAMBIOS REQUERIDOS, 1 bloqueante + 3 de higiene**. Los cuatro puntos están
cerrados. **Acepto el bloqueante entero, sin matices: la frase era falsa cuando la escribí**, y el
reviewer no sólo la desmintió leyendo — la desmintió **mutando** y corriendo la suite completa, que
es lo que la convierte en un hecho y no en una opinión.

### 11.1 B1 — resuelto por la **vía 1**: el test que faltaba, para los CUATRO pares

**Qué decía mi comentario** (`DashboardHero.tsx`) y mi informe §3: que la variante responsive de
tablet y el token `--bp-tablet` *"comparten valor, y un test de tokens los obliga a moverse juntos"*.
**Ese test no existía.** El único que ataba los dos namespaces era
`archive-nav.tokens.test.ts:257-262`, y es del par **`archive`**.

Es la peor clase de error que se puede cometer en este repo, y por eso no lo despacho en una línea:
**no era un bug —el código estaba bien— sino una afirmación sobre el arnés presentada como hecho
establecido**. Un bug lo caza un test; esto no lo caza nada, porque el siguiente agente lo lee y no lo
vuelve a medir. Y hay señal de cómo nació: el `it` del archivero existe y dice casi lo mismo **para su
propio par**; lo generalicé a los cuatro sin comprobarlo. Es el mismo mecanismo por el que el `(#13)`
de la deuda 1 se leyó como número de deuda.

**Archivo nuevo: `src/shared/ui/breakpoint-tokens.test.ts`** (6 tests). Va en `shared/ui/` y no en
`archive-nav/` porque el invariante es del design system entero, no de una pieza.

Tres decisiones de diseño del test, todas para que no repita el agujero que viene a tapar:

1. **Los pares se DESCUBREN, no se enumeran.** Se leen del propio `globals.css` los dos namespaces
   (`--bp-*` y `--breakpoint-*`) y se comparan como conjuntos. Una lista escrita a mano dejaría sin
   vigilar el quinto breakpoint el día que exista — que es exactamente el patrón de las deudas
   40/43/71 y lo que E2.3 acaba de corregir un piso más abajo.
2. **La comparación de conjuntos falla en las DOS direcciones**: sobra un alias sin token de lectura,
   o falta el alias de un token. Un `toContain` sólo detecta lo que falta.
3. **Seguro anti-descubrimiento-roto.** Una expresión que dejara de casar devolvería dos conjuntos
   vacíos, que son iguales entre sí y con cero comparaciones que hacer: **verde con el guardrail
   apagado**. Por eso hay un `it` que ancla el inventario de hoy a sus cuatro literales. Es el único
   sitio del archivo donde los nombres se escriben a mano, y ahí el literal **es** el inventario.

Cubrir los cuatro pares y no sólo el de tablet **salda de nacimiento la deuda 1 de la §7 del review**
("sólo un par está atado; los otros tres no").

### 11.2 Condición doble de B1 — salida real

**Los cuatro pares, uno a uno.** Mutación: mover el alias a 900px dejando su `--bp-*` como está.
`globals.css` restaurado desde copia byte a byte tras cada mutación, con `md5sum -c` al final:

```
9aa85707662c00471d8a315c9fff7bfc *src/app/globals.css
mutado: --breakpoint-mobile: 640px; -> --breakpoint-mobile: 900px;
     × --breakpoint-mobile vale lo mismo que --bp-mobile 6ms
      Tests  1 failed | 5 passed (6)
----
mutado: --breakpoint-tablet: 768px; -> --breakpoint-tablet: 900px;
     × --breakpoint-tablet vale lo mismo que --bp-tablet 5ms
      Tests  1 failed | 5 passed (6)
----
mutado: --breakpoint-desktop: 1180px; -> --breakpoint-desktop: 900px;
     × --breakpoint-desktop vale lo mismo que --bp-desktop 5ms
      Tests  1 failed | 5 passed (6)
----
mutado: --breakpoint-archive: 1180px; -> --breakpoint-archive: 900px;
     × --breakpoint-archive vale lo mismo que --bp-archive 6ms
      Tests  1 failed | 5 passed (6)
----
src/app/globals.css: OK
```

**Pertenencia, en las dos direcciones** (añadir un elemento Y quitar uno, que es lo que REGLA 3 pide
para un ancla de pertenencia):

```
=== M1: se AÑADE un --bp-* sin su alias ===
mutado: --bp-mobile: 640px; -> --bp-wide: 1440px;  --bp-mobile: 640px;
     × encuentra los cuatro anchos declarados hoy, en los dos namespaces
     × los dos namespaces declaran exactamente los mismos anchos
     × --breakpoint-wide vale lo mismo que --bp-wide
      Tests  3 failed | 4 passed (7)

=== M2: se QUITA un alias --breakpoint-* ===
mutado: --breakpoint-archive: 1180px; ->
     × encuentra los cuatro anchos declarados hoy, en los dos namespaces
     × los dos namespaces declaran exactamente los mismos anchos
     × --breakpoint-archive vale lo mismo que --bp-archive
      Tests  3 failed | 3 passed (6)
src/app/globals.css: OK
```

**Y la que de verdad cierra el bloqueante: la mutación EXACTA del reviewer, sobre la SUITE ENTERA.**
Él la corrió y le salió `1194 passed | 13 skipped`, **exit 0, cero rojos**. Ahora:

```
=== REPRODUCCION EXACTA DE LA MUTACION DEL REVIEWER, SUITE ENTERA ===
mutado: --breakpoint-tablet: 768px; -> --breakpoint-tablet: 900px;
VITEST_EXIT=1
     × --breakpoint-tablet vale lo mismo que --bp-tablet 5ms
 Test Files  1 failed | 68 passed | 3 skipped (72)
      Tests  1 failed | 1199 passed | 13 skipped (1213)
src/app/globals.css: OK
```

**De `exit 0` a `exit 1` con la misma mutación.** El agujero que el reviewer midió ya no existe.

**Restaurado y verificado:** `md5sum -c` devuelve `src/app/globals.css: OK` tras cada tanda, y el
hash (`9aa85707662c00471d8a315c9fff7bfc`) coincide con el que el reviewer anotó en su §2, así que el
archivo está byte a byte como antes de tocarlo.

### 11.3 El comentario, reescrito para que sea verificable

`DashboardHero.tsx` ya no dice "un test de tokens": **nombra el archivo**
(`src/shared/ui/breakpoint-tokens.test.ts`), separa explícitamente los dos tokens que intervienen
(cuál lee el hook en runtime y cuál genera la variante), describe el defecto concreto que se produce
si se desincronizan, y deja escrito **por qué el archivo existe** —que hasta #19 sólo estaba atado el
par `archive`— citando la medición del review. Una afirmación con su archivo al lado se comprueba en
diez segundos; la anterior había que creérsela.

### 11.4 Los tres de higiene

| # | Punto del review | Qué hice |
|---|---|---|
| 2 | El informe §3 (E1.3) repetía la afirmación falsa | Corregido, **con nota de qué decía antes y por qué era falso**, no borrado en silencio. |
| 3 | El informe §5 decía "de 54 a 216"; son **55** | Corregido a **55**, con nota de que su propia salida en §6.3 ya decía 55. |
| 4 | El informe §3 (E1.3) citaba una clase de Tailwind literal | Reescrito **en prosa**. Aproveché para hacer lo mismo en §9.7, que citaba otras dos utilidades reales: la excepción de `@source` es una defensa, no una licencia. |
| 5 | Faltaba el motivo del import por ruta interna en `NewProjectDialog.tsx:5` | Añadido: el barrel `@/features/projects` arrastra `./api` → store → Drizzle, y esto es un componente de cliente. Se cita el precedente de la misma excepción para `auth`, y se hace explícito que `validation.ts` sólo importa zod y `shared/config`. |

### 11.5 Observaciones menores del review §6 que NO toqué, y por qué

Las dejo declaradas para que el leader decida, en vez de arreglarlas por mi cuenta a estas alturas:

- **§6.4 (`getActiveProjects` recibe `year` y no lo usa)** y **§6.5 (el "vacío del año" exige además
  cero activos)**: las dos son correctas y las dos son **de comportamiento**, no de prosa. Cambiar la
  firma o el criterio de `isEmpty` en la ronda de arreglo del bloqueante mezclaría un cambio funcional
  sin revisar con un cierre. **Las asumo como deuda**, y son buenas capturas: la 4 explica por qué la
  5 se comporta así, y las dos se resuelven juntas cuando #20 traiga el filtrado real de proyectos.
- **§6.6 (`SEE_ALL_CLASSES` declarada después de usarse)** y **§6.7 (`ProjectPhoto` concatena en vez
  de usar `cn()`)**: notas de homogeneidad, sin efecto observable. Mismo criterio.
- **§6.8 y C2 (dos bloques "EN CURSO" en `current.md`)**: el segundo bloque lo añadí yo al cerrar la
  ronda 1, debajo del primero. Fundirlos es del carril del leader; no reescribo su archivo más allá de
  mi sección.
- **§7.2 y §7.3 (el `JWT_SECRET` local truncado por expansión de `@next/env`, y el 500 con un `sub`
  que no es UUID)**: **hallazgos del reviewer, no míos, y ninguno es de #19.** El primero explica —y
  mejora— lo que yo narré en mi §7: mi sonda no falló sólo porque recorté el valor con una expresión
  regular, sino porque el valor **se expande**, y el servidor usa 18 caracteres de los 24 escritos.
  Que quede su versión, que es la medida.

### 11.6 Verificación final de la ronda 2

`bash ./init.sh`, ejecutado **sin tubería** para que el código de salida sea el del script:

```
[OK]    lint verde
[OK]    typecheck verde

 Test Files  69 passed | 3 skipped (72)
      Tests  1200 passed | 13 skipped (1213)

[OK]    Entorno listo. Puedes empezar a trabajar.
EXIT=0
```

`pnpm build` OK. La feature sigue en **`in_progress`**.

Delta de la ronda 2: **+1 archivo de test, +6 tests** (1194 → 1200). **Ni una línea de producción
cambiada**: los dos cambios en `src/` que no son el test nuevo son **comentarios**.

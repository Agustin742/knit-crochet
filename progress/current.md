# Sesión actual

> Este archivo se vacía al cerrar cada sesión y se mueve a `history.md`.
> Mientras trabajas, **mantenlo actualizado en tiempo real**, no al final.

- **Feature en curso:** ninguna. **LA FASE DE BACKEND ESTÁ COMPLETA.** Siguiente pendiente por id =
  **#19 `dashboard_ui`**, que arranca el bloque de páginas y **trae CINCO decisiones que cerrar antes de
  empezar** (abajo).
- **Cerrado en esta sesión, en este orden — las CUATRO APROBADAS A LA PRIMERA, 0 bloqueantes:**
  1. **Deuda 59** — primera subida real a Cloudinary. **No es una feature.** Informe:
     `progress/informs/13.informe-deuda59-smoke_cloudinary.md`.
  2. **#16 `dashboard_comparison_3metrics`** → **`done`**. leader (cierra 2 decisiones con el usuario y
     escribe el **PRD §8.1**) → implementer → reviewer. Informe:
     `progress/informs/14.informe-dashboard_comparison_3metrics.md`.
  3. **#17 `projects_detail_yarns`** → **`done`**, y con ella **la deuda 5 SALDADA**. leader (cierra 2
     decisiones con el usuario y escribe el **PRD §9.1**) → implementer → reviewer. Informe:
     `progress/informs/15.informe-projects_detail_yarns.md`.
  4. **#18 `patterns_used_by`** → **`done`**. **Última slice de backend.** leader (cierra la decisión de
     forma con el usuario y escribe el **PRD §9.2**) → implementer → reviewer. Informe:
     `progress/informs/16.informe-patterns_used_by.md`.
- **Lo más valioso de #16 no fue el código, fue el método:** el test que protegía la conversión de unidades
  **pasaba en falso** (derivaba de la lista ya convertida, así que se movía *con* el bug). Lo destapó la
  **regla 3** al no verlo caer en rojo. El reviewer lo re-verificó por su cuenta en las dos direcciones del
  error, **sin tocar el árbol de trabajo** (copia al scratchpad + alias de módulo en un config alternativo de
  Vitest — técnica reutilizable para mutar sin ensuciar el repo). **Limitación medida:** no alcanza a lo que
  lee ficheros reales por `import.meta.url`.
- **Lo más valioso de #17, también método:** el implementer **no se conformó con el doble en memoria** y
  añadió `src/features/projects/api/store.test.ts`, que asierta el **SQL realmente emitido** por Drizzle. Es
  la lección de la **deuda 6** aplicada **antes** de que mordiera: las 5 columnas, el `WHERE` del scoping, el
  `ORDER BY` y el tipo de JOIN quedan fijados **sobre producción**, no sobre la réplica. **Copiá el patrón
  cuando toques el store.** Su precio está fichado como deuda **77**.
- **#18 MIDIÓ por qué ese patrón hace falta, y el número da miedo:** al borrar el filtro **de producción**, la
  suite entera quedó en **`2 failed | 600 passed | 13 skipped`**. Los 32 tests de ruta **siguieron verdes**,
  porque el **doble en memoria implementa el filtro por su cuenta** y sigue acotando aunque producción no lo
  haga. **Los únicos dos rojos fueron los del SQL emitido.** Es la **deuda 6 exacta, medida en vivo** y
  confirmada de forma independiente por el reviewer. → **REGLA 7** y deuda **81**.
- Última feature cerrada antes de hoy: **#15 `uploads_image`**, ya en `progress/history.md`. Informe:
  `progress/informs/12.informe-uploads_image.md`.

## Estado del proyecto

- **Fase 1 (PRD-01, features 1-11):** completa (`done`).
- **Fase 2 (UI, features 12-32):** en curso. **#12, #13, #14, #15, #16, #17, #18, #31 y #32 `done`**;
  siguiente pendiente por id = **#19 `dashboard_ui`**.
- **🎉 TODO EL BACKEND ESTÁ CERRADO.** Las features de datos/BFF (1-11) y las cuatro slices de backend de la
  fase 2 (**15, 16, 17, 18**) están `done`. **Lo que queda es UI**: #19-#30 más lo que quede de #20-#28.
- `bash ./init.sh` VERDE: **602 passed | 13 skipped** (**54** archivos + 3 skipped, que son los tres smokes:
  Neon, auth y Cloudinary). `pnpm build` OK. **Verificado ejecutándolo**: el leader al arrancar (547/11),
  antes de #17 (577/13) y antes de #18 (590/13); los reviewers al cerrar la deuda 59 (547/13), #16 (577/13),
  #17 (590/13) y #18 (602/13).
- **Git: #15 ESTÁ COMMITEADO** en `83ab95a feat: add upload image`, y el árbol arrancó la sesión **limpio**.
  La nota anterior que decía "todo #15 está sin commitear" **estaba desactualizada y queda corregida**
  (lo corrigió el usuario; verificado por el leader con `git status` + `git log`). **Sin commitear:** la
  **deuda 59** (`src/__smoke__/`, 2 líneas de `src/shared/lib/cloudinary/`), **#16** (`src/shared/config/`,
  `src/features/dashboard/`) y **#17** (`src/features/projects/`). **Ya están commiteados los tres** por el
  usuario en `0351c4d` (#16) y `2cbfa00` (#17); la nota anterior que hablaba de "cuatro commits pendientes"
  **quedó desactualizada y se corrige aquí**. **Sin commitear queda SÓLO #18** (`src/features/projects/`
  —validación, tipos, store, doble, tests—, `src/app/api/projects/`, el smoke de Neon) más el PRD, el
  RFC-05, `feature_list.json` y `progress/`. Es **un único commit coherente**.
- **La app ya acepta fotos**, aunque todavía no haya formulario que las mande: la puerta existe y está
  probada.

## Decisiones cerradas por el usuario (no se reabren)

- **Contrato de `POST /api/uploads/image` (PRD §11.9):** lista blanca `image/jpeg`, `image/png`,
  `image/webp` (**lo no enumerado se rechaza**); tope **4 MB**; **ambas comprobaciones ANTES** de llamar a
  Cloudinary; **`publicId` único por subida**, `folder` determinista por `userId`.
- **El tope de 4 MB está ATADO A LA PLATAFORMA, no elegido al gusto.** Se cerró primero en 5 MB y **no
  cabía**: Vercel limita el cuerpo de petición a **4,5 MB a nivel de infraestructura** (no configurable
  desde `vercel.json` ni desde el código) y devuelve un **413 `FUNCTION_PAYLOAD_TOO_LARGE`** *antes de que
  el handler exista*. **Quien quiera subir este tope tiene que resolver antes el límite de la plataforma**
  (subida directa navegador→Cloudinary con firma). Está en el PRD **y en el docstring de la constante**,
  que es donde lo va a leer quien lo intente.
- **Tamaño de etiqueta del archivero: 18px** (`--text-nav-tab`), y con él `--bp-archive: 1180px`. Ese token
  **determina a partir de qué ancho existe el archivero**. Los dos están atados por un test que obliga a
  moverlos juntos.
- **El menú de cuenta vive en una banda propia del `AppShell`, fuera del elemento `nav`** (enmienda E11 del
  RFC-01), rige en **todos** los anchos y **no toca `BottomNav`**. `--bp-archive` sigue en 1180px.
- **Para el envío de los formularios de auth se compró el arreglo mínimo** (declarar POST), no la Server
  Action. El resto es la **deuda 39**.
- **Comparativas del Dashboard para las 3 métricas (PRD §8.1, feature #16):** `comparison` es un **mapa**
  `{ hours, projects, yarnMeters }` y cada entrada es `{ label, referenceValue, times }`. **`referenceMeters`
  ya no existe** — el cambio de forma es **breaking a propósito**, y se hizo ahora porque **no lo consume
  nadie** (#19 está `pending`). `referenceValue` viaja en la **unidad de su métrica** (segundos / unidades /
  metros) para que `times` sea un cociente puro. Las **semillas de horas y proyectos** están en la tabla del
  PRD §8.1; las tres listas viven en `src/shared/config`.
- **Lanas en el detalle de proyecto (PRD §9.1, feature #17):** `GET /api/projects/:id` responde
  **`{ project, yarns }`** — clave **hermana**, no anidada, así que **`project` queda byte a byte como estaba**
  y sigue siendo un `ProjectRecord`. Cada lana lleva **exactamente cinco campos planos**
  `{ id, colorName, colorFamily, brandName, typeName }`; **`colorCode` e `image` se descartaron a propósito**
  (el RFC no los pide; añadir después es aditivo y barato, quitar no). Sin enlaces, `yarns` es **`[]`**, nunca
  `null` ni ausente. **`GET /api/projects` (la lista) NO las lleva.**
- **"Usado en proyectos" de un patrón (PRD §9.2, feature #18):** se expone como **filtro**,
  `GET /api/projects?patternId=<id>`. **`GET /api/patterns/:id` NO cambia.** Se descartó `usedBy` porque
  invertiría la dirección del grafo de FKs (`projects.patternId → patterns`), que `architecture.md` §S1
  obliga a tratar como **DAG** —es la forma exacta que esa regla salió a prohibir tras el ciclo de #7— y
  porque `?yarnId=` ya contesta la pregunta idéntica para lanas. **Precio aceptado:** el drawer del patrón
  hace **dos peticiones**. **Corolario vigente: `src/features/patterns/` no consulta `projects`.**

## ⚠️ REGLAS vigentes para todos los agentes

**1. Nunca escribas una clase de Tailwind con comodines o inventada** en código, tests, informes, docs o
comentarios. Citá una clase real o describila en prosa. Un informe de #13 escribió una clase con un asterisco
como abreviatura; Tailwind v4 la tomó por real, generó CSS inválido y **tumbó la app entera con 500 en todas
las rutas**. Hay guardrail (`@source not` en `globals.css` + test en `src/app/globals-css.test.ts`), pero la
higiene sigue valiendo. Detalle: `progress/informs/6.informe-bugfix-tailwind_source_guardrail.md`.

**2. El par que un test mide se DERIVA del código, no se elige a mano** — **pero un valor de contrato
necesita ADEMÁS su ancla.** #15 destapó la **forma espejo** de esta regla y conviene leerla entera. El
patrón correcto tiene **dos piezas**: **(a)** *un* test que ancla la constante al literal del contrato —el
único sitio donde escribir el número a mano se justifica, porque **ahí el literal ES el contrato**— y **(b)**
todos los tests de comportamiento **derivando** de la constante. En #15 estaba (b) impecable y faltaba (a):
*"acepta `MAX` y rechaza `MAX+1`"* sigue en verde **sea cual sea `MAX`**, así que se podía decuplicar el tope
y abrir la lista blanca a SVG y PDF con **27/27 verde**. Al arreglarlo, **no conviertas (b) a literales**:
eso crea la deuda 18/22/23 de cero. Familia: deudas 18, 22, 23, 33, 40, 43.

**3. CONDICIÓN DOBLE en todo gate nuevo.** Tiene que verse **caer en rojo** al quitar el arreglo y pasar en
verde al restaurarlo, ejecutado en las dos direcciones, **con la salida real pegada y los números tal cual
salgan** (en #31 un informe declaró 9 rojos donde salían 12). **Para un ancla de pertenencia, "las dos
direcciones" significa añadir un elemento Y quitar uno**: un `toContain` pasa la segunda y falla la primera,
porque no detecta lo que *sobra*.

**4. Para lo que se sirve al navegador, medí contra un servidor real.** Los dos defectos más serios de #31
—la pantalla de login vacía y las credenciales viajando por la URL— **no los vio ningún test**: aparecieron
levantando `pnpm start` y mirando la respuesta.

**5. NUEVA (#15) — un valor de contrato se contrasta contra la PLATAFORMA antes de anclarlo en un test.**
El defecto más serio de #15 **no estaba en el código: estaba en el contrato**, y por eso **ningún test podía
encontrarlo** — los tests miden el código contra el contrato, y lo que fallaba era el contrato contra Vercel.
Había un test en verde certificando un caso que en producción falla **siempre**. Lo encontró un reviewer que
fue a comprobar un valor ya cerrado contra el entorno real de despliegue. **Si el número tiene un límite
externo (plataforma, proveedor, navegador), atalo con un test que lo exprese**, como hizo #15 con
`VERCEL_REQUEST_BODY_LIMIT_BYTES`: convierte una ficha de deuda en un invariante ejecutable.

**6. Los subagentes `Explore` son de SOLO LECTURA: no pueden escribir su informe.** Para la regla
anti-teléfono-descompuesto de `CLAUDE.md`, usá **`general-purpose`**, o asumí el volcado desde el leader.

**7. NUEVA (#18) — UN GATE QUE SÓLO CORRE SOBRE EL DOBLE NO MIDE PRODUCCIÓN.** Es la regla 3 llevada un paso
más allá, y esta vez está **medida, no argumentada**. En #18 se borró un filtro **del código de producción** y
la suite entera quedó en **`2 failed | 600 passed | 13 skipped`**: los **32 tests de ruta siguieron verdes**,
porque el **doble en memoria implementa el filtro por su cuenta** y sigue acotando aunque producción haya
dejado de hacerlo. Los únicos rojos fueron los del **SQL realmente emitido** (`store.test.ts`, patrón que
introdujo #17). **Es la deuda 6 exacta.**
**Qué hacer:** cuando toques el store, **anclá el SQL emitido**, no sólo el comportamiento del doble. El
andamio (`recordListQuery`) **ya está escrito** — cuesta unas líneas. Hoy el ancla cubre **2 de los 7 filtros**
de `list`, y los tres que faltan (`@>` de jsonb, `exists` correlacionado, rango de fechas) son **justo los que
el doble traduce peor**: deuda **81**.
**Corolario:** *"los tests pasan"* no es lo mismo que *"el código funciona"* cuando el sujeto de la frase es
una réplica escrita a mano. Familia: deudas **6**, **73**, **81**, **82**.

## PRÓXIMA — feature #19 `dashboard_ui` (⚠️ NO ARRANCAR SIN CERRAR CINCO DECISIONES)

**Cambia el modo de trabajo: se acabó el backend, empieza la UI.** A partir de aquí **SÍ aplica el checklist
visual del SDD §9** (RTL + axe + smoke + `init.sh` + `build`), que las cuatro últimas slices no usaron.

La página Dashboard: hero con el ovillo + selector de métrica conmutable **y superponible** (horas/proyectos/
metros, default horas) + las comparativas de las 3 + filtros de año y tipo + lista de activos con orden y
"ver todos" + modal de creación con el tipo preseleccionado. Página en `src/app/(app)/page.tsx`, UI en
`src/features/dashboard/ui/`, **reusando la card de proyecto de RFC-03**. Fuente: **RFC-02** entero.

**⚠️ ANTES de #19 `dashboard_ui` hay que cerrar CINCO decisiones, no tres.** Las tres viejas de su ficha —la
protección de `/` (deudas 1/13), si el hero del Dashboard reemplaza el ovillo de fondo o monta una segunda
instancia, y la a11y del modo interactivo— **más dos que dejó #16 y que esa slice va a chocar de frente**:
la **deuda 66** (el payload no marca que la comparativa de metros es lifetime: el usuario cambiará el año,
verá moverse dos comparativas y quedarse una, y va a parecer un bug) y la **deuda 69** (nadie decidió cómo se
lee un `times` menor que 1: *"0,41 colectivos"*, y con cero *"0 partidos de fútbol"* — falta redondeo, plural
y texto del caso vacío). **Las pide el reviewer de #16 y el leader lo suscribe: cerralas antes, no durante.**

## Notas para consumidores del design system (acumulado #12-#16, #31, #32)

- **⚠️ CONTRATO DE `GET /api/dashboard/metrics` (#16) — leelo antes de escribir #19.** `comparison` **ya no
  es un objeto suelto**: es un **mapa** `{ hours, projects, yarnMeters }` y cada entrada es
  `{ label, referenceValue, times }`. **`referenceMeters` no existe.** `referenceValue` viaja en la **unidad
  de su métrica**: **segundos** para `hours` (¡no horas!), unidades para `projects`, metros para
  `yarnMeters`. `times` es un **cociente puro** y **puede ser menor que 1, o exactamente 0** — cómo se
  redondea y se pluraliza **no está decidido** (deuda 69). Y `comparison.yarnMeters` **no se mueve** con
  `year`/`type`, porque metros es lifetime (deuda 66).

- **Layout listo:** `src/shared/ui/layout/` (AppShell, **AccountBand**, ArchiveNav, BottomNav) — presentación
  pura. `AppShell` acepta `user`/`onLogout` y **son reales**. `ArchiveNav` **ya no las declara**.
- **`AccountBand` (#32):** nombre + botón "Salir", **en el flujo** y **antes** del `header` del archivero,
  fuera del elemento `nav`, **sin variante responsive**. **No monta nada si falta el usuario O el callback**.
  Su gate asegura **que siga en el flujo**. **Ojo: sólo mira las clases propias de la banda, así que se la
  puede superponer desde fuera vía `className` o un contenedor posicionado → deuda 52.**
- **El usuario se resuelve en el SERVIDOR**, no en cliente: `getSessionUser()` en el layout de `(app)`. Por
  eso el gate *"montar el caparazón no dispara ningún fetch de cliente"* **sigue siendo verdad**. Si añadís
  datos al caparazón, **hacelo por el mismo camino** o romperás ese invariante. Precio fichado: deuda 50.
- **⚠️ CONTRATO DE SUBIDA DE IMAGEN (#15) — leelo antes de cablear la foto en #22, #25 o #28.** Son tres
  slices en tres sesiones distintas y cada una lo cableará por su cuenta; **la primera que asuma un 200 se
  romperá**, y lo hará en el navegador y no en un test, porque el mock lo escribe quien escribe el consumidor.
  - **Éxito: `201`** (no 200), con `{ url }`. Es **un endpoint único y compartido**, no uno por entidad.
  - El campo del formulario se llama **`file`**, y es el **único** que se lee.
  - Errores `{ error }`: **400** (ausente, vacío, formato no admitido o más de 4 MB), **401** (sin sesión),
    **502** (falló Cloudinary), **500** (falta configuración).
  - **No mandes `folder` ni `publicId`:** se ignoran **a propósito** (deuda 3). Los deriva el servidor del
    JWT. Nada del body puede influir en la ruta de destino.
  - El mensaje de error del tamaño **deriva** de la constante, así que la cifra que ve el usuario no puede
    desincronizarse del tope real.
  - **Ya está MEDIDO contra la cuenta real de Cloudinary** (deuda 59 saldada, 2026-08-05): la firma se acepta
    y la URL devuelta sirve la imagen. Antes esto era una suposición apoyada en `fetch` mockeado. Para
    reproducirlo: `SMOKE_CLOUDINARY=1 pnpm vitest run src/__smoke__/cloudinary.smoke.test.ts`. **Lo que
    sigue SIN medir es tu mitad:** que la cookie del navegador llegue al endpoint en una petición real
    (deuda **64**) — el primer formulario que cablee la foto es quien lo va a descubrir.
- **Piezas de auth reutilizables** (`src/features/auth/ui/`): `AuthPanel`, `AuthFormError` (**es el `Alert`
  que el SDD §6 lista como pendiente**; candidato a promover a `shared/ui` con un segundo consumidor),
  `focus-first-invalid.ts`, `next-path.ts` (**guarda de seguridad: todo redirect construido desde un valor de
  URL pasa por aquí**) y `field-errors.ts`.
- **Regla de superficies:** *una superficie que elige su fondo elige también su primer plano*. La variante
  fantasma de `Button` **hereda** el color del contexto. `Card` ya lo hace bien.
- **Trampas de formulario ya pagadas, no las repitas:** `Button` es `type="button"` por defecto (pasá
  `type="submit"`); **todo formulario debe declarar su método** (si no envía por GET y filtra lo que lleve
  nombre — deudas 39 y 43); `Field` **no anuncia errores tardíos**, hay que mover el foco al campo; montá
  formularios sobre la variante elevada de `Card`, la única superficie donde el anillo de foco cumple
  contraste (deuda 31).
- **Semántica de errores de auth (contraintuitiva a propósito):** el login devuelve **el mismo mensaje** para
  email inexistente y password errónea → se pinta **a nivel de formulario, nunca en el campo email**. El alta
  devuelve un código propio para email duplicado **sin decir qué campo**.
- **Capa 3D lista:** `<AsciiYarn />` en `src/shared/ui/three/`. Props: `interactive?`, `glow?`, `cols`/`rows`
  (default 96×44) y `className`. Siempre `aria-hidden`. Por debajo del breakpoint de tablet **no se monta**.
- **`AsciiYarnScene.tsx` y `createYarnScene.ts` son los únicos archivos que pueden importar `three`.**
- **Activa por ruta:** `isRouteActive` + `usePathname` (exacto para `/`, prefijo para subrutas).
- **Responsive token-first:** variantes `tablet:`/`mobile:`/`desktop:`. Para gates que deban **desmontar**,
  leer `--bp-*` con `matchMedia` como `useViewportSupports3d`.
- **Cero hardcode** enforced por `no-hardcode.test.ts`. Tests de UI: `// @vitest-environment happy-dom` +
  mockear `next/navigation` y `fetch`. **Asertá sobre la salida real de `cn()`, no sobre el string crudo de
  `cva`.**
- **No importes desde el barrel `@/features/auth`** en cliente: arrastra Drizzle. Importá por ruta directa.
- **Para cuerpos `multipart` usá `readFormData`** de `@/shared/lib/http` (hermana de `readJsonBody`, #15).
- Gotcha vigente: no usar la secuencia de cierre de comentario dentro de `bg-*/text-*` en `globals.css`.

## Deuda técnica acumulada

> Vive en **`progress/deudas.md`** — libro mayor, **no se vacía nunca**. Hoy: **85 fichas**; saldadas y
> tachadas 1, 2, 4, 8, 13, 17, 19, 21, 29, 30, 32, 36, 37, 38, 46, la **3** y la **55** (por #15), la **59**
> y —por **#17**— la **5**. La **45** está **recalificada** (de deuda de datos a deuda de presentación), no
> saldada. Nuevas del saldo de la 59: **63-65**. Nuevas de **#16**: **66-71**. Nuevas de **#17**: **72-79**.
> Nuevas de **#18**: **80-85**.
>
> **De #18, la más valiosa es la 81, y hay que leerla con el recuadro que la precede en `deudas.md`:** el
> ancla de SQL emitido cubre hoy **2 de los 7 filtros** de `list`, y los tres que faltan (`@>` de jsonb,
> `exists` correlacionado, rango de fechas) son **justo los que el doble traduce peor**. Ya sabemos qué pasa
> sin ancla: **600 tests en verde con el filtro borrado de producción** (→ **REGLA 7**). **Arreglo ~30
> líneas** con el andamio ya escrito.
>
> **La 83 merece mirada:** `createProject`/`updateProject` **no comprueban que `patternId` sea del usuario**
> (enlazar una lana sí). **No es agujero de lectura** —el reviewer buscó camino de fuga y no lo hay— pero sí
> **del modelo**: se puede grabar una referencia a un patrón que no se puede leer, y al borrarse ese patrón
> ajeno el proyecto **cambia solo**. **Preexistente de #5/#10.** Hermana de la **78**. Arreglo: un
> `assert-pattern-ref.ts` calcado del de lanas.
>
> **Las otras de #18:** **80** (el filtro no distingue *sin uso* / *no existe* / *ajeno* — los tres dan `[]`;
> es **coherente a propósito** con `?yarnId=` y esa ambigüedad **es la mitad buena de la seguridad**, pero el
> drawer dirá "no se usa" de un patrón borrado → decisión de producto para **#26**), **82** (la 73 queda
> adelantada **sólo** para este filtro), **84** (la línea del PRD que enumera los filtros no está anclada por
> ningún test) y **85** (un parámetro de query mal escrito devuelve **todos** los proyectos, no un 400).
>
> **De #17, la que más merece atención (lo dice el reviewer): la 73** — *la corrida hermética nunca ejecuta
> el JOIN contra Postgres*. El test del SQL comprueba la consulta **emitida** (resuelve con cero filas) y el
> doble comprueba el **comportamiento**; que ese SQL **devuelva filas** sólo se verifica en el smoke de Neon,
> apagado por defecto. **Mismo patrón que destapó la deuda 6.** Hermana de la **59** y la **64**: familia de
> la **regla 4**.
>
> **Dos de #17 hay que decidirlas juntas y ANTES de #21** (son la misma pregunta desde dos verbos): la **74**
> (hay **dos formas** de "las lanas de un proyecto" en el mismo recurso — el `GET` da objetos, enlazar da
> sólo ids; la tab Lanas o re-fetchea todo o mantiene dos representaciones) y la **79** (`PATCH :id` devuelve
> `{ project }` **sin** `yarns`, así que tras editar la UI se queda sin lanas).
>
> **Las otras de #17:** **72** (el orden lo deciden **dos criterios distintos** —colación de Postgres vs
> *code point* de JS— y el verde no prueba que coincidan con acentos o mayúsculas), **75** (el doble aplana
> los catálogos), **76** (asimetría de scoping dentro del store: el método nuevo lleva dueño, el viejo no),
> **77** (el truco del SQL emitido depende de internos de Drizzle) y **78** (el JOIN a catálogos no filtra
> por `userId`: hoy lo tapa una invariante de **escritura**, no de lectura; **el arreglo es un `AND`**).
>
> **De #16, las dos que hay que cerrar ANTES de #19** (lo pide el reviewer y el leader lo suscribe): la
> **66** (el payload no marca que la comparativa de metros es lifetime → el usuario verá moverse dos
> comparativas y quedarse una, y parecerá un bug) y la **69** (`times` menor que 1 sin redondeo, plural ni
> texto del caso vacío decididos). Las otras: **67** (el guardrail no distingue comentario de código),
> **68** (nada obliga *por tipos* a que una métrica nueva traiga su comparativa; hoy sólo lo protege un
> test), **70** (higiene, prioridad baja).
>
> **La 71 merece leerse aparte: es la CUARTA aparición del mismo patrón.** El guardrail de no-hardcode del
> dashboard funciona **nombrando dos archivos a mano**, como el de la **43**, que ya era la tercera de la
> **40**. Y aquí es **peor**: allí la lista fija cubría el 100% de los archivos de su clase; aquí **no
> cubre** `store.ts` ni `index.ts` ni el doble en memoria, que ya existen en la misma capa. Hoy no hay nada
> abierto (verificado), pero un archivo nuevo se le escapa con los 577 tests en verde. **Misma medicina que
> la 40 y la 43 — tapalas juntas.**
>
> **La 59 quedó SALDADA (2026-08-05) y sin sorpresa:** existe `src/__smoke__/cloudinary.smoke.test.ts`
> (flag propio `SMOKE_CLOUDINARY`) que subió un PNG real a la cuenta real por la cadena completa → **201**,
> y el `GET` de la URL devolvió la imagen. **La firma de `buildUploadSignature` funcionó a la primera y la
> respuesta real sí trae `secure_url`.** A diferencia de su hermana la deuda 6, **no destapó ningún bug de
> producción**. La **58** queda **matizada**: el rechazo real de Cloudinary se midió **una vez, a ojo**, no
> lo guarda un `expect` — ver la **63**.
>
> **Las tres nuevas, en una línea cada una:** la **63** dice que el caso 2 de ese smoke es un embudo (pasa
> aunque la petición nunca llegue a Cloudinary; **con la firma rota siguió verde**); la **64**, que nadie
> mide todavía *cookie del navegador → `userId`* en una ruta privada (se cierra con #22/#25/#28); la **65**,
> que cada corrida deja una carpeta vacía en la cuenta real (hoy limpiadas a mano, cuenta en `total_count 0`).
>
> **Tres que sólo se cierran con una pantalla delante, y conviene mirarlas juntas:** la **26** (la escalera
> del archivero en las 6 rutas), la **51** (la banda con una sesión real) y la **53**. Hoy son imposibles:
> sólo existe la ruta `/`.
>
> **TRES que conviene taparse juntas:** la **40**, la **43** y —desde #16— la **71** piden la misma medicina
> (barrido por recorrido de directorios en vez de lista fija). La **71** es la **cuarta** aparición.
>
> **Dos caveats honestos de #31:** la deuda **39** pide verificarse **con el JavaScript desactivado**; y la
> **41** está **razonada pero no medida con un lector de pantalla real**.
>
> **De #15 quedan vivas**: **56** (el cuerpo se carga entero en memoria antes de mirar el
> tamaño; muy mitigada por el corte de Vercel), **57** (rama redundante que ningún test distingue), **58**
> (se confía en el `Content-Type` declarado, no se miran los *magic bytes*), **60** (el contrato de respuesta
> no está donde lo vean sus tres consumidores — mitigado por el bloque de arriba), **61** (las imágenes
> reemplazadas quedan huérfanas para siempre) y **62** (sin límite de frecuencia ni volumen por usuario).
>
> **No copies deudas de vuelta aquí.** Si una tarea toca una, citála por número.

## Pendiente operativo (no bloquea)

- **#15 ya está commiteado** (`83ab95a`). Lo único sin commitear es el saldo de la **deuda 59**:
  `src/__smoke__/cloudinary.smoke.test.ts`, `src/__smoke__/env.ts`, las 2 líneas de
  `src/shared/lib/cloudinary/`, los 2 smokes de Neon refactorizados y `progress/`. Es **un único commit
  coherente**.
- El destrackeo de `tsconfig.tsbuildinfo` dejó una **eliminación preparada en el índice** de git: entra en el
  próximo commit. El archivo sigue en disco.
- **`next-env.d.ts` aparece modificado y NO es trabajo de nadie:** lo regenera `pnpm build` (reescribe su
  import de `./.next/dev/types/routes.d.ts` a `./.next/types/routes.d.ts`) y `pnpm dev` lo revierte. **No lo
  comitees a ciegas.**

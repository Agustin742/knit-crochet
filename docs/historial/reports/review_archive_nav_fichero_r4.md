# Review (4ª pasada) — `ArchiveNav`, contrato D4 completo con E1–E10

**Feature:** #13 `ui_shell_nav` (CORRECCIÓN — sigue `done`; **`feature_list.json` no se tocó**,
verificado sobre `git diff feature_list.json`: los dos únicos hunks son de #14 y #19, de sesiones
anteriores).

**Veredicto: APROBADO.**

Releí `docs/design/rfc/RFC-01-shell.md` §3 entero antes de mirar código: D4 con sus 10 invariantes ya
enmendados y las **tres** tablas de enmiendas. Revalidé contra el texto vigente, no contra enmiendas
derogadas: **E10 deroga E1** (así que el reordenado vertical del cajón y los 5 cantos son *contrato*,
no regresión) y **E8 endurece E5** (así que el canto inerte es contrato y la coletilla de E5 que
permitía "más, si se quiere, el canto de 10px" está caída). No reporto nada de eso como defecto.

Los 10 invariantes de D4 se cumplen. `bash ./init.sh` **verde, corrido por mí**: exit code 0,
**420 passed | 6 skipped** (40 archivos passed | 1 skipped) — exactamente lo que declara el implementer.

Quedan **7 hallazgos, ninguno bloqueante**: uno es un defecto real y presente (H1, la API que miente
con coste medible en red), tres son **gates que no gatean lo que dicen gatear** (H2, H3, H4) y tres son
deriva de contrato / afirmaciones no verificadas (H5, H6, H7). Ninguno viola D4 **hoy**; H2 y H3 son
los que romperán el layout en silencio al próximo toque de tipografía, así que son los que pediría
tapar con algo de énfasis.

Los cinco juicios que pidió el leader están respondidos en la §4, con su respuesta corta al principio
de cada uno.

---

## 1. Verificación propia

```
── 4. Verificación estática y tests (Node) ─────────────
[OK]    lint verde
[OK]    typecheck verde
$ vitest run "--silent"

 RUN  v4.1.10 C:/_dev/projects/knit-crochet

 Test Files  40 passed | 1 skipped (41)
      Tests  420 passed | 6 skipped (426)
   Start at  00:54:07
   Duration  39.79s

[OK]    tests verdes

── 5. Resumen ──────────────────────────────────────────
[OK]    Entorno listo. Puedes empezar a trabajar.
```

No repetí la validación en navegador del leader salvo donde dudo, y ahí lo digo (**H7**).

## 2. Los 10 invariantes de D4, uno por uno

Todo esto es **verificado leyendo código y tokens**, no aceptado del informe.

| Inv. | Estado | Dónde lo comprobé |
|---|---|---|
| 1 — contenedor en columna | ✅ | `ArchiveNav.tsx:113` — el `nav` es una columna invertida; una hoja por ítem. |
| 2 — hojas full-bleed | ✅ | `nav` a `inset-x-0`; hoja al ancho completo (`archive-nav.variants.ts:38`); el canto es un `span` en display de bloque sin ancho propio, o sea el 100% de su hoja (`:70`). Nadie recorta las hojas para esquivar el wordmark. |
| 3 — canto de alto fijo por token, **5** dibujados | ✅ (con deriva de *texto* del RFC: **H5**) | El alto de ranura lo lleva la base de `leafVariants` (las seis), y el canto sólo se monta si la hoja no es la abierta (`ArchiveNav.tsx:132-138`). Test que cuenta 5 superficies: `layout.test.tsx:314`. Test que exige que ninguna hoja pierda su ranura: `:327-330`. |
| 4 — escalonado por apilamiento | ✅ | Cero `margin-top` por ítem: la escalera sale de 6 ranuras de 10px apiladas y de que cada carril se ancla al borde inferior de **su** hoja (`:90`). |
| 5 — profundidad invertida + activa al fondo + **columna fija por índice de lista** | ✅ | `navLeafDepth(index, openIndex)` (`:192-200`) y `navTabColumn(index)` (`:181-183`). La columna **sólo** recibe el índice de la lista: la firma hace imposible que dependa de la ruta. Rampa `--z-nav-leaf-1..6` = 6..1, o sea ranura 1 = fondo = pinta encima. |
| 6 — la pestaña cuelga del canto, con lockup | ✅ | Carril al borde inferior de la hoja, pestaña de 44px que desborda hacia arriba; prefijo en serif itálica `aria-hidden` + etiqueta en sans mayúscula (`ArchiveNav.tsx:151-161`). |
| 7 — x crecientes, sin solape, 6 etiquetas enteras desde `--bp-archive` | ✅ (gate débil: **H4**) | Rejilla de 6 columnas derivada de `navTrackColumns()`; cero offsets a mano. La pestaña no puede desbordar su columna (ancho máximo al 100% + recorte con elipsis en la etiqueta). |
| 8 — hover = sube **sólo la pestaña**, el canto no cambia, nada hace reflow, atada a su hoja (E9) | ✅ | El canto no lleva ninguna variante de hover (test `layout.test.tsx:277-283`). El lift es **crecimiento de alto con la base clavada** (`:135`), no desplazamiento (test `:303` prohíbe la utilidad de traslación). Verifiqué que el crecimiento **no** puede propagar reflow: el carril es absoluto dentro de una hoja de alto fijo, así que el alto del stack, el techo del cajón y `main` no se mueven. |
| 8-bis — el puntero lo captura la pestaña y **sólo** la pestaña (E8) | ✅ | Hoja y carril bloquean el puntero, la pestaña lo rehabilita (`:38`, `:90`, `:130`). La hoja es un `div`, no un `<a>`; cada hoja contiene exactamente un enlace y ese enlace es su pestaña (test `:238-248`). El anillo de foco vive en el propio enlace, no en un grupo. |
| 9 — profundidad por sombra hacia arriba + filo de 1px, sin escalón tonal | ✅ | `--shadow-nav-leaf` con desplazamiento vertical negativo (test `:131-137`); filo como sombra interior superior. Las 5 caras comparten `--nav-leaf-face`: cero escalón tonal. Los tres contrastes se miden de verdad (1.5 / 2.5 / 1.5) y hay un test que deja constancia de que una sombra negra sola techa por debajo de 1.5:1. |
| 10 — la activa es la hoja ABIERTA: sin canto, al fondo, acento + tono de página + `aria-current`, misma columna | ✅ (matiz visual: **H6**) | Utilidad de "primero del orden" sólo en la abierta dentro de la columna invertida, con el **orden del DOM intacto** (= orden de tabulación; test `:67-74`); tono de página en su pestaña y acento en su etiqueta; `aria-current="page"`. Y los tests de columna estable entre `/` y `/stash` (`:366-394`) no son triviales: exigen además que las profundidades **sí** cambien. |

**Wordmark y utils (E7):** (a) las hojas no se recortaron y quien se aparta es el wordmark, una sola
línea en la banda superior, con gate propio contra el techo del cajón (`tokens.test:179-190`) y otro
contra la pestaña de la columna 1 (`:192-211`). (b) Cero utils renderizados; el único interactivo de la
banda es el anchor del wordmark. **Pero** los dos gates del wordmark tienen la grieta **H2** y la
mitad horizontal del invariante no tiene gate ninguno (**H3**).

**Arquitectura y convenciones.** Sin hallazgos. Presentación pura (cero fetch, cero rutas decididas
dentro, cero import de datos); token-first (`no-hardcode.test.ts` cubre `ArchiveNav.tsx` y su archivo de
variantes); sintaxis canónica de Tailwind v4 en todo lo nuevo; variantes en `<name>.variants.ts` con
`cva`; `className` fusionado con `cn()` en el componente; a11y con `axe` verde; `strict` sin `any` ni
aserciones sueltas — los dos `as SlotIndex` de las funciones de rampa están acotados por `Math.min`
inmediatamente antes, así que son estrechamientos correctos, no huidas del tipo.

---

## 3. Hallazgos (por gravedad)

### H1 — La API **sí** miente, y el precio no es teórico: una petición HTTP por carga que se tira a la basura. *(defecto real y presente)*

**Verificado.** No es sólo la firma de `ArchiveNav`. La cadena completa está viva:

1. `src/features/auth/ui/AppShellClient.tsx:23-43` hace `fetch("/api/auth/me")` en un efecto **en cada
   carga de cualquier página de `(app)`** y guarda el resultado en estado.
2. Ese `setUser` **provoca un re-render** de todo el subárbol del shell.
3. `AppShell` lo pasa a `ArchiveNav` (`AppShell.tsx:54`).
4. `ArchiveNav` **lo descarta**: la firma declara `user` y `onLogout`, pero la desestructuración de la
   línea 65 sólo toma `items` y `className`.
5. `handleLogout` (`AppShellClient.tsx:45-51`) es **código muerto**: nada puede invocarlo, porque el
   único consumidor del callback lo ignora.

**Escenario de fallo concreto:** un visitante anónimo abre `/`. El navegador dispara
`GET /api/auth/me`, el servidor lo atiende (401), el cliente lo descarta en el `catch`. Con sesión es
peor: el 200 se parsea, entra en estado, re-renderiza el shell entero y **no cambia un solo píxel**.
Coste: un round-trip + un re-render por navegación, para nada.

Y encima está **documentado al revés**: `AppShell.tsx:19` dice literalmente
"Usuario mostrado en el archivero (utils)". Eso no es andamiaje declarado, es una afirmación falsa en
el sitio donde un consumidor va a leerla. El JSDoc de `ArchiveNav.tsx:30-39` sí es honesto (dice que se
acepta y se ignora a propósito, y remite a #31), y el test `layout.test.tsx:199-207` fija que se
ignoran — eso es lo que salva la prop **en `ArchiveNav`**. En `AppShell` no hay nada de eso.

Nota: esta observación ya la había levantado la 3ª ronda (`review_archive_nav_fichero_r3.md:15-16` la
llama "la única corrección que pediría con algo de énfasis"), pero **ese informe está truncado**: se
cortó en la §3 y las 8 observaciones menores nunca se escribieron, así que el implementer nunca las
recibió. No es reincidencia suya.

**Alternativa concreta** (respuesta al juicio 1, en §4.1): conservar las props en `ArchiveNav` —el
puente es defendible— y **cortar la cadena arriba**: corregir el JSDoc de `AppShell` para que diga que
hoy se reenvían y se ignoran hasta #31, y dejar de pedir el usuario que nadie consume (el `useEffect`
de `AppShellClient`, no el endpoint, que se usará igual en #31).

### H2 — El gate del punto más ajustado de la geometría **no está acoplado al componente**: se puede romper el layout con el test en verde. *(riesgo latente, alto)*

**Verificado.** El test `tokens.test.ts:192-211` calcula el borde inferior del wordmark como
`--space-2 + --text-xl × --leading-tight` = 8 + 24 × 1.1 = **34.4**, y lo compara contra el tope de la
pestaña de la columna 1 levantada (**42**). De ahí salen los 7.6px.

El problema es que **nada ata esos tres tokens a las clases que el componente usa de verdad**. El
wordmark es una cadena de clases literal en `ArchiveNav.tsx:101` con el respiro de arriba, el tamaño y
el interlineado escritos a mano; el test lee tokens por su nombre en `globals.css`.

**Escenario de fallo concreto:** alguien sube el wordmark un escalón de tamaño en `ArchiveNav.tsx:101`
(de la utilidad de 24px a la de 32px, ambas existen en el `@theme`). Wordmark real = 8 + 32 × 1.1 =
**43.2**, contra los **42** de la pestaña de la columna 1 levantada → **solapan 1.2px**, y como la banda
va por delante de las 6 hojas (`--z-nav-band` = 7), el wordmark pinta **encima** de la etiqueta. El
test sigue **verde**, porque sigue leyendo el token de 24px. Idem si se le devuelve el subtítulo que
tenía en la r2, o si se cambia el respiro superior por otro token: el gate no se enterará de ninguna.

Los demás gates verticales **sí** están acoplados (la hoja consume literalmente el token del alto de
ranura y la pestaña los del alto de reposo y levantado, y `layout.test.tsx` comprueba esas clases por
concatenación). El del wordmark es el único que mide tokens sin verificar que se consuman — y da la
casualidad de que es el que sostiene el margen más estrecho de todo el nav.

**Cómo se tapa:** asertar también las clases del wordmark (armadas por concatenación, como ya hace todo
el bloque de E8/E9/E10 de `layout.test.tsx`), o mover esa cadena de clases a una variante `cva` y
asertar sobre ella.

### H3 — La mitad **horizontal** del invariante del wordmark no tiene gate, y de ella depende que 5 de las 6 columnas no lo pisen. *(riesgo latente, medio)*

**Verificado por aritmética sobre el código.** El comentario de `tokens.test.ts:195-197` justifica medir
sólo la columna 1 diciendo que "las demás columnas caen a la derecha del wordmark y no compiten con
él". Eso es cierto **hoy**, y no está asertado en ninguna parte.

Y no es una holgura cómoda, porque desde E10 la columna y la ranura están desacopladas: una pestaña de
columna baja puede subir bastante. Recorriendo `navLeafDepth`, la ranura máxima por columna es:

| columna | ranura máx. | ruta en la que ocurre | tope de la pestaña levantada |
|---|---|---|---|
| 1 | 2 | cualquiera menos `/` | y = 42 |
| 2 | 3 | `/lanas`, `/patrones`, `/calculadoras`, `/stash` | y = **32** |
| 3 | 4 | `/patrones`, `/calculadoras`, `/stash` | y = 22 |
| 4 | 5 | `/calculadoras`, `/stash` | y = 12 |
| 5 | 6 | `/stash` | y = 2 |

El wordmark llega a y = 34.4. O sea: **en 4 de las 6 rutas la pestaña de la columna 2, con el puntero
encima, entra 2.4px en la banda de línea del wordmark**, y las columnas 3-5 entran mucho más. Lo único
que impide la colisión es la distancia horizontal, que en el ancho de nacimiento (1180px) es de
~27.7px: el wordmark acaba en x≈185 y la columna 2 arranca en 24 + (1180−48)/6 = **212.67**.

**Escenario de fallo concreto:** alguien alarga la cadena del wordmark en `ArchiveNav.tsx:103` (por
ejemplo a "Knit&Crochet Studio") o le sube el tamaño. Pasa de x≈185 a x>212.67, y en `/lanas` la
pestaña de "Proyectos" con el puntero encima queda **por debajo del wordmark**, que la pinta encima
(z de la banda = 7 > 6). Los 420 tests siguen verdes: no hay ni uno que mire el eje x del wordmark.

### H4 — La constante de avance tipográfico **no es la cota superior que dice ser**: cuenta caracteres, no glifos. *(riesgo latente, medio; respuesta al juicio 2 en §4.2)*

**Verificado en el código del test.** `tokens.test.ts:229-246` se documenta como "**Cota SUPERIOR** del
avance de una mayúscula" con 0.72 em, y calcula el ancho de la etiqueta como
`longestLabel × (0.72 × tamaño + tracking)`, donde `longestLabel` es **`label.length`**, un conteo de
caracteres.

Que no es cota superior lo demuestra la propia medición empírica del leader: 165px reales para
CALCULADORAS a 18px con 1px de tracking → avance **medio** de (165/12 − 1)/18 = **0.708 em**. Si 0.708
es la media de esos 12 glifos, hay glifos de esa misma cadena **por encima** de 0.72. La cota real de la
familia está bastante más arriba (en un grotesco en negrita, la M y la W rondan 0.87-0.93 em).
*Esto último es inferencia, no lo medí: no pude parsear el `.woff2` que `next/font` descarga.* Lo que
**sí** está verificado es la parte estructural: el test no tiene métricas por glifo, así que su
resultado depende sólo del **número** de letras.

**Escenario de fallo concreto:** se renombra Calculadoras a Herramientas (12 caracteres, igual
longitud). El test da exactamente el mismo número y sigue verde. Peor: cualquier etiqueta de 12
caracteres con varias M o W —digamos MUESTRAS WIP (12)— sale a ~12 × (0.90 × 18 + 1) ≈ **206px** contra
los 172.7px de ancho de texto de la columna, o sea **34px de desbordamiento**, y el test sigue verde
porque sigue multiplicando por 0.72.

La red de seguridad real en ese caso **no es el test, es el recorte con elipsis** de la etiqueta
(`archive-nav.variants.ts:160`). Es decir: el invariante 7 no se rompería como solape, se rompería como
"las 6 etiquetas ya no se leen enteras" — silenciosamente, y en el ancho de nacimiento del nav.

### H5 — Deriva de contrato: el **texto** del invariante 3 del RFC quedó desactualizado tras el ajuste de la 5ª vuelta. *(documentación, medio-bajo)*

**Verificado.** `RFC-01-shell.md:71-72` sigue diciendo: *"5 pasos + alto de pestaña debe caber en
`--nav-height` (104px) — con paso 10px da 94px, entra con holgura"*.

Eso describe la versión **anterior** al ajuste de la §9 del informe. La realidad de hoy es: la hoja
abierta conserva su ranura, el presupuesto se cuenta en **6 ranuras**, 6 × 10 + 44 = **104 exactos** y
la holgura es **cero** (el propio informe lo dice en §9.3: desaparecen los 10px de holgura). El
comentario de `globals.css:69-76` sí está bien redactado; el que manda —el RFC— no.

**Escenario de fallo concreto:** el siguiente implementer lee el invariante 3, cuenta 94px, concluye que
le sobran 10px de aire y sube el alto de la pestaña o del canto "porque entra". No entra: revienta
`--nav-height`, y de paso se come el margen de 7.6px de E7. Lo detectarán dos tests, pero después de
haber diseñado sobre un número falso. Como el RFC dice explícitamente que "el texto de arriba ya está
enmendado" para que nadie lo corrija de vuelta, esta línea es exactamente la trampa que ese aviso quería
evitar. (La actualización del RFC es tarea del leader, no del implementer.)

### H6 — La costura de la hoja abierta con el contenido **no es continua**: coincide el tono, no la textura. *(visual, bajo)*

**Verificado en código; no medido en pantalla.** El informe (§9.2) afirma que la ranura sin cara
(94-104) muestra "el fondo del header (espresso + puntos), que es el mismo tono del área de contenido
que empieza en 104". Lo del tono es cierto; lo de la textura, no:

- El header declara color **y** la imagen de textura de puntos (`ArchiveNav.tsx:81`).
- El área de contenido **no tiene textura**: la raíz de `AppShell` pinta un color de fondo **opaco**
  (`AppShell.tsx:42`) que tapa la imagen de textura que `globals.css:266-268` pone en el `body`, y ni
  `main` ni `src/app/(app)/page.tsx` vuelven a declararla.

Resultado: entre el canto más bajo (acaba en y=94) y el contenido (empieza en y=104) hay una franja de
10px **con puntos**, seguida de un área **sin puntos**. Los puntos son cream al 8% sobre espresso, así
que es sutil, y el leader lo validó a ojo como continuación del contenido. Pero la metáfora que
justifica E10 (el área de contenido **es** su cara) descansa en que las dos superficies sean la misma, y
hoy no lo son. Merece al menos quedar escrito antes de que alguien suba la opacidad de la textura.

### H7 — Los 7.6px que el leader confirmó "empíricamente" se midieron sobre una pestaña que **no comparte x con el wordmark**. *(alcance de la verificación, bajo)*

**Verificado.** `progress/current.md:56-58` registra: *"la pestaña de la ranura 2 levantada llega a y=42
contra el wordmark en y=34.4 → 7.6px de margen, sin solape"*. El número vertical es correcto y coincide
con el gate.

Pero en `/` —la única ruta que existe hoy— la ranura 2 la ocupa **Proyectos, que es la columna 2**, que
arranca en x=272 a 1536px: no está debajo del wordmark, así que ahí no hay ningún margen que confirmar.
La configuración que el gate modela (**columna 1** en ranura 2, es decir Dashboard **no** activa) **no
se puede observar en el navegador hoy**, porque en la única ruta del router Dashboard es siempre la hoja
abierta y por tanto siempre está en la ranura 1 (tope y=52, 17.6px de sobra).

O sea: el punto más ajustado de la geometría vertical está sostenido **sólo** por aritmética de tokens
(con la grieta H2), y la confirmación empírica anotada es de otra pestaña. No es un defecto del código;
es que la casilla de "verificado en navegador" está marcada por algo que no es lo mismo. Se cierra
cuando exista `/proyectos` (feature #17 o #19) o con una segunda página cualquiera montada al efecto.

---

## 4. Los cinco juicios que pidió el leader

### 4.1 ¿Miente la API con `user` / `onLogout`?

**En `ArchiveNav`, no. En `AppShell`, sí, y la cadena entera cuesta una petición HTTP por carga.**

Lo que salva la prop en `ArchiveNav` son tres cosas, y las tres están: (i) el "se ignora" está escrito
**donde se declara** (`ArchiveNav.tsx:30-39`), no en un informe que nadie leerá; (ii) no es una promesa
verbal, es un **test** (`layout.test.tsx:199-207`: se le pasan y se exige que no aparezca el nombre, ni
el botón, ni se invoque el callback); (iii) quitarla obligaría a desmontar la costura de auth para
rehacerla dos features después. Eso es andamiaje declarado con fecha de caducidad, no un contrato falso.

Lo que **no** es aceptable es el resto de la cadena, y por dos motivos distintos:

- **El JSDoc de `AppShell` afirma lo contrario de lo que pasa** (`AppShell.tsx:19`, "Usuario mostrado en
  el archivero"). Un consumidor del design system lee eso, le pasa un usuario y no ve nada. Ahí la API
  sí miente, sin atenuantes.
- **La prop ignorada tiene un coste real, no cosmético**: `AppShellClient` pide `/api/auth/me` en cada
  carga y re-renderiza el shell con un dato que se descarta, y `handleLogout` es código inalcanzable
  (H1).

**Alternativa concreta, en tres pasos, ninguno destructivo:**

1. Corregir el JSDoc de `AppShell.tsx:19-22` con el mismo texto honesto que ya tiene `ArchiveNav`:
   reservadas para #31, hoy reenviadas y **no renderizadas**.
2. Desactivar la **carga** del usuario en `AppShellClient` (el `useEffect`) mientras nadie la consuma,
   dejando el endpoint intacto —se usará igual en #31— y el logout como función exportada y testeada, no
   como callback colgado de un árbol que no lo llama.
3. Añadir un test de la costura: montado el shell, **no** se dispara ningún fetch. Hoy no hay ninguno
   que impida que esa petición inútil sobreviva a #31.

Si se prefiere no tocar `AppShellClient` en esta ronda, el paso 1 es de **una línea** y es el que quita
la mentira; el 2 y el 3 pueden ir a deuda registrada. Lo que no debería pasar es cerrar la ronda con el
JSDoc como está.

### 4.2 ¿La constante de avance tipográfico sostiene un invariante?

**Sostiene el caso concreto de hoy; no sostiene el invariante.** Da una falsa sensación de garantía, y la
falsedad es identificable con precisión: el test dice medir "el avance de una mayúscula" pero **no mide
glifos, cuenta caracteres** (H4). Es una media disfrazada de cota superior — y la propia medición del
leader lo delata: 165px reales sobre 12 glifos son 0.708 em de media, así que en esa misma palabra hay
glifos por encima de 0.72.

Consecuencia práctica: el test protege contra **exactamente dos** cambios, y bastante bien —subir el
tamaño de la etiqueta y bajar el ancho de nacimiento del nav, que es su motivo de existir (E4 ↔ E6, y ese
acoplamiento está bien hecho)—. No protege contra **cambiar las etiquetas**, que es el cambio más
probable de los tres y el único que alguien hará sin sospechar que toca geometría.

Los 2.5px de holgura sobre una estimación cuyo error por glifo puede ser del 25% no son un margen: son
ruido. Que haya salido conservadora es suerte del reparto de letras de estas 6 palabras.

**Qué lo convertiría en base suficiente**, en orden de coste:

1. **Mínimo honesto:** renombrar la constante y su comentario a lo que es (avance **medio**, medido
   empíricamente para estas 6 etiquetas, con el número real y de dónde salió) y añadir un factor de
   seguridad explícito hacia la cota real de la familia. Deja de mentir aunque siga siendo estimación.
2. **Correcto:** leer las métricas de verdad. Con un lector de tablas hmtx/cmap se obtiene el avance por
   glifo y el test pasa a sumar la palabra real en vez de multiplicar por su longitud. Es un test: puede
   permitirse una dependencia de desarrollo.
3. **Complementario y barato:** un gate sobre las 6 etiquetas de `NAV_ITEMS`, para que cambiarlas obligue
   a rehacer la cuenta. Convierte el fallo silencioso en un fallo ruidoso justo donde se introduce.

Mientras tanto, la garantía que **de verdad** existe hoy es el recorte con elipsis, que es degradación,
no cumplimiento del invariante 7.

### 4.3 ¿Alcanza fijar la columna por índice para pagar la derogación de E1?

**La mitigación es la correcta y ataca el eje que importa, pero está incompleta en un punto que nadie
midió: la escalera sólo es monótona en `/`.**

Lo que la mitigación consigue, y es mucho: la memoria espacial de un nav se apoya en **apuntar**, y
apuntar es horizontal. Cada página tiene una columna de 189px (a 1180px) a 248px (a 1536px) de ancho,
fija para siempre y verificada por un test que además comprueba que el stack **sí** se reordenó.
El temor explícito de E1 era que las pestañas cambiaran "de altura **y** de columna"; con E10 cambian
sólo de altura. Verificado también en la firma: `navTabColumn` no puede depender de la ruta porque no la
recibe.

Lo que **no** se midió (aritmética mía sobre `navLeafDepth`; no había test ni medición):

- **Cuánto se mueve cada pestaña al navegar.** Sólo se mueven las pestañas a la **izquierda** de la que
  se activa (suben una ranura, 10px) más la que se activa (baja hasta la ranura 1). Las de la derecha no
  se mueven. Peor caso, `/` → `/stash`: **las seis** cambian de altura, cinco 10px y una 50px. Mejor
  caso, `/` → `/proyectos`: se mueven dos.
- **Por qué eso no rompe el apuntado:** 10px sobre una pestaña de 44px deja 34px de solape entre la caja
  de antes y la de después, así que un puntero apoyado en el centro de una pestaña **sigue dentro de
  ella** tras la navegación. La única que se va lejos (50px) es la que acabas de pulsar, o sea la que ya
  no vas a pulsar. Esto es a favor de la mitigación: no hay riesgo de clic equivocado.
- **Lo que sí está roto y no se vio:** la **monotonía** de la escalera. Con Dashboard activa (`/`) las
  bases van 104/94/84/74/64/54, una escalera limpia — y es lo único que se validó en navegador, porque
  `/` es la única ruta que existe. Con Lanas activa, las bases por columna son
  **94 / 84 / 104 / 74 / 64 / 54**: un diente. La ranura 1 la ocupa la columna 3 y las dos de su
  izquierda quedan **por encima** de ella. La 5ª vuelta se hizo entera para que la escalera no arrancara
  plana, y ese resultado sólo está verificado en el único caso en el que E10 la deja monótona. En las
  otras cinco rutas la forma es un diente que **nadie ha visto**, ni a ojo ni por test (los tests de E10
  asertan el array de profundidades, que es correcto, no la lectura de la escalera).

**Mi juicio:** la mitigación alcanza para lo que E1 protegía (memoria espacial y precisión de apuntado) y
no hay que revisarla. Lo que falta es **aceptar explícitamente el diente** como consecuencia de E10 —es
inherente: si la activa baja al fondo, el orden por columnas no puede ser monótono salvo cuando la activa
es la primera— y **verlo en pantalla al menos una vez**. Es lo primero que debería mirar el usuario
cuando exista una segunda ruta. Si el diente no le gusta, el problema no es la mitigación: es E10, y se
decide otra vez.

### 4.4 ¿7.6px es margen o bomba de relojería?

**Es margen para el eje y el actor que el gate cubre, y bomba para todo lo demás.** Desglosado:

- **A favor:** el margen es invariante al zoom del navegador y al tamaño de fuente del sistema (toda la
  geometría del nav está en px y en tokens, así que el zoom escala numerador y denominador). No es de los
  márgenes que se rompen solos. Y hay un gate derivado de tokens, que es la forma correcta.
- **En contra, y es lo que lo vuelve frágil:** el gate mide **tokens**, no lo que el componente
  **consume** (H2). El escenario es de una línea: subir un escalón el tamaño del wordmark en
  `ArchiveNav.tsx:101` da 43.2 contra 42 → solape de 1.2px con el wordmark pintando encima, y los 420
  tests en verde. "Está bajo test" es cierto sólo para quien edite `globals.css`; quien edite el
  componente pasa por debajo del radar.
- **Peor todavía:** el eje horizontal, que es lo que protege a las **otras cinco** columnas, no tiene gate
  ninguno, y cuatro de las seis rutas ponen la pestaña de la columna 2 a 2.4px dentro de la banda del
  wordmark (H3). Ahí no hay 7.6px de nada: hay ~27.7px horizontales sin asertar.
- **Y la confirmación empírica anotada no es de esa pestaña** (H7).

**Respuesta directa:** hoy no está roto, y el número es defendible; pero **no** está "bajo test" en el
sentido en que el informe lo dice. Con H2 y H3 tapados —dos asserts sobre las clases del wordmark y uno
sobre su ancho contra el arranque de la columna 2— pasa a ser margen de verdad. Sin taparlos, es la línea
que romperá la próxima persona que toque tipografía, que es exactamente lo que temía la pregunta.

### 4.5 ¿Tiene efectos secundarios el lift por crecimiento de alto?

**La decisión es la correcta y la sostengo.** Cierra el invariante por construcción y no por afinado: la
región que la pestaña cubre en reposo sólo puede crecer, así que no existe estado en el que aparezca una
arista entre la pestaña y su canto — y eso vale también para la hoja abierta, **que no tiene canto** y que
por tanto hacía imposible la garantía vieja de E5 (el salto menor o igual que el alto del canto).
Cualquier alternativa compuesta que se le ocurra a alguien (trasladar hacia arriba y crecer lo mismo) es
literalmente esto mismo. Tres efectos secundarios reales, los tres verificados en código:

1. **Reflow del contenido de la pestaña: sí, y a la mitad.** La pestaña es un contenedor flex centrado
   (`archive-nav.variants.ts:130`), así que crecer 8px con la base clavada mueve el lockup **4px**, no 8.
   El implementer lo declara (§3 del informe) y es correcto. La consecuencia práctica que **no** está
   escrita en ningún sitio consultable: `--nav-tab-lift` significa **dos cosas distintas** según qué se
   mire —8px de movimiento del **borde**, 4px del **texto**—, así que quien lo suba buscando un movimiento
   de texto concreto obtendrá la mitad, y de paso se comerá el doble de los 7.6px de H2/§4.4. Merece una
   línea junto al token.
2. **Animar una propiedad no compuesta: sí, pero el daño está contenido, y lo verifiqué.** El alto no es
   una propiedad compuesta: cada frame de los 200ms recalcula layout. Lo importante es **hasta dónde llega
   ese recálculo**, y la respuesta es "a nada que se vea": el carril es absoluto (`:90`) dentro de una hoja
   de **alto fijo** (`:38`), y el header tiene alto fijo por token. O sea, el árbol que se relayoutea es
   carril → pestaña → dos spans, y ni el alto del stack, ni el techo del cajón, ni las otras cinco hojas,
   ni `main` se enteran. Se cumple el "nada hace reflow" del invariante 8 en el sentido que le da E5 (no
   abrir huecos, no mover el layout). Es un coste de rendimiento despreciable —una pestaña a la vez, cuatro
   nodos—, no un defecto.
3. **`prefers-reduced-motion`: correcto, con un matiz que conviene saber.** La media global de
   `globals.css:281-290` fuerza la duración a 0.01ms con `!important`, así que la transición degrada sola:
   **no hay animación**. Lo que sigue habiendo es un **salto instantáneo de 8px** al pasar el puntero. Es
   lo correcto —la preferencia es sobre movimiento animado, no sobre indicadores de estado— y es la misma
   degradación que ya tenía el desplazamiento anterior, así que no es una regresión. Y la media global sólo
   pisa la duración, no la propiedad de transición, que es la forma correcta de hacerlo. Sin objeciones.

**Efecto secundario bueno que sí conviene apuntar:** desaparece el parpadeo hover/unhover. Con
desplazamiento, la caja sensible se escapa del puntero y puede oscilar; creciendo, la caja crece **bajo**
el puntero. El implementer lo dice y es cierto por construcción.

---

## 5. Deudas de `progress/current.md` — ¿alguna es **peor** de lo que dice su ficha?

Fuera de alcance por encargo: 13, 15, 16, 17, 18, 19, 20. Las revisé sólo para esto:

- **La 18 es peor de lo que dice su ficha.** Dice que la grieta es "la única" de "cerrado por
  construcción" y que se tapa con un assert de igualdad en `globals-css.test.ts`. Dos correcciones: (a) ese
  assert **ya existe** —`tokens.test.ts:257-262` compara los dos juegos de breakpoints y está verde—, así
  que la deuda ya no describe la realidad; y (b) **no era la única grieta**: quedan al menos dos del mismo
  tipo, ambas nuevas de esta ronda y ambas sobre garantías más ajustadas que aquélla — el gate del wordmark,
  que mide tokens sin verificar que el componente los consuma (**H2**), y el eje horizontal, que no tiene
  gate (**H3**). Conviene reescribir la ficha: el patrón a vigilar es "el test mide tokens, el layout
  consume clases", no el par de breakpoints concreto.
- **La 20 se solapa con H4 y conviene fusionarlas.** Dice que la garantía de ancho cubre las 6 páginas de
  la app pero no a un consumidor con sus propios `items`. Cierto, pero incompleto: por H4 **tampoco cubre
  bien a las 6 páginas propias** si alguien les cambia el texto, porque la cuenta depende del número de
  caracteres y no de los glifos.
- 13, 15, 16, 17 y 19: intactas y exactamente como las describe su ficha. No las toqué.

**Hallazgo colateral, no una deuda del código:** `progress/reports/review_archive_nav_fichero_r3.md` está
**truncado**. Tiene el veredicto arriba y se corta a mitad de la §3: las 8 observaciones menores que
anuncia en su línea 15 —incluida la 2, el JSDoc de `AppShell`— **nunca se escribieron**. Es consistente
con el incidente de gasto de la 3ª ronda. Quien lo lea creyendo que es un informe completo dará por
revisado lo que no lo está; conviene marcarlo como incompleto en el propio archivo.

---

## 6. Checkpoints (`CHECKPOINTS.md`)

**C1 — El arnés está completo**
- C1.1: [x] `AGENTS.md`, `init.sh`, `feature_list.json`, `progress/current.md` — verificados por el paso 2 de `init.sh`.
- C1.2: [x] Los 3 docs de `docs/harness/` — íd.
- C1.3: [x] `bash ./init.sh` termina con **exit code 0**.

**C2 — El estado es coherente**
- C2.1: [x] Como mucho una feature en `in_progress`: **cero**, y #13 sigue `done` (esto es una corrección; `feature_list.json` sin tocar, verificado en el diff).
- C2.2: [x] Toda feature `done` tiene tests que pasan: 420 passed | 6 skipped.
- C2.3: [x] `progress/current.md` describe la sesión activa, sin basura de sesiones anteriores.

**C3 — El código respeta la arquitectura**
- C3.1: [x] Capas respetadas: `ArchiveNav` es presentación pura (cero DB, cero Drizzle, cero fetch, no decide rutas); el fetch vive en la costura de feature (`features/auth/ui/AppShellClient.tsx`). Esta ronda no toca route handlers ni lógica de negocio.
- C3.2: [x] Feature-first (`src/{app,features,shared}`) intacto; el design system en `shared/ui/layout/`.
- C3.3: [x] Sin dependencias nuevas.
- C3.4: [x] Sin `console.log` ni TODOs sin contexto. Los "RESERVADO para #31" están donde toca y con test que los fija. (Ver **H1**: el JSDoc de `AppShell` no es un TODO, es una afirmación falsa; no marca C3 en rojo, pero hay que arreglarlo.)
- C3.5: [x] Sin secretos hardcodeados.

**C4 — La verificación es real**
- C4.1: [x] Cada módulo con lógica no trivial tiene test: las tres funciones de rampa (`navTabColumn`, `navLeafDepth`, `navTrackColumns`) están cubiertas a través del componente, incluidos los casos degenerados (más ítems que ranuras, menos ítems, ninguna ruta activa).
- C4.2: [x] Lint y typecheck verdes (pasos de `init.sh`).
- C4.3: [x] Tests verdes, corridos por mí.

**C5 — La sesión se cerró bien**
- C5.1: [x] Sin artefactos sospechosos: los 25 archivos sin trackear son informes de `progress/` y fuentes/tests nuevos legítimos (`three/`, los tres archivos de guardrail, `archive-nav.tokens.test.ts`, `template/ascii-yarn.js`). Ni `*.tmp` ni artefactos de build fuera de `.gitignore`. (`tsconfig.tsbuildinfo` trackeado sigue siendo la deuda 4, preexistente.)
- C5.2: [x] `progress/history.md` tiene entrada de la última sesión.
- C5.3: [x] La última feature trabajada está en su estado correcto (#13 `done`, corrección sin reapertura).

---

## 7. Cambios pedidos (ninguno bloquea el cierre)

Por orden de lo que yo taparía primero:

1. **H1 / juicio 1** — corregir el JSDoc de `AppShell.tsx:19-22` para que no afirme que el usuario se
   muestra (una línea; es la mentira de la API) y decidir qué hacer con la petición a `/api/auth/me` que
   hoy se descarta y con el `handleLogout` inalcanzable: arreglarlo o registrarlo como deuda con su
   criterio de cierre en #31.
2. **H2** — acoplar el gate del wordmark a las clases que el componente usa de verdad, no sólo a los
   tokens. Es el gate del margen más estrecho del nav y hoy se burla editando una línea del componente.
3. **H3** — añadir el gate horizontal que falta: ancho del wordmark contra el arranque de la columna 2 a
   `--bp-archive`. Cubre las 5 columnas que hoy no cubre nada.
4. **H4 / juicio 2** — como mínimo, dejar de llamar "cota superior" a una media y anotar el número real
   medido; idealmente, medir glifos. Y un gate que avise si cambian las etiquetas de `NAV_ITEMS`.
5. **H5** — actualizar el texto del invariante 3 de `RFC-01-shell.md:71-72` al presupuesto real (6 ranuras,
   104 exactos, holgura cero). Tarea del leader.
6. **Juicio 3** — anotar el diente de la escalera en las 5 rutas que no son `/` como consecuencia asumida
   de E10, y mirarlo en pantalla en cuanto exista una segunda ruta.
7. **Juicio 5, punto 1** — una línea junto a `--nav-tab-lift` avisando de que el borde sube el doble que el
   texto (pestaña centrada).
8. **H6** — dejar escrito que la ranura sin cara muestra la textura de puntos y el área de contenido no,
   antes de que alguien suba la opacidad de esa textura.
9. **H7** — marcar como pendiente la validación en navegador de la columna 1 en ranura 2 (hoy no es
   observable: sólo existe `/`), y marcar `review_archive_nav_fichero_r3.md` como informe **truncado**.

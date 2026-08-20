/**
 * Preguntas sobre **nombres de token** dentro de un texto, sin más dependencias
 * que el propio texto.
 *
 * **Por qué vive aparte de `class-names-from-source.ts`.** Ese módulo arrastra
 * el compilador de Tailwind y el de TypeScript, y estas dos funciones las
 * necesita también un test de DOM que sólo monta un componente: hacerle importar
 * un compilador entero para responder "¿esta clase consume este token?" no sale
 * a cuenta. `class-names-from-source.ts` las reexporta, así que hay **una sola
 * implementación** y los dos sitios preguntan lo mismo.
 *
 * **Y por qué existen.** Nacieron de un verde falso **medido** en la ronda 1 de
 * la enmienda E13, no de una precaución: los dos gates comparaban el nombre del
 * token por SUBCADENA, y el reviewer mutó la utilidad de tope a un token con
 * **una letra de más**. El nombre bueno sigue estando dentro del malo, así que
 * las dos redes lo dieron por bueno y la suite salió entera en verde — con el
 * tope apuntando a una variable que no existe, o sea `max-width` cayendo a su
 * valor inicial y la pantalla **exactamente en el defecto que E13 vino a
 * arreglar**. Es la deuda 146-A otra vez, aplicada al valor de la declaración en
 * vez de al selector.
 *
 * El detalle que explica por qué no se había visto: la comparación por subcadena
 * **sí** caza el token recortado (el prefijo) y **no** caza el alargado (el
 * sufijo). Un control positivo corrido en una sola dirección la daba por buena.
 *
 * Por eso acá no se compara con frontera de nombre sino por **igualdad**: se
 * extraen los nombres enteros y se busca el que tiene que estar. No hay frontera
 * que ajustar mal ni dirección en la que falle.
 */

/**
 * Todos los nombres de variable CSS que aparecen en un texto, **enteros**.
 *
 * Sirve igual para el **valor de una declaración** compilada (una referencia a
 * variable) que para el **nombre de una utilidad**, que en la forma canónica
 * lleva el token entre paréntesis. Los dos sitios son texto y en los dos hace
 * falta la misma pregunta.
 */
export function tokensIn(text: string): string[] {
  return [...text.matchAll(/--[A-Za-z0-9_-]+/g)].map((match) => match[0]);
}

/** ¿Este texto consume **ESTE** token, con el nombre entero? */
export function usesToken(text: string, token: string): boolean {
  return tokensIn(text).includes(token);
}

/**
 * ¿Este valor es una **longitud absoluta en píxeles**, con su unidad puesta?
 *
 * **Nació de la quinta aparición de la misma familia de fallo en este repo, y
 * otra vez medida y no imaginada** (bloqueante B2 de la ronda 2 de E13). Los
 * gates comprobaban el **nombre** del token hasta el último carácter y **nada**
 * de su valor: leían el número con la lectura permisiva de coma flotante, que
 * **descarta el sufijo en silencio**. Para ella, el número pelado, el número con
 * unidad de píxeles y el mismo número en unidades de tipografía son **el mismo
 * número**, así que la derivación cuadraba con los tres y **la suite ENTERA
 * salía verde** con el tope sin efecto:
 *
 * - sin unidad → en el navegador la declaración es **inválida** (una longitud
 *   necesita unidad salvo el cero): la propiedad cae a su valor inicial y **no
 *   hay tope**;
 * - con unidad de tipografía → el tope existe pero vale ~16 veces más de lo
 *   pedido, o sea tampoco acota nada.
 *
 * Los dos desenlaces son el mismo: la pantalla vuelve **exactamente al defecto
 * que la enmienda vino a arreglar**, sin que nadie avise. Y no es hipotético: el
 * leader midió el contenedor **sin tope, llegando al borde de la ventana**,
 * mientras el reviewer corría esa mutación.
 *
 * **EL CRITERIO, escrito para que no se sobre-aplique.** Esto vale **sólo para
 * los tokens que se consumen como una longitud CSS** —topes de ancho, espaciados,
 * anchos de ventana—, que son los que quedan rotos si les falta la unidad.
 * **NO** vale para los que legítimamente no llevan ninguna: profundidad de
 * apilamiento, interlineado, proporciones, opacidades, colores ni duraciones. Un
 * gate que se la exigiera a todos estaría inventando un error donde no lo hay.
 *
 * Tampoco acepta expresiones de cálculo ni cadenas de referencias sin resolver:
 * no es que estén prohibidas, es que **este comprobador no sabe evaluarlas**, y
 * denunciar es mejor que dar por buena una que no se entendió. Si algún día un
 * token de longitud pasa a declararse así, la salida correcta es enseñarle a
 * resolverlo, no aflojar la comprobación.
 */
export function isAbsolutePxLength(value: string): boolean {
  return /^-?\d+(?:\.\d+)?px$/.test(value.trim());
}

/**
 * Una marca de otro usuario es indistinguible de una inexistente: el BFF
 * responde 404 (nunca 403), tanto al listar/crear tipos como al validar el
 * `brandId` de una lana.
 */
export class BrandNotFoundError extends Error {
  constructor() {
    super("La marca no existe.");
    this.name = "BrandNotFoundError";
  }
}

/**
 * El tipo no existe, o existe pero no pertenece a la marca indicada (u a otro
 * usuario): en todos los casos 404. Impide adjuntar un tipo de otra marca.
 */
export class YarnTypeNotFoundError extends Error {
  constructor() {
    super("El tipo no existe.");
    this.name = "YarnTypeNotFoundError";
  }
}

/** Lana ajena o inexistente → 404 (nunca 403). */
export class YarnNotFoundError extends Error {
  constructor() {
    super("La lana no existe.");
    this.name = "YarnNotFoundError";
  }
}

/**
 * Viola el índice único `(brandId, colorCode)`. Se traduce a 409, nunca a 500:
 * es un conflicto de datos esperable, no un fallo del servidor.
 */
export class DuplicateColorCodeError extends Error {
  constructor() {
    super("Ya existe una lana con ese código de color para esta marca.");
    this.name = "DuplicateColorCodeError";
  }
}

/**
 * Se intentó borrar una lana referenciada por al menos un proyecto sin
 * `?force=true`. El BFF responde 409 con `referencedBy` para que el cliente
 * confirme. No se borra nada hasta que llega `?force=true`.
 */
export class YarnReferencedError extends Error {
  readonly referencedBy: number;

  constructor(referencedBy: number) {
    super(
      "La lana está en uso por uno o más proyectos. Usa ?force=true para borrarla.",
    );
    this.name = "YarnReferencedError";
    this.referencedBy = referencedBy;
  }
}

/**
 * Se intentó borrar una marca que aún tiene hijos (tipos y/o lanas). A
 * diferencia de la lana, NO hay `?force` ni cascada: las FKs
 * `yarn_types → brands` y `yarns → brands` son `no action` a propósito, así
 * que el usuario debe vaciar la marca primero. El BFF responde 409 con los
 * contadores para que el cliente explique qué falta borrar. No se borra nada.
 */
export class BrandReferencedError extends Error {
  readonly types: number;
  readonly yarns: number;

  constructor(types: number, yarns: number) {
    super(
      "La marca tiene tipos o lanas asociados. Bórralos antes de eliminar la marca.",
    );
    this.name = "BrandReferencedError";
    this.types = types;
    this.yarns = yarns;
  }
}

/**
 * Se intentó borrar un tipo que aún tiene lanas. Como en la marca, NO hay
 * `?force` ni cascada (la FK `yarns → yarn_types` es `no action`): el BFF
 * responde 409 con el contador de lanas y no borra nada.
 */
export class YarnTypeReferencedError extends Error {
  readonly yarns: number;

  constructor(yarns: number) {
    super("El tipo tiene lanas asociadas. Bórralas antes de eliminar el tipo.");
    this.name = "YarnTypeReferencedError";
    this.yarns = yarns;
  }
}

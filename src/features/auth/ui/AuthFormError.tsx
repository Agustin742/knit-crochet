export interface AuthFormErrorProps {
  /** Mensaje a nivel de FORMULARIO (401, 409 sin campo, 500, red caída). */
  message?: string | null;
}

/**
 * Error a nivel de formulario. Vive aquí y no en `shared/ui` porque el design
 * system todavía no tiene primitivo de feedback (SDD §6) y esto es UI de la
 * feature, no del template.
 *
 * Por qué existe pudiendo usar `Field`: el mensaje de `Field` es un `span`
 * normal asociado por `aria-describedby`, o sea que **no se anuncia** cuando
 * aparece después del envío, salvo que el foco esté en ese campo. El contenedor
 * va montado SIEMPRE (aunque esté vacío) para que el lector de pantalla tenga la
 * región viva registrada antes de que llegue el texto; si la región naciera
 * junto al mensaje, el anuncio se pierde en parte de los lectores.
 *
 * El color de peligro se lee a 4.86:1 sobre la superficie elevada de `Card`, que
 * es donde se monta (misma pareja de tokens que usa el mensaje de `Field`).
 */
export function AuthFormError({ message }: AuthFormErrorProps) {
  return (
    <div role="alert">
      {message ? (
        <p className="border-(length:--border-width) border-solid border-danger rounded-sm p-(--space-3) font-mono text-sm text-danger">
          {message}
        </p>
      ) : null}
    </div>
  );
}

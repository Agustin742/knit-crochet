import { z } from "zod";

// Se importa el módulo de constantes, NO `@/shared/lib/auth/password`: ese
// importa `bcryptjs` y este archivo lo consumen los formularios del cliente
// (#31), que validan con estos mismos schemas para no divergir del servidor.
// Ver `password.constants.ts`.
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/shared/lib/auth/password.constants";

// El email se normaliza (trim + minúsculas) ANTES de validar el formato y
// antes de consultar/guardar, para que la unicidad no dependa del casing.
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(255)
  .pipe(z.email("El email no es válido."));

const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, "La contraseña debe tener al menos 8 caracteres.")
  .max(PASSWORD_MAX_LENGTH, "La contraseña no puede superar 72 caracteres.");

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "La contraseña es obligatoria."),
});

export type RegisterPayload = z.infer<typeof registerSchema>;
export type LoginPayload = z.infer<typeof loginSchema>;

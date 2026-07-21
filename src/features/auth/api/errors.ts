export class EmailAlreadyRegisteredError extends Error {
  constructor() {
    super("Ya existe una cuenta con ese email.");
    this.name = "EmailAlreadyRegisteredError";
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Email o contraseña incorrectos.");
    this.name = "InvalidCredentialsError";
  }
}

export class UserNotFoundError extends Error {
  constructor() {
    super("El usuario no existe.");
    this.name = "UserNotFoundError";
  }
}

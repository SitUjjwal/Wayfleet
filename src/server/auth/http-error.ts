export class AuthHttpError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403, message = status === 401 ? "Unauthorized" : "Forbidden") {
    super(message);
    this.name = "AuthHttpError";
    this.status = status;
  }
}

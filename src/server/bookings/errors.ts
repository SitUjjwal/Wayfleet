export class BookingHttpError extends Error {
  readonly status: number;
  readonly fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "BookingHttpError";
    this.status = status;
    this.fields = fields;
  }
}

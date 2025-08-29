export class InternalServerError extends Error {
  constructor({ cause }) {
    super("Unexpected Internal Error has been detected", {
      cause,
    });
    this.name = "InternalServerError";
    this.action = "For more information contact Support";
    this.statusCode = 500;
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      action: this.action,
      status_code: this.statusCode,
    };
  }
}

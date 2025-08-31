export class InternalServerError extends Error {
  constructor({ cause, statusCode }) {
    super("Unexpected Internal Error has been detected", {
      cause,
    });
    this.name = "InternalServerError";
    this.action = "For more information contact Support";
    this.statusCode = statusCode || 500;
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

export class MethodNotAllowedError extends Error {
  constructor() {
    super("Method not allowed for this endpoint");
    this.name = "MethodNotAllowedError";
    this.action = "Check if this method is supposed to be valid";
    this.statusCode = 405;
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

export class ServiceError extends Error {
  constructor({ cause, message }) {
    super(message || "Service Not available at the moment", {
      cause,
    });
    this.name = "ServiceError";
    this.action = "Check service availability";
    this.statusCode = 503;
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

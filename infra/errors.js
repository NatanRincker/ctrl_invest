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

export class ValidationError extends Error {
  constructor({ cause, message, action }) {
    super(message || "A Validation Error occured", {
      cause,
    });
    this.name = "ValidationError";
    this.action = action || "Please review the submited data";
    this.statusCode = 400;
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

export class NotFoundError extends Error {
  constructor({ cause, message, action }) {
    super(message || "Requested Resource Could not be found", {
      cause,
    });
    this.name = "NotFoundError";
    this.action = action || "Please, double check the search parameters";
    this.statusCode = 404;
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

export class UnauthorizedError extends Error {
  constructor({ cause, message, action }) {
    super(message || "You do not have authorization to access this resource", {
      cause,
    });
    this.name = "UnauthorizedError";
    this.action = action || "Please contact support about this error";
    this.statusCode = 401;
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

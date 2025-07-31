class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong",
    error = [],
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.message = message;
    this.error = error;
    this.success = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  toJSON() {
    return {
      statusCode: this.statusCode,
      message: this.message,
      success: this.success,
      data: this.data,
      error: this.error,
    };
  }
}

module.exports = { ApiError };

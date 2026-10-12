export class ApiError extends Error {
  constructor(status, message, code, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.isOperational = true;
  }
  static badRequest(m = 'Bad request', code = 'BAD_REQUEST', d) { return new ApiError(400, m, code, d); }
  static unauthorized(m = 'Unauthorized', code = 'UNAUTHORIZED') { return new ApiError(401, m, code); }
  static forbidden(m = 'Forbidden', code = 'FORBIDDEN') { return new ApiError(403, m, code); }
  static notFound(m = 'Not found', code = 'NOT_FOUND') { return new ApiError(404, m, code); }
  static conflict(m = 'Conflict', code = 'CONFLICT', d) { return new ApiError(409, m, code, d); }
  static unprocessable(m = 'Unprocessable', code = 'UNPROCESSABLE', d) { return new ApiError(422, m, code, d); }
  static tooMany(m = 'Too many requests', code = 'RATE_LIMITED') { return new ApiError(429, m, code); }
}

/**
 * Error carrying an HTTP status code, so controllers can signal the exact
 * response the client should receive without formatting it themselves.
 */
export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }

  static badRequest(message) {
    return new ApiError(400, message);
  }

  static notFound(message) {
    return new ApiError(404, message);
  }
}

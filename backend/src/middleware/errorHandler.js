import { ApiError } from '../utils/ApiError.js';
import { sendError } from '../utils/response.js';

export function notFoundHandler(req, res) {
  return sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
}

// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return sendError(res, err.message, err.statusCode);
  }

  if (err instanceof SyntaxError && 'body' in err) {
    return sendError(res, 'Request body contains invalid JSON', 400);
  }

  console.error('Unhandled error:', err);
  return sendError(res, 'An unexpected error occurred', 500);
}

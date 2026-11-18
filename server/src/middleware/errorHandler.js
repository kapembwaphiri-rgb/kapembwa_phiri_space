import { validationResult } from 'express-validator';

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.expose = true;
  }
}

export function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
}

export function errorHandler(error, req, res, _next) {
  const status = Number.isInteger(error.status) && error.status >= 400 && error.status < 600
    ? error.status
    : error.code === '23505'
      ? 409
      : 500;

  console.error(JSON.stringify({
    event: 'http_request_failed',
    method: req.method,
    path: req.path,
    status,
    code: error.code || error.name || 'UNKNOWN'
  }));

  const message = status === 500
    ? 'An unexpected server error occurred.'
    : error.expose
      ? error.message
      : 'The request could not be completed.';

  res.status(status).json({ error: message });
}

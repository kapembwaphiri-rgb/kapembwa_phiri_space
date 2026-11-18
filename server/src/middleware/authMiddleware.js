import jwt from 'jsonwebtoken';
import { HttpError } from './errorHandler.js';

export function requireAuth(req, _res, next) {
  const authorization = req.get('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Authentication required.'));
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return next(new HttpError(503, 'Authentication is not configured.'));
  }

  try {
    req.user = jwt.verify(authorization.slice(7), secret);
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError || error instanceof jwt.TokenExpiredError) {
      return next(new HttpError(401, 'Invalid or expired session.'));
    }
    next(error);
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!roles.includes(req.user?.role)) {
      return next(new HttpError(403, 'Insufficient permissions.'));
    }
    next();
  };
}

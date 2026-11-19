import jwt from 'jsonwebtoken';
import { HttpError } from './errorHandler.js';
import { query } from '../config/db.js';

export function normalizeRole(role) {
  return String(role || '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
}

export function normalizeAuthRole(role) {
  const normalized = normalizeRole(role);
  if (normalized === 'SUPERADMIN' || normalized === 'PLATFORM_ADMIN') return 'SUPER_ADMIN';
  return normalized;
}

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
  return async (req, _res, next) => {
    const actualRole = normalizeAuthRole(req.user?.role);
    const allowedRoles = roles.map(normalizeAuthRole);
    if (allowedRoles.includes(actualRole)) {
      next();
      return;
    }

    // Refresh a valid staff session when the browser has a stale JWT or cached role.
    if (req.user?.id) {
      try {
        const result = await query(
          `SELECT role FROM users WHERE id = $1 AND active = TRUE LIMIT 1`,
          [req.user.id]
        );
        if (result.rows[0] && allowedRoles.includes(normalizeAuthRole(result.rows[0].role))) {
          req.user.role = normalizeAuthRole(result.rows[0].role);
          next();
          return;
        }
      } catch (error) {
        next(error);
        return;
      }
    }
    next(new HttpError(403, 'Insufficient permissions.'));
  };
}

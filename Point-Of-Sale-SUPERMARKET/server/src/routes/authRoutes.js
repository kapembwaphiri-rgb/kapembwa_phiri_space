import { Router } from 'express';
import { body } from 'express-validator';
import { rateLimit } from 'express-rate-limit';
import { validateRequest } from '../middleware/errorHandler.js';
import * as authController from '../controllers/authController.js';

const router = Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Try again later.' }
});
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Try again later.' }
});

router.post(
  '/login',
  loginLimiter,
  body('email').isEmail().normalizeEmail(),
  body('password').isString().isLength({ min: 1, max: 72 }),
  validateRequest,
  authController.login
);
router.post(
  '/register',
  registrationLimiter,
  body('name').isString().trim().isLength({ min: 2, max: 120 }),
  body('email').isEmail().normalizeEmail().isLength({ max: 160 }),
  body('password').isString().isLength({ min: 12, max: 72 }),
  validateRequest,
  authController.registerCustomer
);

export default router;

import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/errorHandler.js';
import * as salesController from '../controllers/salesController.js';

const router = Router();
router.post(
  '/',
  requireAuth,
  body('saleId').isUUID(),
  body('reason').isString().trim().isLength({ min: 1, max: 255 }),
  body('items').isArray({ min: 1, max: 100 }),
  body('items.*.productId').isUUID(),
  body('items.*.quantity').isInt({ min: 1, max: 1000 }),
  validateRequest,
  salesController.createReturn
);
export default router;

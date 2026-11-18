import { Router } from 'express';
import { body } from 'express-validator';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/errorHandler.js';
import * as salesController from '../controllers/salesController.js';
import { productSizeOptions } from '../utils/productSizes.js';

const router = Router();

router.post(
  '/',
  requireAuth,
  body('items').isArray({ min: 1, max: 100 }),
  body('items.*.productId').isUUID(),
  body('items.*.quantity').isInt({ min: 1, max: 1000 }),
  body('items.*.size').optional().isIn(productSizeOptions),
  body('paymentMethod').isIn(['CASH', 'CARD', 'MOBILE_MONEY', 'QR']),
  body('discountPercent').optional().isFloat({ min: 0, max: 100 }),
  body('customerName').optional().isString().isLength({ max: 120 }),
  body('reference').optional().isString().isLength({ max: 120 }),
  validateRequest,
  salesController.createSale
);

router.post(
  '/returns',
  requireAuth,
  body('saleId').isUUID(),
  body('reason').isString().trim().isLength({ min: 1, max: 255 }),
  body('items').isArray({ min: 1, max: 100 }),
  body('items.*.productId').isUUID(),
  body('items.*.quantity').isInt({ min: 1, max: 1000 }),
  body('items.*.size').optional().isIn(productSizeOptions),
  validateRequest,
  salesController.createReturn
);

export default router;

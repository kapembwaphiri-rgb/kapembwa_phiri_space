import { Router } from 'express';
import { body, query } from 'express-validator';
import { requireAuth } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/errorHandler.js';
import * as cartController from '../controllers/cartController.js';
import { productSizeOptions } from '../utils/productSizes.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  query('cartId').isUUID(),
  validateRequest,
  cartController.getCart
);
router.post(
  '/add',
  requireAuth,
  body('cartId').isUUID(),
  body('productId').isUUID(),
  body('quantity').isInt({ min: 1, max: 1000 }),
  body('size').optional().isIn(productSizeOptions),
  validateRequest,
  cartController.addItem
);
router.put(
  '/update',
  requireAuth,
  body('cartId').isUUID(),
  body('productId').isUUID(),
  body('quantity').isInt({ min: 1, max: 1000 }),
  body('size').optional().isIn(productSizeOptions),
  validateRequest,
  cartController.updateItem
);
router.delete(
  '/remove',
  requireAuth,
  body('cartId').isUUID(),
  body('productId').isUUID(),
  body('size').optional().isIn(productSizeOptions),
  validateRequest,
  cartController.removeItem
);
router.delete(
  '/',
  requireAuth,
  body('cartId').isUUID(),
  validateRequest,
  cartController.clearCart
);

export default router;

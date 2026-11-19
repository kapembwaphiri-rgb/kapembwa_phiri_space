import { Router } from 'express';
import { body, param } from 'express-validator';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/errorHandler.js';
import * as orderController from '../controllers/orderController.js';

const router = Router();

router.get('/', requireAuth, requireRole('CUSTOMER'), orderController.listOrders);
router.post(
  '/checkout',
  requireAuth,
  body('cartId').isUUID(),
  body('paymentMethod').isIn(['CARD', 'AIRTEL_MONEY', 'MTN_MOBILE_MONEY', 'CASH_ON_DELIVERY']),
  body('customer').optional().isObject(),
  body('customer.name').optional().isString().trim().isLength({ min: 2, max: 120 }),
  body('customerName').optional().isString().trim().isLength({ min: 2, max: 120 }),
  body('customer.email').optional({ nullable: true, checkFalsy: true }).isEmail().isLength({ max: 160 }),
  body('customer.phone').optional({ nullable: true }).isString().isLength({ max: 32 }),
  body('customer.address').optional({ nullable: true }).isString().isLength({ max: 500 }),
  validateRequest,
  orderController.checkout
);
router.get(
  '/:id',
  requireAuth,
  param('id').isUUID(),
  validateRequest,
  orderController.getOrder
);

export default router;

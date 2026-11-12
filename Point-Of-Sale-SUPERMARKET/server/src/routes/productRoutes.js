import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/errorHandler.js';
import * as productController from '../controllers/productController.js';

const router = Router();
const category = ['SHIRT', 'HOODIE', 'DESIGNER'];

router.get(
  '/',
  query('search').optional().isString().isLength({ max: 100 }),
  query('category').optional().isIn(category),
  validateRequest,
  productController.listProducts
);
router.get(
  '/:id',
  param('id').isUUID(),
  validateRequest,
  productController.getProduct
);
router.post(
  '/',
  requireAuth,
  requireRole('MANAGER', 'SUPER_ADMIN'),
  body('sku').isString().trim().isLength({ min: 1, max: 40 }),
  body('name').isString().trim().isLength({ min: 1, max: 160 }),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('category').isIn(category),
  body('price').isFloat({ min: 0 }),
  body('stock').isInt({ min: 0 }),
  body('reorder_level').optional().isInt({ min: 0 }),
  body('image_url').optional({ nullable: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }),
  validateRequest,
  productController.createProduct
);
router.put(
  '/:id',
  requireAuth,
  requireRole('MANAGER', 'SUPER_ADMIN'),
  param('id').isUUID(),
  body('sku').optional().isString().trim().isLength({ min: 1, max: 40 }),
  body('name').optional().isString().trim().isLength({ min: 1, max: 160 }),
  body('description').optional().isString().isLength({ max: 5000 }),
  body('category').optional().isIn(category),
  body('price').optional().isFloat({ min: 0 }),
  body('stock').optional().isInt({ min: 0 }),
  body('reorder_level').optional().isInt({ min: 0 }),
  body('image_url').optional({ nullable: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }),
  validateRequest,
  productController.updateProduct
);
router.delete(
  '/:id',
  requireAuth,
  requireRole('MANAGER', 'SUPER_ADMIN'),
  param('id').isUUID(),
  validateRequest,
  productController.deleteProduct
);

export default router;

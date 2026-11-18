import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/errorHandler.js';
import { uploadProductImages } from '../middleware/productImageUpload.js';
import * as productController from '../controllers/productController.js';
import { productSizeOptions } from '../utils/productSizes.js';

const router = Router();
const category = ['SHIRT', 'HOODIE', 'DESIGNER'];
const validateSizes = () => [
  body('sizes').optional().isArray({ min: 1, max: productSizeOptions.length }),
  body('sizes.*').optional().isObject(),
  body('sizes.*.size').optional().isIn(productSizeOptions),
  body('sizes.*.quantity').optional().isInt({ min: 0 }),
  body().custom((value) => {
    if (Array.isArray(value.sizes) || value.stock !== undefined) return true;
    throw new Error('Provide stock quantities by size.');
  })
];

router.post(
  '/images',
  requireAuth,
  requireRole('MANAGER', 'SUPER_ADMIN'),
  uploadProductImages,
  productController.uploadProductImages
);
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
  body('stock').optional().isInt({ min: 0 }),
  ...validateSizes(),
  body('reorder_level').optional().isInt({ min: 0 }),
  body('image_url').optional({ nullable: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }),
  body('images').optional().isArray({ max: 10 }),
  body('images.*').optional().isURL({ protocols: ['http', 'https'], require_protocol: true }),
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
  body('sizes').optional().isArray({ min: 1, max: productSizeOptions.length }),
  body('sizes.*').optional().isObject(),
  body('sizes.*.size').optional().isIn(productSizeOptions),
  body('sizes.*.quantity').optional().isInt({ min: 0 }),
  body('reorder_level').optional().isInt({ min: 0 }),
  body('image_url').optional({ nullable: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }),
  body('images').optional().isArray({ max: 10 }),
  body('images.*').optional().isURL({ protocols: ['http', 'https'], require_protocol: true }),
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

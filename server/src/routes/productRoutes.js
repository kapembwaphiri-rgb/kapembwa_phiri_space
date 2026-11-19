import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../middleware/errorHandler.js';
import {
  normalizeProductFormData,
  removeUploadedImageFiles,
  uploadProductImages
} from '../middleware/productImageUpload.js';
import * as productController from '../controllers/productController.js';
import { productSizeOptions } from '../utils/productSizes.js';

const router = Router();
const category = ['SHIRT', 'HOODIE', 'DESIGNER'];
const isImageReference = (value) => typeof value === 'string'
  && (value.startsWith('/uploads/products/') || /^https?:\/\//i.test(value));

async function validateProductRequest(request, response, next) {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    try {
      await removeUploadedImageFiles(request.files || []);
    } catch (error) {
      next(error);
      return;
    }
    response.status(400).json({ error: errors.array()[0].msg });
    return;
  }
  next();
}

const validateSizes = () => [
  body('sizes').optional().isArray({ min: 1, max: productSizeOptions.length }).withMessage('Provide valid size stock quantities.'),
  body('sizes.*').optional().isObject(),
  body('sizes.*.size').optional().isIn(productSizeOptions).withMessage('Choose a valid clothing size.'),
  body('sizes.*.quantity').optional().isInt({ min: 0 }).withMessage('Size quantities must be whole numbers of zero or more.'),
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
  uploadProductImages,
  normalizeProductFormData,
  body('sku').isString().trim().isLength({ min: 1, max: 40 }).withMessage('Provide a valid SKU.'),
  body('name').isString().trim().isLength({ min: 1, max: 160 }).withMessage('Provide a valid product name.'),
  body('description').optional({ checkFalsy: true }).isString().isLength({ max: 5000 }).withMessage('Description is too long.'),
  body('category').isIn(category).withMessage('Choose SHIRT, HOODIE, or DESIGNER.'),
  body('price').isFloat({ min: 0 }).withMessage('Enter a valid price.'),
  body('stock').optional().isInt({ min: 0 }),
  ...validateSizes(),
  body('reorder_level').optional({ checkFalsy: true }).isInt({ min: 0 }).withMessage('Enter a valid reorder level.'),
  body('image_url').optional({ nullable: true, checkFalsy: true }).isURL({ protocols: ['http', 'https'], require_protocol: true }).withMessage('The product cover image URL is invalid.'),
  body('images').optional({ checkFalsy: true }).isArray({ max: 10 }).withMessage('Upload no more than 10 product images.'),
  body('images.*').optional({ checkFalsy: true }).custom(isImageReference).withMessage('One or more product image paths are invalid.'),
  validateProductRequest,
  productController.createProduct
);
router.put(
  '/:id',
  requireAuth,
  requireRole('MANAGER', 'SUPER_ADMIN'),
  param('id').isUUID(),
  validateRequest,
  uploadProductImages,
  normalizeProductFormData,
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
  body('images.*').optional().custom(isImageReference),
  validateProductRequest,
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

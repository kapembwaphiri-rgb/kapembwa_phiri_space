import * as productService from '../services/productService.js';
import { HttpError } from '../middleware/errorHandler.js';
import { removeUploadedImageFiles } from '../middleware/productImageUpload.js';

export async function listProducts(req, res, next) {
  try {
    res.json({ products: await productService.listProducts({
      search: String(req.query.search || '').trim(),
      category: req.query.category
    }) });
  } catch (error) {
    next(error);
  }
}

export async function getProduct(req, res, next) {
  try {
    res.json({ product: await productService.getProduct(req.params.id) });
  } catch (error) {
    next(error);
  }
}

export function uploadProductImages(req, res, next) {
  if (!req.files?.length) {
    next(new HttpError(400, 'Choose at least one product image.'));
    return;
  }
  res.status(201).json({
    images: req.files.map((file) => `/uploads/products/${file.filename}`)
  });
}

export async function createProduct(req, res, next) {
  try {
    res.status(201).json({ product: await productService.createProduct(req.body) });
  } catch (error) {
    try {
      await removeUploadedImageFiles(req.files || []);
    } catch (cleanupError) {
      next(cleanupError);
      return;
    }
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    res.json({ product: await productService.updateProduct(req.params.id, req.body) });
  } catch (error) {
    try {
      await removeUploadedImageFiles(req.files || []);
    } catch (cleanupError) {
      next(cleanupError);
      return;
    }
    next(error);
  }
}

export async function deleteProduct(req, res, next) {
  try {
    await productService.deleteProduct(req.params.id);
    res.status(204).end();
  } catch (error) {
    next(error);
  }
}

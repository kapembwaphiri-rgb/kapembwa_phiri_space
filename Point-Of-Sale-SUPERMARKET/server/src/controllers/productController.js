import * as productService from '../services/productService.js';

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

export async function createProduct(req, res, next) {
  try {
    res.status(201).json({ product: await productService.createProduct(req.body) });
  } catch (error) {
    next(error);
  }
}

export async function updateProduct(req, res, next) {
  try {
    res.json({ product: await productService.updateProduct(req.params.id, req.body) });
  } catch (error) {
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

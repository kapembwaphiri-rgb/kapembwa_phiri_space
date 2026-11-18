import { randomUUID } from 'node:crypto';
import * as productRepository from '../repositories/productRepository.js';
import { HttpError } from '../middleware/errorHandler.js';
import { normalizeProductSizes } from '../utils/productSizes.js';

const categories = new Set(['SHIRT', 'HOODIE', 'DESIGNER']);

export async function listProducts(filters) {
  return productRepository.listProducts(filters);
}

export async function getProduct(id) {
  const product = await productRepository.findProductById(id);
  if (!product) throw new HttpError(404, 'Product not found.');
  return product;
}

export async function createProduct(input) {
  if (!categories.has(input.category)) {
    throw new HttpError(400, 'Category must be SHIRT, HOODIE, or DESIGNER.');
  }
  const images = input.images || (input.image_url ? [input.image_url] : []);
  return productRepository.createProduct({
    id: randomUUID(),
    sku: input.sku.trim(),
    name: input.name.trim(),
    description: input.description?.trim() || '',
    category: input.category,
    price: Number(input.price),
    imageUrl: images[0] || null,
    images,
    sizes: normalizeProductSizes(input),
    reorderLevel: Number(input.reorder_level ?? 10)
  });
}

export async function updateProduct(id, input) {
  const changes = {};
  if (input.sku !== undefined) changes.sku = input.sku.trim();
  if (input.name !== undefined) changes.name = input.name.trim();
  if (input.description !== undefined) changes.description = input.description.trim();
  if (input.category !== undefined) {
    if (!categories.has(input.category)) {
      throw new HttpError(400, 'Category must be SHIRT, HOODIE, or DESIGNER.');
    }
    changes.category = input.category;
  }
  if (input.price !== undefined) changes.price = Number(input.price);
  if (input.images !== undefined) {
    changes.images = input.images;
    changes.imageUrl = input.images[0] || null;
  } else if (input.image_url !== undefined) {
    changes.images = input.image_url ? [input.image_url] : [];
    changes.imageUrl = input.image_url || null;
  }
  if (input.stock !== undefined) changes.stock = Number(input.stock);
  if (input.sizes !== undefined) changes.sizes = normalizeProductSizes(input);
  if (input.reorder_level !== undefined) changes.reorderLevel = Number(input.reorder_level);

  const product = await productRepository.updateProduct(id, changes);
  if (!product) throw new HttpError(404, 'Product not found.');
  return product;
}

export async function deleteProduct(id) {
  const deleted = await productRepository.deactivateProduct(id);
  if (!deleted) throw new HttpError(404, 'Product not found.');
}

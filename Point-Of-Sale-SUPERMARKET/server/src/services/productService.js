import { randomUUID } from 'node:crypto';
import * as productRepository from '../repositories/productRepository.js';
import { HttpError } from '../middleware/errorHandler.js';

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
  return productRepository.createProduct({
    id: randomUUID(),
    sku: input.sku.trim(),
    name: input.name.trim(),
    description: input.description?.trim() || '',
    category: input.category,
    price: Number(input.price),
    imageUrl: input.image_url || null,
    stock: Number(input.stock),
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
  if (input.image_url !== undefined) changes.imageUrl = input.image_url || null;
  if (input.stock !== undefined) changes.stock = Number(input.stock);
  if (input.reorder_level !== undefined) changes.reorderLevel = Number(input.reorder_level);

  const product = await productRepository.updateProduct(id, changes);
  if (!product) throw new HttpError(404, 'Product not found.');
  return product;
}

export async function deleteProduct(id) {
  const deleted = await productRepository.deactivateProduct(id);
  if (!deleted) throw new HttpError(404, 'Product not found.');
}

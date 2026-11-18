import { HttpError } from '../middleware/errorHandler.js';
import * as cartRepository from '../repositories/cartRepository.js';
import { calculatePromotion } from './discountService.js';

async function buildCart(cartId) {
  const items = await cartRepository.getCartItems(cartId);
  const promotion = calculatePromotion(items);
  return {
    id: cartId,
    items,
    itemCount: items.reduce((total, item) => total + Number(item.quantity), 0),
    ...promotion
  };
}

export async function getCart(cartId) {
  return { cart: await buildCart(cartId) };
}

export async function addItem(cartId, productId, quantity, size = 'ONE_SIZE') {
  const result = await cartRepository.addItem(cartId, productId, quantity, size);
  if (result.error === 'not_found') throw new HttpError(404, 'Product not found.');
  if (result.error === 'size_unavailable') throw new HttpError(409, `The ${result.size} size is not available for ${result.productName}.`);
  if (result.error === 'insufficient_stock') {
    throw new HttpError(409, `Not enough ${result.size} stock available for ${result.productName}.`);
  }
  return { cart: await buildCart(cartId) };
}

export async function updateItem(cartId, productId, quantity, size = 'ONE_SIZE') {
  const result = await cartRepository.setItemQuantity(cartId, productId, quantity, size);
  if (result.error === 'not_found') throw new HttpError(404, 'Product not found.');
  if (result.error === 'cart_item_not_found') throw new HttpError(404, 'Cart item not found.');
  if (result.error === 'size_unavailable') throw new HttpError(409, `The ${result.size} size is not available for ${result.productName}.`);
  if (result.error === 'insufficient_stock') {
    throw new HttpError(409, `Not enough ${result.size} stock available for ${result.productName}.`);
  }
  return { cart: await buildCart(cartId) };
}

export async function removeItem(cartId, productId, size = 'ONE_SIZE') {
  const removed = await cartRepository.removeItem(cartId, productId, size);
  if (!removed) throw new HttpError(404, 'Cart item not found.');
  return { cart: await buildCart(cartId) };
}

export async function clearCart(cartId) {
  await cartRepository.clearItems(cartId);
  return { cart: await buildCart(cartId) };
}

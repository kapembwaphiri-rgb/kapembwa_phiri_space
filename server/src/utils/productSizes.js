import { HttpError } from '../middleware/errorHandler.js';

export const productSizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'ONE_SIZE'];

export function normalizeProductSizes(input) {
  const variants = Array.isArray(input.sizes)
    ? input.sizes
    : input.stock === undefined ? [] : [{ size: 'ONE_SIZE', quantity: Number(input.stock) }];
  if (!variants.length) throw new HttpError(400, 'Add at least one product size.');

  const seen = new Set();
  return variants.map((variant) => {
    const size = String(variant?.size || '').toUpperCase();
    const quantity = Number(variant?.quantity);
    if (!productSizeOptions.includes(size) || seen.has(size) || !Number.isInteger(quantity) || quantity < 0) {
      throw new HttpError(400, 'Choose valid, unique sizes and non-negative whole-number stock quantities.');
    }
    seen.add(size);
    return { size, quantity };
  });
}

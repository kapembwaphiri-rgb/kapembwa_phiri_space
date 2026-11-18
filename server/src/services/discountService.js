import { calculateDiscount } from '../utils/discountCalculator.js';

export function calculatePromotion(items) {
  return calculateDiscount(items);
}

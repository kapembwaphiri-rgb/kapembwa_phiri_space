import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeCartItems } from '../src/utils/cartSummary.js';

test('guest cart unlocks 20 percent only after more than three eligible items', () => {
  const threeItems = summarizeCartItems([
    { category: 'SHIRT', quantity: 3, price: 10 }
  ]);
  const fourItems = summarizeCartItems([
    { category: 'SHIRT', quantity: 2, price: 10 },
    { category: 'HOODIE', quantity: 2, price: 20 }
  ]);

  assert.equal(threeItems.discount, 0);
  assert.equal(threeItems.promotionApplied, false);
  assert.equal(fourItems.eligibleQuantity, 4);
  assert.equal(fourItems.subtotal, 60);
  assert.equal(fourItems.discount, 12);
  assert.equal(fourItems.total, 48);
  assert.equal(fourItems.promotionApplied, true);
});

test('guest discount threshold ignores designer items and rounds to cents', () => {
  const summary = summarizeCartItems([
    { category: 'SHIRT', quantity: 4, price: 19.99 },
    { category: 'DESIGNER', quantity: 1, price: 5 }
  ]);

  assert.equal(summary.eligibleQuantity, 4);
  assert.equal(summary.subtotal, 84.96);
  assert.equal(summary.discount, 16.99);
  assert.equal(summary.total, 67.97);
});

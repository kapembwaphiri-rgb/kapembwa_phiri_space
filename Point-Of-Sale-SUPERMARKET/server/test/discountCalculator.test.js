import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateDiscount } from '../src/utils/discountCalculator.js';

test('does not discount one shirt and one hoodie', () => {
  const result = calculateDiscount([
    { category: 'SHIRT', quantity: 1, price: 250 },
    { category: 'HOODIE', quantity: 1, price: 750 }
  ]);

  assert.equal(result.eligibleQuantity, 2);
  assert.equal(result.discount, 0);
  assert.equal(result.total, 1000);
  assert.equal(result.promotionApplied, false);
});

test('discounts mixed apparel by 20 percent after four eligible pieces', () => {
  const result = calculateDiscount([
    { category: 'SHIRT', quantity: 2, price: 100 },
    { category: 'HOODIE', quantity: 2, price: 400 }
  ]);

  assert.equal(result.eligibleQuantity, 4);
  assert.equal(result.subtotal, 1000);
  assert.equal(result.discount, 200);
  assert.equal(result.total, 800);
  assert.equal(result.promotionApplied, true);
});

test('discounts five shirts and rounds to currency cents', () => {
  const result = calculateDiscount([
    { category: 'SHIRT', quantity: 5, price: 19.99 }
  ]);

  assert.equal(result.eligibleQuantity, 5);
  assert.equal(result.discount, 19.99);
  assert.equal(result.total, 79.96);
});

test('does not include non-apparel quantities in the promotion threshold', () => {
  const result = calculateDiscount([
    { category: 'SHIRT', quantity: 3, price: 100 },
    { category: 'OTHER', quantity: 10, price: 50 }
  ]);

  assert.equal(result.eligibleQuantity, 3);
  assert.equal(result.discount, 0);
  assert.equal(result.subtotal, 800);
});

test('designer clothing does not count toward the apparel promotion threshold', () => {
  const result = calculateDiscount([
    { category: 'SHIRT', quantity: 3, price: 100 },
    { category: 'DESIGNER', quantity: 4, price: 200 }
  ]);

  assert.equal(result.eligibleQuantity, 3);
  assert.equal(result.discount, 0);
  assert.equal(result.subtotal, 1100);
});

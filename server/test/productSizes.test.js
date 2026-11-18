import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeProductSizes } from '../src/utils/productSizes.js';

test('normalizes distinct size stock quantities', () => {
  assert.deepEqual(normalizeProductSizes({
    sizes: [
      { size: 's', quantity: '3' },
      { size: 'XL', quantity: 1 }
    ]
  }), [
    { size: 'S', quantity: 3 },
    { size: 'XL', quantity: 1 }
  ]);
});

test('rejects duplicate sizes and invalid stock quantities', () => {
  assert.throws(() => normalizeProductSizes({
    sizes: [{ size: 'M', quantity: 1 }, { size: 'M', quantity: 2 }]
  }), (error) => error.status === 400);
  assert.throws(() => normalizeProductSizes({
    sizes: [{ size: 'S', quantity: -1 }]
  }), (error) => error.status === 400);
});

test('preserves older product requests as one-size inventory', () => {
  assert.deepEqual(normalizeProductSizes({ stock: 5 }), [{ size: 'ONE_SIZE', quantity: 5 }]);
});

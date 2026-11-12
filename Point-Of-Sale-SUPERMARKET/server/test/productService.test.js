import test from 'node:test';
import assert from 'node:assert/strict';
import { createProduct } from '../src/services/productService.js';

test('rejects product categories outside shirts and hoodies', async () => {
  await assert.rejects(
    createProduct({
      sku: 'TEST-001',
      name: 'Test item',
      category: 'GROCERY',
      price: 10,
      stock: 1
    }),
    (error) => error.status === 400
  );
});

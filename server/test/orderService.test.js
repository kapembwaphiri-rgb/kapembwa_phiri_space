import test from 'node:test';
import assert from 'node:assert/strict';
import { checkout } from '../src/services/orderService.js';

test('checkout rejects online payment until a provider is configured', async () => {
  await assert.rejects(
    checkout({ paymentMethod: 'CARD' }),
    (error) => error.status === 503 && /Online payments are not configured/.test(error.message)
  );
});

test('checkout rejects unsupported payment methods', async () => {
  await assert.rejects(
    checkout({ paymentMethod: 'CHEQUE' }),
    (error) => error.status === 400 && /supported payment method/.test(error.message)
  );
});

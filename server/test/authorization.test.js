import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeAuthRole, normalizeRole } from '../src/middleware/authMiddleware.js';

test('normalizes staff role variants', () => {
  assert.equal(normalizeRole(' super admin '), 'SUPER_ADMIN');
  assert.equal(normalizeRole('SUPER-ADMIN'), 'SUPER_ADMIN');
  assert.equal(normalizeAuthRole('Super Admin'), 'SUPER_ADMIN');
  assert.equal(normalizeAuthRole('SUPERADMIN'), 'SUPER_ADMIN');
  assert.equal(normalizeAuthRole('Platform Admin'), 'SUPER_ADMIN');
  assert.equal(normalizeAuthRole('manager'), 'MANAGER');
});

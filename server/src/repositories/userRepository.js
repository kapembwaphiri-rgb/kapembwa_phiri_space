import { query } from '../config/db.js';

export async function findActiveUserByEmail(email) {
  const result = await query(
    `SELECT id, name, email, password_hash, role
       FROM users
      WHERE LOWER(email) = LOWER($1) AND active = TRUE
      LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
}

export async function findActiveCustomerAccountByEmail(email) {
  const result = await query(
    `SELECT id, name, email, password_hash, 'CUSTOMER' AS role
       FROM customer_accounts
      WHERE LOWER(email) = LOWER($1) AND active = TRUE
      LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
}

export async function emailExists(email) {
  const result = await query(
    `SELECT EXISTS (
       SELECT 1 FROM users WHERE LOWER(email) = LOWER($1)
       UNION ALL
       SELECT 1 FROM customer_accounts WHERE LOWER(email) = LOWER($1)
     ) AS exists`,
    [email]
  );
  return result.rows[0].exists;
}

export async function createCustomerAccount({ id, name, email, passwordHash }) {
  const result = await query(
    `INSERT INTO customer_accounts (id, name, email, password_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT DO NOTHING
     RETURNING id, name, email, 'CUSTOMER' AS role`,
    [id, name, email, passwordHash]
  );
  return result.rows[0] || null;
}

export async function getProfile(id, role) {
  const table = role === 'CUSTOMER' ? 'customer_accounts' : 'users';
  const roleColumn = role === 'CUSTOMER' ? "'CUSTOMER'" : 'role';
  const result = await query(
    `SELECT id, name, email, ${roleColumn} AS role, phone, profile_photo, created_at
       FROM ${table}
      WHERE id = $1 AND active = TRUE
      LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function updateProfile(id, role, { name, phone }) {
  const table = role === 'CUSTOMER' ? 'customer_accounts' : 'users';
  const roleColumn = role === 'CUSTOMER' ? "'CUSTOMER'" : 'role';
  const result = await query(
    `UPDATE ${table}
        SET name = $2, phone = $3
      WHERE id = $1 AND active = TRUE
      RETURNING id, name, email, ${roleColumn} AS role, phone, profile_photo, created_at`,
    [id, name, phone]
  );
  return result.rows[0] || null;
}

export async function updateProfilePhoto(id, role, profilePhoto) {
  const table = role === 'CUSTOMER' ? 'customer_accounts' : 'users';
  const roleColumn = role === 'CUSTOMER' ? "'CUSTOMER'" : 'role';
  const result = await query(
    `UPDATE ${table}
        SET profile_photo = $2
      WHERE id = $1 AND active = TRUE
      RETURNING id, name, email, ${roleColumn} AS role, phone, profile_photo, created_at`,
    [id, profilePhoto]
  );
  return result.rows[0] || null;
}

export async function getPasswordHash(id, role) {
  const table = role === 'CUSTOMER' ? 'customer_accounts' : 'users';
  const result = await query(
    `SELECT password_hash FROM ${table} WHERE id = $1 AND active = TRUE LIMIT 1`,
    [id]
  );
  return result.rows[0]?.password_hash || null;
}

export async function updatePassword(id, role, passwordHash) {
  const table = role === 'CUSTOMER' ? 'customer_accounts' : 'users';
  const result = await query(
    `UPDATE ${table} SET password_hash = $2 WHERE id = $1 AND active = TRUE RETURNING id`,
    [id, passwordHash]
  );
  return Boolean(result.rows[0]);
}

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

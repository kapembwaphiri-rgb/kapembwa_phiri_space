import { Pool } from 'pg';

let pool;

function getDatabaseConfig() {
  const required = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) {
    throw new Error(`Missing database configuration: ${missing.join(', ')}`);
  }

  const port = Number(process.env.DB_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DB_PORT must be a valid TCP port.');
  }

  return {
    host: process.env.DB_HOST,
    port,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
    max: Number(process.env.DB_POOL_SIZE || 10),
    ...(process.env.DB_SSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {})
  };
}

export function getPool() {
  if (!pool) {
    pool = new Pool(getDatabaseConfig());
    pool.on('error', (error) => {
      console.error(JSON.stringify({
        event: 'postgres_pool_error',
        code: error.code || 'UNKNOWN'
      }));
    });
  }
  return pool;
}

export function query(text, values) {
  return getPool().query(text, values);
}

export async function withTransaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error(JSON.stringify({
        event: 'postgres_rollback_failed',
        code: rollbackError.code || 'UNKNOWN'
      }));
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function testConnection() {
  await query('SELECT 1');
  console.info(JSON.stringify({ event: 'postgres_connection_ready' }));
}

export async function closePool() {
  if (pool) {
    const currentPool = pool;
    pool = undefined;
    await currentPool.end();
  }
}

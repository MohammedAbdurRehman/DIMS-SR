const { Pool } = require('pg');
require('dotenv').config();

/**
 * PostgreSQL Database Connection Pool
 * Implements connection pooling for better performance
 */

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'dims_user',
  password: process.env.DB_PASSWORD || 'secure_password',
  database: process.env.DB_NAME || 'dims_sr_db',
  max: 20, // Maximum number of clients in pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

/**
 * Event handlers for pool
 */
pool.on('connect', () => {
  console.log('[DB] Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[DB Error] Unexpected error on idle client:', err);
});

/**
 * Query execution with error handling
 */
const query = async (text, params = []) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('[DB] Executed query:', { text, duration: `${duration}ms` });
    return result;
  } catch (error) {
    console.error('[DB Error]', error);
    throw error;
  }
};

/**
 * Transaction support
 */
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get single row
 */
const getOne = async (text, params = []) => {
  const result = await query(text, params);
  return result.rows[0] || null;
};

/**
 * Get multiple rows
 */
const getAll = async (text, params = []) => {
  const result = await query(text, params);
  return result.rows;
};

/**
 * Check if database is connected
 */
const isConnected = async () => {
  try {
    await pool.query('SELECT NOW()');
    return true;
  } catch (error) {
    console.error('[DB] Connection check failed:', error);
    return false;
  }
};

/**
 * Close connection pool
 */
const close = async () => {
  await pool.end();
  console.log('[DB] Connection pool closed');
};

module.exports = {
  pool,
  query,
  transaction,
  getOne,
  getAll,
  isConnected,
  close,
};

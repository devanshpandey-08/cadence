import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://cadence:cadence_dev_password_change_in_prod@localhost:5432/cadence_enterprise',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 2000, // How long to wait when connecting a new client
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

pool.on('connect', () => {
  console.log('Database connection established');
});

/**
 * Initialize database with RLS policies and extensions
 */
export async function initializeDatabase() {
  try {
    // Enable required extensions
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "pg_trgm";
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    `);

    console.log('Database extensions enabled');

    // Set application name for tracking
    await pool.query(`SET application_name = 'cadence_api'`);

    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

/**
 * Graceful shutdown
 */
export async function closePool() {
  await pool.end();
  console.log('Database pool closed');
}

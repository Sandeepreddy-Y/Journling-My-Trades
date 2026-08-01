const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load .env relative to server directory
const serverEnvPath = path.resolve(__dirname, '../.env');
const rootEnvPath = path.resolve(__dirname, '../../.env');

if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

const { Pool } = require('pg');

let pool = null;
let dbType = 'none';

const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

const initDb = async () => {
  if (dbType !== 'none') return;

  console.log('[DB] ── Environment Audit ──');
  console.log(`[DB] NODE_ENV     : ${process.env.NODE_ENV || 'not set (defaults to development)'}`);
  console.log(`[DB] DATABASE_URL : ${databaseUrl ? '✓ Present (' + databaseUrl.split('@')[1]?.split('/')[0] + ')' : '✗ MISSING'}`);

  // ── PRODUCTION: Strict PostgreSQL only, no fallback ──
  if (isProduction) {
    if (!databaseUrl) {
      const msg = '[FATAL] DATABASE_URL is not set. Production requires PostgreSQL. Server cannot start.';
      console.error(msg);
      throw new Error(msg);
    }

    console.log('[DB] Production mode: connecting strictly to PostgreSQL...');
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 10000,
    });

    const client = await pool.connect();
    const info = await client.query('SELECT current_database() AS db, version()');
    console.log(`[DB] ✅ Connected to PostgreSQL: "${info.rows[0].db}"`);
    console.log(`[DB] Version: ${info.rows[0].version.split(',')[0]}`);
    client.release();
    dbType = 'pg';
    return;
  }

  // ── DEVELOPMENT: Try PostgreSQL first, fallback to PGlite ──
  if (databaseUrl && !databaseUrl.startsWith('pglite')) {
    console.log('[DB] Dev mode: attempting PostgreSQL connection...');
    try {
      pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false,
        connectionTimeoutMillis: 5000,
      });
      const client = await pool.connect();
      console.log('[DB] ✅ Dev PostgreSQL connected');
      client.release();
      dbType = 'pg';
      return;
    } catch (err) {
      console.warn('[DB] Dev PostgreSQL failed:', err.message);
      console.log('[DB] Falling back to PGlite for local development...');
      pool = null;
    }
  }

  // PGlite fallback — local dev only
  const { PGlite } = require('@electric-sql/pglite');
  const pglite = new PGlite();
  // Wrap PGlite to match pg Pool interface
  pool = {
    query: async (text, params = []) => {
      try {
        const res = await pglite.query(text, params);
        return { rows: res.rows || [] };
      } catch (err) {
        if (!params || params.length === 0) {
          const res = await pglite.exec(text);
          const last = Array.isArray(res) ? res[res.length - 1] : res;
          return { rows: last?.rows || [] };
        }
        throw err;
      }
    },
  };
  dbType = 'pglite';
  console.log('[DB] ✅ PGlite initialized for local dev');
};

const query = async (text, params = []) => {
  if (dbType === 'none') {
    await initDb();
  }
  if (!pool) {
    throw new Error('[DB] No database connection available');
  }
  return pool.query(text, params);
};

module.exports = {
  query,
  get pool() { return pool; },
  get dbType() { return dbType; },
  initDb,
};

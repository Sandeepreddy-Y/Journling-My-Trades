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
const { PGlite } = require('@electric-sql/pglite');

let pool = null;
let pgliteInstance = null;
let dbType = 'none';

const initDb = async () => {
  if (dbType !== 'none') return;

  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && !databaseUrl.startsWith('pglite')) {
    console.log('[DB] Attempting connection to PostgreSQL Pool via DATABASE_URL...');
    try {
      pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('neon.tech') || process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
        connectionTimeoutMillis: 3000,
      });

      const client = await pool.connect();
      console.log('[DB] ✅ Connected successfully to PostgreSQL Database Server');
      client.release();
      dbType = 'pg';
      return;
    } catch (err) {
      console.error('[DB WARNING] Could not connect to external PostgreSQL server:', err.message);
      console.log('[DB] Initializing embedded PostgreSQL 16 Engine (PGlite) for reliable local operation...');
    }
  }

  // Standalone PostgreSQL 16 engine using PGlite
  console.log('[DB] Initializing embedded PostgreSQL 16 Engine (PGlite)...');
  pgliteInstance = new PGlite();
  dbType = 'pglite';
  console.log('[DB] ✅ Embedded PostgreSQL 16 Database initialized successfully');
};

const query = async (text, params = []) => {
  if (dbType === 'none') {
    await initDb();
  }

  if (dbType === 'pg' && pool) {
    return pool.query(text, params);
  }

  if (dbType === 'pglite' && pgliteInstance) {
    try {
      const res = await pgliteInstance.query(text, params);
      return { rows: res.rows || [] };
    } catch (err) {
      if (!params || params.length === 0) {
        const res = await pgliteInstance.exec(text);
        const lastResult = Array.isArray(res) ? res[res.length - 1] : res;
        return { rows: lastResult?.rows || [] };
      }
      throw err;
    }
  }

  throw new Error('[DB ERROR] PostgreSQL database connection unavailable');
};

module.exports = {
  query,
  get pool() {
    return pool;
  },
  get dbType() {
    return dbType;
  },
  initDb,
};

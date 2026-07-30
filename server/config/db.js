const { Pool } = require('pg');

// ── PostgreSQL Pool Configuration ──
let pool = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes('neon.tech') || process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  });

  pool.on('connect', () => {
    console.log('[DB] Connected to PostgreSQL Database');
  });

  pool.on('error', (err) => {
    console.error('[DB Error]', err);
  });
}

// ── In-Memory Store (Isolated Multi-User Local Store) ──
const memoryDb = {
  users: [],
  trades: [],
  sessions: [],
  uploads: [],
  journals: [],
};

module.exports = {
  query: async (text, params) => {
    if (pool) {
      return pool.query(text, params);
    }
    throw new Error('Database pool not initialized. Using memory store.');
  },
  pool,
  memoryDb,
};

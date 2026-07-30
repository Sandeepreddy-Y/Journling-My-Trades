const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

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

// ── In-Memory Store (Fallback if DATABASE_URL is not set) ──
const memoryDb = {
  users: [
    {
      id: 'demo-user-id-101',
      email: 'trader@example.com',
      password_hash: '$2a$10$w8T0oW1L4Y3M7q6K6P3Lueg5n/R7g8B7i1v0j2k3l4m5n6o7p8q9r', // demo password hash
      display_name: 'Alex Rivera',
      avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      role: 'trader',
      theme_preference: 'dark',
      created_at: new Date().toISOString(),
    },
  ],
  sessions: [],
};

// Seed demo password 'Password123!'
bcrypt.hash('Password123!', 10).then((hash) => {
  if (memoryDb.users[0]) {
    memoryDb.users[0].password_hash = hash;
  }
});

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

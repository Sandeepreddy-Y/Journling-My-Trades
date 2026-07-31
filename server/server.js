const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const propFirmRoutes = require('./routes/propFirmRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const strategyRoutes = require('./routes/strategyRoutes');
const rateLimiter = require('./middleware/rateLimiter');
const { pool } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security & Logging Middleware ──
app.use(helmet());
app.use(morgan('dev'));

// ── CORS — allow both local dev and deployed frontend ──
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      // Allow any Vercel preview/production deployments
      if (origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      return callback(null, true); // permissive for now
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ── Root Endpoint ──
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    name: 'TradeTrack Pro API Server',
    version: '1.0.0',
    database: pool ? 'PostgreSQL Connected' : 'In-Memory (No DATABASE_URL)',
    documentation: '/api',
    health: '/health',
    timestamp: new Date().toISOString(),
  });
});

// ── Health Check Endpoint ──
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'TradeTrack Pro API Server is operational',
    database: pool ? 'connected' : 'memory',
    timestamp: new Date().toISOString(),
  });
});

// ── Rate Limiter for Auth Routes ──
const authLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 50 });
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// ── Mount API Routes ──
app.use('/api/auth', authRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/prop-firm', propFirmRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/strategies', strategyRoutes);

// ── Root API Info ──
app.get('/api', (req, res) => {
  res.status(200).json({
    name: 'TradeTrack Pro API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      trades: '/api/trades',
      analytics: '/api/analytics',
      propFirm: '/api/prop-firm',
      upload: '/api/upload',
      strategies: '/api/strategies',
    },
  });
});

// ── 404 Handler ──
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Cannot find ${req.originalUrl} on this server`,
  });
});

// ── Global Error Handler ──
app.use((err, req, res, next) => {
  console.error('[Error]', err.stack);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Internal Server Error',
  });
});

// ── Auto-Initialize Database Tables ──
const initializeDatabase = async () => {
  if (!pool) {
    console.log('[DB] No DATABASE_URL set — running with in-memory store.');
    return;
  }

  try {
    // Create users table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        avatar_url TEXT,
        role VARCHAR(20) NOT NULL DEFAULT 'trader',
        theme_preference VARCHAR(10) DEFAULT 'dark',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create sessions table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create trades table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS trades (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        broker VARCHAR(100) DEFAULT 'MetaTrader 5',
        account_name VARCHAR(100) DEFAULT 'Default Account',
        symbol VARCHAR(30) NOT NULL,
        asset_class VARCHAR(30) NOT NULL DEFAULT 'forex',
        direction VARCHAR(10) NOT NULL,
        entry_price NUMERIC(18, 8) NOT NULL,
        exit_price NUMERIC(18, 8),
        lot_size NUMERIC(12, 4),
        stop_loss NUMERIC(18, 8),
        take_profit NUMERIC(18, 8),
        risk_amount NUMERIC(15, 2),
        reward_amount NUMERIC(15, 2),
        risk_percent NUMERIC(5, 2),
        reward_percent NUMERIC(5, 2),
        risk_reward NUMERIC(6, 2),
        before_screenshot TEXT,
        after_screenshot TEXT,
        entry_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        exit_time TIMESTAMPTZ,
        fees NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        swap NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        pnl NUMERIC(15, 2),
        pnl_pips NUMERIC(12, 2),
        outcome VARCHAR(20),
        emotion VARCHAR(50),
        rating INTEGER,
        notes TEXT,
        session VARCHAR(30),
        setup_tag VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'closed',
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[DB] ✅ Database tables verified/created successfully.');
  } catch (error) {
    console.error('[DB] ⚠️  Table initialization error:', error.message);
  }
};

// ── Start Server ──
if (process.env.NODE_ENV !== 'test') {
  initializeDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`
      🚀 TradeTrack Pro API Server running on port ${PORT}
      🔗 Root: http://localhost:${PORT}/
      🔑 Auth: http://localhost:${PORT}/api/auth
      📈 Trades: http://localhost:${PORT}/api/trades
      🗄️  Database: ${pool ? 'PostgreSQL' : 'In-Memory'}
      `);
    });
  });
}

module.exports = app;

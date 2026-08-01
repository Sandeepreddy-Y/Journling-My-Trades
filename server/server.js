const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const http = require('http');

// Load .env relative to server directory
const serverEnvPath = path.resolve(__dirname, '.env');
const rootEnvPath = path.resolve(__dirname, '../.env');

if (fs.existsSync(serverEnvPath)) {
  dotenv.config({ path: serverEnvPath });
} else if (fs.existsSync(rootEnvPath)) {
  dotenv.config({ path: rootEnvPath });
} else {
  dotenv.config();
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const propFirmRoutes = require('./routes/propFirmRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const strategyRoutes = require('./routes/strategyRoutes');
const syncRoutes = require('./routes/syncRoutes');
const rateLimiter = require('./middleware/rateLimiter');
const { query, initDb, dbType } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Environment Variable Audit (runs on startup) ──
console.log('\n========================================');
console.log('🔍 ENVIRONMENT VARIABLE AUDIT');
console.log('========================================');
console.log(`NODE_ENV     : ${process.env.NODE_ENV || 'not set'}`);
console.log(`PORT         : ${PORT}`);
console.log(`DATABASE_URL : ${process.env.DATABASE_URL ? '✓ Present' : '✗ MISSING'}`);
console.log(`JWT_SECRET   : ${process.env.JWT_SECRET ? '✓ Present' : '✗ MISSING'}`);
console.log(`CLIENT_URL   : ${process.env.CLIENT_URL || '✗ not set'}`);
console.log('========================================\n');

// Create HTTP Server & Attach Socket.IO
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    credentials: true,
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log('[Socket.IO] Client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('[Socket.IO] Client disconnected:', socket.id);
  });
});

// ── Security & Logging Middleware ──
app.use(helmet());
app.use(morgan('dev'));

// ── CORS — allow localhost, vercel.app, and CLIENT_URL ──
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (server-to-server, curl, mobile apps)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith('.vercel.app')) {
        return callback(null, true);
      }
      console.warn('[CORS] Blocked origin:', origin);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
  })
);

// Explicit preflight handler
app.options('*', cors());

app.use(cookieParser());
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ── Root Endpoint ──
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    name: 'TradeTrack Pro API Server',
    version: '1.0.0',
    database: 'PostgreSQL Connected',
    realtime: 'Socket.IO Active',
    health: '/health',
    timestamp: new Date().toISOString(),
  });
});

// ── Health Check Endpoint ──
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'TradeTrack Pro API Server is operational',
    database: 'postgresql',
    realtime: 'active',
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
app.use('/api/sync', syncRoutes);

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
      sync: '/api/sync',
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

// ── Initialize Database & Start Server ──
const initializeDatabase = async () => {
  // This will throw in production if DATABASE_URL is missing or connection fails
  await initDb();

  // Run schema (CREATE TABLE IF NOT EXISTS — safe to run repeatedly)
  const schemaSql = fs.readFileSync(path.resolve(__dirname, './models/schema.sql'), 'utf8');
  await query(schemaSql);
  console.log('[DB] ✅ Schema tables verified/created.');

  // Verify users table
  try {
    const check = await query('SELECT COUNT(*) as count FROM users');
    console.log(`[DB] ✅ Users table verified. Current user count: ${check.rows[0].count}`);
  } catch (err) {
    console.error('[DB] ❌ Users table check failed:', err.message);
    throw err;
  }
};

// ── Start Server ──
if (process.env.NODE_ENV !== 'test') {
  initializeDatabase()
    .then(() => {
      server.listen(PORT, () => {
        console.log(`
      🚀 TradeTrack Pro API Server running on port ${PORT}
      🔗 Root: http://localhost:${PORT}/
      🔑 Auth: http://localhost:${PORT}/api/auth
      📈 Trades: http://localhost:${PORT}/api/trades
      ⚡ Sync: http://localhost:${PORT}/api/sync
      🗄️  Database: PostgreSQL (strict mode)
        `);
      });
    })
    .catch((err) => {
      console.error('[FATAL] Server startup failed:', err.message);
      process.exit(1);
    });
}

module.exports = app;

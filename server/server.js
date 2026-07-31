const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const propFirmRoutes = require('./routes/propFirmRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const strategyRoutes = require('./routes/strategyRoutes');
const rateLimiter = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security & Logging Middleware ──
app.use(helmet());
app.use(morgan('dev'));
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// ── Root Endpoint ──
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    name: 'TradeTrack Pro API Server',
    version: '1.0.0',
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
    timestamp: new Date().toISOString(),
  });
});

// ── Rate Limiter for Auth Routes ──
const authLimiter = rateLimiter({ windowMs: 15 * 60 * 1000, max: 20 });
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

// ── Start Server ──
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`
      🚀 TradeTrack Pro API Server running on port ${PORT}
      🔗 Root Endpoint: http://localhost:${PORT}/
      🔗 Health Check: http://localhost:${PORT}/health
      🔑 Auth Endpoints: http://localhost:${PORT}/api/auth
      📈 Trade Endpoints: http://localhost:${PORT}/api/trades
      ⚡ Strategy Endpoints: http://localhost:${PORT}/api/strategies
    `);
  });
}

module.exports = app;

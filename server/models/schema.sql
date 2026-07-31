-- ====================================================================
-- TradeTrack Pro — Complete PostgreSQL Database Schema
-- Production-grade schema with Primary Keys, Foreign Keys, Indexes,
-- Check Constraints, Unique Constraints.
-- ====================================================================

-- ── Drop Existing Tables (Cascade for clean setup) ──
DROP TABLE IF EXISTS trade_sync_history CASCADE;
DROP TABLE IF EXISTS sync_logs CASCADE;
DROP TABLE IF EXISTS sync_sessions CASCADE;
DROP TABLE IF EXISTS broker_accounts CASCADE;
DROP TABLE IF EXISTS trade_screenshots CASCADE;
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS psychology_journal CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ====================================================================
-- 1. USERS TABLE
-- Stores authenticated trader credentials and user profiles
-- ====================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'trader' CHECK (role IN ('trader', 'admin')),
  theme_preference VARCHAR(10) DEFAULT 'dark' CHECK (theme_preference IN ('dark', 'light')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);

-- ====================================================================
-- 2. ACCOUNTS TABLE
-- Supports Prop Firm, Live, Demo, and Challenge trading accounts
-- ====================================================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_name VARCHAR(100) NOT NULL,
  broker VARCHAR(100),
  account_type VARCHAR(30) NOT NULL DEFAULT 'live' CHECK (account_type IN ('live', 'demo', 'prop_firm', 'challenge')),
  initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 10000.00 CHECK (initial_balance >= 0),
  current_balance NUMERIC(15, 2) NOT NULL DEFAULT 10000.00,
  currency VARCHAR(10) NOT NULL DEFAULT 'USD',
  prop_firm_name VARCHAR(100),
  max_daily_drawdown_percent NUMERIC(5, 2) CHECK (max_daily_drawdown_percent BETWEEN 0 AND 100),
  max_total_drawdown_percent NUMERIC(5, 2) CHECK (max_total_drawdown_percent BETWEEN 0 AND 100),
  profit_target NUMERIC(15, 2) CHECK (profit_target >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'passed', 'failed', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

-- ====================================================================
-- 3. SESSIONS TABLE
-- Stores JWT authentication sessions & refresh tokens
-- ====================================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address VARCHAR(45),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- ====================================================================
-- 4. TRADES TABLE
-- Core table storing detailed trade executions, asset classes, and metrics
-- ====================================================================
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  broker VARCHAR(100) DEFAULT 'MetaTrader 5',
  account_name VARCHAR(100) DEFAULT 'Default Account',
  symbol VARCHAR(30) NOT NULL,
  asset_class VARCHAR(30) NOT NULL DEFAULT 'forex' CHECK (asset_class IN ('forex', 'crypto', 'indices', 'commodities', 'stocks')),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('long', 'short', 'buy', 'sell')),
  entry_price NUMERIC(18, 8) NOT NULL CHECK (entry_price > 0),
  exit_price NUMERIC(18, 8) CHECK (exit_price > 0),
  lot_size NUMERIC(12, 4) NOT NULL CHECK (lot_size > 0),
  stop_loss NUMERIC(18, 8) CHECK (stop_loss > 0),
  take_profit NUMERIC(18, 8) CHECK (take_profit > 0),
  risk_amount NUMERIC(15, 2),
  reward_amount NUMERIC(15, 2),
  risk_percent NUMERIC(5, 2),
  reward_percent NUMERIC(5, 2),
  risk_reward NUMERIC(6, 2),
  before_screenshot TEXT,
  after_screenshot TEXT,
  entry_time TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  exit_time TIMESTAMPTZ,
  fees NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (fees >= 0),
  swap NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  pnl NUMERIC(15, 2),
  pnl_pips NUMERIC(12, 2),
  outcome VARCHAR(20) CHECK (outcome IN ('win', 'loss', 'breakeven', 'open')),
  emotion VARCHAR(50) CHECK (emotion IN ('confident', 'fomo', 'anxious', 'disciplined', 'greedy', 'neutral', 'revenge', 'fearful')),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  notes TEXT,
  session VARCHAR(30) CHECK (session IN ('london', 'new_york', 'tokyo', 'sydney', 'overlap', 'off_hours')),
  setup_tag VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'closed' CHECK (status IN ('open', 'closed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_exit_after_entry CHECK (exit_time IS NULL OR exit_time >= entry_time)
);

CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_account_id ON trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
CREATE INDEX IF NOT EXISTS idx_trades_entry_time ON trades(entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_trades_outcome ON trades(outcome);
CREATE INDEX IF NOT EXISTS idx_trades_asset_class ON trades(asset_class);
CREATE INDEX IF NOT EXISTS idx_trades_session ON trades(session);
CREATE INDEX IF NOT EXISTS idx_trades_setup_tag ON trades(setup_tag);

-- ====================================================================
-- 5. TRADE SCREENSHOTS TABLE
-- Chart screenshots uploaded to Cloudinary associated with trades
-- ====================================================================
CREATE TABLE trade_screenshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id UUID NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  public_id VARCHAR(255),
  timeframe VARCHAR(10) CHECK (timeframe IN ('1M', '5M', '15M', '1H', '4H', '1D', '1W')),
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trade_screenshots_trade_id ON trade_screenshots(trade_id);

-- ====================================================================
-- 6. PSYCHOLOGY JOURNAL TABLE
-- Daily psychological tracking, pre/post market notes, and discipline scores
-- ====================================================================
CREATE TABLE psychology_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  journal_date DATE NOT NULL,
  mindset_score INTEGER NOT NULL CHECK (mindset_score BETWEEN 1 AND 10),
  discipline_score INTEGER NOT NULL CHECK (discipline_score BETWEEN 1 AND 10),
  pre_market_notes TEXT,
  post_market_notes TEXT,
  mistakes_made TEXT[],
  lessons_learned TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_journal_date UNIQUE (user_id, journal_date)
);

CREATE INDEX IF NOT EXISTS idx_psychology_user_id ON psychology_journal(user_id);
CREATE INDEX IF NOT EXISTS idx_psychology_date ON psychology_journal(journal_date DESC);

-- ====================================================================
-- 7. BROKER ACCOUNTS TABLE (MT5 REAL-TIME AUTO SYNC)
-- Stores API keys, connected MT5 account details, server, & heartbeat
-- ====================================================================
CREATE TABLE broker_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_key VARCHAR(255) NOT NULL UNIQUE,
  account_number VARCHAR(100),
  broker VARCHAR(100),
  server VARCHAR(100),
  currency VARCHAR(10) DEFAULT 'USD',
  terminal_id VARCHAR(100),
  ea_version VARCHAR(20) DEFAULT '1.0.0',
  is_connected BOOLEAN DEFAULT FALSE,
  last_sync TIMESTAMPTZ,
  last_heartbeat TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_broker_accounts_user_id ON broker_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_accounts_api_key ON broker_accounts(api_key);

-- ====================================================================
-- 8. SYNC SESSIONS TABLE
-- Tracks active EA connection sessions & terminal IP addresses
-- ====================================================================
CREATE TABLE sync_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_account_id UUID NOT NULL REFERENCES broker_accounts(id) ON DELETE CASCADE,
  session_token VARCHAR(255) NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired')),
  last_active TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_sessions_account_id ON sync_sessions(broker_account_id);

-- ====================================================================
-- 9. SYNC LOGS TABLE
-- Audit log of EA events (Connection, Heartbeat, Trade Receipt, Duplicate Ignored)
-- ====================================================================
CREATE TABLE sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_account_id UUID REFERENCES broker_accounts(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_account_id ON sync_logs(broker_account_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_event_type ON sync_logs(event_type);

-- ====================================================================
-- 10. TRADE SYNC HISTORY TABLE (DUPLICATE PROTECTION)
-- Uniqueness constraint ensuring ticket + account_number + broker is unique
-- ====================================================================
CREATE TABLE trade_sync_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broker_account_id UUID NOT NULL REFERENCES broker_accounts(id) ON DELETE CASCADE,
  ticket VARCHAR(100) NOT NULL,
  symbol VARCHAR(30) NOT NULL,
  status VARCHAR(20) DEFAULT 'synced',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_ticket_account UNIQUE (broker_account_id, ticket)
);

CREATE INDEX IF NOT EXISTS idx_trade_sync_history_ticket ON trade_sync_history(ticket);

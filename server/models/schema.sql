-- ====================================================================
-- TradeTrack Pro — Complete PostgreSQL Database Schema
-- Production-grade schema with Primary Keys, Foreign Keys, Indexes,
-- Check Constraints, Unique Constraints, and Triggers.
-- ====================================================================

-- ── Extensions ──
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Drop Existing Tables (Cascade for clean setup) ──
DROP TABLE IF EXISTS trade_screenshots CASCADE;
DROP TABLE IF EXISTS trades CASCADE;
DROP TABLE IF EXISTS psychology_journal CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ── Drop Trigger Function if exists ──
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- ── Helper Function: Automatic updated_at timestamp update ──
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_status ON accounts(status);

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

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
  entry_time TIMESTAMPTZ NOT NULL,
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

-- B-tree indexes for fast dashboard, filtering, and chart queries
CREATE INDEX idx_trades_user_id ON trades(user_id);
CREATE INDEX idx_trades_account_id ON trades(account_id);
CREATE INDEX idx_trades_symbol ON trades(symbol);
CREATE INDEX idx_trades_entry_time ON trades(entry_time DESC);
CREATE INDEX idx_trades_outcome ON trades(outcome);
CREATE INDEX idx_trades_asset_class ON trades(asset_class);
CREATE INDEX idx_trades_session ON trades(session);
CREATE INDEX idx_trades_setup_tag ON trades(setup_tag);

CREATE TRIGGER update_trades_updated_at
  BEFORE UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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

CREATE INDEX idx_trade_screenshots_trade_id ON trade_screenshots(trade_id);

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

CREATE INDEX idx_psychology_user_id ON psychology_journal(user_id);
CREATE INDEX idx_psychology_date ON psychology_journal(journal_date DESC);

CREATE TRIGGER update_psychology_journal_updated_at
  BEFORE UPDATE ON psychology_journal
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

/**
 * Application-wide constants for TradeTrack Pro.
 */

// ── Asset Classes ──
export const ASSET_CLASSES = [
  { value: 'forex', label: 'Forex' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'indices', label: 'Indices' },
  { value: 'commodities', label: 'Commodities' },
] as const;

// ── Trade Directions ──
export const TRADE_DIRECTIONS = [
  { value: 'long', label: 'Long' },
  { value: 'short', label: 'Short' },
] as const;

// ── Trade Outcomes ──
export const TRADE_OUTCOMES = [
  { value: 'win', label: 'Win' },
  { value: 'loss', label: 'Loss' },
  { value: 'breakeven', label: 'Breakeven' },
  { value: 'open', label: 'Open' },
] as const;

// ── Emotional States ──
export const EMOTIONAL_STATES = [
  { value: 'confident', label: 'Confident', emoji: '😎' },
  { value: 'neutral', label: 'Neutral', emoji: '😐' },
  { value: 'fearful', label: 'Fearful', emoji: '😰' },
  { value: 'greedy', label: 'Greedy', emoji: '🤑' },
  { value: 'revenge', label: 'Revenge', emoji: '😡' },
  { value: 'fomo', label: 'FOMO', emoji: '😬' },
  { value: 'disciplined', label: 'Disciplined', emoji: '🧘' },
] as const;

// ── Trading Sessions ──
export const TRADING_SESSIONS = [
  { value: 'london', label: 'London', hours: '08:00–16:00 GMT' },
  { value: 'new_york', label: 'New York', hours: '13:00–21:00 GMT' },
  { value: 'tokyo', label: 'Tokyo', hours: '00:00–08:00 GMT' },
  { value: 'sydney', label: 'Sydney', hours: '22:00–06:00 GMT' },
  { value: 'overlap', label: 'Overlap', hours: 'Multi-session' },
] as const;

// ── Prop Firm Phases ──
export const PROP_FIRM_PHASES = [
  { value: 'challenge', label: 'Challenge' },
  { value: 'verification', label: 'Verification' },
  { value: 'funded', label: 'Funded' },
] as const;

// ── Journal Entry Types ──
export const JOURNAL_ENTRY_TYPES = [
  { value: 'pre_market', label: 'Pre-Market' },
  { value: 'post_market', label: 'Post-Market' },
  { value: 'general', label: 'General' },
] as const;

// ── Popular Symbols ──
export const POPULAR_SYMBOLS = {
  forex: ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD', 'NZD/USD', 'EUR/GBP', 'GBP/JPY'],
  crypto: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'XRP/USD', 'BNB/USD', 'ADA/USD'],
  indices: ['US30', 'NAS100', 'SPX500', 'UK100', 'GER40', 'JPN225'],
  commodities: ['XAU/USD', 'XAG/USD', 'WTI', 'BRENT'],
} as const;

// ── Chart Colors ──
export const CHART_COLORS = {
  primary: '#2962FF',
  profit: '#26A69A',
  loss: '#EF5350',
  warning: '#FF9800',
  neutral: '#787B86',
  grid: '#2A2E39',
  background: '#131722',
  tooltip: '#1E222D',
} as const;

// ── Pagination ──
export const DEFAULT_PAGE_SIZE = 20;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

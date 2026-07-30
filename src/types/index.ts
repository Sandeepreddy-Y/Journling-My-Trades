/* ============================================
   TradeTrack Pro — TypeScript Type Definitions
   ============================================ */

// ── User ──
export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  timezone: string;
  preferredCurrency: string;
  isVerified: boolean;
  createdAt: string;
}

// ── Auth ──
export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  fullName?: string;
  displayName?: string;
  email: string;
  password: string;
  confirmPassword?: string;
}

// ── Trade ──
export type AssetClass = 'forex' | 'crypto' | 'indices' | 'commodities';
export type TradeDirection = 'long' | 'short';
export type TradeOutcome = 'win' | 'loss' | 'breakeven' | 'open';
export type TradeStatus = 'open' | 'closed';
export type EmotionalState =
  | 'confident'
  | 'neutral'
  | 'fearful'
  | 'greedy'
  | 'revenge'
  | 'fomo'
  | 'disciplined';
export type TradingSession = 'london' | 'new_york' | 'tokyo' | 'sydney' | 'overlap';

export interface Trade {
  id: string;
  userId: string;
  symbol: string;
  assetClass: AssetClass;
  direction: TradeDirection;
  broker?: string;
  accountName?: string;
  entryPrice: number;
  exitPrice: number | null;
  lotSize: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  riskAmount?: number | null;
  rewardAmount?: number | null;
  riskPercent?: number | null;
  rewardPercent?: number | null;
  beforeScreenshot?: string | null;
  afterScreenshot?: string | null;
  entryTime: string;
  exitTime: string | null;
  fees: number;
  swap: number;
  pnl: number | null;
  pnlPips: number | null;
  riskReward: number | null;
  outcome: TradeOutcome;
  emotion: EmotionalState | null;
  rating: number | null;
  notes: string | null;
  session: TradingSession | null;
  strategyId: string | null;
  setupTag: string | null;
  status: TradeStatus;
  screenshots: (TradeScreenshot | string)[];
  createdAt: string;
  updatedAt: string;
}

export interface TradeFormData {
  symbol: string;
  assetClass: AssetClass;
  direction: TradeDirection;
  broker: string;
  accountName: string;
  entryPrice: string;
  exitPrice: string;
  lotSize: string;
  stopLoss: string;
  takeProfit: string;
  beforeScreenshot: string;
  afterScreenshot: string;
  entryTime: string;
  exitTime: string;
  fees: string;
  swap: string;
  emotion: EmotionalState | '';
  rating: number;
  notes: string;
  session: TradingSession | '';
  strategyId: string;
  setupTag: string;
}

export interface TradeScreenshot {
  id: string;
  tradeId: string;
  imageUrl: string;
  cloudinaryPublicId: string;
  caption: string | null;
  sortOrder: number;
}

export interface TradeFilters {
  dateFrom?: string;
  dateTo?: string;
  symbol?: string;
  direction?: TradeDirection;
  outcome?: TradeOutcome;
  assetClass?: AssetClass;
  emotion?: EmotionalState;
  strategyId?: string;
  session?: TradingSession;
}

export interface TradeSortConfig {
  field: 'entryTime' | 'pnl' | 'riskReward' | 'symbol';
  order: 'asc' | 'desc';
}

// ── Strategy / Playbook ──
export interface Strategy {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  rules: string | null;
  entryCriteria: string | null;
  exitCriteria: string | null;
  screenshots: StrategyScreenshot[];
  tradeCount?: number;
  winRate?: number;
  createdAt: string;
  updatedAt: string;
}

export interface StrategyScreenshot {
  id: string;
  strategyId: string;
  imageUrl: string;
  caption: string | null;
}

// ── Journal ──
export type JournalEntryType = 'pre_market' | 'post_market' | 'general';

export interface JournalEntry {
  id: string;
  userId: string;
  title: string | null;
  content: string;
  entryType: JournalEntryType;
  mood: string | null;
  date: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ── Prop Firm ──
export type PropFirmPhase = 'challenge' | 'verification' | 'funded';
export type PropFirmStatus = 'active' | 'passed' | 'failed' | 'withdrawn';

export interface PropFirmAccount {
  id: string;
  userId: string;
  firmName: string;
  accountSize: number;
  phase: PropFirmPhase;
  maxDailyLoss: number | null;
  maxTotalDrawdown: number | null;
  profitTarget: number | null;
  minTradingDays: number | null;
  currentBalance: number | null;
  startDate: string | null;
  status: PropFirmStatus;
  notes: string | null;
  dailyStats: PropFirmDailyStat[];
  createdAt: string;
  updatedAt: string;
}

export interface PropFirmDailyStat {
  id: string;
  accountId: string;
  date: string;
  dailyPnl: number;
  balance: number;
  tradesCount: number;
}

// ── Tags ──
export type TagType = 'trade' | 'journal' | 'general';

export interface Tag {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  type: TagType;
}

// ── Analytics ──
export interface DashboardOverview {
  totalPnl: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  averageRrr: number;
  bestTrade: number;
  worstTrade: number;
  currentStreak: number;
  streakType: 'win' | 'loss' | 'none';
}

export interface EquityCurvePoint {
  date: string;
  cumulativePnl: number;
  tradeCount: number;
}

export interface CalendarHeatmapDay {
  date: string;
  pnl: number;
  tradeCount: number;
}

export interface PerformanceByGroup {
  group: string;
  totalPnl: number;
  tradeCount: number;
  winRate: number;
  avgPnl: number;
}

// ── API Response ──
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── Navigation ──
export interface NavItem {
  label: string;
  path: string;
  icon: string;
}

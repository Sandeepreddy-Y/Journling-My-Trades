import type { Trade, DashboardOverview, EquityCurvePoint, PerformanceByGroup } from '@/types';

export const MOCK_OVERVIEW: DashboardOverview & { todayProfit: number; currentBalance: number; topSetup: string } = {
  totalPnl: 0,
  todayProfit: 0,
  currentBalance: 0,
  totalTrades: 0,
  winRate: 0,
  profitFactor: 0,
  averageRrr: 0,
  bestTrade: 0,
  worstTrade: 0,
  currentStreak: 0,
  streakType: 'win',
  topSetup: 'N/A',
};

export const MOCK_EQUITY_CURVE: EquityCurvePoint[] = [];

export const MOCK_MONTHLY_PERFORMANCE: Array<{ month: string; pnl: number }> = [];

export const MOCK_WIN_LOSS_DISTRIBUTION = [
  { name: 'Wins', value: 0, color: '#26A69A' },
  { name: 'Losses', value: 0, color: '#EF5350' },
  { name: 'Breakeven', value: 0, color: '#787B86' },
];

export const MOCK_SESSION_PERFORMANCE: PerformanceByGroup[] = [];

export const MOCK_TOP_SETUPS: Array<{ name: string; winRate: number; pnl: number; trades: number }> = [];

export const MOCK_RECENT_TRADES: Trade[] = [];

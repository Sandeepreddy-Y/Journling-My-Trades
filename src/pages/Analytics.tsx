import { useState, useEffect } from 'react';
import {
  TrendingUp,
  RefreshCw,
  Layers,
  Award,
  Clock,
  ShieldAlert,
  Flame,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

import api from '@/lib/axios';
import { formatPnl, getPnlColorClass, cn } from '@/lib/helpers';

interface AnalyticsData {
  overview: {
    totalPnl: number;
    totalTrades: number;
    winCount: number;
    lossCount: number;
    breakevenCount: number;
    winRate: number;
    profitFactor: number;
    averageRrr: number;
    averageWin: number;
    averageLoss: number;
    expectancy: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    consecutiveWins: number;
    consecutiveLosses: number;
    sharpeRatio: number;
    sortinoRatio: number;
    calmarRatio: number;
    avgHoldTimeHours: number;
    bestSetup: string;
    worstSetup: string;
    bestSession: string;
    worstSession: string;
  };
  equityCurve: Array<{ date: string; cumulativePnl: number; tradeCount: number }>;
  monthlyReturns: Array<{ month: string; pnl: number; tradesCount: number }>;
  sessionPerformance: Array<{ group: string; totalPnl: number; tradeCount: number; winRate: number; avgPnl: number }>;
  topSetups: Array<{ name: string; winRate: number; pnl: number; trades: number }>;
  calendarHeatmap: Array<{ date: string; pnl: number; tradeCount: number }>;
}

const DEFAULT_ZERO_ANALYTICS: AnalyticsData = {
  overview: {
    totalPnl: 0,
    totalTrades: 0,
    winCount: 0,
    lossCount: 0,
    breakevenCount: 0,
    winRate: 0,
    profitFactor: 0,
    averageRrr: 0,
    averageWin: 0,
    averageLoss: 0,
    expectancy: 0,
    maxDrawdown: 0,
    maxDrawdownPercent: 0,
    consecutiveWins: 0,
    consecutiveLosses: 0,
    sharpeRatio: 0,
    sortinoRatio: 0,
    calmarRatio: 0,
    avgHoldTimeHours: 0,
    bestSetup: 'N/A',
    worstSetup: 'N/A',
    bestSession: 'N/A',
    worstSession: 'N/A',
  },
  equityCurve: [],
  monthlyReturns: [],
  sessionPerformance: [],
  topSetups: [],
  calendarHeatmap: [],
};

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData>(DEFAULT_ZERO_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.get<{ status: string; data: AnalyticsData }>('/analytics');
      if (res.data && res.data.data) {
        setData(res.data.data);
        setLoading(false);
        setIsRefreshing(false);
        return;
      }
    } catch {
      // Default zero state for newly registered user accounts
    }

    setData(DEFAULT_ZERO_ANALYTICS);
    setLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchAnalytics();

    const handleUpdate = () => fetchAnalytics();
    window.addEventListener('trades-updated', handleUpdate);
    return () => window.removeEventListener('trades-updated', handleUpdate);
  }, []);

  const overview = data.overview;
  const hasTrades = overview.totalTrades > 0;

  const pieData = [
    { name: 'Wins', value: overview.winCount, color: '#26A69A' },
    { name: 'Losses', value: overview.lossCount, color: '#EF5350' },
    { name: 'Breakeven', value: overview.breakevenCount, color: '#787B86' },
  ];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-xs text-text-muted font-medium tracking-wide">Calculating performance analytics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-card/50 backdrop-blur-lg border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Quantitative Analytics Engine
            </span>
            <span className="text-xs text-text-muted">{overview.totalTrades} total executions analyzed</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-bright tracking-tight mt-1">
            Performance Analytics & Risk Ratios
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Deep-dive metrics: Sharpe, Sortino, Calmar Ratios, Expectancy, Hold Time, and Drawdown.
          </p>
        </div>

        <button
          onClick={fetchAnalytics}
          disabled={isRefreshing}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-text-bright text-xs font-semibold rounded-xl transition-all shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>Recalculate Metrics</span>
        </button>
      </div>

      {/* ── Top Metric Cards (Row 1) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 shadow-xl space-y-2">
          <span className="text-xs text-text-muted uppercase font-bold tracking-wider block">Net Total PnL</span>
          <p className={cn('text-2xl font-black font-mono tracking-tight', getPnlColorClass(overview.totalPnl))}>
            {formatPnl(overview.totalPnl)}
          </p>
          <span className="text-[11px] text-text-muted block">Calculated from {overview.totalTrades} positions</span>
        </div>

        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 shadow-xl space-y-2">
          <span className="text-xs text-text-muted uppercase font-bold tracking-wider block">Win Rate</span>
          <p className="text-2xl font-black text-text-bright font-mono tracking-tight">{overview.winRate}%</p>
          <span className="text-[11px] text-profit font-semibold block">{overview.winCount} Wins / {overview.lossCount} Losses</span>
        </div>

        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 shadow-xl space-y-2">
          <span className="text-xs text-text-muted uppercase font-bold tracking-wider block">Profit Factor</span>
          <p className="text-2xl font-black text-text-bright font-mono tracking-tight">{overview.profitFactor}</p>
          <span className="text-[11px] text-text-muted block">Gross Win vs Gross Loss Ratio</span>
        </div>

        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 shadow-xl space-y-2">
          <span className="text-xs text-text-muted uppercase font-bold tracking-wider block">Expectancy ($ / Trade)</span>
          <p className={cn('text-2xl font-black font-mono tracking-tight', getPnlColorClass(overview.expectancy || 0))}>
            {formatPnl(overview.expectancy || 0)}
          </p>
          <span className="text-[11px] text-text-muted block">Expected value per execution</span>
        </div>
      </div>

      {/* ── Risk-Adjusted Quantitative Ratios (Row 2) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-4 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted font-bold">
            <span>Sharpe Ratio</span>
            <Award className="w-4 h-4 text-primary" />
          </div>
          <p className="text-xl font-bold text-text-bright font-mono">{overview.sharpeRatio || '0.00'}</p>
          <span className="text-[10px] text-text-muted block">Risk-adjusted return ratio</span>
        </div>

        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-4 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted font-bold">
            <span>Sortino Ratio</span>
            <Zap className="w-4 h-4 text-profit" />
          </div>
          <p className="text-xl font-bold text-text-bright font-mono">{overview.sortinoRatio || '0.00'}</p>
          <span className="text-[10px] text-text-muted block">Downside volatility ratio</span>
        </div>

        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-4 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted font-bold">
            <span>Max Drawdown</span>
            <ShieldAlert className="w-4 h-4 text-loss" />
          </div>
          <p className="text-xl font-bold text-loss font-mono">{overview.maxDrawdownPercent}% (${overview.maxDrawdown})</p>
          <span className="text-[10px] text-text-muted block">Peak-to-trough decline</span>
        </div>

        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-4 shadow-xl space-y-1">
          <div className="flex items-center justify-between text-xs text-text-muted font-bold">
            <span>Avg Hold Duration</span>
            <Clock className="w-4 h-4 text-warning" />
          </div>
          <p className="text-xl font-bold text-text-bright font-mono">{overview.avgHoldTimeHours} hrs</p>
          <span className="text-[10px] text-text-muted block">Average execution time</span>
        </div>
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cumulative Equity Curve (2 cols) */}
        <div className="lg:col-span-2 bg-bg-card border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
            <div>
              <h2 className="text-base font-bold text-text-bright tracking-tight">
                Cumulative Equity Curve
              </h2>
              <p className="text-xs text-text-muted">Account balance progression over time</p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono font-bold">
              <span className="text-profit flex items-center gap-1"><Flame className="w-3.5 h-3.5" /> Max Win Streak: {overview.consecutiveWins}</span>
              <span className="text-loss flex items-center gap-1">Max Loss Streak: {overview.consecutiveLosses}</span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            {hasTrades && data.equityCurve.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.equityCurve} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#26A69A" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#26A69A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2E39" vertical={false} />
                  <XAxis dataKey="date" stroke="#787B86" fontSize={11} tickLine={false} axisLine={{ stroke: '#2A2E39' }} />
                  <YAxis stroke="#787B86" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E222D', borderColor: '#2A2E39', borderRadius: '12px' }}
                    formatter={(val: any) => [formatPnl(Number(val)), 'Cumulative PnL']}
                  />
                  <Area type="monotone" dataKey="cumulativePnl" stroke="#26A69A" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEquity)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center space-y-2 text-center text-xs text-text-muted">
                <Layers className="w-8 h-8 text-white/[0.1]" />
                <p>No trade history available. Log executions to plot your equity curve.</p>
              </div>
            )}
          </div>
        </div>

        {/* Win/Loss Pie Chart */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="border-b border-white/[0.06] pb-4">
            <h2 className="text-base font-bold text-text-bright tracking-tight">
              Execution Outcome Distribution
            </h2>
            <p className="text-xs text-text-muted">Ratio of winning, losing, and breakeven trades</p>
          </div>

          <div className="h-56 w-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={85} paddingAngle={4} dataKey="value">
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#1E222D" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1E222D', borderColor: '#2A2E39', borderRadius: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
              <span className="text-2xl font-extrabold text-text-bright">{overview.winRate}%</span>
              <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Win Rate</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-white/[0.06] text-xs">
            <div className="p-2 rounded-xl bg-profit/10">
              <span className="text-[10px] text-text-muted block">Wins</span>
              <span className="font-bold text-profit font-mono">{overview.winCount}</span>
            </div>
            <div className="p-2 rounded-xl bg-loss/10">
              <span className="text-[10px] text-text-muted block">Losses</span>
              <span className="font-bold text-loss font-mono">{overview.lossCount}</span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.04]">
              <span className="text-[10px] text-text-muted block">Breakeven</span>
              <span className="font-bold text-text-muted font-mono">{overview.breakevenCount}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

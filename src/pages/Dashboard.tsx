import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  Award,
  Target,
  Scale,
  Wallet,
  Plus,
  ArrowUpRight,
  Zap,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

import { AIAssistantPanel } from '@/components/ai/AIAssistantPanel';
import { useAnalytics, useTrades } from '@/hooks';
import { RecentTradesTable } from '@/components/dashboard/RecentTradesTable';
import { formatCurrency, formatPnl, getPnlColorClass, cn } from '@/lib/helpers';

export default function Dashboard() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const { data: analytics } = useAnalytics();
  const { trades } = useTrades();

  const hasTrades = trades && trades.length > 0;

  const overview = {
    totalPnl: hasTrades ? analytics.overview.totalPnl : 0,
    todayProfit: hasTrades ? (analytics.dailyReturns?.[analytics.dailyReturns.length - 1]?.pnl || 0) : 0,
    winRate: hasTrades ? analytics.overview.winRate : 0,
    profitFactor: hasTrades ? analytics.overview.profitFactor : 0,
    averageRrr: hasTrades ? analytics.overview.averageRrr : 0,
    currentBalance: hasTrades ? 100000 + analytics.overview.totalPnl : 0,
  };

  const equityCurveData = hasTrades && analytics.equityCurve.length > 0
    ? analytics.equityCurve
    : [];

  const monthlyData = hasTrades ? analytics.monthlyReturns : [];

  const pieData = hasTrades
    ? [
        { name: 'Wins', value: analytics.overview.winCount || 0, color: '#26A69A' },
        { name: 'Losses', value: analytics.overview.lossCount || 0, color: '#EF5350' },
        { name: 'Breakeven', value: analytics.overview.breakevenCount || 0, color: '#787B86' },
      ]
    : [
        { name: 'Wins', value: 0, color: '#26A69A' },
        { name: 'Losses', value: 0, color: '#EF5350' },
        { name: 'Breakeven', value: 0, color: '#787B86' },
      ];

  const sessionData = hasTrades ? analytics.sessionPerformance : [];

  return (
    <div className="space-y-6 animate-slide-up pb-10">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-card/50 backdrop-blur-lg border border-white/[0.06] rounded-2xl p-5 sm:p-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              Live Journal
            </span>
            <span className="text-xs text-text-muted">Updated just now</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-bright tracking-tight mt-1">
            Trading Dashboard
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Welcome back! Here is your personal performance breakdown and account health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time range selector */}
          <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 text-xs font-medium">
            {(['7d', '30d', '90d', 'all'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  'px-3 py-1.5 rounded-lg transition-all duration-200 uppercase font-semibold',
                  timeRange === range
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Add Trade Button */}
          <button
            onClick={() => navigate('/trades/new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-[#1E88E5] hover:brightness-110 text-white text-sm font-semibold rounded-xl shadow-lg shadow-primary/20 transition-all duration-200 active:scale-95 shrink-0"
            id="dashboard-add-trade-btn"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Log Trade</span>
          </button>
        </div>
      </div>

      {/* ── AI Assistant Panel ── */}
      <AIAssistantPanel />

      {/* ── Metric Cards Grid (6 cards) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* Card 1: Total PnL */}
        <div className="group relative bg-bg-card border border-white/[0.06] hover:border-primary/40 rounded-2xl p-4 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total PnL</span>
            <div className="p-2 rounded-xl bg-profit/10 text-profit">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className={cn('text-xl font-bold tracking-tight', getPnlColorClass(overview.totalPnl))}>
            {formatPnl(overview.totalPnl)}
          </p>

          <div className="flex items-center gap-1 text-xs text-text-muted mt-2 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{hasTrades ? 'Live Performance' : '0% all time'}</span>
          </div>
        </div>

        {/* Card 2: Today's Profit */}
        <div className="group relative bg-bg-card border border-white/[0.06] hover:border-profit/40 rounded-2xl p-4 transition-all duration-300 hover:shadow-xl hover:shadow-profit/5">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Today&apos;s Profit</span>
            <div className="p-2 rounded-xl bg-profit/10 text-profit">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className={cn('text-xl font-bold tracking-tight', getPnlColorClass(overview.todayProfit))}>
            {formatPnl(overview.todayProfit)}
          </p>
          <div className="flex items-center gap-1 text-xs text-text-muted mt-2 font-medium">
            <Zap className="w-3.5 h-3.5" />
            <span>{hasTrades ? 'Active session' : '0 trades closed today'}</span>
          </div>
        </div>

        {/* Card 3: Win Rate */}
        <div className="group relative bg-bg-card border border-white/[0.06] hover:border-primary/40 rounded-2xl p-4 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Win Rate</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-text-bright tracking-tight">
            {overview.winRate}%
          </p>
          <div className="w-full bg-white/[0.06] h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary to-profit h-full rounded-full transition-all duration-500"
              style={{ width: `${overview.winRate}%` }}
            />
          </div>
        </div>

        {/* Card 4: Profit Factor */}
        <div className="group relative bg-bg-card border border-white/[0.06] hover:border-warning/40 rounded-2xl p-4 transition-all duration-300 hover:shadow-xl hover:shadow-warning/5">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Profit Factor</span>
            <div className="p-2 rounded-xl bg-warning/10 text-warning">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-text-bright tracking-tight">
            {overview.profitFactor}
          </p>
          <p className="text-xs text-text-secondary mt-2">
            Target &gt; 1.50
          </p>
        </div>

        {/* Card 5: Average RR */}
        <div className="group relative bg-bg-card border border-white/[0.06] hover:border-primary/40 rounded-2xl p-4 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Average R:R</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-text-bright tracking-tight">
            1:{overview.averageRrr}
          </p>
          <p className="text-xs text-text-secondary mt-2">
            Risk-to-Reward Ratio
          </p>
        </div>

        {/* Card 6: Current Balance */}
        <div className="group relative bg-bg-card border border-white/[0.06] hover:border-primary/40 rounded-2xl p-4 transition-all duration-300 hover:shadow-xl hover:shadow-primary/5">
          <div className="flex items-center justify-between text-text-muted mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Current Balance</span>
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-bold text-text-bright tracking-tight">
            {formatCurrency(overview.currentBalance)}
          </p>
          <div className="flex items-center gap-1 text-xs text-text-muted mt-2 font-medium">
            <span>Account Balance</span>
          </div>
        </div>
      </div>

      {/* ── Main Section: Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Cumulative Equity Curve (2 cols) */}
        <div className="lg:col-span-2 bg-bg-card border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
            <div>
              <h2 className="text-base font-bold text-text-bright tracking-tight">
                Cumulative Equity Curve
              </h2>
              <p className="text-xs text-text-muted">Account balance growth over time</p>
            </div>
            <span className={cn('text-sm font-bold font-mono', getPnlColorClass(overview.totalPnl))}>
              {formatPnl(overview.totalPnl)} Total
            </span>
          </div>

          {/* Equity Chart Container */}
          <div className="h-72 w-full pt-2">
            {equityCurveData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={equityCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    formatter={(value: any) => [formatPnl(Number(value)), 'Cumulative PnL']}
                  />
                  <Area type="monotone" dataKey="cumulativePnl" stroke="#26A69A" strokeWidth={2.5} fillOpacity={1} fill="url(#colorEquity)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center space-y-2 text-center text-xs text-text-muted">
                <Layers className="w-8 h-8 text-white/[0.1]" />
                <p>No equity curve data available. Log your first trade execution to chart performance.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Win/Loss Pie Chart (1 col) */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4 flex flex-col justify-between">
          <div className="border-b border-white/[0.06] pb-4">
            <h2 className="text-base font-bold text-text-bright tracking-tight">
              Win / Loss Distribution
            </h2>
            <p className="text-xs text-text-muted">Ratio of winning vs losing trades</p>
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
              <span className="font-bold text-profit font-mono">{hasTrades ? analytics?.overview.winCount : 0}</span>
            </div>
            <div className="p-2 rounded-xl bg-loss/10">
              <span className="text-[10px] text-text-muted block">Losses</span>
              <span className="font-bold text-loss font-mono">{hasTrades ? analytics?.overview.lossCount : 0}</span>
            </div>
            <div className="p-2 rounded-xl bg-white/[0.04]">
              <span className="text-[10px] text-text-muted block">Breakeven</span>
              <span className="font-bold text-text-muted font-mono">{hasTrades ? analytics?.overview.breakevenCount : 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Section 2: Monthly Returns & Session Analysis Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Performance Bar Chart */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="border-b border-white/[0.06] pb-4">
            <h2 className="text-base font-bold text-text-bright tracking-tight">
              Monthly PnL Breakdown
            </h2>
            <p className="text-xs text-text-muted">Net profit/loss by month</p>
          </div>

          <div className="h-64 w-full pt-2">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2A2E39" vertical={false} />
                  <XAxis dataKey="month" stroke="#787B86" fontSize={11} tickLine={false} axisLine={{ stroke: '#2A2E39' }} />
                  <YAxis stroke="#787B86" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1E222D', borderColor: '#2A2E39', borderRadius: '12px' }}
                    formatter={(val: any) => [formatPnl(Number(val)), 'Net PnL']}
                  />
                  <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                    {monthlyData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.pnl >= 0 ? '#26A69A' : '#EF5350'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center space-y-2 text-center text-xs text-text-muted">
                <Layers className="w-8 h-8 text-white/[0.1]" />
                <p>No monthly PnL data available.</p>
              </div>
            )}
          </div>
        </div>

        {/* Session Analysis */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="border-b border-white/[0.06] pb-4">
            <h2 className="text-base font-bold text-text-bright tracking-tight">
              Session Performance Breakdown
            </h2>
            <p className="text-xs text-text-muted">Win rate and net PnL by market trading session</p>
          </div>

          <div className="space-y-3">
            {sessionData.length > 0 ? (
              sessionData.map((sess) => (
                <div key={sess.group} className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-text-bright block">{sess.group}</span>
                    <span className="text-[11px] text-text-muted">{sess.tradeCount} trades ({sess.winRate}% win)</span>
                  </div>
                  <span className={cn('font-bold font-mono text-sm', getPnlColorClass(sess.totalPnl))}>
                    {formatPnl(sess.totalPnl)}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-text-muted">
                No session data logged yet. Log trades to view session analytics.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 3: Recent Executions Table ── */}
      <RecentTradesTable trades={trades} />
    </div>
  );
}

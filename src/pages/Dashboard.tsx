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
  ArrowDownRight,
  Calendar,
  Layers,
  ChevronRight,
  Zap,
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

import {
  MOCK_OVERVIEW,
  MOCK_EQUITY_CURVE,
  MOCK_MONTHLY_PERFORMANCE,
  MOCK_WIN_LOSS_DISTRIBUTION,
  MOCK_SESSION_PERFORMANCE,
  MOCK_TOP_SETUPS,
  MOCK_RECENT_TRADES,
} from '@/lib/dummyData';
import { AIAssistantPanel } from '@/components/ai/AIAssistantPanel';
import { formatCurrency, formatPnl, getPnlColorClass, cn } from '@/lib/helpers';

export default function Dashboard() {
  const navigate = useNavigate();
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

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
            Welcome back! Here is your performance breakdown and account health.
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
          <p className={cn('text-xl font-bold tracking-tight', getPnlColorClass(MOCK_OVERVIEW.totalPnl))}>
            {formatPnl(MOCK_OVERVIEW.totalPnl)}
          </p>
          <div className="flex items-center gap-1 text-xs text-profit mt-2 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+14.8% all time</span>
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
          <p className={cn('text-xl font-bold tracking-tight', getPnlColorClass(MOCK_OVERVIEW.todayProfit))}>
            {formatPnl(MOCK_OVERVIEW.todayProfit)}
          </p>
          <div className="flex items-center gap-1 text-xs text-profit mt-2 font-medium">
            <Zap className="w-3.5 h-3.5" />
            <span>2 trades closed today</span>
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
            {MOCK_OVERVIEW.winRate}%
          </p>
          <div className="w-full bg-white/[0.06] h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary to-profit h-full rounded-full transition-all duration-500"
              style={{ width: `${MOCK_OVERVIEW.winRate}%` }}
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
            {MOCK_OVERVIEW.profitFactor}
          </p>
          <p className="text-xs text-text-secondary mt-2">
            Target &gt; 1.50 <span className="text-profit font-medium">(Healthy)</span>
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
            1:{MOCK_OVERVIEW.averageRrr}
          </p>
          <p className="text-xs text-text-secondary mt-2">
            Avg Risk: $350 | Avg Reward: $822.50
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
            {formatCurrency(MOCK_OVERVIEW.currentBalance)}
          </p>
          <div className="flex items-center gap-1 text-xs text-profit mt-2 font-medium">
            <span>Peak Balance</span>
          </div>
        </div>
      </div>

      {/* ── Row 2: Charts (Equity Curve & Monthly Performance) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Equity Curve (2 cols) */}
        <div className="lg:col-span-2 bg-bg-card border border-white/[0.06] rounded-2xl p-5 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-base font-bold text-text-bright">Cumulative Equity Curve</h2>
              <p className="text-xs text-text-muted">Account balance growth over time</p>
            </div>
            <div className="flex items-center gap-2 text-xs font-medium text-profit bg-profit/10 px-3 py-1 rounded-lg border border-profit/20">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>+$14,850.25 Total</span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_EQUITY_CURVE} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2962FF" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2962FF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2E39" opacity={0.6} />
                <XAxis dataKey="date" stroke="#787B86" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#787B86"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                  domain={['auto', 'auto']}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E222D',
                    borderColor: '#2A2E39',
                    borderRadius: '12px',
                    color: '#D1D4DC',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                  }}
                  formatter={(val: any) => [formatCurrency(Number(val || 0)), 'Balance']}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativePnl"
                  stroke="#2962FF"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#equityGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Performance Bar Chart (1 col) */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-bold text-text-bright">Monthly PnL Breakdown</h2>
              <Calendar className="w-4 h-4 text-text-muted" />
            </div>
            <p className="text-xs text-text-muted mb-6">Net profit/loss by month</p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_MONTHLY_PERFORMANCE} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2E39" opacity={0.6} />
                <XAxis dataKey="month" stroke="#787B86" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#787B86" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E222D',
                    borderColor: '#2A2E39',
                    borderRadius: '12px',
                    color: '#D1D4DC',
                  }}
                  formatter={(val: any) => [formatPnl(Number(val || 0)), 'PnL']}
                />
                <Bar dataKey="pnl" radius={[6, 6, 0, 0]}>
                  {MOCK_MONTHLY_PERFORMANCE.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#26A69A' : '#EF5350'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/[0.06] text-xs text-text-secondary">
            <span>Best Month: <strong className="text-profit">Jul (+$14.8k)</strong></span>
            <span>Worst Month: <strong className="text-loss">Mar (-$1.2k)</strong></span>
          </div>
        </div>
      </div>

      {/* ── Row 3: Win/Loss Pie, Session Breakdown & Top Setups ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Win/Loss Pie Chart */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-text-bright">Win / Loss Ratio</h2>
            <p className="text-xs text-text-muted mb-4">Trade outcome distribution</p>
          </div>

          <div className="h-52 w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={MOCK_WIN_LOSS_DISTRIBUTION}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {MOCK_WIN_LOSS_DISTRIBUTION.map((entry, index) => (
                    <Cell key={`pie-cell-${index}`} fill={entry.color} stroke="#1E222D" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1E222D',
                    borderColor: '#2A2E39',
                    borderRadius: '10px',
                    color: '#D1D4DC',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center metric */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-bold text-text-bright">{MOCK_OVERVIEW.winRate}%</span>
              <span className="text-[10px] uppercase text-text-muted font-medium">Win Rate</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-4 border-t border-white/[0.06] text-center">
            {MOCK_WIN_LOSS_DISTRIBUTION.map((item) => (
              <div key={item.name} className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-text-secondary">{item.name}</span>
                </div>
                <span className="text-sm font-bold text-text-bright">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trading Session Performance */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-text-bright">Trading Session PnL</h2>
            <p className="text-xs text-text-muted mb-4">Performance across market sessions</p>
          </div>

          <div className="space-y-3 flex-1 justify-center flex flex-col">
            {MOCK_SESSION_PERFORMANCE.map((session) => (
              <div key={session.group} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-primary flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary" />
                    {session.group} Session
                  </span>
                  <span className={cn('font-bold', getPnlColorClass(session.totalPnl))}>
                    {formatPnl(session.totalPnl)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-muted">
                  <span>{session.tradeCount} Trades ({session.winRate}% Win Rate)</span>
                  <span>Avg PnL: ${session.avgPnl.toFixed(2)}</span>
                </div>
                <div className="w-full bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${session.winRate}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performing Setups */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-text-bright">Top Performing Setups</h2>
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs text-text-muted mb-4">Most profitable trading strategies</p>
          </div>

          <div className="space-y-3 flex-1 flex flex-col justify-center">
            {MOCK_TOP_SETUPS.map((setup, idx) => (
              <div key={setup.name} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-bold">
                    #{idx + 1}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-text-bright">{setup.name}</p>
                    <p className="text-[11px] text-text-muted">{setup.trades} trades • {setup.winRate}% win rate</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-profit">{formatCurrency(setup.pnl)}</p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => navigate('/playbook')}
            className="w-full mt-3 py-2 text-xs font-semibold text-primary hover:text-primary/80 flex items-center justify-center gap-1 transition-colors"
          >
            <span>View Full Playbook</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Recent Trades Table ── */}
      <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-text-bright">Recent Executions</h2>
            <p className="text-xs text-text-muted">Latest trades recorded in your journal</p>
          </div>
          <button
            onClick={() => navigate('/trades')}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <span>View All Trades</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-primary">
            <thead>
              <tr className="border-b border-white/[0.06] text-text-muted uppercase text-[10px] font-semibold tracking-wider">
                <th className="pb-3 px-3">Symbol</th>
                <th className="pb-3 px-3">Direction</th>
                <th className="pb-3 px-3">Entry / Exit</th>
                <th className="pb-3 px-3">Lot Size</th>
                <th className="pb-3 px-3">Setup</th>
                <th className="pb-3 px-3">Session</th>
                <th className="pb-3 px-3">Outcome</th>
                <th className="pb-3 px-3 text-right">PnL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {MOCK_RECENT_TRADES.map((trade) => (
                <tr
                  key={trade.id}
                  onClick={() => navigate(`/trades/${trade.id}`)}
                  className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
                >
                  {/* Symbol */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-bright group-hover:text-primary transition-colors">
                        {trade.symbol}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-white/[0.04] text-text-muted">
                        {trade.assetClass}
                      </span>
                    </div>
                  </td>

                  {/* Direction */}
                  <td className="py-3.5 px-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold uppercase',
                        trade.direction === 'long'
                          ? 'bg-profit/10 text-profit border border-profit/20'
                          : 'bg-loss/10 text-loss border border-loss/20',
                      )}
                    >
                      {trade.direction === 'long' ? (
                        <ArrowUpRight className="w-3 h-3" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3" />
                      )}
                      {trade.direction}
                    </span>
                  </td>

                  {/* Entry / Exit */}
                  <td className="py-3.5 px-3 text-text-secondary font-mono">
                    {trade.entryPrice} → {trade.exitPrice || '—'}
                  </td>

                  {/* Lot Size */}
                  <td className="py-3.5 px-3 font-semibold text-text-primary">
                    {trade.lotSize} lots
                  </td>

                  {/* Setup */}
                  <td className="py-3.5 px-3">
                    <span className="px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-text-secondary font-medium">
                      {trade.setupTag || '—'}
                    </span>
                  </td>

                  {/* Session */}
                  <td className="py-3.5 px-3 capitalize text-text-secondary">
                    {trade.session}
                  </td>

                  {/* Outcome */}
                  <td className="py-3.5 px-3">
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                        trade.outcome === 'win' && 'bg-profit/20 text-profit',
                        trade.outcome === 'loss' && 'bg-loss/20 text-loss',
                        trade.outcome === 'breakeven' && 'bg-white/[0.1] text-text-secondary',
                      )}
                    >
                      {trade.outcome}
                    </span>
                  </td>

                  {/* PnL */}
                  <td className="py-3.5 px-3 text-right font-bold text-sm font-mono">
                    <span className={getPnlColorClass(trade.pnl || 0)}>
                      {formatPnl(trade.pnl || 0)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

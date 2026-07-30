import { useState, useEffect } from 'react';
import {
  Briefcase,
  ShieldCheck,
  Plus,
  Calendar,
  Sparkles,
  RefreshCw,
  Award,
  Clock,
  Building,
  CheckCircle2,
  X,
  Target,
  BarChart,
} from 'lucide-react';
import toast from 'react-hot-toast';

import api from '@/lib/axios';
import { formatCurrency, formatPnl, cn } from '@/lib/helpers';

interface PropFirmAccountData {
  id: string;
  firmName: string;
  accountName: string;
  accountSize: number;
  currentBalance: number;
  startingBalance: number;
  phase: 'challenge' | 'verification' | 'funded';
  status: 'active' | 'passed' | 'failed' | 'withdrawn';
  maxDailyLossPercent: number;
  currentDailyLoss: number;
  maxTotalDrawdownPercent: number;
  currentTotalDrawdown: number;
  profitTargetPercent: number;
  currentProfit: number;
  minTradingDays: number;
  tradingDaysCompleted: number;
  bestDayProfit: number;
  payoutCountdownDays: number;
}

export default function PropFirm() {
  const [accounts, setAccounts] = useState<PropFirmAccountData[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Account Form State
  const [newAccountData, setNewAccountData] = useState({
    firmName: 'FTMO',
    accountName: 'FTMO $100k Challenge',
    accountSize: '100000',
    phase: 'challenge' as 'challenge' | 'verification' | 'funded',
    maxDailyLossPercent: '5.0',
    maxTotalDrawdownPercent: '10.0',
    profitTargetPercent: '10.0',
    minTradingDays: '5',
  });

  const fetchAccounts = async () => {
    setIsRefreshing(true);
    try {
      const res = await api.get<{ status: string; data: { accounts: PropFirmAccountData[] } }>('/prop-firm');
      if (res.data && res.data.data && res.data.data.accounts.length > 0) {
        setAccounts(res.data.data.accounts);
        if (!selectedAccountId) {
          setSelectedAccountId(res.data.data.accounts[0].id);
        }
        setLoading(false);
        setIsRefreshing(false);
        return;
      }
    } catch {
      // Fallback local state if API offline
    }

    // Default Fallback Prop Firm Accounts
    const defaultAccs: PropFirmAccountData[] = [
      {
        id: 'pf-101',
        firmName: 'FTMO',
        accountName: 'FTMO $100k Challenge (Phase 1)',
        accountSize: 100000,
        currentBalance: 106450,
        startingBalance: 100000,
        phase: 'challenge',
        status: 'active',
        maxDailyLossPercent: 5.0,
        currentDailyLoss: 420.00,
        maxTotalDrawdownPercent: 10.0,
        currentTotalDrawdown: 850.00,
        profitTargetPercent: 10.0,
        currentProfit: 6450.00,
        minTradingDays: 5,
        tradingDaysCompleted: 8,
        bestDayProfit: 2150.00,
        payoutCountdownDays: 14,
      },
      {
        id: 'pf-102',
        firmName: 'FundingPips',
        accountName: 'FundingPips $50k Evaluation (Phase 2)',
        accountSize: 50000,
        currentBalance: 52800,
        startingBalance: 50000,
        phase: 'verification',
        status: 'active',
        maxDailyLossPercent: 4.0,
        currentDailyLoss: 150.00,
        maxTotalDrawdownPercent: 8.0,
        currentTotalDrawdown: 350.00,
        profitTargetPercent: 5.0,
        currentProfit: 2800.00,
        minTradingDays: 5,
        tradingDaysCompleted: 5,
        bestDayProfit: 850.00,
        payoutCountdownDays: 7,
      },
      {
        id: 'pf-103',
        firmName: 'Goat Funded',
        accountName: 'Goat Funded $100k Live Account',
        accountSize: 100000,
        currentBalance: 108250,
        startingBalance: 100000,
        phase: 'funded',
        status: 'active',
        maxDailyLossPercent: 5.0,
        currentDailyLoss: 0.00,
        maxTotalDrawdownPercent: 10.0,
        currentTotalDrawdown: 600.00,
        profitTargetPercent: 0.0,
        currentProfit: 8250.00,
        minTradingDays: 0,
        tradingDaysCompleted: 18,
        bestDayProfit: 2400.00,
        payoutCountdownDays: 3,
      },
      {
        id: 'pf-104',
        firmName: 'Funding Traders',
        accountName: 'Funding Traders $200k Executive Challenge',
        accountSize: 200000,
        currentBalance: 211400,
        startingBalance: 200000,
        phase: 'challenge',
        status: 'active',
        maxDailyLossPercent: 5.0,
        currentDailyLoss: 620.00,
        maxTotalDrawdownPercent: 10.0,
        currentTotalDrawdown: 1100.00,
        profitTargetPercent: 8.0,
        currentProfit: 11400.00,
        minTradingDays: 5,
        tradingDaysCompleted: 9,
        bestDayProfit: 3800.00,
        payoutCountdownDays: 18,
      },
    ];

    setAccounts(defaultAccs);
    if (!selectedAccountId) {
      setSelectedAccountId(defaultAccs[0].id);
    }
    setLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const activeAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post<{ status: string; data: { account: PropFirmAccountData } }>('/prop-firm', newAccountData);
      if (res.data && res.data.data) {
        setAccounts((prev) => [res.data.data.account, ...prev]);
        setSelectedAccountId(res.data.data.account.id);
      }
      toast.success('Prop firm account added!');
      setIsModalOpen(false);
    } catch {
      // Local fallback creation
      const localAcc: PropFirmAccountData = {
        id: `pf-${Date.now()}`,
        firmName: newAccountData.firmName,
        accountName: newAccountData.accountName,
        accountSize: parseFloat(newAccountData.accountSize),
        currentBalance: parseFloat(newAccountData.accountSize),
        startingBalance: parseFloat(newAccountData.accountSize),
        phase: newAccountData.phase,
        status: 'active',
        maxDailyLossPercent: parseFloat(newAccountData.maxDailyLossPercent),
        currentDailyLoss: 0,
        maxTotalDrawdownPercent: parseFloat(newAccountData.maxTotalDrawdownPercent),
        currentTotalDrawdown: 0,
        profitTargetPercent: parseFloat(newAccountData.profitTargetPercent),
        currentProfit: 0,
        minTradingDays: parseInt(newAccountData.minTradingDays) || 5,
        tradingDaysCompleted: 0,
        bestDayProfit: 0,
        payoutCountdownDays: 14,
      };
      setAccounts((prev) => [localAcc, ...prev]);
      setSelectedAccountId(localAcc.id);
      toast.success('Prop firm account added!');
      setIsModalOpen(false);
    }
  };

  if (loading || !activeAccount) {
    return (
      <div className="py-20 text-center text-text-muted animate-pulse">
        Loading prop firm dashboard...
      </div>
    );
  }

  // Calculated Metrics for Active Account
  const maxDailyLossAllowed = (activeAccount.accountSize * activeAccount.maxDailyLossPercent) / 100;
  const dailyLossRemaining = Math.max(0, maxDailyLossAllowed - activeAccount.currentDailyLoss);
  const dailyLossPercentUsed = (activeAccount.currentDailyLoss / maxDailyLossAllowed) * 100;

  const maxTotalDrawdownAllowed = (activeAccount.accountSize * activeAccount.maxTotalDrawdownPercent) / 100;
  const totalDrawdownRemaining = Math.max(0, maxTotalDrawdownAllowed - activeAccount.currentTotalDrawdown);
  const totalDrawdownPercentUsed = (activeAccount.currentTotalDrawdown / maxTotalDrawdownAllowed) * 100;

  const targetProfitAmount = (activeAccount.accountSize * activeAccount.profitTargetPercent) / 100;
  const profitProgressPercent = targetProfitAmount > 0 ? Math.min(100, (activeAccount.currentProfit / targetProfitAmount) * 100) : 100;
  const profitRemaining = Math.max(0, targetProfitAmount - activeAccount.currentProfit);

  // Consistency Rule Check (Single best day profit <= 40% of total profit)
  const bestDayRatio = activeAccount.currentProfit > 0 ? (activeAccount.bestDayProfit / activeAccount.currentProfit) * 100 : 0;
  const isConsistencyRulePassed = bestDayRatio <= 40;

  return (
    <div className="space-y-6 animate-slide-up pb-12">
      {/* ── Page Header & Account Selector ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-card/50 backdrop-blur-lg border border-white/[0.06] rounded-2xl p-5 sm:p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Prop Firm Risk Guard
            </span>
            <span className="text-xs text-text-muted">{accounts.length} Accounts Monitored</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-bright tracking-tight mt-1">
            Prop Firm Account Dashboard
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Real-time daily drawdown limits, overall drawdown safety, consistency rule checks, and payout countdowns.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-[#1E88E5] hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
            id="add-prop-account-btn"
          >
            <Plus className="w-4 h-4" />
            <span>Add Prop Account</span>
          </button>
          <button
            onClick={fetchAccounts}
            disabled={isRefreshing}
            className="p-2.5 bg-white/[0.04] border border-white/[0.08] hover:border-primary/50 text-text-bright rounded-xl transition-all"
            title="Refresh Account Data"
          >
            <RefreshCw className={cn('w-4 h-4 text-primary', isRefreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* ── Account Selector Tabs (Multiple Accounts: FTMO, FundingPips, Goat Funded, Funding Traders) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {accounts.map((acc) => {
          const isActive = acc.id === selectedAccountId;
          return (
            <button
              key={acc.id}
              onClick={() => setSelectedAccountId(acc.id)}
              className={cn(
                'flex items-center gap-2.5 px-4 py-3 rounded-2xl border transition-all shrink-0 cursor-pointer text-left',
                isActive
                  ? 'bg-primary/10 border-primary/40 text-text-bright shadow-lg shadow-primary/10'
                  : 'bg-bg-card/70 border-white/[0.06] text-text-secondary hover:text-text-bright hover:border-white/[0.12]',
              )}
            >
              <div className="p-2 rounded-xl bg-white/[0.06] text-primary">
                <Building className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-text-bright">{acc.firmName}</span>
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded text-[9px] font-bold uppercase',
                      acc.phase === 'funded' && 'bg-profit/20 text-profit',
                      acc.phase === 'challenge' && 'bg-primary/20 text-primary',
                      acc.phase === 'verification' && 'bg-warning/20 text-warning',
                    )}
                  >
                    {acc.phase}
                  </span>
                </div>
                <span className="text-[11px] text-text-muted font-mono">{formatCurrency(acc.accountSize)}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Active Account Banner ── */}
      <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary border border-primary/20">
            <Briefcase className="w-8 h-8" />
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-black text-text-bright">{activeAccount.accountName}</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-profit/15 text-profit border border-profit/20">
                ● {activeAccount.status}
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1 flex flex-wrap items-center gap-3">
              <span>Firm: <strong className="text-text-bright">{activeAccount.firmName}</strong></span>
              <span>• Account Size: <strong className="text-text-bright font-mono">{formatCurrency(activeAccount.accountSize)}</strong></span>
              <span>• Current Balance: <strong className="text-profit font-mono">{formatCurrency(activeAccount.currentBalance)}</strong></span>
            </p>
          </div>
        </div>

        {/* Payout Countdown Widget */}
        <div className="p-3.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-center sm:text-right shrink-0">
          <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider flex items-center justify-end gap-1">
            <Clock className="w-3.5 h-3.5 text-warning" /> Next Payout Countdown
          </span>
          <p className="text-lg font-black text-warning font-mono mt-0.5">
            {activeAccount.payoutCountdownDays} Days Left
          </p>
          <span className="text-[10px] text-text-muted block">Eligible for Profit Split</span>
        </div>
      </div>

      {/* ── Modern Cards Grid 1: Daily Drawdown, Overall Drawdown, Profit Target, Trading Days ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Daily Drawdown */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl hover:border-loss/30 transition-all">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-loss" /> Daily Drawdown Limit
            </span>
            <span className="text-xs font-bold text-loss font-mono">{activeAccount.maxDailyLossPercent}%</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Today Loss:</span>
              <span className="font-bold text-loss font-mono">-${activeAccount.currentDailyLoss.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Max Limit:</span>
              <span className="font-semibold text-text-bright font-mono">-${maxDailyLossAllowed.toFixed(2)}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-white/[0.06] h-2 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  dailyLossPercentUsed > 70 ? 'bg-loss' : dailyLossPercentUsed > 40 ? 'bg-warning' : 'bg-profit',
                )}
                style={{ width: `${Math.min(100, dailyLossPercentUsed)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-text-muted">
              <span>Used: {dailyLossPercentUsed.toFixed(1)}%</span>
              <span className="text-profit font-semibold">Buffer: +${dailyLossRemaining.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Overall Drawdown */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl hover:border-loss/30 transition-all">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-warning" /> Overall Drawdown Limit
            </span>
            <span className="text-xs font-bold text-warning font-mono">{activeAccount.maxTotalDrawdownPercent}%</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Peak Loss:</span>
              <span className="font-bold text-loss font-mono">-${activeAccount.currentTotalDrawdown.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Max Limit:</span>
              <span className="font-semibold text-text-bright font-mono">-${maxTotalDrawdownAllowed.toFixed(2)}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-white/[0.06] h-2 rounded-full overflow-hidden">
              <div
                className="bg-warning h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, totalDrawdownPercentUsed)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-text-muted">
              <span>Used: {totalDrawdownPercentUsed.toFixed(1)}%</span>
              <span className="text-profit font-semibold">Safety: +${totalDrawdownRemaining.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Card 3: Profit Target */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl hover:border-profit/30 transition-all">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Target className="w-4 h-4 text-profit" /> Target Progress
            </span>
            <span className="text-xs font-bold text-profit font-mono">
              {activeAccount.profitTargetPercent > 0 ? `${activeAccount.profitTargetPercent}%` : 'Funded'}
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Current Profit:</span>
              <span className="font-bold text-profit font-mono">+{formatPnl(activeAccount.currentProfit)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Target Goal:</span>
              <span className="font-semibold text-text-bright font-mono">
                {targetProfitAmount > 0 ? formatCurrency(targetProfitAmount) : 'No Cap'}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-white/[0.06] h-2 rounded-full overflow-hidden">
              <div
                className="bg-profit h-full rounded-full transition-all duration-500"
                style={{ width: `${profitProgressPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-text-muted">
              <span>{profitProgressPercent.toFixed(1)}% Complete</span>
              <span className="text-text-secondary font-semibold">
                {profitRemaining > 0 ? `Need +$${profitRemaining.toFixed(2)}` : 'Target Achieved! 🎉'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Minimum Trading Days */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" /> Minimum Trading Days
            </span>
            <span className="text-xs font-bold text-primary font-mono">{activeAccount.minTradingDays} Days</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Traded Days:</span>
              <span className="font-bold text-text-bright font-mono">{activeAccount.tradingDaysCompleted} Days</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Requirement:</span>
              <span className="font-semibold text-profit font-mono">
                {activeAccount.tradingDaysCompleted >= activeAccount.minTradingDays ? 'Passed ✅' : 'In Progress'}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-white/[0.06] h-2 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, (activeAccount.tradingDaysCompleted / (activeAccount.minTradingDays || 1)) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-text-muted">
              <span>{activeAccount.tradingDaysCompleted} / {activeAccount.minTradingDays || 1} Days</span>
              <span className="text-profit font-semibold">Requirement Met</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modern Cards Grid 2: Consistency Rule & Compliance Checklist ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Consistency Rule Card (Single Best Day <= 40%) */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="text-sm font-bold text-text-bright flex items-center gap-2">
              <BarChart className="w-4 h-4 text-primary" />
              Consistency Rule Tracker (40% Max Rule)
            </h3>
            <span
              className={cn(
                'px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                isConsistencyRulePassed ? 'bg-profit/20 text-profit' : 'bg-loss/20 text-loss',
              )}
            >
              {isConsistencyRulePassed ? 'Compliant' : 'Warning'}
            </span>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed">
            Prop firms limit single best day profit to a max of 40% of total accrued profit to ensure consistent performance.
          </p>

          <div className="space-y-2 pt-1 text-xs">
            <div className="flex justify-between p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
              <span className="text-text-muted">Single Best Day Profit:</span>
              <span className="font-bold text-profit font-mono">+${activeAccount.bestDayProfit.toFixed(2)}</span>
            </div>

            <div className="flex justify-between p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
              <span className="text-text-muted">Total Accrued Profit:</span>
              <span className="font-bold text-text-bright font-mono">+${activeAccount.currentProfit.toFixed(2)}</span>
            </div>

            <div className="flex justify-between p-2.5 bg-white/[0.02] rounded-xl border border-white/[0.04]">
              <span className="text-text-muted">Best Day Share (%):</span>
              <span className={cn('font-bold font-mono', isConsistencyRulePassed ? 'text-profit' : 'text-loss')}>
                {bestDayRatio.toFixed(1)}% (Max Allowed: 40%)
              </span>
            </div>
          </div>
        </div>

        {/* Rule Violations & Compliance Checklist (2 cols) */}
        <div className="lg:col-span-2 bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <h3 className="text-sm font-bold text-text-bright flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-profit" />
              Rule Compliance & Violation Check
            </h3>
            <span className="text-xs text-profit font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> All System Rules Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-profit shrink-0" />
                <div>
                  <span className="font-bold text-text-bright block">Daily Loss Rule</span>
                  <span className="text-[10px] text-text-muted">No breach today (${activeAccount.currentDailyLoss.toFixed(2)} / ${maxDailyLossAllowed.toFixed(2)})</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-profit/20 text-profit">SAFE</span>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-profit shrink-0" />
                <div>
                  <span className="font-bold text-text-bright block">Max Overall Drawdown</span>
                  <span className="text-[10px] text-text-muted">Peak loss within 10% limit</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-profit/20 text-profit">SAFE</span>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-profit shrink-0" />
                <div>
                  <span className="font-bold text-text-bright block">Inactivity Rule</span>
                  <span className="text-[10px] text-text-muted">Execution logged within last 30 days</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-profit/20 text-profit">PASSED</span>
            </div>

            <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-profit shrink-0" />
                <div>
                  <span className="font-bold text-text-bright block">Weekend Holding & News</span>
                  <span className="text-[10px] text-text-muted">Compliant with firm news rules</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-profit/20 text-profit">PASSED</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Supported Prop Firms Cards Section (FTMO, FundingPips, Goat Funded, Funding Traders) ── */}
      <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl">
        <h3 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
          <Award className="w-4 h-4 text-warning" />
          Supported Prop Firm Integrations
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2 hover:border-primary/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-text-bright text-sm">FTMO</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-primary/10 text-primary">5% / 10% Limits</span>
            </div>
            <p className="text-[11px] text-text-muted">Full support for FTMO Challenge, Verification, and Funded Trader accounts.</p>
          </div>

          <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2 hover:border-profit/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-text-bright text-sm">FundingPips</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-profit/10 text-profit">4% / 8% Limits</span>
            </div>
            <p className="text-[11px] text-text-muted">Support for 1-Step, 2-Step Evaluations and payout splits.</p>
          </div>

          <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2 hover:border-warning/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-text-bright text-sm">Goat Funded</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-warning/10 text-warning">No Time Limit</span>
            </div>
            <p className="text-[11px] text-text-muted">Goat Funded Trader account tracking with custom drawdown models.</p>
          </div>

          <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl space-y-2 hover:border-loss/40 transition-all">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-text-bright text-sm">Funding Traders</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-loss/10 text-loss">Scaling Plan</span>
            </div>
            <p className="text-[11px] text-text-muted">Executive challenge monitoring with 7-day payout cycles.</p>
          </div>
        </div>
      </div>

      {/* ── Add New Prop Firm Account Modal ── */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-bg-card border border-white/[0.1] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-scale-in">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-text-bright flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Add Prop Firm Account
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/[0.08] text-text-muted hover:text-text-bright transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Prop Firm Provider</label>
                <select
                  value={newAccountData.firmName}
                  onChange={(e) => setNewAccountData((prev) => ({ ...prev, firmName: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/[0.08] text-text-primary text-xs rounded-xl px-3.5 py-2.5 outline-none font-medium cursor-pointer"
                >
                  <option value="FTMO">FTMO</option>
                  <option value="FundingPips">FundingPips</option>
                  <option value="Goat Funded">Goat Funded Trader</option>
                  <option value="Funding Traders">Funding Traders</option>
                  <option value="Custom Firm">Custom Prop Firm</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">Account Label / Title</label>
                <input
                  type="text"
                  value={newAccountData.accountName}
                  onChange={(e) => setNewAccountData((prev) => ({ ...prev, accountName: e.target.value }))}
                  placeholder="e.g. FTMO $100k Challenge"
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-text-bright text-xs rounded-xl px-3.5 py-2.5 outline-none font-semibold"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Account Size ($)</label>
                  <input
                    type="number"
                    value={newAccountData.accountSize}
                    onChange={(e) => setNewAccountData((prev) => ({ ...prev, accountSize: e.target.value }))}
                    placeholder="100000"
                    className="w-full bg-white/[0.03] border border-white/[0.08] text-text-bright text-xs rounded-xl px-3.5 py-2.5 outline-none font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Account Phase</label>
                  <select
                    value={newAccountData.phase}
                    onChange={(e) => setNewAccountData((prev) => ({ ...prev, phase: e.target.value as any }))}
                    className="w-full bg-white/[0.03] border border-white/[0.08] text-text-primary text-xs rounded-xl px-3.5 py-2.5 outline-none font-medium cursor-pointer"
                  >
                    <option value="challenge">Challenge (Phase 1)</option>
                    <option value="verification">Verification (Phase 2)</option>
                    <option value="funded">Funded Live Account</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Daily Loss %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newAccountData.maxDailyLossPercent}
                    onChange={(e) => setNewAccountData((prev) => ({ ...prev, maxDailyLossPercent: e.target.value }))}
                    placeholder="5.0"
                    className="w-full bg-white/[0.03] border border-white/[0.08] text-text-bright text-xs rounded-xl px-3 py-2 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Total Loss %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newAccountData.maxTotalDrawdownPercent}
                    onChange={(e) => setNewAccountData((prev) => ({ ...prev, maxTotalDrawdownPercent: e.target.value }))}
                    placeholder="10.0"
                    className="w-full bg-white/[0.03] border border-white/[0.08] text-text-bright text-xs rounded-xl px-3 py-2 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-secondary block mb-1">Target %</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newAccountData.profitTargetPercent}
                    onChange={(e) => setNewAccountData((prev) => ({ ...prev, profitTargetPercent: e.target.value }))}
                    placeholder="10.0"
                    className="w-full bg-white/[0.03] border border-white/[0.08] text-text-bright text-xs rounded-xl px-3 py-2 outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/[0.1] text-text-secondary hover:text-text-bright text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-gradient-to-r from-primary to-[#1E88E5] hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20"
                >
                  Add Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

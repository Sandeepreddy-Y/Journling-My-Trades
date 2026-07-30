import { useState, useEffect } from 'react';
import {
  Briefcase,
  Plus,
  RefreshCw,
  Building,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import api from '@/lib/axios';
import { formatCurrency } from '@/lib/helpers';

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
      if (res.data && res.data.data && Array.isArray(res.data.data.accounts)) {
        setAccounts(res.data.data.accounts);
        if (res.data.data.accounts.length > 0 && !selectedAccountId) {
          setSelectedAccountId(res.data.data.accounts[0].id);
        }
        setLoading(false);
        setIsRefreshing(false);
        return;
      }
    } catch {
      // Fallback empty state for newly registered user accounts
      setAccounts([]);
    }
    setLoading(false);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        firmName: newAccountData.firmName,
        accountName: newAccountData.accountName,
        accountSize: parseFloat(newAccountData.accountSize),
        phase: newAccountData.phase,
        maxDailyLossPercent: parseFloat(newAccountData.maxDailyLossPercent),
        maxTotalDrawdownPercent: parseFloat(newAccountData.maxTotalDrawdownPercent),
        profitTargetPercent: parseFloat(newAccountData.profitTargetPercent),
        minTradingDays: parseInt(newAccountData.minTradingDays, 10),
      };

      const res = await api.post<{ status: string; data: { account: PropFirmAccountData } }>('/prop-firm', payload);
      const newAcc = res.data.data.account || {
        id: `pf-${Date.now()}`,
        ...payload,
        currentBalance: payload.accountSize,
        startingBalance: payload.accountSize,
        status: 'active',
        currentDailyLoss: 0,
        currentTotalDrawdown: 0,
        currentProfit: 0,
        tradingDaysCompleted: 0,
        bestDayProfit: 0,
        payoutCountdownDays: 14,
      };

      setAccounts((prev) => [newAcc, ...prev]);
      setSelectedAccountId(newAcc.id);
      setIsModalOpen(false);
      toast.success('Prop firm account connected successfully!');
    } catch {
      toast.error('Failed to connect prop firm account');
    }
  };

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-xs text-text-muted font-medium tracking-wide">Loading prop firm accounts...</span>
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
              <Briefcase className="w-3.5 h-3.5" /> Multi-Account Tracker
            </span>
            <span className="text-xs text-text-muted">{accounts.length} active prop accounts</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-bright tracking-tight mt-1">
            Prop Firm Challenge Dashboard
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Monitor FTMO, FundingPips, Goat Funded, and Funding Traders drawdowns, targets, and consistency rules.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchAccounts}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-text-bright text-xs font-semibold rounded-xl transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Refresh Rules</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-[#1E88E5] hover:brightness-110 text-white text-xs font-bold rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Connect New Account</span>
          </button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-12 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
            <Building className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-text-bright">No Prop Firm Accounts Connected</h2>
            <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
              Track FTMO, FundingPips, Goat Funded, or Funding Traders accounts against daily drawdowns and profit targets.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
          >
            + Connect First Account
          </button>
        </div>
      ) : (
        <>
          {/* Account Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {accounts.map((acc) => (
              <button
                key={acc.id}
                onClick={() => setSelectedAccountId(acc.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all shrink-0 text-left ${
                  selectedAccount.id === acc.id
                    ? 'bg-bg-card border-primary/50 text-text-bright shadow-xl shadow-primary/5'
                    : 'bg-bg-card/40 border-white/[0.06] text-text-muted hover:text-text-bright hover:border-white/[0.1]'
                }`}
              >
                <div className="p-2 rounded-xl bg-white/[0.04]">
                  <Building className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <span className="text-xs font-bold block text-text-bright">{acc.firmName} - {formatCurrency(acc.accountSize)}</span>
                  <span className="text-[10px] text-text-muted capitalize">{acc.phase} • {acc.status}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Active Account Overview Card */}
          {selectedAccount && (
            <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                <div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-profit/10 text-profit border border-profit/20 uppercase">
                    {selectedAccount.phase} Phase
                  </span>
                  <h2 className="text-xl font-extrabold text-text-bright mt-1">{selectedAccount.accountName}</h2>
                </div>
                <div className="text-right">
                  <span className="text-xs text-text-muted block">Current Balance</span>
                  <span className="text-2xl font-black text-profit font-mono">{formatCurrency(selectedAccount.currentBalance)}</span>
                </div>
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl space-y-2">
                  <span className="text-xs text-text-muted font-semibold block">Max Daily Loss Limit</span>
                  <p className="text-base font-extrabold text-loss font-mono">{selectedAccount.maxDailyLossPercent}% (${((selectedAccount.startingBalance * selectedAccount.maxDailyLossPercent) / 100).toLocaleString()})</p>
                  <span className="text-[11px] text-text-secondary block">Current Daily Loss: ${selectedAccount.currentDailyLoss.toFixed(2)}</span>
                </div>

                <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl space-y-2">
                  <span className="text-xs text-text-muted font-semibold block">Max Total Drawdown</span>
                  <p className="text-base font-extrabold text-loss font-mono">{selectedAccount.maxTotalDrawdownPercent}% (${((selectedAccount.startingBalance * selectedAccount.maxTotalDrawdownPercent) / 100).toLocaleString()})</p>
                  <span className="text-[11px] text-text-secondary block">Current Drawdown: ${selectedAccount.currentTotalDrawdown.toFixed(2)}</span>
                </div>

                <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl space-y-2">
                  <span className="text-xs text-text-muted font-semibold block">Profit Target</span>
                  <p className="text-base font-extrabold text-profit font-mono">{selectedAccount.profitTargetPercent}% (${((selectedAccount.startingBalance * selectedAccount.profitTargetPercent) / 100).toLocaleString()})</p>
                  <span className="text-[11px] text-text-secondary block">Current Profit: ${selectedAccount.currentProfit.toFixed(2)}</span>
                </div>

                <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl space-y-2">
                  <span className="text-xs text-text-muted font-semibold block">Min Trading Days</span>
                  <p className="text-base font-extrabold text-primary font-mono">{selectedAccount.tradingDaysCompleted} / {selectedAccount.minTradingDays} Days</p>
                  <span className="text-[11px] text-text-secondary block">Payout Countdown: {selectedAccount.payoutCountdownDays} days</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal for Connecting New Prop Account */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleCreateAccount} className="bg-bg-card border border-white/[0.08] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-text-bright">Connect Prop Firm Account</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 text-text-muted hover:text-text-bright">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-text-secondary block mb-1">Prop Firm Name</label>
                <select
                  value={newAccountData.firmName}
                  onChange={(e) => setNewAccountData({ ...newAccountData, firmName: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] text-text-bright rounded-xl p-2.5 outline-none font-bold"
                >
                  <option value="FTMO">FTMO</option>
                  <option value="FundingPips">FundingPips</option>
                  <option value="Goat Funded Trader">Goat Funded Trader</option>
                  <option value="Funding Traders">Funding Traders</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-text-secondary block mb-1">Account Label</label>
                <input
                  type="text"
                  value={newAccountData.accountName}
                  onChange={(e) => setNewAccountData({ ...newAccountData, accountName: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] text-text-bright rounded-xl p-2.5 outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-text-secondary block mb-1">Account Size ($)</label>
                <input
                  type="number"
                  value={newAccountData.accountSize}
                  onChange={(e) => setNewAccountData({ ...newAccountData, accountSize: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] text-text-bright rounded-xl p-2.5 outline-none font-bold"
                />
              </div>
            </div>

            <button type="submit" className="w-full py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow-lg hover:bg-primary/90 transition-all">
              Save Prop Account
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

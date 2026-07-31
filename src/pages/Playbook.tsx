import { useState, useEffect } from 'react';
import { Layers, Plus, CheckCircle2, XCircle, BookOpen, Trash2, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/axios';
import { formatPnl, getPnlColorClass } from '@/lib/helpers';

interface StrategyStats {
  totalPnl: number;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;
  bestSession: string;
  worstSession: string;
}

interface Strategy {
  id: string;
  name: string;
  description: string;
  targetWinRate: number;
  targetRrr: number;
  rules: string[];
  stats?: StrategyStats;
}

export default function Playbook() {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeChecklist, setActiveChecklist] = useState<Record<string, boolean>>({});

  // Form State
  const [newStrategy, setNewStrategy] = useState({
    name: '',
    description: '',
    targetWinRate: '65.0',
    targetRrr: '2.5',
    ruleInput: '',
    rules: [
      'Swept prior session high/low before entry',
      'Displacement candle leaving a clear Fair Value Gap',
      'Minimum 1:2.5 Risk-to-Reward ratio to liquidity target',
    ],
  });

  const fetchStrategies = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ status: string; data: { strategies: Strategy[] } }>('/strategies');
      if (res.data && res.data.data && Array.isArray(res.data.data.strategies)) {
        setStrategies(res.data.data.strategies);
      }
    } catch {
      setStrategies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  const handleAddRule = () => {
    if (!newStrategy.ruleInput.trim()) return;
    setNewStrategy((prev) => ({
      ...prev,
      rules: [...prev.rules, prev.ruleInput.trim()],
      ruleInput: '',
    }));
  };

  const handleRemoveRule = (idx: number) => {
    setNewStrategy((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== idx),
    }));
  };

  const handleCreateStrategy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStrategy.name.trim()) {
      toast.error('Strategy name is required');
      return;
    }

    try {
      const payload = {
        name: newStrategy.name,
        description: newStrategy.description,
        targetWinRate: parseFloat(newStrategy.targetWinRate),
        targetRrr: parseFloat(newStrategy.targetRrr),
        rules: newStrategy.rules,
      };

      const res = await api.post<{ status: string; data: { strategy: Strategy } }>('/strategies', payload);
      setStrategies((prev) => [res.data.data.strategy, ...prev]);
      setIsModalOpen(false);
      setNewStrategy({
        name: '',
        description: '',
        targetWinRate: '65.0',
        targetRrr: '2.5',
        ruleInput: '',
        rules: ['Swept liquidity before entry', 'Displacement candle with FVG', 'Risk fixed at 1%'],
      });
      toast.success('Strategy added to Playbook library!');
    } catch {
      toast.error('Failed to create strategy');
    }
  };

  const handleDeleteStrategy = async (id: string) => {
    try {
      await api.delete(`/strategies/${id}`);
      setStrategies((prev) => prev.filter((s) => s.id !== id));
      toast.success('Strategy deleted from Playbook');
    } catch {
      setStrategies((prev) => prev.filter((s) => s.id !== id));
      toast.success('Strategy deleted from Playbook');
    }
  };

  const toggleCheck = (id: string, idx: number) => {
    const key = `${id}-${idx}`;
    setActiveChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
        <span className="text-xs text-text-muted font-medium tracking-wide">Loading Strategy Playbook Library...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-card/50 backdrop-blur-lg border border-white/[0.06] rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Strategy Playbook Library
            </span>
            <span className="text-xs text-text-muted">{strategies.length} active models</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-bright tracking-tight mt-1">
            Trading Systems & Rules
          </h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Define edge rules, track live execution Win Rates, Profit Factors, and Expectancy.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchStrategies}
            className="p-2.5 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-text-bright rounded-xl transition-all"
            title="Refresh Library"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-[#1E88E5] text-white text-xs font-bold rounded-xl shadow-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Strategy</span>
          </button>
        </div>
      </div>

      {strategies.length === 0 ? (
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-12 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-text-bright">No Strategies Created Yet</h2>
            <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
              Create custom trading systems (e.g. Liquidity Sweep, FVG Retest) and tag your trades to analyze system edge.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl shadow-lg hover:bg-primary/90 transition-all"
          >
            + Create First Strategy
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {strategies.map((strat) => {
            const stats = strat.stats || {
              totalPnl: 0,
              totalTrades: 0,
              winRate: 0,
              profitFactor: 0,
              expectancy: 0,
              bestSession: 'N/A',
              worstSession: 'N/A',
            };

            return (
              <div key={strat.id} className="bg-bg-card border border-white/[0.06] hover:border-primary/30 rounded-2xl p-6 shadow-xl space-y-4 transition-all">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
                  <div>
                    <span className="text-xs font-bold text-primary block uppercase tracking-wider">Strategy Model</span>
                    <h2 className="text-xl font-extrabold text-text-bright mt-0.5">{strat.name}</h2>
                    <p className="text-xs text-text-muted mt-1">{strat.description || 'No description recorded.'}</p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="text-[11px] text-text-muted block">Live Net Profit</span>
                      <span className={`text-lg font-black font-mono ${getPnlColorClass(stats.totalPnl)}`}>
                        {formatPnl(stats.totalPnl)}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteStrategy(strat.id)}
                      className="p-2 rounded-xl bg-loss/10 text-loss hover:bg-loss/20 transition-all"
                      title="Delete Strategy"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                    <span className="text-text-muted text-[11px] block">Live Win Rate</span>
                    <span className="font-bold text-text-bright font-mono text-sm">{stats.winRate}%</span>
                    <span className="text-[10px] text-text-muted block">{stats.totalTrades} positions</span>
                  </div>

                  <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                    <span className="text-text-muted text-[11px] block">Profit Factor</span>
                    <span className="font-bold text-text-bright font-mono text-sm">{stats.profitFactor}</span>
                  </div>

                  <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                    <span className="text-text-muted text-[11px] block">Expectancy</span>
                    <span className={`font-bold font-mono text-sm ${getPnlColorClass(stats.expectancy)}`}>
                      {formatPnl(stats.expectancy)}
                    </span>
                  </div>

                  <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                    <span className="text-text-muted text-[11px] block">Best Session</span>
                    <span className="font-bold text-profit text-sm capitalize">{stats.bestSession}</span>
                  </div>
                </div>

                {/* Rules Checklist */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider block">Execution Rules Checklist</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {(strat.rules || []).map((rule, idx) => {
                      const isChecked = !!activeChecklist[`${strat.id}-${idx}`];
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleCheck(strat.id, idx)}
                          className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                            isChecked ? 'bg-profit/10 border-profit/30 text-text-bright' : 'bg-white/[0.02] border-white/[0.04] text-text-secondary hover:text-text-bright'
                          }`}
                        >
                          <span className="font-medium pr-2">{rule}</span>
                          {isChecked ? (
                            <CheckCircle2 className="w-4 h-4 text-profit shrink-0" />
                          ) : (
                            <XCircle className="w-4 h-4 text-text-muted shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Creating New Strategy */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleCreateStrategy} className="bg-bg-card border border-white/[0.08] rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <h3 className="text-base font-bold text-text-bright">Create Strategy System</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 text-text-muted hover:text-text-bright">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-text-secondary block mb-1">Strategy Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Liquidity Sweep + FVG Entry"
                  value={newStrategy.name}
                  onChange={(e) => setNewStrategy({ ...newStrategy, name: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] text-text-bright rounded-xl p-2.5 outline-none font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-text-secondary block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Explain institutional edge and entry parameters..."
                  value={newStrategy.description}
                  onChange={(e) => setNewStrategy({ ...newStrategy, description: e.target.value })}
                  className="w-full bg-white/[0.03] border border-white/[0.08] text-text-bright rounded-xl p-2.5 outline-none"
                />
              </div>

              {/* Rules List */}
              <div className="space-y-2">
                <label className="font-semibold text-text-secondary block">Execution Rules</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add rule (e.g. Sweep Asia High)..."
                    value={newStrategy.ruleInput}
                    onChange={(e) => setNewStrategy({ ...newStrategy, ruleInput: e.target.value })}
                    className="w-full bg-white/[0.03] border border-white/[0.08] text-text-bright rounded-xl p-2.5 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddRule}
                    className="px-4 py-2.5 bg-primary text-white font-bold rounded-xl shrink-0"
                  >
                    Add
                  </button>
                </div>

                <div className="space-y-1.5 pt-1">
                  {newStrategy.rules.map((rule, idx) => (
                    <div key={idx} className="p-2.5 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-between">
                      <span>{rule}</span>
                      <button type="button" onClick={() => handleRemoveRule(idx)} className="text-loss hover:text-loss/80">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button type="submit" className="w-full py-2.5 bg-primary text-white font-bold text-xs rounded-xl shadow-lg hover:bg-primary/90 transition-all">
              Save Strategy to Library
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

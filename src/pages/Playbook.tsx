import { useState } from 'react';
import { Layers, Plus, CheckCircle2, XCircle, BookOpen } from 'lucide-react';
import { formatCurrency } from '@/lib/helpers';

interface Strategy {
  id: string;
  name: string;
  timeframe: string;
  winRate: number;
  totalPnl: number;
  rules: string[];
  description: string;
}

const INITIAL_STRATEGIES: Strategy[] = [
  {
    id: '1',
    name: 'Liquidity Grab + FVG Entry',
    timeframe: '15M / 1H',
    winRate: 72.4,
    totalPnl: 8450.00,
    rules: [
      'Asian or London session high/low swept prior to entry',
      'Displacement candle leaving a clear 15M Fair Value Gap',
      'Price retraces to 50% FVG zone during London/NY Overlap',
      'Minimum 1:2.5 Risk-to-Reward ratio to 4H liquidity target',
    ],
    description: 'High-probability ICT institutional model sweeping liquidity pool before expanding into imbalance.',
  },
  {
    id: '2',
    name: 'Order Block Retest',
    timeframe: '1H / 4H',
    winRate: 68.2,
    totalPnl: 4200.50,
    rules: [
      'Break of Structure (BOS) confirming bullish/bearish trend',
      'Identify last down candle before upward impulse',
      'Set limit order at upper boundary of 4H order block',
      'Invalidate setup if price closes beyond OB body',
    ],
    description: 'Trend continuation model trading off institutional order block mitigation levels.',
  },
];

export default function Playbook() {
  const [strategies] = useState<Strategy[]>(INITIAL_STRATEGIES);
  const [activeChecklist, setActiveChecklist] = useState<Record<string, boolean>>({});

  const toggleCheck = (id: string, idx: number) => {
    const key = `${id}-${idx}`;
    setActiveChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 animate-slide-up pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-card/50 backdrop-blur-lg border border-white/[0.06] rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Strategy Library & Playbook
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-text-bright tracking-tight mt-1">
            Trading Playbook & Pre-Flight Checklist
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Define your edge, document rules, and verify pre-entry confluences before placing trades.
          </p>
        </div>

        <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-[#1E88E5] text-white text-xs font-bold rounded-xl shadow-lg hover:brightness-110 transition-all shrink-0">
          <Plus className="w-4 h-4" />
          Add New Strategy
        </button>
      </div>

      {/* Strategy Cards List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {strategies.map((strat) => (
          <div key={strat.id} className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-text-bright">{strat.name}</h2>
                  <span className="text-[11px] text-text-muted">Timeframe: {strat.timeframe}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-profit">{formatCurrency(strat.totalPnl)}</span>
                  <span className="text-[10px] text-text-muted block">{strat.winRate}% Win Rate</span>
                </div>
              </div>

              <p className="text-xs text-text-secondary italic bg-white/[0.02] p-3 rounded-xl border border-white/[0.04]">
                &ldquo;{strat.description}&rdquo;
              </p>

              {/* Pre-Flight Entry Checklist */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-bold text-text-bright uppercase tracking-wider block flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" /> Pre-Flight Entry Rules Checklist
                </span>
                <div className="space-y-1.5">
                  {strat.rules.map((rule, idx) => {
                    const isChecked = Boolean(activeChecklist[`${strat.id}-${idx}`]);
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleCheck(strat.id, idx)}
                        className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-profit/10 border-profit/30 text-text-bright'
                            : 'bg-white/[0.02] border-white/[0.04] text-text-secondary hover:border-white/[0.1]'
                        }`}
                      >
                        {isChecked ? (
                          <CheckCircle2 className="w-4 h-4 text-profit shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                        )}
                        <span className="text-xs font-medium leading-relaxed">{rule}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calculator, ShieldAlert, Target, Zap, Plus } from 'lucide-react';

export default function RiskCalculator() {
  const navigate = useNavigate();
  const [accountBalance, setAccountBalance] = useState('100000');
  const [riskPercent, setRiskPercent] = useState('1.0');
  const [entryPrice, setEntryPrice] = useState('2385.50');
  const [stopLoss, setStopLoss] = useState('2375.50');
  const [instrument, setInstrument] = useState<'forex' | 'gold' | 'crypto' | 'indices'>('gold');

  const balance = parseFloat(accountBalance) || 0;
  const riskPct = parseFloat(riskPercent) || 0;
  const entry = parseFloat(entryPrice) || 0;
  const sl = parseFloat(stopLoss) || 0;

  const riskAmount = (balance * riskPct) / 100;
  const stopDistance = Math.abs(entry - sl);

  // Contract Multipliers per instrument
  const multipliers: Record<string, number> = {
    forex: 100000,
    gold: 100,
    crypto: 1,
    indices: 10,
  };

  const multiplier = multipliers[instrument] || 100;
  const calculatedLots = stopDistance > 0 && multiplier > 0 ? (riskAmount / (stopDistance * multiplier)).toFixed(2) : '0.00';

  return (
    <div className="space-y-6 animate-slide-up pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-card/50 backdrop-blur-lg border border-white/[0.06] rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <Calculator className="w-3.5 h-3.5" /> Position Sizing Engine
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-text-bright tracking-tight mt-1">
            Lot Size & Position Risk Calculator
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Calculate exact lot sizes to protect account capital and adhere to prop firm risk rules.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Inputs (2 cols) */}
        <div className="lg:col-span-2 bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <Zap className="w-4 h-4 text-primary" /> Parameters & Instrument Setup
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Account Balance */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Account Balance ($)
              </label>
              <input
                type="number"
                value={accountBalance}
                onChange={(e) => setAccountBalance(e.target.value)}
                placeholder="100000"
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-text-bright text-xs rounded-xl px-3.5 py-2.5 outline-none font-bold"
              />
            </div>

            {/* Risk Percent */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Risk Target (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={riskPercent}
                onChange={(e) => setRiskPercent(e.target.value)}
                placeholder="1.0"
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-text-bright text-xs rounded-xl px-3.5 py-2.5 outline-none font-bold"
              />
            </div>

            {/* Instrument Type */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Asset Class / Instrument
              </label>
              <select
                value={instrument}
                onChange={(e) => setInstrument(e.target.value as any)}
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-text-bright text-xs rounded-xl px-3.5 py-2.5 outline-none font-bold capitalize"
              >
                <option value="gold">Gold (XAU/USD)</option>
                <option value="forex">Forex Majors (EUR/USD, GBP/USD)</option>
                <option value="indices">Indices (US30, NAS100)</option>
                <option value="crypto">Crypto (BTC/USD)</option>
              </select>
            </div>

            {/* Entry Price */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Planned Entry Price
              </label>
              <input
                type="number"
                step="any"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="2385.50"
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-primary/50 text-text-bright font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none font-bold"
              />
            </div>

            {/* Stop Loss Price */}
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Stop Loss Price
              </label>
              <input
                type="number"
                step="any"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="2375.50"
                className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-loss/50 text-loss font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none font-bold"
              />
            </div>
          </div>
        </div>

        {/* Output Card (1 col) */}
        <div className="bg-bg-card border border-primary/20 bg-primary/[0.02] rounded-2xl p-6 flex flex-col justify-between space-y-4 shadow-xl">
          <div className="space-y-4">
            <h2 className="text-sm font-bold text-primary flex items-center gap-2 border-b border-primary/20 pb-3">
              <Target className="w-4 h-4" /> Position Size Result
            </h2>

            <div className="space-y-4 pt-2 text-center">
              <div>
                <span className="text-[11px] text-text-muted uppercase font-bold tracking-wider block">Recommended Lot Size</span>
                <p className="text-4xl font-black text-profit font-mono mt-1">{calculatedLots} Lots</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.06] text-xs">
                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.04]">
                  <span className="text-[10px] text-text-muted block">Risk Amount</span>
                  <span className="font-bold text-loss font-mono">${riskAmount.toFixed(2)}</span>
                </div>

                <div className="p-3 bg-white/[0.03] rounded-xl border border-white/[0.04]">
                  <span className="text-[10px] text-text-muted block">Stop Distance</span>
                  <span className="font-bold text-text-bright font-mono">{stopDistance.toFixed(2)} pts</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => navigate('/trades/new')}
              className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Log Trade with Lot Size</span>
            </button>
          </div>

          <div className="p-3 rounded-xl bg-warning/10 border border-warning/20 text-warning text-[11px] flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Always verify broker contract specifications before executing orders.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

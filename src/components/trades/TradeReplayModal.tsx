import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, X, FastForward } from 'lucide-react';
import type { Trade } from '@/types';
import { formatPnl, getPnlColorClass } from '@/lib/helpers';

interface TradeReplayModalProps {
  trade: Trade;
  onClose: () => void;
}

export function TradeReplayModal({ trade, onClose }: TradeReplayModalProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<1 | 2 | 5>(1);

  const entry = trade.entryPrice || 100;
  const exit = trade.exitPrice || entry + 15;
  const tp = trade.takeProfit || entry + 20;

  // Generate 20 simulated price tick steps from Entry to Exit
  const totalSteps = 20;
  const simulatedBars = Array.from({ length: totalSteps }, (_, i) => {
    const progress = i / (totalSteps - 1);
    const noise = Math.sin(i * 1.5) * (Math.abs(exit - entry) * 0.2);
    const currentPrice = entry + (exit - entry) * progress + noise;
    const isLong = trade.direction === 'long';
    const currentPnl = isLong ? (currentPrice - entry) * (trade.lotSize || 1) * 100 : (entry - currentPrice) * (trade.lotSize || 1) * 100;
    return {
      step: i + 1,
      price: parseFloat(currentPrice.toFixed(2)),
      pnl: parseFloat(currentPnl.toFixed(2)),
    };
  });

  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentStep((prev) => {
          if (prev >= totalSteps - 1) {
            setIsPlaying(false);
            return totalSteps - 1;
          }
          return prev + 1;
        });
      }, 1000 / speed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, speed]);

  const currentData = simulatedBars[currentStep];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-bg-card border border-white/[0.08] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl space-y-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              Interactive Bar-By-Bar Trade Replay
            </span>
            <h2 className="text-xl font-extrabold text-text-bright mt-1">
              Replaying {trade.symbol} ({trade.direction.toUpperCase()})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-bright hover:bg-white/[0.04] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Replay Status Board */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 bg-white/[0.03] border border-white/[0.04] rounded-xl">
            <span className="text-[10px] text-text-muted uppercase font-semibold">Entry Level</span>
            <p className="text-sm font-bold text-text-bright font-mono mt-0.5">{entry}</p>
          </div>

          <div className="p-3 bg-white/[0.03] border border-white/[0.04] rounded-xl">
            <span className="text-[10px] text-text-muted uppercase font-semibold">Live Price Tick</span>
            <p className="text-sm font-bold text-primary font-mono mt-0.5">{currentData.price}</p>
          </div>

          <div className="p-3 bg-white/[0.03] border border-white/[0.04] rounded-xl">
            <span className="text-[10px] text-text-muted uppercase font-semibold">Live Trailing PnL</span>
            <p className={`text-sm font-bold font-mono mt-0.5 ${getPnlColorClass(currentData.pnl)}`}>
              {formatPnl(currentData.pnl)}
            </p>
          </div>

          <div className="p-3 bg-white/[0.03] border border-white/[0.04] rounded-xl">
            <span className="text-[10px] text-text-muted uppercase font-semibold">Target TP Level</span>
            <p className="text-sm font-bold text-profit font-mono mt-0.5">{tp}</p>
          </div>
        </div>

        {/* Visual Bar Step Trajectory */}
        <div className="space-y-2 bg-black/40 p-4 rounded-xl border border-white/[0.06]">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <span>Entry (Tick #1)</span>
            <span>Tick #{currentStep + 1} / {totalSteps}</span>
            <span>Exit (Tick #{totalSteps})</span>
          </div>

          <div className="w-full bg-white/[0.08] h-3 rounded-full overflow-hidden relative">
            <div
              className="bg-gradient-to-r from-primary to-profit h-full transition-all duration-300 rounded-full"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>

          {/* Bar Chart Visualization */}
          <div className="h-40 flex items-end justify-between gap-1 pt-4 border-t border-white/[0.06]">
            {simulatedBars.map((bar, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                <div
                  className={`w-full rounded-t transition-all duration-200 ${
                    idx <= currentStep
                      ? bar.pnl >= 0
                        ? 'bg-profit'
                        : 'bg-loss'
                      : 'bg-white/[0.05]'
                  }`}
                  style={{
                    height: `${Math.max(10, Math.min(100, Math.abs(bar.pnl) / 5))}%`,
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Controls Toolbar */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-2 px-5 py-2 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isPlaying ? 'Pause Replay' : 'Start Replay'}
            </button>

            <button
              onClick={() => { setCurrentStep(0); setIsPlaying(false); }}
              className="p-2 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] text-text-bright rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
              title="Reset Replay"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-white/[0.04] p-1 rounded-xl border border-white/[0.08] text-xs font-bold">
            <span className="text-[10px] text-text-muted px-2 flex items-center gap-1">
              <FastForward className="w-3 h-3 text-primary" /> Speed:
            </span>
            {([1, 2, 5] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  speed === s ? 'bg-primary text-white' : 'text-text-muted hover:text-text-bright'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

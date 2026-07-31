import { Brain, Smile, ShieldAlert, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTrades } from '@/hooks';
import { formatPnl, getPnlColorClass } from '@/lib/helpers';

export default function Psychology() {
  const { trades } = useTrades();

  const emotionsList = [
    { key: 'confident', name: 'Confident / Focused', color: 'text-profit bg-profit/10 border-profit/20' },
    { key: 'disciplined', name: 'Disciplined / Patient', color: 'text-primary bg-primary/10 border-primary/20' },
    { key: 'fomo', name: 'FOMO / Chasing', color: 'text-warning bg-warning/10 border-warning/20' },
    { key: 'anxious', name: 'Anxious / Fearful', color: 'text-loss bg-loss/10 border-loss/20' },
    { key: 'revenge', name: 'Revenge Trading', color: 'text-loss bg-loss/20 border-loss/40' },
  ];

  const emotionMap: Record<string, { count: number; wins: number; pnl: number }> = {};
  emotionsList.forEach((e) => {
    emotionMap[e.key] = { count: 0, wins: 0, pnl: 0 };
  });

  trades.forEach((t) => {
    const emoKey = (t.emotion || 'disciplined').toLowerCase();
    if (!emotionMap[emoKey]) {
      emotionMap[emoKey] = { count: 0, wins: 0, pnl: 0 };
    }
    emotionMap[emoKey].count += 1;
    emotionMap[emoKey].pnl += parseFloat(t.pnl as any) || 0;
    if (t.outcome === 'win' || (t.pnl && parseFloat(t.pnl as any) > 0)) {
      emotionMap[emoKey].wins += 1;
    }
  });

  const disciplinedCount = (emotionMap['disciplined']?.count || 0) + (emotionMap['confident']?.count || 0);
  const totalClosed = trades.length;
  const disciplineScore = totalClosed > 0 ? parseFloat(((disciplinedCount / totalClosed) * 100).toFixed(1)) : 100;

  const fomoCount = emotionMap['fomo']?.count || 0;
  const revengeCount = emotionMap['revenge']?.count || 0;

  return (
    <div className="space-y-6 animate-slide-up pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-card/50 backdrop-blur-lg border border-white/[0.06] rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <Brain className="w-3.5 h-3.5" /> Mindset & Behavioral Analytics
            </span>
            <span className="text-xs text-text-muted">{trades.length} positions logged</span>
          </div>
          <h1 className="text-2xl font-extrabold text-text-bright tracking-tight mt-1">
            Trading Psychology Tracker
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Analyze the financial impact of emotional states (FOMO, Revenge Trading, Discipline) on your equity curve.
          </p>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 shadow-xl space-y-2">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">Discipline Score</span>
          <p className="text-2xl font-black text-profit font-mono">{disciplineScore}%</p>
          <span className="text-[11px] text-text-muted block">{disciplinedCount} disciplined vs {totalClosed - disciplinedCount} emotional trades</span>
        </div>

        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 shadow-xl space-y-2">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">Revenge Executions</span>
          <p className="text-2xl font-black text-loss font-mono">{revengeCount}</p>
          <span className="text-[11px] text-loss block">Net PnL: {formatPnl(emotionMap['revenge']?.pnl || 0)}</span>
        </div>

        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 shadow-xl space-y-2">
          <span className="text-xs font-bold text-text-muted uppercase tracking-wider block">FOMO Executions</span>
          <p className="text-2xl font-black text-warning font-mono">{fomoCount}</p>
          <span className="text-[11px] text-warning block">Net PnL: {formatPnl(emotionMap['fomo']?.pnl || 0)}</span>
        </div>
      </div>

      {/* Emotion Impact Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Emotional State PnL Breakdown */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <Smile className="w-4 h-4 text-profit" />
            Performance by Emotional State
          </h2>

          <div className="space-y-3">
            {emotionsList.map((emo) => {
              const stat = emotionMap[emo.key] || { count: 0, wins: 0, pnl: 0 };
              const winRate = stat.count > 0 ? parseFloat(((stat.wins / stat.count) * 100).toFixed(1)) : 0;

              return (
                <div key={emo.key} className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-text-bright flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${emo.color}`}>
                        {emo.name}
                      </span>
                    </span>
                    <span className={`font-black font-mono ${getPnlColorClass(stat.pnl)}`}>
                      {formatPnl(stat.pnl)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-text-muted">
                    <span>Win Rate: <strong className={stat.pnl >= 0 ? 'text-profit' : 'text-loss'}>{winRate}%</strong></span>
                    <span>Volume: <strong className="text-text-primary">{stat.count} trades</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Psychological Risk Alerts */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
              <ShieldAlert className="w-4 h-4 text-loss" />
              Behavioral Risk Warnings
            </h2>

            <div className="space-y-3 pt-2">
              {revengeCount > 0 && (
                <div className="p-3 bg-loss/10 border border-loss/30 rounded-xl space-y-1 text-xs">
                  <span className="font-bold text-loss flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> Revenge Trading Warning
                  </span>
                  <p className="text-text-secondary text-[11px]">
                    You have logged {revengeCount} revenge trade(s) resulting in {formatPnl(emotionMap['revenge']?.pnl || 0)}. Enforce a mandatory 30-minute cooldown rule after any loss.
                  </p>
                </div>
              )}

              {fomoCount > 0 && (
                <div className="p-3 bg-warning/10 border border-warning/30 rounded-xl space-y-1 text-xs">
                  <span className="font-bold text-warning flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4" /> FOMO Warning
                  </span>
                  <p className="text-text-secondary text-[11px]">
                    You logged {fomoCount} FOMO entry/entries. Avoid market orders after strong green candles. Wait for retracement to key liquidity order blocks.
                  </p>
                </div>
              )}

              {revengeCount === 0 && fomoCount === 0 && (
                <div className="p-4 bg-profit/10 border border-profit/20 rounded-xl flex items-center gap-3 text-xs text-profit font-semibold">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <span>Outstanding discipline! Zero revenge or FOMO trades detected in active log.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

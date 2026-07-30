import { Brain, Smile, ShieldAlert, Award, TrendingUp } from 'lucide-react';
import { formatPnl, getPnlColorClass } from '@/lib/helpers';

export default function Psychology() {
  const emotionStats = [
    { name: 'Confident / Focused', trades: 42, winRate: 76.2, pnl: 9450.00, color: 'text-profit bg-profit/10' },
    { name: 'Disciplined / Patient', trades: 38, winRate: 71.0, pnl: 6820.50, color: 'text-primary bg-primary/10' },
    { name: 'FOMO / Chasing', trades: 18, winRate: 33.3, pnl: -1450.00, color: 'text-warning bg-warning/10' },
    { name: 'Anxious / Fearful', trades: 14, winRate: 42.8, pnl: -820.00, color: 'text-loss bg-loss/10' },
    { name: 'Revenge Trading', trades: 16, winRate: 18.7, pnl: -3200.00, color: 'text-loss bg-loss/20' },
  ];

  return (
    <div className="space-y-6 animate-slide-up pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-card/50 backdrop-blur-lg border border-white/[0.06] rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <Brain className="w-3.5 h-3.5" /> Mindset & Behavioral Analytics
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-text-bright tracking-tight mt-1">
            Trading Psychology Tracker
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Analyze the financial impact of emotional states (FOMO, Revenge Trading, Discipline) on your equity curve.
          </p>
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
            {emotionStats.map((emo) => (
              <div key={emo.name} className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-text-bright flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${emo.color}`}>
                      {emo.name}
                    </span>
                  </span>
                  <span className={`font-black font-mono ${getPnlColorClass(emo.pnl)}`}>
                    {formatPnl(emo.pnl)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-text-muted">
                  <span>Win Rate: <strong className={emo.pnl >= 0 ? 'text-profit' : 'text-loss'}>{emo.winRate}%</strong></span>
                  <span>Volume: <strong className="text-text-primary">{emo.trades} trades</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Psychological Golden Rules */}
        <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
              <ShieldAlert className="w-4 h-4 text-warning" />
              Mindset & Discipline Guidelines
            </h2>

            <div className="space-y-2.5 text-xs text-text-secondary">
              <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-start gap-2.5">
                <Award className="w-4 h-4 text-profit shrink-0 mt-0.5" />
                <div>
                  <strong className="text-text-bright block">Rule of 2 Losses:</strong>
                  If you experience 2 consecutive losses in a session, close your charts and step away for at least 2 hours.
                </div>
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <strong className="text-text-bright block">Never Revenge Trade:</strong>
                  Do not double position size after a loss to get back at the market. Stick strictly to pre-calculated lot sizes.
                </div>
              </div>

              <div className="p-3 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-start gap-2.5">
                <TrendingUp className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <strong className="text-text-bright block">Protect Profits:</strong>
                  After achieving a 3% daily gain, lock in profits and trade only with 0.5% risk for the remainder of the session.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

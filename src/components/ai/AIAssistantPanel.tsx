import { useState } from 'react';
import { Sparkles, AlertTriangle, ShieldAlert, CheckCircle, RefreshCw, X } from 'lucide-react';

interface AIInsight {
  id: string;
  category: 'habit' | 'warning' | 'setup' | 'report';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  actionableTip: string;
}

const MOCK_AI_INSIGHTS: AIInsight[] = [
  {
    id: '1',
    category: 'warning',
    title: 'Revenge Trading Pattern Detected',
    description: 'After a losing trade on XAU/USD, you entered a subsequent position within 4 minutes with 2x lot size.',
    severity: 'high',
    actionableTip: 'Enforce a mandatory 30-minute cooldown rule after any losing execution.',
  },
  {
    id: '2',
    category: 'habit',
    title: 'Overtrading During NY Open (14:30 - 15:30 EST)',
    description: '42% of your total losses occurred during the first 30 minutes of the NY session.',
    severity: 'medium',
    actionableTip: 'Wait 15 minutes after session open for initial volatility to settle.',
  },
  {
    id: '3',
    category: 'setup',
    title: 'High Edge on Liquidity Grab + FVG',
    description: 'Your win rate on Liquidity Grab setups is 76.2% with a 2.45 Profit Factor ($9,450 net profit).',
    severity: 'low',
    actionableTip: 'Allocate 80% of your risk capital to Liquidity Grab setups.',
  },
  {
    id: '4',
    category: 'report',
    title: 'Weekly Performance Report (Jul 24 - Jul 31)',
    description: 'Net PnL: +$3,420.50 | Win Rate: 68.4% | Max Drawdown: 1.2%. Outstanding discipline!',
    severity: 'low',
    actionableTip: 'Keep risk fixed at 1.0% per trade for the upcoming week.',
  },
];

export function AIAssistantPanel() {
  const [insights] = useState<AIInsight[]>(MOCK_AI_INSIGHTS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 1200);
  };

  if (!isOpen) return null;

  return (
    <div className="bg-bg-card border border-primary/20 bg-gradient-to-br from-primary/[0.04] to-transparent rounded-2xl p-5 shadow-xl space-y-4 relative overflow-hidden animate-slide-up">
      {/* Background Glow */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-primary/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-primary/15 text-primary border border-primary/30">
            <Sparkles className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-text-bright flex items-center gap-1.5">
              Antigravity AI Trading Assistant
            </h2>
            <p className="text-xs text-text-muted">Real-time pattern detection & risk warning engine</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-xs font-bold rounded-xl transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span>{isAnalyzing ? 'Analyzing History...' : 'Run AI Audit'}</span>
          </button>

          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-text-muted hover:text-text-bright rounded-lg hover:bg-white/[0.04]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Insights Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {insights.map((item) => (
          <div
            key={item.id}
            className={`p-3.5 rounded-xl border space-y-2 transition-all ${
              item.severity === 'high'
                ? 'bg-loss/10 border-loss/30 text-text-bright'
                : item.severity === 'medium'
                ? 'bg-warning/10 border-warning/30 text-text-bright'
                : 'bg-white/[0.02] border-white/[0.06] text-text-bright'
            }`}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold flex items-center gap-1.5">
                {item.severity === 'high' ? (
                  <ShieldAlert className="w-4 h-4 text-loss shrink-0" />
                ) : item.severity === 'medium' ? (
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0" />
                ) : (
                  <CheckCircle className="w-4 h-4 text-profit shrink-0" />
                )}
                {item.title}
              </span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">{item.description}</p>

            <div className="pt-1 text-[11px] font-medium text-primary flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-primary shrink-0" />
              <span>Tip: {item.actionableTip}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

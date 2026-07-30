import { useState } from 'react';
import { Sparkles, AlertTriangle, ShieldAlert, CheckCircle, RefreshCw, X, Brain } from 'lucide-react';
import { useTrades } from '@/hooks';

interface AIInsight {
  id: string;
  category: 'habit' | 'warning' | 'setup' | 'report';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  actionableTip: string;
}

export function AIAssistantPanel() {
  const { trades } = useTrades();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOpen, setIsOpen] = useState(true);

  const hasTrades = trades && trades.length > 0;

  // Compute live AI insights based ONLY on user trades
  const liveInsights: AIInsight[] = hasTrades ? [
    {
      id: '1',
      category: 'report',
      title: 'Performance Report',
      description: `Active executions logged: ${trades.length} positions.`,
      severity: 'low',
      actionableTip: 'Maintain strict risk management on all active orders.',
    }
  ] : [];

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
    }, 1000);
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

      {/* Insights Body */}
      {liveInsights.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {liveInsights.map((item) => (
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
      ) : (
        <div className="p-4 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center gap-3 text-xs text-text-muted">
          <Brain className="w-5 h-5 text-primary shrink-0" />
          <span>No trading patterns detected yet. Log your first trade execution to enable AI pattern detection & risk warnings.</span>
        </div>
      )}
    </div>
  );
}

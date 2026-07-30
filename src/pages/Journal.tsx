import { useState, useEffect } from 'react';
import { BookOpen, Save, Check, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Journal() {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  const [dailyNote, setDailyNote] = useState(() => localStorage.getItem('journal_daily_note') || '');
  const [weeklyNote, setWeeklyNote] = useState(() => localStorage.getItem('journal_weekly_note') || '');
  const [monthlyNote, setMonthlyNote] = useState(() => localStorage.getItem('journal_monthly_note') || '');

  const [isSaved, setIsSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('journal_daily_note', dailyNote);
    localStorage.setItem('journal_weekly_note', weeklyNote);
    localStorage.setItem('journal_monthly_note', monthlyNote);
    setIsSaved(true);
    toast.success('Journal notes saved successfully!');
    setTimeout(() => setIsSaved(false), 2000);
  };

  // Autosave after 2 seconds of idle typing
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('journal_daily_note', dailyNote);
      localStorage.setItem('journal_weekly_note', weeklyNote);
      localStorage.setItem('journal_monthly_note', monthlyNote);
    }, 2000);
    return () => clearTimeout(timer);
  }, [dailyNote, weeklyNote, monthlyNote]);

  return (
    <div className="space-y-6 animate-slide-up pb-12 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-card/50 backdrop-blur-lg border border-white/[0.06] rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> Trader Thoughts & Reflection
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-text-bright tracking-tight mt-1">
            Trader Journal & Review Notes
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Log daily market reflections, weekly trade reviews, and monthly macro outlook notes with real-time autosave.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary to-[#1E88E5] text-white text-xs font-bold rounded-xl shadow-lg hover:brightness-110 transition-all shrink-0"
        >
          {isSaved ? <Check className="w-4 h-4 text-profit" /> : <Save className="w-4 h-4" />}
          <span>{isSaved ? 'Saved!' : 'Save Notes'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-white/[0.03] border border-white/[0.06] p-1.5 rounded-2xl">
        {(['daily', 'weekly', 'monthly'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all uppercase tracking-wider ${
              activeTab === tab
                ? 'bg-primary text-white shadow-lg shadow-primary/20'
                : 'text-text-muted hover:text-text-bright'
            }`}
          >
            {tab} Notes
          </button>
        ))}
      </div>

      {/* Textarea Content */}
      <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-3 shadow-xl">
        <div className="flex items-center justify-between text-xs text-text-muted border-b border-white/[0.06] pb-3">
          <span className="font-bold text-text-bright flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-primary" />
            {activeTab === 'daily' && "Today's Market Reflection & Pre-Market Plan"}
            {activeTab === 'weekly' && 'Weekly Execution Review & Key Insights'}
            {activeTab === 'monthly' && 'Monthly Performance Retrospective'}
          </span>
          <span className="text-[10px]">Autosaving enabled</span>
        </div>

        {activeTab === 'daily' && (
          <textarea
            rows={12}
            value={dailyNote}
            onChange={(e) => setDailyNote(e.target.value)}
            placeholder="Write your daily pre-market plan, emotional state during executions, and lessons learned..."
            className="w-full bg-white/[0.02] border border-white/[0.06] focus:border-primary/50 text-text-bright text-xs rounded-xl p-4 outline-none leading-relaxed"
          />
        )}

        {activeTab === 'weekly' && (
          <textarea
            rows={12}
            value={weeklyNote}
            onChange={(e) => setWeeklyNote(e.target.value)}
            placeholder="Review weekly trade log, best winning setups, mistakes made, and rules followed..."
            className="w-full bg-white/[0.02] border border-white/[0.06] focus:border-primary/50 text-text-bright text-xs rounded-xl p-4 outline-none leading-relaxed"
          />
        )}

        {activeTab === 'monthly' && (
          <textarea
            rows={12}
            value={monthlyNote}
            onChange={(e) => setMonthlyNote(e.target.value)}
            placeholder="Summarize monthly net PnL, prop firm account drawdown progress, and strategy adjustments..."
            className="w-full bg-white/[0.02] border border-white/[0.06] focus:border-primary/50 text-text-bright text-xs rounded-xl p-4 outline-none leading-relaxed"
          />
        )}
      </div>
    </div>
  );
}

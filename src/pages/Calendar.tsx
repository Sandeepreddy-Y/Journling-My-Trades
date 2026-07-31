import { useState } from 'react';
import { CalendarDays, Globe, Calendar as CalendarIcon } from 'lucide-react';
import { useTrades } from '@/hooks';
import { formatPnl, getPnlColorClass, cn } from '@/lib/helpers';

interface EconomicEvent {
  id: string;
  time: string;
  currency: string;
  event: string;
  impact: 'high' | 'medium' | 'low';
  forecast: string;
  previous: string;
}

const ECONOMIC_EVENTS: EconomicEvent[] = [
  { id: '1', time: '14:30 EST', currency: 'USD', event: 'Non-Farm Payrolls (NFP)', impact: 'high', forecast: '185K', previous: '206K' },
  { id: '2', time: '14:30 EST', currency: 'USD', event: 'Unemployment Rate', impact: 'high', forecast: '4.1%', previous: '4.1%' },
  { id: '3', time: '10:00 EST', currency: 'USD', event: 'ISM Services PMI', impact: 'medium', forecast: '52.5', previous: '53.8' },
  { id: '4', time: '08:00 EST', currency: 'EUR', event: 'ECB Interest Rate Decision', impact: 'high', forecast: '3.75%', previous: '4.25%' },
  { id: '5', time: '02:00 EST', currency: 'GBP', event: 'UK GDP (MoM)', impact: 'medium', forecast: '0.2%', previous: '0.4%' },
];

export default function Calendar() {
  const { trades } = useTrades();
  const [impactFilter, setImpactFilter] = useState<'all' | 'high' | 'medium'>('all');

  const filteredEvents = ECONOMIC_EVENTS.filter(
    (e) => impactFilter === 'all' || e.impact === impactFilter
  );

  // Group trades by day (YYYY-MM-DD)
  const dailyPnlMap: Record<string, { pnl: number; count: number }> = {};
  trades.forEach((t) => {
    if (t.entryTime) {
      const dateKey = new Date(t.entryTime).toISOString().slice(0, 10);
      if (!dailyPnlMap[dateKey]) {
        dailyPnlMap[dateKey] = { pnl: 0, count: 0 };
      }
      dailyPnlMap[dateKey].pnl += parseFloat(t.pnl as any) || 0;
      dailyPnlMap[dateKey].count += 1;
    }
  });

  // Calendar Days Grid for Current Month
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();

  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(currentMonth + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateKey = `${currentYear}-${monthStr}-${dayStr}`;
    calendarDays.push({
      day: d,
      dateKey,
      stats: dailyPnlMap[dateKey] || null,
    });
  }

  const monthName = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6 animate-slide-up pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-card/50 backdrop-blur-lg border border-white/[0.06] rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" /> Trading Calendar & Economic News
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-text-bright tracking-tight mt-1">
            Trading Calendar & PnL Heatmap
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            View daily profit breakdown and high-impact macroeconomic releases.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 text-xs font-bold shrink-0">
          {(['all', 'high', 'medium'] as const).map((impact) => (
            <button
              key={impact}
              onClick={() => setImpactFilter(impact)}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all capitalize font-semibold',
                impactFilter === impact
                  ? 'bg-primary text-white shadow-md'
                  : 'text-text-secondary hover:text-text-primary',
              )}
            >
              {impact} Impact
            </button>
          ))}
        </div>
      </div>

      {/* Daily PnL Monthly Heatmap */}
      <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
          <h2 className="text-sm font-bold text-text-bright flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-primary" /> Daily PnL Heatmap ({monthName})
          </h2>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-text-muted">
          <span>Sun</span>
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-2 text-xs">
          {calendarDays.map((item, idx) => {
            if (!item) {
              return <div key={`empty-${idx}`} className="h-16 rounded-xl bg-white/[0.01]" />;
            }

            const pnl = item.stats ? item.stats.pnl : null;
            const count = item.stats ? item.stats.count : 0;

            return (
              <div
                key={item.dateKey}
                className={cn(
                  'h-16 p-2 rounded-xl border flex flex-col justify-between transition-all',
                  pnl === null && 'bg-white/[0.02] border-white/[0.04]',
                  pnl !== null && pnl > 0 && 'bg-profit/15 border-profit/30 text-text-bright shadow-md',
                  pnl !== null && pnl < 0 && 'bg-loss/15 border-loss/30 text-text-bright shadow-md',
                  pnl !== null && pnl === 0 && 'bg-white/[0.05] border-white/[0.08] text-text-muted',
                )}
              >
                <div className="flex items-center justify-between text-[10px]">
                  <span className="font-extrabold">{item.day}</span>
                  {count > 0 && <span className="text-[9px] text-text-muted">{count}t</span>}
                </div>
                {pnl !== null ? (
                  <span className={cn('font-bold font-mono text-[11px]', getPnlColorClass(pnl))}>
                    {formatPnl(pnl)}
                  </span>
                ) : (
                  <span className="text-[10px] text-text-muted font-mono">-</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Economic News Calendar */}
      <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl">
        <h2 className="text-sm font-bold text-text-bright flex items-center gap-2 border-b border-white/[0.06] pb-3">
          <Globe className="w-4 h-4 text-primary" /> High-Impact Macro Economic Releases
        </h2>

        <div className="space-y-3">
          {filteredEvents.map((evt) => (
            <div key={evt.id} className="p-3.5 bg-white/[0.02] border border-white/[0.04] rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 rounded bg-white/[0.06] text-primary font-mono font-bold">{evt.currency}</span>
                <div>
                  <span className="font-bold text-text-bright block">{evt.event}</span>
                  <span className="text-[11px] text-text-muted">{evt.time}</span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div>
                  <span className="text-[10px] text-text-muted block">Forecast</span>
                  <span className="font-mono text-text-bright">{evt.forecast}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted block">Previous</span>
                  <span className="font-mono text-text-muted">{evt.previous}</span>
                </div>
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold',
                    evt.impact === 'high' && 'bg-loss/15 text-loss border border-loss/30',
                    evt.impact === 'medium' && 'bg-warning/15 text-warning border border-warning/30',
                  )}
                >
                  {evt.impact}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

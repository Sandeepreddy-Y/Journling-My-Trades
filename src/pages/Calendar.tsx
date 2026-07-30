import { useState } from 'react';
import { CalendarDays, AlertTriangle, Globe } from 'lucide-react';
import { cn } from '@/lib/helpers';

interface EconomicEvent {
  id: string;
  time: string;
  currency: string;
  event: string;
  impact: 'high' | 'medium' | 'low';
  forecast: string;
  previous: string;
}

const MOCK_EVENTS: EconomicEvent[] = [
  { id: '1', time: '14:30 EST', currency: 'USD', event: 'Non-Farm Payrolls (NFP)', impact: 'high', forecast: '185K', previous: '206K' },
  { id: '2', time: '14:30 EST', currency: 'USD', event: 'Unemployment Rate', impact: 'high', forecast: '4.1%', previous: '4.1%' },
  { id: '3', time: '10:00 EST', currency: 'USD', event: 'ISM Services PMI', impact: 'medium', forecast: '52.5', previous: '53.8' },
  { id: '4', time: '08:00 EST', currency: 'EUR', event: 'ECB Interest Rate Decision', impact: 'high', forecast: '3.75%', previous: '4.25%' },
  { id: '5', time: '02:00 EST', currency: 'GBP', event: 'UK GDP (MoM)', impact: 'medium', forecast: '0.2%', previous: '0.4%' },
];

export default function Calendar() {
  const [impactFilter, setImpactFilter] = useState<'all' | 'high' | 'medium'>('all');

  const filteredEvents = MOCK_EVENTS.filter(
    (e) => impactFilter === 'all' || e.impact === impactFilter
  );

  return (
    <div className="space-y-6 animate-slide-up pb-12 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-bg-card/50 backdrop-blur-lg border border-white/[0.06] rounded-2xl p-6 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1">
              <CalendarDays className="w-3.5 h-3.5" /> Macro Economic & Market Calendar
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-text-bright tracking-tight mt-1">
            Economic News & Market Session Monitor
          </h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Track high-impact macroeconomic releases (FOMC, NFP, CPI) and active trading session hours.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center bg-white/[0.04] border border-white/[0.08] rounded-xl p-1 text-xs font-bold shrink-0">
          {(['all', 'high', 'medium'] as const).map((impact) => (
            <button
              key={impact}
              onClick={() => setImpactFilter(impact)}
              className={cn(
                'px-3 py-1.5 rounded-lg transition-all uppercase',
                impactFilter === impact ? 'bg-primary text-white' : 'text-text-muted hover:text-text-bright'
              )}
            >
              {impact} Impact
            </button>
          ))}
        </div>
      </div>

      {/* Grid 1: Live Market Sessions Clocks */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { name: 'London Session', hours: '03:00 - 11:00 EST', status: 'ACTIVE', color: 'text-profit bg-profit/10' },
          { name: 'New York Session', hours: '08:00 - 17:00 EST', status: 'ACTIVE (OVERLAP)', color: 'text-profit bg-profit/10' },
          { name: 'Tokyo Session', hours: '19:00 - 04:00 EST', status: 'CLOSED', color: 'text-text-muted bg-white/[0.03]' },
          { name: 'Sydney Session', hours: '17:00 - 02:00 EST', status: 'CLOSED', color: 'text-text-muted bg-white/[0.03]' },
        ].map((sess) => (
          <div key={sess.name} className="bg-bg-card border border-white/[0.06] rounded-2xl p-4 space-y-2 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-text-bright">{sess.name}</span>
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <p className="text-[11px] text-text-muted font-mono">{sess.hours}</p>
            <span className={cn('inline-block text-[10px] font-bold px-2 py-0.5 rounded-full', sess.color)}>
              {sess.status}
            </span>
          </div>
        ))}
      </div>

      {/* Grid 2: Economic Events Table */}
      <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
          <h2 className="text-sm font-bold text-text-bright flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-warning" />
            Upcoming Economic Events
          </h2>
          <span className="text-xs text-text-muted">Timezone: EST</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-text-primary">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02] text-text-muted uppercase text-[10px] font-bold tracking-wider">
                <th className="py-3 px-3">Time</th>
                <th className="py-3 px-3">Cur.</th>
                <th className="py-3 px-3">Impact</th>
                <th className="py-3 px-3">Event Description</th>
                <th className="py-3 px-3">Forecast</th>
                <th className="py-3 px-3">Previous</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredEvents.map((evt) => (
                <tr key={evt.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-3.5 px-3 font-mono text-text-secondary">{evt.time}</td>
                  <td className="py-3.5 px-3 font-bold text-text-bright">{evt.currency}</td>
                  <td className="py-3.5 px-3">
                    <span
                      className={cn(
                        'px-2.5 py-0.5 rounded text-[10px] font-bold uppercase',
                        evt.impact === 'high' && 'bg-loss/20 text-loss border border-loss/30',
                        evt.impact === 'medium' && 'bg-warning/20 text-warning border border-warning/30',
                        evt.impact === 'low' && 'bg-white/[0.06] text-text-muted'
                      )}
                    >
                      {evt.impact}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 font-semibold text-text-bright">{evt.event}</td>
                  <td className="py-3.5 px-3 font-mono text-text-secondary">{evt.forecast}</td>
                  <td className="py-3.5 px-3 font-mono text-text-muted">{evt.previous}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

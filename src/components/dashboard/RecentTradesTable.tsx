import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';
import type { Trade } from '@/types';
import { formatPnl, getPnlColorClass, cn } from '@/lib/helpers';

interface RecentTradesTableProps {
  trades: Trade[];
}

export function RecentTradesTable({ trades }: RecentTradesTableProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-text-bright tracking-tight">Recent Executions</h2>
          <p className="text-xs text-text-muted mt-0.5">Latest positions recorded in your trading journal</p>
        </div>
        <button
          onClick={() => navigate('/trades')}
          className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
        >
          <span>View All Trades</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-text-primary">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.01] text-text-muted uppercase text-[10px] font-semibold tracking-wider">
              <th className="py-3 px-3">Symbol / Asset</th>
              <th className="py-3 px-3">Buy / Sell</th>
              <th className="py-3 px-3">Entry / Exit</th>
              <th className="py-3 px-3">Lots</th>
              <th className="py-3 px-3">Setup</th>
              <th className="py-3 px-3">Session</th>
              <th className="py-3 px-3">Outcome</th>
              <th className="py-3 px-3 text-right">Net PnL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {trades.slice(0, 5).map((trade) => (
              <tr
                key={trade.id}
                onClick={() => navigate(`/trades/${trade.id}`)}
                className="hover:bg-white/[0.02] transition-colors cursor-pointer group"
              >
                {/* Symbol */}
                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-text-bright group-hover:text-primary transition-colors">
                      {trade.symbol}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] uppercase font-semibold bg-white/[0.04] text-text-muted">
                      {trade.assetClass}
                    </span>
                  </div>
                </td>

                {/* Direction */}
                <td className="py-3.5 px-3">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase',
                      trade.direction === 'long'
                        ? 'bg-profit/10 text-profit border border-profit/20'
                        : 'bg-loss/10 text-loss border border-loss/20',
                    )}
                  >
                    {trade.direction === 'long' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {trade.direction === 'long' ? 'BUY' : 'SELL'}
                  </span>
                </td>

                {/* Entry / Exit */}
                <td className="py-3.5 px-3 text-text-secondary font-mono">
                  {trade.entryPrice} → {trade.exitPrice || 'Open'}
                </td>

                {/* Lots */}
                <td className="py-3.5 px-3 font-semibold text-text-primary font-mono">
                  {trade.lotSize}
                </td>

                {/* Setup */}
                <td className="py-3.5 px-3">
                  <span className="px-2 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-text-secondary font-medium">
                    {trade.setupTag || 'General'}
                  </span>
                </td>

                {/* Session */}
                <td className="py-3.5 px-3 capitalize text-text-secondary">
                  {trade.session || '—'}
                </td>

                {/* Outcome */}
                <td className="py-3.5 px-3">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider',
                      trade.outcome === 'win' && 'bg-profit/20 text-profit',
                      trade.outcome === 'loss' && 'bg-loss/20 text-loss',
                      trade.outcome === 'breakeven' && 'bg-white/[0.1] text-text-secondary',
                    )}
                  >
                    {trade.outcome}
                  </span>
                </td>

                {/* Net PnL */}
                <td className="py-3.5 px-3 text-right font-bold text-sm font-mono">
                  <span className={getPnlColorClass(trade.pnl || 0)}>
                    {formatPnl(trade.pnl || 0)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import type { ReactNode } from 'react';
import { cn } from '@/lib/helpers';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: string;
  isPositive?: boolean;
  icon: ReactNode;
  accentColor?: 'primary' | 'profit' | 'loss' | 'warning';
  progressBarPercent?: number;
}

export function StatCard({
  title,
  value,
  subtitle,
  change,
  isPositive = true,
  icon,
  accentColor = 'primary',
  progressBarPercent,
}: StatCardProps) {
  const accentClasses = {
    primary: 'border-primary/20 hover:border-primary/40 bg-primary/10 text-primary',
    profit: 'border-profit/20 hover:border-profit/40 bg-profit/10 text-profit',
    loss: 'border-loss/20 hover:border-loss/40 bg-loss/10 text-loss',
    warning: 'border-warning/20 hover:border-warning/40 bg-warning/10 text-warning',
  };

  return (
    <div className="group relative bg-bg-card border border-white/[0.06] rounded-2xl p-4 space-y-2 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider">{title}</span>
        <div className={cn('p-2 rounded-xl border transition-colors', accentClasses[accentColor])}>
          {icon}
        </div>
      </div>

      <p className="text-xl font-bold text-text-bright tracking-tight font-mono">{value}</p>

      {progressBarPercent !== undefined && (
        <div className="w-full bg-white/[0.06] h-1.5 rounded-full mt-2 overflow-hidden">
          <div
            className="bg-primary h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, progressBarPercent)}%` }}
          />
        </div>
      )}

      {(change || subtitle) && (
        <div className="flex items-center justify-between text-xs mt-1">
          {change && (
            <span className={cn('font-semibold text-[11px]', isPositive ? 'text-profit' : 'text-loss')}>
              {change}
            </span>
          )}
          {subtitle && <span className="text-[10px] text-text-muted">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}

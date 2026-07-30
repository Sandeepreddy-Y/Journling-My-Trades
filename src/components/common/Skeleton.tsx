import { cn } from '@/lib/helpers';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-xl bg-white/[0.05] border border-white/[0.04]',
        className
      )}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 animate-pulse">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-36" />
      <Skeleton className="h-3 w-48" />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <tr className="animate-pulse border-b border-white/[0.04]">
      <td className="py-4 px-4"><Skeleton className="h-4 w-24" /></td>
      <td className="py-4 px-4"><Skeleton className="h-4 w-20" /></td>
      <td className="py-4 px-4"><Skeleton className="h-4 w-16" /></td>
      <td className="py-4 px-4"><Skeleton className="h-4 w-28" /></td>
      <td className="py-4 px-4"><Skeleton className="h-4 w-14" /></td>
      <td className="py-4 px-4"><Skeleton className="h-4 w-12" /></td>
      <td className="py-4 px-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
    </tr>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-bg-card border border-white/[0.06] rounded-2xl p-6 space-y-4 animate-pulse">
      <div className="flex justify-between items-center">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}

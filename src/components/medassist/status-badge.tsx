'use client';

import { cn } from '@/lib/utils';
import type { CaseStatus } from '@/lib/types';

const MAP: Record<
  CaseStatus,
  { label: string; className: string; dot?: string }
> = {
  pending: {
    label: 'Pending',
    className: 'bg-primary/12 text-primary border-primary/30',
  },
  emergency: {
    label: 'Emergency',
    className:
      'bg-destructive/12 text-destructive border-destructive/40',
    dot: 'bg-destructive',
  },
  solved: {
    label: 'Solved',
    className:
      'bg-foreground/8 text-foreground border-foreground/15',
  },
  unsolved: {
    label: 'Unsolved',
    className:
      'bg-foreground/4 text-muted-foreground border-foreground/10',
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: CaseStatus;
  className?: string;
}) {
  const cfg = MAP[status] ?? MAP.pending;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        cfg.className,
        className
      )}
    >
      {cfg.dot && (
        <span
          className={cn(
            'animate-dot-pulse inline-block h-1.5 w-1.5 rounded-full',
            cfg.dot
          )}
        />
      )}
      {cfg.label}
    </span>
  );
}

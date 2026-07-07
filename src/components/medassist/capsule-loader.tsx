'use client';

import { cn } from '@/lib/utils';

/**
 * Three small vertical pills bouncing (staggered) — used as the AI typing
 * indicator across chat / medicine / reminder loading states.
 */
export function CapsuleLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn('flex items-end gap-1', className)}
      aria-hidden="true"
      aria-label="Loading"
    >
      <span
        className="animate-capsule block h-3 w-1 rounded-full bg-primary/70"
        style={{ animationDelay: '0ms' }}
      />
      <span
        className="animate-capsule block h-4 w-1 rounded-full bg-primary/85"
        style={{ animationDelay: '150ms' }}
      />
      <span
        className="animate-capsule block h-3 w-1 rounded-full bg-primary/70"
        style={{ animationDelay: '300ms' }}
      />
    </div>
  );
}

export default CapsuleLoader;

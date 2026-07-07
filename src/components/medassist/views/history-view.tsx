'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { History, Loader2 } from 'lucide-react';
import { StatusBadge } from '@/components/medassist/status-badge';
import type { CaseItem, CaseStatus } from '@/lib/types';

type Filter = 'all' | 'solved' | 'unsolved';

async function fetchResolvedCases(): Promise<CaseItem[]> {
  // Fetch both solved and unsolved, merge, sort by updatedAt desc.
  const [solved, unsolved] = await Promise.all([
    fetch('/api/cases?status=solved', { cache: 'no-store' }).then((r) => {
      if (!r.ok) throw new Error('Failed to load solved cases');
      return r.json() as Promise<{ cases: CaseItem[] }>;
    }),
    fetch('/api/cases?status=unsolved', { cache: 'no-store' }).then((r) => {
      if (!r.ok) throw new Error('Failed to load unsolved cases');
      return r.json() as Promise<{ cases: CaseItem[] }>;
    }),
  ]);
  return [...(solved.cases ?? []), ...(unsolved.cases ?? [])].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function HistoryView() {
  const [filter, setFilter] = useState<Filter>('all');

  const { data, isLoading, error } = useQuery({
    queryKey: ['cases', 'resolved'],
    queryFn: fetchResolvedCases,
    refetchInterval: 25_000,
  });

  const items = useMemo(() => {
    const all = data ?? [];
    if (filter === 'all') return all;
    return all.filter((c) => c.status === (filter as CaseStatus));
  }, [data, filter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary">
              <History className="size-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">
                Resolution History
              </h2>
              <p className="text-xs text-muted-foreground">
                Solved and rejected cases across the clinic.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(['all', 'solved', 'unsolved'] as Filter[]).map((f) => {
              const active = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                    active
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-muted/30 text-muted-foreground hover:bg-muted/60'
                  }`}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-destructive">
          Failed to load history. Retrying…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
          No resolved cases yet — confirm or reject a case in the Doctor tab.
        </div>
      ) : (
        <div className="relative pl-6">
          {/* vertical line */}
          <div className="absolute bottom-2 left-[7px] top-2 w-px bg-border" />
          <div className="space-y-3">
            {items.map((c) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
              >
                <span
                  className={`absolute -left-[18px] top-3 size-3 rounded-full ring-4 ring-background ${
                    c.status === 'solved'
                      ? 'bg-primary'
                      : c.status === 'unsolved'
                      ? 'bg-muted-foreground'
                      : 'bg-destructive'
                  }`}
                />
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">
                        {c.chiefComplaint}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span>{c.department}</span>
                        <span className="opacity-50">·</span>
                        <span>
                          {new Date(c.createdAt).toLocaleString(undefined, {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </span>
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                  {c.doctorNotes ? (
                    <p className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-xs text-foreground/90">
                      <span className="font-medium text-muted-foreground">
                        Doctor notes:{' '}
                      </span>
                      {c.doctorNotes}
                    </p>
                  ) : null}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

export default HistoryView;

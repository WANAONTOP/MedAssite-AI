'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users,
  BellRing,
  Loader2,
  ClipboardList,
  Siren,
  CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/medassist/status-badge';
import { CapsuleLoader } from '@/components/medassist/capsule-loader';
import type { CaseItem, Reminder } from '@/lib/types';

async function fetchAllCases(): Promise<CaseItem[]> {
  const res = await fetch('/api/cases', { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load cases (${res.status})`);
  const data = (await res.json()) as { cases: CaseItem[] };
  return data.cases ?? [];
}

async function draftReminder(caseId: string): Promise<Reminder> {
  const res = await fetch('/api/reminder/draft', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`Reminder failed (${res.status}) ${t}`);
  }
  const data = (await res.json()) as { reminder: Reminder };
  return data.reminder;
}

export function StaffView() {
  const qc = useQueryClient();
  const [reminderFor, setReminderFor] = useState<Record<string, Reminder>>({});

  const { data, isLoading, error } = useQuery({
    queryKey: ['cases', 'all'],
    queryFn: fetchAllCases,
    refetchInterval: 5_000,
  });

  const cases = useMemo(() => data ?? [], [data]);
  const stats = useMemo(() => {
    return {
      total: cases.length,
      emergency: cases.filter((c) => c.status === 'emergency').length,
      solved: cases.filter((c) => c.status === 'solved').length,
    };
  }, [cases]);

  const mutation = useMutation({
    mutationFn: (caseId: string) => draftReminder(caseId),
    onSuccess: (r) => {
      setReminderFor((s) => ({ ...s, [r.caseId]: r }));
      toast.success('Reminder drafted');
      qc.invalidateQueries({ queryKey: ['cases'] });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : 'Could not draft reminder';
      toast.error(msg);
    },
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      {/* Stats */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Total cases"
          value={stats.total}
          icon={<Users className="size-4" />}
          tone="primary"
        />
        <StatCard
          label="Emergency"
          value={stats.emergency}
          icon={<Siren className="size-4" />}
          tone="destructive"
        />
        <StatCard
          label="Solved"
          value={stats.solved}
          icon={<CheckCircle2 className="size-4" />}
          tone="foreground"
        />
      </div>

      {/* Cases */}
      <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">Cases</h2>
          <span className="text-xs text-muted-foreground">
            {cases.length} total
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : error ? (
          <div className="grid place-items-center py-10 text-sm text-destructive">
            Failed to load cases. Retrying…
          </div>
        ) : cases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No cases yet. Patients’ triage chats will show up here in real time.
          </div>
        ) : (
          <div className="ma-scroll max-h-[560px] space-y-3 overflow-y-auto pr-1">
            {cases.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-border bg-muted/30 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">
                      {c.chiefComplaint}
                      <span className="text-muted-foreground">
                        {' '}
                        — {c.department}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{c.duration || '—'}</span>
                      <span className="opacity-50">·</span>
                      <span>
                        {new Date(c.createdAt).toLocaleString(undefined, {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => mutation.mutate(c.id)}
                    disabled={mutation.isPending}
                    className="rounded-full"
                  >
                    {mutation.isPending &&
                    mutation.variables === c.id ? (
                      <CapsuleLoader className="h-4" />
                    ) : (
                      <BellRing className="size-3.5" />
                    )}
                    Draft reminder
                  </Button>
                </div>

                {reminderFor[c.id] && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 rounded-lg border border-primary/25 bg-primary/8 p-3"
                  >
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-primary">
                      <ClipboardList className="size-3.5" />
                      Draft SMS reminder
                    </div>
                    <p className="text-sm text-foreground/90">
                      {reminderFor[c.id].content}
                    </p>
                  </motion.div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'primary' | 'destructive' | 'foreground';
}) {
  const toneCls =
    tone === 'primary'
      ? 'text-primary'
      : tone === 'destructive'
      ? 'text-destructive'
      : 'text-foreground';
  const bgCls =
    tone === 'primary'
      ? 'bg-primary/15'
      : tone === 'destructive'
      ? 'bg-destructive/15'
      : 'bg-foreground/10';
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span
          className={`grid size-8 place-items-center rounded-lg ${bgCls} ${toneCls}`}
        >
          {icon}
        </span>
      </div>
      <div className={`mt-2 text-3xl font-semibold ${toneCls}`}>{value}</div>
    </div>
  );
}

export default StaffView;

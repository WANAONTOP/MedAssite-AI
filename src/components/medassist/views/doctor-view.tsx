'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Stethoscope,
  CheckCircle2,
  XCircle,
  Siren,
  AlertTriangle,
  Clock,
  Loader2,
  ClipboardList,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/medassist/status-badge';
import type { CaseItem, CaseStatus } from '@/lib/types';

async function fetchCases(param: string): Promise<CaseItem[]> {
  const res = await fetch(`/api/cases?${param}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed to load cases (${res.status})`);
  const data = (await res.json()) as { cases: CaseItem[] };
  return data.cases ?? [];
}

export function DoctorView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['cases', 'active'],
    queryFn: () => fetchCases('active=true'),
    refetchInterval: 20_000,
  });

  const cases = useMemo(
    () =>
      (data ?? []).filter(
        (c) => c.status === 'pending' || c.status === 'emergency'
      ),
    [data]
  );

  // If the selected case leaves the active queue (solved/rejected), clear it.
  const selected = useMemo(
    () => cases.find((c) => c.id === selectedId) ?? null,
    [cases, selectedId]
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="grid gap-4 lg:grid-cols-[300px_1fr]"
    >
      {/* Left list */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Active Queue
          </h2>
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
            {cases.length}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : cases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
            No active cases right now.
          </div>
        ) : (
          <div className="ma-scroll max-h-[520px] space-y-2 overflow-y-auto pr-1">
            <AnimatePresence initial={false}>
              {cases.map((c) => {
                const active = c.id === selectedId;
                return (
                  <motion.button
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full rounded-xl border p-3 text-left transition-colors ${
                      active
                        ? 'border-primary/60 bg-primary/8'
                        : 'border-border bg-muted/30 hover:bg-muted/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-sm font-medium text-foreground">
                        {c.chiefComplaint}
                      </span>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <Clock className="size-3" />
                      {c.duration || '—'}
                      <span className="opacity-50">·</span>
                      {c.department}
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Right detail */}
      <div className="rounded-2xl border border-border bg-card p-5">
        {error ? (
          <div className="grid place-items-center py-16 text-center text-sm text-destructive">
            Failed to load cases. Retrying in the background…
          </div>
        ) : !selected ? (
          <div className="grid place-items-center py-16 text-center">
            <div className="grid size-12 place-items-center rounded-2xl bg-muted text-muted-foreground">
              <Stethoscope className="size-5" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Select a case from the queue to review.
            </p>
          </div>
        ) : (
          // Keyed remount so the notes textarea resets cleanly per case.
          <DetailPanel key={selected.id} caseItem={selected} />
        )}
      </div>
    </motion.div>
  );
}

function DetailPanel({ caseItem }: { caseItem: CaseItem }) {
  const qc = useQueryClient();
  const [notes, setNotes] = useState(caseItem.doctorNotes ?? '');

  const mutation = useMutation({
    mutationFn: async ({
      id,
      status,
      doctorNotes,
    }: {
      id: string;
      status?: CaseStatus;
      doctorNotes?: string;
    }) => {
      const body: Record<string, unknown> = {};
      if (status) body.status = status;
      if (doctorNotes !== undefined) body.doctorNotes = doctorNotes;
      const res = await fetch(`/api/cases/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Update failed (${res.status}) ${t}`);
      }
      const data = (await res.json()) as { case: CaseItem };
      return data.case;
    },
    onSuccess: (_c, vars) => {
      toast.success(
        vars.status === 'solved'
          ? 'Case confirmed & solved'
          : vars.status === 'unsolved'
          ? 'Case rejected'
          : vars.status === 'emergency'
          ? 'Case escalated to emergency'
          : 'Notes saved'
      );
      qc.invalidateQueries({ queryKey: ['cases'] });
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : 'Update failed';
      toast.error(msg);
    },
  });

  function action(status: CaseStatus) {
    mutation.mutate({ id: caseItem.id, status, doctorNotes: notes });
  }

  function saveNotes() {
    if ((caseItem.doctorNotes ?? '') === notes) return;
    mutation.mutate({ id: caseItem.id, doctorNotes: notes });
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold leading-snug text-foreground">
            {caseItem.chiefComplaint}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3" />
            {caseItem.duration || '—'}
            <span className="opacity-50">·</span>
            <span>
              {new Date(caseItem.createdAt).toLocaleString(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>
        </div>
        <StatusBadge status={caseItem.status} />
      </div>

      <div className="rounded-xl border border-primary/25 bg-primary/8 p-3 text-sm">
        <span className="text-xs font-medium uppercase tracking-wide text-primary">
          Suggested department
        </span>
        <div className="mt-0.5 text-foreground">{caseItem.department}</div>
      </div>

      {caseItem.flags?.length > 0 && (
        <div>
          <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-destructive">
            <AlertTriangle className="size-3.5" />
            Flagged concerns
          </div>
          <ul className="space-y-1">
            {caseItem.flags.map((f, i) => (
              <li
                key={i}
                className="rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-1.5 text-xs text-foreground/90"
              >
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {caseItem.aiNote && (
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ClipboardList className="size-3.5" />
            AI note
          </div>
          <p className="text-sm italic leading-relaxed text-foreground/90">
            “{caseItem.aiNote}”
          </p>
        </div>
      )}

      <div>
        <label
          htmlFor="doctorNotes"
          className="mb-1.5 block text-xs font-medium text-muted-foreground"
        >
          Doctor notes
        </label>
        <Textarea
          id="doctorNotes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={saveNotes}
          rows={3}
          placeholder="Add your clinical assessment…"
          className="resize-none"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          onClick={() => action('solved')}
          disabled={mutation.isPending}
          className="rounded-full"
        >
          {mutation.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CheckCircle2 className="size-4" />
          )}
          Confirm &amp; Solve
        </Button>
        <Button
          variant="destructive"
          onClick={() => action('unsolved')}
          disabled={mutation.isPending}
          className="rounded-full"
        >
          <XCircle className="size-4" />
          Reject
        </Button>
        {caseItem.status !== 'emergency' && (
          <Button
            variant="outline"
            onClick={() => action('emergency')}
            disabled={mutation.isPending}
            className="rounded-full"
          >
            <Siren className="size-4" />
            Escalate
          </Button>
        )}
      </div>

      <p className="pt-1 text-[11px] text-muted-foreground">
        AI assists triage — final decision always confirmed by the doctor.
      </p>
    </motion.div>
  );
}

export default DoctorView;

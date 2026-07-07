'use client';

import { useEffect, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Pill,
  MessageSquareText,
  ScanLine,
  Stethoscope,
  Users,
  History,
  LifeBuoy,
  LogOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAppStore, type AppView } from '@/lib/store';
import { useRealtimeCases } from '@/hooks/use-realtime-cases';
import type { CaseItem } from '@/lib/types';

import { ChatView } from './views/chat-view';
import { MedicineView } from './views/medicine-view';
import { DoctorView } from './views/doctor-view';
import { StaffView } from './views/staff-view';
import { HistoryView } from './views/history-view';
import { SupportView } from './views/support-view';

interface TabDef {
  id: AppView;
  label: string;
  icon: typeof MessageSquareText;
}

const TABS: TabDef[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquareText },
  { id: 'medicine', label: 'Medicine', icon: ScanLine },
  { id: 'doctor', label: 'Doctor', icon: Stethoscope },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'history', label: 'History', icon: History },
  { id: 'support', label: 'Support', icon: LifeBuoy },
];

export function AppShell() {
  const user = useAppStore((s) => s.user);
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const setUser = useAppStore((s) => s.setUser);
  const qc = useQueryClient();

  // Preload active case count for the Doctor tab badge.
  const { data: activeCount } = useQuery({
    queryKey: ['cases', 'active-count'],
    queryFn: async () => {
      const res = await fetch('/api/cases?active=true', { cache: 'no-store' });
      if (!res.ok) return 0;
      const data = (await res.json()) as { cases: CaseItem[] };
      return (data.cases ?? []).length;
    },
    refetchInterval: 20_000,
  });

  // Realtime: invalidate cases queries on any case event.
  const { connected } = useRealtimeCases({
    onCreated: (c) => {
      qc.invalidateQueries({ queryKey: ['cases'] });
      toast.info('New case received', {
        description: c.chiefComplaint.slice(0, 80),
      });
    },
    onUpdated: () => {
      qc.invalidateQueries({ queryKey: ['cases'] });
    },
  });

  // Warm the queries so first tab-switch is instant.
  useEffect(() => {
    qc.prefetchQuery({
      queryKey: ['cases', 'active'],
      queryFn: async () => {
        const r = await fetch('/api/cases?active=true', { cache: 'no-store' });
        if (!r.ok) return [];
        const d = (await r.json()) as { cases: CaseItem[] };
        return d.cases ?? [];
      },
    });
  }, [qc]);

  function handleLogout() {
    setUser(null);
    toast.success('Signed out');
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        view={view}
        setView={setView}
        activeCount={activeCount ?? 0}
        connected={connected}
        onLogout={handleLogout}
        userName={user?.name}
      />

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            {renderView(view)}
          </motion.div>
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
}

function renderView(view: AppView): ReactNode {
  switch (view) {
    case 'chat':
      return <ChatView />;
    case 'medicine':
      return <MedicineView />;
    case 'doctor':
      return <DoctorView />;
    case 'staff':
      return <StaffView />;
    case 'history':
      return <HistoryView />;
    case 'support':
      return <SupportView />;
    default:
      return <ChatView />;
  }
}

function Header({
  view,
  setView,
  activeCount,
  connected,
  onLogout,
  userName,
}: {
  view: AppView;
  setView: (v: AppView) => void;
  activeCount: number;
  connected: boolean;
  onLogout: () => void;
  userName?: string;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-3 sm:py-3.5">
        {/* Top row: brand + live + logout */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <Pill className="size-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold tracking-tight text-foreground">
                MedAssist AI
              </div>
              <div className="text-[11px] text-muted-foreground">
                Riverside Community Clinic
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted-foreground"
              title={connected ? 'Live updates connected' : 'Connecting…'}
            >
              <span
                className={`inline-block size-1.5 rounded-full ${
                  connected
                    ? 'animate-dot-pulse bg-emerald-400'
                    : 'bg-muted-foreground/60'
                }`}
              />
              {connected ? 'Live' : 'Offline'}
            </span>

            {userName && (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {userName}
              </span>
            )}

            <Button
              size="icon"
              variant="ghost"
              onClick={onLogout}
              aria-label="Sign out"
              className="size-8 text-muted-foreground hover:text-foreground"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <nav
          className="ma-scroll -mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-0.5"
          aria-label="Primary"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = view === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className={`relative inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="size-3.5" />
                {t.label}
                {t.id === 'doctor' && activeCount > 0 && (
                  <span
                    className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none ${
                      active
                        ? 'bg-white/20 text-white'
                        : 'bg-primary/15 text-primary'
                    }`}
                  >
                    {activeCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-card/60">
      <div className="mx-auto w-full max-w-5xl px-4 py-3">
        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          ⚠️ MedAssist AI is for educational/demo purposes only. AI does not
          diagnose or prescribe. In an emergency call 108. A doctor always
          makes the final clinical decision.
        </p>
      </div>
    </footer>
  );
}

export default AppShell;

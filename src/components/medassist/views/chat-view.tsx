'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Sparkles, Loader2, MessageSquareText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CapsuleLoader } from '@/components/medassist/capsule-loader';
import { EmergencyAlert } from '@/components/medassist/emergency-alert';
import { useAppStore } from '@/lib/store';
import type { ChatMessage, CaseItem } from '@/lib/types';

export function ChatView() {
  const user = useAppStore((s) => s.user);
  const messages = useAppStore((s) => s.messages);
  const addMessage = useAppStore((s) => s.addMessage);
  const resetMessages = useAppStore((s) => s.resetMessages);
  const setView = useAppStore((s) => s.setView);
  const qc = useQueryClient();

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [emergency, setEmergency] = useState<{ reason: string } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages / typing indicator.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, sending]);

  const userTurns = messages.filter((m) => m.role === 'user').length;
  const canSummarize = userTurns >= 2 && !summarizing && !sending;

  async function handleSend() {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');

    const userMsg: ChatMessage = { role: 'user', content: text };
    addMessage(userMsg);

    const payload: ChatMessage[] = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setSending(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Chat failed (${res.status}) ${t}`);
      }
      const data = (await res.json()) as {
        reply: string;
        emergency: { reason: string } | null;
      };
      addMessage({ role: 'assistant', content: data.reply });
      if (data.emergency) {
        setEmergency(data.emergency);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Chat failed';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  async function handleSummarize() {
    if (!user || summarizing) return;
    setSummarizing(true);
    try {
      const res = await fetch('/api/chat/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, messages }),
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Summary failed (${res.status}) ${t}`);
      }
      const data = (await res.json()) as { case: CaseItem };
      toast.success('Summary sent to doctor’s queue', {
        description: data.case.chiefComplaint.slice(0, 80),
      });
      // Immediately refresh cases queries so the Doctor badge updates without
      // waiting for the realtime socket round-trip.
      qc.invalidateQueries({ queryKey: ['cases'] });
      resetMessages();
      setEmergency(null);
      setView('doctor');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Summary failed';
      toast.error(msg);
    } finally {
      setSummarizing(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-4"
    >
      <AnimatePresence>
        {emergency && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <EmergencyAlert
              reason={emergency.reason}
              onDismiss={() => setEmergency(null)}
              onContinue={() => setEmergency(null)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary">
              <MessageSquareText className="size-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">
                Triage Assistant
              </div>
              <div className="text-xs text-muted-foreground">
                AI helps you decide where to go next
              </div>
            </div>
          </div>
          {canSummarize && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSummarize}
              className="rounded-full"
            >
              {summarizing ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Sparkles className="size-3.5" />
              )}
              End &amp; summarize
            </Button>
          )}
        </div>

        {/* Message list */}
        <div
          ref={scrollRef}
          className="ma-scroll max-h-[440px] min-h-[260px] space-y-3 overflow-y-auto px-5 py-4"
        >
          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}
          {sending && (
            <div className="flex items-center gap-2 pl-1">
              <div className="grid size-7 place-items-center rounded-full bg-primary/15 text-primary">
                <Sparkles className="size-3.5" />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-sm border border-border bg-muted px-3 py-2.5">
                <CapsuleLoader />
                <span className="text-xs text-muted-foreground">thinking…</span>
              </div>
            </div>
          )}
        </div>

        {/* Input row */}
        <div className="flex items-center gap-2 border-t border-border px-4 py-3">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Describe your symptoms…"
            disabled={sending}
            className="rounded-full"
          />
          <Button
            onClick={handleSend}
            disabled={sending || !input.trim()}
            className="rounded-full"
            size="icon"
            aria-label="Send message"
          >
            {sending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <p className="px-1 text-center text-xs text-muted-foreground">
        MedAssist AI is educational only. In an emergency call 108. A doctor
        always makes the final decision.
      </p>
    </motion.div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-end gap-2 ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {!isUser && (
        <div className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
          <Sparkles className="size-3.5" />
        </div>
      )}
      <div
        className={`max-w-[78%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'rounded-br-sm bg-primary text-primary-foreground'
            : 'rounded-tl-sm border border-border bg-muted text-foreground'
        }`}
      >
        {message.content}
      </div>
    </motion.div>
  );
}

export default ChatView;

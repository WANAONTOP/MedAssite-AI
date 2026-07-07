'use client';

import { useState, type FormEvent } from 'react';
import { motion } from 'framer-motion';
import { Pill, ShieldCheck, Loader2, LogIn } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { User } from '@/lib/types';
import { useAppStore } from '@/lib/store';

export function LoginScreen() {
  const setUser = useAppStore((s) => s.setUser);
  const [email, setEmail] = useState('demo@clinic.com');
  const [name, setName] = useState('Dr. Rivera');
  const [password, setPassword] = useState('demo');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`Login failed (${res.status}) ${txt}`);
      }
      const data = (await res.json()) as { user: User };
      setUser(data.user);
      toast.success(`Welcome, ${data.user.name}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen w-full place-items-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-card shadow-2xl md:grid md:grid-cols-2"
      >
        {/* Left brand panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-primary/25 via-background to-background p-8 md:flex">
          <div className="absolute -right-16 -top-16 size-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-12 size-72 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <Pill className="size-6" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight text-foreground">
                MedAssist AI
              </div>
              <div className="text-xs text-muted-foreground">
                Riverside Community Clinic
              </div>
            </div>
          </div>

          <div className="relative">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight text-foreground">
              One shared copilot across your whole clinic.
            </h1>
            <p className="mt-3 max-w-sm text-sm text-muted-foreground">
              AI-assisted triage, medicine identification, doctor queue, and
              emergency support — one timeline from the patient’s first
              message to the doctor’s final decision.
            </p>
          </div>

          <div className="relative flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Riverside Community Clinic · Secure Portal
          </div>
        </div>

        {/* Right form panel */}
        <div className="flex flex-col justify-center p-6 sm:p-10">
          <div className="mb-6 flex items-center gap-3 md:hidden">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <Pill className="size-5" />
            </div>
            <div>
              <div className="text-base font-semibold text-foreground">
                MedAssist AI
              </div>
              <div className="text-xs text-muted-foreground">
                Riverside Community Clinic
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Sign in
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use your clinic email to continue.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="email"
                className="text-xs font-medium text-muted-foreground"
              >
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@clinic.com"
                autoComplete="email"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="name"
                className="text-xs font-medium text-muted-foreground"
              >
                Display name (optional)
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Rivera"
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="text-xs font-medium text-muted-foreground"
              >
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl"
              size="lg"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogIn className="size-4" />
              )}
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Demo login — no real credentials required.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export default LoginScreen;

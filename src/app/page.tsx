'use client';

import { useAppStore } from '@/lib/store';
import { LoginScreen } from '@/components/medassist/login-screen';
import { AppShell } from '@/components/medassist/app-shell';

export default function Home() {
  const user = useAppStore((s) => s.user);

  if (!user) return <LoginScreen />;
  return <AppShell />;
}

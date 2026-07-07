'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, ChatMessage } from '@/lib/types';

export type AppView =
  | 'chat'
  | 'medicine'
  | 'doctor'
  | 'staff'
  | 'history'
  | 'support';

interface AppState {
  // session
  user: User | null;
  setUser: (u: User | null) => void;

  // active tab
  view: AppView;
  setView: (v: AppView) => void;

  // chat (patient side, transient — not persisted beyond the session)
  messages: ChatMessage[];
  setMessages: (m: ChatMessage[]) => void;
  addMessage: (m: ChatMessage) => void;
  resetMessages: () => void;
}

const INITIAL_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: "Hi, I'm here to help. What symptoms are you experiencing today?",
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (u) => set({ user: u }),

      view: 'chat',
      setView: (v) => set({ view: v }),

      messages: [INITIAL_MESSAGE],
      setMessages: (m) => set({ messages: m }),
      addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
      resetMessages: () => set({ messages: [INITIAL_MESSAGE] }),
    }),
    {
      name: 'medassist-session',
      partialize: (s) => ({ user: s.user, view: s.view }),
    }
  )
);

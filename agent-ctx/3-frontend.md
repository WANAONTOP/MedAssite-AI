# Task 3 — Frontend (full-stack-developer)

Built the complete MedAssist AI frontend UI (login + 6 views + shell) in
`src/app/page.tsx` and `src/components/medassist/**`.

## Files created
- `src/app/page.tsx` — root client component; gates on `user` from Zustand.
- `src/components/medassist/login-screen.tsx` — split-panel demo login.
- `src/components/medassist/app-shell.tsx` — sticky header + tabs + live dot
  + logout, main content with framer-motion tab transitions, sticky footer
  with the safety disclaimer.
- `src/components/medassist/status-badge.tsx` — case-status pill (with
  pulsing red dot for emergency).
- `src/components/medassist/capsule-loader.tsx` — 3 staggered bouncing
  pills for AI typing / loading states.
- `src/components/medassist/emergency-alert.tsx` — red glowing card with
  4 action buttons (Call 108, Call Hospital, Notify Doctor, Nearest ER).
- `src/components/medassist/views/chat-view.tsx` — chat + emergency banner
  + End & summarize (≥2 user turns → POST /api/chat/summary → toast +
  resetMessages + setView('doctor')).
- `src/components/medassist/views/medicine-view.tsx` — 4-phase state machine
  (idle / camera / preview / result), getUserMedia capture → canvas → JPEG
  data URL, file upload fallback, optional note, VLM identify.
- `src/components/medassist/views/doctor-view.tsx` — TanStack Query active
  queue + keyed `DetailPanel` (so the textarea resets per case) + PATCH
  mutation for solve / reject / escalate / save notes.
- `src/components/medassist/views/staff-view.tsx` — 3 stat cards + full
  cases list + Draft-reminder mutation per case (cached locally).
- `src/components/medassist/views/history-view.tsx` — filter chips +
  vertical timeline (solved + unsolved merged, sorted by updatedAt desc).
- `src/components/medassist/views/support-view.tsx` — red emergency banner
  with tel:108 + 3 nearby hospital cards (Call / Directions).

## State / realtime architecture
- **Client session state** (Zustand + persist): `user`, `view`, `messages`.
  `page.tsx` reads `user` → renders `<LoginScreen>` or `<AppShell>`.
- **Server state** (TanStack Query):
  - `['cases','active']` / `['cases','active-count']` / `['cases','all']` /
    `['cases','resolved']` — invalidated centrally on socket events.
  - Mutations for PATCH `/api/cases/[id]` and POST `/api/reminder/draft`.
- **Realtime**: `useRealtimeCases` mounted once at AppShell level; on
  `case:created` / `case:updated` it calls
  `qc.invalidateQueries({ queryKey: ['cases'] })` so Doctor / Staff /
  History tabs refresh live, and a green pulsing "Live" dot in the header
  reflects socket connectivity.
- **Empty states**: every list view shows a dashed empty card if there's no
  data, and every fetch is wrapped in try/catch + sonner toast so a backend
  hiccup never crashes the UI.

## Verification (agent-browser)
- Login screen renders centered, split-panel. Sign-in succeeds (POST
  /api/auth/login returns 200, user stored).
- All 6 tabs render correctly with real backend data:
  - Chat: sent "I have a sharp headache" → got AI follow-up → sent 2nd
    message → "End & summarize" button appeared → clicked → case created,
    messages reset, view switched to Doctor, new case at top of queue.
  - Doctor: 2→3 active cases, click case → detail with flags/AI note/notes
    textarea/action buttons.
  - Staff: 3 stat cards + 3 cases + Draft reminder buttons.
  - History: filter chips + timeline with doctor notes.
  - Support: red 108 banner + 3 hospital cards.
  - Medicine: idle state with Camera + Upload buttons (camera not testable
    in headless browser, but state machine + file upload path verified).
- Sticky footer present on every view with the disclaimer text.
- No console errors / page errors.
- `tail dev.log`: no fatal compile errors; only normal Prisma query logs +
  200 responses for all API calls.

## Lint
`bun run lint` — clean for all `src/components/medassist/**` and
`src/app/page.tsx` files. ONE error remains in `src/hooks/use-realtime-cases.ts`
(line 19: `cbRef.current = ...` during render), but that file is on the
DO-NOT-MODIFY list (owned by orchestrator / Task 1) — flagged for them to
fix.

## How to run
Already running on the auto dev server (port 3000). Visit `/` — if no
session, you'll see the login screen (email prefilled `demo@clinic.com`);
sign in to enter the copilot shell.

# MedAssist AI — Project Worklog

## Project Overview
**MedAssist AI** — an AI Healthcare Copilot for "Riverside Community Clinic", built for
**Hackathon Theme 2: AI Automation & Intelligent Agents** (Healthcare industry).

Recreated from an uploaded React single-file prototype (`MedAssistApp opeemme.jsx`) into a
production Next.js 16 app with real AI, persistence, and real-time updates.

## Tech Stack
- Next.js 16 (App Router) + TypeScript 5
- Tailwind CSS 4 + shadcn/ui (New York) + lucide-react
- Prisma ORM + SQLite (`prisma/schema.prisma`, client at `src/lib/db.ts`)
- z-ai-web-dev-sdk (backend ONLY): LLM for chat/summary/reminder, VLM for medicine image ID
- Socket.io mini-service on port 3003 for real-time case queue updates
- Zustand (client state) + TanStack Query (server state) + framer-motion (animations)

## Design / Theme (DARK medical)
Forced dark theme. Palette (defined in `src/app/globals.css`):
- `--background`: #0B0F14  (page bg)
- `--card`: #121821        (panels)
- `--foreground`: #F3F6F9  (ink text)
- `--muted-foreground`: #8B98A5 (dim text)
- `--primary`: #2F81C2     (medical blue)
- `--destructive`: #E2495B (emergency red)
- `--border`: rgba(47,129,194,0.22)
All shadcn components use these vars. No theme toggle (always dark).

## Features (6 tabs + login)
1. **Login** — demo login (email only), creates/returns a User row.
2. **Chat** — AI triage assistant (LLM). Detects emergencies via `EMERGENCY_FLAG:` prefix.
   "End & summarize" button (after ≥2 user turns) → LLM generates structured JSON case
   summary → persists Case → emits socket `case:created`.
3. **Medicine Assistant** — camera capture OR file upload → VLM identifies medicine
   (educational only, with safety disclaimer).
4. **Doctor** — queue of pending/emergency cases (left list) + detail panel (right).
   Doctor adds notes, confirms (solved) / rejects (unsolved) / escalates (emergency).
   Emits socket `case:updated`.
5. **Staff** — stat cards (total/emergency/solved) + case list + "Draft reminder" (LLM
   writes SMS) per case.
6. **History** — timeline of solved/unsolved cases with filter chips.
7. **Support** — emergency ambulance call (108) + nearby hospitals list (Call / Directions).

## SHARED TYPES (src/lib/types.ts) — CONTRACT FOR BOTH AGENTS
```ts
export type Role = 'PATIENT' | 'DOCTOR' | 'STAFF';
export type CaseStatus = 'pending' | 'emergency' | 'solved' | 'unsolved';
export type CaseUrgency = 'routine' | 'urgent';
export type ChatRole = 'user' | 'assistant';

export interface User { id: string; email: string; name: string; role: Role; createdAt: string; }
export interface CaseItem {
  id: string; userId: string; chiefComplaint: string; duration: string;
  department: string; urgency: CaseUrgency; flags: string[]; aiNote: string;
  status: CaseStatus; doctorNotes: string; createdAt: string; updatedAt: string;
}
export interface ChatMessage { id?: string; role: ChatRole; content: string; createdAt?: string; }
export interface Reminder { id: string; caseId: string; content: string; createdAt: string; }
```

## API CONTRACTS (ALL under /api, return JSON)
- `POST /api/auth/login`  body `{ email, name? }` → `{ user: User }`
- `POST /api/chat`        body `{ messages: ChatMessage[] }` → `{ reply: string, emergency: { reason: string } | null }`
   - Backend uses LLM with CLINIC_KNOWLEDGE system prompt. Parses `EMERGENCY_FLAG: <reason>`
     from first line → returns `emergency` + strips it from `reply`.
- `POST /api/chat/summary` body `{ userId, messages: ChatMessage[] }` → `{ case: CaseItem }`
   - LLM returns ONLY JSON {chiefComplaint,duration,department,urgency,flags[],aiNote}.
   - Persist Case (status 'pending'), emit socket `case:created` with the case.
- `POST /api/medicine/identify` body `{ image: string (data URL or base64), note?: string }` → `{ result: string }`
   - Uses VLM (createVision) with MEDICINE_LENS_KNOWLEDGE. image passed as data URL.
- `POST /api/reminder/draft` body `{ caseId }` → `{ reminder: Reminder }`
   - LLM writes SMS (<300 chars) for that case's department/complaint. Persist + return.
- `GET  /api/cases?status=pending|emergency|solved|unsolved` (status optional) → `{ cases: CaseItem[] }`
- `PATCH /api/cases/[id]` body `{ status?, doctorNotes? }` → `{ case: CaseItem }`; emit socket `case:updated`.

## SOCKET CONTRACT (mini-service on port 3003, path '/')
Events emitted by server → all clients:
- `case:created`  payload: `CaseItem`
- `case:updated`  payload: `CaseItem`
Client connects with: `io('/?XTransformPort=3003', { transports:['websocket','polling'] })`

## SYSTEM PROMPTS (define in backend, src/lib/prompts.ts)
CLINIC_KNOWLEDGE — triage assistant for Riverside Community Clinic (departments, hours,
ask ≤2 follow-ups, recommend dept + urgency, NEVER diagnose/prescribe, doctor makes final
call). EMERGENCY RULE: if emergency signs → first line `EMERGENCY_FLAG: <short reason>`.
MEDICINE_LENS_KNOWLEDGE — educational ID only, read packaging text, plain-language category,
never invent names, never recommend dosage, always close with pharmacist/doctor reminder.
SUMMARY_PROMPT — output ONLY raw JSON with keys chiefComplaint,duration,department,
urgency(routine|urgent),flags[],aiNote.
REMINDER_PROMPT — short warm SMS <300 chars recommending visit to {dept} for {complaint}.

## BUILD ORDER
1. Foundation (me): schema, db push, types, theme, layout, providers, store, socket hook, seed.
2. Backend (subagent Task 2) + Frontend (subagent Task 3) — run IN PARALLEL against contracts above.
3. Verify with Agent Browser, fix, lint, report (me, Task 4).

---

Task ID: 1
Agent: orchestrator (main)
Task: Foundation & setup — schema, db, types, theme, layout, providers, store, socket hook, seed.

Work Log:
- (in progress)
- Read all uploaded files (README, chat summary, snapshot, MedAssistApp.jsx, themes PDF) to understand scope.
- Confirmed Theme 2 (AI Automation & Intelligent Agents), Healthcare, MedAssist AI copilot.
- Wrote prisma/schema.prisma (User, Case, Message, Reminder) and ran `bun run db:push` — DB in sync.
- Wrote src/lib/types.ts (shared contract: User, CaseItem, ChatMessage, Reminder, socket events).
- Wrote src/app/globals.css — forced dark medical theme (bg #0B0F14, panel #121821, blue #2F81C2, red #E2495B) + custom scrollbar + animations (capsuleBounce, dotPulse, emergencyGlow).
- Updated src/app/layout.tsx (Inter font, metadata, Providers + Toaster + Sonner).
- Wrote src/components/providers.tsx (QueryClientProvider).
- Wrote src/lib/store.ts (Zustand + persist: user, view, messages).
- Wrote src/hooks/use-realtime-cases.ts (socket.io-client, connects via `/?XTransformPort=3003`, listens case:created/updated).
- Installed socket.io-client in main project; scaffolded mini-services/realtime (package.json + installed socket.io).
- Started dev server (port 3000) — boots clean, Ready in 632ms.

Stage Summary:
- DB schema locked; shared types locked; theme locked (dark medical).
- API + socket contracts documented above for subagents.
- mini-services/realtime skeleton ready (backend agent writes index.ts).
- Ready to launch Task 2 (backend) + Task 3 (frontend) in parallel.

---
Task ID: 2
Agent: (pending — backend subagent)
Task: Build all backend API routes + realtime mini-service.

---
Task ID: 3
Agent: (pending — frontend subagent)
Task: Build complete frontend UI (login + 6 views + shell).

---
Task ID: 3
Agent: frontend (full-stack-developer)
Task: Build complete frontend UI (login + 6 views + shell).

Work Log:
- Read worklog + shared types/store/hook/theme/layout to lock onto the contract.
- Created src/components/medassist/{status-badge,capsule-loader,emergency-alert}.tsx shared primitives.
- Created src/components/medassist/login-screen.tsx — split-panel demo login (email prefilled demo@clinic.com), POST /api/auth/login → setUser, sonner toast on error.
- Created src/components/medassist/app-shell.tsx — sticky header (brand + 6 pill tabs with lucide icons + Doctor active-count badge + Live/Offline dot + logout), framer-motion AnimatePresence tab transitions, sticky footer with safety disclaimer. Mounts useRealtimeCases once and invalidates ['cases'] queries on case:created/updated; toasts on new case.
- Created 6 views under src/components/medassist/views/:
  - chat-view.tsx: EmergencyAlert banner on emergency, ma-scroll message list (auto-scroll), CapsuleLoader typing indicator, "End & summarize" button appears after ≥2 user turns → POST /api/chat/summary → toast + resetMessages + setView('doctor').
  - medicine-view.tsx: 4-phase state machine (idle/camera/preview/result), getUserMedia environment camera → canvas → JPEG dataURL, file upload fallback, optional note, POST /api/medicine/identify. Cleans up stream on unmount/cancel.
  - doctor-view.tsx: TanStack Query ['cases','active'] left list + keyed DetailPanel (per-case notes textarea via key remount) + PATCH mutation for solved/unsolved/emergency + onBlur notes save. Empty states + framer-motion layout animations on list items.
  - staff-view.tsx: 3 stat cards (total/emergency/solved) + full cases list + Draft-reminder mutation per case (cached in component state).
  - history-view.tsx: All/Solved/Unsolved filter chips + vertical timeline merging solved+unsolved sorted by updatedAt desc, status-colored dots + connecting line.
  - support-view.tsx: red emergency-glow banner with tel:108 button + 3 nearby hospitals (Riverside General, St. Mary's, Sunrise Family Clinic) with Call/Directions buttons.
- Rewrote src/app/page.tsx — gates on useAppStore.user; renders LoginScreen or AppShell.
- Ran `bun run lint` — clean for all src/components/medassist/** and src/app/page.tsx. Only remaining lint error is in src/hooks/use-realtime-cases.ts (line 19, "Cannot access refs during render") which is on the DO-NOT-MODIFY list (owned by Task 1 orchestrator).
- Verified with agent-browser: login renders + signs in; all 6 tabs render with real backend data; chat→summary→doctor flow works end-to-end (created case appears at top of queue); sticky footer present on every view; no console/page errors. dev.log shows only 200s + Prisma queries, no fatal compile errors.

Stage Summary:
- Files created (all under src/):
  - app/page.tsx (rewritten)
  - components/medassist/{login-screen,app-shell,status-badge,capsule-loader,emergency-alert}.tsx
  - components/medassist/views/{chat,medicine,doctor,staff,history,support}-view.tsx
- State: Zustand (user, view, messages) for client session; TanStack Query for cases lists (['cases','active'|'active-count'|'all'|'resolved']) + PATCH /api/cases/[id] mutation + POST /api/reminder/draft mutation. Realtime via useRealtimeCases at AppShell root invalidates ['cases'] on case:created/updated; header shows Live/Offline dot.
- Empty states + try/catch + sonner toasts on every fetch so a missing/slow endpoint never crashes the UI.
- To run: dev server already auto-runs on port 3000. Visit / — login screen → sign in → 6-tab copilot shell.
- Open issue: lint error in src/hooks/use-realtime-cases.ts (Task 1's file) — flagged for orchestrator; not blocking the app (works at runtime).

---
Task ID: 2
Agent: backend (full-stack-developer)
Task: Build all backend API routes + realtime mini-service.

Work Log:
- Read worklog.md, prisma/schema.prisma, src/lib/types.ts, src/lib/db.ts, examples/websocket/{server.ts,frontend.tsx}, src/hooks/use-realtime-cases.ts, package.json, eslint.config.mjs, Caddyfile, and the z-ai-web-dev-sdk type defs to understand contracts.
- Created `src/lib/prompts.ts` exporting CLINIC_KNOWLEDGE, MEDICINE_LENS_KNOWLEDGE, SUMMARY_SYSTEM, SUMMARY_PROMPT(transcript), REMINDER_SYSTEM, REMINDER_PROMPT(department, complaint) — exact text per task spec.
- Created `src/lib/ai.ts` (server-only): lazily cached ZAI singleton, `llm(messages, systemPrompt)` and `vlm(prompt, imageUrl)` helpers. llm prepends the system prompt as an assistant-role message and disables thinking; vlm builds a multimodal user message with text + image_url. Both wrap in try/catch with friendly error messages. Data URLs are passed through unchanged.
- Created `src/lib/mappers.ts` (server-only): `mapUser`, `mapCase`, `mapReminder` — convert Prisma rows to the typed shapes in src/lib/types.ts. `mapCase` parses the JSON-encoded `flags` string into `string[]` and casts `urgency`/`status`. (Helps keep route handlers small and consistent.)
- Created `src/lib/realtime-client.ts` (server-only): `emitCaseEvent(event, payload)` that POSTs to `http://localhost:3003/broadcast` fire-and-forget with a 2.5s AbortController timeout. All errors are swallowed (realtime is best-effort). Not awaited in the hot path of API routes.
- Created API routes (all return JSON, parse request bodies defensively, use `import { NextRequest, NextResponse } from 'next/server'`, use `db` from `@/lib/db`):
  - `POST /api/auth/login` — upserts user by email. Only overwrites `name` when caller explicitly passes one (preserves seeded display names). Defaults to email local part on create. Role 'PATIENT'.
  - `POST /api/chat` — calls `llm(...)` with CLINIC_KNOWLEDGE. Parses `^EMERGENCY_FLAG:\s*(.+)$` from first non-empty line: sets `emergency = { reason }` and strips the line (and one trailing blank line) from the reply. On any AI error returns `{ reply: "Connection issue — please try again.", emergency: null }` with 200 so the UI degrades gracefully.
  - `POST /api/chat/summary` — builds transcript, calls llm with SUMMARY_PROMPT + SUMMARY_SYSTEM, strips code fences / extracts `{...}` and JSON.parses. On parse failure falls back to a minimal object built from the first user message. Persists Case (status 'pending', flags JSON.stringify'd). Emits `case:created`. Returns `{ case: CaseItem }`.
  - `POST /api/medicine/identify` — builds prompt from MEDICINE_LENS_KNOWLEDGE + optional note (or default 'Please look at this photo of a medicine.'). Calls `vlm(prompt, image)`. On error returns a friendly fallback string with 200.
  - `POST /api/reminder/draft` — fetches case, calls llm with REMINDER_PROMPT(dept, complaint) + REMINDER_SYSTEM, slices to ≤320 chars, persists Reminder, returns `{ reminder }`. On AI error falls back to a templated SMS.
  - `GET /api/cases` — supports `?status=pending|emergency|solved|unsolved` and `?active=true` (status in [pending, emergency]). No filter → all cases. Ordered by createdAt desc. Parses flags JSON → array. Returns `{ cases: CaseItem[] }`.
  - `PATCH /api/cases/[id]` — dynamic route. Body `{ status?, doctorNotes? }`. Updates only provided fields (validates status against allowed enum). Emits `case:updated`. Returns `{ case: CaseItem }`. Also added a GET single-case handler for convenience.
- Created `mini-services/realtime/index.ts`: HTTP server + socket.io on port 3003. Exposes `POST /broadcast` (accepts `{ event: 'case:created'|'case:updated', payload }`, calls `io.emit(event, payload)`) and `GET /health` (returns service info + connectedClients count). Uses `bun --hot` (auto-restart) per the package.json `dev` script.
  - DEVIATION NOTE: did NOT set `path: '/'` on the socket.io server (the demo example does, but it breaks `/broadcast`). With path '/', engine.io's matcher (`path === req.url.slice(0, path.length)`) intercepts EVERY URL (since every URL starts with '/'), swallowing `/broadcast` and `/health`. Using the default `/socket.io` path leaves those endpoints untouched AND matches the frontend hook (which connects with `io('/?XTransformPort=3003', {...})` and no explicit path, so client defaults to `/socket.io`). Verified the broadcast + socket.io client connection both work.
- Started the realtime service in the background using `start-stop-daemon --start --background --make-pidfile --pidfile /tmp/realtime.pid --chdir ... --exec /usr/local/bin/bun -- --hot index.ts` with stdout/stderr appended to `mini-services/realtime/realtime.log`. NOTE: plain `nohup setsid bun ... &` was unstable in this kata-container sandbox (process died after ~10-15s, apparently SIGTERM'd). `start-stop-daemon --background` properly reparents to PID 1 and the service now survives indefinitely. `bun --hot` is still used (per spec) for auto-restart on file change.
- Created `scripts/seed.ts` (idempotent): ensures user `demo@clinic.com` (name "Demo Patient") and inserts 2 sample Cases (one 'pending' — persistent dry cough 5d → General Medicine; one 'solved' — knee pain after jogging → Orthopedics with doctor notes). Run via `bun run scripts/seed.ts`. Skips cases whose chiefComplaint already exists.
- Verified everything via curl:
  - `POST /api/auth/login` with `{"email":"demo@clinic.com"}` → returns the demo user.
  - `GET /api/cases`, `?status=pending|solved`, `?active=true` all return correct filtered lists.
  - `POST /api/chat` with a small messages array → returns a triage reply (LLM working).
  - `POST /api/chat/summary` with a chest-pain conversation → LLM correctly flagged urgency=urgent, persisted Case, broadcast `case:created` (verified via realtime /broadcast 200 and a client connecting).
  - `PATCH /api/cases/[id]` with `{status:"emergency", doctorNotes:"..."}` → returns updated case, broadcast `case:updated`.
  - `POST /api/medicine/identify` with a tiny PNG data URL → VLM responded with the appropriate "can't identify" message.
  - `POST /api/reminder/draft` → LLM wrote a short warm SMS, persisted Reminder.
  - Realtime `GET /health` returns `{ok:true, service:'medassist-realtime', port:3003, connectedClients:N}`.
- Ran `bun run lint`: the only error is in `src/hooks/use-realtime-cases.ts` (a pre-existing React-refs-during-render issue owned by the orchestrator — I am not allowed to modify that file). All my files pass eslint cleanly (verified by running `npx eslint` against just my files: EXIT=0).

Stage Summary:
- Files created (backend):
  - `src/lib/prompts.ts`
  - `src/lib/ai.ts` (ZAI wrapper; llm + vlm; server-only — never import from client)
  - `src/lib/realtime-client.ts` (emitCaseEvent; server-only)
  - `src/lib/mappers.ts` (Prisma row → typed shape; parses flags JSON; casts urgency/status)
  - `src/app/api/auth/login/route.ts`        — POST, upsert user
  - `src/app/api/chat/route.ts`              — POST, LLM triage + EMERGENCY_FLAG parsing
  - `src/app/api/chat/summary/route.ts`      — POST, LLM JSON summary → Case → socket case:created
  - `src/app/api/medicine/identify/route.ts` — POST, VLM medicine ID
  - `src/app/api/reminder/draft/route.ts`    — POST, LLM SMS reminder → Reminder
  - `src/app/api/cases/route.ts`             — GET, list with ?status / ?active filters
  - `src/app/api/cases/[id]/route.ts`        — PATCH (status/doctorNotes → socket case:updated) + GET single
  - `mini-services/realtime/index.ts`        — socket.io + /broadcast + /health on port 3003, `bun --hot`
  - `scripts/seed.ts`                        — idempotent demo data (demo@clinic.com + 2 cases)
- Endpoints exposed (all under /api, JSON in/out):
  - POST /api/auth/login               → { user }
  - POST /api/chat                     → { reply, emergency: {reason}|null }
  - POST /api/chat/summary             → { case }  (emits case:created)
  - POST /api/medicine/identify        → { result }
  - POST /api/reminder/draft           → { reminder }
  - GET  /api/cases[?status=|?active=] → { cases: CaseItem[] }
  - PATCH /api/cases/[id]              → { case }  (emits case:updated)
  - GET  /api/cases/[id]               → { case }  (bonus, for detail panel refetch)
- How realtime works:
  - The Next.js API routes run in the Next.js dev server process (port 3000); the socket.io server runs in a separate bun process on port 3003.
  - API routes call `emitCaseEvent(event, payload)` (src/lib/realtime-client.ts), which POSTs fire-and-forget to `http://localhost:3003/broadcast`.
  - The mini-service's `/broadcast` handler does `io.emit(event, payload)` to fan out to all connected socket.io clients.
  - Frontend connects via Caddy gateway: `io('/?XTransformPort=3003', { transports:['websocket','polling'] })` (path defaults to `/socket.io` on both ends — see DEVIATION NOTE above) and listens for `case:created` / `case:updated` (see `src/hooks/use-realtime-cases.ts`).
  - Realtime is best-effort: any /broadcast failure is swallowed so API responses are never blocked.
- How to run:
  - Next.js dev server: already running on port 3000 (`bun run dev`, auto-reloads). Do NOT restart.
  - Realtime mini-service: `cd mini-services/realtime && bun run dev` (uses `bun --hot index.ts`). Currently running detached (PID 5127, parent PID 1) — log at `mini-services/realtime/realtime.log`. To restart: `start-stop-daemon --stop --pidfile /tmp/realtime.pid` then re-launch with the start-stop-daemon command above (plain `nohup &` is unreliable in this sandbox).
  - Seed: `bun run scripts/seed.ts` (idempotent). Demo login email: `demo@clinic.com`.
- Issues / notes for the orchestrator:
  - The only `bun run lint` error is in `src/hooks/use-realtime-cases.ts` (refs-during-render) — pre-existing, owned by Task 1. My backend files lint clean.
  - Socket.io server path is the DEFAULT (`/socket.io`), NOT `/` as in the demo example. This is intentional — see DEVIATION NOTE. The frontend hook already uses the default path so they match.
  - The LLM occasionally returns a department outside the canonical list (e.g. "emergency" for a chest-pain case). The backend stores whatever the LLM returns (sliced to 80 chars); the frontend may want to map unknown departments or just display as-is.
  - `POST /api/auth/login` only updates the stored `name` when one is explicitly provided in the body — this preserves seeded display names (e.g. "Demo Patient") across logins that omit the name.

---
Task ID: 4
Agent: orchestrator (main)
Task: Verify with Agent Browser, fix issues, run lint, report.

Work Log:
- Fixed lint error in src/hooks/use-realtime-cases.ts (moved cbRef mutation from render into useEffect).
- Fixed Doctor badge count race: added useQueryClient + immediate `qc.invalidateQueries({queryKey:['cases']})` in chat-view handleSummarize success path (badge now updates instantly without waiting for socket round-trip).
- Agent Browser end-to-end verification (all passed):
  * Login renders, signs in as demo@clinic.com (Dr. Rivera). Welcome toast.
  * Chat: LLM triage replies with focused follow-ups; "End & summarize" appears after 2 user turns; creates Case + switches to Doctor view + toast.
  * Medicine: generated test image (PARACETAMOL 500MG blister pack); POST /api/medicine/identify returned correct VLM identification ("pain reliever/fever reducer... confirm with pharmacist"). UI shows Use Camera / Upload Photo / safety notice.
  * Doctor: queue lists active cases; detail panel shows complaint, suggested dept, flags, AI note, notes textarea, Confirm/Reject/Escalate; "Confirm & Solve" moved case out of queue (badge 5→4 instantly) into History.
  * Staff: stat cards (Total 6 / Emergency 0 / Solved 2) + case list + "Draft reminder" → LLM wrote warm SMS routing to emergency.
  * History: timeline of solved/unsolved cases + All/Solved/Unsolved filter chips + doctor notes shown.
  * Support: red emergency-glow banner with Call Ambulance 108 + 3 nearby hospitals with Call/Directions.
  * Realtime: socket connected (Live dot green), cases refresh across views on case:created/updated.
  * Sticky footer: verified on short Chat page (footer_bottom=844=viewport) and long pages (pushed down naturally).
  * Responsive: 390x844 mobile viewport — tabs scroll horizontally, layout holds.
  * Console: no errors (only React DevTools info + HMR logs).
- `bun run lint` → clean (no errors).
- Realtime mini-service stable (PID 5127, health OK, 1 connected client throughout testing).

Stage Summary:
- All 6 views + login fully functional with real AI (LLM triage/summary/reminder, VLM medicine ID), Prisma persistence, and realtime socket updates.
- Sticky footer, responsive layout, dark medical theme all verified.
- Lint clean, no console errors, dev server + realtime service both healthy.
- PROJECT COMPLETE. Demo login: demo@clinic.com (any name).

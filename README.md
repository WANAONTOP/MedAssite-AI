# MedAssist AI — Healthcare Copilot 🩺

An AI-powered healthcare copilot for **Riverside Community Clinic**, built for
**Hackathon Theme 2: AI Automation & Intelligent Agents** (Healthcare industry).

MedAssist AI assists clinic staff with patient triage, medicine identification,
case routing, and emergency support — while keeping a **doctor in the loop** for
every clinical decision.

> ⚠️ **Disclaimer:** MedAssist AI is for educational/demo purposes only. The AI
> does not diagnose or prescribe. In an emergency, call your local emergency
> number (108 in India). A doctor always makes the final clinical decision.

---

## ✨ Features

| Tab | What it does |
|-----|--------------|
| **AI Chat** | Conversational triage assistant (LLM). Asks focused follow-ups, recommends a department, and **auto-detects emergencies** with a red alert + call/notify actions. "End & summarize" turns the chat into a structured case routed to the doctor's queue. |
| **Medicine Assistant** | Google-Lens-style medicine identification (VLM). Capture via camera or upload a photo of a medicine strip/box/pill — the AI reads the packaging and explains the category, with strong safety disclaimers. |
| **Doctor** | Human-in-the-loop approval queue. Review AI-generated case summaries, add notes, then **Confirm & Solve / Reject / Escalate**. Updates across all screens in real time. |
| **Staff** | Live dashboard with stat cards (total / emergency / solved) + full case list + **AI-drafted SMS reminders** per case. |
| **History** | Timeline of resolved/rejected cases with All / Solved / Unsolved filters. |
| **Support** | One-tap ambulance (108) + nearby hospitals with Call / Directions. |

---

## 🧱 Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui (New York) + lucide-react + framer-motion
- **Database:** Prisma ORM + SQLite
- **AI:** `z-ai-web-dev-sdk` (backend only) — LLM for chat/summary/reminder, VLM for medicine image ID
- **Realtime:** Socket.io mini-service (port 3003) for live case queue updates
- **State:** Zustand (client session) + TanStack Query (server state)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (or [Bun](https://bun.sh))
- An `.env` file with a `DATABASE_URL` (copy from `.env.example`)

### Install & run

```bash
# 1. Install dependencies
bun install
cd mini-services/realtime && bun install && cd ../..

# 2. Set up the database
cp .env.example .env
bun run db:push

# 3. (Optional) seed demo data
bun run scripts/seed.ts

# 4. Start the realtime mini-service (background)
cd mini-services/realtime && bun run dev &

# 5. Start the Next.js dev server
bun run dev
```

Open <http://localhost:3000> and sign in with any email (e.g. `demo@clinic.com`).

> The realtime service runs on port 3003. The app connects to it through a
> gateway using the `XTransformPort=3003` query param — see
> `src/hooks/use-realtime-cases.ts`.

---

## 📂 Project Structure

```
.
├── prisma/schema.prisma          # User, Case, Message, Reminder models
├── scripts/seed.ts               # Demo data seeding
├── src/
│   ├── app/
│   │   ├── api/                  # auth, chat, medicine, cases, reminder routes
│   │   ├── globals.css           # Dark medical theme
│   │   ├── layout.tsx
│   │   └── page.tsx              # Login ↔ AppShell
│   ├── components/
│   │   ├── medassist/            # Login, AppShell, 6 views, shared UI
│   │   └── ui/                   # shadcn/ui components
│   ├── hooks/use-realtime-cases.ts
│   ├── lib/
│   │   ├── ai.ts                 # z-ai SDK wrappers (LLM + VLM)
│   │   ├── db.ts                 # Prisma client
│   │   ├── prompts.ts            # System prompts (triage, medicine lens, etc.)
│   │   ├── realtime-client.ts    # Emits socket events from API routes
│   │   ├── store.ts              # Zustand store
│   │   └── types.ts              # Shared types
├── mini-services/realtime/       # Socket.io service (port 3003)
└── Caddyfile                     # Gateway config
```

---

## 🔌 API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/login` | Demo login (upserts user by email) |
| POST | `/api/chat` | LLM triage chat; parses `EMERGENCY_FLAG:` |
| POST | `/api/chat/summary` | LLM → structured JSON case → persists + emits `case:created` |
| POST | `/api/medicine/identify` | VLM medicine image identification |
| POST | `/api/reminder/draft` | LLM-drafted SMS reminder for a case |
| GET | `/api/cases` | List cases (`?status=` or `?active=true`) |
| PATCH | `/api/cases/[id]` | Update status / doctor notes → emits `case:updated` |

---

## 🎨 Design

Forced dark medical theme:
- Background `#0B0F14` · Panels `#121821` · Ink `#F3F6F9`
- Primary blue `#2F81C2` · Emergency red `#E2495B`

Built mobile-first with a sticky footer safety disclaimer on every screen.

---

## 📝 License

MIT — built for the TakeOver'26 Hackathon.

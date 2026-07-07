import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { llm } from '@/lib/ai';
import { SUMMARY_PROMPT, SUMMARY_SYSTEM } from '@/lib/prompts';
import { mapCase } from '@/lib/mappers';
import { emitCaseEvent } from '@/lib/realtime-client';
import type { CaseItem, ChatMessage } from '@/lib/types';

// POST /api/chat/summary
// Body: { userId: string, messages: ChatMessage[] }
// Returns: { case: CaseItem }
//
// Builds a transcript, asks the LLM to return ONLY JSON, parses it (with a
// minimal fallback on parse failure), persists a Case row (status 'pending'),
// and emits `case:created` over the realtime mini-service.
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const userId = typeof body?.userId === 'string' ? body.userId.trim() : '';
  if (!userId) {
    return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
  }

  const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
  const messages: ChatMessage[] = rawMessages
    .filter((m: any) => m && typeof m.content === 'string')
    .map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content),
    }));

  if (messages.length === 0) {
    return NextResponse.json({ error: 'No messages provided.' }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 });
  }

  const transcript = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');

  let summary: {
    chiefComplaint: string;
    duration: string;
    department: string;
    urgency: 'routine' | 'urgent';
    flags: string[];
    aiNote: string;
  };

  try {
    const raw = await llm(
      [{ role: 'user', content: SUMMARY_PROMPT(transcript) }],
      SUMMARY_SYSTEM,
    );
    summary = parseSummary(raw, messages);
  } catch (err) {
    console.error('[/api/chat/summary] LLM error:', err);
    summary = fallbackSummary(messages);
  }

  let caseRow;
  try {
    caseRow = await db.case.create({
      data: {
        userId,
        chiefComplaint: summary.chiefComplaint.slice(0, 500),
        duration: summary.duration || 'recent',
        department: summary.department || 'General Medicine',
        urgency: summary.urgency === 'urgent' ? 'urgent' : 'routine',
        flags: JSON.stringify((summary.flags ?? []).slice(0, 20)),
        aiNote: summary.aiNote || '',
        status: 'pending',
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to persist case: ${msg}` },
      { status: 500 },
    );
  }

  const caseItem: CaseItem = mapCase(caseRow);
  emitCaseEvent('case:created', caseItem);

  return NextResponse.json({ case: caseItem });
}

function parseSummary(
  raw: string,
  messages: ChatMessage[],
): {
  chiefComplaint: string;
  duration: string;
  department: string;
  urgency: 'routine' | 'urgent';
  flags: string[];
  aiNote: string;
} {
  const cleaned = stripCodeFences(raw).trim();
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return fallbackSummary(messages);
  }

  const firstUser = messages.find((m) => m.role === 'user')?.content ?? '';

  return {
    chiefComplaint:
      typeof parsed?.chiefComplaint === 'string' && parsed.chiefComplaint.trim()
        ? parsed.chiefComplaint.trim().slice(0, 500)
        : firstUser.slice(0, 120) || 'Unspecified complaint',
    duration:
      typeof parsed?.duration === 'string' && parsed.duration.trim()
        ? parsed.duration.trim().slice(0, 80)
        : 'recent',
    department:
      typeof parsed?.department === 'string' && parsed.department.trim()
        ? parsed.department.trim().slice(0, 80)
        : 'General Medicine',
    urgency: parsed?.urgency === 'urgent' ? 'urgent' : 'routine',
    flags: Array.isArray(parsed?.flags)
      ? parsed.flags
          .filter((x: any) => typeof x === 'string')
          .map((x: string) => x.slice(0, 60))
          .slice(0, 20)
      : [],
    aiNote:
      typeof parsed?.aiNote === 'string' && parsed.aiNote.trim()
        ? parsed.aiNote.trim().slice(0, 500)
        : 'summary unavailable',
  };
}

function stripCodeFences(s: string): string {
  let out = s.trim();
  if (out.startsWith('```')) {
    out = out.replace(/^```[a-zA-Z]*\n?/, '');
    out = out.replace(/```$/, '');
  }
  const firstBrace = out.indexOf('{');
  const lastBrace = out.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    out = out.slice(firstBrace, lastBrace + 1);
  }
  return out;
}

function fallbackSummary(messages: ChatMessage[]): {
  chiefComplaint: string;
  duration: string;
  department: string;
  urgency: 'routine' | 'urgent';
  flags: string[];
  aiNote: string;
} {
  const firstUser = messages.find((m) => m.role === 'user')?.content ?? '';
  return {
    chiefComplaint: firstUser.slice(0, 120) || 'Unspecified complaint',
    duration: 'recent',
    department: 'General Medicine',
    urgency: 'routine',
    flags: [],
    aiNote: 'summary unavailable',
  };
}

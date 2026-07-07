import { NextRequest, NextResponse } from 'next/server';
import { llm } from '@/lib/ai';
import { CLINIC_KNOWLEDGE } from '@/lib/prompts';
import type { ChatMessage } from '@/lib/types';

// POST /api/chat
// Body: { messages: ChatMessage[] }
// Returns: { reply: string, emergency: { reason: string } | null }
//
// Uses LLM with CLINIC_KNOWLEDGE system prompt. Parses `EMERGENCY_FLAG: <reason>`
// from the first line of the AI reply → returns `emergency` + strips it from the reply.
// On any AI error, returns a graceful fallback so the UI can keep working.
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const rawMessages = Array.isArray(body?.messages) ? body.messages : [];
  const messages: ChatMessage[] = rawMessages
    .filter((m: any) => m && typeof m.content === 'string')
    .map((m: any) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content),
    }));

  if (messages.length === 0) {
    return NextResponse.json(
      { error: 'No messages provided.' },
      { status: 400 },
    );
  }

  let rawReply = '';
  try {
    rawReply = await llm(
      messages.map((m) => ({ role: m.role, content: m.content })),
      CLINIC_KNOWLEDGE,
    );
  } catch (err) {
    console.error('[/api/chat] LLM error:', err);
    return NextResponse.json({
      reply: 'Connection issue — please try again.',
      emergency: null,
    });
  }

  if (!rawReply) {
    return NextResponse.json({
      reply: 'Connection issue — please try again.',
      emergency: null,
    });
  }

  // Parse emergency flag from first non-empty line.
  let emergency: { reason: string } | null = null;
  let reply = rawReply;

  const lines = rawReply.split(/\r?\n/);
  let firstIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().length > 0) {
      firstIdx = i;
      break;
    }
  }

  if (firstIdx !== -1) {
    const match = lines[firstIdx].match(/^\s*EMERGENCY_FLAG:\s*(.+?)\s*$/i);
    if (match) {
      emergency = { reason: match[1].trim() };
      lines.splice(firstIdx, 1);
      if (firstIdx < lines.length && lines[firstIdx].trim() === '') {
        lines.splice(firstIdx, 1);
      }
      reply = lines.join('\n').trim();
    }
  }

  return NextResponse.json({ reply, emergency });
}

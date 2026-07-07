import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { llm } from '@/lib/ai';
import { REMINDER_PROMPT, REMINDER_SYSTEM } from '@/lib/prompts';
import { mapReminder } from '@/lib/mappers';

// POST /api/reminder/draft
// Body: { caseId: string }
// Returns: { reminder: Reminder }
//
// Fetches the case, asks the LLM for a short warm SMS reminder (<300 chars)
// for that case's department/complaint, persists it, and returns it.
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const caseId = typeof body?.caseId === 'string' ? body.caseId.trim() : '';
  if (!caseId) {
    return NextResponse.json({ error: 'caseId is required.' }, { status: 400 });
  }

  const caseRow = await db.case.findUnique({ where: { id: caseId } });
  if (!caseRow) {
    return NextResponse.json({ error: 'Case not found.' }, { status: 404 });
  }

  let content = '';
  try {
    content = await llm(
      [
        {
          role: 'user',
          content: REMINDER_PROMPT(caseRow.department, caseRow.chiefComplaint),
        },
      ],
      REMINDER_SYSTEM,
    );
  } catch (err) {
    console.error('[/api/reminder/draft] LLM error:', err);
    content = `Hi! A friendly reminder to visit ${caseRow.department} at Riverside Community Clinic (Mon-Sat, 8am-8pm) regarding "${caseRow.chiefComplaint}". Please confirm with a doctor before making changes.`;
  }

  content = (content || '').trim().slice(0, 320);
  if (!content) {
    content = `Reminder: please visit ${caseRow.department} at Riverside Community Clinic for "${caseRow.chiefComplaint}".`;
  }

  const reminderRow = await db.reminder.create({
    data: { caseId, content },
  });

  return NextResponse.json({ reminder: mapReminder(reminderRow) });
}

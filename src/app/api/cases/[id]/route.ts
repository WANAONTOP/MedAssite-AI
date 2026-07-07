import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mapCase } from '@/lib/mappers';
import { emitCaseEvent } from '@/lib/realtime-client';
import type { CaseItem, CaseStatus } from '@/lib/types';

// PATCH /api/cases/[id]
// Body: { status?: CaseStatus, doctorNotes?: string }
// Returns: { case: CaseItem }
//
// Updates only the provided fields. Emits `case:updated` over the realtime
// mini-service.
export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'Case id is required.' }, { status: 400 });
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const VALID: CaseStatus[] = ['pending', 'emergency', 'solved', 'unsolved'];
  const data: any = {};
  if (
    typeof body?.status === 'string' &&
    (VALID as string[]).includes(body.status)
  ) {
    data.status = body.status;
  }
  if (typeof body?.doctorNotes === 'string') {
    data.doctorNotes = body.doctorNotes;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: 'No updatable fields provided.' },
      { status: 400 },
    );
  }

  try {
    const existing = await db.case.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Case not found.' }, { status: 404 });
    }

    const updated = await db.case.update({ where: { id }, data });
    const caseItem: CaseItem = mapCase(updated);
    emitCaseEvent('case:updated', caseItem);
    return NextResponse.json({ case: caseItem });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to update case: ${msg}` },
      { status: 500 },
    );
  }
}

// GET single case (handy for detail panel refetch).
export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json({ error: 'Case id is required.' }, { status: 400 });
  }
  const row = await db.case.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: 'Case not found.' }, { status: 404 });
  }
  return NextResponse.json({ case: mapCase(row) });
}

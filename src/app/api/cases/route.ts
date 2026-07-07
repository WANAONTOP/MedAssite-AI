import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mapCase } from '@/lib/mappers';
import type { CaseStatus } from '@/lib/types';

// GET /api/cases
// Query params (all optional):
//   ?status=pending|emergency|solved|unsolved   Filter by a single status.
//   ?active=true                                Filter status in [pending, emergency].
// When neither is provided, returns all cases.
// Returns: { cases: CaseItem[] }
//
// Always ordered by createdAt desc.
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const statusParam = url.searchParams.get('status');
  const activeParam = url.searchParams.get('active');

  const VALID: CaseStatus[] = ['pending', 'emergency', 'solved', 'unsolved'];
  const isValid = (s: string | null): s is CaseStatus =>
    !!s && (VALID as string[]).includes(s);

  let where: any = {};
  if (activeParam === 'true') {
    where = { status: { in: ['pending', 'emergency'] } };
  } else if (isValid(statusParam)) {
    where = { status: statusParam };
  }

  try {
    const rows = await db.case.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ cases: rows.map(mapCase) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Failed to fetch cases: ${msg}` },
      { status: 500 },
    );
  }
}

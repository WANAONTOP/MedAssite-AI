import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mapUser } from '@/lib/mappers';

// POST /api/auth/login
// Body: { email: string, name?: string }
// Upserts a user by email (default name from email local part, role 'PATIENT').
// Returns: { user: User }
export async function POST(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || !email.includes('@')) {
    return NextResponse.json(
      { error: 'A valid email is required.' },
      { status: 400 },
    );
  }

  const hasName =
    typeof body?.name === 'string' && body.name.trim().length > 0;
  const providedName = hasName ? (body.name as string).trim() : email.split('@')[0];

  try {
    // Only overwrite the stored name when the caller explicitly passes one;
    // otherwise preserve any existing name (e.g. seeded display names).
    const user = await db.user.upsert({
      where: { email },
      create: { email, name: providedName, role: 'PATIENT' },
      update: hasName ? { name: providedName } : {},
    });

    return NextResponse.json({ user: mapUser(user) });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Login failed: ${msg}` },
      { status: 500 },
    );
  }
}

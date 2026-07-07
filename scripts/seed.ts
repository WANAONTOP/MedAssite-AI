// MedAssist AI — Seed script.
// Inserts (idempotently) a demo patient + 2 sample cases (one 'pending', one
// 'solved') so the Doctor / Staff / History tabs aren't empty on first load.
//
// Run: `bun run scripts/seed.ts`
// Demo login email: demo@clinic.com

import { db } from '../src/lib/db';

async function main() {
  const email = 'demo@clinic.com';

  const user = await db.user.upsert({
    where: { email },
    create: { email, name: 'Demo Patient', role: 'PATIENT' },
    update: { name: 'Demo Patient' },
  });

  console.log(`[seed] ensured user: ${user.email} (${user.id})`);

  // Find existing cases for this user to keep things idempotent-ish.
  const existing = await db.case.findMany({
    where: { userId: user.id },
    select: { chiefComplaint: true },
  });
  const existingComplaints = new Set(existing.map((c) => c.chiefComplaint));

  const samples: Array<{
    chiefComplaint: string;
    duration: string;
    department: string;
    urgency: 'routine' | 'urgent';
    flags: string[];
    aiNote: string;
    status: 'pending' | 'emergency' | 'solved' | 'unsolved';
    doctorNotes: string;
    createdAtOffsetMs: number;
  }> = [
    {
      chiefComplaint: 'Persistent dry cough for 5 days, mild fever at night',
      duration: '5 days',
      department: 'General Medicine',
      urgency: 'routine',
      flags: ['night fever', 'cough'],
      aiNote: 'Adult patient, stable vitals presumed — recommend in-person exam.',
      status: 'pending',
      doctorNotes: '',
      createdAtOffsetMs: -1000 * 60 * 30, // 30 min ago
    },
    {
      chiefComplaint: 'Mild knee pain after jogging, no swelling',
      duration: '2 days',
      department: 'Orthopedics',
      urgency: 'routine',
      flags: ['post-exercise', 'no swelling'],
      aiNote: 'Likely mild overuse strain; rest and observation advised.',
      status: 'solved',
      doctorNotes:
        'Reviewed case. Recommended R.I.C.E. and follow-up if no improvement in 1 week.',
      createdAtOffsetMs: -1000 * 60 * 60 * 26, // ~26h ago
    },
  ];

  let inserted = 0;
  for (const s of samples) {
    if (existingComplaints.has(s.chiefComplaint)) {
      console.log(`[seed] skipping existing sample: "${s.chiefComplaint}"`);
      continue;
    }
    const created = await db.case.create({
      data: {
        userId: user.id,
        chiefComplaint: s.chiefComplaint,
        duration: s.duration,
        department: s.department,
        urgency: s.urgency,
        flags: JSON.stringify(s.flags),
        aiNote: s.aiNote,
        status: s.status,
        doctorNotes: s.doctorNotes,
        createdAt: new Date(Date.now() + s.createdAtOffsetMs),
        updatedAt: new Date(),
      },
    });
    inserted++;
    console.log(
      `[seed] inserted case (${s.status}): ${created.id} — "${s.chiefComplaint}"`,
    );
  }

  console.log(`[seed] done. inserted ${inserted} new case(s).`);
}

main()
  .catch((err) => {
    console.error('[seed] failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

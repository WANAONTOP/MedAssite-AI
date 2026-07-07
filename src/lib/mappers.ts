// Helpers for mapping Prisma rows to the typed shapes defined in src/lib/types.ts.
// Server-only (used by route handlers).

import type {
  CaseItem,
  CaseStatus,
  CaseUrgency,
  Reminder,
  Role,
  User,
} from '@/lib/types';

type CaseRow = {
  id: string;
  userId: string;
  chiefComplaint: string;
  duration: string;
  department: string;
  urgency: string;
  flags: string;
  aiNote: string;
  status: string;
  doctorNotes: string;
  createdAt: Date;
  updatedAt: Date;
};

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: Date;
  updatedAt: Date;
};

type ReminderRow = {
  id: string;
  caseId: string;
  content: string;
  createdAt: Date;
};

function parseFlags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === 'string');
    return [];
  } catch {
    return [];
  }
}

export function mapCase(row: CaseRow): CaseItem {
  return {
    id: row.id,
    userId: row.userId,
    chiefComplaint: row.chiefComplaint,
    duration: row.duration,
    department: row.department,
    urgency: (row.urgency === 'urgent' ? 'urgent' : 'routine') as CaseUrgency,
    flags: parseFlags(row.flags),
    aiNote: row.aiNote,
    status: row.status as CaseStatus,
    doctorNotes: row.doctorNotes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function mapUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: (row.role === 'DOCTOR' || row.role === 'STAFF' ? row.role : 'PATIENT') as Role,
    createdAt: row.createdAt.toISOString(),
  };
}

export function mapReminder(row: ReminderRow): Reminder {
  return {
    id: row.id,
    caseId: row.caseId,
    content: row.content,
    createdAt: row.createdAt.toISOString(),
  };
}

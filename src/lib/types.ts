// Shared types — CONTRACT for both backend & frontend agents.
// Do NOT change field names without coordinating across the whole app.

export type Role = 'PATIENT' | 'DOCTOR' | 'STAFF';
export type CaseStatus = 'pending' | 'emergency' | 'solved' | 'unsolved';
export type CaseUrgency = 'routine' | 'urgent';
export type ChatRole = 'user' | 'assistant';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface CaseItem {
  id: string;
  userId: string;
  chiefComplaint: string;
  duration: string;
  department: string;
  urgency: CaseUrgency;
  flags: string[];
  aiNote: string;
  status: CaseStatus;
  doctorNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id?: string;
  role: ChatRole;
  content: string;
  createdAt?: string;
}

export interface Reminder {
  id: string;
  caseId: string;
  content: string;
  createdAt: string;
}

// Socket event payloads
export interface SocketEvents {
  'case:created': (c: CaseItem) => void;
  'case:updated': (c: CaseItem) => void;
}

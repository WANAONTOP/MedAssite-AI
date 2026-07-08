// Auto-syncs the Prisma datasource provider based on DATABASE_URL.
// Runs as a postinstall hook so it works both locally (SQLite) and on
// Vercel (Postgres) without manual schema edits.
//
//   DATABASE_URL=file:./db/custom.db   → provider = "sqlite"
//   DATABASE_URL=postgres://...        → provider = "postgresql"
//
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const SCHEMA_PATH = new URL('../prisma/schema.prisma', import.meta.url).pathname
  .replace(/^\/(?=[A-Za-z]:\/)/, ''); // strip leading slash on Windows

const url = process.env.DATABASE_URL || '';
const provider = url.startsWith('postgres') ? 'postgresql' : 'sqlite';

if (!existsSync(SCHEMA_PATH)) {
  console.warn('[sync-schema] schema.prisma not found, skipping.');
  process.exit(0);
}

let schema = readFileSync(SCHEMA_PATH, 'utf-8');
const before = schema.match(/provider\s*=\s*"(sqlite|postgresql)"/)?.[1];

if (before === provider) {
  console.log(`[sync-schema] provider already "${provider}", no change.`);
  process.exit(0);
}

schema = schema.replace(
  /provider\s*=\s*"(sqlite|postgresql)"/,
  `provider = "${provider}"`,
);
writeFileSync(SCHEMA_PATH, schema);
console.log(`[sync-schema] provider: ${before} → ${provider}`);

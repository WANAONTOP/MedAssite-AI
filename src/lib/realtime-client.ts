// Server-only realtime emitter.
// Next.js API routes run in a separate process from the socket.io mini-service
// (port 3003), so they emit by POSTing to the mini-service's internal
// /broadcast endpoint, which then does io.emit().
//
// Realtime is best-effort: any failure is swallowed silently so the API route
// still returns its normal response.
//
// IMPORTANT: This module is intended only for server code (route handlers).
// Do NOT import from client components.

import type { CaseItem } from '@/lib/types';

const BROADCAST_URL = 'http://localhost:3003/broadcast';

export type CaseEvent = 'case:created' | 'case:updated';

/**
 * Fire-and-forget: notify the realtime mini-service to broadcast a case event
 * to all connected socket.io clients. Swallows all errors silently.
 */
export function emitCaseEvent(event: CaseEvent, payload: CaseItem): void {
  // Fire-and-forget; do not block the API response.
  void (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    try {
      await fetch(BROADCAST_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, payload }),
        signal: controller.signal,
      });
    } catch {
      // Swallow — realtime is best-effort.
    } finally {
      clearTimeout(timeout);
    }
  })();
}

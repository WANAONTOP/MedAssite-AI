'use client';

import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { CaseItem } from '@/lib/types';

/**
 * Connects to the MedAssist realtime mini-service (port 3003 via Caddy gateway).
 * Emits nothing; listens for `case:created` and `case:updated` and invokes callbacks.
 *
 * Connection rule (per gateway): use `io('/?XTransformPort=3003')`, path is `/`.
 */
export function useRealtimeCases(opts: {
  onCreated?: (c: CaseItem) => void;
  onUpdated?: (c: CaseItem) => void;
}) {
  const { onCreated, onUpdated } = opts;
  const cbRef = useRef({ onCreated, onUpdated });

  // Keep latest callbacks in a ref (in an effect, not during render).
  useEffect(() => {
    cbRef.current = { onCreated, onUpdated };
  }, [onCreated, onUpdated]);

  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 8,
      reconnectionDelay: 1200,
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on('case:created', (c: CaseItem) => cbRef.current.onCreated?.(c));
    socket.on('case:updated', (c: CaseItem) => cbRef.current.onUpdated?.(c));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  return { connected, socket: socketRef };
}

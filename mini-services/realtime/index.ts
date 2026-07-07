// MedAssist AI — Realtime mini-service.
// HTTP server + socket.io on port 3003, path '/'.
//
// - Frontend connects via Caddy gateway: io('/?XTransformPort=3003', ...)
//   and listens for `case:created` / `case:updated` events.
// - Next.js API routes (separate process) emit by POSTing to
//   http://localhost:3003/broadcast with { event, payload } — this server
//   then does io.emit(event, payload) to fan out to all connected clients.
//
// Run: `bun --hot index.ts` (auto-restart on file change).

import { createServer, type IncomingMessage, type ServerResponse } from 'http';
import { Server } from 'socket.io';

const PORT = 3003;

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // Internal broadcast endpoint used by Next.js API routes.
  if (req.method === 'POST' && req.url === '/broadcast') {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
    }
    let body: any = null;
    try {
      body = JSON.parse(raw || '{}');
    } catch {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'invalid json' }));
      return;
    }

    const event = body?.event;
    const payload = body?.payload;
    if (
      (event === 'case:created' || event === 'case:updated') &&
      payload !== undefined
    ) {
      io.emit(event, payload);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, event }));
      return;
    }

    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'invalid event or payload' }));
    return;
  }

  // Tiny health-check / info route.
  if (req.method === 'GET' && (req.url === '/' || req.url === '/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        service: 'medassist-realtime',
        port: PORT,
        connectedClients: io.engine.clientsCount,
      }),
    );
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: false, error: 'not found' }));
});

// NOTE on path:
// The frontend hook (`src/hooks/use-realtime-cases.ts`) connects with
// `io('/?XTransformPort=3003', {...})` and no explicit `path` option, so the
// socket.io client defaults to `/socket.io`. We use the same default here so
// client and server agree.
//
// We deliberately do NOT set `path: '/'` (as the demo example does): with
// path '/', socket.io's matcher (`path === req.url.slice(0, path.length)`)
// would intercept EVERY URL (since every URL starts with '/'), which would
// swallow our internal `/broadcast` and `/health` HTTP endpoints on this same
// port. The default `/socket.io` path leaves `/broadcast` and `/health`
// untouched.
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  pingTimeout: 60000,
  pingInterval: 25000,
});

io.on('connection', (socket) => {
  console.log(`[realtime] client connected: ${socket.id}`);

  socket.on('disconnect', (reason) => {
    console.log(`[realtime] client disconnected: ${socket.id} (${reason})`);
  });

  socket.on('error', (err) => {
    console.error(`[realtime] socket error (${socket.id}):`, err);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[realtime] running on port ${PORT}`);
});

// Graceful shutdown.
function shutdown(signal: string) {
  console.log(`[realtime] received ${signal}, shutting down...`);
  io.close(() => {
    httpServer.close(() => {
      console.log('[realtime] closed');
      process.exit(0);
    });
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

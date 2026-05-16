import { WebSocketServer, WebSocket } from 'ws';
import type { EventLog } from './types.js';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function startWebSocket(port = 3001): void {
  wss = new WebSocketServer({ port });

  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: 'connected', message: 'BTK Event Stream' }));

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', (err) => {
      console.error('[WS] Client error:', err.message);
      clients.delete(ws);
    });
  });

  console.log(`[WS] Server listening on ws://localhost:${port}`);
}

export function broadcastEvent(event: EventLog): void {
  const payload = JSON.stringify({ type: 'event', data: event });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

export function stopWebSocket(): void {
  if (wss) {
    wss.close();
    wss = null;
  }
  clients.clear();
}

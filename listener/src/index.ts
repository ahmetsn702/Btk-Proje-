import express from 'express';
import { startScanner, stopScanner } from './scanner.js';
import { startWebSocket, stopWebSocket, broadcastEvent } from './ws.js';
import { relay } from './relayer.js';
import type { RelayerRequest } from './types.js';
import { redis } from './redis.js';

const app = express();
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'listener', ts: Date.now() });
});

// Relayer endpoint
app.post('/relay', async (req, res) => {
  const body = req.body as RelayerRequest;
  const result = await relay(body);
  res.status(result.status === 'submitted' ? 200 : 400).json(result);
});

// Get last processed block
app.get('/scanner/block', async (_req, res) => {
  const raw = await redis.get('last_processed_block');
  res.json({ lastProcessedBlock: raw ? parseInt(raw, 10) : 0 });
});

const HTTP_PORT = process.env.HTTP_PORT ? parseInt(process.env.HTTP_PORT, 10) : 3000;
const WS_PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT, 10) : 3001;

async function main() {
  startWebSocket(WS_PORT);

  app.listen(HTTP_PORT, () => {
    console.log(`[HTTP] Server listening on http://localhost:${HTTP_PORT}`);
  });

  // Broadcast confirmed events over WebSocket
  await startScanner((event) => {
    if (event.status === 'confirmed') {
      broadcastEvent(event);
    }
  });
}

main().catch((err) => {
  console.error('[Fatal]', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  stopScanner();
  stopWebSocket();
  await redis.quit();
  process.exit(0);
});

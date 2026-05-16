import Redis from 'ioredis';
import { REDIS_URL } from './config.js';
import type { EventLog } from './types.js';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

export async function getLastProcessedBlock(): Promise<number> {
  const v = await redis.get('last_processed_block');
  return v ? parseInt(v, 10) : 0;
}

export async function setLastProcessedBlock(block: number): Promise<void> {
  await redis.set('last_processed_block', block.toString());
}

export async function storeEvent(event: EventLog): Promise<void> {
  const key = `event:${event.txHash}:${event.logIndex}`;
  await redis.setex(key, 86400 * 7, JSON.stringify(event)); // TTL 7 days

  // Index by block for pending confirmation tracking
  if (event.status === 'pending') {
    await redis.zadd('events:pending', event.blockNumber, key);
  }
}

export async function confirmEvent(
  txHash: string,
  logIndex: number,
  confirmations: number,
): Promise<void> {
  const key = `event:${txHash}:${logIndex}`;
  const raw = await redis.get(key);
  if (!raw) return;
  const event: EventLog = JSON.parse(raw);
  event.status = 'confirmed';
  event.confirmations = confirmations;
  await redis.setex(key, 86400 * 7, JSON.stringify(event));
  await redis.zrem('events:pending', key);
}

export async function getPendingEventsUpToBlock(block: number): Promise<string[]> {
  return redis.zrangebyscore('events:pending', '-inf', block);
}

export async function storeFailedEvent(event: EventLog, retryCount: number): Promise<void> {
  const key = `events:failed`;
  await redis.lpush(key, JSON.stringify({ event, retryCount, failedAt: Date.now() }));
}

export async function getRelayerNonce(signer: string): Promise<number> {
  const key = `relayer:nonce:${signer.toLowerCase()}`;
  const v = await redis.get(key);
  return v ? parseInt(v, 10) : 0;
}

export async function setRelayerNonce(signer: string, nonce: number): Promise<void> {
  await redis.set(`relayer:nonce:${signer.toLowerCase()}`, nonce.toString());
}

export async function checkRateLimit(signer: string, rpm: number): Promise<boolean> {
  const key = `rate:${signer.toLowerCase()}`;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, 60);
  }
  return current <= rpm;
}

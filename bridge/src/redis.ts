import Redis from 'ioredis';
import { REDIS_URL } from './config.js';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redis.on('error', (err) => {
  console.error('Redis error:', err.message);
});

export async function getEventsByUser(userAddress: string): Promise<unknown[]> {
  const keys = await redis.keys('event:*');
  const events = [];
  for (const key of keys) {
    const raw = await redis.get(key);
    if (!raw) continue;
    const ev = JSON.parse(raw);
    if (ev.args?.user?.toLowerCase() === userAddress.toLowerCase()) {
      events.push(ev);
    }
  }
  return events;
}

export async function getTransactionsByUser(userAddress: string): Promise<unknown[]> {
  const keys = await redis.keys('event:*');
  const txs = [];
  for (const key of keys) {
    const raw = await redis.get(key);
    if (!raw) continue;
    const ev = JSON.parse(raw);
    const from = ev.args?.from?.toLowerCase();
    const to = ev.args?.to?.toLowerCase();
    const user = userAddress.toLowerCase();
    if (from === user || to === user || ev.args?.user?.toLowerCase() === user) {
      txs.push(ev);
    }
  }
  return txs;
}

export async function getPrices(): Promise<Record<string, number>> {
  const keys = await redis.keys('price:*');
  const prices: Record<string, number> = {};
  for (const key of keys) {
    const raw = await redis.get(key);
    if (!raw) continue;
    const categoryId = key.replace('price:', '');
    prices[categoryId] = parseFloat(raw);
  }
  return prices;
}

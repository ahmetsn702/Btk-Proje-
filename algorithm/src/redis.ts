import Redis from 'ioredis';
import { REDIS_URL } from './config.js';

export interface PriceData {
  categoryId: string;
  rate: number;
  change24h: number;
  surgeActive: boolean;
  surgeMultiplier: number;
  surgeEndsAt: string | null;
}

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redis.on('error', (err) => {
  console.error('Algorithm Redis error:', err.message);
});

export async function setPrice(categoryId: string, priceData: PriceData): Promise<void> {
  await redis.set(`price:${categoryId}`, JSON.stringify(priceData));
}

export async function getPrice(categoryId: string): Promise<PriceData | null> {
  const raw = await redis.get(`price:${categoryId}`);
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function getAllPrices(): Promise<Record<string, PriceData>> {
  const keys = await redis.keys('price:*');
  const prices: Record<string, PriceData> = {};
  for (const key of keys) {
    const raw = await redis.get(key);
    if (!raw) continue;
    const categoryId = key.replace('price:', '');
    prices[categoryId] = JSON.parse(raw);
  }
  return prices;
}

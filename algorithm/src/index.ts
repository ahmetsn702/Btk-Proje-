import dotenv from 'dotenv';
import { fetchMarketData } from './mock-data.js';
import { computeAllPrices } from './price-engine.js';
import { startApiServer, updatePrices } from './api.js';

dotenv.config({ path: '../.env' });

const UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 dakika

async function tick() {
  try {
    console.log('[ALGO] Fetching market data...');
    const marketData = await fetchMarketData();

    console.log('[ALGO] Computing prices...');
    const prices = computeAllPrices(marketData);

    updatePrices(prices);

    console.log(
      '[ALGO] Prices updated:',
      prices.map((p) => `${p.categoryId}=${p.rate}`).join(', '),
    );
  } catch (err) {
    console.error('[ALGO] Error in tick:', err);
  }
}

async function main() {
  console.log('[ALGO] Starting algorithm service...');

  // İlk çalıştırma
  await tick();

  // API server başlat
  const port = Number(process.env.ALGO_PORT) || 4000;
  startApiServer(port);

  // Periyodik güncelleme
  setInterval(tick, UPDATE_INTERVAL_MS);

  console.log(`[ALGO] Update interval: ${UPDATE_INTERVAL_MS / 1000}s`);
}

main();

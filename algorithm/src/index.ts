import dotenv from 'dotenv';
import { backendClient } from './backend-client.js';
import { computeAllPrices } from './price-engine.js';
import { startApiServer, updatePrices } from './api.js';
import { CATEGORY_MAPPINGS, getContractIdByUuid } from './category-mapping.js';
import { MarketData } from './types.js';

dotenv.config({ path: '../.env' });

const UPDATE_INTERVAL_MS = 5 * 60 * 1000; // 5 dakika

async function initializeCategoryMappings() {
  try {
    console.log('[ALGO] Fetching categories from backend...');
    const categories = await backendClient.fetchCategories();

    // Update UUIDs in mapping
    for (const category of categories) {
      const mapping = CATEGORY_MAPPINGS.find((m) => m.slug === category.slug);
      if (mapping) {
        mapping.uuid = category.id;
        console.log(
          `[ALGO] Mapped ${category.slug} (${category.id}) -> contract ID ${mapping.contractId}`,
        );
      }
    }

    console.log('[ALGO] Category mappings initialized');
  } catch (err) {
    console.error('[ALGO] Failed to initialize category mappings:', err);
    // Continue with default mappings without UUIDs
  }
}

async function tick() {
  try {
    console.log('[ALGO] Fetching market data from backend...');
    const { categories, stocks, volumes } = await backendClient.fetchAllMarketData();

    // Convert backend data to MarketData format for price engine
    const marketData: MarketData[] = categories
      .map((category) => {
        const stock = stocks.get(category.id);
        const volume = volumes.get(category.id);
        const contractId = getContractIdByUuid(category.id);

        if (!contractId) {
          console.warn(
            `[ALGO] No contract ID mapping for category ${category.slug} (${category.id})`,
          );
        }

        // Calculate stock level (0-1 range)
        const stockLevel = stock ? Math.min(stock.totalStock / 1000, 1) : 0.5; // Normalize to 0-1

        // Calculate demand factor from volume (0-1 range)
        const demandFactor = volume ? Math.min(volume.totalQuantity / 10000, 1) : 0.5;

        // Calculate market volume (24h)
        const marketVolume = volume ? volume.totalQuantity : 0;

        return {
          categoryId: contractId || 0,
          stockLevel,
          demandFactor,
          marketVolume,
          xpPool: 1_000_000n * 10n ** 18n, // TODO: Fetch from Exchange contract
          cpSupply: 100_000n * 10n ** 18n, // TODO: Fetch from CategoryPoints1155 contract
        };
      })
      .filter((d) => d.categoryId > 0); // Filter out unmapped categories

    console.log('[ALGO] Computing prices...');
    const prices = computeAllPrices(marketData);

    updatePrices(prices);

    console.log(
      '[ALGO] Prices updated:',
      prices.map((p) => `ID ${p.categoryId}=${p.rate}`).join(', '),
    );
  } catch (err) {
    console.error('[ALGO] Error in tick:', err);
  }
}

async function main() {
  console.log('[ALGO] Starting algorithm service...');

  // Initialize category mappings
  await initializeCategoryMappings();

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

import { MarketData } from './types.js';

// DEV2_API_READY: Bu dosya Geliştirici 1'in API'si hazır olana kadar mock data üretir.

const CATEGORIES = [1, 2, 3]; // Giyim, Elektronik, Kitap

let mockXpPool = 1_000_000;
const mockCpPools: Record<number, number> = {
  1: 500_000,
  2: 300_000,
  3: 200_000,
};

/**
 * Geliştirici 1'in API'si yerine geçici mock veri üretir.
 * TODO: DEV2_API_READY flag'i true olduğunda gerçek API'ye geç.
 */
export async function fetchMarketData(): Promise<MarketData[]> {
  // Rastgele dalga ekle (simülasyon)
  mockXpPool += (Math.random() - 0.5) * 10_000;
  for (const cat of CATEGORIES) {
    mockCpPools[cat] += (Math.random() - 0.5) * 5_000;
    if (mockCpPools[cat] < 1) mockCpPools[cat] = 1;
  }

  return CATEGORIES.map((id) => ({
    categoryId: id,
    cpSupply: mockCpPools[id],
    xpPool: mockXpPool,
    stockLevel: 0.3 + Math.random() * 0.7, // 0.3 - 1.0
    marketVolume: 1_000 + Math.random() * 50_000,
    demandFactor: 0.8 + Math.random() * 0.4, // 0.8 - 1.2
  }));
}

export function getMockXpPool(): number {
  return mockXpPool;
}

export function getMockCpPool(categoryId: number): number {
  return mockCpPools[categoryId] ?? 1;
}

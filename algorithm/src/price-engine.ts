import { MarketData, PriceResult, PriceFormulaInputs } from './types.js';

// Önceki fiyatları sakla (change24h hesaplaması için)
const priceHistory: Record<string, number[]> = {};

/**
 * Ana fiyat formülü:
 * price = (xpPool / cpPool) * marketDemandFactor * stockScarcityFactor * incentiveFactor
 */
export function calculatePrice(inputs: PriceFormulaInputs): number {
  const { xpPool, cpPool, marketDemandFactor, stockScarcityFactor, incentiveFactor } = inputs;
  if (cpPool <= 0) return 0;
  return (xpPool / cpPool) * marketDemandFactor * stockScarcityFactor * incentiveFactor;
}

/**
 * Tek bir kategori için fiyat hesapla.
 */
export function computeCategoryPrice(data: MarketData): PriceResult {
  const catId = String(data.categoryId);

  // Stok kıtlığı: stokLevel düşükse fiyat artar (1/stockLevel)
  const stockScarcityFactor = data.stockLevel > 0 ? 1 / data.stockLevel : 1;

  // Talep faktörü: doğrudan piyasadan gelen veri
  const marketDemandFactor = data.demandFactor;

  // Platform teşvik çarpanı: talep düşükse boost et
  const incentiveFactor = data.demandFactor < 0.9 ? 1.2 : 1.0;

  const inputs: PriceFormulaInputs = {
    xpPool: Number(data.xpPool),
    cpPool: Number(data.cpSupply),
    marketDemandFactor,
    stockScarcityFactor,
    incentiveFactor,
  };

  const rate = calculatePrice(inputs);

  // change24h hesapla
  if (!priceHistory[catId]) priceHistory[catId] = [];
  priceHistory[catId].push(rate);
  if (priceHistory[catId].length > 288) {
    // 5dk * 288 = 24 saat
    priceHistory[catId].shift();
  }

  let change24h = 0;
  if (priceHistory[catId].length >= 2) {
    const oldPrice = priceHistory[catId][0];
    change24h = oldPrice > 0 ? (rate - oldPrice) / oldPrice : 0;
  }

  // Surge (teşvik) aktif mi?
  const surgeActive = incentiveFactor > 1.0;
  const surgeMultiplier = incentiveFactor;
  const surgeEndsAt = surgeActive
    ? new Date(Date.now() + 3600_000).toISOString() // 1 saat sonra
    : null;

  return {
    categoryId: catId,
    rate: Math.round(rate * 1_000_000) / 1_000_000, // 6 basamak hassasiyet
    change24h: Math.round(change24h * 10_000) / 10_000, // 4 basamak
    surgeActive,
    surgeMultiplier: Math.round(surgeMultiplier * 100) / 100,
    surgeEndsAt,
  };
}

/**
 * Tüm kategorileri hesapla.
 */
export function computeAllPrices(marketData: MarketData[]): PriceResult[] {
  return marketData.map((d) => computeCategoryPrice(d));
}

/**
 * İki kategori arası swap oranı.
 * rateOut / rateIn = categoryOut başına categoryIn miktarı
 */
export function getSwapRate(
  inCategory: string,
  outCategory: string,
  allPrices: PriceResult[],
): number {
  const inPrice = allPrices.find((p) => p.categoryId === inCategory);
  const outPrice = allPrices.find((p) => p.categoryId === outCategory);
  if (!inPrice || !outPrice || inPrice.rate === 0) return 0;
  return outPrice.rate / inPrice.rate;
}

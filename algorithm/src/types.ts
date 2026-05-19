export interface MarketData {
  categoryId: number;
  cpSupply: bigint; // CP arzı (havuzda kalan)
  xpPool: bigint; // XP rezervi
  stockLevel: number; // stok durumu (0-1 arası normalize)
  marketVolume: number; // 24h hacim
  demandFactor: number; // talep çarpanı
}

export interface PriceResult {
  categoryId: string;
  rate: number; // CP başına XP oranı (veya tersi)
  change24h: number; // 24 saatlik değişim
  surgeActive: boolean; // teşvik aktif mi
  surgeMultiplier: number; // teşvik çarpanı
  surgeEndsAt: string | null; // ISO timestamp
}

export interface PriceFormulaInputs {
  xpPool: number;
  cpPool: number;
  marketDemandFactor: number;
  stockScarcityFactor: number;
  incentiveFactor: number;
}

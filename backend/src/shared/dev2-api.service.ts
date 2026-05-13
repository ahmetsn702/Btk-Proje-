import { Injectable } from '@nestjs/common';

const DEV2_API_URL = process.env.DEV2_API_URL || 'http://localhost:3002';
// DEV2_API_READY: false — mock kullanılıyor
const DEV2_API_READY = process.env.DEV2_API_READY === 'true';

export interface UserBalances {
  xp: number;
  cp: { categoryId: string; categoryName: string; amount: number }[];
}

@Injectable()
export class Dev2ApiService {
  /** Kullanıcının XP bakiyesini Geliştirici 2'den çeker */
  async getUserBalances(userId: string): Promise<UserBalances> {
    if (!DEV2_API_READY) {
      // DEV2_API_READY: false — mock
      return { xp: 50, cp: [] };
    }
    const res = await fetch(`${DEV2_API_URL}/users/${userId}/balances`);
    if (!res.ok) throw new Error('Failed to fetch balances');
    return res.json();
  }

  /** Ödeme akışında XP indirimini sunucu tarafında doğrular */
  async applyDiscount(
    userId: string,
    xpAmount: number,
  ): Promise<{ valid: boolean; discountKurus: number }> {
    if (!DEV2_API_READY) {
      // DEV2_API_READY: false — mock: 1 XP = 100 kuruş
      return { valid: true, discountKurus: xpAmount * 100 };
    }
    const res = await fetch(`${DEV2_API_URL}/xp/apply-discount`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, xpAmount }),
    });
    if (!res.ok) return { valid: false, discountKurus: 0 };
    return res.json();
  }

  /** Anlık CP→XP oranını çeker */
  async getExchangeRate(categoryId: string): Promise<{ cpToXp: number; lastUpdated: string }> {
    if (!DEV2_API_READY) {
      return { cpToXp: 10, lastUpdated: new Date().toISOString() };
    }
    const res = await fetch(`${DEV2_API_URL}/exchange/rate/${categoryId}`);
    if (!res.ok) throw new Error('Failed to fetch rate');
    return res.json();
  }
}

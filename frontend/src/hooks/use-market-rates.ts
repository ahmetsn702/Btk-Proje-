'use client';

import { useEffect, useState, useCallback, useRef } from 'react';

// DEV2_API_READY: false — mock kullanılıyor
const DEV2_API_READY = false;
const DEV2_API_URL = process.env.NEXT_PUBLIC_DEV2_API_URL || 'http://localhost:3002';
const POLL_INTERVAL = 30_000;

export interface MarketRate {
  categoryId: string;
  categoryName: string;
  cpToXp: number;
  change24h: number; // yüzde değişim
  lastUpdated: string;
  surgeActive: boolean;
  surgeMultiplier: number;
  surgeEndsAt: string | null;
}

const MOCK_RATES: MarketRate[] = [
  {
    categoryId: '1',
    categoryName: 'Elektronik',
    cpToXp: 10.5,
    change24h: 2.3,
    lastUpdated: new Date().toISOString(),
    surgeActive: true,
    surgeMultiplier: 3,
    surgeEndsAt: new Date(Date.now() + 45 * 60_000).toISOString(),
  },
  {
    categoryId: '2',
    categoryName: 'Giyim',
    cpToXp: 8.2,
    change24h: -1.5,
    lastUpdated: new Date().toISOString(),
    surgeActive: false,
    surgeMultiplier: 1,
    surgeEndsAt: null,
  },
  {
    categoryId: '3',
    categoryName: 'Ev & Yaşam',
    cpToXp: 12.1,
    change24h: 0.8,
    lastUpdated: new Date().toISOString(),
    surgeActive: true,
    surgeMultiplier: 2,
    surgeEndsAt: new Date(Date.now() + 20 * 60_000).toISOString(),
  },
  {
    categoryId: '4',
    categoryName: 'Spor',
    cpToXp: 9.7,
    change24h: -3.2,
    lastUpdated: new Date().toISOString(),
    surgeActive: false,
    surgeMultiplier: 1,
    surgeEndsAt: null,
  },
  {
    categoryId: '5',
    categoryName: 'Kitap',
    cpToXp: 15.0,
    change24h: 5.1,
    lastUpdated: new Date().toISOString(),
    surgeActive: true,
    surgeMultiplier: 3,
    surgeEndsAt: new Date(Date.now() + 90 * 60_000).toISOString(),
  },
  {
    categoryId: '6',
    categoryName: 'Kozmetik',
    cpToXp: 7.4,
    change24h: 1.0,
    lastUpdated: new Date().toISOString(),
    surgeActive: false,
    surgeMultiplier: 1,
    surgeEndsAt: null,
  },
];

export function useMarketRates() {
  const [rates, setRates] = useState<MarketRate[]>([]);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRates = useCallback(async () => {
    try {
      if (DEV2_API_READY) {
        const res = await fetch(`${DEV2_API_URL}/exchange/rates`);
        if (res.ok) setRates(await res.json());
      } else {
        // DEV2_API_READY: false — mock with slight randomization
        setRates(
          MOCK_RATES.map((r) => ({
            ...r,
            cpToXp: r.cpToXp + (Math.random() - 0.5) * 0.4,
            change24h: r.change24h + (Math.random() - 0.5) * 0.2,
            lastUpdated: new Date().toISOString(),
            surgeEndsAt: r.surgeEndsAt,
          })),
        );
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRates();
    intervalRef.current = setInterval(fetchRates, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchRates]);

  return { rates, loading, refetch: fetchRates };
}

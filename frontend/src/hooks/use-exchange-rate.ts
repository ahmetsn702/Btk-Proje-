'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

// DEV2_API_READY: true — algorithm servisine bağlı
const DEV2_API_READY = true;
const ALGO_API_URL = 'http://localhost:4000';
const POLL_INTERVAL = 30_000;

const CATEGORY_CONTRACT_MAP: Record<string, string> = {
  cmp766p5l0003ugew5hp5w5uu: '1', // elektronik
  cmp766p5l0002ugewouioxcfp: '3', // ev-yasam
  cmp766p5m0004ugewldqnc7ke: '2', // giyim
  cmp766p5k0001ugewll2dm989: '5', // kitap
  cmp766p5j0000ugewelwnvd0d: '4', // spor
};

export interface ExchangeRate {
  cpToXp: number;
  lastUpdated: string;
  surgeActive: boolean;
  surgeMultiplier: number;
  change24h: number;
}

function getMockRate(categoryId: string): ExchangeRate {
  const base = (categoryId.charCodeAt(0) % 5) + 8;
  return {
    cpToXp: base + Math.random() * 2,
    lastUpdated: new Date().toISOString(),
    surgeActive: false,
    surgeMultiplier: 1,
    change24h: 0,
  };
}

export function useExchangeRate(categoryId: string | null) {
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchRate = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    try {
      if (DEV2_API_READY) {
        const contractId = CATEGORY_CONTRACT_MAP[categoryId];
        if (!contractId) {
          setRate(getMockRate(categoryId));
          setLoading(false);
          return;
        }
        const res = await fetch(`${ALGO_API_URL}/exchange/market-status`);
        if (res.ok) {
          const data = await res.json();
          const cat = data.categories?.find(
            (c: { categoryId: string }) => c.categoryId === contractId,
          );
          if (cat) {
            setRate({
              cpToXp: cat.rate,
              lastUpdated: data.timestamp,
              surgeActive: cat.surgeActive,
              surgeMultiplier: cat.surgeMultiplier,
              change24h: cat.change24h,
            });
          } else {
            setRate(getMockRate(categoryId));
          }
        } else {
          setRate(getMockRate(categoryId));
        }
      } else {
        setRate(getMockRate(categoryId));
      }
    } catch {
      setRate(getMockRate(categoryId));
    }
    setLoading(false);
  }, [categoryId]);

  useEffect(() => {
    fetchRate();
    intervalRef.current = setInterval(fetchRate, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchRate]);

  return { rate, loading, refetch: fetchRate };
}

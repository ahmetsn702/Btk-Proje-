'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

// DEV2_API_READY: false — mock kullanılıyor
const DEV2_API_READY = false;
const DEV2_API_URL = process.env.NEXT_PUBLIC_DEV2_API_URL || 'http://localhost:3002';
const POLL_INTERVAL = 30_000; // 30 saniye

export interface ExchangeRate {
  cpToXp: number;
  lastUpdated: string;
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
        const res = await fetch(`${DEV2_API_URL}/exchange/rate/${categoryId}`);
        if (res.ok) setRate(await res.json());
      } else {
        // DEV2_API_READY: false — mock
        const base = (categoryId.charCodeAt(0) % 5) + 8;
        setRate({ cpToXp: base + Math.random() * 2, lastUpdated: new Date().toISOString() });
      }
    } catch {
      /* ignore */
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

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth';

// DEV2_API_READY: false — mock kullanılıyor
const DEV2_API_READY = false;
const DEV2_API_URL = process.env.NEXT_PUBLIC_DEV2_API_URL || 'http://localhost:3002';

export interface CpBalance {
  categoryId: string;
  categoryName: string;
  amount: number;
}

export interface Balances {
  xp: number;
  cp: CpBalance[];
}

const MOCK_BALANCES: Balances = {
  xp: 50,
  cp: [
    { categoryId: '1', categoryName: 'Elektronik', amount: 120 },
    { categoryId: '2', categoryName: 'Giyim', amount: 85 },
    { categoryId: '3', categoryName: 'Ev & Yaşam', amount: 45 },
    { categoryId: '4', categoryName: 'Spor', amount: 30 },
  ],
};

export function useBalances() {
  const { user } = useAuthStore();
  const [balances, setBalances] = useState<Balances | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBalances = useCallback(async () => {
    if (!user) {
      setBalances(null);
      setLoading(false);
      return;
    }

    if (DEV2_API_READY) {
      try {
        const res = await fetch(`${DEV2_API_URL}/users/${user.id}/balances`);
        if (res.ok) setBalances(await res.json());
      } catch {
        /* ignore */
      }
    } else {
      setBalances(MOCK_BALANCES);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return { balances, loading, refetch: fetchBalances };
}

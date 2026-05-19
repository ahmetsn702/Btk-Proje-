'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';

export interface CategoryBalance {
  categoryId: string;
  categoryName: string;
  cpToTlRate: number;
  bonusMultiplier: number;
  bonusActive: boolean;
  cpBalance: number;
}

export interface Balances {
  xp: number;
  cp: number;
  categoryBalances?: CategoryBalance[];
}

export function useBalances() {
  const { user } = useAuthStore();
  const [balances, setBalances] = useState<Balances | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!user) {
      setBalances(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.get(`/points/balance?userId=${user.id}`);
      setBalances(res.data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Bakiye yüklenirken hata oluştu';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return { balances, loading, error, refetch: fetchBalances };
}

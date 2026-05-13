'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeftRight, ArrowUp, ArrowDown } from 'lucide-react';

// DEV2_API_READY: false — mock kullanılıyor
const DEV2_API_READY = false;

interface Transaction {
  id: string;
  type: 'TASK_REWARD' | 'SWAP_CP_TO_XP' | 'XP_SPENT';
  amount: number;
  token: string; // "CP:Elektronik", "XP"
  description: string;
  createdAt: string;
}

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    type: 'TASK_REWARD',
    amount: 15,
    token: 'CP:Elektronik',
    description: 'Ürün incelemesi okuma görevi',
    createdAt: '2026-05-13T10:00:00Z',
  },
  {
    id: '2',
    type: 'SWAP_CP_TO_XP',
    amount: 10,
    token: 'XP',
    description: '50 Elektronik CP → 10 XP takas',
    createdAt: '2026-05-12T14:30:00Z',
  },
  {
    id: '3',
    type: 'TASK_REWARD',
    amount: 20,
    token: 'CP:Giyim',
    description: 'Anket doldurma görevi',
    createdAt: '2026-05-11T09:15:00Z',
  },
  {
    id: '4',
    type: 'XP_SPENT',
    amount: 5,
    token: 'XP',
    description: 'Sipariş #abc123 indirim',
    createdAt: '2026-05-10T16:45:00Z',
  },
  {
    id: '5',
    type: 'SWAP_CP_TO_XP',
    amount: 8,
    token: 'XP',
    description: '40 Giyim CP → 8 XP takas',
    createdAt: '2026-05-09T11:20:00Z',
  },
  {
    id: '6',
    type: 'TASK_REWARD',
    amount: 10,
    token: 'CP:Spor',
    description: 'Quiz çözme görevi',
    createdAt: '2026-05-08T13:00:00Z',
  },
];

const TYPE_CONFIG: Record<string, { label: string; icon: typeof ArrowUp; color: string }> = {
  TASK_REWARD: { label: 'Görev Kazancı', icon: ArrowDown, color: 'text-green-600' },
  SWAP_CP_TO_XP: { label: 'Takas', icon: ArrowLeftRight, color: 'text-blue-600' },
  XP_SPENT: { label: 'XP Harcama', icon: ArrowUp, color: 'text-red-600' },
};

export default function TransactionsPage() {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (DEV2_API_READY) {
      // TODO: fetch from Geliştirici 2 API
      // api.get(`/users/${user.id}/transactions`).then(res => setTransactions(res.data));
    } else {
      setTransactions(MOCK_TRANSACTIONS);
    }
    setLoading(false);
  }, [user]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">İşlem Geçmişi</h1>

      {loading ? (
        <p className="text-muted-foreground">Yükleniyor...</p>
      ) : transactions.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16">
          <ArrowLeftRight className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Henüz işlem geçmişiniz yok</p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tüm İşlemler</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {transactions.map((tx) => {
                const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.TASK_REWARD;
                const Icon = config.icon;
                return (
                  <div key={tx.id} className="flex items-center gap-4 rounded-md border p-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted ${config.color}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${config.color}`}>
                          {config.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(tx.createdAt).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                      <p className="truncate text-sm">{tx.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className={`font-semibold ${tx.type === 'XP_SPENT' ? 'text-red-600' : 'text-green-600'}`}
                      >
                        {tx.type === 'XP_SPENT' ? '-' : '+'}
                        {tx.amount}
                      </p>
                      <p className="text-xs text-muted-foreground">{tx.token}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

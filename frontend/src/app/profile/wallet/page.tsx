'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { useWalletLink } from '@/hooks/use-wallet-link';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, Coins, Zap } from 'lucide-react';

// DEV2_API_READY: false — mock kullanılıyor
const DEV2_API_READY = false;

interface CpBalance {
  categoryId: string;
  categoryName: string;
  amount: number;
}

interface Balances {
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

export default function WalletPage() {
  const { user } = useAuthStore();
  const { linkWallet, linking } = useWalletLink();
  const { isConnected } = useAccount();
  const [balances, setBalances] = useState<Balances | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    if (DEV2_API_READY) {
      // TODO: fetch from Geliştirici 2 API
      // api.get(`/users/${user.id}/balances`).then(res => setBalances(res.data));
    } else {
      setBalances(MOCK_BALANCES);
    }
    setLoading(false);
  }, [user]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Cüzdan</h1>

      {/* Bağlı Cüzdan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5" />
            Bağlı Cüzdan
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user?.walletAddress ? (
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <code className="text-sm">{user.walletAddress}</code>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Henüz bir cüzdan bağlanmamış. Takas işlemleri için cüzdanınızı bağlayın.
              </p>
              {isConnected && (
                <Button onClick={linkWallet} disabled={linking} size="sm">
                  {linking ? 'İmzalanıyor...' : 'Cüzdanı Hesaba Bağla'}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-muted-foreground">Yükleniyor...</p>
      ) : balances ? (
        <>
          {/* XP Bakiyesi */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Zap className="h-5 w-5 text-yellow-500" />
                XP Bakiyesi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-4xl font-bold">
                {balances.xp} <span className="text-lg text-muted-foreground">XP</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Alışverişte indirim olarak kullanabilirsiniz (1 XP = 1 ₺)
              </p>
            </CardContent>
          </Card>

          {/* CP Bakiyeleri */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Coins className="h-5 w-5 text-blue-500" />
                Kategori Puanları (CP)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {balances.cp.length === 0 ? (
                <p className="text-sm text-muted-foreground">Henüz kategori puanınız yok.</p>
              ) : (
                <div className="space-y-3">
                  {balances.cp.map((cp) => (
                    <div
                      key={cp.categoryId}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <span className="text-sm font-medium">{cp.categoryName}</span>
                      <span className="font-semibold">{cp.amount} CP</span>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    CP&apos;leri Takas ekranında XP&apos;ye dönüştürebilirsiniz.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}

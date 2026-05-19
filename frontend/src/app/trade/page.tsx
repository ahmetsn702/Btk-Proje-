'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useMarketRates, type MarketRate } from '@/hooks/use-market-rates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowUpRight,
  ArrowDownRight,
  Flame,
  ArrowLeftRight,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

// ─── İşlem Geçmişi Mock ───────────────────────────────────────────────────────
// DEV2_API_READY: false — gerçek veri /users/:userId/transactions'tan gelecek
const MOCK_TRANSACTIONS = [
  {
    id: '1',
    date: '2026-05-19T10:30:00Z',
    type: 'Takas',
    category: 'Elektronik',
    amount: '50 CP → 4.76 XP',
    status: 'confirmed',
  },
  {
    id: '2',
    date: '2026-05-18T14:15:00Z',
    type: 'Kazanım',
    category: 'Giyim',
    amount: '+30 CP',
    status: 'confirmed',
  },
  {
    id: '3',
    date: '2026-05-17T09:00:00Z',
    type: 'Takas',
    category: 'Spor',
    amount: '20 CP → 2.06 XP',
    status: 'confirmed',
  },
  {
    id: '4',
    date: '2026-05-16T16:45:00Z',
    type: 'Kazanım',
    category: 'Kitap',
    amount: '+15 CP',
    status: 'confirmed',
  },
  {
    id: '5',
    date: '2026-05-15T11:20:00Z',
    type: 'Takas',
    category: 'Ev & Yaşam',
    amount: '40 CP → 3.31 XP',
    status: 'pending',
  },
  {
    id: '6',
    date: '2026-05-14T08:00:00Z',
    type: 'Takas',
    category: 'Elektronik',
    amount: '100 CP → 9.52 XP',
    status: 'failed',
  },
] as const;

const STATUS_MAP = {
  confirmed: { label: 'Onaylandı', icon: CheckCircle, color: 'text-green-500' },
  pending: { label: 'Beklemede', icon: Clock, color: 'text-yellow-500' },
  failed: { label: 'Başarısız', icon: XCircle, color: 'text-red-500' },
} as const;

// ─── Market Kartı ─────────────────────────────────────────────────────────────
function MarketCard({ rate }: { rate: MarketRate }) {
  const isUp = rate.change24h >= 0;
  return (
    <Card className={rate.surgeActive ? 'border-orange-500/50 ring-1 ring-orange-400/30' : ''}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{rate.categoryName}</span>
          {rate.surgeActive && (
            <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">
              <Flame className="h-3 w-3" />
              SURGE x{rate.surgeMultiplier}
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold">1 CP = {rate.cpToXp.toFixed(2)} XP</span>
        </div>
        <div
          className={`flex items-center gap-1 text-sm font-medium ${isUp ? 'text-green-500' : 'text-red-500'}`}
        >
          {isUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
          {isUp ? '+' : ''}
          {rate.change24h.toFixed(2)}%
          <span className="ml-1 text-xs font-normal text-muted-foreground">24s</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Takas Paneli ─────────────────────────────────────────────────────────────
function SwapPanel({ rates }: { rates: MarketRate[] }) {
  const [sellCat, setSellCat] = useState('');
  const [buyCat, setBuyCat] = useState('');
  const [amount, setAmount] = useState('');

  const sellRate = rates.find((r) => r.categoryId === sellCat);
  const buyRate = rates.find((r) => r.categoryId === buyCat);
  const cpNum = Number(amount) || 0;

  // Tahmini çıktı: (sellRate / buyRate) * miktar
  const estimatedOutput =
    sellRate && buyRate && buyRate.cpToXp > 0 ? (sellRate.cpToXp / buyRate.cpToXp) * cpNum : 0;

  const handleSwap = () => {
    // DEV2_API_READY: false — gerçek swap Dev2'nin /exchange/swap endpoint'i
    toast.success('Takas talebi alındı');
    setAmount('');
  };

  return (
    <Card className="h-fit lg:sticky lg:top-20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowLeftRight className="h-5 w-5" />
          Takas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Sat (CP Kategorisi)</Label>
          <select
            value={sellCat}
            onChange={(e) => setSellCat(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">Seçin</option>
            {rates.map((r) => (
              <option key={r.categoryId} value={r.categoryId}>
                {r.categoryName}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Al (CP Kategorisi)</Label>
          <select
            value={buyCat}
            onChange={(e) => setBuyCat(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="">Seçin</option>
            {rates.map((r) => (
              <option key={r.categoryId} value={r.categoryId}>
                {r.categoryName}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Miktar (CP)</Label>
          <Input
            type="number"
            min="1"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        {cpNum > 0 && sellRate && buyRate && (
          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tahmini alacağınız</span>
              <span className="font-semibold">
                {estimatedOutput.toFixed(2)} {buyRate.categoryName} CP
              </span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Kur</span>
              <span>
                1 {sellRate.categoryName} CP = {(sellRate.cpToXp / buyRate.cpToXp).toFixed(4)}{' '}
                {buyRate.categoryName} CP
              </span>
            </div>
          </div>
        )}

        <Button
          className="w-full"
          disabled={!sellCat || !buyCat || cpNum <= 0 || sellCat === buyCat}
          onClick={handleSwap}
        >
          Takas Et
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Ana Sayfa ────────────────────────────────────────────────────────────────
export default function TradePage() {
  const { rates, loading } = useMarketRates();

  // İlk 5 kategori (Elektronik, Giyim, Ev & Yaşam, Spor, Kitap)
  const displayRates = rates.slice(0, 5);

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Takas</h1>
        <p className="text-muted-foreground">Piyasa oranları, takas ve işlem geçmişi</p>
      </div>

      {/* Üst: Market + Swap Panel */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Sol: Market Kartları */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Piyasa</h2>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="h-24 p-4" />
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {displayRates.map((rate) => (
                <MarketCard key={rate.categoryId} rate={rate} />
              ))}
            </div>
          )}
        </div>

        {/* Sağ: Takas Paneli */}
        {!loading && <SwapPanel rates={displayRates} />}
      </div>

      {/* Alt: İşlem Geçmişi */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">İşlem Geçmişi</h2>
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Tarih</th>
                    <th className="px-4 py-3 font-medium">Tip</th>
                    <th className="px-4 py-3 font-medium">Kategori</th>
                    <th className="px-4 py-3 font-medium">Miktar</th>
                    <th className="px-4 py-3 font-medium">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_TRANSACTIONS.map((tx) => {
                    const cfg = STATUS_MAP[tx.status];
                    const Icon = cfg.icon;
                    return (
                      <tr key={tx.id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          {new Date(tx.date).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="px-4 py-3">{tx.type}</td>
                        <td className="px-4 py-3">{tx.category}</td>
                        <td className="px-4 py-3 font-medium">{tx.amount}</td>
                        <td className="px-4 py-3">
                          <span className={`flex items-center gap-1 ${cfg.color}`}>
                            <Icon className="h-3.5 w-3.5" />
                            {cfg.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

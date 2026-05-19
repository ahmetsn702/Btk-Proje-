'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { ProtectedRoute } from '@/components/protected-route';
import { PriceChart } from '@/components/price-chart';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ArrowLeftRight,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import type { LineData } from 'lightweight-charts';
import { useMarketRates } from '@/hooks/use-market-rates';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ExchangeRate {
  cpToXp: number;
  lastUpdated: string;
}

interface SwapTransaction {
  id: string;
  categoryName: string;
  cpAmount: number;
  xpReceived: number;
  status: 'pending' | 'confirmed' | 'failed';
  createdAt: string;
}

const STATUS_CONFIG = {
  pending: { label: 'Beklemede', icon: Clock, color: 'text-yellow-600' },
  confirmed: { label: 'Onaylandı', icon: CheckCircle, color: 'text-green-600' },
  failed: { label: 'Başarısız', icon: XCircle, color: 'text-red-600' },
};

function ComparePreview({ categories }: { categories: Category[] }) {
  const { rates } = useMarketRates();
  const [fromCat, setFromCat] = useState('');
  const [toCat, setToCat] = useState('');
  const [amount, setAmount] = useState('100');

  const fromRate = rates.find((r) => r.categoryId === fromCat);
  const toRate = rates.find((r) => r.categoryId === toCat);
  const cpNum = Number(amount) || 0;

  // CP→XP→CP: fromCP / fromRate = XP, XP * toRate = toCP
  const xpMid = fromRate ? cpNum / fromRate.cpToXp : 0;
  const toCpResult = toRate ? xpMid * toRate.cpToXp : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ArrowLeftRight className="h-5 w-5" />
          Karşılaştırmalı Önizleme (CP → XP → CP)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Bir kategorideki CP&apos;nizi başka bir kategorinin CP&apos;sine çevirseniz ne olur?
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>Kaynak Kategori</Label>
            <select
              value={fromCat}
              onChange={(e) => setFromCat(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Seçin</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label>Miktar (CP)</Label>
            <Input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Hedef Kategori</Label>
            <select
              value={toCat}
              onChange={(e) => setToCat(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Seçin</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {fromCat && toCat && cpNum > 0 && fromRate && toRate && (
          <div className="flex flex-wrap items-center gap-2 rounded-md bg-muted p-4 text-sm">
            <span className="font-semibold">
              {cpNum} {fromRate.categoryName} CP
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-yellow-600">{xpMid.toFixed(2)} XP</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold text-green-600">
              {toCpResult.toFixed(2)} {toRate.categoryName} CP
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ExchangePage() {
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [rate, setRate] = useState<ExchangeRate | null>(null);
  const [chartData, setChartData] = useState<LineData[]>([]);
  const [cpAmount, setCpAmount] = useState('');
  const [slippage, setSlippage] = useState(1); // %
  const [showConfirm, setShowConfirm] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [txStatus, setTxStatus] = useState<'idle' | 'pending' | 'confirmed' | 'failed'>('idle');
  const [history, setHistory] = useState<SwapTransaction[]>([]);

  // Fetch categories
  useEffect(() => {
    api.get('/categories').then((res) => {
      setCategories(res.data);
      if (res.data.length > 0) setSelectedCategory(res.data[0].id);
    });
  }, []);

  // Fetch history
  const fetchHistory = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/exchange/my-history');
      setHistory(res.data);
    } catch {
      /* ignore */
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Fetch rate & chart when category changes
  const fetchRateAndChart = useCallback(async () => {
    if (!selectedCategory) return;
    try {
      const [rateRes, chartRes] = await Promise.all([
        api.get(`/exchange/rate/${selectedCategory}`),
        api.get(`/exchange/chart/${selectedCategory}?range=24h`),
      ]);
      setRate(rateRes.data);
      setChartData(chartRes.data);
    } catch {
      /* ignore */
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchRateAndChart();
  }, [fetchRateAndChart]);

  // Calculate XP output
  const cpNum = Number(cpAmount) || 0;
  const estimatedXp = rate ? cpNum / rate.cpToXp : 0;
  const minXpOut = estimatedXp * (1 - slippage / 100);

  const handleSwap = async () => {
    setShowConfirm(false);
    setSwapping(true);
    setTxStatus('pending');

    try {
      const { data } = await api.post('/exchange/swap', {
        categoryId: selectedCategory,
        cpAmount: cpNum,
        minXpOut,
      });
      setTxStatus(data.status || 'confirmed');
      toast.success(`🎉 Takas işlemi başarıyla gerçekleştirildi!`);
      setCpAmount('');
      fetchHistory();
      fetchRateAndChart();
    } catch (err: unknown) {
      setTxStatus('failed');
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Takas başarısız oldu';
      toast.error(msg);
    } finally {
      setSwapping(false);
    }
  };

  const resetTxStatus = () => setTxStatus('idle');

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Takas</h1>
        <p className="text-muted-foreground">Kategori puanlarınızı (CP) XP&apos;ye dönüştürün</p>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Sol: Takas Paneli */}
          <div className="space-y-6 lg:col-span-2">
            {/* Kategori Seçici + Anlık Oran */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5" />
                  Anlık Oran
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Kategori</Label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {rate && (
                  <div className="flex items-center justify-between rounded-md bg-muted p-4">
                    <div>
                      <p className="text-sm text-muted-foreground">CP → XP Oranı</p>
                      <p className="text-2xl font-bold">{rate.cpToXp.toFixed(2)} CP = 1 XP</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      Son güncelleme
                      <br />
                      {new Date(rate.lastUpdated).toLocaleTimeString('tr-TR')}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Canlı Fiyat Grafiği */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Fiyat Grafiği (24s)</CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length > 0 ? (
                  <PriceChart data={chartData} height={250} />
                ) : (
                  <div className="flex h-[250px] items-center justify-center text-muted-foreground">
                    Grafik yükleniyor...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sağ: İşlem Paneli */}
          <div className="space-y-6">
            {/* Miktar Girişi */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ArrowLeftRight className="h-5 w-5" />
                  Takas Yap
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>CP Miktarı</Label>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Örn: 50"
                    value={cpAmount}
                    onChange={(e) => setCpAmount(e.target.value)}
                  />
                </div>

                {cpNum > 0 && rate && (
                  <div className="rounded-md border p-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tahmini XP</span>
                      <span className="font-semibold">{estimatedXp.toFixed(4)} XP</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Min. XP (slippage %{slippage})</span>
                      <span>{minXpOut.toFixed(4)} XP</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Slippage Toleransı</Label>
                  <div className="flex gap-2">
                    {[0.5, 1, 2, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => setSlippage(s)}
                        className={`rounded-md border px-3 py-1 text-xs ${
                          slippage === s ? 'border-primary bg-primary/10 font-medium' : ''
                        }`}
                      >
                        {s}%
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={cpNum <= 0 || !rate || swapping}
                  onClick={() => setShowConfirm(true)}
                >
                  Takas Et
                </Button>
              </CardContent>
            </Card>

            {/* İşlem Durumu */}
            {txStatus !== 'idle' && (
              <Card>
                <CardContent className="flex items-center gap-3 pt-6">
                  {txStatus === 'pending' && (
                    <Loader2 className="h-5 w-5 animate-spin text-yellow-600" />
                  )}
                  {txStatus === 'confirmed' && <CheckCircle className="h-5 w-5 text-green-600" />}
                  {txStatus === 'failed' && <XCircle className="h-5 w-5 text-red-600" />}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {txStatus === 'pending' && 'İşlem onaylanıyor...'}
                      {txStatus === 'confirmed' && 'İşlem onaylandı!'}
                      {txStatus === 'failed' && 'İşlem başarısız'}
                    </p>
                  </div>
                  {txStatus !== 'pending' && (
                    <Button variant="ghost" size="sm" onClick={resetTxStatus}>
                      Kapat
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Karşılaştırmalı CP→XP→CP Önizleme */}
        <ComparePreview categories={categories} />

        {/* İşlem Geçmişi */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">İşlem Geçmişi</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">Henüz takas işlemi yok.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Tarih</th>
                      <th className="pb-2 font-medium">Kategori</th>
                      <th className="pb-2 font-medium">CP</th>
                      <th className="pb-2 font-medium">XP</th>
                      <th className="pb-2 font-medium">Durum</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((tx) => {
                      const cfg = STATUS_CONFIG[tx.status] || STATUS_CONFIG.pending;
                      const Icon = cfg.icon;
                      return (
                        <tr key={tx.id} className="border-b last:border-0">
                          <td className="py-3">
                            {new Date(tx.createdAt).toLocaleDateString('tr-TR')}
                          </td>
                          <td className="py-3">{tx.categoryName}</td>
                          <td className="py-3 font-medium">-{tx.cpAmount}</td>
                          <td className="py-3 font-medium text-green-600">+{tx.xpReceived}</td>
                          <td className="py-3">
                            <span className={`flex items-center gap-1 ${cfg.color}`}>
                              <Icon className="h-3 w-3" />
                              {cfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Slippage/Onay Modal */}
        {showConfirm && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => setShowConfirm(false)}
          >
            <div
              className="mx-4 w-full max-w-sm rounded-lg bg-background p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="mb-4 text-lg font-bold">Takas Onayı</h3>
              <div className="space-y-3 rounded-md border p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kategori</span>
                  <span className="font-medium">
                    {categories.find((c) => c.id === selectedCategory)?.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gönderilecek</span>
                  <span className="font-medium">{cpNum} CP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tahmini Alınacak</span>
                  <span className="font-semibold">{estimatedXp.toFixed(4)} XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slippage</span>
                  <span>{slippage}%</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-muted-foreground">Min. XP Alınacak</span>
                  <span className="font-semibold">{minXpOut.toFixed(4)} XP</span>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowConfirm(false)}>
                  İptal
                </Button>
                <Button className="flex-1" onClick={handleSwap} disabled={swapping}>
                  {swapping ? 'İşleniyor...' : 'Onayla'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

'use client';

import { useMarketRates } from '@/hooks/use-market-rates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Flame } from 'lucide-react';
import { useEffect, useState } from 'react';

function SurgeCountdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    const tick = () => {
      const diff = Math.max(0, new Date(endsAt).getTime() - Date.now());
      const m = Math.floor(diff / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setRemaining(`${m}:${s.toString().padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return <span className="text-xs font-mono">{remaining}</span>;
}

export default function MarketPage() {
  const { rates, loading } = useMarketRates();

  return (
    <div className="container mx-auto space-y-6 px-4 py-8">
      <div>
        <h1 className="text-3xl font-bold">XP Market</h1>
        <p className="text-muted-foreground">Tüm kategorilerin anlık CP → XP kurları</p>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="h-32 pt-6" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rates.map((rate) => {
            const isUp = rate.change24h >= 0;
            return (
              <Card
                key={rate.categoryId}
                className={rate.surgeActive ? 'border-orange-400 ring-1 ring-orange-300' : ''}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {rate.categoryName}
                    </CardTitle>
                    {rate.surgeActive && (
                      <span className="flex items-center gap-1 rounded-full bg-gradient-to-r from-red-500 to-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                        <Flame className="h-3 w-3" />
                        {rate.surgeMultiplier}X BONUS
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold">{rate.cpToXp.toFixed(2)}</span>
                    <span className="text-sm text-muted-foreground">CP = 1 XP</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex items-center gap-1 text-sm font-medium ${isUp ? 'text-green-600' : 'text-red-600'}`}
                    >
                      {isUp ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                      <span>
                        {isUp ? '+' : ''}
                        {rate.change24h.toFixed(2)}%
                      </span>
                      <span className="ml-1 text-xs font-normal text-muted-foreground">24s</span>
                    </div>
                    {rate.surgeActive && rate.surgeEndsAt && (
                      <div className="flex items-center gap-1 text-orange-600">
                        <SurgeCountdown endsAt={rate.surgeEndsAt} />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Özet */}
      {!loading && rates.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">En Çok Yükselen</p>
                <p className="font-semibold">
                  {rates.reduce((a, b) => (a.change24h > b.change24h ? a : b)).categoryName}{' '}
                  <span className="text-green-600">
                    +
                    {rates
                      .reduce((a, b) => (a.change24h > b.change24h ? a : b))
                      .change24h.toFixed(2)}
                    %
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-6">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm text-muted-foreground">En Çok Düşen</p>
                <p className="font-semibold">
                  {rates.reduce((a, b) => (a.change24h < b.change24h ? a : b)).categoryName}{' '}
                  <span className="text-red-600">
                    {rates
                      .reduce((a, b) => (a.change24h < b.change24h ? a : b))
                      .change24h.toFixed(2)}
                    %
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

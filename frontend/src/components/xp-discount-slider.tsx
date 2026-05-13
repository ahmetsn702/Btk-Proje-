'use client';

import { useState } from 'react';
import { useBalances } from '@/hooks/use-balances';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const XP_TO_TL_RATE = 1; // 1 XP = 1 TL

interface XpDiscountSliderProps {
  maxDiscount: number; // kuruş cinsinden max indirim (sepet toplamı)
  xpAmount: number;
  onXpChange: (xp: number) => void;
}

export function XpDiscountSlider({ maxDiscount, xpAmount, onXpChange }: XpDiscountSliderProps) {
  const { balances } = useBalances();
  const [enabled, setEnabled] = useState(false);

  const xpBalance = balances?.xp ?? 0;
  const maxXpUsable = Math.min(xpBalance, Math.floor(maxDiscount / 100 / XP_TO_TL_RATE));

  const handleToggle = () => {
    if (enabled) {
      setEnabled(false);
      onXpChange(0);
    } else {
      setEnabled(true);
      onXpChange(maxXpUsable);
    }
  };

  if (xpBalance <= 0) return null;

  return (
    <div className="space-y-2 rounded-md border p-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">XP ile İndirim</Label>
        <button
          type="button"
          onClick={handleToggle}
          className={`relative h-5 w-9 rounded-full transition-colors ${
            enabled ? 'bg-primary' : 'bg-muted-foreground/30'
          }`}
        >
          <span
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
              enabled ? 'left-[18px]' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {enabled && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Bakiye: {xpBalance} XP</span>
            <span>1 XP = {XP_TO_TL_RATE} ₺</span>
          </div>
          <Input
            type="range"
            min={0}
            max={maxXpUsable}
            value={xpAmount}
            onChange={(e) => onXpChange(Number(e.target.value))}
            className="h-2 cursor-pointer"
          />
          <div className="flex items-center justify-between text-sm">
            <span>{xpAmount} XP kullanılacak</span>
            <span className="font-medium text-green-600">
              -{(xpAmount * XP_TO_TL_RATE).toFixed(2)} ₺
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useCartStore } from '@/store/cart';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { XpDiscountSlider } from '@/components/xp-discount-slider';
import { useBalances } from '@/hooks/use-balances';
import { useAuthStore } from '@/store/auth';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';

export default function CartPage() {
  const { items, total, loading, fetchCart, updateQuantity, removeItem } = useCartStore();
  const [xpAmount, setXpAmount] = useState(0);
  const [updating, setUpdating] = useState<string | null>(null);

  const { user } = useAuthStore();
  const { balances } = useBalances();

  const [cpUsage, setCpUsage] = useState<{
    productId: string;
    categoryId: string;
    amount: number;
  } | null>(null);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleQuantity = async (itemId: string, quantity: number) => {
    setUpdating(itemId);
    try {
      await updateQuantity(itemId, quantity);
    } catch {
      toast.error('Güncelleme başarısız');
    } finally {
      setUpdating(null);
    }
  };

  const handleRemove = async (itemId: string) => {
    setUpdating(itemId);
    try {
      await removeItem(itemId);
      toast.success('Ürün sepetten kaldırıldı');
    } catch {
      toast.error('Kaldırma başarısız');
    } finally {
      setUpdating(null);
    }
  };

  // CP discount calculation
  let cpDiscountKurus = 0;
  let cpDiscountTL = 0;
  if (cpUsage && cpUsage.amount > 0) {
    const cb = balances?.categoryBalances?.find((b) => b.categoryId === cpUsage.categoryId);
    if (cb) {
      cpDiscountTL = cpUsage.amount * cb.cpToTlRate * cb.bonusMultiplier;
      cpDiscountKurus = Math.round(cpDiscountTL * 100);
    }
  }

  // XP indirim: 1 XP = 1 TL = 100 kuruş (mock)
  const xpDiscountKurus = xpAmount * 100;
  const finalTotal = Math.max(0, total - xpDiscountKurus - cpDiscountKurus);

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Sepetim</h1>

        {loading ? (
          <p className="text-muted-foreground">Yükleniyor...</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-16">
            <ShoppingBag className="h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground">Sepetiniz boş</p>
            <Link href="/products">
              <Button>Alışverişe Başla</Button>
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Ürün Listesi */}
            <div className="space-y-4 lg:col-span-2">
              {items.map((item) => {
                const catBalance = balances?.categoryBalances?.find(
                  (cb) => cb.categoryId === item.product.categoryId,
                );
                const userCpBalance = catBalance?.cpBalance || 0;
                const maxCpDiscountVal = item.product.maxCpDiscount || 0;
                const maxUsableCp = Math.min(userCpBalance, maxCpDiscountVal);

                return (
                  <div key={item.id} className="flex flex-col gap-4 rounded-lg border p-4">
                    <div className="flex gap-4">
                      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                        {item.product.images[0] ? (
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                            Görsel yok
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div>
                          <Link
                            href={`/products/${item.product.id}`}
                            className="font-medium hover:underline"
                          >
                            {item.product.name}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {(item.product.priceFiat / 100).toFixed(2)} ₺
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center rounded-md border">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1 || updating === item.id}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-sm">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= item.product.stock || updating === item.id}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => handleRemove(item.id)}
                            disabled={updating === item.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="shrink-0 font-semibold">
                        {((item.product.priceFiat * item.quantity) / 100).toFixed(2)} ₺
                      </p>
                    </div>

                    {/* CP Discount Area */}
                    {user && (
                      <div className="border-t pt-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                              checked={cpUsage?.productId === item.product.id}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setCpUsage({
                                    productId: item.product.id,
                                    categoryId: item.product.categoryId,
                                    amount: maxUsableCp,
                                  });
                                } else {
                                  setCpUsage(null);
                                }
                              }}
                            />
                            <span>
                              CP ile indirim kullan (Kategori:{' '}
                              {catBalance?.categoryName || 'Bilinmiyor'})
                            </span>
                          </label>
                          <span className="text-xs text-muted-foreground">
                            Kategori CP Bakiyesi: {userCpBalance} CP
                          </span>
                        </div>

                        {cpUsage?.productId === item.product.id && (
                          <div className="bg-muted/50 rounded-lg p-3 space-y-3">
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Maksimum {maxUsableCp} CP kullanabilirsiniz</span>
                              <span>Ürün Max CP İndirim Limiti: {maxCpDiscountVal} CP</span>
                            </div>

                            <div className="flex items-center gap-4">
                              <input
                                type="range"
                                min={0}
                                max={maxUsableCp}
                                value={cpUsage.amount}
                                onChange={(e) => {
                                  setCpUsage({
                                    ...cpUsage,
                                    amount: Number(e.target.value),
                                  });
                                }}
                                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
                                disabled={maxUsableCp === 0}
                              />
                              <span className="text-sm font-semibold shrink-0 w-12 text-right">
                                {cpUsage.amount} CP
                              </span>
                            </div>

                            {catBalance && (
                              <div className="flex flex-col gap-2">
                                {catBalance.bonusActive && (
                                  <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 rounded-md p-2 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                                    <span>🔥 Bonus Aktif — CP'niz %50 daha değerli!</span>
                                  </div>
                                )}

                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-muted-foreground">
                                    Hesaplanan İndirim Tutarı:
                                  </span>
                                  <span className="font-bold text-green-600">
                                    -
                                    {(
                                      cpUsage.amount *
                                      catBalance.cpToTlRate *
                                      catBalance.bonusMultiplier
                                    ).toFixed(2)}{' '}
                                    ₺
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Sipariş Özeti */}
            <div className="space-y-4 rounded-lg border p-6">
              <h2 className="text-lg font-semibold">Sipariş Özeti</h2>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Ara Toplam</span>
                  <span>{(total / 100).toFixed(2)} ₺</span>
                </div>

                <XpDiscountSlider
                  maxDiscount={total}
                  xpAmount={xpAmount}
                  onXpChange={setXpAmount}
                />

                {xpAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>XP İndirim ({xpAmount} XP)</span>
                    <span>-{(xpDiscountKurus / 100).toFixed(2)} ₺</span>
                  </div>
                )}

                {cpUsage && cpUsage.amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>CP İndirimi ({cpUsage.amount} CP)</span>
                    <span>-{cpDiscountTL.toFixed(2)} ₺</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Toplam</span>
                  <span>{(finalTotal / 100).toFixed(2)} ₺</span>
                </div>
              </div>

              <Link
                href={`/checkout?xp=${xpAmount}${cpUsage ? `&cp=${cpUsage.amount}&categoryId=${cpUsage.categoryId}` : ''}`}
              >
                <Button className="w-full" size="lg">
                  Ödemeye Geç
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

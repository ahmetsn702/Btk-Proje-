'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useCartStore } from '@/store/cart';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { useBalances } from '@/hooks/use-balances';

interface Address {
  id: string;
  title: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  address: string;
}

const addressSchema = z.object({
  title: z.string().min(1, 'Başlık gerekli'),
  fullName: z.string().min(1, 'Ad soyad gerekli'),
  phone: z.string().min(10, 'Geçerli telefon girin'),
  city: z.string().min(1, 'Şehir gerekli'),
  district: z.string().min(1, 'İlçe gerekli'),
  address: z.string().min(5, 'Adres gerekli'),
});

type AddressForm = z.infer<typeof addressSchema>;

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const xpAmount = Number(searchParams.get('xp')) || 0;
  const cpAmount = Number(searchParams.get('cp')) || 0;
  const cpCategoryId = searchParams.get('categoryId') || '';

  const { items, total, fetchCart } = useCartStore();
  const { balances } = useBalances();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer'>('card');
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddressForm>({ resolver: zodResolver(addressSchema) });

  useEffect(() => {
    fetchCart();
    api.get('/addresses').then((res) => {
      setAddresses(res.data);
      if (res.data.length > 0) setSelectedAddress(res.data[0].id);
    });
  }, [fetchCart]);

  const addAddress = async (data: AddressForm) => {
    try {
      const { data: addr } = await api.post('/addresses', {
        ...data,
        isDefault: addresses.length === 0,
      });
      setAddresses((prev) => [...prev, addr]);
      setSelectedAddress(addr.id);
      setShowAddressForm(false);
      reset();
      toast.success('Adres eklendi');
    } catch {
      toast.error('Adres eklenemedi');
    }
  };

  // Calculate CP discount in kurus
  let cpDiscountKurus = 0;
  if (cpAmount > 0 && cpCategoryId) {
    const cb = balances?.categoryBalances?.find((b) => b.categoryId === cpCategoryId);
    if (cb) {
      cpDiscountKurus = Math.round(cpAmount * cb.cpToTlRate * cb.bonusMultiplier * 100);
    }
  }

  const xpDiscountKurus = xpAmount * 100;
  const finalTotal = Math.max(0, total - xpDiscountKurus - cpDiscountKurus);

  const handleCheckout = async () => {
    if (!selectedAddress) {
      toast.error('Lütfen bir adres seçin');
      return;
    }
    setSubmitting(true);
    try {
      const { data: order } = await api.post('/orders/checkout', {
        addressId: selectedAddress,
        xpAmount: xpAmount > 0 ? xpAmount : undefined,
        useCpAmount: cpAmount > 0 ? cpAmount : undefined,
        categoryId: cpCategoryId || undefined,
      });
      router.push(`/orders/success/${order.id}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Sipariş oluşturulamadı';
      toast.error(message);
      router.push('/orders/failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0 && !submitting) {
    return (
      <div className="py-16 text-center">
        <p className="text-muted-foreground">Sepetiniz boş</p>
        <Button className="mt-4" onClick={() => router.push('/products')}>
          Alışverişe Başla
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Ödeme</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Adres Seçimi */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Teslimat Adresi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {addresses.map((addr) => (
                <label
                  key={addr.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${
                    selectedAddress === addr.id ? 'border-primary bg-primary/5' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="address"
                    value={addr.id}
                    checked={selectedAddress === addr.id}
                    onChange={() => setSelectedAddress(addr.id)}
                    className="mt-1"
                  />
                  <div className="text-sm">
                    <p className="font-medium">{addr.title}</p>
                    <p>
                      {addr.fullName} — {addr.phone}
                    </p>
                    <p className="text-muted-foreground">
                      {addr.address}, {addr.district}/{addr.city}
                    </p>
                  </div>
                </label>
              ))}

              {showAddressForm ? (
                <form
                  onSubmit={handleSubmit(addAddress)}
                  className="space-y-3 rounded-md border p-4"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Başlık</Label>
                      <Input placeholder="Ev" {...register('title')} />
                      {errors.title && (
                        <p className="text-xs text-destructive">{errors.title.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Ad Soyad</Label>
                      <Input {...register('fullName')} />
                      {errors.fullName && (
                        <p className="text-xs text-destructive">{errors.fullName.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Telefon</Label>
                      <Input {...register('phone')} />
                      {errors.phone && (
                        <p className="text-xs text-destructive">{errors.phone.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>Şehir</Label>
                      <Input {...register('city')} />
                      {errors.city && (
                        <p className="text-xs text-destructive">{errors.city.message}</p>
                      )}
                    </div>
                    <div>
                      <Label>İlçe</Label>
                      <Input {...register('district')} />
                      {errors.district && (
                        <p className="text-xs text-destructive">{errors.district.message}</p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Adres</Label>
                    <Input {...register('address')} />
                    {errors.address && (
                      <p className="text-xs text-destructive">{errors.address.message}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">
                      Kaydet
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAddressForm(false)}
                    >
                      İptal
                    </Button>
                  </div>
                </form>
              ) : (
                <Button variant="outline" size="sm" onClick={() => setShowAddressForm(true)}>
                  + Yeni Adres Ekle
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Ödeme Yöntemi */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ödeme Yöntemi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 ${
                  paymentMethod === 'card' ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="card"
                  checked={paymentMethod === 'card'}
                  onChange={() => setPaymentMethod('card')}
                />
                <span className="text-sm font-medium">Kredi / Banka Kartı</span>
              </label>
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 ${
                  paymentMethod === 'transfer' ? 'border-primary bg-primary/5' : ''
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  value="transfer"
                  checked={paymentMethod === 'transfer'}
                  onChange={() => setPaymentMethod('transfer')}
                />
                <span className="text-sm font-medium">Havale / EFT</span>
              </label>
            </CardContent>
          </Card>
        </div>

        {/* Sipariş Özeti */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sipariş Özeti</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between">
                    <span className="line-clamp-1 flex-1">
                      {item.product.name} × {item.quantity}
                    </span>
                    <span className="shrink-0 ml-2">
                      {((item.product.priceFiat * item.quantity) / 100).toFixed(2)} ₺
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-1 border-t pt-2 text-sm">
                <div className="flex justify-between">
                  <span>Ara Toplam</span>
                  <span>{(total / 100).toFixed(2)} ₺</span>
                </div>
                {xpAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>XP İndirim ({xpAmount} XP)</span>
                    <span>-{(xpDiscountKurus / 100).toFixed(2)} ₺</span>
                  </div>
                )}
                {cpAmount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>CP İndirimi ({cpAmount} CP)</span>
                    <span>-{(cpDiscountKurus / 100).toFixed(2)} ₺</span>
                  </div>
                )}
              </div>

              <div className="border-t pt-2">
                <div className="flex justify-between text-lg font-bold">
                  <span>Toplam</span>
                  <span>{(finalTotal / 100).toFixed(2)} ₺</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={submitting || !selectedAddress}
              >
                {submitting ? 'İşleniyor...' : 'Siparişi Onayla'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <ProtectedRoute>
      <Suspense>
        <CheckoutContent />
      </Suspense>
    </ProtectedRoute>
  );
}

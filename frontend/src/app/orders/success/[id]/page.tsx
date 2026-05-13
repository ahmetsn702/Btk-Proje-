'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { ProtectedRoute } from '@/components/protected-route';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

interface OrderItem {
  id: string;
  quantity: number;
  priceFiat: number;
  product: { id: string; name: string; images: string[] };
}

interface Order {
  id: string;
  status: string;
  totalFiat: number;
  xpDiscount: number;
  createdAt: string;
  items: OrderItem[];
}

export default function OrderSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);

  useEffect(() => {
    api
      .get(`/orders/${id}`)
      .then((res) => setOrder(res.data))
      .catch(() => {});
  }, [id]);

  return (
    <ProtectedRoute>
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Sipariş Başarılı!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">Siparişiniz başarıyla oluşturuldu.</p>

            {order && (
              <div className="space-y-2 rounded-md border p-4 text-left text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sipariş No</span>
                  <span className="font-mono text-xs">{order.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Toplam</span>
                  <span className="font-medium">{(order.totalFiat / 100).toFixed(2)} ₺</span>
                </div>
                {order.xpDiscount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>XP İndirim</span>
                    <span>-{(order.xpDiscount / 100).toFixed(2)} ₺</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ürün Sayısı</span>
                  <span>{order.items.length}</span>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-center pt-2">
              <Link href="/products">
                <Button variant="outline">Alışverişe Devam</Button>
              </Link>
              <Link href="/profile/orders">
                <Button>Siparişlerim</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

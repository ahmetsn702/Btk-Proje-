'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingBag } from 'lucide-react';

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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Beklemede', color: 'text-yellow-600 bg-yellow-50' },
  PAID: { label: 'Ödendi', color: 'text-blue-600 bg-blue-50' },
  SHIPPED: { label: 'Kargoda', color: 'text-purple-600 bg-purple-50' },
  DELIVERED: { label: 'Teslim Edildi', color: 'text-green-600 bg-green-50' },
  CANCELLED: { label: 'İptal', color: 'text-red-600 bg-red-50' },
};

export default function ProfileOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/orders')
      .then((res) => setOrders(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Siparişlerim</h1>

      {loading ? (
        <p className="text-muted-foreground">Yükleniyor...</p>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-16">
          <ShoppingBag className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Henüz siparişiniz yok</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const status = STATUS_LABELS[order.status] || { label: order.status, color: '' };
            return (
              <Card key={order.id}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-mono">#{order.id.slice(0, 8)}</CardTitle>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{new Date(order.createdAt).toLocaleDateString('tr-TR')}</span>
                    <span className="font-medium text-foreground">
                      {(order.totalFiat / 100).toFixed(2)} ₺
                    </span>
                  </div>
                  <div className="space-y-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                          {item.product.images[0] ? (
                            <img
                              src={item.product.images[0]}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs">
                              📦
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-sm">
                          <Link href={`/products/${item.product.id}`} className="hover:underline">
                            {item.product.name}
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {item.quantity} adet × {(item.priceFiat / 100).toFixed(2)} ₺
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {order.xpDiscount > 0 && (
                    <p className="text-xs text-green-600">
                      XP İndirim: -{(order.xpDiscount / 100).toFixed(2)} ₺
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Loader2, PackagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { ProtectedRoute } from '@/components/protected-route';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | string;

interface Product {
  id: string;
  name: string;
  priceFiat: number;
  stock: number;
  isActive?: boolean;
  status?: string;
}

interface ProductListResponse {
  items: Product[];
  total: number;
}

interface OrderItem {
  id: string;
  quantity: number;
  priceFiat?: number;
  product?: {
    id: string;
    name: string;
  };
}

interface Order {
  id: string;
  status: OrderStatus;
  totalFiat: number;
  createdAt: string;
  items: OrderItem[];
  customer?: {
    email?: string;
  };
  user?: {
    email?: string;
  };
  email?: string;
}

interface OrderListResponse {
  items?: Order[];
}

const stats = [
  { label: 'Toplam Ürün', value: '24' },
  { label: 'Aktif Sipariş', value: '8' },
  { label: 'Toplam Satış', value: '156' },
  { label: 'Bu Ay Kazanç', value: '₺18.450' },
];

const orderSteps = [
  { status: 'PENDING', label: 'Beklemede' },
  { status: 'PAID', label: 'Onaylandı' },
  { status: 'SHIPPED', label: 'Kargoya Verildi' },
  { status: 'DELIVERED', label: 'Teslim Edildi' },
];

const statusMeta: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Beklemede', className: 'bg-[#FBF1DE] text-[#8A6320]' },
  PAID: { label: 'Onaylandı', className: 'bg-[#E5EEF6] text-[#2F5780]' },
  SHIPPED: { label: 'Kargoya Verildi', className: 'bg-[#E5EEF6] text-[#2F5780]' },
  DELIVERED: { label: 'Teslim Edildi', className: 'bg-[#F0F7F4] text-[#2F6F52]' },
  CANCELLED: { label: 'İptal', className: 'bg-[#F8E8E0] text-[#93432A]' },
};

// DEV2_API_READY: false — gerçek veri Dev2'den gelecek
const salesHistory = [
  { date: '12 May', product: 'Akıllı Saat', amount: 189900 },
  { date: '10 May', product: 'Kablosuz Kulaklık', amount: 74900 },
  { date: '08 May', product: 'Sırt Çantası', amount: 129900 },
  { date: '05 May', product: 'Bluetooth Hoparlör', amount: 99900 },
  { date: '02 May', product: 'Laptop Standı', amount: 44900 },
];

function formatPrice(kurus: number) {
  return `₺${Math.round(kurus / 100).toLocaleString('tr-TR')}`;
}

function getOrders(data: Order[] | OrderListResponse): Order[] {
  return Array.isArray(data) ? data : (data.items ?? []);
}

function getCustomerEmail(order: Order) {
  return order.customer?.email ?? order.user?.email ?? order.email ?? 'Müşteri bilgisi yok';
}

function SellerDashboardContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'USER') {
      router.replace('/products');
    }
  }, [router, user?.role]);

  useEffect(() => {
    let cancelled = false;

    setProductsLoading(true);
    api
      .get<ProductListResponse>('/products')
      .then((res) => {
        if (!cancelled) setProducts(res.data.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setProductsLoading(false);
      });

    setOrdersLoading(true);
    api
      .get<Order[] | OrderListResponse>('/orders')
      .then((res) => {
        if (!cancelled) setOrders(getOrders(res.data));
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setOrdersLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeProducts = useMemo(
    () =>
      products.filter((product) => product.isActive ?? product.status !== 'INACTIVE').slice(0, 5),
    [products],
  );

  const handleStatusUpdate = async (orderId: string, status: OrderStatus) => {
    const previousOrders = orders;
    setUpdatingOrderId(orderId);
    setOrders((current) =>
      current.map((order) => (order.id === orderId ? { ...order, status } : order)),
    );

    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      toast.success('Sipariş durumu güncellendi');
    } catch {
      setOrders(previousOrders);
      toast.error('Sipariş durumu güncellenemedi');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAF7] px-4 py-8 text-[#2A2A2A] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-semibold tracking-normal text-[#2A2A2A]">Mağazam</h1>
          <Link
            href="/admin/products/new"
            className={cn(
              buttonVariants(),
              'inline-flex items-center gap-2 bg-[#7BE0A9] text-[#2A2A2A] hover:bg-[#69CA95]',
            )}
          >
            Yeni Ürün Ekle
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-[#ECE8E1] bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-[#6B655D]">{stat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-[#2A2A2A]">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div>
              <h2 className="text-xl font-semibold text-[#2A2A2A]">Gelen Siparişler</h2>
              <p className="mt-1 text-sm text-[#6B655D]">
                Yeni siparişleri onaylayın ve kargo durumunu takip edin.
              </p>
            </div>

            {ordersLoading ? (
              <Card className="border-[#ECE8E1] bg-white">
                <CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-[#6B655D]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Siparişler yükleniyor...
                </CardContent>
              </Card>
            ) : orders.length === 0 ? (
              <Card className="border-[#ECE8E1] bg-white">
                <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-[#F0F7F4] text-[#6FA58D]">
                    <PackagePlus className="h-6 w-6" aria-hidden />
                  </div>
                  <p className="font-semibold text-[#2A2A2A]">Henüz sipariş yok</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    updating={updatingOrderId === order.id}
                    onStatusUpdate={handleStatusUpdate}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:col-span-1 lg:self-start">
            <Card className="border-[#ECE8E1] bg-white">
              <CardHeader>
                <CardTitle className="text-lg text-[#2A2A2A]">Yeni Ürün Oluştur</CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href="/admin/products/new"
                  className={cn(
                    buttonVariants({ size: 'lg' }),
                    'w-full bg-[#7BE0A9] text-[#2A2A2A] hover:bg-[#69CA95]',
                  )}
                >
                  Ürün Oluştur
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </CardContent>
            </Card>

            <Card className="border-[#ECE8E1] bg-white">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-lg text-[#2A2A2A]">Aktif Ürünler</CardTitle>
                <Link href="/products" className="text-sm font-semibold text-[#6FA58D]">
                  Tümünü Gör →
                </Link>
              </CardHeader>
              <CardContent>
                {productsLoading ? (
                  <div className="flex items-center gap-2 py-4 text-sm text-[#6B655D]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Yükleniyor...
                  </div>
                ) : activeProducts.length === 0 ? (
                  <p className="py-4 text-sm text-[#6B655D]">Aktif ürün bulunamadı.</p>
                ) : (
                  <div className="divide-y divide-[#ECE8E1]">
                    {activeProducts.map((product) => (
                      <div
                        key={product.id}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-[#2A2A2A]">
                            {product.name}
                          </p>
                          <p className="text-xs text-[#6B655D]">Stok: {product.stock}</p>
                        </div>
                        <p className="shrink-0 text-sm font-semibold text-[#2A2A2A]">
                          {formatPrice(product.priceFiat)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-[#ECE8E1] bg-white">
              <CardHeader className="flex flex-row items-center justify-between gap-3">
                <CardTitle className="text-lg text-[#2A2A2A]">Satış Geçmişi</CardTitle>
                <Link href="/profile/orders" className="text-sm font-semibold text-[#6FA58D]">
                  Tümünü Gör →
                </Link>
              </CardHeader>
              <CardContent>
                <div className="divide-y divide-[#ECE8E1]">
                  {salesHistory.map((sale) => (
                    <div key={`${sale.date}-${sale.product}`} className="flex gap-3 py-3">
                      <p className="w-14 shrink-0 text-xs font-medium text-[#6B655D]">
                        {sale.date}
                      </p>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#2A2A2A]">
                          {sale.product}
                        </p>
                        <p className="text-xs text-[#6B655D]">{formatPrice(sale.amount)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
    </main>
  );
}

function OrderCard({
  order,
  updating,
  onStatusUpdate,
}: {
  order: Order;
  updating: boolean;
  onStatusUpdate: (orderId: string, status: OrderStatus) => void;
}) {
  const meta = statusMeta[order.status] ?? {
    label: order.status,
    className: 'bg-[#F3F1ED] text-[#6B655D]',
  };
  const date = new Date(order.createdAt).toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <article className="rounded-lg border border-[#ECE8E1] bg-white p-5 shadow-[0_1px_2px_rgba(40,32,26,0.04)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-mono text-sm font-semibold text-[#2A2A2A]">
              #{order.id.slice(0, 8).toUpperCase()}
            </p>
            <span className="text-xs text-[#A8A29A]">•</span>
            <p className="text-sm text-[#6B655D]">{date}</p>
          </div>
          <p className="mt-1 text-sm text-[#6B655D]">{getCustomerEmail(order)}</p>
        </div>
        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', meta.className)}>
          {meta.label}
        </span>
      </div>

      <div className="mt-5 space-y-2 rounded-lg border border-[#ECE8E1] bg-[#FAFAF7] p-4">
        {order.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
            <p className="min-w-0 truncate font-medium text-[#2A2A2A]">
              {item.product?.name ?? 'Ürün'}
            </p>
            <p className="shrink-0 text-[#6B655D]">{item.quantity} adet</p>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-[#ECE8E1] pt-3">
          <span className="text-sm text-[#6B655D]">Toplam</span>
          <span className="text-lg font-semibold text-[#2A2A2A]">
            {formatPrice(order.totalFiat)}
          </span>
        </div>
      </div>

      <OrderStepper status={order.status} />

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        {order.status === 'PENDING' && (
          <button
            type="button"
            disabled={updating}
            onClick={() => onStatusUpdate(order.id, 'PAID')}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#6FA58D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#5E927C] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updating && <Loader2 className="h-4 w-4 animate-spin" />}
            Onayla
          </button>
        )}
        {order.status === 'PAID' && (
          <button
            type="button"
            disabled={updating}
            onClick={() => onStatusUpdate(order.id, 'SHIPPED')}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-[#5286B5] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#43749F] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updating && <Loader2 className="h-4 w-4 animate-spin" />}
            Kargoya Ver
          </button>
        )}
        {order.status === 'SHIPPED' && (
          <button
            type="button"
            disabled={updating}
            onClick={() => onStatusUpdate(order.id, 'DELIVERED')}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-[#6FA58D] bg-white px-4 text-sm font-semibold text-[#6FA58D] transition-colors hover:bg-[#F0F7F4] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {updating && <Loader2 className="h-4 w-4 animate-spin" />}
            Teslim Edildi
          </button>
        )}
        {(order.status === 'DELIVERED' || order.status === 'CANCELLED') && (
          <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', meta.className)}>
            {meta.label}
          </span>
        )}
      </div>
    </article>
  );
}

function OrderStepper({ status }: { status: OrderStatus }) {
  const activeIndex = orderSteps.findIndex((step) => step.status === status);

  return (
    <div className="mt-5 grid grid-cols-4 gap-2">
      {orderSteps.map((step, index) => {
        const completed = activeIndex >= 0 && index < activeIndex;
        const active = activeIndex === index;
        const delivered = status === 'DELIVERED';
        const done = completed || delivered;

        return (
          <div key={step.status} className="relative flex min-w-0 flex-col items-center gap-2">
            {index > 0 && (
              <span
                className={cn(
                  'absolute right-1/2 top-4 h-0.5 w-full -translate-x-4',
                  done ? 'bg-[#6FA58D]' : 'bg-[#ECE8E1]',
                )}
                aria-hidden
              />
            )}
            <span
              className={cn(
                'relative z-10 grid h-8 w-8 place-items-center rounded-full border text-xs font-semibold',
                done
                  ? 'border-[#6FA58D] bg-[#6FA58D] text-white'
                  : active
                    ? 'border-[#6FA58D] bg-[#F0F7F4] text-[#2F6F52]'
                    : 'border-[#ECE8E1] bg-white text-[#9A9A93]',
              )}
            >
              {done ? <Check className="h-4 w-4" aria-hidden /> : index + 1}
            </span>
            <span
              className={cn(
                'text-center text-[11px] leading-4',
                active
                  ? 'font-bold text-[#2A2A2A]'
                  : done
                    ? 'font-semibold text-[#2F6F52]'
                    : 'text-[#6B655D]',
              )}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function SellerDashboardPage() {
  return (
    <ProtectedRoute>
      <SellerDashboardContent />
    </ProtectedRoute>
  );
}

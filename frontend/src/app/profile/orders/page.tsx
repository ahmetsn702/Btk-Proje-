'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Check, Loader2, PackageX } from 'lucide-react';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface OrderProduct {
  id: string;
  name: string;
  images: string[];
}

interface OrderItem {
  id: string;
  quantity: number;
  priceFiat: number;
  product: OrderProduct;
}

interface Order {
  id: string;
  status: string;
  totalFiat: number;
  xpDiscount: number;
  createdAt: string;
  items: OrderItem[];
}

const STATUS_META: Record<string, { label: string; bg: string; fg: string; dot: string }> = {
  PENDING: { label: 'Beklemede', bg: '#FBF1DE', fg: '#8A6320', dot: '#C99A52' },
  PAID: { label: 'Ödendi', bg: '#E5EEF6', fg: '#2F5780', dot: '#5286B5' },
  SHIPPED: { label: 'Kargoda', bg: '#E5EEF6', fg: '#2F5780', dot: '#5286B5' },
  DELIVERED: {
    label: 'Teslim Edildi',
    bg: '#EAF3EE',
    fg: '#3F7561',
    dot: '#6FA58D',
  },
  CANCELLED: { label: 'İptal', bg: '#F8E8E0', fg: '#93432A', dot: '#E28D7A' },
};

const TRACKING_STEPS = [
  { status: 'PENDING', label: 'Sipariş Alındı' },
  { status: 'PAID', label: 'Hazırlanıyor' },
  { status: 'SHIPPED', label: 'Kargoya Verildi' },
  { status: 'DELIVERED', label: 'Teslim Edildi' },
];

const fmtTLDecimal = (kurus: number) =>
  (kurus / 100).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function resolveImageUrl(url: string | undefined, seed: string): string {
  if (!url) return `https://picsum.photos/seed/${seed}/120/120`;
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
}

export default function ProfileOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/orders')
      .then((res) => setOrders(Array.isArray(res.data) ? res.data : []))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <ProfileLightThemeStyles />
      <div className="text-[#2A2A2A]">
        <header className="mb-6 flex items-end justify-between gap-4">
          <div>
            <h1
              className="text-[28px] font-bold tracking-tight text-[#2A2A2A]"
              style={{
                fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
              }}
            >
              Siparişlerim
            </h1>
            <p className="mt-1 text-[13.5px] text-[#5C5953]">
              Tüm siparişlerinizi buradan takip edebilirsiniz.
            </p>
          </div>
          {!loading && orders.length > 0 && (
            <p className="hidden text-[12px] font-semibold uppercase tracking-[0.1em] text-[#9A9A93] sm:block">
              {orders.length} sipariş
            </p>
          )}
        </header>

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-[12px] border border-[#ECE8E1] bg-white py-16 text-[13.5px] text-[#5C5953]">
            <Loader2 className="h-4 w-4 animate-spin" />
            Siparişler yükleniyor...
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center gap-4 rounded-[12px] border border-[#ECE8E1] bg-white py-20">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[#F4F1EA]">
              <PackageX className="h-6 w-6 text-[#9A9A93]" />
            </div>
            <div className="text-center">
              <p className="text-[15px] font-semibold text-[#2A2A2A]">Henüz siparişiniz yok</p>
              <p className="mt-1 text-[13px] text-[#5C5953]">
                İlk siparişini ver ve XP kazanmaya başla.
              </p>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-[10px] border border-[#6FA58D] bg-white px-4 py-2 text-[13px] font-semibold text-[#6FA58D] transition-colors hover:bg-[#F0F7F4]"
            >
              Alışverişe Başla <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {orders.map((o) => (
              <li key={o.id}>
                <OrderCard order={o} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function OrderCard({ order }: { order: Order }) {
  const meta = STATUS_META[order.status] ?? {
    label: order.status,
    bg: '#F4F1EA',
    fg: '#5C5953',
    dot: '#9A9A93',
  };
  const itemCount = order.items.reduce((s, it) => s + it.quantity, 0);

  return (
    <article className="rounded-[12px] border border-[#ECE8E1] bg-white shadow-[0_1px_2px_rgba(40,32,26,0.04)] transition-colors hover:border-[#DDD8CC]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F4F1EA] px-5 py-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="font-mono text-[12.5px] font-semibold tracking-tight text-[#2A2A2A]">
            #{order.id.slice(0, 8).toUpperCase()}
          </span>
          <span className="text-[11px] text-[#CFCBC2]" aria-hidden>
            •
          </span>
          <span className="text-[12.5px] text-[#5C5953]">
            {new Date(order.createdAt).toLocaleDateString('tr-TR', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <span className="text-[11px] text-[#CFCBC2]" aria-hidden>
            •
          </span>
          <span className="text-[12.5px] text-[#5C5953]">{itemCount} ürün</span>
        </div>
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-bold tracking-[0.02em]"
          style={{ background: meta.bg, color: meta.fg }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.dot }} aria-hidden />
          {meta.label}
        </span>
      </header>

      <div className="flex flex-col gap-3 px-5 py-4">
        {order.items.slice(0, 3).map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-[8px] border border-[#ECE8E1] bg-[#F4F1EA]">
              <Image
                src={resolveImageUrl(item.product.images?.[0], item.product.id)}
                alt=""
                fill
                sizes="48px"
                unoptimized
                className="object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/products/${item.product.id}`}
                className="line-clamp-1 text-[13.5px] font-semibold text-[#2A2A2A] hover:text-[#6FA58D] hover:underline"
              >
                {item.product.name}
              </Link>
              <p className="text-[12px] text-[#5C5953]">
                {item.quantity} adet × ₺{fmtTLDecimal(item.priceFiat)}
              </p>
            </div>
          </div>
        ))}
        {order.items.length > 3 && (
          <p className="text-[12px] text-[#9A9A93]">+{order.items.length - 3} ürün daha</p>
        )}
      </div>

      {order.status === 'CANCELLED' ? null : (
        <div className="px-5 pb-4">
          <OrderTrackingStepper status={order.status} />
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F4F1EA] bg-[#FAFAF7] px-5 py-3.5">
        <div className="flex flex-wrap items-baseline gap-3">
          {order.xpDiscount > 0 && (
            <span className="rounded-full bg-[#F0F7F4] px-2.5 py-1 text-[11.5px] font-semibold text-[#3F7561]">
              XP indirim -₺{fmtTLDecimal(order.xpDiscount)}
            </span>
          )}
          <span className="text-[12px] text-[#5C5953]">Toplam</span>
          <span
            className="text-[18px] font-bold tabular-nums text-[#2A2A2A]"
            style={{
              fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
            }}
          >
            ₺{fmtTLDecimal(order.totalFiat)}
          </span>
        </div>
        <Link
          href={`/orders/${order.id}`}
          className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#6FA58D] bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[#6FA58D] transition-all hover:-translate-y-px hover:bg-[#F0F7F4]"
        >
          Detay Gör <ArrowRight className="h-3 w-3" />
        </Link>
      </footer>
    </article>
  );
}

function getTrackingIndex(status: string) {
  const index = TRACKING_STEPS.findIndex((step) => step.status === status);
  return index >= 0 ? index : 0;
}

function OrderTrackingStepper({ status }: { status: string }) {
  const activeIndex = getTrackingIndex(status);
  const delivered = status === 'DELIVERED';

  return (
    <div className="grid grid-cols-4 gap-2 rounded-[12px] border border-[#ECE8E1] bg-[#FAFAF7] px-3 py-4">
      {TRACKING_STEPS.map((step, index) => {
        const completed = delivered || index < activeIndex;
        const active = delivered ? index === TRACKING_STEPS.length - 1 : index === activeIndex;

        return (
          <div key={step.status} className="relative flex min-w-0 flex-col items-center gap-2">
            {index > 0 && (
              <span
                className={cn(
                  'absolute right-1/2 top-4 h-0.5 w-full -translate-x-4',
                  completed ? 'bg-[#6FA58D]' : 'bg-[#ECE8E1]',
                )}
                aria-hidden
              />
            )}
            <span
              className={cn(
                'relative z-10 grid h-8 w-8 place-items-center rounded-full border text-[12px] font-bold',
                completed
                  ? 'border-[#6FA58D] bg-[#6FA58D] text-white'
                  : active
                    ? 'border-[#6FA58D] bg-[#6FA58D] text-white'
                    : 'border-[#DAD5CB] bg-white text-[#9A9A93]',
              )}
            >
              {completed ? <Check className="h-4 w-4" aria-hidden /> : index + 1}
            </span>
            <span
              className={cn(
                'text-center text-[11px] leading-4',
                active
                  ? 'font-bold text-[#2A2A2A]'
                  : completed
                    ? 'font-semibold text-[#3F7561]'
                    : 'text-[#5C5953]',
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

function ProfileLightThemeStyles() {
  return (
    <style jsx global>{`
      body {
        background: #fafaf7 !important;
        color: #2a2a2a !important;
      }
      nav.space-y-1 {
        background: #ffffff;
        border-right: 1px solid #ece8e1;
        border-radius: 12px;
        padding: 8px 0;
      }
      nav.space-y-1 > a {
        color: #5c5953 !important;
        background: transparent !important;
        border-left: 3px solid transparent !important;
        border-radius: 0 !important;
        padding-left: 13px !important;
        font-weight: 500 !important;
      }
      nav.space-y-1 > a:hover {
        color: #2a2a2a !important;
        background: #f8f6f1 !important;
      }
      nav.space-y-1 > a[class*='bg-primary'] {
        color: #2a2a2a !important;
        background: #f0f7f4 !important;
        border-left: 3px solid #6fa58d !important;
      }
    `}</style>
  );
}

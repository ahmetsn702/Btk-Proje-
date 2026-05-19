'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useBalances } from '@/hooks/use-balances';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────────────────────────────────────── *
 * Tipler
 * ────────────────────────────────────────────────────────────────────────── */
interface Product {
  id: string;
  name: string;
  description?: string;
  priceFiat: number; // kuruş
  stock: number;
  images: string[];
  category: { id: string; name: string; slug: string };
}

interface MockReview {
  id: string;
  name: string;
  initials: string;
  rating: number;
  date: string;
  body: string;
  verified: boolean;
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Sabitler
 * ────────────────────────────────────────────────────────────────────────── */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// XP→TL oranı (cart sayfası ile aynı, mock)
// DEV2_API_READY: false — gerçek oran Dev2'nin /xp/apply-discount endpoint'inden gelecek
const XP_TO_KURUS = 40; // 1 XP = 0,40 TL

// Mock değerlendirmeler — DEV2_API_READY: false (gerçek incelemeler backend'de henüz yok)
const MOCK_REVIEWS: MockReview[] = [
  {
    id: 'r1',
    name: 'Ayşe K.',
    initials: 'AK',
    rating: 5,
    date: '12 gün önce',
    verified: true,
    body: 'Beklediğimden çok daha hoş geldi, kutusu da özenliydi. Renk fotoğraftakiyle birebir aynı, evdeki tonla mükemmel oturdu.',
  },
  {
    id: 'r2',
    name: 'Mehmet S.',
    initials: 'MS',
    rating: 4,
    date: '3 hafta önce',
    verified: true,
    body: 'Hızlı kargo, sıkı paketleme. Ürün tam istediğim gibi; tek dezavantajı boyutu biraz daha büyük olsaydı süperdi.',
  },
  {
    id: 'r3',
    name: 'Zeynep T.',
    initials: 'ZT',
    rating: 5,
    date: '1 ay önce',
    verified: false,
    body: 'Hediye olarak aldım — paketleme çok şıktı. Açan kişinin yüzünde gerçekten gülümseme yarattı, tavsiye ederim.',
  },
];

/* ────────────────────────────────────────────────────────────────────────── *
 * Helpers
 * ────────────────────────────────────────────────────────────────────────── */
function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

const fmtTL = (kurus: number) => Math.round(kurus / 100).toLocaleString('tr-TR');

const fmtTLDecimal = (kurus: number) =>
  (kurus / 100).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

function resolveImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
}

function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (!data?.message) return fallback;
  return Array.isArray(data.message) ? data.message[0] : data.message;
}

// Ürün için deterministik mock veriler
// DEV2_API_READY: false — gerçek değerler:
//   - rating, reviewCount: ürün incelemelerinden hesaplanacak (backend henüz yok)
//   - oldPriceFiat: ürün modeli `originalPriceFiat` alanı eklendiğinde
//   - xpPercent: Dev2'nin /xp/preview-discount endpoint'inden gelecek
//   - earnXp: Dev2'nin satın alma sonrası XP kazanım servisinden gelecek
function deriveProductMock(p: Product) {
  const h = hashStr(p.id);
  const xpPercent = 4 + (h % 19); // 4..22
  const rating = 4 + ((h >> 4) % 10) / 10; // 4.0..4.9
  const reviewCount = 8 + (h % 247); // 8..254
  const hasOldPrice = (h >> 8) % 5 < 2;
  const oldPriceFiat = hasOldPrice
    ? Math.round(p.priceFiat * (1 + 0.1 + ((h >> 12) % 12) / 100))
    : null;
  // Sipariş başına kazanılacak mock XP: ~%1 değer / fiyat tabanlı
  const earnXp = Math.max(2, Math.round(p.priceFiat / 100 / 10));
  // İnceleme dağılımı (5★→1★) — toplam reviewCount
  const breakdown = (() => {
    const w = [60, 25, 9, 4, 2];
    return w.map((p100) => Math.round((reviewCount * p100) / 100));
  })();
  return { xpPercent, rating, reviewCount, oldPriceFiat, earnXp, breakdown };
}

function placeholderGradient(seed: string) {
  const palettes: [string, string][] = [
    ['#F0E6DA', '#D9C5AE'],
    ['#EDE3D6', '#D3BFA6'],
    ['#F3E8DA', '#DCC4AC'],
    ['#E8DDCE', '#CFB89E'],
    ['#EFE7DA', '#D5BFA5'],
  ];
  const [a, b] = palettes[hashStr(seed) % palettes.length];
  return `linear-gradient(155deg, ${a} 0%, ${b} 100%)`;
}

// Kategori ya da ürün id'sine göre deterministik özellik listesi
function deriveSpecs(p: Product): { k: string; v: string }[] {
  const h = hashStr(p.id);
  const colors = ['Krem', 'Toprak', 'Antrasit', 'Açık Kahve', 'Kum'];
  const materials = ['Pamuk', 'Keten', 'Seramik', 'Doğal Ahşap', 'Geri Dönüşüm'];
  return [
    { k: 'Marka', v: 'BTK Studio' },
    { k: 'Kategori', v: p.category.name },
    { k: 'Renk', v: colors[h % colors.length] },
    { k: 'Materyal', v: materials[(h >> 3) % materials.length] },
    { k: 'Stok kodu', v: p.id.slice(0, 8).toUpperCase() },
    { k: 'Garanti', v: '2 yıl üretici' },
    { k: 'Üretim ülkesi', v: 'Türkiye' },
    { k: 'Kargo süresi', v: '24 saat içinde hazır' },
  ];
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Star helpers
 * ────────────────────────────────────────────────────────────────────────── */
function StarRow({
  value,
  size = 14,
  color = '#8A6E51',
}: {
  value: number;
  size?: number;
  color?: string;
}) {
  // 5 yıldız; tam yıldız doluysa fill, kısmenseyi yarım göstermek yerine yuvarla.
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-[2px]" aria-label={`${value.toFixed(1)} yıldız`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          width={size}
          height={size}
          aria-hidden
          style={{
            color,
            fill: i < full ? color : 'transparent',
          }}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Gallery
 * ────────────────────────────────────────────────────────────────────────── */
function Gallery({
  product,
  active,
  setActive,
  slots,
}: {
  product: Product;
  active: number;
  setActive: (i: number) => void;
  slots: (string | null)[];
}) {
  const cover = slots[active];
  const total = slots.length;

  return (
    <>
      {/* Thumbnails */}
      <div className="order-2 lg:order-1 lg:sticky lg:top-[84px]">
        <div className="flex gap-2.5 overflow-x-auto lg:flex-col lg:overflow-visible">
          {slots.map((src, i) => {
            const isActive = i === active;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Görsel ${i + 1}`}
                aria-pressed={isActive}
                className={cn(
                  'relative h-16 w-16 shrink-0 overflow-hidden rounded-[14px] border bg-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C7B299]',
                  isActive
                    ? 'border-[#2A2A2A] shadow-[inset_0_0_0_3px_#fff,0_0_0_1px_#2A2A2A]'
                    : 'border-[#ECE8E1] hover:border-[#E1DCD2]',
                )}
              >
                <span
                  className="absolute inset-0"
                  style={{ background: placeholderGradient(`${product.id}-${i}`) }}
                  aria-hidden
                />
                {src && (
                  <Image src={src} alt="" fill sizes="64px" unoptimized className="object-cover" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main image */}
      <div className="order-1 lg:order-2">
        <div className="relative aspect-square w-full overflow-hidden rounded-[24px] border border-[#ECE8E1] bg-[#F7F2EC] shadow-[0_1px_2px_rgba(40,30,20,0.04)]">
          <span
            className="absolute inset-0"
            style={{ background: placeholderGradient(`${product.id}-${active}`) }}
            aria-hidden
          />
          {cover && (
            <Image
              src={cover}
              alt={product.name}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              unoptimized
              className="object-cover"
              priority
            />
          )}

          {/* Badges */}
          <div className="absolute left-[18px] top-[18px] z-10 flex flex-col gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ECE8E1] bg-white px-2.5 py-1.5 text-[11.5px] text-[#6E8E6E]">
              <span
                className="h-1.5 w-1.5 rounded-full bg-[#6E8E6E] shadow-[0_0_0_3px_rgba(110,142,110,0.18)]"
                aria-hidden
              />
              Kargoya 24 saatte hazır
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-[#ECE8E1] bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.04em] text-[#6B6B66]">
              Yeni
            </span>
          </div>

          {/* Counter */}
          <span className="absolute bottom-[18px] left-[18px] z-10 rounded-full bg-[#2A2A2A]/[0.78] px-2.5 py-1.5 font-mono text-[11px] tracking-[0.04em] text-white tabular-nums">
            {String(active + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
          </span>

          {/* Prev/next */}
          <button
            type="button"
            onClick={() => setActive((active - 1 + total) % total)}
            aria-label="Önceki görsel"
            className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-[#ECE8E1] bg-white/95 text-[#2A2A2A] shadow-sm transition-all hover:bg-[#F7F2EC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C7B299]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setActive((active + 1) % total)}
            aria-label="Sonraki görsel"
            className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-[#ECE8E1] bg-white/95 text-[#2A2A2A] shadow-sm transition-all hover:bg-[#F7F2EC] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C7B299]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Info panel
 * ────────────────────────────────────────────────────────────────────────── */
function InfoPanel({
  product,
  quantity,
  setQuantity,
  xpAmount,
  setXpAmount,
  xpBalance,
  maxXpUsable,
  cpUsageLimit,
  maxXpFromLimit,
  onAddToCart,
  onBuyNow,
  busy,
  isFav,
  toggleFav,
}: {
  product: Product;
  quantity: number;
  setQuantity: (n: number) => void;
  xpAmount: number;
  setXpAmount: (n: number) => void;
  xpBalance: number;
  maxXpUsable: number;
  cpUsageLimit: number;
  maxXpFromLimit: number;
  onAddToCart: () => void;
  onBuyNow: () => void;
  busy: boolean;
  isFav: boolean;
  toggleFav: () => void;
}) {
  const { rating, reviewCount, oldPriceFiat, earnXp } = deriveProductMock(product);
  const lineTotal = product.priceFiat * quantity;
  const xpDiscountKurus = xpAmount * XP_TO_KURUS;
  const finalKurus = Math.max(0, lineTotal - xpDiscountKurus);
  const lowStock = product.stock > 0 && product.stock <= 10;
  const outOfStock = product.stock <= 0;
  const sliderPct = maxXpUsable > 0 ? (xpAmount / maxXpUsable) * 100 : 0;
  const installment = Math.ceil(product.priceFiat / 3 / 100); // 3 taksit (TL, yuvarlak)

  // İndirim yüzdesi (eski → yeni) — sadece eski fiyat varsa
  const discountPct =
    oldPriceFiat && oldPriceFiat > product.priceFiat
      ? Math.round((1 - product.priceFiat / oldPriceFiat) * 100)
      : null;

  return (
    <aside className="order-3 lg:sticky lg:top-[84px]" aria-label="Ürün bilgileri">
      {/* Breadcrumb (panel içinde, kullanıcı isteği) */}
      <nav aria-label="Konum" className="mb-4 text-[12.5px] text-[#9A9A93]">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-[#6B6B66]">
              Anasayfa
            </Link>
          </li>
          <li aria-hidden className="text-[#CFCBC2]">
            /
          </li>
          <li>
            <Link
              href={`/products?category=${product.category.id}`}
              className="hover:text-[#6B6B66]"
            >
              {product.category.name}
            </Link>
          </li>
          <li aria-hidden className="text-[#CFCBC2]">
            /
          </li>
          <li className="line-clamp-1 max-w-[200px] text-[#6B6B66]" title={product.name}>
            {product.name}
          </li>
        </ol>
      </nav>

      {/* Category pill */}
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7F2EC] px-3 py-1.5 text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#8A6E51]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#C7B299]" aria-hidden />
        {product.category.name}
      </span>

      {/* Title */}
      <h1
        className="mt-3.5 mb-2.5 text-[34px] font-medium leading-[1.1] -tracking-[0.02em] text-[#2A2A2A]"
        style={{ fontFamily: 'Fraunces, Georgia, serif' }}
      >
        {product.name}
      </h1>

      {/* Rating row (mock) */}
      <div className="mb-5 flex flex-wrap items-center gap-3.5 border-b border-[#ECE8E1] pb-5 text-[13px] text-[#6B6B66]">
        <span className="inline-flex items-center gap-1.5">
          <StarRow value={rating} />
          <span className="font-semibold text-[#2A2A2A] tabular-nums">{rating.toFixed(1)}</span>
        </span>
        <span className="text-[#D9D5CC]" aria-hidden>
          |
        </span>
        <span>
          <span className="tabular-nums">{reviewCount}</span> değerlendirme
        </span>
        <span className="text-[#D9D5CC]" aria-hidden>
          |
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShoppingBag className="h-3.5 w-3.5 text-[#9A9A93]" aria-hidden />
          Bu hafta satın alındı
        </span>
      </div>

      {/* Price */}
      <div className="mb-2 flex flex-wrap items-baseline gap-3.5">
        <span
          className="text-[40px] font-medium leading-none -tracking-[0.02em] text-[#2A2A2A]"
          style={{ fontFamily: 'Fraunces, Georgia, serif' }}
        >
          ₺<span className="tabular-nums">{fmtTL(product.priceFiat)}</span>
        </span>
        {oldPriceFiat && (
          <span className="text-[18px] text-[#9A9A93] line-through tabular-nums">
            ₺{fmtTL(oldPriceFiat)}
          </span>
        )}
        {discountPct && (
          <span className="rounded-md bg-[#EEF3EE] px-2 py-1 text-[11.5px] font-semibold tracking-[0.02em] text-[#6E8E6E]">
            %{discountPct} indirim
          </span>
        )}
      </div>
      <p className="mb-5 text-[12.5px] text-[#9A9A93]">
        veya 3 taksit ·{' '}
        <b className="font-medium text-[#6B6B66] tabular-nums">
          ₺{installment.toLocaleString('tr-TR')}
        </b>{' '}
        / ay
      </p>

      {/* Stock warn */}
      {!outOfStock && lowStock && (
        <div className="mb-5 flex items-center gap-2.5 rounded-[12px] border border-[#F2DCD8] bg-[#FBEFEC] px-3.5 py-2.5 text-[13px] text-[#8A3B33]">
          <Zap className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            Son <b className="font-semibold tabular-nums">{product.stock}</b> adet
          </span>
          <div className="mx-1 h-1 flex-1 overflow-hidden rounded-full bg-[#F2DCD8]">
            <div
              className="h-full rounded-full bg-[#C76A60] transition-[width]"
              style={{ width: `${Math.max(8, Math.min(40, product.stock * 4))}%` }}
            />
          </div>
          {/* DEV2_API_READY: false — son 24 saat satış sayısı mock */}
          <span className="text-[#8A3B33]/80">
            Bu hafta <b className="font-semibold tabular-nums">{17 + (hashStr(product.id) % 32)}</b>{' '}
            kişi aldı
          </span>
        </div>
      )}

      {outOfStock && (
        <div className="mb-5 rounded-[12px] border border-[#F2DCD8] bg-[#FBEFEC] px-3.5 py-2.5 text-[13px] font-semibold text-[#8A3B33]">
          Bu ürün şu an stokta yok
        </div>
      )}

      {/* XP card */}
      <div
        className="relative mb-6 overflow-hidden rounded-[18px] border border-[#E5DFEF] bg-[linear-gradient(180deg,#F2EFF8_0%,#FAF8FD_100%)] p-[18px]"
        aria-label="XP indirimi"
      >
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(156,140,194,0.18),transparent_60%)]"
          aria-hidden
        />
        <header className="relative mb-3.5 flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-[13.5px] font-semibold text-[#3F345E]">
            <span
              className="grid h-6 w-6 place-items-center rounded-md bg-[#9C8CC2] text-[12px] font-bold text-white"
              aria-hidden
            >
              XP
            </span>
            XP ile öde, indirim kazan
          </span>
          <span className="text-[12px] text-[#6A5E8C]">
            Bakiye{' '}
            <b className="font-bold text-[#3F345E] tabular-nums">
              {xpBalance.toLocaleString('tr-TR')}
            </b>{' '}
            XP
          </span>
        </header>

        {/* CP kullanım sınırı bilgi satırı (emerald rozet)
            DEV2_API_READY: false — gerçek limit Dev2 API'sinden gelecek */}
        <div className="relative mb-3.5 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF3EE] px-2.5 py-1 text-[11.5px] font-semibold text-[#3F7561]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6FA58D]" aria-hidden />
            Maksimum CP kullanım oranınız: %{cpUsageLimit}
          </span>
          <Link
            href="/profile"
            className="text-[11.5px] font-medium text-[#5A4C7E] underline-offset-[3px] hover:text-[#3F345E] hover:underline"
          >
            Sınırı değiştir
          </Link>
        </div>
        <p className="relative mb-3 text-[12px] text-[#6A5E8C]">
          Bu ürün için en fazla{' '}
          <b className="font-semibold tabular-nums text-[#3F345E]">
            {maxXpFromLimit.toLocaleString('tr-TR')}
          </b>{' '}
          CP kullanabilirsiniz.
        </p>

        <div className="relative flex items-center gap-4">
          <div className="flex-1">
            <div className="mb-2 flex justify-between font-mono text-[11px] tracking-[0.02em] text-[#7A6FA0]">
              <span>0 XP</span>
              <span>{maxXpUsable.toLocaleString('tr-TR')} XP</span>
            </div>
            <input
              type="range"
              min={0}
              max={maxXpUsable}
              value={xpAmount}
              onChange={(e) => setXpAmount(Number(e.target.value))}
              disabled={maxXpUsable === 0}
              aria-label="Kullanılacak XP miktarı"
              className="xp-slider h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#E5DEF0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9C8CC2] disabled:opacity-50"
              style={{
                background: `linear-gradient(to right, #9C8CC2 0%, #9C8CC2 ${sliderPct}%, #E5DEF0 ${sliderPct}%, #E5DEF0 100%)`,
              }}
            />
            <div className="mt-2.5 flex items-center justify-between text-[12px] text-[#5A4C7E]">
              <span>
                <span className="font-mono tabular-nums">{xpAmount.toLocaleString('tr-TR')}</span>{' '}
                XP kullanılacak
              </span>
              <span className="font-semibold">
                −<span className="font-mono tabular-nums">{fmtTL(xpDiscountKurus)}</span> ₺
              </span>
            </div>
          </div>

          <div className="min-w-[120px] text-right">
            <div className="font-mono text-[11.5px] text-[#7A6FA0]">İndirimli</div>
            <div
              className="mt-0.5 text-[26px] font-medium leading-none -tracking-[0.01em] text-[#3F345E] tabular-nums"
              style={{ fontFamily: 'Fraunces, Georgia, serif' }}
            >
              ₺{fmtTL(finalKurus)}
            </div>
          </div>
        </div>

        <div className="relative mt-3.5 flex items-center justify-between border-t border-dashed border-[#D9D0EA] pt-3.5 text-[12px] text-[#5A4C7E]">
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            {/* DEV2_API_READY: false — kazanılacak XP mock; gerçek değer Dev2 servisinden */}
            Bu siparişten <b className="ml-0.5 font-semibold tabular-nums">+{earnXp}</b> XP kazan
          </span>
          {xpAmount > 0 && (
            <button
              type="button"
              onClick={() => setXpAmount(0)}
              className="font-medium text-[#5A4C7E] underline underline-offset-[3px] hover:text-[#3F345E]"
            >
              Sıfırla
            </button>
          )}
        </div>
      </div>

      {/* Quantity + Add to cart */}
      <div className="mb-2.5 grid grid-cols-[auto_1fr] gap-2.5">
        <div className="flex h-[54px] items-center gap-1 rounded-[14px] border border-[#ECE8E1] bg-white px-1.5">
          <button
            type="button"
            onClick={() => setQuantity(Math.max(1, quantity - 1))}
            disabled={quantity <= 1 || outOfStock}
            aria-label="Adeti azalt"
            className="grid h-9 w-9 place-items-center rounded-[10px] text-[#6B6B66] transition-colors hover:bg-[#F7F2EC] hover:text-[#2A2A2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C7B299] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span
            className="grid w-9 place-items-center font-semibold text-[#2A2A2A] tabular-nums"
            aria-label={`Adet: ${quantity}`}
          >
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
            disabled={quantity >= product.stock || outOfStock}
            aria-label="Adeti artır"
            className="grid h-9 w-9 place-items-center rounded-[10px] text-[#6B6B66] transition-colors hover:bg-[#F7F2EC] hover:text-[#2A2A2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C7B299] disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={onAddToCart}
          disabled={busy || outOfStock}
          className="inline-flex h-[54px] items-center justify-center gap-2.5 rounded-[14px] bg-[#C7B299] px-6 text-[14.5px] font-semibold tracking-[-0.005em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_4px_14px_-4px_rgba(140,110,80,0.4)] transition-all hover:-translate-y-px hover:bg-[#B39375] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_8px_20px_-4px_rgba(140,110,80,0.45)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C7B299] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFAF7] disabled:cursor-not-allowed disabled:bg-[#ECE8E1] disabled:text-[#9A9A93] disabled:shadow-none"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <ShoppingBag className="h-[18px] w-[18px]" />
              Sepete Ekle
              <span className="text-white/90 tabular-nums">· ₺{fmtTL(finalKurus)}</span>
            </>
          )}
        </button>
      </div>

      {/* Buy now + favorite */}
      <div className="mb-5 flex gap-2.5">
        <button
          type="button"
          onClick={onBuyNow}
          disabled={busy || outOfStock}
          className="inline-flex h-[50px] flex-1 items-center justify-center gap-2.5 rounded-[14px] bg-[#2A2A2A] text-[14px] font-semibold text-white transition-colors hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C7B299] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFAF7] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Zap className="h-4 w-4" />
          Hemen Al
        </button>
        <button
          type="button"
          onClick={toggleFav}
          aria-label={isFav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          aria-pressed={isFav}
          className={cn(
            'grid h-[50px] w-[50px] place-items-center rounded-[14px] border border-[#ECE8E1] bg-white text-[#6B6B66] transition-colors hover:border-[#E1DCD2] hover:text-[#8A6E51] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C7B299]',
            isFav && 'text-[#C76A60]',
          )}
        >
          <Heart className={cn('h-[18px] w-[18px]', isFav && 'fill-[#C76A60]')} strokeWidth={1.8} />
        </button>
      </div>

      {/* Trust */}
      <div className="grid grid-cols-3 gap-2.5 border-t border-[#ECE8E1] pt-[18px]">
        <TrustItem
          icon={<Truck className="h-4 w-4" />}
          title="Ücretsiz kargo"
          desc="₺1.500 üzeri siparişlerde"
        />
        <TrustItem
          icon={<RotateCcw className="h-4 w-4" />}
          title="14 gün iade"
          desc="Koşulsuz iade hakkı"
        />
        <TrustItem
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Güvenli ödeme"
          desc="3D Secure & SSL"
        />
      </div>
    </aside>
  );
}

function TrustItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-2">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px] bg-[#F7F2EC] text-[#8A6E51]"
        aria-hidden
      >
        {icon}
      </span>
      <span className="block text-[12px] leading-snug">
        <b className="block text-[12.5px] font-semibold text-[#2A2A2A]">{title}</b>
        <span className="text-[#9A9A93]">{desc}</span>
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Tabs
 * ────────────────────────────────────────────────────────────────────────── */
type TabKey = 'description' | 'specs' | 'reviews';

function TabsSection({ product }: { product: Product }) {
  const [tab, setTab] = useState<TabKey>('description');
  const { rating, reviewCount, breakdown } = deriveProductMock(product);
  const specs = useMemo(() => deriveSpecs(product), [product]);

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'description', label: 'Açıklama' },
    { key: 'specs', label: 'Özellikler', count: specs.length },
    { key: 'reviews', label: 'Değerlendirmeler', count: reviewCount },
  ];

  return (
    <section className="mt-24" aria-label="Ürün ayrıntıları">
      <div role="tablist" className="mb-9 flex flex-wrap gap-8 border-b border-[#ECE8E1]">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(t.key)}
              className={cn(
                'relative -mb-px pb-4 text-[14.5px] font-medium tracking-[-0.005em] transition-colors focus:outline-none focus-visible:text-[#2A2A2A]',
                active ? 'text-[#2A2A2A]' : 'text-[#9A9A93] hover:text-[#6B6B66]',
              )}
            >
              {t.label}
              {t.count != null && (
                <span
                  className={cn(
                    'ml-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                    active ? 'bg-[#EBE3D6] text-[#8A6E51]' : 'bg-[#F7F2EC] text-[#9A9A93]',
                  )}
                >
                  {t.count.toLocaleString('tr-TR')}
                </span>
              )}
              {active && (
                <span
                  className="absolute inset-x-0 -bottom-px h-0.5 rounded-t-sm bg-[#2A2A2A]"
                  aria-hidden
                />
              )}
            </button>
          );
        })}
      </div>

      {tab === 'description' && <DescriptionTab product={product} />}
      {tab === 'specs' && <SpecsTab specs={specs} />}
      {tab === 'reviews' && (
        <ReviewsTab rating={rating} reviewCount={reviewCount} breakdown={breakdown} />
      )}
    </section>
  );
}

function DescriptionTab({ product }: { product: Product }) {
  const lede =
    product.description?.split('\n').filter(Boolean)[0] ??
    'Sade ve modern tasarımıyla günlük kullanıma uygun, kaliteli malzemelerden üretilmiş bir parça.';
  const rest =
    product.description?.split('\n').filter(Boolean).slice(1).join('\n\n') ??
    'Detaylarına özen gösterilmiş, dayanıklı ve şık bir ürün. Mevsim fark etmeksizin uzun yıllar yanınızda olur. Gardırobunuza, masanıza ya da yaşam alanınıza zarif bir dokunuş katar.';

  const highlights = [
    'Doğal tonlar — herhangi bir paletle uyumlu çalışır',
    'Dikkatli işçilik — küçük detaylar büyük fark yaratır',
    'Sürdürülebilir tedarik — düşük çevresel iz',
    'Premium ambalaj — hediye olarak ideal',
  ];

  return (
    <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
      <div>
        <p
          className="mb-6 text-[22px] font-normal leading-snug -tracking-[0.01em] text-[#2A2A2A]"
          style={{ fontFamily: 'Fraunces, Georgia, serif' }}
        >
          {lede}
        </p>
        <div className="space-y-3.5 text-[14.5px] leading-relaxed text-[#6B6B66]">
          {rest.split('\n\n').map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
      </div>
      <aside className="rounded-[18px] border border-[#ECE8E1] bg-[#F7F2EC] p-6">
        <h4 className="mb-3.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8A6E51]">
          Öne çıkan özellikler
        </h4>
        <ul className="flex flex-col gap-3">
          {highlights.map((h) => (
            <li key={h} className="flex items-start gap-2.5 text-[13.5px] text-[#2A2A2A]">
              <CheckCircle2
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8A6E51]"
                strokeWidth={2}
                aria-hidden
              />
              {h}
            </li>
          ))}
        </ul>
      </aside>
    </div>
  );
}

function SpecsTab({ specs }: { specs: { k: string; v: string }[] }) {
  return (
    <div className="grid max-w-[900px] grid-cols-1 gap-x-16 sm:grid-cols-2">
      {specs.map(({ k, v }) => (
        <div
          key={k}
          className="flex items-center justify-between gap-5 border-b border-[#ECE8E1] py-3.5 text-[13.5px]"
        >
          <span className="text-[#9A9A93]">{k}</span>
          <span className="text-right font-medium text-[#2A2A2A]">{v}</span>
        </div>
      ))}
    </div>
  );
}

function ReviewsTab({
  rating,
  reviewCount,
  breakdown,
}: {
  rating: number;
  reviewCount: number;
  breakdown: number[];
}) {
  return (
    <div>
      <div className="mb-8 grid grid-cols-1 items-start gap-12 border-b border-[#ECE8E1] pb-8 lg:grid-cols-[240px_1fr]">
        <div className="text-center">
          <div
            className="text-[64px] font-medium leading-none -tracking-[0.03em] text-[#2A2A2A]"
            style={{ fontFamily: 'Fraunces, Georgia, serif' }}
          >
            {rating.toFixed(1)}
          </div>
          <div className="mt-2 flex justify-center">
            <StarRow value={rating} size={18} />
          </div>
          <div className="mt-1.5 text-[12.5px] text-[#9A9A93]">
            <span className="tabular-nums">{reviewCount.toLocaleString('tr-TR')}</span>{' '}
            değerlendirme · DEV2_API_READY: false
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {breakdown.map((cnt, i) => {
            const stars = 5 - i;
            const pct = reviewCount ? (cnt / reviewCount) * 100 : 0;
            return (
              <div
                key={stars}
                className="grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3.5 text-[12.5px] text-[#6B6B66]"
              >
                <span className="inline-flex items-center gap-1">
                  {stars}
                  <Star className="h-3 w-3" style={{ color: '#8A6E51', fill: '#8A6E51' }} />
                </span>
                <div className="h-1.5 overflow-hidden rounded-full bg-[#ECE8E1]">
                  <div
                    className="h-full rounded-full bg-[#C7B299] transition-[width] duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-right text-[#9A9A93] tabular-nums">{cnt}</span>
              </div>
            );
          })}
        </div>
      </div>

      <ul className="flex flex-col gap-6">
        {MOCK_REVIEWS.map((r) => (
          <li key={r.id} className="grid grid-cols-[48px_minmax(0,1fr)] gap-4">
            <div
              className="grid h-12 w-12 place-items-center rounded-full bg-[#F7F2EC] text-[15px] font-semibold text-[#8A6E51]"
              aria-hidden
            >
              {r.initials}
            </div>
            <div>
              <header className="mb-1.5 flex flex-wrap items-center gap-2.5">
                <span className="text-[14px] font-semibold text-[#2A2A2A]">{r.name}</span>
                <StarRow value={r.rating} size={12} />
                <span className="text-[12px] text-[#9A9A93]">{r.date}</span>
                {r.verified && (
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-medium text-[#6E8E6E]">
                    <CheckCircle2 className="h-3 w-3" /> Doğrulanmış alıcı
                  </span>
                )}
              </header>
              <p className="text-[13.5px] leading-relaxed text-[#6B6B66]">{r.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Sayfa
 * ────────────────────────────────────────────────────────────────────────── */
function ProductDetailContent() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { balances } = useBalances();
  const fetchCart = useCartStore((s) => s.fetchCart);

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [xpAmount, setXpAmount] = useState(0);
  const [adding, setAdding] = useState(false);
  const [isFav, setIsFav] = useState(false);

  // CP kullanım sınırı (kullanıcı /profile'da kaydeder, default %7)
  // DEV2_API_READY: false — gerçek limit Dev2 API'sinden gelecek
  const [cpUsageLimit, setCpUsageLimit] = useState<number>(7);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('cp_usage_limit');
    const parsed = stored ? parseInt(stored, 10) : NaN;
    if (!Number.isNaN(parsed) && parsed >= 7 && parsed <= 15) {
      setCpUsageLimit(parsed);
    }
  }, []);

  // Ürünü çek
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    api
      .get<Product>(`/products/${id}`)
      .then((res) => {
        if (cancelled) return;
        setProduct(res.data);
        setActiveImage(0);
        setQuantity(1);
        setXpAmount(0);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error('Ürün bulunamadı');
        router.push('/products');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  // 4 thumbnail slot — eksikse null (UI placeholder gradient gösterir)
  const slots = useMemo<(string | null)[]>(() => {
    if (!product) return [null, null, null, null];
    const imgs = product.images ?? [];
    const out: (string | null)[] = [];
    for (let i = 0; i < 4; i++) {
      out.push(resolveImageUrl(imgs[i]) ?? null);
    }
    return out;
  }, [product]);

  // XP — DEV2_API_READY: false — useBalances mock'undan
  const xpBalance = balances?.xp ?? 0;
  const lineTotal = product ? product.priceFiat * quantity : 0;
  // CP kullanım sınırı: ürün toplamının %X'i kadar XP kullanılabilir
  // DEV2_API_READY: false — gerçek limit Dev2 API'sinden gelecek
  const maxXpFromLimit = useMemo(() => {
    if (lineTotal <= 0) return 0;
    return Math.floor((lineTotal * cpUsageLimit) / 100 / XP_TO_KURUS);
  }, [lineTotal, cpUsageLimit]);
  const maxXpUsable = useMemo(() => {
    if (lineTotal <= 0) return 0;
    return Math.min(xpBalance, Math.floor(lineTotal / XP_TO_KURUS), maxXpFromLimit);
  }, [xpBalance, lineTotal, maxXpFromLimit]);

  // Sepet/adet değişince XP miktarını sınır içinde tut
  useEffect(() => {
    if (xpAmount > maxXpUsable) setXpAmount(maxXpUsable);
  }, [maxXpUsable, xpAmount]);

  /* ───────── handlers ───────── */
  const ensureAuth = () => {
    if (!isAuthenticated) {
      toast.error('Sepete eklemek için giriş yap');
      router.push(`/login?next=/products/${id}`);
      return false;
    }
    return true;
  };

  const handleAddToCart = async () => {
    if (!product || !ensureAuth()) return;
    setAdding(true);
    try {
      await api.post('/cart/items', { productId: product.id, quantity });
      await fetchCart();
      toast.success(`${product.name} sepete eklendi`, {
        description: `${quantity} adet · ₺${fmtTLDecimal(lineTotal)}`,
      });
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Sepete eklenemedi'));
    } finally {
      setAdding(false);
    }
  };

  const handleBuyNow = async () => {
    if (!product || !ensureAuth()) return;
    setAdding(true);
    try {
      await api.post('/cart/items', { productId: product.id, quantity });
      await fetchCart();
      router.push('/cart');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Sepete eklenemedi'));
    } finally {
      setAdding(false);
    }
  };

  /* ───────── Loading ───────── */
  if (loading || !product) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] font-sans text-[#2A2A2A] antialiased">
        <main className="mx-auto max-w-[1280px] px-6 pb-20 pt-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[64px_minmax(0,1fr)_400px] lg:gap-x-14">
            <div className="order-2 hidden lg:order-1 lg:block">
              <div className="flex flex-col gap-2.5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 w-16 animate-pulse rounded-[14px] bg-[#ECE8E1]" />
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <div className="aspect-square w-full animate-pulse rounded-[24px] bg-[#ECE8E1]" />
            </div>
            <aside className="order-3 space-y-4">
              <div className="h-3 w-1/2 animate-pulse rounded bg-[#ECE8E1]" />
              <div className="h-6 w-1/3 animate-pulse rounded bg-[#ECE8E1]" />
              <div className="h-10 w-3/4 animate-pulse rounded bg-[#ECE8E1]" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-[#ECE8E1]" />
              <div className="h-10 w-1/3 animate-pulse rounded bg-[#ECE8E1]" />
              <div className="h-32 w-full animate-pulse rounded-[18px] bg-[#ECE8E1]" />
              <div className="h-[54px] w-full animate-pulse rounded-[14px] bg-[#ECE8E1]" />
              <div className="h-[50px] w-full animate-pulse rounded-[14px] bg-[#ECE8E1]" />
            </aside>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-sans text-[#2A2A2A] antialiased">
      <main className="mx-auto max-w-[1280px] px-6 pb-20 pt-6 lg:px-8">
        {/* Hero */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[64px_minmax(0,1fr)_400px] lg:items-start lg:gap-x-14">
          <Gallery
            product={product}
            active={activeImage}
            setActive={setActiveImage}
            slots={slots}
          />
          <InfoPanel
            product={product}
            quantity={quantity}
            setQuantity={setQuantity}
            xpAmount={xpAmount}
            setXpAmount={setXpAmount}
            xpBalance={xpBalance}
            maxXpUsable={maxXpUsable}
            cpUsageLimit={cpUsageLimit}
            maxXpFromLimit={maxXpFromLimit}
            onAddToCart={handleAddToCart}
            onBuyNow={handleBuyNow}
            busy={adding}
            isFav={isFav}
            toggleFav={() => setIsFav((v) => !v)}
          />
        </div>

        {/* Tabs */}
        <TabsSection product={product} />
      </main>

      {/* XP slider thumb (Soft Sand panelinde lavender thumb) */}
      <style jsx global>{`
        input.xp-slider {
          height: 6px;
          border-radius: 999px;
        }
        input.xp-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #9c8cc2;
          border: 3px solid #ffffff;
          box-shadow: 0 2px 6px rgba(80, 60, 140, 0.25);
          cursor: pointer;
          transition: transform 0.12s ease;
        }
        input.xp-slider::-webkit-slider-thumb:hover {
          transform: scale(1.08);
        }
        input.xp-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #9c8cc2;
          border: 3px solid #ffffff;
          box-shadow: 0 2px 6px rgba(80, 60, 140, 0.25);
          cursor: pointer;
        }
        input.xp-slider:disabled::-webkit-slider-thumb {
          background: #c8c2d6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export default function ProductDetailPage() {
  return <ProductDetailContent />;
}

'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Loader2,
  Search as SearchIcon,
  ShoppingCart,
  Star,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
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
  category?: { id: string; name: string; slug: string };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductListResponse {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Sabitler
 * ────────────────────────────────────────────────────────────────────────── */
const PER_PAGE = 12;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const SORTS = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'price_asc', label: 'Fiyat: Artan' },
  { value: 'price_desc', label: 'Fiyat: Azalan' },
  { value: 'name', label: 'İsim (A–Z)' },
];

const PRICE_BUCKETS: { label: string; min: number; max: number | '' }[] = [
  { label: '₺0 – ₺250', min: 0, max: 250 },
  { label: '₺250 – ₺750', min: 250, max: 750 },
  { label: '₺750 – ₺1.500', min: 750, max: 1500 },
  { label: '₺1.500 – ₺3.000', min: 1500, max: 3000 },
  { label: '₺3.000+', min: 3000, max: '' },
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

/**
 * Ürün için deterministik mock veriler (rating, XP indirim oranı, eski fiyat).
 * DEV2_API_READY: false — gerçek değerler:
 *   - rating: ürün incelemelerinden hesaplanacak (backend henüz yok)
 *   - xpPercent: Dev2'nin /xp/preview-discount endpoint'inden gelecek
 *   - oldPrice: ürün modeli `originalPriceFiat` alanı eklendiğinde
 */
function deriveProductMock(p: Product) {
  const h = hashStr(p.id);
  const xpPercent = 4 + (h % 19); // 4..22
  const rating = 4 + ((h >> 4) % 10) / 10; // 4.0..4.9
  const hasOldPrice = (h >> 8) % 5 < 2; // ~%40 ürün
  const oldPriceFiat = hasOldPrice
    ? Math.round(p.priceFiat * (1 + 0.1 + ((h >> 12) % 12) / 100)) // %10–22 daha pahalı
    : null;
  return { xpPercent, rating, oldPriceFiat };
}

/**
 * Ürün id'sine göre placeholder görsel arka planı (gradient).
 * Görsel olmadığında ve next/image error fallback'i için kullanılır.
 */
function placeholderGradient(id: string) {
  const palettes: [string, string][] = [
    ['#EFE3D8', '#E4D2C0'],
    ['#E4E2DE', '#D8D5CF'],
    ['#E8E5DA', '#D9D3C2'],
    ['#DEE6E1', '#C8D6CD'],
    ['#EAE2EE', '#D8CCDF'],
    ['#F3E2DC', '#E9CEC2'],
  ];
  const [a, b] = palettes[hashStr(id) % palettes.length];
  return `linear-gradient(155deg, ${a} 0%, ${b} 100%)`;
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Breadcrumb
 * ────────────────────────────────────────────────────────────────────────── */
function Breadcrumb({ category }: { category?: Category | null }) {
  return (
    <nav aria-label="Konum" className="text-[12px] tracking-[0.02em] text-[#A8A29A]">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="hover:text-[#2A2A2A]">
            Anasayfa
          </Link>
        </li>
        <li aria-hidden>/</li>
        <li className={cn(category ? 'hover:text-[#2A2A2A]' : 'text-[#7A746B]')}>
          {category ? (
            <Link href="/products" className="hover:text-[#2A2A2A]">
              Ürünler
            </Link>
          ) : (
            <span>Ürünler</span>
          )}
        </li>
        {category && (
          <>
            <li aria-hidden>/</li>
            <li className="text-[#7A746B]">{category.name}</li>
          </>
        )}
      </ol>
    </nav>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Filter bar
 * ────────────────────────────────────────────────────────────────────────── */
function FilterBar({
  searchInput,
  setSearchInput,
  onSearchSubmit,
  categoryId,
  setCategoryId,
  categories,
  sort,
  setSort,
  minPrice,
  maxPrice,
  setPriceRange,
}: {
  searchInput: string;
  setSearchInput: (s: string) => void;
  onSearchSubmit: () => void;
  categoryId: string;
  setCategoryId: (id: string) => void;
  categories: Category[];
  sort: string;
  setSort: (s: string) => void;
  minPrice: string;
  maxPrice: string;
  setPriceRange: (min: string, max: string) => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearchSubmit();
      }}
      className="grid grid-cols-1 gap-2.5 md:grid-cols-[minmax(0,1fr)_auto_auto_auto] md:items-stretch"
    >
      <div className="relative rounded-[12px] border border-[#ECE8E1] bg-white transition-all focus-within:border-[#D6A99D] focus-within:shadow-[0_0_0_4px_rgba(214,169,157,0.18)]">
        <SearchIcon
          className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7A746B]"
          aria-hidden
        />
        <input
          type="search"
          placeholder="Ürün, marka veya kategori ara…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          aria-label="Ürün arama"
          className="h-12 w-full rounded-[12px] bg-transparent pl-11 pr-16 text-[14.5px] text-[#2A2A2A] placeholder:text-[#A8A29A] focus:outline-none"
        />
        <kbd className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-md border border-[#ECE8E1] bg-[#FAFAF7] px-1.5 py-0.5 font-mono text-[11px] text-[#7A746B] sm:inline">
          ⌘K
        </kbd>
      </div>

      <FilterControl label="Kategori">
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          aria-label="Kategori filtresi"
          className="h-full w-full bg-transparent pr-6 text-[13.5px] font-medium text-[#2A2A2A] focus:outline-none"
        >
          <option value="">Tümü</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </FilterControl>

      <FilterControl label="Fiyat ₺" tight>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="min"
          value={minPrice}
          onChange={(e) => setPriceRange(e.target.value, maxPrice)}
          aria-label="Minimum fiyat"
          className="h-7 w-[68px] rounded-md border border-[#ECE8E1] bg-[#FAFAF7] px-2 text-right font-mono text-[13px] text-[#2A2A2A] focus:border-[#D6A99D] focus:outline-none"
        />
        <span className="text-[#A8A29A]">—</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="max"
          value={maxPrice}
          onChange={(e) => setPriceRange(minPrice, e.target.value)}
          aria-label="Maksimum fiyat"
          className="h-7 w-[68px] rounded-md border border-[#ECE8E1] bg-[#FAFAF7] px-2 text-right font-mono text-[13px] text-[#2A2A2A] focus:border-[#D6A99D] focus:outline-none"
        />
      </FilterControl>

      <FilterControl label="Sırala">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sıralama"
          className="h-full w-full bg-transparent pr-6 text-[13.5px] font-medium text-[#2A2A2A] focus:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </FilterControl>
    </form>
  );
}

function FilterControl({
  label,
  children,
  tight,
}: {
  label: string;
  children: React.ReactNode;
  tight?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex h-12 items-center gap-2.5 whitespace-nowrap rounded-[12px] border border-[#ECE8E1] bg-white text-[#2A2A2A] transition-colors hover:border-[#DDD7CC] focus-within:border-[#D6A99D]',
        tight ? 'px-3' : 'px-3.5',
      )}
    >
      <span className="text-[11.5px] uppercase tracking-[0.08em] text-[#7A746B]">{label}</span>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Active pills
 * ────────────────────────────────────────────────────────────────────────── */
type ActivePill = { key: string; label: string; clear: () => void };

function ActivePills({ pills, onClearAll }: { pills: ActivePill[]; onClearAll: () => void }) {
  if (pills.length === 0) return null;
  return (
    <div className="mt-3.5 flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[12px] uppercase tracking-[0.04em] text-[#7A746B]">
        Aktif filtreler
      </span>
      {pills.map((p) => (
        <span
          key={p.key}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#F8ECE8] py-1.5 pl-3 pr-1.5 text-[12.5px] text-[#6E433A]"
        >
          {p.label}
          <button
            type="button"
            onClick={p.clear}
            aria-label={`${p.label} filtresini kaldır`}
            className="grid h-[18px] w-[18px] place-items-center rounded-full text-[#6E433A] hover:bg-[#6E433A]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A99D]"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="ml-1 text-[12.5px] text-[#7A746B] underline underline-offset-[3px] hover:text-[#2A2A2A]"
      >
        Tümünü temizle
      </button>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Sidebar
 * ────────────────────────────────────────────────────────────────────────── */
function Sidebar({
  categories,
  categoryId,
  onCategoryChange,
  minPrice,
  maxPrice,
  onPriceBucket,
}: {
  categories: Category[];
  categoryId: string;
  onCategoryChange: (id: string) => void;
  minPrice: string;
  maxPrice: string;
  onPriceBucket: (min: string, max: string) => void;
}) {
  return (
    <aside className="lg:sticky lg:top-20" aria-label="Kategori ve filtre kenar çubuğu">
      <SideSection title="Kategoriler">
        <ul className="flex flex-col gap-0.5">
          <SideItem active={categoryId === ''} onClick={() => onCategoryChange('')} label="Tümü" />
          {categories.map((c) => (
            <SideItem
              key={c.id}
              active={categoryId === c.id}
              onClick={() => onCategoryChange(c.id)}
              label={c.name}
            />
          ))}
        </ul>
      </SideSection>

      <SideSection title="Fiyat Aralığı">
        <ul className="flex flex-col gap-0.5">
          {PRICE_BUCKETS.map((b, i) => {
            const active = String(b.min) === minPrice && String(b.max) === maxPrice;
            return (
              <SideItem
                key={i}
                active={active}
                onClick={() => onPriceBucket(String(b.min), String(b.max))}
                label={b.label}
              />
            );
          })}
        </ul>
      </SideSection>

      {/* XP promo card — DEV2_API_READY: false (XP bakiye/level mock görsel) */}
      <div className="relative overflow-hidden rounded-[14px] border border-[#ECE8E1] bg-[linear-gradient(155deg,#EFEBF7_0%,#F8ECE8_100%)] p-4">
        <div
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[#9C8CC2]/20 blur-2xl"
          aria-hidden
        />
        <p className="mb-1.5 font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#9C8CC2]">
          XP Hazine
        </p>
        <p className="mb-1 text-sm font-semibold tracking-tight text-[#2A2A2A]">
          Bir sonraki seviyeye 360 XP
        </p>
        <p className="text-[12.5px] leading-relaxed text-[#7A746B]">
          Lv 15 ile %18'e kadar XP indirimi açılır.
        </p>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]/[0.06]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#9C8CC2] to-[#D6A99D]"
            style={{ width: '64%' }}
          />
        </div>
        <div className="mt-2 flex justify-between font-mono text-[11px] text-[#7A746B]">
          <span>
            <b className="font-medium text-[#2A2A2A]">Lv 14</b>
          </span>
          <span>2840 / 3200 XP</span>
        </div>
      </div>
    </aside>
  );
}

function SideSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h4 className="mb-2.5 pl-3 text-[11.5px] uppercase tracking-[0.1em] text-[#7A746B]">
        {title}
      </h4>
      {children}
    </section>
  );
}

function SideItem({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-[9px] px-3 py-2 text-left text-[13.5px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A99D]',
          active
            ? 'bg-[#F8ECE8] font-medium text-[#6E433A]'
            : 'text-[#2A2A2A] hover:bg-black/[0.025]',
        )}
        aria-pressed={active}
      >
        <span className="flex items-center">
          <span
            className={cn(
              'mr-2 h-1.5 w-1.5 rounded-full bg-[#D6A99D] transition-opacity',
              active ? 'opacity-100' : 'opacity-0',
            )}
            aria-hidden
          />
          {label}
        </span>
      </button>
    </li>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Product card
 * ────────────────────────────────────────────────────────────────────────── */
function ProductCard({
  product,
  onAdd,
  busy,
  qtyInCart,
  wished,
  onWishToggle,
}: {
  product: Product;
  onAdd: () => void;
  busy: boolean;
  qtyInCart: number;
  wished: boolean;
  onWishToggle: () => void;
}) {
  const { xpPercent, rating, oldPriceFiat } = deriveProductMock(product);
  const lowStock = product.stock > 0 && product.stock <= 5;
  const outOfStock = product.stock <= 0;
  const cover = resolveImageUrl(product.images?.[0]);
  const xpDiscountKurus = Math.round(product.priceFiat * (xpPercent / 100));
  const xpDiscountedPriceKurus = product.priceFiat - xpDiscountKurus;
  const inCart = qtyInCart > 0;

  const [imgFailed, setImgFailed] = useState(false);

  return (
    <article className="group flex flex-col overflow-hidden rounded-[14px] border border-[#ECE8E1] bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[#DDD7CC] hover:shadow-[0_14px_28px_-10px_rgba(42,42,42,0.10),0_4px_8px_-2px_rgba(42,42,42,0.04)]">
      {/* Media + tags + wish */}
      <div className="relative h-[220px] overflow-hidden">
        <Link
          href={`/products/${product.id}`}
          className="absolute inset-0 z-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#D6A99D]"
          aria-label={product.name}
        >
          <span
            className="absolute inset-0"
            style={{ background: placeholderGradient(product.id) }}
            aria-hidden
          />
          {cover && !imgFailed && (
            <Image
              src={cover}
              alt=""
              fill
              sizes="(min-width: 1280px) 280px, (min-width: 768px) 33vw, 50vw"
              unoptimized
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              onError={() => setImgFailed(true)}
            />
          )}
          {!cover && (
            <span className="pointer-events-none absolute bottom-3.5 left-1/2 -translate-x-1/2 rounded-full bg-white/70 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[#2A2A2A]/55 backdrop-blur-sm">
              {product.category?.name ?? 'Ürün'}
            </span>
          )}
        </Link>

        {/* Tags */}
        <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
          {product.category && (
            <span className="rounded-full border border-[#2A2A2A]/[0.06] bg-white/90 px-2.5 py-1 text-[11px] tracking-[0.01em] text-[#2A2A2A] backdrop-blur-sm">
              {product.category.name}
            </span>
          )}
          {/* DEV2_API_READY: false — XP indirim oranı mock; gerçek oran Dev2'nin /xp/preview-discount endpoint'inden gelecek */}
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[#9C8CC2] px-2.5 py-1 text-[10.5px] font-semibold tracking-[0.02em] text-white shadow-[0_2px_6px_rgba(156,140,194,0.35)]">
            <span className="h-1 w-1 rounded-full bg-white" aria-hidden />%{xpPercent} XP İndirim
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            onWishToggle();
          }}
          aria-label={wished ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          aria-pressed={wished}
          className={cn(
            'absolute bottom-3 right-3 z-10 grid h-8 w-8 place-items-center rounded-full border border-[#2A2A2A]/[0.04] bg-white/90 text-[#7A746B] backdrop-blur-sm transition-all hover:scale-105 hover:text-[#C58C80] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A99D]',
            wished && 'text-[#C58C80]',
          )}
        >
          <Heart className={cn('h-3.5 w-3.5', wished && 'fill-[#C58C80]')} strokeWidth={1.8} />
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-4 pt-3.5">
        <Link
          href={`/products/${product.id}`}
          className="line-clamp-2 text-[14.5px] font-semibold leading-snug -tracking-[0.005em] text-[#2A2A2A] hover:text-[#C58C80]"
        >
          {product.name}
        </Link>

        <div className="flex items-center gap-2 text-[11.5px] text-[#7A746B]">
          <span className="inline-flex items-center gap-1">
            {/* DEV2_API_READY: false — rating mock; gerçek değer ürün incelemelerinden hesaplanacak */}
            <Star
              className="h-2.5 w-2.5"
              style={{ color: '#D6A99D', fill: '#D6A99D' }}
              aria-hidden
            />
            <span className="text-[12px] font-semibold text-[#2A2A2A] tabular-nums">
              {rating.toFixed(1)}
            </span>
          </span>
          <span className="text-[#A8A29A]" aria-hidden>
            ·
          </span>
          <span>
            {outOfStock ? (
              <span className="text-[#C97A75]">Stokta yok</span>
            ) : lowStock ? (
              <span className="text-[#C97A75]">
                Son <span className="font-medium tabular-nums">{product.stock}</span> adet
              </span>
            ) : (
              <>
                <span className="font-medium tabular-nums">{product.stock}</span>+ stokta
              </>
            )}
          </span>
        </div>

        <p className="mt-1 inline-flex items-center gap-1.5 font-mono text-[10.5px] text-[#9C8CC2]">
          XP ile <b className="font-semibold text-[#5E4F8C]">−%{xpPercent}</b>
          <span className="text-[#A8A29A]" aria-hidden>
            ·
          </span>
          <span className="tabular-nums">
            {fmtTL(xpDiscountedPriceKurus)}
            <span className="ml-px text-[#9C8CC2]">₺</span>
          </span>
        </p>

        <div className="mt-2 flex items-baseline justify-between gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[19px] font-semibold -tracking-[0.015em] text-[#2A2A2A]">
              <span className="mr-px text-[#C58C80]">₺</span>
              <span className="tabular-nums">{fmtTL(product.priceFiat)}</span>
            </span>
            {oldPriceFiat && (
              <span className="text-[12px] font-normal text-[#A8A29A] line-through tabular-nums">
                ₺{fmtTL(oldPriceFiat)}
              </span>
            )}
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px]',
              outOfStock
                ? 'bg-[#F1ECE2] text-[#7A746B]'
                : lowStock
                  ? 'bg-[#F7E9E8] text-[#8A413E]'
                  : 'bg-[#EAF2EC] text-[#3B6E4B]',
            )}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: 'currentColor' }}
              aria-hidden
            />
            {outOfStock ? 'Yok' : lowStock ? `Son ${product.stock}` : 'Stokta'}
          </span>
        </div>

        <button
          type="button"
          onClick={onAdd}
          disabled={busy || outOfStock}
          className={cn(
            'mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] border text-[13.5px] font-medium tracking-[0.005em] transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A99D] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60',
            inCart
              ? 'border-[#C58C80] bg-[#C58C80] text-white hover:bg-[#B47A6F]'
              : 'border-[#D6A99D] bg-white text-[#C58C80] hover:bg-[#D6A99D] hover:text-white',
          )}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <ShoppingCart className="h-4 w-4" />
              {inCart ? `Sepette (${qtyInCart})` : outOfStock ? 'Stokta yok' : 'Sepete Ekle'}
            </>
          )}
        </button>
      </div>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Pagination
 * ────────────────────────────────────────────────────────────────────────── */
function PaginationBar({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  const items = useMemo(() => {
    const total = totalPages;
    if (total <= 1) return [];
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const out: (number | '…')[] = [1];
    if (page > 3) out.push('…');
    const start = Math.max(2, page - 1);
    const end = Math.min(total - 1, page + 1);
    for (let i = start; i <= end; i++) out.push(i);
    if (page < total - 2) out.push('…');
    out.push(total);
    return out;
  }, [page, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <nav aria-label="Sayfalama" className="mt-10 flex items-center justify-center gap-1.5">
      <PageBtn
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        ariaLabel="Önceki sayfa"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </PageBtn>
      {items.map((it, i) =>
        it === '…' ? (
          <span key={`e${i}`} className="select-none px-1 text-[#A8A29A]">
            …
          </span>
        ) : (
          <PageBtn
            key={it}
            active={it === page}
            onClick={() => onPageChange(it)}
            ariaLabel={`Sayfa ${it}`}
            ariaCurrent={it === page ? 'page' : undefined}
          >
            {it}
          </PageBtn>
        ),
      )}
      <PageBtn
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={page >= totalPages}
        ariaLabel="Sonraki sayfa"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </PageBtn>
    </nav>
  );
}

function PageBtn({
  children,
  onClick,
  disabled,
  active,
  ariaLabel,
  ariaCurrent,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  ariaLabel?: string;
  ariaCurrent?: 'page' | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
      className={cn(
        'grid h-9 min-w-[36px] place-items-center rounded-[9px] border border-transparent px-2.5 text-[13.5px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A99D]',
        active
          ? 'border-[#D6A99D] bg-[#D6A99D] font-semibold text-white hover:border-[#C58C80] hover:bg-[#C58C80]'
          : 'text-[#2A2A2A] hover:border-[#ECE8E1] hover:bg-white',
        disabled && 'cursor-not-allowed opacity-40 hover:border-transparent hover:bg-transparent',
      )}
    >
      {children}
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Skeleton
 * ────────────────────────────────────────────────────────────────────────── */
function ProductCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col overflow-hidden rounded-[14px] border border-[#ECE8E1] bg-white">
      <div className="h-[220px] bg-[#ECE8E1]" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-3/4 rounded bg-[#ECE8E1]" />
        <div className="h-3 w-1/2 rounded bg-[#ECE8E1]" />
        <div className="mt-3 h-5 w-1/3 rounded bg-[#ECE8E1]" />
        <div className="mt-2 h-10 w-full rounded-[10px] bg-[#ECE8E1]" />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Sayfa içeriği
 * ────────────────────────────────────────────────────────────────────────── */
function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const cartItems = useCartStore((s) => s.items);
  const fetchCart = useCartStore((s) => s.fetchCart);

  const page = Number(searchParams.get('page')) || 1;
  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('category') || '';
  const sort = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  const [searchInput, setSearchInput] = useState(search);
  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [wishlist, setWishlist] = useState<Record<string, true>>({});

  const updateParams = useCallback(
    (updates: Record<string, string | undefined>, opts?: { resetPage?: boolean }) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      if (opts?.resetPage !== false) params.delete('page');
      const qs = params.toString();
      router.push(qs ? `/products?${qs}` : '/products');
    },
    [searchParams, router],
  );

  // Kategori listesi
  useEffect(() => {
    let cancelled = false;
    api
      .get<Category[]>('/categories')
      .then((res) => {
        if (!cancelled) setCategories(res.data);
      })
      .catch(() => {
        /* sessizce göz ardı */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sepet (auth varsa) — sepet adetlerini kart üzerinde göstermek için
  useEffect(() => {
    if (isAuthenticated) fetchCart();
  }, [isAuthenticated, fetchCart]);

  // Ürünleri çek
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: PER_PAGE, sortBy: sort };
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    if (minPrice) params.minPrice = Number(minPrice) * 100; // TL → kuruş
    if (maxPrice) params.maxPrice = Number(maxPrice) * 100;

    api
      .get<ProductListResponse>('/products', { params })
      .then((res) => {
        if (cancelled) return;
        setProducts(res.data.items);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      })
      .catch(() => {
        if (cancelled) return;
        setProducts([]);
        setTotal(0);
        setTotalPages(1);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, search, categoryId, sort, minPrice, maxPrice]);

  const cartQtyByProduct = useMemo(() => {
    const m: Record<string, number> = {};
    cartItems.forEach((it) => {
      m[it.product.id] = (m[it.product.id] ?? 0) + it.quantity;
    });
    return m;
  }, [cartItems]);

  const activeCategory = categories.find((c) => c.id === categoryId) ?? null;

  /* ─────────── Aksiyonlar ─────────── */
  const handleAddToCart = async (product: Product) => {
    if (!isAuthenticated) {
      toast.error('Sepete eklemek için giriş yap');
      router.push('/login?next=/products');
      return;
    }
    setAdding(product.id);
    try {
      await api.post('/cart/items', { productId: product.id, quantity: 1 });
      await fetchCart();
      toast.success(`${product.name} sepete eklendi`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Sepete eklenemedi'));
    } finally {
      setAdding(null);
    }
  };

  const toggleWish = (id: string) => {
    setWishlist((prev) => {
      const next = { ...prev };
      if (next[id]) delete next[id];
      else next[id] = true;
      return next;
    });
  };

  /* ─────────── Active filter pills ─────────── */
  const activePills: ActivePill[] = [];
  if (search)
    activePills.push({
      key: 'q',
      label: `"${search}"`,
      clear: () => updateParams({ search: undefined }),
    });
  if (activeCategory)
    activePills.push({
      key: 'cat',
      label: activeCategory.name,
      clear: () => updateParams({ category: undefined }),
    });
  if (minPrice)
    activePills.push({
      key: 'min',
      label: `Min ₺${Number(minPrice).toLocaleString('tr-TR')}`,
      clear: () => updateParams({ minPrice: undefined }),
    });
  if (maxPrice)
    activePills.push({
      key: 'max',
      label: `Max ₺${Number(maxPrice).toLocaleString('tr-TR')}`,
      clear: () => updateParams({ maxPrice: undefined }),
    });
  if (sort !== 'newest')
    activePills.push({
      key: 'sort',
      label: SORTS.find((s) => s.value === sort)?.label ?? sort,
      clear: () => updateParams({ sort: undefined }),
    });

  const clearAll = () => {
    router.push('/products');
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-sans text-[#2A2A2A] antialiased">
      <div className="mx-auto max-w-[1440px] px-6 pb-16 pt-8 lg:px-8">
        {/* Page intro */}
        <div className="mb-5">
          <Breadcrumb category={activeCategory} />
          <h1 className="mt-2.5 text-[34px] font-medium leading-tight -tracking-[0.02em] text-[#2A2A2A]">
            Ürünler
          </h1>
          <p className="mt-1 text-[14px] text-[#7A746B]">
            Seçkin katalog · Her satın alımda <b className="font-semibold text-[#2A2A2A]">XP</b>{' '}
            kazan, <b className="font-semibold text-[#2A2A2A]">%30'a varan</b> XP indirimi uygula.
          </p>
        </div>

        {/* Filter bar */}
        <div className="mb-3.5">
          <FilterBar
            searchInput={searchInput}
            setSearchInput={setSearchInput}
            onSearchSubmit={() => updateParams({ search: searchInput || undefined })}
            categoryId={categoryId}
            setCategoryId={(id) => updateParams({ category: id || undefined })}
            categories={categories}
            sort={sort}
            setSort={(s) => updateParams({ sort: s === 'newest' ? undefined : s })}
            minPrice={minPrice}
            maxPrice={maxPrice}
            setPriceRange={(min, max) =>
              updateParams({
                minPrice: min || undefined,
                maxPrice: max || undefined,
              })
            }
          />
          <ActivePills pills={activePills} onClearAll={clearAll} />
        </div>

        {/* Layout */}
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[232px_minmax(0,1fr)]">
          <Sidebar
            categories={categories}
            categoryId={categoryId}
            onCategoryChange={(id) => updateParams({ category: id || undefined })}
            minPrice={minPrice}
            maxPrice={maxPrice}
            onPriceBucket={(min, max) => updateParams({ minPrice: min, maxPrice: max })}
          />

          <section aria-label="Ürün listesi">
            <header className="mb-4 flex items-baseline justify-between">
              <p className="text-[13.5px] text-[#7A746B]">
                {loading ? (
                  'Yükleniyor…'
                ) : (
                  <>
                    <b className="font-semibold text-[#2A2A2A]">{total.toLocaleString('tr-TR')}</b>{' '}
                    ürün bulundu
                    {activeCategory && (
                      <span className="text-[#A8A29A]"> · {activeCategory.name}</span>
                    )}
                  </>
                )}
              </p>
              {!loading && total > 0 && (
                <p className="text-[12.5px] text-[#A8A29A]">
                  Sayfa{' '}
                  <span className="font-mono font-medium text-[#2A2A2A] tabular-nums">{page}</span>
                  {' / '}
                  <span className="font-mono tabular-nums">{totalPages}</span>
                </p>
              )}
            </header>

            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-[14px] border border-dashed border-[#DDD7CC] bg-white px-6 py-16 text-center">
                <h3 className="m-0 mb-1.5 text-lg font-medium text-[#2A2A2A]">
                  Bu filtrelere uyan ürün yok
                </h3>
                <p className="text-sm text-[#7A746B]">Filtreleri biraz gevşetmeyi dene.</p>
                <button
                  type="button"
                  onClick={clearAll}
                  className="mt-4 rounded-[10px] bg-[#2A2A2A] px-4 py-2 text-[13px] font-medium text-[#FAFAF7] hover:bg-[#1A1A1A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A99D] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFAF7]"
                >
                  Filtreleri temizle
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {products.map((p) => (
                  <ProductCard
                    key={p.id}
                    product={p}
                    busy={adding === p.id}
                    qtyInCart={cartQtyByProduct[p.id] ?? 0}
                    wished={!!wishlist[p.id]}
                    onWishToggle={() => toggleWish(p.id)}
                    onAdd={() => handleAddToCart(p)}
                  />
                ))}
              </div>
            )}

            <PaginationBar
              page={page}
              totalPages={totalPages}
              onPageChange={(p) =>
                updateParams({ page: p === 1 ? undefined : String(p) }, { resetPage: false })
              }
            />
          </section>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Suspense fallback
 * ────────────────────────────────────────────────────────────────────────── */
function ProductsLoading() {
  return (
    <div className="min-h-screen bg-[#FAFAF7] font-sans text-[#2A2A2A] antialiased">
      <div className="mx-auto max-w-[1440px] px-6 pb-16 pt-8 lg:px-8">
        <div className="mb-5 space-y-2">
          <div className="h-3 w-32 animate-pulse rounded bg-[#ECE8E1]" />
          <div className="h-8 w-40 animate-pulse rounded bg-[#ECE8E1]" />
          <div className="h-4 w-2/3 max-w-xl animate-pulse rounded bg-[#ECE8E1]" />
        </div>
        <div className="mb-6 h-12 animate-pulse rounded-[12px] bg-[#ECE8E1]" />
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[232px_1fr]">
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded bg-[#ECE8E1]" />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductsLoading />}>
      <ProductsContent />
    </Suspense>
  );
}

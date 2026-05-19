'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowRight,
  ChevronDown,
  Coins,
  Loader2,
  ShoppingBag,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────────────────────────────────────── *
 * Tipler
 * ────────────────────────────────────────────────────────────────────────── */
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface ApiProduct {
  id: string;
  name: string;
  priceFiat: number;
  images: string[];
  category?: { id: string; name: string; slug: string };
}

interface ApiTask {
  id: string;
  title: string;
  difficulty: Difficulty;
  rewardCp: number;
  durationMin?: number;
  category?: { id: string; name: string; slug: string };
  userStatus?: string | null;
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Sabitler & mock veriler
 * DEV2_API_READY: false — anasayfadaki tüm görsel-zenginleştirici alanlar
 * (XP indirim oranı, marka, eski fiyat, oran sparkline, KPI'lar) mock'tur;
 * gerçek değerler ileride Dev2 servislerinden gelecek.
 * ────────────────────────────────────────────────────────────────────────── */
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Hero canlı oran mock'u (1 XP = N CP)
const MOCK_RATE = 8.42;
const MOCK_RATE_SPARK = [12, 13, 12, 14, 13, 15, 14, 16, 15, 17, 16, 18, 17, 19, 18, 20];

// Hero KPI mock'ları
const HERO_STATS = [
  { label: 'Aktif Kullanıcı', value: '12.458' },
  { label: 'Toplam Tasarruf', value: '₺2.4M' },
  { label: 'Tamamlanan Görev', value: '48.392' },
];

// Marka havuzu (mock)
const BRAND_POOL = [
  'Aether Audio',
  'Maple & Oak',
  'Atlas Outdoor',
  'Lyra Studios',
  'Verde Home',
  'Nova Leather',
  'Polar & Co',
  'Solis Optics',
];

// Kategori havuzu (mock — API'den gelmiyorsa)
const CATEGORY_POOL = ['Elektronik', 'Giyim', 'Ev & Yaşam', 'Spor', 'Kitap'];

// Mock fallback ürünleri (API başarısızsa)
const MOCK_PRODUCTS: ApiProduct[] = [
  {
    id: 'mock-p1',
    name: 'Aether Wireless Pro Kulaklık',
    priceFiat: 184900,
    images: ['https://picsum.photos/seed/aether-headset/600/600'],
    category: { id: '1', name: 'Elektronik', slug: 'elektronik' },
  },
  {
    id: 'mock-p2',
    name: 'Vintage Deri Sırt Çantası',
    priceFiat: 89900,
    images: ['https://picsum.photos/seed/leather-bag/600/600'],
    category: { id: '2', name: 'Giyim', slug: 'giyim' },
  },
  {
    id: 'mock-p3',
    name: 'Minimalist Masa Lambası',
    priceFiat: 74900,
    images: ['https://picsum.photos/seed/desk-lamp/600/600'],
    category: { id: '3', name: 'Ev & Yaşam', slug: 'ev-yasam' },
  },
  {
    id: 'mock-p4',
    name: 'Premium Yoga Mat 6mm',
    priceFiat: 45900,
    images: ['https://picsum.photos/seed/yoga-mat/600/600'],
    category: { id: '4', name: 'Spor', slug: 'spor' },
  },
];

// Mock fallback görevler
const MOCK_TASKS: ApiTask[] = [
  {
    id: 'mock-t1',
    title: 'İlk Ürün İncelemesi Yaz',
    difficulty: 'EASY',
    rewardCp: 50,
    durationMin: 5,
    category: { id: '1', name: 'Elektronik', slug: 'elektronik' },
    userStatus: null,
  },
  {
    id: 'mock-t2',
    title: 'Haftalık Anketi Tamamla',
    difficulty: 'MEDIUM',
    rewardCp: 120,
    durationMin: 12,
    category: { id: '2', name: 'Giyim', slug: 'giyim' },
    userStatus: 'PENDING',
  },
  {
    id: 'mock-t3',
    title: 'Spor Quiz Yarışması',
    difficulty: 'HARD',
    rewardCp: 240,
    durationMin: 25,
    category: { id: '4', name: 'Spor', slug: 'spor' },
    userStatus: null,
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

function resolveImageUrl(url: string | undefined, seed: string): string {
  if (!url) return `https://picsum.photos/seed/${seed}/600/600`;
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
}

// Ürün için görsel-zenginleştirici mock alanlar (DEV2_API_READY: false)
function deriveProductExtras(p: ApiProduct) {
  const h = hashStr(p.id);
  const xpPercent = 6 + (h % 19); // 6..24
  const brand = BRAND_POOL[h % BRAND_POOL.length];
  const oldPriceFiat = Math.round(p.priceFiat * (1.12 + ((h >> 4) % 14) / 100)); // %12-25 daha pahalı
  return { xpPercent, brand, oldPriceFiat };
}

function difficultyMeta(d: Difficulty) {
  switch (d) {
    case 'EASY':
      return { label: 'Kolay', bg: '#EAF3EE', fg: '#3F7561', dot: '#6FA58D' };
    case 'MEDIUM':
      return { label: 'Orta', bg: '#FBF1DE', fg: '#8A6320', dot: '#C99A52' };
    case 'HARD':
      return { label: 'Zor', bg: '#F8E8E0', fg: '#93432A', dot: '#C9785C' };
  }
}

function taskProgress(status: string | null | undefined): number {
  if (status === 'VERIFIED') return 100;
  if (status === 'PENDING') return 50;
  return 0;
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Görüntü içine girince fade-in
 * ────────────────────────────────────────────────────────────────────────── */
function useFadeIn<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T | null>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, visible };
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Sparkline
 * ────────────────────────────────────────────────────────────────────────── */
function Sparkline({
  data,
  color = '#7BE0A9',
  w = 220,
  h = 56,
}: {
  data: number[];
  color?: string;
  w?: number;
  h?: number;
}) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => [i * step, h - ((v - min) / range) * h] as const);
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1];
    const [x2, y2] = pts[i];
    const cx = (x1 + x2) / 2;
    d += ` Q ${cx},${y1} ${cx},${(y1 + y2) / 2} T ${x2},${y2}`;
  }
  // Alt dolgu yolu
  const fillPath = `${d} L ${w},${h} L 0,${h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible" aria-hidden>
      <defs>
        <linearGradient id="spark-grad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill="url(#spark-grad)" />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={3} fill={color} />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Custom Navbar (overlay)
 * ────────────────────────────────────────────────────────────────────────── */
function HomeNav() {
  const { user, isAuthenticated } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const navLinks: { href: string; label: string }[] = [
    { href: '/products', label: 'Ürünler' },
    { href: '/tasks', label: 'Görevler' },
    { href: '/trade', label: 'Takas' },
    { href: '/profile/wallet', label: 'Cüzdan' },
  ];

  return (
    <header
      className={cn(
        'sticky top-0 z-[60] w-full transition-colors duration-300',
        scrolled
          ? 'border-b border-white/10 bg-[rgba(15,17,23,0.9)] backdrop-blur-md'
          : 'border-b border-transparent bg-transparent',
      )}
    >
      <nav
        className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 lg:px-10"
        aria-label="Anasayfa navigasyonu"
      >
        <Link href="/" className="font-heading text-[19px] font-bold tracking-tight text-white">
          BTK<span className="text-[#7BE0A9]">Market</span>
        </Link>
        <ul className="hidden items-center gap-7 md:flex">
          {navLinks.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="text-[14px] text-white/80 transition-colors hover:text-white"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2.5">
          {isAuthenticated ? (
            <Link
              href="/profile"
              className="hidden rounded-full border border-white/20 bg-white/[0.06] px-3.5 py-1.5 text-[13px] font-medium text-white/90 transition-colors hover:border-white/30 hover:text-white sm:inline-flex"
            >
              {user?.firstName ?? 'Hesabım'}
            </Link>
          ) : (
            <Link
              href="/login"
              className="rounded-[10px] border border-white/30 px-4 py-1.5 text-[13.5px] font-semibold text-white transition-colors hover:border-white hover:bg-white hover:text-[#0F1117]"
            >
              Giriş Yap
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Hero
 * ────────────────────────────────────────────────────────────────────────── */
function Hero() {
  const { user, isAuthenticated } = useAuthStore();
  const greeting = isAuthenticated && user?.firstName ? `Hoş geldin, ${user.firstName}` : null;

  return (
    <section className="relative overflow-hidden bg-[#0F1117] text-white">
      {/* Arka plan süsleri */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'radial-gradient(60% 50% at 80% 0%, rgba(123,224,169,0.15), transparent 60%), radial-gradient(50% 60% at 0% 100%, rgba(123,224,169,0.10), transparent 60%)',
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-6 pb-16 pt-12 lg:px-10 lg:pb-24 lg:pt-16">
        {/* Pill rozet */}
        <div className="mb-7 flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3 py-1.5 text-[12px] font-medium text-white/85 backdrop-blur-sm">
            <span className="rounded-md bg-[#7BE0A9] px-1.5 py-0.5 text-[10px] font-bold tracking-wider text-[#0F1117]">
              YENİ
            </span>
            BTK Görev Sistemi v2 — daha fazla XP, daha hızlı takas
          </span>
          {greeting && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#7BE0A9]/30 bg-[#7BE0A9]/10 px-3 py-1.5 text-[12px] font-medium text-[#7BE0A9]">
              <Sparkles className="h-3 w-3" />
              {greeting}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 items-start gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,420px)] lg:gap-16">
          {/* Sol: Başlık + alt yazı + butonlar + KPI */}
          <div>
            <h1
              className="font-heading text-[56px] font-bold leading-[1.04] -tracking-[0.025em] text-white md:text-[72px] lg:text-[84px]"
              style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}
            >
              <span className="block">Kazan.</span>
              <span className="block italic font-semibold text-white/90">Takas Et.</span>
              <span className="block text-[#7BE0A9]">İndirim Al.</span>
            </h1>
            <p className="mt-6 max-w-[580px] text-[16px] leading-relaxed text-white/70 md:text-[17px]">
              Görevleri tamamla, kredi puanı (CP) topla. CP'ni canlı oranlarla XP'ye dönüştür ve
              binlerce üründe gerçek indirim olarak harca.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/products"
                className="inline-flex items-center gap-2 rounded-[12px] border border-white/30 bg-white/[0.04] px-5 py-3 text-[14.5px] font-semibold text-white transition-all hover:border-white hover:bg-white hover:text-[#0F1117] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7BE0A9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1117]"
              >
                Alışverişe Başla <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/tasks"
                className="inline-flex items-center gap-2 rounded-[12px] bg-[#7BE0A9] px-5 py-3 text-[14.5px] font-bold text-[#0F1117] shadow-[0_4px_24px_-6px_rgba(123,224,169,0.5)] transition-all hover:-translate-y-px hover:bg-[#5FCC8E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7BE0A9] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F1117]"
              >
                Görevleri Keşfet
              </Link>
            </div>

            {/* KPI bar */}
            <dl className="mt-12 grid grid-cols-1 gap-6 border-t border-white/10 pt-8 sm:grid-cols-3">
              {HERO_STATS.map((s) => (
                <div key={s.label}>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55">
                    {s.label}
                  </dt>
                  <dd className="mt-1.5 font-mono text-[26px] font-bold -tracking-[0.02em] text-white tabular-nums">
                    {s.value}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Sağ: Live swap kartı */}
          <div className="lg:sticky lg:top-24">
            <LiveSwapCard />
          </div>
        </div>
      </div>

      {/* Alt scroll ipucu */}
      <div className="relative pb-6 text-center">
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium uppercase tracking-[0.1em] text-white/40">
          aşağı kaydır <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
        </span>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Live swap card (Hero sağ)
 * ────────────────────────────────────────────────────────────────────────── */
function LiveSwapCard() {
  const [give, setGive] = useState('100');
  const numericGive = parseFloat(give) || 0;
  // 1 XP = MOCK_RATE CP, dolayısıyla N CP -> N / RATE XP
  const receive = numericGive > 0 ? numericGive / MOCK_RATE : 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/12 bg-white/[0.07] p-6 shadow-[0_18px_60px_-20px_rgba(0,0,0,0.6)] backdrop-blur-md">
      {/* Üst yardımcı: rozet + canlı dot */}
      <div className="mb-5 flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[11.5px] font-semibold uppercase tracking-[0.1em] text-white/55">
          <span
            className="h-1.5 w-1.5 rounded-full bg-[#7BE0A9] shadow-[0_0_0_3px_rgba(123,224,169,0.25)]"
            aria-hidden
          />
          Canlı Takas
        </span>
        <span className="text-[11px] text-white/40">DEV2 · mock</span>
      </div>

      {/* Sen verirsen */}
      <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55">
            Sen verirsen
          </span>
          <span className="rounded-full bg-[#9C8CC2]/20 px-2 py-0.5 text-[10.5px] font-bold tracking-wider text-[#C5B8E8]">
            CP KREDİ
          </span>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            inputMode="decimal"
            value={give}
            onChange={(e) => setGive(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
            aria-label="Verilecek CP miktarı"
            className="w-full bg-transparent font-mono text-[28px] font-bold -tracking-[0.02em] text-white outline-none tabular-nums placeholder:text-white/30"
            placeholder="0"
          />
          <span className="font-mono text-[14px] font-semibold text-white/50">CP</span>
        </div>
      </div>

      {/* Swap orta */}
      <div className="relative my-2 flex justify-center">
        <span
          className="grid h-9 w-9 place-items-center rounded-full border border-[#7BE0A9]/40 bg-[#7BE0A9]/10 text-[#7BE0A9] backdrop-blur-sm"
          aria-hidden
        >
          <ArrowRight className="h-4 w-4 rotate-90" />
        </span>
      </div>

      {/* Sen alırsın */}
      <div className="rounded-xl border border-[#7BE0A9]/20 bg-[#7BE0A9]/[0.06] p-4">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#7BE0A9]">
            Sen alırsın
          </span>
          <span className="rounded-full bg-[#7BE0A9]/15 px-2 py-0.5 text-[10.5px] font-bold tracking-wider text-[#7BE0A9]">
            XP İNDİRİM
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-mono text-[28px] font-bold -tracking-[0.02em] text-[#7BE0A9] tabular-nums">
            {receive.toLocaleString('tr-TR', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
          <span className="font-mono text-[14px] font-semibold text-white/50">XP</span>
        </div>
      </div>

      {/* Oran satırı */}
      <div className="mt-4 flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2.5 text-[12.5px] text-white/65">
        <span>Anlık Oran</span>
        <span className="font-mono font-semibold text-white tabular-nums">
          1 XP = {MOCK_RATE.toFixed(2)} CP
        </span>
      </div>

      {/* Sparkline */}
      <div className="mt-3.5 rounded-lg bg-white/[0.04] p-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-white/50">
          <span>Son 24 saat</span>
          <span className="inline-flex items-center gap-1 font-mono font-semibold text-[#7BE0A9]">
            <TrendingUp className="h-3 w-3" />
            +4.2%
          </span>
        </div>
        <Sparkline data={MOCK_RATE_SPARK} />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Bölüm başlık eyebrow
 * ────────────────────────────────────────────────────────────────────────── */
function SectionEyebrow({ index, label }: { index: string; label: string }) {
  return (
    <p className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-[#7A746B]">
      <span className="font-mono text-[#9A9A93]">{index}</span>
      <span className="mx-2 text-[#CFCBC2]">—</span>
      {label}
    </p>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Nasıl Çalışır
 * ────────────────────────────────────────────────────────────────────────── */
function HowItWorks() {
  const { ref, visible } = useFadeIn<HTMLDivElement>();
  const cards = [
    {
      step: '01',
      title: 'Görev Tamamla, CP Kazan',
      desc: `Anketleri yanıtla, ürün incelemeleri yaz, quiz'lere katıl. Her tamamlanan görev kategori bazlı CP olarak hesabına eklenir.`,
      stat: 'Ortalama kazanç +185 CP/gün',
      icon: <Target className="h-5 w-5" />,
    },
    {
      step: '02',
      title: `CP'yi XP'ye Takas Et`,
      desc: `CP bakiyeni canlı pazar oranıyla XP'ye dönüştür. Surge etkin kategorilerde oran ekstra cazip — takas anlık.`,
      stat: `Anlık oran 1 XP = ${MOCK_RATE.toFixed(2)} CP`,
      icon: <TrendingUp className="h-5 w-5" />,
    },
    {
      step: '03',
      title: 'Alışverişte İndirim Uygula',
      desc: `XP'ni binlerce ürünün üzerinde gerçek indirim olarak harca. Sepetteki indirim XP miktarına göre canlı hesaplanır.`,
      stat: 'Ortalama indirim %18 – %42',
      icon: <ShoppingBag className="h-5 w-5" />,
    },
  ];

  return (
    <section
      ref={ref}
      className={cn(
        'mx-auto max-w-[1400px] px-6 py-20 lg:px-10 lg:py-28',
        'transition-all duration-700',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
      )}
    >
      <header className="mb-12 flex flex-wrap items-end justify-between gap-6">
        <div>
          <SectionEyebrow index="01" label="Nasıl Çalışır" />
          <h2
            className="mt-2 max-w-[640px] text-[36px] font-bold leading-[1.1] -tracking-[0.025em] text-[#2A2A2A] md:text-[44px]"
            style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}
          >
            Üç adımda döngüyü kapat.
          </h2>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {cards.map((c, i) => (
          <article
            key={c.step}
            className={cn(
              'group relative flex flex-col gap-4 overflow-hidden rounded-[20px] border border-white/[0.06] bg-[#1A1D26] p-6 text-white transition-all duration-500',
              'hover:-translate-y-1 hover:bg-[#1F2330]',
              visible && 'animate-in fade-in',
            )}
            style={{
              transitionDelay: visible ? `${i * 90}ms` : '0ms',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                ADIM {c.step}
              </span>
              <span
                className="grid h-9 w-9 place-items-center rounded-lg bg-[#7BE0A9]/15 text-[#7BE0A9]"
                aria-hidden
              >
                {c.icon}
              </span>
            </div>
            <h3 className="text-[20px] font-bold -tracking-[0.015em] text-white">{c.title}</h3>
            <p className="text-[14px] leading-relaxed text-white/65">{c.desc}</p>
            <div className="mt-auto rounded-lg border border-white/[0.06] bg-white/[0.03] px-3.5 py-2.5">
              <span className="inline-flex items-center gap-2 font-mono text-[12px] text-[#7BE0A9]">
                <Sparkles className="h-3 w-3" />
                {c.stat}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Featured Products
 * ────────────────────────────────────────────────────────────────────────── */
function FeaturedProducts() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const { isAuthenticated } = useAuthStore();
  const { ref, visible } = useFadeIn<HTMLDivElement>();

  useEffect(() => {
    let cancelled = false;
    api
      .get('/products', { params: { limit: 4, sortBy: 'newest' } })
      .then((res) => {
        if (cancelled) return;
        const items: ApiProduct[] = res.data?.items ?? [];
        setProducts(items.length > 0 ? items.slice(0, 4) : MOCK_PRODUCTS);
      })
      .catch(() => {
        // DEV2_API_READY: false — API hatasında mock'a düş
        if (!cancelled) setProducts(MOCK_PRODUCTS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const addToCart = async (p: ApiProduct) => {
    if (!isAuthenticated) {
      toast.error('Sepete eklemek için giriş yap');
      return;
    }
    setAdding(p.id);
    try {
      await api.post('/cart/items', { productId: p.id, quantity: 1 });
      toast.success(`${p.name} sepete eklendi`);
    } catch {
      toast.error('Sepete eklenemedi');
    } finally {
      setAdding(null);
    }
  };

  return (
    <section
      ref={ref}
      className={cn(
        'mx-auto max-w-[1400px] px-6 pb-20 lg:px-10 lg:pb-28',
        'transition-all duration-700',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
      )}
    >
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <SectionEyebrow index="02" label="Öne Çıkan Ürünler" />
          <h2
            className="mt-2 max-w-[640px] text-[36px] font-bold leading-[1.1] -tracking-[0.025em] text-[#2A2A2A] md:text-[44px]"
            style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}
          >
            Sana özel <span className="italic font-medium text-[#7A746B]">seçkiler.</span>
          </h2>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#2A2A2A] underline-offset-[5px] hover:underline"
        >
          Tüm ürünleri gör <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[420px] animate-pulse rounded-2xl border border-[#ECE8E1] bg-white"
              />
            ))
          : products.map((p) => {
              const ext = deriveProductExtras(p);
              const cover = resolveImageUrl(p.images?.[0], p.id);
              const cat = p.category?.name ?? CATEGORY_POOL[hashStr(p.id) % CATEGORY_POOL.length];
              const busy = adding === p.id;
              return (
                <article
                  key={p.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-[#ECE8E1] bg-white transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.01] hover:shadow-[0_18px_40px_-16px_rgba(40,30,20,0.18)]"
                >
                  <Link
                    href={`/products/${p.id}`}
                    className="relative block aspect-square overflow-hidden bg-[#F4F1EA] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7BE0A9]"
                  >
                    <Image
                      src={cover}
                      alt={p.name}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      unoptimized
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-2">
                      <span className="rounded-full border border-[#ECE8E1] bg-white/90 px-2.5 py-1 text-[11px] font-medium text-[#2A2A2A] backdrop-blur-sm">
                        {cat}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#7BE0A9] px-2.5 py-1 text-[10.5px] font-bold text-[#0F1117] shadow-[0_2px_8px_-2px_rgba(123,224,169,0.5)]">
                        <Sparkles className="h-2.5 w-2.5" />+{ext.xpPercent} XP
                      </span>
                    </div>
                  </Link>

                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9A9A93]">
                      {ext.brand}
                    </p>
                    <Link
                      href={`/products/${p.id}`}
                      className="line-clamp-2 text-[15px] font-semibold leading-snug -tracking-[0.005em] text-[#2A2A2A] hover:text-[#0F1117]"
                    >
                      {p.name}
                    </Link>
                    <div className="mt-auto flex items-baseline gap-2 pt-2">
                      <span
                        className="text-[20px] font-bold -tracking-[0.015em] text-[#2A2A2A]"
                        style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}
                      >
                        ₺{fmtTL(p.priceFiat)}
                      </span>
                      {ext.oldPriceFiat > p.priceFiat && (
                        <span className="text-[12px] text-[#9A9A93] line-through tabular-nums">
                          ₺{fmtTL(ext.oldPriceFiat)}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => addToCart(p)}
                      disabled={busy}
                      className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[10px] bg-[#0F1117] text-[13.5px] font-semibold text-white transition-colors hover:bg-[#1F2330] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7BE0A9] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60"
                    >
                      {busy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <ShoppingBag className="h-3.5 w-3.5" />
                          Sepete Ekle
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Active Tasks
 * ────────────────────────────────────────────────────────────────────────── */
function ActiveTasks() {
  const { isAuthenticated } = useAuthStore();
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [loading, setLoading] = useState(true);
  const { ref, visible } = useFadeIn<HTMLDivElement>();

  useEffect(() => {
    let cancelled = false;
    // /tasks JWT korumalıdır; auth yoksa direkt mock kullan (api interceptor /login'e atmasın diye)
    if (!isAuthenticated) {
      setTasks(MOCK_TASKS);
      setLoading(false);
      return;
    }
    api
      .get('/tasks')
      .then((res) => {
        if (cancelled) return;
        const items: ApiTask[] = Array.isArray(res.data) ? res.data : [];
        const top3 = items.filter((t) => t.userStatus !== 'VERIFIED').slice(0, 3);
        setTasks(top3.length > 0 ? top3 : MOCK_TASKS);
      })
      .catch(() => {
        // DEV2_API_READY: false — auth hatasında mock'a düş
        if (!cancelled) setTasks(MOCK_TASKS);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return (
    <section
      ref={ref}
      className={cn(
        'mx-auto max-w-[1400px] px-6 pb-24 lg:px-10 lg:pb-32',
        'transition-all duration-700',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
      )}
    >
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <SectionEyebrow index="03" label="Aktif Görevler" />
          <h2
            className="mt-2 max-w-[640px] text-[36px] font-bold leading-[1.1] -tracking-[0.025em] text-[#2A2A2A] md:text-[44px]"
            style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}
          >
            Bu hafta aktif görevler.
          </h2>
        </div>
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[#2A2A2A] underline-offset-[5px] hover:underline"
        >
          Tüm görevleri gör <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-[200px] animate-pulse rounded-2xl border border-[#ECE8E1] bg-white"
              />
            ))
          : tasks.map((t) => {
              const diff = difficultyMeta(t.difficulty);
              const progress = taskProgress(t.userStatus);
              return (
                <article
                  key={t.id}
                  className="flex flex-col gap-3.5 rounded-2xl border border-[#ECE8E1] bg-white p-5 shadow-[0_1px_2px_rgba(40,32,26,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#DDD8CC]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-bold tracking-[0.02em]"
                      style={{ background: diff.bg, color: diff.fg }}
                    >
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: diff.dot }}
                        aria-hidden
                      />
                      {diff.label}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF6E8] px-2.5 py-1 text-[12px] font-bold text-[#D99B3D]">
                      <Coins className="h-3 w-3" />+{t.rewardCp} CP
                    </span>
                  </div>
                  <h3 className="line-clamp-2 text-[16px] font-bold leading-snug -tracking-[0.01em] text-[#2A2A2A]">
                    {t.title}
                  </h3>
                  {t.category && (
                    <p className="text-[12px] text-[#7A746B]">
                      {t.category.name}
                      {t.durationMin ? ` · ~${t.durationMin} dk` : null}
                    </p>
                  )}
                  <div className="mt-1">
                    <div className="mb-1 flex justify-between text-[11px] text-[#9A9A93]">
                      <span>İlerleme</span>
                      <span className="font-mono tabular-nums">%{progress}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[#F1ECE2]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#E8B86D] to-[#D99B3D] transition-[width] duration-700"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <Link
                    href="/tasks"
                    className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-[#0F1117] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#1F2330] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7BE0A9] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    {t.userStatus === 'PENDING' ? 'Devam Et' : 'Başla'}{' '}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </article>
              );
            })}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Footer
 * ────────────────────────────────────────────────────────────────────────── */
function HomeFooter() {
  const cols: { title: string; links: { label: string; href: string }[] }[] = [
    {
      title: 'Ürünler',
      links: [
        { label: 'Tüm Ürünler', href: '/products' },
        { label: 'Kategoriler', href: '/products' },
        { label: 'Yeni Gelenler', href: '/products?sort=newest' },
        { label: 'İndirimliler', href: '/products' },
      ],
    },
    {
      title: 'Görevler',
      links: [
        { label: 'Aktif Görevler', href: '/tasks' },
        { label: 'Görev Geçmişi', href: '/profile/transactions' },
        { label: 'Streak Sistemi', href: '/tasks' },
        { label: 'Liderlik Tablosu', href: '/tasks' },
      ],
    },
    {
      title: 'Takas',
      links: [
        { label: 'Pazar', href: '/trade' },
        { label: 'Cüzdanım', href: '/profile/wallet' },
        { label: 'İşlem Geçmişi', href: '/profile/transactions' },
        { label: 'Köprü', href: '/exchange' },
      ],
    },
    {
      title: 'Hakkında',
      links: [
        { label: 'Hakkımızda', href: '/' },
        { label: 'İletişim', href: '/' },
        { label: 'Kariyer', href: '/' },
        { label: 'Basın', href: '/' },
      ],
    },
  ];

  return (
    <footer className="bg-[#0F1117] text-white">
      <div className="mx-auto max-w-[1400px] px-6 py-16 lg:px-10">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,1fr))]">
          <div>
            <Link href="/" className="font-heading text-[22px] font-bold tracking-tight text-white">
              BTK<span className="text-[#7BE0A9]">Market</span>
            </Link>
            <p className="mt-3 max-w-[320px] text-[14px] leading-relaxed text-white/55">
              Görevleri tamamlayan, kazanan ve harcayan bir pazaryeri. Kazan. Takas Et. İndirim Al.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[11.5px] font-medium text-white/70">
              <Zap className="h-3 w-3 text-[#7BE0A9]" />
              v2.4 — XP Sistemi yeniliklendi
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h4 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-white/55">
                {c.title}
              </h4>
              <ul className="mt-4 flex flex-col gap-2.5">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-[13.5px] text-white/75 transition-colors hover:text-white"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-7 text-[12.5px] text-white/55">
          <p>© 2026 BTK Market — Kazan. Takas Et. İndirim Al.</p>
          <ul className="flex gap-5">
            <li>
              <Link href="/" className="transition-colors hover:text-white">
                Gizlilik
              </Link>
            </li>
            <li>
              <Link href="/" className="transition-colors hover:text-white">
                Şartlar
              </Link>
            </li>
            <li>
              <Link href="/" className="transition-colors hover:text-white">
                KVKK
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Sayfa
 * ────────────────────────────────────────────────────────────────────────── */
export default function HomePage() {
  // Önbellek: bu sayfa monte olduğu sürece layout.tsx'in global Navbar/Footer'ı
  // gizlenir; navigasyondan sonra otomatik geri gelir (style jsx global lifecycle).
  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#2A2A2A] antialiased">
      <style jsx global>{`
        /* Anasayfa overlay: layout.tsx'teki global Navbar ve Footer bu sayfada gizlenir.
           Diğer dosyalar değişmedi — stil yalnızca anasayfa mount olduğu sürece geçerli. */
        header[class*='glass'][class*='sticky'] {
          display: none !important;
        }
        footer[class*='border-t'][class*='bg-muted'] {
          display: none !important;
        }
      `}</style>

      <HomeNav />
      <Hero />

      {/* Light gövde (default zaten light) */}
      <HowItWorks />
      <FeaturedProducts />
      <ActiveTasks />

      <HomeFooter />
    </div>
  );
}

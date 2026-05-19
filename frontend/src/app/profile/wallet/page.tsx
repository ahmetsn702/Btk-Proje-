'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId, useDisconnect } from 'wagmi';
import {
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  Award,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  HelpCircle,
  Info,
  Lock,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Trophy,
  Wallet as WalletIcon,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useWalletLink } from '@/hooks/use-wallet-link';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────────────────────────────────────── *
 * Mock veriler
 * DEV2_API_READY: false — tüm cüzdan verisi mock; gerçek değerler:
 *   - balances: /users/:userId/balances (Geliştirici 2)
 *   - on-chain: blockchain RPC + bridge servisi (Geliştirici 2)
 *   - transactions: /users/:userId/transactions (Geliştirici 2)
 *   - badges: /users/:userId/badges (henüz tanımlanmamış)
 * ────────────────────────────────────────────────────────────────────────── */

type Tone = 'lavender' | 'amber' | 'coral' | 'teal' | 'sand';

interface MockCp {
  id: string;
  name: string;
  amount: number;
  thisMonth: number;
  deltaPct: number;
  tone: Tone;
  letter: string;
}

const MOCK_CP: MockCp[] = [
  {
    id: '1',
    name: 'Elektronik',
    amount: 845,
    thisMonth: 32,
    deltaPct: 12.4,
    tone: 'lavender',
    letter: 'E',
  },
  { id: '2', name: 'Giyim', amount: 612, thisMonth: 18, deltaPct: 6.8, tone: 'coral', letter: 'G' },
  {
    id: '3',
    name: 'Ev & Yaşam',
    amount: 408,
    thisMonth: 24,
    deltaPct: 8.5,
    tone: 'amber',
    letter: 'Y',
  },
  { id: '4', name: 'Spor', amount: 245, thisMonth: 12, deltaPct: -3.2, tone: 'teal', letter: 'S' },
  { id: '5', name: 'Kitap', amount: 120, thisMonth: 8, deltaPct: 4.4, tone: 'sand', letter: 'K' },
];

const TONE_STYLES: Record<
  Tone,
  { iconBg: string; iconText: string; surface: string; surfaceText: string }
> = {
  lavender: {
    iconBg: '#B4A7D6',
    iconText: '#FFFFFF',
    surface: '#F2EFFA',
    surfaceText: '#5A4E8A',
  },
  amber: {
    iconBg: '#E8C77E',
    iconText: '#6F541A',
    surface: '#FBF4E3',
    surfaceText: '#8A6A2B',
  },
  coral: {
    iconBg: '#E89B8C',
    iconText: '#FFFFFF',
    surface: '#FBEDE8',
    surfaceText: '#A05245',
  },
  teal: {
    iconBg: '#7FB8B0',
    iconText: '#FFFFFF',
    surface: '#E8F4F2',
    surfaceText: '#2F6F66',
  },
  sand: {
    iconBg: '#D4BC95',
    iconText: '#6B5024',
    surface: '#F6EFE2',
    surfaceText: '#6B5024',
  },
};

const MOCK_XP = {
  balance: 2840,
  thisMonth: 460,
  deltaPct: 14.2,
  level: 14,
  title: 'Bahçıvan',
  nextLevelXp: 3200,
};

// On-chain ↔ Off-chain
const MOCK_ON_CHAIN_XP = 2755;
const MOCK_OFF_CHAIN_XP = 85; // henüz köprülenmemiş

interface BadgeItem {
  id: string;
  name: string;
  emoji: string;
  tone: Tone;
  earned: boolean;
  tier: 'I' | 'II' | 'III' | 'IV';
}

const MOCK_BADGES: BadgeItem[] = [
  { id: 'b1', name: 'İlk Görev', emoji: '🌱', tone: 'teal', earned: true, tier: 'I' },
  { id: 'b2', name: 'Streak 7', emoji: '🔥', tone: 'amber', earned: true, tier: 'II' },
  { id: 'b3', name: 'İlk Takas', emoji: '🔁', tone: 'lavender', earned: true, tier: 'I' },
  { id: 'b4', name: 'Köprü Kurucu', emoji: '🌉', tone: 'coral', earned: true, tier: 'I' },
  { id: 'b5', name: 'Lv 10+', emoji: '⭐', tone: 'amber', earned: true, tier: 'III' },
  { id: 'b6', name: 'Bahçıvan', emoji: '🌷', tone: 'sand', earned: true, tier: 'II' },
  { id: 'b7', name: 'Surge Avcısı', emoji: '⚡', tone: 'amber', earned: false, tier: 'I' },
  { id: 'b8', name: 'Streak 30', emoji: '🌋', tone: 'coral', earned: false, tier: 'III' },
  { id: 'b9', name: 'Lv 20', emoji: '👑', tone: 'lavender', earned: false, tier: 'IV' },
];

type TxKind = 'earn' | 'spend' | 'swap' | 'task';

interface TxRow {
  id: string;
  date: string; // 19 Mayıs
  time: string; // 14:22
  kind: TxKind;
  title: string;
  refId: string;
  category: { name: string; tone: Tone } | null;
  amount: number; // pozitif = kazanım, negatif = harcama
  unit: 'XP' | 'CP';
  balance: number;
  external?: boolean;
}

const MOCK_TX: TxRow[] = [
  {
    id: 't1',
    date: '19 May',
    time: '14:22',
    kind: 'task',
    title: 'Görev: Ürün İncelemesi',
    refId: 'TSK-1042',
    category: { name: 'Elektronik', tone: 'lavender' },
    amount: 32,
    unit: 'CP',
    balance: 845,
  },
  {
    id: 't2',
    date: '19 May',
    time: '11:08',
    kind: 'swap',
    title: 'Takas: Spor → Kitap',
    refId: 'SWP-0298',
    category: { name: 'Spor', tone: 'teal' },
    amount: -1200,
    unit: 'CP',
    balance: 245,
    external: true,
  },
  {
    id: 't3',
    date: '18 May',
    time: '22:47',
    kind: 'earn',
    title: 'Sipariş Bonusu',
    refId: 'BNS-7745',
    category: { name: 'Ev & Yaşam', tone: 'amber' },
    amount: 24,
    unit: 'XP',
    balance: 2840,
  },
  {
    id: 't4',
    date: '18 May',
    time: '16:30',
    kind: 'spend',
    title: 'Sepet · 3 ürün',
    refId: 'ORD-9012',
    category: { name: 'Giyim', tone: 'coral' },
    amount: -180,
    unit: 'XP',
    balance: 2816,
  },
  {
    id: 't5',
    date: '17 May',
    time: '09:12',
    kind: 'task',
    title: 'Günlük streak ödülü',
    refId: 'STK-0042',
    category: null,
    amount: 50,
    unit: 'XP',
    balance: 2996,
  },
  {
    id: 't6',
    date: '16 May',
    time: '19:55',
    kind: 'swap',
    title: 'Takas: Kitap → Elektronik',
    refId: 'SWP-0297',
    category: { name: 'Kitap', tone: 'sand' },
    amount: 540,
    unit: 'CP',
    balance: 845,
    external: true,
  },
];

const TX_KIND_META: Record<
  TxKind,
  {
    label: string;
    iconBg: string;
    iconColor: string;
    Icon: React.ComponentType<{ className?: string }>;
  }
> = {
  earn: { label: 'Kazanım', iconBg: '#EDF7F2', iconColor: '#3F8C6A', Icon: ArrowDownRight },
  spend: { label: 'Harcama', iconBg: '#FBEEEC', iconColor: '#C97A75', Icon: ShoppingBag },
  swap: { label: 'Takas', iconBg: '#F2EFFA', iconColor: '#5A4E8A', Icon: ArrowRightLeft },
  task: { label: 'Görev', iconBg: '#FBF4E3', iconColor: '#8A6A2B', Icon: Trophy },
};

/* ────────────────────────────────────────────────────────────────────────── *
 * Helpers
 * ────────────────────────────────────────────────────────────────────────── */
const fmtInt = (n: number) => Math.abs(Math.round(n)).toLocaleString('tr-TR');
const fmtSigned = (n: number) =>
  `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('tr-TR')}`;
const truncateAddr = (a: string | undefined) =>
  a && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : (a ?? '');
const chainName = (id: number | undefined) => {
  switch (id) {
    case 137:
      return 'Polygon';
    case 80002:
      return 'Polygon Amoy';
    case 421614:
      return 'Arbitrum Sepolia';
    case 42161:
      return 'Arbitrum One';
    default:
      return id ? `Chain #${id}` : 'Bilinmiyor';
  }
};

/* ────────────────────────────────────────────────────────────────────────── *
 * XP hero card
 * ────────────────────────────────────────────────────────────────────────── */
function XpHeroCard() {
  const remaining = Math.max(0, MOCK_XP.nextLevelXp - MOCK_XP.balance);
  const pct = Math.min(100, (MOCK_XP.balance / MOCK_XP.nextLevelXp) * 100);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#ECE8E1] bg-white p-6">
      <div
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,rgba(111,165,141,0.10),transparent_60%)]"
        aria-hidden
      />
      <header className="relative flex items-center justify-between">
        <span className="inline-flex items-center gap-2 text-[12.5px] font-semibold uppercase tracking-[0.08em] text-[#8B8B82]">
          <span className="h-2 w-2 rounded-sm bg-[#6FA58D]" aria-hidden />
          Toplam XP Bakiyesi
        </span>
        <button
          type="button"
          aria-label="XP hakkında"
          className="grid h-7 w-7 place-items-center rounded-full text-[#8B8B82] transition-colors hover:bg-black/[0.04] hover:text-[#2A2A2A]"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="relative mt-3.5">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[56px] font-bold leading-none -tracking-[0.035em] text-[#588674] tabular-nums">
            {fmtInt(MOCK_XP.balance)}
          </span>
          <span className="text-[22px] font-semibold text-[#8B8B82]">XP</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3.5 text-[13.5px] text-[#5A5A55]">
          <span className="inline-flex items-center gap-1 rounded-md bg-[rgba(123,197,163,0.18)] px-2 py-0.5 font-mono text-[12.5px] font-semibold text-[#3F8C6A] tabular-nums">
            <ArrowUpRight className="h-3 w-3" />+{fmtInt(MOCK_XP.thisMonth)} XP bu ay
          </span>
          <span className="font-mono text-[12.5px] text-[#3F8C6A] tabular-nums">
            +{MOCK_XP.deltaPct.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="relative mt-5 border-t border-dashed border-[#DDD8CC] pt-5">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[#2A2A2A]">
            <span className="rounded-md bg-[#6FA58D] px-2 py-[3px] text-[12px] font-bold tracking-[0.02em] text-white">
              Lv {MOCK_XP.level}
            </span>
            <span className="text-[#5A5A55]">{MOCK_XP.title}</span>
          </span>
          <span className="text-[13px] text-[#8B8B82]">
            Lv {MOCK_XP.level + 1}'e{' '}
            <b className="font-mono font-semibold text-[#2A2A2A] tabular-nums">
              {fmtInt(remaining)}
            </b>{' '}
            XP
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#F1EDE4]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#6FA58D] to-[#87BBA3] transition-[width] duration-700 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[11.5px] text-[#8B8B82] tabular-nums">
          <span>{fmtInt(MOCK_XP.balance)} XP</span>
          <span>{fmtInt(MOCK_XP.nextLevelXp)} XP</span>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * CP cards
 * ────────────────────────────────────────────────────────────────────────── */
function CpCard({ row }: { row: MockCp }) {
  const tone = TONE_STYLES[row.tone];
  const positive = row.deltaPct >= 0;
  return (
    <div className="rounded-xl border border-[#ECE8E1] bg-white px-4 pb-3 pt-3.5 transition-all hover:-translate-y-px hover:border-[#DDD8CC]">
      <div className="flex items-start justify-between">
        <span
          className="grid h-7 w-7 place-items-center rounded-lg text-sm font-bold"
          style={{ background: tone.iconBg, color: tone.iconText }}
          aria-hidden
        >
          {row.letter}
        </span>
      </div>
      <p className="mt-2.5 text-xs font-semibold tracking-[0.02em] text-[#8B8B82]">{row.name}</p>
      <p className="mt-0.5 font-mono text-[22px] font-bold -tracking-[0.025em] text-[#2A2A2A] tabular-nums">
        {fmtInt(row.amount)}
      </p>
      <p
        className={cn(
          'mt-1 font-mono text-[11.5px] tabular-nums',
          positive ? 'text-[#3F8C6A]' : 'text-[#C97A75]',
        )}
      >
        {positive ? '▲' : '▼'} {fmtSigned(row.thisMonth)} CP · {positive ? '+' : ''}
        {row.deltaPct.toFixed(1)}%
      </p>
    </div>
  );
}

function CpGrid() {
  const total = MOCK_CP.reduce((acc, c) => acc + c.amount, 0);
  const monthTotal = MOCK_CP.reduce((acc, c) => acc + c.thisMonth, 0);
  return (
    <section aria-label="Kategori CP bakiyeleri" className="grid grid-cols-2 gap-3">
      {MOCK_CP.map((row) => (
        <CpCard key={row.id} row={row} />
      ))}
      {/* Toplam — 2 sütun span */}
      <div className="col-span-2 flex items-center justify-between rounded-xl border border-[#ECE8E1] bg-[#FAF7F1] px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-[#8B8B82]">
            Toplam CP
          </p>
          <p className="mt-1 font-mono text-[20px] font-bold -tracking-[0.02em] text-[#2A2A2A] tabular-nums">
            {fmtInt(total)}
          </p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[12px] tabular-nums text-[#8B8B82]">Bu ay</p>
          <p className="font-mono text-[14px] font-semibold tabular-nums text-[#3F8C6A]">
            +{fmtInt(monthTotal)} CP
          </p>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Wallet panel
 * ────────────────────────────────────────────────────────────────────────── */
function WalletPanel() {
  const { user } = useAuthStore();
  const { address: wagmiAddress, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { linkWallet, linking } = useWalletLink();

  const linkedAddress = user?.walletAddress ?? null;
  // Effective UI: hesaba bağlı (linkedAddress) varsa onu öncelikle kullan; yoksa wagmi adresi
  const showAddress = linkedAddress ?? (isConnected ? wagmiAddress : null);
  const needsLink = !linkedAddress && isConnected && wagmiAddress;

  const copyAddress = async () => {
    if (!showAddress) return;
    try {
      await navigator.clipboard.writeText(showAddress);
      toast.success('Adres kopyalandı');
    } catch {
      toast.error('Kopyalama başarısız');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast.message('Cüzdan bağlantısı kesildi', {
      description: 'Hesaptaki kayıt korunur — istediğin zaman tekrar bağlanabilirsin.',
    });
  };

  return (
    <section
      aria-label="Cüzdan paneli"
      className="rounded-2xl border border-[#ECE8E1] bg-white p-5"
    >
      {showAddress ? (
        <>
          <header className="mb-3.5 flex items-center justify-between">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 text-[12px] font-semibold',
                'text-[#3F8C6A]',
              )}
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-[#7BC5A3] shadow-[0_0_0_3px_rgba(123,197,163,0.25)]"
                aria-hidden
              />
              Cüzdan bağlı
            </span>
            <NetworkChip chainId={chainId} />
          </header>

          {/* Address row */}
          <div className="flex items-center gap-2.5 rounded-xl border border-[#ECE8E1] bg-[#FAF7F1] px-3.5 py-3">
            <div
              className="h-8 w-8 shrink-0 rounded-lg [background:conic-gradient(from_45deg,#6FA58D,#B4A7D6,#E8C77E,#E89B8C,#7FB8B0,#6FA58D)]"
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-[#8B8B82]">
                {linkedAddress ? 'Hesaba bağlı' : 'Wagmi bağlı (henüz hesaba bağlı değil)'}
              </p>
              <p title={showAddress} className="font-mono text-[13.5px] font-medium text-[#2A2A2A]">
                {truncateAddr(showAddress)}
              </p>
            </div>
            <div className="ml-auto flex gap-1">
              <button
                type="button"
                onClick={copyAddress}
                aria-label="Adresi kopyala"
                className="grid h-7 w-7 place-items-center rounded-md text-[#8B8B82] hover:bg-black/[0.04] hover:text-[#2A2A2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D]"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <a
                href={`https://polygonscan.com/address/${showAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Block explorer'da aç"
                className="grid h-7 w-7 place-items-center rounded-md text-[#8B8B82] hover:bg-black/[0.04] hover:text-[#2A2A2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D]"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>

          {/* Eylemler */}
          <div className="mt-3.5 flex gap-2">
            {needsLink ? (
              <button
                type="button"
                onClick={linkWallet}
                disabled={linking}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[#6FA58D] bg-[#6FA58D] px-3.5 py-2.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-[#588674] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:opacity-60"
              >
                {linking ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <WalletIcon className="h-3.5 w-3.5" />
                )}
                Hesaba Bağla
              </button>
            ) : (
              <ConnectButton.Custom>
                {({ openAccountModal }) => (
                  <button
                    type="button"
                    onClick={openAccountModal}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[#ECE8E1] bg-white px-3.5 py-2.5 text-[13.5px] font-semibold text-[#2A2A2A] transition-colors hover:border-[#DDD8CC] hover:bg-[#FAF7F1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D]"
                  >
                    Değiştir
                  </button>
                )}
              </ConnectButton.Custom>
            )}
            <button
              type="button"
              onClick={handleDisconnect}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-[10px] border border-[#ECE8E1] bg-white px-3.5 py-2.5 text-[13.5px] font-semibold text-[#2A2A2A] transition-colors hover:border-[#DDD8CC] hover:bg-[#FAF7F1] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D]"
            >
              Bağlantıyı Kes
            </button>
          </div>

          {/* Sync row */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="rounded-xl border border-[#ECE8E1] bg-[#FAF7F1] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8B8B82]">
                On-chain XP
              </p>
              <p className="mt-1 font-mono text-[15px] font-semibold -tracking-[0.01em] text-[#2A2A2A] tabular-nums">
                {fmtInt(MOCK_ON_CHAIN_XP)}
              </p>
            </div>
            <div className="rounded-xl border border-[#ECE8E1] bg-[#FAF7F1] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-[#8B8B82]">
                Off-chain XP
              </p>
              <p className="mt-1 font-mono text-[15px] font-semibold -tracking-[0.01em] text-[#2A2A2A] tabular-nums">
                {fmtInt(MOCK_OFF_CHAIN_XP)}
              </p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11.5px] text-[#8B8B82]">
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 rounded-full bg-[#7BC5A3] shadow-[0_0_0_3px_rgba(123,197,163,0.25)]"
                aria-hidden
              />
              <span className="font-semibold text-[#3F8C6A]">Senkron</span> · son güncelleme 2 dk
              önce
            </span>
            <Link
              href="/exchange"
              className="inline-flex items-center gap-1 font-semibold text-[#588674] hover:text-[#2A2A2A]"
            >
              Köprüye git <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </>
      ) : (
        // Bağlı değil
        <ConnectButton.Custom>
          {({ openConnectModal }) => (
            <>
              <header className="mb-3.5 flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#8B8B82]">
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-[#8B8B82] shadow-[0_0_0_3px_rgba(139,139,130,0.18)]"
                    aria-hidden
                  />
                  Cüzdan bağlı değil
                </span>
              </header>

              <div className="text-center">
                <div
                  className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-[#EDF7F2] text-[#588674]"
                  aria-hidden
                >
                  <WalletIcon className="h-6 w-6" />
                </div>
                <h3 className="text-[16px] font-bold -tracking-[0.015em] text-[#2A2A2A]">
                  Cüzdanını bağla
                </h3>
                <p className="mt-1 text-[13px] leading-snug text-[#5A5A55]">
                  Takas, köprü ve on-chain ödüller için Polygon ya da Arbitrum cüzdanınla bağlan.
                </p>
              </div>

              <button
                type="button"
                onClick={openConnectModal}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#6FA58D] px-4 py-3.5 text-[14.5px] font-bold text-white shadow-[0_4px_14px_-4px_rgba(111,165,141,0.5)] transition-colors hover:bg-[#588674] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              >
                <WalletIcon className="h-4 w-4" />
                Cüzdan Bağla
              </button>

              <p className="mt-3 inline-flex items-center justify-center gap-1.5 text-[11.5px] text-[#8B8B82]">
                <Info className="h-3 w-3" />
                İmzalama ücretsizdir, gas harcamaz.
              </p>
            </>
          )}
        </ConnectButton.Custom>
      )}
    </section>
  );
}

function NetworkChip({ chainId }: { chainId: number | undefined }) {
  return (
    <ConnectButton.Custom>
      {({ openChainModal, chain }) => {
        const wrong = chain?.unsupported;
        return (
          <button
            type="button"
            onClick={openChainModal}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D]',
              wrong
                ? 'bg-[#FBEEEC] text-[#C97A75] hover:bg-[#F8DFD9]'
                : 'bg-[#F2EFFA] text-[#5A4E8A] hover:bg-[#E9E2F4]',
            )}
            aria-label="Ağı değiştir"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: wrong ? '#C97A75' : '#7C6EBF' }}
              aria-hidden
            />
            {wrong ? 'Yanlış ağ' : chainName(chainId)}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Badges
 * ────────────────────────────────────────────────────────────────────────── */
function BadgesCard() {
  const earnedCount = MOCK_BADGES.filter((b) => b.earned).length;
  return (
    <section aria-label="Rozetler" className="rounded-2xl border border-[#ECE8E1] bg-white">
      <header className="flex items-center justify-between px-5 py-4 border-b border-[#ECE8E1]">
        <h3 className="m-0 inline-flex items-center gap-2 text-[15px] font-bold -tracking-[0.015em] text-[#2A2A2A]">
          <Award className="h-4 w-4 text-[#588674]" aria-hidden />
          Rozetler{' '}
          <span className="font-mono text-[12.5px] font-semibold text-[#588674] tabular-nums">
            {earnedCount}/{MOCK_BADGES.length}
          </span>
        </h3>
        <Link
          href="/profile/transactions"
          className="text-[12.5px] font-semibold text-[#588674] hover:text-[#2A2A2A]"
        >
          Tümü →
        </Link>
      </header>
      <div className="grid grid-cols-3 gap-2.5 p-[18px]">
        {MOCK_BADGES.map((b) => (
          <BadgeCell key={b.id} badge={b} />
        ))}
      </div>
      <div className="border-t border-[#ECE8E1] px-5 py-4">
        <Link
          href="/tasks"
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-[10px] border border-[#6FA58D] bg-[#6FA58D] px-4 py-2.5 text-[13px] font-semibold text-white transition-colors hover:bg-[#588674] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D] focus-visible:ring-offset-2 focus-visible:ring-offset-white"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Aktif görevi tamamla
        </Link>
      </div>
    </section>
  );
}

function BadgeCell({ badge }: { badge: BadgeItem }) {
  const tone = TONE_STYLES[badge.tone];
  return (
    <div
      className={cn(
        'group relative flex aspect-square flex-col items-center justify-center rounded-2xl border border-[#ECE8E1] p-2 transition-all hover:-translate-y-0.5 hover:border-[#DDD8CC]',
        badge.earned
          ? 'bg-gradient-to-b from-white to-[#FAF7F1]'
          : 'bg-white opacity-55 saturate-0 hover:opacity-90',
      )}
      title={badge.name}
      aria-label={`${badge.name} ${badge.earned ? 'kazanıldı' : 'kilitli'}`}
    >
      <span
        className="absolute right-1.5 top-1.5 font-mono text-[9px] font-bold text-[#8B8B82]"
        aria-hidden
      >
        {badge.tier}
      </span>
      <span
        className="relative grid h-9 w-9 place-items-center rounded-full text-[18px]"
        style={{ background: tone.surface }}
        aria-hidden
      >
        {badge.emoji}
        {!badge.earned && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-white/60 text-[#8B8B82]">
            <Lock className="h-3.5 w-3.5" />
          </span>
        )}
      </span>
      <span className="mt-1 line-clamp-1 px-1 text-center text-[10.5px] font-semibold -tracking-[0.005em] text-[#2A2A2A]">
        {badge.name}
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Transactions
 * ────────────────────────────────────────────────────────────────────────── */
type TxFilter = 'all' | TxKind;

function TransactionsSection() {
  const [filter, setFilter] = useState<TxFilter>('all');

  const counts = useMemo(() => {
    const c: Record<TxFilter, number> = {
      all: MOCK_TX.length,
      earn: 0,
      spend: 0,
      swap: 0,
      task: 0,
    };
    MOCK_TX.forEach((t) => (c[t.kind] += 1));
    return c;
  }, []);

  const visible = useMemo(
    () => (filter === 'all' ? MOCK_TX : MOCK_TX.filter((t) => t.kind === filter)),
    [filter],
  );

  const filterTabs: { key: TxFilter; label: string }[] = [
    { key: 'all', label: 'Tümü' },
    { key: 'earn', label: 'Kazanım' },
    { key: 'spend', label: 'Harcama' },
    { key: 'swap', label: 'Takas' },
    { key: 'task', label: 'Görev' },
  ];

  return (
    <section
      aria-label="İşlem geçmişi"
      className="overflow-hidden rounded-2xl border border-[#ECE8E1] bg-white"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECE8E1] px-[22px] py-4">
        <div>
          <h3 className="m-0 text-[16px] font-bold -tracking-[0.015em] text-[#2A2A2A]">
            İşlem Geçmişi
          </h3>
          <p className="mt-0.5 text-[12.5px] text-[#8B8B82]">
            <span className="font-semibold text-[#5A5A55] tabular-nums">{MOCK_TX.length}</span>{' '}
            işlem · son 30 gün
          </p>
        </div>
        <div role="tablist" className="flex gap-1 rounded-[10px] bg-[#F4F1EA] p-1">
          {filterTabs.map((t) => {
            const active = filter === t.key;
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(t.key)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[13px] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D]',
                  active
                    ? 'bg-white font-semibold text-[#2A2A2A] shadow-[0_1px_2px_rgba(33,28,20,0.04)]'
                    : 'text-[#5A5A55] hover:text-[#2A2A2A]',
                )}
              >
                {t.label}
                <span
                  className={cn(
                    'font-mono text-[11px] tabular-nums',
                    active ? 'text-[#588674]' : 'text-[#8B8B82]',
                  )}
                >
                  {counts[t.key]}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-[#FAF7F1]">
              <Th>Tarih</Th>
              <Th>İşlem</Th>
              <Th>Kategori</Th>
              <Th align="right">Miktar</Th>
              <Th align="right">Bakiye</Th>
              <Th align="right">&nbsp;</Th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center text-[13px] text-[#8B8B82]">
                  Bu filtrede henüz işlem yok.
                </td>
              </tr>
            ) : (
              visible.map((tx) => <TxRowItem key={tx.id} tx={tx} />)
            )}
          </tbody>
        </table>
      </div>

      <footer className="flex items-center justify-between border-t border-[#ECE8E1] px-[22px] py-3.5 text-[13px] text-[#8B8B82]">
        <span>
          <span className="font-semibold text-[#2A2A2A] tabular-nums">{visible.length}</span> işlem
          gösteriliyor
        </span>
        <div className="flex gap-1">
          <PagerBtn disabled aria-label="Önceki">
            <ChevronLeft className="h-3.5 w-3.5" />
          </PagerBtn>
          <PagerBtn active>1</PagerBtn>
          <PagerBtn disabled aria-label="Sonraki">
            <ChevronRight className="h-3.5 w-3.5" />
          </PagerBtn>
        </div>
      </footer>
    </section>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: 'right' }) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-[#ECE8E1] px-[22px] py-3 text-[11.5px] font-semibold uppercase tracking-[0.06em] text-[#8B8B82]',
        align === 'right' ? 'text-right' : 'text-left',
      )}
    >
      {children}
    </th>
  );
}

function PagerBtn({
  children,
  active,
  disabled,
  ...rest
}: {
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        'inline-flex h-8 min-w-8 items-center justify-center rounded-[8px] border px-2 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D]',
        active
          ? 'border-[#2A2A2A] bg-[#2A2A2A] text-white'
          : 'border-[#ECE8E1] bg-white text-[#5A5A55] hover:border-[#DDD8CC] hover:text-[#2A2A2A]',
        disabled && 'cursor-not-allowed opacity-40 hover:border-[#ECE8E1] hover:text-[#5A5A55]',
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

function TxRowItem({ tx }: { tx: TxRow }) {
  const meta = TX_KIND_META[tx.kind];
  const Icon = meta.Icon;
  const positive = tx.amount >= 0;
  const catTone = tx.category ? TONE_STYLES[tx.category.tone] : null;

  return (
    <tr className="transition-colors hover:bg-[#FAF8F3]">
      <td className="border-b border-[#ECE8E1] px-[22px] py-3.5 align-middle">
        <span className="block text-[13px] text-[#5A5A55]">{tx.date}</span>
        <span className="mt-0.5 block font-mono text-[11.5px] text-[#8B8B82] tabular-nums">
          {tx.time}
        </span>
      </td>
      <td className="border-b border-[#ECE8E1] px-[22px] py-3.5 align-middle">
        <div className="flex items-center gap-2.5">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[9px]"
            style={{ background: meta.iconBg, color: meta.iconColor }}
            aria-hidden
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold leading-tight text-[#2A2A2A]">{tx.title}</p>
            <p className="mt-0.5 font-mono text-[11.5px] text-[#8B8B82] tabular-nums">
              {meta.label} · {tx.refId}
            </p>
          </div>
        </div>
      </td>
      <td className="border-b border-[#ECE8E1] px-[22px] py-3.5 align-middle">
        {tx.category && catTone ? (
          <span
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-semibold"
            style={{ background: catTone.surface, color: catTone.surfaceText }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: catTone.iconBg }}
              aria-hidden
            />
            {tx.category.name}
          </span>
        ) : (
          <span className="text-[12px] text-[#8B8B82]">—</span>
        )}
      </td>
      <td className="border-b border-[#ECE8E1] px-[22px] py-3.5 text-right align-middle">
        <span
          className={cn(
            'font-mono text-[14px] font-semibold tabular-nums',
            positive ? 'text-[#3F8C6A]' : 'text-[#C97A75]',
          )}
        >
          {fmtSigned(tx.amount)} {tx.unit}
        </span>
      </td>
      <td className="border-b border-[#ECE8E1] px-[22px] py-3.5 text-right align-middle">
        <span className="font-mono text-[13px] text-[#5A5A55] tabular-nums">
          {fmtInt(tx.balance)} {tx.unit}
        </span>
      </td>
      <td className="border-b border-[#ECE8E1] px-[22px] py-3.5 text-right align-middle">
        {tx.external && (
          <a
            href="#"
            aria-label="İşlemi explorer'da aç"
            className="inline-grid h-7 w-7 place-items-center rounded-md text-[#8B8B82] hover:bg-black/[0.04] hover:text-[#2A2A2A]"
            onClick={(e) => e.preventDefault()}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </td>
    </tr>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Sayfa
 * ────────────────────────────────────────────────────────────────────────── */
export default function WalletPage() {
  return (
    <div className="-mx-1 rounded-2xl bg-[#FAFAF7] p-5 font-sans text-[#2A2A2A] antialiased lg:-mx-2 lg:p-7 [font-feature-settings:'ss01','cv11']">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[13px] text-[#8B8B82]">
            <Link href="/profile" className="hover:text-[#5A5A55]">
              Hesap
            </Link>{' '}
            / <b className="font-medium text-[#5A5A55]">Cüzdan</b>
          </p>
          <h1 className="mt-1 m-0 text-[28px] font-bold -tracking-[0.025em] text-[#2A2A2A]">
            Cüzdanım
          </h1>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EDF7F2] px-3 py-1.5 text-[12.5px] font-semibold text-[#588674]">
          <span
            className="h-1.5 w-1.5 rounded-full bg-[#7BC5A3] shadow-[0_0_0_3px_rgba(123,197,163,0.25)]"
            aria-hidden
          />
          Bakiyeler güncel
        </span>
      </header>

      {/* 3-col grid */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_360px] lg:items-start">
        <div className="flex flex-col gap-5 min-w-0">
          <XpHeroCard />
          {/* Görsel hiyerarşi: XP altında özet bilgi */}
          <SummaryStrip />
        </div>
        <div className="flex flex-col gap-5 min-w-0">
          <CpGrid />
        </div>
        <div className="flex flex-col gap-5">
          <WalletPanel />
          <BadgesCard />
        </div>
      </div>

      {/* Transactions */}
      <div className="mt-7">
        <TransactionsSection />
      </div>
    </div>
  );
}

/* Küçük yardımcı satır: XP'nin altında bağlam */
function SummaryStrip() {
  const totalCp = MOCK_CP.reduce((acc, c) => acc + c.amount, 0);
  return (
    <div className="grid grid-cols-3 gap-3 rounded-2xl border border-[#ECE8E1] bg-white px-4 py-3.5">
      <Stat label="CP karşılığı" value={fmtInt(Math.round(totalCp / 10))} unit="XP" />
      <Stat label="Bu ay" value={`+${MOCK_XP.thisMonth}`} unit="XP" tone="pos" />
      <Stat label="Streak" value="7" unit="gün" />
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone?: 'pos';
}) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8B8B82]">
        {label}
      </span>
      <span className="mt-1 inline-flex items-baseline gap-1">
        <span
          className={cn(
            'font-mono text-[16px] font-bold -tracking-[0.01em] tabular-nums',
            tone === 'pos' ? 'text-[#3F8C6A]' : 'text-[#2A2A2A]',
          )}
        >
          {value}
        </span>
        <span className="text-[11.5px] text-[#8B8B82]">{unit}</span>
      </span>
    </div>
  );
}

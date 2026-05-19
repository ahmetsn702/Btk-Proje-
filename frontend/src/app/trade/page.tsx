'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, Settings2 } from 'lucide-react';
import { useMarketRates, type MarketRate } from '@/hooks/use-market-rates';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────────────────────────────────────── *
 * Görsel zenginleştirme için kategori-bazlı yardımcı mock veri.
 * Sparkline ve 24s hacim görsel temsildir; gerçek veri Geliştirici 2'nin
 * `/exchange/chart/:categoryId` ve hacim endpoint'lerinden gelecek.
 * ────────────────────────────────────────────────────────────────────────── */
// DEV2_API_READY: false — sparkline + 24s hacim mock kullanılıyor
const CAT_META: Record<
  string,
  { sub: string; vol: string; spark: number[]; chip: string; glyph: string }
> = {
  '1': {
    sub: 'Cihaz · Aksesuar',
    vol: '298.4K',
    spark: [22, 21, 20, 21, 19, 20, 18, 17, 18, 16, 17, 17],
    chip: '#CFD6E8',
    glyph: 'E',
  },
  '2': {
    sub: 'Giyim · Aksesuar',
    vol: '142.8K',
    spark: [12, 14, 13, 16, 18, 17, 19, 22, 21, 24, 26, 25],
    chip: '#E9C9D8',
    glyph: 'G',
  },
  '3': {
    sub: 'Mobilya · Dekor',
    vol: '87.2K',
    spark: [16, 16, 17, 17, 18, 17, 18, 18, 19, 18, 19, 19],
    chip: '#DCE5D2',
    glyph: 'Y',
  },
  '4': {
    sub: 'Ekipman · Outdoor',
    vol: '64.1K',
    spark: [10, 11, 10, 12, 13, 12, 14, 15, 16, 18, 17, 19],
    chip: '#E5D8C2',
    glyph: 'S',
  },
  '5': {
    sub: 'Roman · Akademik',
    vol: '198.7K',
    spark: [21, 20, 21, 19, 18, 19, 17, 18, 16, 17, 15, 16],
    chip: '#D8CEE6',
    glyph: 'K',
  },
  '6': {
    sub: 'Bakım · Makyaj',
    vol: '54.2K',
    spark: [15, 16, 15, 17, 16, 17, 18, 17, 18, 19, 18, 19],
    chip: '#F0DCE6',
    glyph: 'B',
  },
};

const FALLBACK_META = {
  sub: 'Kategori',
  vol: '—',
  spark: [10, 12, 11, 13, 12, 14, 13, 15, 14, 16, 15, 17],
  chip: '#E5E5E5',
  glyph: '·',
};

const metaFor = (id: string) => CAT_META[id] ?? FALLBACK_META;

/* ───────── Tipler ───────── */

type Status = 'Tamamlandı' | 'Beklemede' | 'Başarısız';
type HistoryRow = {
  id: number;
  ts: string;
  type: 'Takas' | 'Surge';
  from: string;
  to: string;
  amount: number;
  status: Status;
};

/* ───────── Mock geçmiş ve bakiyeler ───────── */
// DEV2_API_READY: false — gerçek geçmiş Dev2'nin /users/:userId/transactions endpoint'inden alınacak
const INITIAL_HISTORY: HistoryRow[] = [
  {
    id: 1,
    ts: '2026-05-19 14:22',
    type: 'Takas',
    from: '1',
    to: '2',
    amount: 240,
    status: 'Tamamlandı',
  },
  {
    id: 2,
    ts: '2026-05-19 11:08',
    type: 'Surge',
    from: '4',
    to: '5',
    amount: 1200,
    status: 'Tamamlandı',
  },
  {
    id: 3,
    ts: '2026-05-18 22:47',
    type: 'Takas',
    from: '2',
    to: '3',
    amount: 85,
    status: 'Tamamlandı',
  },
  {
    id: 4,
    ts: '2026-05-18 16:30',
    type: 'Takas',
    from: '5',
    to: '1',
    amount: 540,
    status: 'Beklemede',
  },
  {
    id: 5,
    ts: '2026-05-18 09:12',
    type: 'Takas',
    from: '3',
    to: '4',
    amount: 312,
    status: 'Tamamlandı',
  },
  {
    id: 6,
    ts: '2026-05-17 19:55',
    type: 'Takas',
    from: '1',
    to: '5',
    amount: 78,
    status: 'Başarısız',
  },
];

// DEV2_API_READY: false — kategori bazlı bakiye mock'u (Dev2: /users/:userId/balances)
const INITIAL_BALANCES: Record<string, number> = {
  '1': 1480,
  '2': 320,
  '3': 210,
  '4': 95,
  '5': 740,
  '6': 410,
};

/* ───────── Helpers ───────── */
const fmt = (n: number, d = 2) =>
  n.toLocaleString('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtInt = (n: number) => Math.round(n).toLocaleString('tr-TR');
const shortName = (name: string) => name.split(' ')[0];

function calcSwap(amount: number, sell: MarketRate | undefined, buy: MarketRate | undefined) {
  if (!amount || !sell || !buy || sell.categoryId === buy.categoryId || buy.cpToXp <= 0) return 0;
  const xp = amount * sell.cpToXp;
  return xp / buy.cpToXp;
}

/* ───────── Sparkline ───────── */
function Sparkline({
  data,
  color,
  w = 96,
  h = 28,
}: {
  data: number[];
  color: string;
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
  const last = pts[pts.length - 1];

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      className="block overflow-visible"
      aria-hidden
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      <circle cx={last[0]} cy={last[1]} r={2.5} fill={color} />
    </svg>
  );
}

/* ───────── Rozetler ───────── */
function SurgeBadge() {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-gradient-to-br from-[#E8B86D] to-[#D99B3D] px-2 py-[3px] text-[10px] font-bold tracking-wider text-white shadow-[0_1px_4px_rgba(217,155,61,0.4)]">
      <svg width={9} height={9} viewBox="0 0 12 12" fill="none" aria-hidden>
        <path d="M6 1 L8 5 L11 5.5 L8.5 8 L9 11 L6 9.5 L3 11 L3.5 8 L1 5.5 L4 5 Z" fill="white" />
      </svg>
      SURGE
    </span>
  );
}

function SurgeDot() {
  return (
    <span
      aria-hidden
      className="inline-block h-1.5 w-1.5 rounded-full bg-gradient-to-br from-[#E8B86D] to-[#D99B3D]"
    />
  );
}

function CatChip({ id, size = 32 }: { id: string; size?: number }) {
  const meta = metaFor(id);
  return (
    <div
      className="grid shrink-0 place-items-center rounded-lg font-bold text-[#2A2A2A]"
      style={{
        width: size,
        height: size,
        background: meta.chip,
        fontSize: size * 0.42,
        letterSpacing: '-0.5px',
      }}
      aria-hidden
    >
      {meta.glyph}
    </div>
  );
}

/* ───────── Market Card ───────── */
function MarketCard({
  rate,
  selected,
  onClick,
}: {
  rate: MarketRate;
  selected: boolean;
  onClick: () => void;
}) {
  const meta = metaFor(rate.categoryId);
  const pos = rate.change24h >= 0;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex flex-col gap-3.5 rounded-xl border bg-white p-[18px] text-left transition-all duration-200',
        'hover:-translate-y-0.5 hover:shadow-[0_6px_20px_rgba(0,0,0,0.06),0_2px_6px_rgba(0,0,0,0.03)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5B8E8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFAF7]',
        selected
          ? 'border-[#C5B8E8] shadow-[0_0_0_2px_#F4F1FB,0_2px_8px_rgba(0,0,0,0.04)]'
          : 'border-[#ECE8E1] shadow-[0_2px_8px_rgba(0,0,0,0.04)]',
      )}
      aria-pressed={selected}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="-tracking-[0.1px] text-[13px] font-semibold text-[#2A2A2A]">
            {rate.categoryName}
          </span>
          <span className="text-[11px] font-medium text-[#9C9A95]">{meta.sub}</span>
        </div>
        {rate.surgeActive && <SurgeBadge />}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-[22px] font-semibold -tracking-[0.5px] text-[#2A2A2A] tabular-nums">
          {fmt(rate.cpToXp, 2)}
        </span>
        <span className="font-mono text-[11px] font-medium text-[#9C9A95]">
          1 CP = {fmt(rate.cpToXp, 2)} XP
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-[3px] font-mono text-[11px] font-semibold tabular-nums',
            pos ? 'bg-[#EAF3EE] text-[#6FA58D]' : 'bg-[#F7ECEC] text-[#D88A8A]',
          )}
        >
          {pos ? '▲' : '▼'} {pos ? '+' : ''}
          {rate.change24h.toFixed(1)}%
        </span>
        <Sparkline data={meta.spark} color={pos ? '#6FA58D' : '#D88A8A'} />
      </div>

      <div className="flex justify-between border-t border-[#ECE8E1] pt-3">
        <span className="text-[11px] text-[#9C9A95]">24s hacim</span>
        <span className="font-mono text-[11px] font-medium text-[#6B6B6B]">{meta.vol} CP</span>
      </div>
    </button>
  );
}

/* ───────── Kategori dropdown ───────── */
function CategoryDropdown({
  rates,
  value,
  onChange,
  disabledId,
  label,
}: {
  rates: MarketRate[];
  value: string;
  onChange: (id: string) => void;
  disabledId?: string;
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const current = rates.find((r) => r.categoryId === value);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, []);

  if (!current) return null;
  const currentMeta = metaFor(current.categoryId);

  return (
    <div ref={ref} className="relative">
      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9C9A95]">
        {label}
      </div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex w-full items-center justify-between rounded-[10px] border bg-[#FAFAF7] px-3.5 py-3 transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5B8E8]',
          open ? 'border-[#C5B8E8]' : 'border-[#ECE8E1]',
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <CatChip id={current.categoryId} />
          <div className="flex min-w-0 flex-col text-left">
            <span className="truncate text-sm font-semibold text-[#2A2A2A]">
              {current.categoryName}
            </span>
            <span className="font-mono text-[11px] text-[#9C9A95]">
              1 CP = {fmt(current.cpToXp, 2)} XP
            </span>
          </div>
        </div>
        <ChevronDown
          className={cn('h-3.5 w-3.5 text-[#6B6B6B] transition-transform', open && 'rotate-180')}
        />
        {/* unused but referenced to show meta is kept in sync */}
        <span className="sr-only">{currentMeta.sub}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 max-h-80 overflow-y-auto rounded-xl border border-[#ECE8E1] bg-white p-1.5 shadow-[0_16px_40px_rgba(40,30,70,0.10),0_2px_8px_rgba(0,0,0,0.04)]"
        >
          {rates.map((r) => {
            const disabled = r.categoryId === disabledId;
            const active = r.categoryId === value;
            const m = metaFor(r.categoryId);
            return (
              <li key={r.categoryId}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  disabled={disabled}
                  onClick={() => {
                    onChange(r.categoryId);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                    disabled
                      ? 'cursor-not-allowed opacity-35'
                      : 'cursor-pointer hover:bg-[#FAFAF7]',
                    active && 'bg-[#F4F1FB] hover:bg-[#F4F1FB]',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <CatChip id={r.categoryId} />
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-[13px] font-semibold text-[#2A2A2A]">
                        {r.categoryName}
                      </span>
                      <span className="text-[10.5px] text-[#9C9A95]">{m.sub}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {r.surgeActive && <SurgeDot />}
                    <span className="font-mono text-xs font-semibold text-[#2A2A2A]">
                      {fmt(r.cpToXp, 2)}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ───────── Swap Panel ───────── */
function SwapPanel({
  rates,
  sellId,
  setSellId,
  buyId,
  setBuyId,
  balances,
  onSwap,
}: {
  rates: MarketRate[];
  sellId: string;
  setSellId: (id: string) => void;
  buyId: string;
  setBuyId: (id: string) => void;
  balances: Record<string, number>;
  onSwap: (params: { from: string; to: string; amountIn: number; amountOut: number }) => void;
}) {
  const [amount, setAmount] = useState('100');
  const [pulse, setPulse] = useState(false);

  const sell = rates.find((r) => r.categoryId === sellId);
  const buy = rates.find((r) => r.categoryId === buyId);
  const numericAmount = parseFloat(amount) || 0;
  const output = calcSwap(numericAmount, sell, buy);
  const rate = sell && buy && buy.cpToXp > 0 ? sell.cpToXp / buy.cpToXp : 0;
  const maxBalance = balances[sellId] ?? 0;
  const insufficient = numericAmount > maxBalance;
  const sameCat = sellId === buyId;
  const disabled = !sell || !buy || !numericAmount || insufficient || sameCat;

  const flip = () => {
    setSellId(buyId);
    setBuyId(sellId);
    setPulse(true);
    setTimeout(() => setPulse(false), 400);
  };

  const doSwap = () => {
    if (disabled || !sell || !buy) return;
    onSwap({ from: sellId, to: buyId, amountIn: numericAmount, amountOut: output });
    setAmount('');
  };

  if (!sell || !buy) return null;

  const ctaLabel = sameCat
    ? 'Farklı kategori seç'
    : insufficient
      ? 'Yetersiz bakiye'
      : !numericAmount
        ? 'Miktar gir'
        : 'Takas Et';

  return (
    <aside className="sticky top-[84px] flex flex-col gap-[18px] rounded-2xl border border-[#ECE8E1] bg-white p-[22px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="m-0 text-lg font-bold -tracking-[0.3px] text-[#2A2A2A]">Takas</h2>
          <p className="mt-0.5 text-xs text-[#9C9A95]">Kategoriler arası anında dönüşüm</p>
        </div>
        <button
          type="button"
          aria-label="Takas ayarları"
          className="rounded-lg border border-[#ECE8E1] bg-[#FAFAF7] p-2 text-[#6B6B6B] hover:bg-[#F4F1FB] hover:text-[#5C4E7E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5B8E8]"
        >
          <Settings2 className="h-4 w-4" />
        </button>
      </header>

      <div className="relative flex flex-col gap-2.5">
        <CategoryDropdown
          rates={rates}
          value={sellId}
          onChange={setSellId}
          disabledId={buyId}
          label="Sat"
        />

        <div className="flex items-center justify-between rounded-[10px] border border-[#ECE8E1] bg-[#FAFAF7] px-3.5 py-3">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
            placeholder="0"
            aria-label="Takas edilecek miktar"
            className={cn(
              'w-full bg-transparent font-mono text-2xl font-semibold -tracking-[0.5px] outline-none tabular-nums',
              insufficient ? 'text-[#D88A8A]' : 'text-[#2A2A2A]',
            )}
          />
          <div className="flex flex-col items-end gap-1 whitespace-nowrap">
            <span className="text-[11px] font-medium text-[#9C9A95]">
              Mevcut:{' '}
              <span className="font-mono text-[#6B6B6B] tabular-nums">{fmtInt(maxBalance)} CP</span>
            </span>
            <button
              type="button"
              onClick={() => setAmount(String(maxBalance))}
              className="rounded-md bg-[#F4F1FB] px-2 py-[3px] text-[10px] font-bold tracking-[0.5px] text-[#5C4E7E] hover:bg-[#E6DEF6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5B8E8]"
            >
              MAX
            </button>
          </div>
        </div>

        <div className="relative z-[1] my-[-6px] flex justify-center">
          <button
            type="button"
            onClick={flip}
            aria-label="Yön değiştir"
            className={cn(
              'grid h-9 w-9 place-items-center rounded-full border border-[#ECE8E1] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-transform duration-300',
              'hover:bg-[#FAFAF7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5B8E8]',
              pulse ? 'rotate-180' : 'rotate-0',
            )}
          >
            <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M4 3v8M4 11l-2-2M4 11l2-2M10 11V3M10 3l-2 2M10 3l2 2"
                stroke="#9C8CC2"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <CategoryDropdown
          rates={rates}
          value={buyId}
          onChange={setBuyId}
          disabledId={sellId}
          label="Al"
        />

        <div className="rounded-xl border border-[#E6DEF6] bg-[#F4F1FB] p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-[0.6px] text-[#5C4E7E]">
              Tahmini Alım
            </span>
            {(buy.surgeActive || sell.surgeActive) && (
              <span className="font-mono text-[10.5px] font-semibold text-[#D99B3D]">
                +5% surge bonus
              </span>
            )}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="font-mono text-[28px] font-bold -tracking-[0.8px] text-[#2A2A2A] tabular-nums">
              {sameCat ? '—' : fmt(output, 2)}
            </span>
            <span className="text-[13px] font-semibold text-[#6B6B6B]">
              {shortName(buy.categoryName)} CP
            </span>
          </div>
        </div>
      </div>

      <dl className="flex flex-col gap-2 border-y border-[#ECE8E1] py-3.5">
        <Row
          label="Oran"
          value={
            <>
              <span className="font-mono tabular-nums">1</span> {shortName(sell.categoryName)}
              {' = '}
              <span className="font-mono tabular-nums">{fmt(rate, 4)}</span>{' '}
              {shortName(buy.categoryName)}
            </>
          }
        />
        {/* Mock — Dev2'nin gas fee tahmini henüz yok */}
        {/* DEV2_API_READY: false */}
        <Row
          label="Ağ ücreti"
          value={
            <>
              <span className="font-mono tabular-nums">0.00</span> XP
            </>
          }
        />
        <Row
          label="Slipaj toleransı"
          value={<span className="font-mono tabular-nums">%0.5</span>}
        />
      </dl>

      <button
        type="button"
        onClick={doSwap}
        disabled={disabled}
        className={cn(
          'rounded-xl px-0 py-3.5 text-sm font-bold tracking-[0.2px] transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5B8E8] focus-visible:ring-offset-2 focus-visible:ring-offset-white',
          disabled
            ? 'cursor-not-allowed bg-[#ECE8E1] text-[#9C9A95] shadow-none'
            : 'cursor-pointer bg-[#9C8CC2] text-white shadow-[0_2px_6px_rgba(156,140,194,0.25)] hover:bg-[#8472B0]',
        )}
      >
        {ctaLabel}
      </button>
    </aside>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <dt className="text-[#9C9A95]">{label}</dt>
      <dd className="font-medium text-[#6B6B6B]">{value}</dd>
    </div>
  );
}

/* ───────── KPI ───────── */
function Kpi({
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
    <div className="flex flex-col gap-0.5 border-l border-[#ECE8E1] px-4">
      <span className="text-[11px] font-medium uppercase tracking-[0.6px] text-[#9C9A95]">
        {label}
      </span>
      <div className="flex items-baseline gap-1">
        <span
          className={cn(
            'font-mono text-[18px] font-bold -tracking-[0.3px] tabular-nums',
            tone === 'pos' ? 'text-[#6FA58D]' : 'text-[#2A2A2A]',
          )}
        >
          {value}
        </span>
        <span className="text-[11px] text-[#9C9A95]">{unit}</span>
      </div>
    </div>
  );
}

/* ───────── İşlem geçmişi ───────── */
const FILTERS: { key: 'all' | Status; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'Tamamlandı', label: 'Tamamlandı' },
  { key: 'Beklemede', label: 'Beklemede' },
  { key: 'Başarısız', label: 'Başarısız' },
];

function HistoryTable({
  rows,
  rates,
  newId,
}: {
  rows: HistoryRow[];
  rates: MarketRate[];
  newId: number | null;
}) {
  const [filter, setFilter] = useState<'all' | Status>('all');
  const filtered = filter === 'all' ? rows : rows.filter((r) => r.status === filter);

  const nameFor = (id: string) =>
    rates.find((r) => r.categoryId === id)?.categoryName ?? metaFor(id).sub;

  return (
    <section className="overflow-hidden rounded-2xl border border-[#ECE8E1] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-[#ECE8E1] px-[22px] py-5">
        <div>
          <h3 className="m-0 text-base font-bold -tracking-[0.2px] text-[#2A2A2A]">
            İşlem geçmişi
          </h3>
          <p className="mt-0.5 text-xs text-[#9C9A95]">Son takas ve surge etkinliklerin</p>
        </div>
        <div
          role="tablist"
          aria-label="İşlem durumu filtresi"
          className="flex gap-1 rounded-[10px] border border-[#ECE8E1] bg-[#FAFAF7] p-1"
        >
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5B8E8]',
                  active
                    ? 'bg-white font-semibold text-[#2A2A2A] shadow-[0_1px_2px_rgba(0,0,0,0.04)]'
                    : 'font-medium text-[#6B6B6B] hover:text-[#2A2A2A]',
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <Th className="w-[20%]">Tarih</Th>
              <Th className="w-[14%]">Tip</Th>
              <Th className="w-[32%]">Kategori</Th>
              <Th className="w-[20%] text-right">Miktar</Th>
              <Th className="w-[14%] text-right">Durum</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr
                key={r.id}
                className={cn(
                  'transition-colors duration-700',
                  r.id === newId ? 'bg-[#F4F1FB]' : 'bg-transparent',
                )}
              >
                <Td>
                  <span className="font-mono text-xs text-[#6B6B6B] tabular-nums">{r.ts}</span>
                </Td>
                <Td>
                  {r.type === 'Surge' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[#E8B86D] to-[#D99B3D] px-2.5 py-[3px] text-[11px] font-bold text-white">
                      SURGE
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F1FB] px-2.5 py-[3px] text-[11px] font-semibold text-[#5C4E7E]">
                      Takas
                    </span>
                  )}
                </Td>
                <Td>
                  <div className="flex items-center gap-2">
                    <CatChip id={r.from} size={22} />
                    <span className="text-[13px] font-medium text-[#6B6B6B]">
                      {shortName(nameFor(r.from))}
                    </span>
                    <svg width={14} height={10} viewBox="0 0 14 10" fill="none" aria-hidden>
                      <path
                        d="M1 5h12m0 0L9 1m4 4L9 9"
                        stroke="#9C9A95"
                        strokeWidth={1.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <CatChip id={r.to} size={22} />
                    <span className="text-[13px] font-semibold text-[#2A2A2A]">
                      {shortName(nameFor(r.to))}
                    </span>
                  </div>
                </Td>
                <Td className="text-right">
                  <span className="font-mono text-[13px] font-semibold text-[#2A2A2A] tabular-nums">
                    {fmtInt(r.amount)}
                  </span>
                  <span className="ml-1 text-[11px] text-[#9C9A95]">CP</span>
                </Td>
                <Td className="text-right">
                  <StatusPill status={r.status} />
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="px-6 py-10 text-center text-[13px] text-[#9C9A95]">
            Bu filtrede henüz işlem yok.
          </div>
        )}
      </div>
    </section>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        'border-b border-[#ECE8E1] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.6px] text-[#9C9A95]',
        className,
      )}
    >
      {children}
    </th>
  );
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn('border-b border-[#ECE8E1] px-4 py-3.5 align-middle', className)}>
      {children}
    </td>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map: Record<Status, { bg: string; fg: string; dot: string }> = {
    Tamamlandı: { bg: '#EAF3EE', fg: '#6FA58D', dot: '#6FA58D' },
    Beklemede: { bg: '#FBF3E1', fg: '#B98532', dot: '#D99B3D' },
    Başarısız: { bg: '#F7ECEC', fg: '#D88A8A', dot: '#D88A8A' },
  };
  const s = map[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-[3px] text-[11px] font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      <span className="h-[5px] w-[5px] rounded-full" style={{ background: s.dot }} aria-hidden />
      {status}
    </span>
  );
}

/* ───────── Skeletonlar ───────── */
function MarketCardSkeleton() {
  return (
    <div className="flex h-[176px] animate-pulse flex-col gap-3 rounded-xl border border-[#ECE8E1] bg-white p-[18px] shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
      <div className="h-3 w-24 rounded bg-[#ECE8E1]" />
      <div className="h-2.5 w-32 rounded bg-[#ECE8E1]" />
      <div className="mt-auto h-6 w-20 rounded bg-[#ECE8E1]" />
      <div className="h-3 w-full rounded bg-[#ECE8E1]" />
    </div>
  );
}

/* ───────── Sayfa ───────── */
export default function TradePage() {
  const { rates, loading } = useMarketRates();
  const [sellId, setSellId] = useState<string>('1');
  const [buyId, setBuyId] = useState<string>('2');
  const [history, setHistory] = useState<HistoryRow[]>(INITIAL_HISTORY);
  const [balances, setBalances] = useState<Record<string, number>>(INITIAL_BALANCES);
  const [newId, setNewId] = useState<number | null>(null);

  // İlk yüklemede default seçimi rates'e göre güvenli hale getir
  useEffect(() => {
    if (rates.length === 0) return;
    if (!rates.some((r) => r.categoryId === sellId)) setSellId(rates[0].categoryId);
    if (!rates.some((r) => r.categoryId === buyId)) {
      const second = rates.find((r) => r.categoryId !== rates[0].categoryId)?.categoryId;
      if (second) setBuyId(second);
    }
  }, [rates, sellId, buyId]);

  const xpBalance = useMemo(
    () => rates.reduce((acc, r) => acc + (balances[r.categoryId] ?? 0) * r.cpToXp, 0),
    [rates, balances],
  );

  const surgeCount = useMemo(() => rates.filter((r) => r.surgeActive).length, [rates]);
  const totalVolume = useMemo(
    () =>
      rates.reduce((acc, r) => {
        const v = parseFloat(metaFor(r.categoryId).vol);
        return acc + (Number.isFinite(v) ? v : 0);
      }, 0),
    [rates],
  );

  const handleCardClick = (id: string) => {
    if (id === buyId) setBuyId(sellId);
    setSellId(id);
  };

  const handleSwap = ({
    from,
    to,
    amountIn,
    amountOut,
  }: {
    from: string;
    to: string;
    amountIn: number;
    amountOut: number;
  }) => {
    // DEV2_API_READY: false — gerçek swap Dev2'nin /exchange/swap endpoint'i ile tetiklenecek
    const now = new Date();
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate(),
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes(),
    ).padStart(2, '0')}`;
    const id = Date.now();
    const fromRate = rates.find((r) => r.categoryId === from);
    const toRate = rates.find((r) => r.categoryId === to);
    const isSurge = !!(fromRate?.surgeActive || toRate?.surgeActive);
    const row: HistoryRow = {
      id,
      ts,
      type: isSurge ? 'Surge' : 'Takas',
      from,
      to,
      amount: Math.round(amountIn),
      status: 'Tamamlandı',
    };
    setHistory((h) => [row, ...h]);
    setNewId(id);
    setTimeout(() => setNewId(null), 1800);
    setBalances((b) => ({
      ...b,
      [from]: Math.max(0, (b[from] ?? 0) - amountIn),
      [to]: (b[to] ?? 0) + amountOut,
    }));
    const fromName = fromRate ? shortName(fromRate.categoryName) : from;
    const toName = toRate ? shortName(toRate.categoryName) : to;
    toast.success(
      `Takas tamamlandı · ${fmtInt(amountIn)} ${fromName} → ${fmt(amountOut, 2)} ${toName}`,
    );
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-sans text-[#2A2A2A] antialiased">
      <main className="mx-auto max-w-[1320px] px-6 pb-16 pt-8 lg:px-8">
        {/* Section heading + KPIs */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="m-0 text-2xl font-bold -tracking-[0.5px] text-[#2A2A2A]">
                Kategori marketleri
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF3EE] px-2.5 py-[3px] text-[11px] font-semibold text-[#6FA58D]">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-[#6FA58D] shadow-[0_0_0_3px_rgba(111,165,141,0.2)]"
                  aria-hidden
                />
                Canlı
              </span>
            </div>
            <p className="mt-2 max-w-[540px] text-[13px] text-[#6B6B6B]">
              Kategoriler arası CP/XP oranları gerçek zamanlı güncellenir. Surge etkin marketler
              ekstra getiriyle takas edilir.
            </p>
          </div>
          <div className="flex pl-4">
            <Kpi
              label="Bugünkü hacim"
              value={totalVolume > 0 ? `${fmt(totalVolume, 1)}K` : '—'}
              unit="CP"
            />
            <Kpi label="Aktif surge" value={String(surgeCount)} unit="market" />
            <Kpi label="XP bakiyen" value={fmt(xpBalance / 1000, 1)} unit="K XP" tone="pos" />
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* Sol */}
          <div className="flex min-w-0 flex-col gap-7">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <MarketCardSkeleton key={i} />)
                : rates.map((rate) => (
                    <MarketCard
                      key={rate.categoryId}
                      rate={rate}
                      selected={rate.categoryId === sellId}
                      onClick={() => handleCardClick(rate.categoryId)}
                    />
                  ))}
            </div>

            {!loading && <HistoryTable rows={history} rates={rates} newId={newId} />}
          </div>

          {/* Sağ */}
          <div>
            {!loading && rates.length >= 2 && (
              <SwapPanel
                rates={rates}
                sellId={sellId}
                setSellId={setSellId}
                buyId={buyId}
                setBuyId={setBuyId}
                balances={balances}
                onSwap={handleSwap}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

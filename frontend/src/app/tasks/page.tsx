'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Flame,
  Lock,
  Loader2,
  Shield,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { ProtectedRoute } from '@/components/protected-route';
import { useMarketRates } from '@/hooks/use-market-rates';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────────────────────────────────────── *
 * Tipler
 * ────────────────────────────────────────────────────────────────────────── */
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
type UserStatus = 'PENDING' | 'VERIFIED' | null;

interface Task {
  id: string;
  title: string;
  description?: string;
  type: string;
  difficulty: Difficulty;
  rewardCp: number;
  durationMin?: number;
  category: { id: string; name: string; slug: string };
  userStatus?: UserStatus;
}

interface Completion {
  id: string;
  taskId: string;
  status: string;
  completedAt?: string | null;
  createdAt: string;
  task: { id: string; title: string; rewardCp: number; category: { id: string; name: string } };
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Sabitler & yardımcılar
 * ────────────────────────────────────────────────────────────────────────── */
const MIN_TIME_FACTOR = 0.3; // backend ile aynı (tasks.service.ts)

const DIFFICULTY_META: Record<Difficulty, { label: string; bg: string; fg: string; pip: string }> =
  {
    EASY: { label: 'Kolay', bg: '#EAF3EE', fg: '#3F7561', pip: '#6FA58D' },
    MEDIUM: { label: 'Orta', bg: '#FBF1DE', fg: '#8A6320', pip: '#C99A52' },
    HARD: { label: 'Zor', bg: '#F8E8E0', fg: '#93432A', pip: '#C9785C' },
  };

const TYPE_LABELS: Record<string, string> = {
  REVIEW_READ: 'İnceleme Okuma',
  PRODUCT_SHARE: 'Ürün Paylaşma',
  SURVEY: 'Anket',
  QUIZ: 'Quiz',
  REFERRAL: 'Davet',
};

// Kategori adına göre deterministik renk paleti (hash → palette index)
const CATEGORY_PALETTE = [
  { from: '#E8B86D', to: '#D99B3D' },
  { from: '#9C8CC2', to: '#7C6BAA' },
  { from: '#6FA58D', to: '#4F8870' },
  { from: '#C9785C', to: '#A85B43' },
  { from: '#5B86A8', to: '#3F6B8E' },
  { from: '#B58CC2', to: '#946DA1' },
  { from: '#C9A852', to: '#A88836' },
];
function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function paletteFor(name: string) {
  return CATEGORY_PALETTE[hashStr(name) % CATEGORY_PALETTE.length];
}

const fmtInt = (n: number) => Math.round(n).toLocaleString('tr-TR');
const formatMMSS = (totalSec: number) => {
  const s = Math.max(0, Math.ceil(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
};

function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (!data?.message) return fallback;
  return Array.isArray(data.message) ? data.message[0] : data.message;
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Görsel atomlar
 * ────────────────────────────────────────────────────────────────────────── */
function CategoryIcon({ name, size = 40 }: { name: string; size?: number }) {
  const palette = paletteFor(name);
  const letter = (name?.[0] ?? '?').toUpperCase();
  return (
    <div
      className="grid shrink-0 place-items-center font-extrabold text-white"
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        background: `linear-gradient(135deg, ${palette.from}, ${palette.to})`,
        fontSize: size * 0.4,
        letterSpacing: '-0.01em',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.18), 0 6px 14px -6px rgba(0,0,0,0.2)',
      }}
      aria-hidden
    >
      {letter}
    </div>
  );
}

function DifficultyBadge({ d }: { d: Difficulty }) {
  const meta = DIFFICULTY_META[d] ?? DIFFICULTY_META.EASY;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11.5px] font-bold tracking-[0.02em]"
      style={{ background: meta.bg, color: meta.fg }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.pip }} aria-hidden />
      {meta.label}
    </span>
  );
}

function FlameIcon({ tone = 'amber' }: { tone?: 'amber' | 'green' }) {
  const bg =
    tone === 'green'
      ? 'radial-gradient(circle at 50% 70%, #C6DBCF, #6FA58D)'
      : 'radial-gradient(circle at 50% 70%, #FFE3B5, #E8B86D 60%, #D99B3D)';
  return (
    <span
      className="inline-grid h-[22px] w-[22px] place-items-center rounded-md text-xs text-white"
      style={{ background: bg }}
      aria-hidden
    >
      🔥
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Stats bar
 * ────────────────────────────────────────────────────────────────────────── */
const WEEKLY_GOAL = 5; // tamamlanması beklenen haftalık görev sayısı
// DEV2_API_READY: false — streak verisi /users/:userId/streak endpoint'inden gelecek
const MOCK_STREAK_DAYS = 7;

function StatsBar({
  totalCp,
  completedCount,
  totalTasks,
}: {
  totalCp: number;
  completedCount: number;
  totalTasks: number;
}) {
  const goalProgress = Math.min(100, (completedCount / WEEKLY_GOAL) * 100);
  return (
    <section className="mb-7 grid grid-cols-1 gap-0 rounded-[20px] border border-[#ECE8E1] bg-white p-1 shadow-[0_1px_0_rgba(0,0,0,0.02),0_24px_40px_-28px_rgba(40,30,10,0.18)] sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.4fr]">
      <Stat
        label="Toplam Kazanım"
        icon={<Trophy className="h-3 w-3" />}
        value={
          <>
            <span className="font-mono tabular-nums text-[#D99B3D]">{fmtInt(totalCp)}</span>
            <span className="ml-1.5 text-sm font-semibold text-[#8A8A85]">CP</span>
          </>
        }
        foot={
          <>
            <span className="font-semibold text-[#6FA58D]">+{fmtInt(totalCp)}</span> bu hafta
          </>
        }
      />
      <Stat
        label="Tamamlanan"
        icon={<CheckCircle2 className="h-3 w-3" />}
        value={
          <>
            <span className="font-mono tabular-nums">{completedCount}</span>
            <span className="ml-1 text-sm font-semibold text-[#8A8A85]">/ {totalTasks}</span>
          </>
        }
        foot="Aktif görevler arasından"
      />
      <Stat
        label="Streak"
        icon={<Flame className="h-3 w-3" />}
        value={
          <>
            <span className="text-2xl">🔥</span>
            <span className="font-mono tabular-nums">{MOCK_STREAK_DAYS}</span>
            <span className="ml-1 text-sm font-semibold text-[#8A8A85]">gün</span>
          </>
        }
        foot="Devam ettir, çarpan büyüsün"
      />
      <div className="relative px-6 py-5 sm:[&:not(:first-child)]:before:absolute sm:[&:not(:first-child)]:before:left-0 sm:[&:not(:first-child)]:before:top-[18px] sm:[&:not(:first-child)]:before:bottom-[18px] sm:[&:not(:first-child)]:before:w-px sm:[&:not(:first-child)]:before:bg-[#ECE8E1] sm:[&:not(:first-child)]:before:content-['']">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8A8A85]">
          <Target className="h-3 w-3" />
          Haftalık Hedef
        </div>
        <div className="mt-2.5 flex items-baseline gap-1.5 text-[34px] font-bold leading-none -tracking-[0.02em]">
          <span className="font-mono tabular-nums">{completedCount}</span>
          <span className="text-sm font-semibold text-[#8A8A85]">/ {WEEKLY_GOAL} görev</span>
        </div>
        <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-[#F1ECE2]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#E8B86D] to-[#D99B3D] shadow-[0_0_0_1px_rgba(217,155,61,0.2),0_0_14px_0_rgba(255,216,155,0.7)] transition-[width] duration-700 ease-out"
            style={{ width: `${goalProgress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-[#8A8A85]">
          <span>
            <b className="font-bold text-[#2A2A2A]">{Math.round(goalProgress)}%</b> tamamlandı
          </span>
          <span>Pazar 23:59'da yenilenir</span>
        </div>
      </div>
    </section>
  );
}

function Stat({
  label,
  icon,
  value,
  foot,
}: {
  label: string;
  icon?: React.ReactNode;
  value: React.ReactNode;
  foot?: React.ReactNode;
}) {
  return (
    <div className="relative px-6 py-5 sm:[&:not(:first-child)]:before:absolute sm:[&:not(:first-child)]:before:left-0 sm:[&:not(:first-child)]:before:top-[18px] sm:[&:not(:first-child)]:before:bottom-[18px] sm:[&:not(:first-child)]:before:w-px sm:[&:not(:first-child)]:before:bg-[#ECE8E1] sm:[&:not(:first-child)]:before:content-['']">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[#8A8A85]">
        {icon}
        {label}
      </div>
      <div className="mt-2.5 flex items-baseline gap-1 text-[34px] font-bold leading-none -tracking-[0.02em] text-[#2A2A2A]">
        {value}
      </div>
      {foot && <div className="mt-2 text-xs text-[#8A8A85]">{foot}</div>}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Surge banner
 * ────────────────────────────────────────────────────────────────────────── */
function SurgeBanner({
  count,
  endsAt,
  categoryNames,
}: {
  count: number;
  endsAt: string | null;
  categoryNames: string[];
}) {
  const [, force] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const t = setInterval(() => force((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [endsAt]);

  const remaining = endsAt ? Math.max(0, (new Date(endsAt).getTime() - Date.now()) / 1000) : 0;
  const cats = categoryNames.slice(0, 3).join(', ');
  return (
    <div className="relative mb-[22px] flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border border-[#F0E1C4] bg-[radial-gradient(60%_120%_at_100%_0%,rgba(255,216,155,0.6),transparent_60%),linear-gradient(135deg,#FFF6E8_0%,#FCEBC8_100%)] px-[22px] py-[18px]">
      <div
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-[0_8px_18px_-8px_rgba(217,155,61,0.55)]"
        style={{ background: 'linear-gradient(135deg, #E8B86D, #D99B3D)' }}
        aria-hidden
      >
        <Sparkles className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="m-0 text-[15px] font-extrabold text-[#2A2A2A]">
          {count} kategoride Surge etkin · 2x CP
        </h4>
        <p className="mt-0.5 truncate text-[13px] text-[#5B5B57]">
          {cats || 'Çoklu kategori'} · Bu kategorilerde tamamlanan görevlerden ekstra ödül kazan.
        </p>
      </div>
      {endsAt && (
        <div className="ml-auto inline-flex items-center gap-1.5 rounded-[10px] border border-[#F0E1C4] bg-white px-3 py-2 text-[13px] font-bold">
          <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#8A8A85]">
            Biter
          </span>
          <span className="font-mono tabular-nums text-[#D99B3D]">{formatMMSS(remaining)}</span>
        </div>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Filtre tabs + sort
 * ────────────────────────────────────────────────────────────────────────── */
type FilterKey = 'all' | 'available' | 'completed' | 'locked';
type SortKey = 'reward-desc' | 'duration-asc' | 'difficulty-asc' | 'surge-first';

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'surge-first', label: 'Önce Surge' },
  { key: 'reward-desc', label: 'Yüksek ödül' },
  { key: 'duration-asc', label: 'Kısa süreli' },
  { key: 'difficulty-asc', label: 'Kolaydan zora' },
];

function FilterRow({
  filter,
  setFilter,
  counts,
  sort,
  setSort,
}: {
  filter: FilterKey;
  setFilter: (f: FilterKey) => void;
  counts: Record<FilterKey, number>;
  sort: SortKey;
  setSort: (s: SortKey) => void;
}) {
  const filters: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'Tümü' },
    { key: 'available', label: 'Mevcut' },
    { key: 'completed', label: 'Tamamlandı' },
    { key: 'locked', label: 'Kilitli' },
  ];
  return (
    <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
      <div
        role="tablist"
        aria-label="Görev filtresi"
        className="inline-flex gap-1 rounded-xl border border-[#ECE8E1] bg-white p-1"
      >
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setFilter(f.key)}
              className={cn(
                'inline-flex select-none items-center gap-2 rounded-[9px] px-3.5 py-2 text-[13px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B86D]',
                active
                  ? 'bg-[#2A2A2A] text-white shadow-[0_1px_2px_rgba(0,0,0,0.1)]'
                  : 'text-[#5B5B57] hover:text-[#2A2A2A]',
              )}
            >
              {f.label}
              <span
                className={cn(
                  'rounded-full px-[7px] py-px text-[11px]',
                  active ? 'bg-white/[.18] text-white/90' : 'bg-black/[.06] text-[#5B5B57]',
                )}
              >
                {counts[f.key]}
              </span>
            </button>
          );
        })}
      </div>

      <label className="inline-flex items-center gap-2 text-[13px] text-[#5B5B57]">
        <span>Sırala:</span>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="cursor-pointer appearance-none rounded-[10px] border border-[#ECE8E1] bg-white py-1.5 pl-3 pr-8 text-[13px] font-semibold text-[#2A2A2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B86D]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'><path d='M3 4.5l3 3 3-3' stroke='%232A2A2A' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 10px center',
          }}
        >
          {SORTS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Task Card
 * ────────────────────────────────────────────────────────────────────────── */
type CardState = 'idle' | 'in-progress' | 'completed' | 'locked';

interface TaskCardProps {
  task: Task;
  state: CardState;
  surgeMultiplier?: number;
  startedAt?: string | null;
  busy: boolean;
  onStart: () => void;
  onComplete: () => void;
}

function TaskCard({
  task,
  state,
  surgeMultiplier,
  startedAt,
  busy,
  onStart,
  onComplete,
}: TaskCardProps) {
  // Bot-guard: tamamlama için minimum bekleme
  const minSec = (task.durationMin ?? 0) * 60 * MIN_TIME_FACTOR;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (state !== 'in-progress' || !startedAt) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [state, startedAt]);

  const elapsedSec = startedAt ? Math.max(0, (now - new Date(startedAt).getTime()) / 1000) : 0;
  const canComplete = state === 'in-progress' && elapsedSec >= minSec;
  const progressPct =
    state === 'in-progress' && minSec > 0
      ? Math.min(100, (elapsedSec / minSec) * 100)
      : state === 'completed'
        ? 100
        : 0;

  const isSurge = !!surgeMultiplier && state !== 'completed' && state !== 'locked';

  return (
    <article
      className={cn(
        'relative flex flex-col gap-3.5 overflow-hidden rounded-2xl border p-[18px] transition-all duration-200',
        'shadow-[0_1px_0_rgba(0,0,0,0.02)] hover:-translate-y-0.5 hover:shadow-[0_1px_0_rgba(0,0,0,0.02),0_18px_32px_-24px_rgba(40,30,10,0.22)]',
        state === 'locked' && 'border-[#ECE8E1] bg-[#F8F6F0]',
        state === 'completed' && 'border-[#ECE8E1] bg-[#FAFCFB]',
        state !== 'locked' &&
          state !== 'completed' &&
          !isSurge &&
          'border-[#ECE8E1] bg-white hover:border-[#DDD7CC]',
        isSurge &&
          'border-transparent bg-white shadow-[0_1px_0_rgba(0,0,0,0.02),0_20px_40px_-20px_rgba(217,155,61,0.4)]',
      )}
      style={
        isSurge
          ? {
              backgroundImage:
                'linear-gradient(#fff,#fff), linear-gradient(135deg, #E8B86D, #D99B3D 50%, #FFD89B)',
              backgroundOrigin: 'border-box',
              backgroundClip: 'padding-box, border-box',
              borderWidth: 1.5,
              borderStyle: 'solid',
            }
          : undefined
      }
    >
      {isSurge && (
        <span
          className="absolute right-3.5 top-3.5 inline-flex items-center gap-1 rounded-md border border-[#F0E1C4] bg-[#FFF6E8] px-2 py-1 text-[10px] font-extrabold uppercase tracking-[0.1em] text-[#D99B3D]"
          aria-label={`Surge ${surgeMultiplier}x bonus`}
        >
          <Sparkles className="h-3 w-3" /> Surge {surgeMultiplier}x
        </span>
      )}

      <header className="flex items-start gap-3">
        <CategoryIcon name={task.category.name} />
        <div className="min-w-0 flex-1 pr-16">
          <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-[#8A8A85]">
            {task.category.name} · {TYPE_LABELS[task.type] ?? task.type}
          </div>
          <h3
            className={cn(
              'mt-0.5 line-clamp-2 text-base font-bold leading-snug -tracking-[0.01em]',
              state === 'locked' ? 'text-[#5B5B57]' : 'text-[#2A2A2A]',
            )}
          >
            {task.title}
          </h3>
        </div>
      </header>

      {task.description && (
        <p className="line-clamp-2 min-h-[38px] text-[13px] leading-[1.5] text-[#5B5B57]">
          {task.description}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <DifficultyBadge d={task.difficulty} />
        {task.durationMin != null && (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8A8A85]">
            <Clock className="h-3.5 w-3.5" /> ~{task.durationMin} dk
          </span>
        )}
      </div>

      {/* Reward kutusu */}
      <div
        className={cn(
          'flex items-center justify-between gap-2.5 rounded-[10px] border px-3 py-2.5',
          state === 'completed' && 'border-[#D7E6DD] bg-[#EAF3EE]',
          state === 'locked' && 'border-[#E2DDD0] bg-[#F1EEE7]',
          state !== 'completed' && state !== 'locked' && 'border-[#F4E4C5] bg-[#FFF6E8]',
        )}
      >
        <div className="flex items-center gap-2 font-bold">
          <FlameIcon tone={state === 'completed' ? 'green' : 'amber'} />
          <span
            className={cn(
              'text-base -tracking-[0.01em]',
              state === 'completed' && 'text-[#3F7561]',
              state === 'locked' && 'text-[#8A8A85]',
              state !== 'completed' && state !== 'locked' && 'text-[#D99B3D]',
            )}
          >
            {fmtInt(
              task.rewardCp * (surgeMultiplier && state !== 'completed' ? surgeMultiplier : 1),
            )}
          </span>
          <span className="text-[11px] font-semibold text-[#8A8A85]">CP</span>
        </div>
        {isSurge && (
          <span
            className="rounded-md px-1.5 py-1 text-[10.5px] font-extrabold tracking-[0.04em] text-white"
            style={{ background: 'linear-gradient(135deg, #E8B86D, #D99B3D)' }}
          >
            +{surgeMultiplier}x
          </span>
        )}
      </div>

      {/* Progress bar (in-progress) */}
      {state === 'in-progress' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-[11px] font-semibold text-[#8A8A85]">
            <span>
              {canComplete ? (
                <>
                  <b className="font-bold text-[#3F7561]">Tamamlanmaya hazır</b>
                </>
              ) : (
                <>
                  Doğrulama:{' '}
                  <b className="font-bold text-[#2A2A2A]">{formatMMSS(minSec - elapsedSec)}</b>{' '}
                  kaldı
                </>
              )}
            </span>
            <span className="font-mono tabular-nums">%{Math.round(progressPct)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-[#F1ECE2]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#E8B86D] to-[#D99B3D] transition-[width] duration-700 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto flex flex-wrap items-center gap-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-[7px] border border-[#ECE8E1] bg-[#F6F3EC] px-2 py-1.5 text-[11px] font-semibold text-[#8A8A85]">
          <Shield className="h-3 w-3" /> Min.{' '}
          {Math.max(1, Math.round((task.durationMin ?? 0) * MIN_TIME_FACTOR))} dk bot koruması
        </span>

        {state === 'idle' && (
          <button
            type="button"
            onClick={onStart}
            disabled={busy}
            className="ml-auto inline-flex min-w-[116px] items-center justify-center gap-1.5 rounded-[10px] bg-[#E8B86D] px-4 py-2.5 text-[13px] font-bold text-[#2A2A2A] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_14px_-6px_rgba(217,155,61,0.5)] transition-all hover:-translate-y-px hover:bg-[#D99B3D] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D99B3D] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-progress disabled:opacity-70"
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                Başlat <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        )}

        {state === 'in-progress' && (
          <button
            type="button"
            onClick={onComplete}
            disabled={busy}
            className={cn(
              'ml-auto inline-flex min-w-[116px] items-center justify-center gap-1.5 rounded-[10px] px-4 py-2.5 text-[13px] font-bold transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed',
              canComplete
                ? 'bg-[#E8B86D] text-[#2A2A2A] shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_6px_14px_-6px_rgba(217,155,61,0.5)] hover:-translate-y-px hover:bg-[#D99B3D] hover:text-white focus-visible:ring-[#D99B3D]'
                : 'border border-[#F0E1C4] bg-white text-[#D99B3D] hover:bg-[#FFF6E8] focus-visible:ring-[#E8B86D]',
              busy && 'cursor-progress opacity-70',
            )}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : canComplete ? (
              <>
                Tamamla <CheckCircle2 className="h-4 w-4" />
              </>
            ) : (
              <>
                Devam Et <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        )}

        {state === 'completed' && (
          <span className="ml-auto inline-flex min-w-[116px] items-center justify-center gap-2 rounded-[10px] border border-[#C6DBCF] bg-[#EAF3EE] px-4 py-2.5 text-[13px] font-bold text-[#3F7561]">
            <span className="grid h-4 w-4 place-items-center rounded-full bg-[#6FA58D] text-[10px] text-white">
              ✓
            </span>
            Tamamlandı
          </span>
        )}

        {state === 'locked' && (
          <span className="ml-auto inline-flex min-w-[116px] cursor-not-allowed items-center justify-center gap-1.5 rounded-[10px] bg-[#ECE8E1] px-4 py-2.5 text-[13px] font-bold text-[#8A8A85]">
            <Lock className="h-3.5 w-3.5 opacity-80" /> Kilitli
          </span>
        )}
      </footer>
    </article>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Skeleton
 * ────────────────────────────────────────────────────────────────────────── */
function CardSkeleton() {
  return (
    <div className="flex h-[268px] animate-pulse flex-col gap-3.5 rounded-2xl border border-[#ECE8E1] bg-white p-[18px]">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-[#ECE8E1]" />
        <div className="flex-1 space-y-2 pr-16 pt-1">
          <div className="h-2.5 w-32 rounded bg-[#ECE8E1]" />
          <div className="h-4 w-full rounded bg-[#ECE8E1]" />
          <div className="h-4 w-3/4 rounded bg-[#ECE8E1]" />
        </div>
      </div>
      <div className="h-3 w-full rounded bg-[#ECE8E1]" />
      <div className="h-3 w-5/6 rounded bg-[#ECE8E1]" />
      <div className="mt-auto h-12 rounded-[10px] bg-[#ECE8E1]" />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Sayfa
 * ────────────────────────────────────────────────────────────────────────── */
function TasksPageInner() {
  const { isAuthenticated } = useAuthStore();
  const { rates } = useMarketRates();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sort, setSort] = useState<SortKey>('surge-first');

  const refresh = async () => {
    const [tasksRes, compRes] = await Promise.all([
      api.get('/tasks'),
      api.get('/tasks/completions'),
    ]);
    setTasks(tasksRes.data);
    setCompletions(compRes.data);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    refresh().finally(() => setLoading(false));
  }, [isAuthenticated]);

  // Surge map: kategori adı → surge multiplier
  const surgeByCategoryName = useMemo(() => {
    const m = new Map<string, number>();
    rates.forEach((r) => {
      if (r.surgeActive) m.set(r.categoryName, r.surgeMultiplier);
    });
    return m;
  }, [rates]);

  // PENDING tasks için started timestamp lookup
  const startedAtByTaskId = useMemo(() => {
    const m = new Map<string, string>();
    completions.forEach((c) => {
      if (c.status === 'PENDING') m.set(c.taskId, c.createdAt);
    });
    return m;
  }, [completions]);

  // Toplam kazanılan CP — VERIFIED completions
  const totalCp = useMemo(
    () =>
      completions
        .filter((c) => c.status === 'VERIFIED')
        .reduce((acc, c) => acc + (c.task?.rewardCp ?? 0), 0),
    [completions],
  );

  // Surge banner verisi
  const surgeRates = rates.filter((r) => r.surgeActive);
  const earliestSurgeEnd = surgeRates
    .map((r) => r.surgeEndsAt)
    .filter((x): x is string => !!x)
    .sort()[0];

  // Görevleri durumlarına göre kategorize et
  const annotated = useMemo(() => {
    return tasks.map((t) => {
      const status = t.userStatus ?? null;
      // DEV2_API_READY: false — "kilitli" görev mantığı backend'de yok; tüm tasks unlock kabul ediliyor
      const cardState: CardState =
        status === 'VERIFIED' ? 'completed' : status === 'PENDING' ? 'in-progress' : 'idle';
      return { task: t, state: cardState };
    });
  }, [tasks]);

  const counts: Record<FilterKey, number> = useMemo(
    () => ({
      all: annotated.length,
      available: annotated.filter((a) => a.state === 'idle' || a.state === 'in-progress').length,
      completed: annotated.filter((a) => a.state === 'completed').length,
      // DEV2_API_READY: false — kilitli görev sayımı için kaynak yok, 0 gösteriliyor
      locked: 0,
    }),
    [annotated],
  );

  const visible = useMemo(() => {
    let list = annotated;
    if (filter === 'available')
      list = list.filter((a) => a.state === 'idle' || a.state === 'in-progress');
    if (filter === 'completed') list = list.filter((a) => a.state === 'completed');
    if (filter === 'locked') list = [];

    const arr = [...list];
    arr.sort((a, b) => {
      const aSurge = surgeByCategoryName.has(a.task.category.name) ? 1 : 0;
      const bSurge = surgeByCategoryName.has(b.task.category.name) ? 1 : 0;
      switch (sort) {
        case 'surge-first':
          if (aSurge !== bSurge) return bSurge - aSurge;
          return b.task.rewardCp - a.task.rewardCp;
        case 'reward-desc':
          return b.task.rewardCp - a.task.rewardCp;
        case 'duration-asc':
          return (a.task.durationMin ?? 9999) - (b.task.durationMin ?? 9999);
        case 'difficulty-asc': {
          const order: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];
          return order.indexOf(a.task.difficulty) - order.indexOf(b.task.difficulty);
        }
      }
    });
    return arr;
  }, [annotated, filter, sort, surgeByCategoryName]);

  /* ───────── handlers ───────── */
  const handleStart = async (task: Task) => {
    setBusyId(task.id);
    try {
      await api.post(`/tasks/${task.id}/start`);
      toast.success(`${task.title} başlatıldı`, { description: 'Bot koruması süresi başladı.' });
      await refresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Görev başlatılamadı'));
    } finally {
      setBusyId(null);
    }
  };

  const handleComplete = async (task: Task) => {
    setBusyId(task.id);
    try {
      const { data } = await api.post(`/tasks/${task.id}/complete`);
      const earned = data?.rewardCp ?? task.rewardCp;
      const cat = data?.categoryName ?? task.category.name;
      toast.success(`+${fmtInt(earned)} CP (${cat}) kazandın!`, {
        duration: 5000,
        description: 'Tebrikler — kategori bakiyene eklendi.',
      });
      await refresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Görev tamamlanamadı'));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-sans text-[#2A2A2A] antialiased [font-feature-settings:'ss01','cv11']">
      <main className="mx-auto max-w-[1280px] px-6 pb-20 pt-9 lg:px-8">
        {/* Heading */}
        <header className="mb-6 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="m-0 text-[36px] font-extrabold leading-[1.05] -tracking-[0.025em] text-[#2A2A2A]">
              Görevler
            </h1>
            <p className="mt-2 max-w-[520px] text-[15px] text-[#5B5B57]">
              Görevleri tamamla, kategori CP'si kazan. Surge etkin marketlerde ödüller iki kat —
              hızlı davran.
            </p>
          </div>
          <div className="inline-flex items-center gap-2.5 rounded-full border border-[#ECE8E1] bg-white px-3.5 py-2 text-[13px] font-medium text-[#5B5B57]">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#6FA58D]" aria-hidden />
            <b className="font-bold text-[#2A2A2A]">Hafta 21</b>
            <span className="text-[#8A8A85]">·</span>
            <span>19 May – 25 May</span>
          </div>
        </header>

        {/* Stats */}
        <StatsBar totalCp={totalCp} completedCount={counts.completed} totalTasks={counts.all} />

        {/* Surge banner */}
        {surgeRates.length > 0 && (
          <SurgeBanner
            count={surgeRates.length}
            endsAt={earliestSurgeEnd ?? null}
            categoryNames={surgeRates.map((r) => r.categoryName)}
          />
        )}

        {/* Filter row */}
        <FilterRow
          filter={filter}
          setFilter={setFilter}
          counts={counts}
          sort={sort}
          setSort={setSort}
        />

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#DDD7CC] bg-white px-6 py-16 text-center text-[#5B5B57]">
            <h4 className="mb-1.5 text-base font-bold text-[#2A2A2A]">
              {filter === 'completed'
                ? 'Henüz tamamlanan görev yok'
                : filter === 'locked'
                  ? 'Şu an kilitli görev bulunmuyor'
                  : 'Bu filtrede görev yok'}
            </h4>
            <p className="text-sm">
              {filter === 'completed'
                ? 'İlk görevini tamamla, kazanımların burada görünsün.'
                : 'Farklı bir filtre dene veya yeni görevler için bekle.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-3">
            {visible.map(({ task, state }) => (
              <TaskCard
                key={task.id}
                task={task}
                state={state}
                surgeMultiplier={surgeByCategoryName.get(task.category.name)}
                startedAt={startedAtByTaskId.get(task.id) ?? null}
                busy={busyId === task.id}
                onStart={() => handleStart(task)}
                onComplete={() => handleComplete(task)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <TasksPageInner />
    </ProtectedRoute>
  );
}

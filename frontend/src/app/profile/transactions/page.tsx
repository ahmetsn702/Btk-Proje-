'use client';

import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeftRight, ArrowUp, Loader2, Receipt } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';

// DEV2_API_READY: false — gerçek veriler GET /users/:userId/transactions'tan gelecek
const DEV2_API_READY = false;

type TxType = 'TASK_REWARD' | 'SWAP_CP_TO_XP' | 'XP_SPENT';

interface Transaction {
  id: string;
  type: TxType;
  amount: number;
  token: string; // örn. "CP:Elektronik" veya "XP"
  description: string;
  createdAt: string;
}

const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'tx-01',
    type: 'TASK_REWARD',
    amount: 15,
    token: 'CP:Elektronik',
    description: 'Ürün incelemesi okuma görevi',
    createdAt: '2026-05-13T10:00:00Z',
  },
  {
    id: 'tx-02',
    type: 'SWAP_CP_TO_XP',
    amount: 10,
    token: 'XP',
    description: '50 Elektronik CP → 10 XP takas',
    createdAt: '2026-05-12T14:30:00Z',
  },
  {
    id: 'tx-03',
    type: 'TASK_REWARD',
    amount: 20,
    token: 'CP:Giyim',
    description: 'Anket doldurma görevi',
    createdAt: '2026-05-11T09:15:00Z',
  },
  {
    id: 'tx-04',
    type: 'XP_SPENT',
    amount: 5,
    token: 'XP',
    description: 'Sipariş #ABC12345 indirim',
    createdAt: '2026-05-10T16:45:00Z',
  },
  {
    id: 'tx-05',
    type: 'SWAP_CP_TO_XP',
    amount: 8,
    token: 'XP',
    description: '40 Giyim CP → 8 XP takas',
    createdAt: '2026-05-09T11:20:00Z',
  },
  {
    id: 'tx-06',
    type: 'TASK_REWARD',
    amount: 10,
    token: 'CP:Spor',
    description: 'Quiz çözme görevi',
    createdAt: '2026-05-08T13:00:00Z',
  },
  {
    id: 'tx-07',
    type: 'XP_SPENT',
    amount: 12,
    token: 'XP',
    description: 'Sipariş #DEF67890 indirim',
    createdAt: '2026-05-07T18:05:00Z',
  },
];

const TYPE_META: Record<TxType, { label: string; color: string; bg: string }> = {
  TASK_REWARD: { label: 'Görev Kazancı', color: '#6FA58D', bg: '#EAF3EE' },
  SWAP_CP_TO_XP: { label: 'Takas', color: '#9C8CC2', bg: '#EFE9F7' },
  XP_SPENT: { label: 'XP Harcama', color: '#E28D7A', bg: '#F8E8E0' },
};

const FILTERS: { key: 'all' | TxType; label: string }[] = [
  { key: 'all', label: 'Tümü' },
  { key: 'TASK_REWARD', label: 'Kazanım' },
  { key: 'SWAP_CP_TO_XP', label: 'Takas' },
  { key: 'XP_SPENT', label: 'Harcama' },
];

function txIcon(type: TxType) {
  if (type === 'TASK_REWARD') return ArrowDown;
  if (type === 'SWAP_CP_TO_XP') return ArrowLeftRight;
  return ArrowUp;
}

export default function ProfileTransactionsPage() {
  const { user } = useAuthStore();
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]['key']>('all');

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    if (DEV2_API_READY) {
      // TODO: api.get(`/users/${user.id}/transactions`).then(res => setTxs(res.data));
    } else {
      setTxs(MOCK_TRANSACTIONS);
    }
    setLoading(false);
  }, [user]);

  const filtered = filter === 'all' ? txs : txs.filter((t) => t.type === filter);

  const totalIn = filtered.filter((t) => t.type !== 'XP_SPENT').reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter((t) => t.type === 'XP_SPENT').reduce((s, t) => s + t.amount, 0);

  return (
    <>
      <ProfileLightThemeStyles />
      <div className="text-[#2A2A2A]">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1
              className="text-[28px] font-bold tracking-tight text-[#2A2A2A]"
              style={{
                fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
              }}
            >
              İşlem Geçmişi
            </h1>
            <p className="mt-1 text-[13.5px] text-[#5C5953]">
              Görev kazançları, takas işlemleri ve XP harcamaları.
            </p>
          </div>
          {!loading && filtered.length > 0 && (
            <div className="flex items-center gap-3 text-[12.5px]">
              <span className="rounded-full bg-[#EAF3EE] px-2.5 py-1 font-semibold text-[#3F7561]">
                +{totalIn} kazanım
              </span>
              {totalOut > 0 && (
                <span className="rounded-full bg-[#F8E8E0] px-2.5 py-1 font-semibold text-[#93432A]">
                  −{totalOut} harcama
                </span>
              )}
            </div>
          )}
        </header>

        <section className="rounded-[12px] border border-[#ECE8E1] bg-white shadow-[0_1px_2px_rgba(40,32,26,0.04)]">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECE8E1] px-5 py-4">
            <h2 className="text-[16px] font-bold text-[#2A2A2A]">Tüm İşlemler</h2>
            <div
              role="tablist"
              aria-label="İşlem tipi filtresi"
              className="inline-flex flex-wrap gap-1 rounded-[10px] bg-[#F4F1EA] p-1"
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
                      'rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold transition-colors',
                      active
                        ? 'bg-white text-[#2A2A2A] shadow-[0_1px_2px_rgba(40,32,26,0.08)]'
                        : 'text-[#5C5953] hover:text-[#2A2A2A]',
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </header>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-[13.5px] text-[#5C5953]">
              <Loader2 className="h-4 w-4 animate-spin" /> Yükleniyor…
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <Receipt className="h-10 w-10 text-[#9A9A93]" />
              <p className="text-[13.5px] text-[#5C5953]">Bu kategoride henüz işlem bulunmuyor.</p>
            </div>
          ) : (
            <ul className="divide-y divide-[#ECE8E1]" role="tabpanel">
              {filtered.map((tx) => {
                const meta = TYPE_META[tx.type];
                const isNegative = tx.type === 'XP_SPENT';
                const Icon = txIcon(tx.type);
                return (
                  <li
                    key={tx.id}
                    className="flex items-center gap-4 bg-white px-5 py-3.5 transition-colors hover:bg-[#FCFAF6]"
                  >
                    <div
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-full"
                      style={{ background: meta.bg, color: meta.color }}
                      aria-hidden
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[11px] font-bold tracking-[0.02em]"
                          style={{ background: meta.bg, color: meta.color }}
                        >
                          {meta.label}
                        </span>
                        <span className="text-[11.5px] text-[#9A9A93]">
                          {new Date(tx.createdAt).toLocaleDateString('tr-TR', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[13.5px] text-[#2A2A2A]">{tx.description}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p
                        className="font-mono text-[15px] font-bold tabular-nums"
                        style={{ color: isNegative ? '#E28D7A' : '#6FA58D' }}
                      >
                        {isNegative ? '−' : '+'}
                        {tx.amount}
                      </p>
                      <p className="text-[11px] text-[#9A9A93]">{tx.token}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {!DEV2_API_READY && (
          <p className="mt-4 text-[12px] text-[#9A9A93]">
            * İşlem verileri demo amaçlı. Gerçek veriler Geliştirici 2 servislerinden çekilecek.
          </p>
        )}
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * /profile/orders + /profile/transactions için light tema overrides.
 * Sayfa unmount olunca otomatik kalkar — layout.tsx'e dokunulmadı.
 * ────────────────────────────────────────────────────────────────────────── */
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

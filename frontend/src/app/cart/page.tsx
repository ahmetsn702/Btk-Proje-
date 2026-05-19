'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Check,
  ChevronRight,
  Loader2,
  Lock,
  MapPin,
  Minus,
  Plus,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useCartStore } from '@/store/cart';
import { useBalances } from '@/hooks/use-balances';
import { ProtectedRoute } from '@/components/protected-route';
import { cn } from '@/lib/utils';

/* ────────────────────────────────────────────────────────────────────────── *
 * Mock & sabitler
 * ────────────────────────────────────────────────────────────────────────── */
// DEV2_API_READY: false — gerçek XP→TL oranı Dev2'nin /xp/apply-discount
// endpoint'inden gelecek; bu istemci tarafı oranı yalnızca tahmini gösterim
// içindir. Asıl indirim sunucuda yeniden doğrulanır.
const XP_TO_KURUS = 40; // 1 XP = 0.40 TL = 40 kuruş

interface Address {
  id: string;
  title: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  address: string;
  zipCode?: string;
  isDefault: boolean;
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Helpers
 * ────────────────────────────────────────────────────────────────────────── */
const fmtTL = (kurus: number) =>
  (kurus / 100).toLocaleString('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtInt = (n: number) => Math.round(n).toLocaleString('tr-TR');

function getApiErrorMessage(err: unknown, fallback: string): string {
  const data = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data;
  if (!data?.message) return fallback;
  return Array.isArray(data.message) ? data.message[0] : data.message;
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Stepper (Ürünler → Sepet → Adres → Ödeme)
 * ────────────────────────────────────────────────────────────────────────── */
type StepKey = 'products' | 'cart' | 'address' | 'payment';
const STEPS: { key: StepKey; label: string }[] = [
  { key: 'products', label: 'Ürünler' },
  { key: 'cart', label: 'Sepet' },
  { key: 'address', label: 'Adres' },
  { key: 'payment', label: 'Ödeme' },
];

function Stepper({ active }: { active: StepKey }) {
  const activeIdx = STEPS.findIndex((s) => s.key === active);
  return (
    <nav aria-label="Sipariş adımları" className="mb-8">
      <ol className="flex flex-wrap items-center gap-2 text-sm">
        {STEPS.map((s, i) => {
          const isDone = i < activeIdx;
          const isActive = i === activeIdx;
          return (
            <li key={s.key} className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 transition-colors',
                  isActive && 'border-[#E28D7A] bg-[#FFF1ED] font-semibold text-[#D16F5A]',
                  isDone && 'border-[#D7E6DD] bg-[#EAF3EE] text-[#3F7561]',
                  !isActive && !isDone && 'border-[#ECE8E1] bg-white text-[#8E8A82]',
                )}
                aria-current={isActive ? 'step' : undefined}
              >
                <span
                  className={cn(
                    'inline-grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold',
                    isActive && 'bg-[#E28D7A] text-white',
                    isDone && 'bg-[#6FA58D] text-white',
                    !isActive && !isDone && 'bg-[#ECE8E1] text-[#8E8A82]',
                  )}
                  aria-hidden
                >
                  {isDone ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-[#D9D4CB]" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * XP indirim kartı
 * ────────────────────────────────────────────────────────────────────────── */
function XpDiscountCard({
  xpBalance,
  maxXpUsable,
  applied,
  appliedXp,
  draftXp,
  setDraftXp,
  onApply,
  onClear,
}: {
  xpBalance: number;
  maxXpUsable: number;
  applied: boolean;
  appliedXp: number;
  draftXp: number;
  setDraftXp: (n: number) => void;
  onApply: () => void;
  onClear: () => void;
}) {
  const max = Math.max(0, maxXpUsable);
  const pct = max > 0 ? (draftXp / max) * 100 : 0;

  return (
    <section
      aria-label="XP ile indirim"
      className="overflow-hidden rounded-[12px] border border-[#ECE8E1] bg-white p-5 shadow-[0_1px_2px_rgba(40,32,26,0.04)]"
    >
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-grid h-9 w-9 place-items-center rounded-full bg-[#F1EDF8] text-[#9C8CC2]"
            aria-hidden
          >
            <Sparkles className="h-4 w-4" />
          </span>
          <div>
            <h3 className="m-0 text-[15px] font-semibold leading-tight text-[#2A2A2A]">
              XP ile İndirim
            </h3>
            <p className="m-0 text-xs text-[#8E8A82]">
              {/* DEV2_API_READY: false — XP bakiyesi mock */}1 XP = 0,40 ₺ tahmini
            </p>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F1EDF8] px-2.5 py-1 text-[12px] font-semibold text-[#5C4E7E]">
          <span className="font-mono tabular-nums">{fmtInt(xpBalance)}</span> XP
        </span>
      </header>

      {xpBalance <= 0 ? (
        <p className="mt-3 rounded-[10px] border border-dashed border-[#ECE8E1] bg-[#FAFAF7] px-3 py-3 text-center text-xs text-[#8E8A82]">
          Henüz harcanabilir XP yok. Görevlerden kazanmaya başla.
        </p>
      ) : max === 0 ? (
        <p className="mt-3 rounded-[10px] border border-dashed border-[#ECE8E1] bg-[#FAFAF7] px-3 py-3 text-center text-xs text-[#8E8A82]">
          Bu sepet için indirim uygulanamıyor.
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-center gap-2.5">
            <input
              id="xp-amount"
              type="number"
              inputMode="numeric"
              min={0}
              max={max}
              value={draftXp}
              onChange={(e) => {
                const raw = parseInt(e.target.value || '0', 10);
                const clamped = Math.max(0, Math.min(max, isNaN(raw) ? 0 : raw));
                setDraftXp(clamped);
              }}
              aria-label="Kullanılacak XP miktarı"
              className="w-24 rounded-[10px] border border-[#ECE8E1] bg-[#FAFAF7] px-3 py-2 text-center font-mono text-sm font-semibold tabular-nums text-[#2A2A2A] focus:border-[#9C8CC2] focus:outline-none focus:ring-2 focus:ring-[#E0D7F0]"
            />
            <input
              type="range"
              min={0}
              max={max}
              value={draftXp}
              onChange={(e) => setDraftXp(Number(e.target.value))}
              aria-label="XP miktarı kaydırıcı"
              className="xp-range h-7 flex-1 cursor-pointer appearance-none bg-transparent"
              style={{ ['--pct' as string]: `${pct}%` }}
            />
            <button
              type="button"
              onClick={() => setDraftXp(max)}
              className="rounded-md bg-[#F1EDF8] px-2 py-1.5 text-[10px] font-bold tracking-[0.04em] text-[#5C4E7E] hover:bg-[#E6DEF6] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9C8CC2]"
            >
              MAX
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-[#5C5953]">
            <span>
              <span className="font-mono tabular-nums">{fmtInt(draftXp)}</span> XP kullanılacak
            </span>
            <span className="font-semibold text-[#3F7561]">
              −<span className="font-mono tabular-nums">{fmtTL(draftXp * XP_TO_KURUS)}</span> ₺
            </span>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={onApply}
              disabled={draftXp <= 0 || draftXp === appliedXp}
              className="flex-1 rounded-[10px] bg-[#9C8CC2] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_2px_6px_rgba(156,140,194,0.25)] transition-colors hover:bg-[#8472B0] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9C8CC2] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-[#ECE8E1] disabled:text-[#8E8A82] disabled:shadow-none"
            >
              Uygula
            </button>
            <button
              type="button"
              onClick={onClear}
              disabled={!applied && draftXp === 0}
              className="rounded-[10px] border border-[#ECE8E1] bg-white px-4 py-2.5 text-sm font-medium text-[#5C5953] hover:bg-[#FAFAF7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#9C8CC2] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Kaldır
            </button>
          </div>

          {applied && appliedXp > 0 && (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#EAF3EE] px-2.5 py-1 text-[11.5px] font-semibold text-[#3F7561]">
              <Check className="h-3 w-3" />
              {fmtInt(appliedXp)} XP indirim uygulandı
            </p>
          )}
        </>
      )}
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Address modal
 * ────────────────────────────────────────────────────────────────────────── */
function AddressModal({
  open,
  onClose,
  onSelect,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (a: Address) => void;
  busy: boolean;
}) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .get<Address[]>('/addresses')
      .then(({ data }) => {
        if (cancelled) return;
        setAddresses(data);
        const def = data.find((a) => a.isDefault) ?? data[0];
        setSelectedId(def?.id ?? null);
      })
      .catch(() => {
        if (cancelled) return;
        setError('Adresler yüklenemedi');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Body scroll lock + ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  const selected = addresses.find((a) => a.id === selectedId) ?? null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="address-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(40,32,26,0.45)] p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-[0_18px_40px_rgba(40,32,26,0.18)]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[#ECE8E1] px-5 py-4">
          <h2 id="address-modal-title" className="m-0 text-base font-semibold text-[#2A2A2A]">
            Teslimat adresini seç
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Kapat"
            className="rounded-md p-1.5 text-[#8E8A82] hover:bg-[#FAFAF7] hover:text-[#2A2A2A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E28D7A]"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-[#8E8A82]" />
            </div>
          ) : error ? (
            <p className="rounded-[10px] border border-[#F4D8D2] bg-[#FBEAE5] px-3 py-3 text-sm text-[#C7553F]">
              {error}
            </p>
          ) : addresses.length === 0 ? (
            <div className="rounded-[10px] border border-dashed border-[#ECE8E1] bg-[#FAFAF7] px-4 py-10 text-center">
              <MapPin className="mx-auto mb-2 h-8 w-8 text-[#D9D4CB]" aria-hidden />
              <p className="m-0 text-sm font-semibold text-[#2A2A2A]">Kayıtlı adresin yok</p>
              <p className="mt-1 text-xs text-[#8E8A82]">
                Profil sayfandan yeni bir teslimat adresi ekleyebilirsin.
              </p>
              <Link
                href="/profile"
                className="mt-4 inline-flex items-center gap-1.5 rounded-[10px] bg-[#E28D7A] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#D16F5A]"
              >
                Profil'e git
              </Link>
            </div>
          ) : (
            <ul role="radiogroup" aria-label="Adres seçimi" className="flex flex-col gap-2">
              {addresses.map((a) => {
                const sel = a.id === selectedId;
                return (
                  <li key={a.id}>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={sel}
                      onClick={() => setSelectedId(a.id)}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-[12px] border p-3.5 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E28D7A]',
                        sel
                          ? 'border-[#E28D7A] bg-[#FFF1ED]'
                          : 'border-[#ECE8E1] bg-white hover:border-[#D9D4CB]',
                      )}
                    >
                      <span
                        className={cn(
                          'mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2',
                          sel ? 'border-[#E28D7A]' : 'border-[#D9D4CB]',
                        )}
                        aria-hidden
                      >
                        {sel && <span className="block h-2 w-2 rounded-full bg-[#E28D7A]" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#2A2A2A]">{a.title}</span>
                          {a.isDefault && (
                            <span className="rounded-md bg-[#EAF3EE] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#3F7561]">
                              Varsayılan
                            </span>
                          )}
                        </span>
                        <span className="mt-0.5 block text-[12.5px] font-medium text-[#5C5953]">
                          {a.fullName} · {a.phone}
                        </span>
                        <span className="mt-1 block text-xs text-[#8E8A82]">
                          {a.address}, {a.district}/{a.city}
                          {a.zipCode ? ` · ${a.zipCode}` : ''}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {addresses.length > 0 && (
          <footer className="flex items-center justify-end gap-2 border-t border-[#ECE8E1] bg-[#FAFAF7] px-5 py-3.5">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded-[10px] border border-[#ECE8E1] bg-white px-4 py-2 text-sm font-medium text-[#5C5953] hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E28D7A] disabled:opacity-50"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={() => selected && onSelect(selected)}
              disabled={!selected || busy}
              className="inline-flex items-center gap-2 rounded-[10px] bg-[#E28D7A] px-4 py-2 text-sm font-semibold text-white shadow-[0_2px_6px_rgba(226,141,122,0.3)] transition-colors hover:bg-[#D16F5A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E28D7A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFAF7] disabled:cursor-not-allowed disabled:bg-[#ECE8E1] disabled:text-[#8E8A82] disabled:shadow-none"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Sipariş veriliyor…
                </>
              ) : (
                <>
                  Onayla & Sipariş ver <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Sayfa
 * ────────────────────────────────────────────────────────────────────────── */
function CartPageInner() {
  const router = useRouter();
  const { items, total, loading, fetchCart, updateQuantity, removeItem } = useCartStore();
  const { balances } = useBalances();

  const [updating, setUpdating] = useState<string | null>(null);
  const [draftXp, setDraftXp] = useState(0);
  const [appliedXp, setAppliedXp] = useState(0);
  const [addressOpen, setAddressOpen] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // DEV2_API_READY: false — XP bakiyesi useBalances mock'undan geliyor
  const xpBalance = balances?.xp ?? 0;

  // Sepete göre kullanılabilir maksimum XP — sepetteki maksimum indirimden fazlasına izin verme
  const maxXpUsable = useMemo(() => {
    if (total <= 0) return 0;
    return Math.min(xpBalance, Math.floor(total / XP_TO_KURUS));
  }, [xpBalance, total]);

  // Eğer sepet değişirse uygulanmış XP'yi sınırla
  useEffect(() => {
    if (appliedXp > maxXpUsable) {
      setAppliedXp(maxXpUsable);
      setDraftXp(maxXpUsable);
    }
  }, [maxXpUsable, appliedXp]);

  const xpDiscountKurus = appliedXp * XP_TO_KURUS;
  const finalTotal = Math.max(0, total - xpDiscountKurus);

  const handleQuantity = async (itemId: string, quantity: number) => {
    setUpdating(itemId);
    try {
      await updateQuantity(itemId, quantity);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Adet güncellenemedi'));
    } finally {
      setUpdating(null);
    }
  };

  const handleRemove = async (itemId: string) => {
    setUpdating(itemId);
    try {
      await removeItem(itemId);
      toast.success('Ürün sepetten kaldırıldı');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Ürün kaldırılamadı'));
    } finally {
      setUpdating(null);
    }
  };

  const handleCheckout = async (address: Address) => {
    setCheckingOut(true);
    try {
      await api.post('/orders/checkout', {
        addressId: address.id,
        xpAmount: appliedXp > 0 ? appliedXp : undefined,
      });
      toast.success('Siparişin alındı 🎉');
      // Sepet artık boş, store'u senkronla
      await fetchCart();
      setAddressOpen(false);
      router.push('/orders');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Sipariş oluşturulamadı'));
    } finally {
      setCheckingOut(false);
    }
  };

  /* ─────────── Boş sepet ─────────── */
  if (!loading && items.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] font-sans text-[#2A2A2A] antialiased">
        <main className="mx-auto max-w-[1200px] px-6 pb-20 pt-10 lg:px-8">
          <Stepper active="cart" />
          <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-2xl border border-[#ECE8E1] bg-white px-6 py-16 text-center shadow-[0_4px_14px_rgba(40,32,26,0.06)]">
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[#FFF1ED] text-[#E28D7A]">
              <ShoppingBag className="h-9 w-9" aria-hidden />
            </div>
            <div>
              <h2 className="m-0 text-xl font-semibold text-[#2A2A2A]">Sepetiniz boş</h2>
              <p className="mt-1.5 text-sm text-[#5C5953]">
                Görevlerden kazandığın XP ile alışverişlerinde indirim yakalayabilirsin.
              </p>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-[12px] bg-[#E28D7A] px-5 py-3 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(226,141,122,0.3)] transition-colors hover:bg-[#D16F5A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E28D7A] focus-visible:ring-offset-2 focus-visible:ring-offset-[#FAFAF7]"
            >
              Alışverişe başla <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7] font-sans text-[#2A2A2A] antialiased">
      {/* XP slider için lokal CSS — Soft Coral teması */}
      <style jsx global>{`
        input[type='range'].xp-range {
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
        }
        input[type='range'].xp-range::-webkit-slider-runnable-track {
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(
            to right,
            #9c8cc2 0%,
            #9c8cc2 var(--pct, 0%),
            #efeaf5 var(--pct, 0%),
            #efeaf5 100%
          );
        }
        input[type='range'].xp-range::-moz-range-track {
          height: 6px;
          border-radius: 999px;
          background: linear-gradient(
            to right,
            #9c8cc2 0%,
            #9c8cc2 var(--pct, 0%),
            #efeaf5 var(--pct, 0%),
            #efeaf5 100%
          );
        }
        input[type='range'].xp-range::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #9c8cc2;
          box-shadow: 0 2px 6px rgba(60, 40, 100, 0.18);
          margin-top: -7px;
          transition: transform 0.12s ease;
        }
        input[type='range'].xp-range::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #fff;
          border: 2px solid #9c8cc2;
          box-shadow: 0 2px 6px rgba(60, 40, 100, 0.18);
        }
        input[type='range'].xp-range:hover::-webkit-slider-thumb {
          transform: scale(1.08);
        }
      `}</style>

      <main className="mx-auto max-w-[1200px] px-6 pb-20 pt-10 lg:px-8">
        <Stepper active="cart" />

        <header className="mb-6">
          <h1 className="m-0 text-[28px] font-semibold -tracking-[0.01em] text-[#2A2A2A]">
            Sepetim
          </h1>
          <p className="mt-1.5 text-sm text-[#5C5953]">
            {items.length} ürün · Toplam{' '}
            <span className="font-mono font-semibold tabular-nums text-[#2A2A2A]">
              {fmtTL(total)} ₺
            </span>
          </p>
        </header>

        <div className="grid grid-cols-1 items-start gap-7 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Ürün listesi */}
          <section aria-label="Sepet ürünleri" className="flex min-w-0 flex-col gap-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => <ItemSkeleton key={i} />)
              : items.map((item) => {
                  const lineTotal = item.product.priceFiat * item.quantity;
                  const cover = item.product.images?.[0];
                  const stock = item.product.stock;
                  const busy = updating === item.id;
                  // DEV2_API_READY: false — kategori bazlı XP indirim uygunluğu mock;
                  // gerçek kontrol /xp/apply-discount sırasında sunucuda yapılacak.
                  const xpEligible = balances?.xp != null && balances.xp > 0;
                  return (
                    <article
                      key={item.id}
                      className={cn(
                        'flex gap-4 rounded-[12px] border border-[#ECE8E1] bg-white p-4 shadow-[0_1px_2px_rgba(40,32,26,0.04)] transition-opacity',
                        busy && 'opacity-60',
                      )}
                    >
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-[#FAFAF7]">
                        {cover ? (
                          <Image
                            src={cover}
                            alt={item.product.name}
                            fill
                            sizes="80px"
                            unoptimized
                            className="object-cover"
                          />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-[10px] font-medium text-[#8E8A82]">
                            Görsel yok
                          </div>
                        )}
                      </div>

                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <Link
                              href={`/products/${item.product.id}`}
                              className="line-clamp-2 text-[15px] font-semibold leading-tight text-[#2A2A2A] hover:text-[#D16F5A]"
                            >
                              {item.product.name}
                            </Link>
                            <p className="mt-0.5 text-xs text-[#8E8A82]">
                              <span className="font-mono tabular-nums">
                                {fmtTL(item.product.priceFiat)} ₺
                              </span>
                              {' · '}
                              {stock > 0 ? (
                                <>
                                  Stokta <span className="font-mono tabular-nums">{stock}</span>{' '}
                                  adet
                                </>
                              ) : (
                                <span className="text-[#C7553F]">Stok tükendi</span>
                              )}
                            </p>
                            {xpEligible && (
                              <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F1EDF8] px-2 py-0.5 text-[11px] font-semibold text-[#5C4E7E]">
                                <Sparkles className="h-3 w-3" />
                                XP indirimine uygun
                              </span>
                            )}
                          </div>
                          <p className="shrink-0 font-mono text-[15px] font-semibold tabular-nums text-[#D16F5A]">
                            {fmtTL(lineTotal)} ₺
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="inline-flex items-center rounded-[10px] border border-[#ECE8E1] bg-white">
                            <button
                              type="button"
                              onClick={() => handleQuantity(item.id, item.quantity - 1)}
                              disabled={item.quantity <= 1 || busy}
                              aria-label="Adeti azalt"
                              className="grid h-8 w-8 place-items-center rounded-l-[10px] text-[#5C5953] hover:bg-[#FFF1ED] hover:text-[#D16F5A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E28D7A] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <span
                              aria-label={`Adet: ${item.quantity}`}
                              className="grid h-8 min-w-[40px] place-items-center px-1 font-mono text-sm font-semibold tabular-nums text-[#2A2A2A]"
                            >
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantity(item.id, item.quantity + 1)}
                              disabled={item.quantity >= stock || busy}
                              aria-label="Adeti artır"
                              className="grid h-8 w-8 place-items-center rounded-r-[10px] text-[#5C5953] hover:bg-[#FFF1ED] hover:text-[#D16F5A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E28D7A] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemove(item.id)}
                            disabled={busy}
                            aria-label="Sepetten kaldır"
                            className="grid h-8 w-8 place-items-center rounded-[10px] text-[#8E8A82] hover:bg-[#FBEAE5] hover:text-[#C7553F] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C7553F] disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            {busy ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
          </section>

          {/* Sağ kolon (sticky) */}
          <aside className="flex flex-col gap-5 lg:sticky lg:top-20">
            {/* Sipariş özeti */}
            <section
              aria-label="Sipariş özeti"
              className="overflow-hidden rounded-[12px] border border-[#ECE8E1] bg-white shadow-[0_4px_14px_rgba(40,32,26,0.06)]"
            >
              <header className="border-b border-[#ECE8E1] px-5 py-4">
                <h3 className="m-0 text-base font-semibold text-[#2A2A2A]">Sipariş Özeti</h3>
              </header>
              <div className="space-y-2.5 px-5 py-4 text-sm">
                <Row
                  label="Ara toplam"
                  value={
                    <>
                      <span className="font-mono tabular-nums">{fmtTL(total)}</span> ₺
                    </>
                  }
                />
                {appliedXp > 0 && (
                  <Row
                    tone="success"
                    label={
                      <>
                        XP indirim{' '}
                        <span className="text-[11px] text-[#8E8A82]">({fmtInt(appliedXp)} XP)</span>
                      </>
                    }
                    value={
                      <>
                        −<span className="font-mono tabular-nums">{fmtTL(xpDiscountKurus)}</span> ₺
                      </>
                    }
                  />
                )}
                <Row
                  label="Kargo"
                  value={<span className="text-[#3F7561]">Ücretsiz</span>}
                  hint="Tüm siparişlerde"
                />
              </div>
              <div className="border-t border-[#ECE8E1] px-5 py-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-medium text-[#5C5953]">Toplam</span>
                  <span className="font-mono text-2xl font-semibold tabular-nums text-[#D16F5A]">
                    {fmtTL(finalTotal)} ₺
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAddressOpen(true)}
                  disabled={items.length === 0 || checkingOut}
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-[12px] bg-[#E28D7A] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(226,141,122,0.3)] transition-colors hover:bg-[#D16F5A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E28D7A] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:bg-[#ECE8E1] disabled:text-[#8E8A82] disabled:shadow-none"
                >
                  {checkingOut ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> İşleniyor…
                    </>
                  ) : (
                    <>
                      Siparişi Onayla <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </button>
                <p className="mt-2.5 inline-flex items-center justify-center gap-1.5 text-[11px] text-[#8E8A82]">
                  <Lock className="h-3 w-3" /> Güvenli ödeme · Adres onayından sonra tahsil edilir
                </p>
              </div>
            </section>

            {/* XP indirim */}
            <XpDiscountCard
              xpBalance={xpBalance}
              maxXpUsable={maxXpUsable}
              applied={appliedXp > 0}
              appliedXp={appliedXp}
              draftXp={draftXp}
              setDraftXp={setDraftXp}
              onApply={() => {
                setAppliedXp(draftXp);
                if (draftXp > 0) toast.success(`${fmtInt(draftXp)} XP uygulandı`);
              }}
              onClear={() => {
                setAppliedXp(0);
                setDraftXp(0);
                toast.message('XP indirimi kaldırıldı');
              }}
            />
          </aside>
        </div>
      </main>

      <AddressModal
        open={addressOpen}
        onClose={() => !checkingOut && setAddressOpen(false)}
        onSelect={handleCheckout}
        busy={checkingOut}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Yardımcılar (UI)
 * ────────────────────────────────────────────────────────────────────────── */
function Row({
  label,
  value,
  hint,
  tone,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: string;
  tone?: 'success';
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <div className="flex flex-col">
        <span
          className={cn(
            'text-sm',
            tone === 'success' ? 'font-semibold text-[#3F7561]' : 'text-[#5C5953]',
          )}
        >
          {label}
        </span>
        {hint && <span className="text-[11px] text-[#8E8A82]">{hint}</span>}
      </div>
      <span
        className={cn(
          'text-sm',
          tone === 'success' ? 'font-semibold text-[#3F7561]' : 'text-[#2A2A2A]',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ItemSkeleton() {
  return (
    <div className="flex animate-pulse gap-4 rounded-[12px] border border-[#ECE8E1] bg-white p-4">
      <div className="h-20 w-20 shrink-0 rounded-xl bg-[#ECE8E1]" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 rounded bg-[#ECE8E1]" />
        <div className="h-3 w-1/2 rounded bg-[#ECE8E1]" />
        <div className="mt-3 flex gap-2">
          <div className="h-8 w-24 rounded-[10px] bg-[#ECE8E1]" />
          <div className="h-8 w-8 rounded-[10px] bg-[#ECE8E1]" />
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <ProtectedRoute>
      <CartPageInner />
    </ProtectedRoute>
  );
}

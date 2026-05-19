'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { LogOut, Menu, Search, ShoppingCart, User2, Wallet, X } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/products', label: 'Ürünler' },
  { href: '/tasks', label: 'Görevler' },
  { href: '/trade', label: 'Takas' },
] as const;

export function Navbar() {
  const { user, logout } = useAuthStore();
  const items = useCartStore((s) => s.items);
  const fetchCart = useCartStore((s) => s.fetchCart);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (user) fetchCart();
  }, [user, fetchCart]);

  const cartCount = (items ?? []).reduce((sum, it) => sum + (it.quantity ?? 0), 0);

  const isActive = (href: string) =>
    !!pathname && (pathname === href || (href !== '/' && pathname.startsWith(href + '/')));

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-[#ECE8E1] bg-[rgba(255,255,255,0.82)] backdrop-blur-[12px]">
      <nav
        className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10"
        aria-label="Ana navigasyon"
      >
        {/* Logo */}
        <Link
          href="/"
          className="font-heading text-[19px] font-bold tracking-tight text-[#2A2A2A]"
          onClick={closeMobile}
        >
          BTK<span className="text-[#6FA58D]">Market</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((l) => {
            const active = isActive(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  'relative px-3 py-1.5 text-[14px] font-medium transition-colors',
                  active ? 'text-[#2A2A2A]' : 'text-[#5C5953] hover:text-[#2A2A2A]',
                )}
                aria-current={active ? 'page' : undefined}
              >
                {l.label}
                {active && (
                  <span
                    className="absolute -bottom-[14px] left-3 right-3 h-[2px] bg-[#6FA58D]"
                    aria-hidden
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Search (lg+) */}
        <div className="ml-auto hidden flex-1 items-center justify-end lg:flex lg:max-w-[260px]">
          <label className="flex w-full items-center gap-2 rounded-[10px] border border-[#ECE8E1] bg-white/60 px-3 py-1.5 transition-colors focus-within:border-[#6FA58D]/60 focus-within:bg-white">
            <Search className="h-3.5 w-3.5 text-[#9A9A93]" aria-hidden />
            <input
              type="text"
              placeholder="Ürün ara…"
              className="w-full bg-transparent text-[13px] text-[#2A2A2A] outline-none placeholder:text-[#9A9A93]"
              aria-label="Ürün ara"
            />
          </label>
        </div>

        {/* Right cluster (md+) */}
        <div className="hidden items-center gap-1.5 md:flex">
          <WalletConnect />

          {user && (
            <Link
              href="/cart"
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[#5C5953] transition-colors hover:bg-[#F4F1EA] hover:text-[#2A2A2A]"
              aria-label={`Sepet${cartCount ? ` — ${cartCount} ürün` : ''}`}
            >
              <ShoppingCart className="h-[17px] w-[17px]" aria-hidden />
              {cartCount > 0 && (
                <span
                  className="absolute -right-0.5 -top-0.5 inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#E28D7A] px-1 text-[10.5px] font-bold text-white shadow-sm"
                  aria-hidden
                >
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
          )}

          {user ? (
            <>
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[13.5px] font-medium text-[#5C5953] transition-colors hover:bg-[#F4F1EA] hover:text-[#2A2A2A]"
              >
                <User2 className="h-4 w-4" aria-hidden />
                Profil
              </Link>
              <button
                type="button"
                onClick={() => logout()}
                className="inline-flex items-center gap-1.5 rounded-[10px] px-2.5 py-1.5 text-[13.5px] font-medium text-[#5C5953] transition-colors hover:bg-[#F4F1EA] hover:text-[#2A2A2A]"
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Çıkış
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="inline-flex items-center rounded-[10px] px-3 py-1.5 text-[13.5px] font-medium text-[#5C5953] transition-colors hover:bg-[#F4F1EA] hover:text-[#2A2A2A]"
              >
                Giriş
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center rounded-[10px] border border-[#6FA58D]/40 bg-white px-3.5 py-1.5 text-[13.5px] font-semibold text-[#2A2A2A] transition-colors hover:border-[#6FA58D] hover:bg-[#F4F1EA]"
              >
                Kayıt Ol
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] text-[#5C5953] transition-colors hover:bg-[#F4F1EA] hover:text-[#2A2A2A] md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? (
            <X className="h-5 w-5" aria-hidden />
          ) : (
            <Menu className="h-5 w-5" aria-hidden />
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div
          id="mobile-menu"
          className="border-t border-[#ECE8E1] bg-[rgba(255,255,255,0.95)] backdrop-blur-[12px] md:hidden"
          role="menu"
        >
          <div className="mx-auto flex max-w-[1400px] flex-col gap-1 px-4 py-3 sm:px-6">
            {/* Mobile search */}
            <label className="mb-1 flex items-center gap-2 rounded-[10px] border border-[#ECE8E1] bg-white/80 px-3 py-2">
              <Search className="h-4 w-4 text-[#9A9A93]" aria-hidden />
              <input
                type="text"
                placeholder="Ürün ara…"
                className="w-full bg-transparent text-[13.5px] text-[#2A2A2A] outline-none placeholder:text-[#9A9A93]"
                aria-label="Ürün ara"
              />
            </label>

            {NAV_LINKS.map((l) => {
              const active = isActive(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={closeMobile}
                  className={cn(
                    'rounded-[10px] px-3 py-2.5 text-[14.5px] font-medium transition-colors',
                    active
                      ? 'bg-[#F1ECE2] text-[#2A2A2A]'
                      : 'text-[#5C5953] hover:bg-[#F4F1EA] hover:text-[#2A2A2A]',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  {l.label}
                </Link>
              );
            })}

            <div className="my-2 h-px bg-[#ECE8E1]" />

            {/* Wallet */}
            <div className="px-1 pb-1">
              <WalletConnect mobile />
            </div>

            {user ? (
              <>
                <Link
                  href="/cart"
                  onClick={closeMobile}
                  className="flex items-center justify-between rounded-[10px] px-3 py-2.5 text-[14px] font-medium text-[#5C5953] hover:bg-[#F4F1EA] hover:text-[#2A2A2A]"
                >
                  <span className="inline-flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" aria-hidden />
                    Sepet
                  </span>
                  {cartCount > 0 && (
                    <span
                      className="inline-flex h-[20px] min-w-[20px] items-center justify-center rounded-full bg-[#E28D7A] px-1.5 text-[11px] font-bold text-white"
                      aria-hidden
                    >
                      {cartCount > 99 ? '99+' : cartCount}
                    </span>
                  )}
                </Link>
                <Link
                  href="/profile"
                  onClick={closeMobile}
                  className="inline-flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-[14px] font-medium text-[#5C5953] hover:bg-[#F4F1EA] hover:text-[#2A2A2A]"
                >
                  <User2 className="h-4 w-4" aria-hidden />
                  Profil
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    closeMobile();
                  }}
                  className="inline-flex items-center gap-2 rounded-[10px] px-3 py-2.5 text-left text-[14px] font-medium text-[#5C5953] hover:bg-[#F4F1EA] hover:text-[#2A2A2A]"
                >
                  <LogOut className="h-4 w-4" aria-hidden />
                  Çıkış
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={closeMobile}
                  className="rounded-[10px] px-3 py-2.5 text-[14px] font-medium text-[#5C5953] hover:bg-[#F4F1EA] hover:text-[#2A2A2A]"
                >
                  Giriş
                </Link>
                <Link
                  href="/register"
                  onClick={closeMobile}
                  className="rounded-[10px] border border-[#6FA58D]/40 bg-white px-4 py-2.5 text-center text-[14px] font-semibold text-[#2A2A2A] transition-colors hover:border-[#6FA58D] hover:bg-[#F4F1EA]"
                >
                  Kayıt Ol
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Connect Wallet — RainbowKit ConnectButton.Custom ile soft-energetic stil.
 * ────────────────────────────────────────────────────────────────────────── */
function WalletConnect({ mobile = false }: { mobile?: boolean }) {
  const baseDesktop =
    'inline-flex h-9 items-center gap-2 rounded-[8px] bg-[#7BE0A9] px-3.5 text-[13px] font-bold text-[#173122] transition-colors hover:bg-[#52C784] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D] focus-visible:ring-offset-2 focus-visible:ring-offset-white';
  const baseMobile =
    'inline-flex h-10 w-full items-center justify-center gap-2 rounded-[8px] bg-[#7BE0A9] px-4 text-[14px] font-bold text-[#173122] transition-colors hover:bg-[#52C784] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D] focus-visible:ring-offset-2 focus-visible:ring-offset-white';
  const baseClass = mobile ? baseMobile : baseDesktop;

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        if (!ready) {
          return <span aria-hidden className={cn(baseClass, 'pointer-events-none opacity-0')} />;
        }

        if (!connected) {
          return (
            <button type="button" onClick={openConnectModal} className={baseClass}>
              <Wallet className="h-4 w-4" aria-hidden />
              Cüzdan Bağla
            </button>
          );
        }

        if (chain.unsupported) {
          return (
            <button
              type="button"
              onClick={openChainModal}
              className={cn(
                mobile ? baseMobile : baseDesktop,
                'bg-[#E28D7A] text-white hover:bg-[#D67862]',
              )}
            >
              Yanlış Ağ
            </button>
          );
        }

        return (
          <button type="button" onClick={openAccountModal} className={baseClass}>
            <Wallet className="h-4 w-4" aria-hidden />
            <span className="font-mono tabular-nums">{account.displayName}</span>
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}

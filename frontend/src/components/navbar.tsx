'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { ConnectWalletButton } from '@/components/connect-wallet-button';
import { Menu, X } from 'lucide-react';

export function Navbar() {
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = (
    <>
      <Link
        href="/products"
        className="text-sm hover:underline"
        onClick={() => setMobileOpen(false)}
      >
        Ürünler
      </Link>
      <Link href="/tasks" className="text-sm hover:underline" onClick={() => setMobileOpen(false)}>
        Görevler
      </Link>
      <Link
        href="/exchange"
        className="text-sm hover:underline"
        onClick={() => setMobileOpen(false)}
      >
        Takas
      </Link>
      <Link href="/market" className="text-sm hover:underline" onClick={() => setMobileOpen(false)}>
        Market
      </Link>
    </>
  );

  const authLinks = user ? (
    <>
      <ConnectWalletButton />
      <Link href="/cart" className="text-sm hover:underline" onClick={() => setMobileOpen(false)}>
        Sepet
      </Link>
      <Link
        href="/profile"
        className="text-sm hover:underline"
        onClick={() => setMobileOpen(false)}
      >
        Profil
      </Link>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          logout();
          setMobileOpen(false);
        }}
      >
        Çıkış
      </Button>
    </>
  ) : (
    <>
      <Link href="/login" onClick={() => setMobileOpen(false)}>
        <Button variant="ghost" size="sm">
          Giriş
        </Button>
      </Link>
      <Link href="/register" onClick={() => setMobileOpen(false)}>
        <Button size="sm">Kayıt Ol</Button>
      </Link>
    </>
  );

  return (
    <header className="border-b">
      <nav
        className="container mx-auto flex h-16 items-center justify-between px-4"
        aria-label="Ana navigasyon"
      >
        <Link href="/" className="text-xl font-bold">
          BTK Proje
        </Link>

        {/* Desktop */}
        <div className="hidden items-center gap-4 md:flex">
          {navLinks}
          {authLinks}
        </div>

        {/* Mobile toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? 'Menüyü kapat' : 'Menüyü aç'}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t px-4 py-4 md:hidden" role="menu">
          <div className="flex flex-col gap-3">
            {navLinks}
            <hr className="my-2" />
            {authLinks}
          </div>
        </div>
      )}
    </header>
  );
}

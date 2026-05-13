'use client';

import Link from 'next/link';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';

export function Navbar() {
  const { user, logout } = useAuthStore();

  return (
    <header className="border-b">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="text-xl font-bold">
          BTK Proje
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/products" className="text-sm hover:underline">
            Ürünler
          </Link>
          <Link href="/tasks" className="text-sm hover:underline">
            Görevler
          </Link>
          {user ? (
            <>
              <Link href="/cart" className="text-sm hover:underline">
                Sepet
              </Link>
              <Link href="/profile" className="text-sm hover:underline">
                Profil
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}>
                Çıkış
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Giriş
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Kayıt Ol</Button>
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}

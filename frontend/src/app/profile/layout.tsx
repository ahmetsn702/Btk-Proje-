'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProtectedRoute } from '@/components/protected-route';
import { User, ShoppingBag, Wallet, ArrowLeftRight } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/profile', label: 'Kişisel Bilgiler', icon: User },
  { href: '/profile/orders', label: 'Siparişlerim', icon: ShoppingBag },
  { href: '/profile/wallet', label: 'Cüzdan', icon: Wallet },
  { href: '/profile/transactions', label: 'İşlem Geçmişi', icon: ArrowLeftRight },
];

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <ProtectedRoute>
      <div className="grid min-h-[calc(100vh-4rem)] gap-8 md:grid-cols-[220px_1fr]">
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? 'bg-primary/10 font-medium text-primary'
                    : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div>{children}</div>
      </div>
    </ProtectedRoute>
  );
}

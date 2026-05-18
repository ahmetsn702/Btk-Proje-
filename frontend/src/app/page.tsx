'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product-card';
import { ProductGridSkeleton, CategoryCardSkeleton } from '@/components/skeletons';
import { TrendingUp, TrendingDown, Zap, Target, BarChart3 } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  priceFiat: number;
  images: string[];
  category?: { id: string; name: string; slug: string };
}

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
}

// DEV2_API_READY: false — mock kullanılıyor
const MOCK_RATES = [
  { symbol: 'ELC', rate: 12.5, change: 2.3 },
  { symbol: 'FSH', rate: 8.2, change: -1.1 },
  { symbol: 'GMN', rate: 15.0, change: 5.2 },
  { symbol: 'FD', rate: 6.8, change: 0.8 },
  { symbol: 'SPR', rate: 9.4, change: -0.5 },
  { symbol: 'BK', rate: 7.1, change: 1.9 },
];

const CATEGORY_ICONS: Record<string, string> = {
  electronics: '⚡',
  fashion: '👗',
  gaming: '🎮',
  food: '🍕',
  sports: '⚽',
  books: '📚',
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/products', { params: { limit: 6, sortBy: 'newest' } }),
      api.get('/categories'),
    ])
      .then(([prodRes, catRes]) => {
        setProducts(prodRes.data.items);
        setCategories(catRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-secondary/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,102,255,0.15),transparent_50%)]" />
        <div className="relative container mx-auto text-center">
          <h1 className="font-heading text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-foreground via-primary to-neon-green bg-clip-text text-transparent">
            Earn Points. Trade Smart. Shop More.
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-8">
            Görevleri tamamlayarak Kategori Puanı kazan, XP&apos;ye dönüştür ve alışverişte indirim
            olarak kullan.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/tasks">
              <Button size="lg" className="bg-primary hover:bg-primary/90 glow-blue font-heading">
                <Zap className="mr-2 h-4 w-4" /> Kazanmaya Başla
              </Button>
            </Link>
            <Link href="/products">
              <Button
                size="lg"
                variant="outline"
                className="border-border hover:border-primary/50 font-heading"
              >
                Ürünleri Keşfet
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Live Exchange Ticker */}
      <section className="border-y border-border bg-muted/30 py-3 overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-8 overflow-x-auto scrollbar-hide">
            <span className="text-xs text-muted-foreground font-heading whitespace-nowrap">
              CANLI ORANLAR
            </span>
            {MOCK_RATES.map((r) => (
              <div key={r.symbol} className="flex items-center gap-2 whitespace-nowrap">
                <span className="text-sm font-heading font-medium">{r.symbol}</span>
                <span className="text-sm text-muted-foreground">1:{r.rate}</span>
                <span
                  className={`flex items-center text-xs ${r.change > 0 ? 'text-neon-green' : 'text-secondary'}`}
                >
                  {r.change > 0 ? (
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                  ) : (
                    <TrendingDown className="h-3 w-3 mr-0.5" />
                  )}
                  {r.change > 0 ? '+' : ''}
                  {r.change}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category Cards - Horizontal Scroll */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="font-heading text-2xl font-bold mb-6">Kategoriler</h2>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {categories.map((cat, i) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="group flex-shrink-0 w-44 rounded-xl glass p-5 text-center transition-all hover:glow-blue hover:border-primary/50"
              >
                <div className="text-3xl mb-3">{CATEGORY_ICONS[cat.slug] || '📦'}</div>
                <p className="font-heading text-sm font-medium mb-1">{cat.name}</p>
                <p className="text-xs text-muted-foreground">
                  CP→XP: 1:{MOCK_RATES[i % MOCK_RATES.length]?.rate || '10'}
                </p>
                {i < 2 && (
                  <span className="mt-2 inline-block rounded-full bg-secondary/20 px-2 py-0.5 text-[10px] text-secondary font-medium">
                    Trending
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-heading text-2xl font-bold">Öne Çıkan Ürünler</h2>
          <Link href="/products">
            <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">
              Tümünü Gör →
            </Button>
          </Link>
        </div>
        {loading ? (
          <ProductGridSkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.slice(0, 6).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Quick Stats Bar */}
      <section className="container mx-auto px-4 pb-12">
        <div className="glass rounded-xl p-4 flex flex-wrap items-center justify-around gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-neon-green/20 flex items-center justify-center">
              <Zap className="h-4 w-4 text-neon-green" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">XP Bakiye</p>
              <p className="font-heading font-bold text-neon-green text-glow-green">2,450 XP</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Aktif Görevler</p>
              <p className="font-heading font-bold">3</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-secondary/20 flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-secondary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">En İyi Oran</p>
              <p className="font-heading font-bold">Electronics 1:12.5</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/product-card';
import { Pagination } from '@/components/pagination';
import { ProductGridSkeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/button';
import { Search, TrendingUp, Zap, ArrowRightLeft, Grid3X3, List } from 'lucide-react';

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
}

// DEV2_API_READY: false — mock kullanılıyor
const MOCK_BALANCES = {
  xp: 2450,
  cp: [
    { category: 'Electronics', amount: 340, color: 'text-primary' },
    { category: 'Fashion', amount: 120, color: 'text-pink-400' },
    { category: 'Gaming', amount: 890, color: 'text-purple-400' },
    { category: 'Food', amount: 45, color: 'text-orange-400' },
  ],
};

const MOCK_ACTIVITY = [
  { text: '50 ELC CP kazanıldı', time: '2s önce' },
  { text: '100 CP → 1,250 XP takas', time: '5s önce' },
  { text: '500 XP indirim kullanıldı', time: '1g önce' },
];

const ALL_CATEGORIES = [
  { slug: 'electronics', name: 'Electronics' },
  { slug: 'fashion', name: 'Fashion' },
  { slug: 'gaming', name: 'Gaming' },
  { slug: 'food', name: 'Food' },
  { slug: 'sports', name: 'Sports' },
  { slug: 'books', name: 'Books' },
];

function CategoryContent() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = Number(searchParams.get('page')) || 1;
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    setLoading(true);
    api
      .get('/categories')
      .then((res) => {
        const cat = res.data.find((c: Category) => c.slug === slug);
        if (!cat) {
          router.push('/products');
          return;
        }
        setCategory(cat);
        return api.get(`/categories/${cat.id}/products`, { params: { page, limit: 9 } });
      })
      .then((res) => {
        if (res) {
          setProducts(res.data.items);
          setTotalPages(res.data.totalPages);
        }
      })
      .catch(() => router.push('/products'))
      .finally(() => setLoading(false));
  }, [slug, page, router]);

  const handlePageChange = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', String(p));
    router.push(`/categories/${slug}?${params.toString()}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex gap-6">
        {/* Left Sidebar - Filters */}
        <aside className="hidden lg:block w-60 flex-shrink-0">
          <div className="glass rounded-xl p-4 sticky top-20 space-y-6">
            <div>
              <h3 className="font-heading text-sm font-semibold mb-3">Kategoriler</h3>
              <ul className="space-y-1">
                {ALL_CATEGORIES.map((cat) => (
                  <li key={cat.slug}>
                    <Link
                      href={`/categories/${cat.slug}`}
                      className={`block rounded-lg px-3 py-2 text-sm transition-colors ${
                        cat.slug === slug
                          ? 'bg-primary/20 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="font-heading text-sm font-semibold mb-3">Fiyat Aralığı</h3>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Min"
                  className="w-full rounded-lg bg-muted/50 border border-border px-2 py-1.5 text-xs"
                />
                <input
                  type="number"
                  placeholder="Max"
                  className="w-full rounded-lg bg-muted/50 border border-border px-2 py-1.5 text-xs"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded border-border" />
                <span className="text-sm text-muted-foreground">XP İndirimli</span>
              </label>
            </div>

            <div>
              <h3 className="font-heading text-sm font-semibold mb-3">Sıralama</h3>
              <select className="w-full rounded-lg bg-muted/50 border border-border px-2 py-1.5 text-sm">
                <option>Fiyat (Düşük→Yüksek)</option>
                <option>Fiyat (Yüksek→Düşük)</option>
                <option>Popülerlik</option>
                <option>CP Oranı</option>
              </select>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {/* Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <nav className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground transition-colors">
                Ana Sayfa
              </Link>
              <span className="text-border">/</span>
              <span className="text-foreground font-medium">{category?.name || slug}</span>
            </nav>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 border border-border px-3 py-1.5">
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Bu kategoride ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent text-sm outline-none w-40"
                />
              </div>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded ${viewMode === 'grid' ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded ${viewMode === 'list' ? 'text-primary' : 'text-muted-foreground'}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground mb-4">{products.length} ürün bulundu</p>

          {/* Products Grid */}
          {loading ? (
            <ProductGridSkeleton count={9} />
          ) : products.length === 0 ? (
            <div className="glass rounded-xl p-12 text-center">
              <p className="text-muted-foreground">Bu kategoride ürün bulunamadı.</p>
            </div>
          ) : (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3'
                  : 'space-y-4'
              }
            >
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}

          <div className="mt-8">
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        </div>

        {/* Right Sidebar - Wallet */}
        <aside className="hidden xl:block w-72 flex-shrink-0">
          <div className="glass rounded-xl p-5 sticky top-20 space-y-5">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-neon-green" />
              <h3 className="font-heading text-sm font-semibold">Cüzdanım</h3>
            </div>

            {/* XP Balance */}
            <div className="rounded-lg bg-neon-green/10 border border-neon-green/30 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">XP Bakiye</p>
              <p className="font-heading text-2xl font-bold text-neon-green text-glow-green">
                {MOCK_BALANCES.xp.toLocaleString()} XP
              </p>
            </div>

            {/* CP Balances */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Kategori Puanları</p>
              <div className="space-y-2">
                {MOCK_BALANCES.cp.map((cp) => (
                  <div key={cp.category} className="flex items-center justify-between">
                    <span className="text-sm">{cp.category}</span>
                    <span className={`font-heading text-sm font-medium ${cp.color}`}>
                      {cp.amount} CP
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Convert Button */}
            <Button className="w-full bg-gradient-to-r from-primary to-neon-green text-white font-heading text-sm">
              <ArrowRightLeft className="mr-2 h-4 w-4" /> CP → XP Dönüştür
            </Button>

            {/* Rate Panel */}
            <div className="rounded-lg bg-muted/50 border border-border p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Güncel Oran</span>
                <span className="flex items-center text-xs text-neon-green">
                  <TrendingUp className="h-3 w-3 mr-0.5" /> +2.3%
                </span>
              </div>
              <p className="font-heading text-sm font-medium">1 ELC CP = 12.5 XP</p>
              {/* Mini chart placeholder */}
              <div className="mt-2 h-12 rounded bg-primary/10 flex items-end justify-around px-1">
                {[40, 55, 45, 60, 50, 70, 65, 80, 75, 85].map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 rounded-t bg-primary/60"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Son İşlemler</p>
              <div className="space-y-2">
                {MOCK_ACTIVITY.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{a.text}</span>
                    <span className="text-muted-foreground">{a.time}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={9} />}>
      <CategoryContent />
    </Suspense>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { api } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product-card';
import { Pagination } from '@/components/pagination';
import { ProductGridSkeleton } from '@/components/skeletons';
import { Search } from 'lucide-react';

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
}

const SORT_OPTIONS = [
  { value: 'newest', label: 'En Yeni' },
  { value: 'price_asc', label: 'Fiyat: Düşükten Yükseğe' },
  { value: 'price_desc', label: 'Fiyat: Yüksekten Düşüğe' },
  { value: 'name', label: 'İsim (A-Z)' },
];

function ProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const page = Number(searchParams.get('page')) || 1;
  const search = searchParams.get('search') || '';
  const categoryId = searchParams.get('category') || '';
  const sortBy = searchParams.get('sort') || 'newest';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';

  const [searchInput, setSearchInput] = useState(search);

  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      if (updates.page === undefined && !('page' in updates)) params.set('page', '1');
      router.push(`/products?${params.toString()}`);
    },
    [searchParams, router],
  );

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string | number> = { page, limit: 12, sortBy };
    if (search) params.search = search;
    if (categoryId) params.categoryId = categoryId;
    if (minPrice) params.minPrice = Number(minPrice) * 100; // TL → kuruş
    if (maxPrice) params.maxPrice = Number(maxPrice) * 100;

    api
      .get('/products', { params })
      .then((res) => {
        setProducts(res.data.items);
        setTotalPages(res.data.totalPages);
      })
      .finally(() => setLoading(false));
  }, [page, search, categoryId, sortBy, minPrice, maxPrice]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchInput, page: '1' });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Ürünler</h1>

      {/* Filtreler */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        {/* Arama */}
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Ürün ara..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="outline">
            Ara
          </Button>
        </form>

        {/* Kategori */}
        <select
          value={categoryId}
          onChange={(e) => updateParams({ category: e.target.value, page: '1' })}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Tüm Kategoriler</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Sıralama */}
        <select
          value={sortBy}
          onChange={(e) => updateParams({ sort: e.target.value, page: '1' })}
          className="h-9 rounded-md border bg-background px-3 text-sm"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Fiyat aralığı */}
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min ₺"
            value={minPrice}
            onChange={(e) => updateParams({ minPrice: e.target.value, page: '1' })}
            className="w-24"
          />
          <span className="text-muted-foreground">-</span>
          <Input
            type="number"
            placeholder="Max ₺"
            value={maxPrice}
            onChange={(e) => updateParams({ maxPrice: e.target.value, page: '1' })}
            className="w-24"
          />
        </div>
      </div>

      {/* Ürün Grid */}
      {loading ? (
        <ProductGridSkeleton count={12} />
      ) : products.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">Ürün bulunamadı.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={(p) => updateParams({ page: String(p) })}
      />
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={12} />}>
      <ProductsContent />
    </Suspense>
  );
}

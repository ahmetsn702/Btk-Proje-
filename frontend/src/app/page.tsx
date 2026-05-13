'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product-card';
import { ProductGridSkeleton, CategoryCardSkeleton } from '@/components/skeletons';

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

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/products', { params: { limit: 8, sortBy: 'newest' } }),
      api.get('/categories'),
    ])
      .then(([prodRes, catRes]) => {
        setProducts(prodRes.data.items);
        setCategories(catRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-12">
      {/* Banner */}
      <section className="rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 px-8 py-16 text-center">
        <h1 className="mb-4 text-4xl font-bold">Görevleri Tamamla, Puan Kazan</h1>
        <p className="mx-auto mb-6 max-w-lg text-muted-foreground">
          Görevleri tamamlayarak kategori puanı kazan, XP&apos;ye dönüştür ve alışverişte indirim
          olarak kullan.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/products">
            <Button size="lg">Ürünleri Keşfet</Button>
          </Link>
          <Link href="/tasks">
            <Button size="lg" variant="outline">
              Görevlere Bak
            </Button>
          </Link>
        </div>
      </section>

      {/* Kategoriler */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Kategoriler</h2>
        </div>
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <CategoryCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/categories/${cat.slug}`}
                className="rounded-lg border p-4 text-center transition-shadow hover:shadow-md"
              >
                {cat.image ? (
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="mx-auto mb-3 h-16 w-16 rounded-md object-cover"
                  />
                ) : (
                  <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-md bg-muted text-2xl">
                    📦
                  </div>
                )}
                <p className="text-sm font-medium">{cat.name}</p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Öne Çıkan Ürünler */}
      <section>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Yeni Ürünler</h2>
          <Link href="/products">
            <Button variant="ghost" size="sm">
              Tümünü Gör →
            </Button>
          </Link>
        </div>
        {loading ? (
          <ProductGridSkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

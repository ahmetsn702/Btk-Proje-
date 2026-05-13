'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Suspense } from 'react';
import { api } from '@/lib/api';
import { ProductCard } from '@/components/product-card';
import { Pagination } from '@/components/pagination';
import { ProductGridSkeleton } from '@/components/skeletons';

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

function CategoryContent() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const page = Number(searchParams.get('page')) || 1;

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    // Önce tüm kategorileri çekip slug'dan id bul
    api
      .get('/categories')
      .then((res) => {
        const cat = res.data.find((c: Category) => c.slug === slug);
        if (!cat) {
          router.push('/products');
          return;
        }
        setCategory(cat);
        return api.get(`/categories/${cat.id}/products`, { params: { page, limit: 12 } });
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
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/products" className="hover:underline">
          Ürünler
        </Link>
        <span>/</span>
        <span className="text-foreground">{category?.name || slug}</span>
      </nav>

      <div>
        <h1 className="text-3xl font-bold">{category?.name}</h1>
        {category?.description && (
          <p className="mt-2 text-muted-foreground">{category.description}</p>
        )}
      </div>

      {loading ? (
        <ProductGridSkeleton count={12} />
      ) : products.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">Bu kategoride ürün bulunamadı.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<ProductGridSkeleton count={12} />}>
      <CategoryContent />
    </Suspense>
  );
}

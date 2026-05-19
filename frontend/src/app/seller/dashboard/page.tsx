'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, PackagePlus } from 'lucide-react';
import { ProtectedRoute } from '@/components/protected-route';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';

interface Product {
  id: string;
  name: string;
  priceFiat: number;
  stock: number;
  images: string[];
  isActive?: boolean;
  status?: string;
  category?: {
    id: string;
    name: string;
    slug?: string;
  };
}

interface ProductListResponse {
  items: Product[];
  total: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const stats = [
  { label: 'Toplam Ürün', value: '24' },
  { label: 'Aktif Sipariş', value: '8' },
  { label: 'Toplam Satış', value: '156' },
  { label: 'Bu Ay Kazanç', value: '₺18.450' },
];

function resolveImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
}

function formatPrice(kurus: number) {
  return `₺${Math.round(kurus / 100).toLocaleString('tr-TR')}`;
}

function SellerDashboardContent() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'USER') {
      router.replace('/products');
    }
  }, [router, user?.role]);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    api
      .get<ProductListResponse>('/products')
      .then((res) => {
        if (!cancelled) setProducts(res.data.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setProducts([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => products, [products]);

  return (
    <main className="min-h-screen bg-[#FAFAF7] px-4 py-8 text-[#2A2A2A] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-semibold tracking-normal text-[#2A2A2A]">Mağazam</h1>
          <Link
            href="/admin/products/new"
            className={cn(
              buttonVariants(),
              'inline-flex items-center gap-2 bg-[#7BE0A9] text-[#2A2A2A] hover:bg-[#69CA95]',
            )}
          >
            Yeni Ürün Ekle
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="border-[#ECE8E1] bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-[#6B655D]">{stat.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold text-[#2A2A2A]">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </section>

        <section className="rounded-lg border border-[#ECE8E1] bg-white">
          <div className="flex items-center justify-between border-b border-[#ECE8E1] px-5 py-4">
            <h2 className="text-lg font-semibold text-[#2A2A2A]">Ürünlerim</h2>
          </div>

          {loading ? (
            <div className="px-5 py-12 text-center text-sm text-[#6B655D]">Yükleniyor...</div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center gap-4 px-5 py-14 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-full bg-[#F0F7F4] text-[#6FA58D]">
                <PackagePlus className="h-6 w-6" aria-hidden />
              </div>
              <div>
                <p className="font-semibold text-[#2A2A2A]">Henüz ürün eklemediniz</p>
                <p className="mt-1 text-sm text-[#6B655D]">
                  İlk ürününüzü ekleyerek mağazanızı yayına alın.
                </p>
              </div>
              <Link
                href="/admin/products/new"
                className={cn(
                  buttonVariants(),
                  'inline-flex items-center gap-2 bg-[#7BE0A9] text-[#2A2A2A] hover:bg-[#69CA95]',
                )}
              >
                Yeni Ürün Ekle
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-[#FAFAF7] text-xs uppercase text-[#6B655D]">
                  <tr>
                    <th className="px-5 py-3 font-medium">Görsel</th>
                    <th className="px-5 py-3 font-medium">Ad</th>
                    <th className="px-5 py-3 font-medium">Kategori</th>
                    <th className="px-5 py-3 font-medium">Fiyat</th>
                    <th className="px-5 py-3 font-medium">Stok</th>
                    <th className="px-5 py-3 font-medium">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((product) => {
                    const image = resolveImageUrl(product.images?.[0]);
                    const active = product.isActive ?? product.status !== 'INACTIVE';

                    return (
                      <tr key={product.id} className="border-t border-[#ECE8E1]">
                        <td className="px-5 py-4">
                          <div className="relative h-14 w-14 overflow-hidden rounded-md border border-[#ECE8E1] bg-[#FAFAF7]">
                            {image ? (
                              <Image
                                src={image}
                                alt=""
                                fill
                                sizes="56px"
                                unoptimized
                                className="object-cover"
                              />
                            ) : (
                              <div className="grid h-full w-full place-items-center text-xs text-[#6B655D]">
                                Yok
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 font-medium text-[#2A2A2A]">{product.name}</td>
                        <td className="px-5 py-4 text-[#6B655D]">
                          {product.category?.name ?? 'Kategorisiz'}
                        </td>
                        <td className="px-5 py-4 font-medium text-[#2A2A2A]">
                          {formatPrice(product.priceFiat)}
                        </td>
                        <td className="px-5 py-4 text-[#6B655D]">{product.stock}</td>
                        <td className="px-5 py-4">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-1 text-xs font-medium',
                              active
                                ? 'bg-[#F0F7F4] text-[#2F6F52]'
                                : 'bg-[#F3F1ED] text-[#6B655D]',
                            )}
                          >
                            {active ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function SellerDashboardPage() {
  return (
    <ProtectedRoute>
      <SellerDashboardContent />
    </ProtectedRoute>
  );
}

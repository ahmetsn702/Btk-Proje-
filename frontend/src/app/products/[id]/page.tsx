'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { ProductDetailSkeleton } from '@/components/skeletons';
import { Minus, Plus, ShoppingCart } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description?: string;
  priceFiat: number;
  stock: number;
  images: string[];
  category: { id: string; name: string; slug: string };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

function resolveImageUrl(url: string | undefined): string | null {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_URL}${url}`;
}

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    api
      .get(`/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch(() => router.push('/products'))
      .finally(() => setLoading(false));
  }, [id, router]);

  const addToCart = async () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setAdding(true);
    try {
      await api.post('/cart/items', { productId: product!.id, quantity });
      toast.success('Ürün sepete eklendi');
    } catch {
      toast.error('Sepete eklenemedi');
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <ProductDetailSkeleton />;
  if (!product) return null;

  const price = (product.priceFiat / 100).toFixed(2);

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/products" className="hover:underline">
          Ürünler
        </Link>
        <span>/</span>
        <Link href={`/categories/${product.category.slug}`} className="hover:underline">
          {product.category.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Görseller */}
        <div className="space-y-4">
          <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
            {resolveImageUrl(product.images[selectedImage]) ? (
              <Image
                src={resolveImageUrl(product.images[selectedImage])!}
                alt={product.name}
                width={600}
                height={600}
                unoptimized
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                Görsel yok
              </div>
            )}
          </div>
          {product.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {product.images.map((img, i) => {
                const src = resolveImageUrl(img);
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border ${
                      i === selectedImage ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    {src && (
                      <Image
                        src={src}
                        alt=""
                        width={64}
                        height={64}
                        unoptimized
                        className="h-full w-full object-cover"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Bilgiler */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <Link
              href={`/categories/${product.category.slug}`}
              className="text-sm text-muted-foreground hover:underline"
            >
              {product.category.name}
            </Link>
          </div>

          <p className="text-3xl font-bold">{price} ₺</p>

          {product.description && <p className="text-muted-foreground">{product.description}</p>}

          <div className="text-sm">
            {product.stock > 0 ? (
              <span className="text-green-600">Stokta ({product.stock} adet)</span>
            ) : (
              <span className="text-destructive">Stokta yok</span>
            )}
          </div>

          {/* Miktar + Sepete Ekle */}
          {product.stock > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex items-center rounded-md border">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-10 text-center text-sm">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                  disabled={quantity >= product.stock}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={addToCart} disabled={adding} className="flex-1">
                <ShoppingCart className="mr-2 h-4 w-4" />
                {adding ? 'Ekleniyor...' : 'Sepete Ekle'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

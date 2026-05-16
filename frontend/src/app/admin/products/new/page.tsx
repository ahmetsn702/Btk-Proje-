'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { ProtectedRoute } from '@/components/protected-route';
import { ImageUpload } from '@/components/image-upload';
import { AiDescriptionButton } from '@/components/ai-description-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Category {
  id: string;
  name: string;
}

export default function AdminProductNewPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: '',
    description: '',
    priceFiat: '',
    stock: '',
    categoryId: '',
  });

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      toast.error('En az 1 görsel yükleyin');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/products', {
        name: form.name,
        description: form.description || undefined,
        priceFiat: Math.round(Number(form.priceFiat) * 100),
        stock: Number(form.stock),
        categoryId: form.categoryId,
        images,
      });
      toast.success('Ürün oluşturuldu');
      router.push('/products');
    } catch {
      toast.error('Ürün oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-3xl font-bold">Yeni Ürün Ekle</h1>
        <Card>
          <CardHeader>
            <CardTitle>Ürün Bilgileri</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Ürün Adı *</Label>
                <Input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Açıklama</Label>
                  <AiDescriptionButton
                    type="product"
                    name={form.name}
                    category={categories.find((c) => c.id === form.categoryId)?.name || ''}
                    onGenerated={(desc) => setForm({ ...form, description: desc })}
                  />
                </div>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fiyat (₺) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={form.priceFiat}
                    onChange={(e) => setForm({ ...form, priceFiat: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stok *</Label>
                  <Input
                    type="number"
                    min="0"
                    required
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Kategori *</Label>
                <select
                  required
                  value={form.categoryId}
                  onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Seçin</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Görseller * (min 1, max 5)</Label>
                <ImageUpload value={images} onChange={setImages} />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? 'Kaydediliyor...' : 'Ürün Oluştur'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}

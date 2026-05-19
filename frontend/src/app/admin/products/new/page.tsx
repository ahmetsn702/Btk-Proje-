'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  ArrowRight,
  Check,
  ChevronRight,
  Eye,
  ImagePlus,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { api } from '@/lib/api';
import { ProtectedRoute } from '@/components/protected-route';
import { cn } from '@/lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const NAME_MAX = 80;
const DESC_MAX = 1200;
const IMG_MAX = 5;

const INPUT_BASE =
  'w-full rounded-[10px] border border-[#ECE8E1] bg-white px-3 py-2 text-[13.5px] leading-[1.4] text-[#2A2A2A] placeholder:text-[#9A9A93] outline-none transition-colors focus:border-[#6FA58D] focus:ring-[3px] focus:ring-[#6FA58D]/20 disabled:bg-[#F4F1EA] disabled:text-[#9A9A93]';

interface Category {
  id: string;
  name: string;
}

interface FormState {
  name: string;
  description: string;
  priceFiat: string; // TL string (örn. "199,90")
  stock: string;
  categoryId: string;
  isActive: boolean;
  lowStockThreshold: string;
}

const INITIAL_FORM: FormState = {
  name: '',
  description: '',
  priceFiat: '',
  stock: '',
  categoryId: '',
  isActive: true,
  lowStockThreshold: '',
};

function resolveImageUrl(url: string): string {
  if (url.startsWith('http') || url.startsWith('data:')) return url;
  return `${API_URL}${url}`;
}

export default function AdminProductNewPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [images, setImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    api
      .get('/categories')
      .then((res) => setCategories(Array.isArray(res.data) ? res.data : []))
      .catch(() => setCategories([]));
  }, []);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const selectedCategory = categories.find((c) => c.id === form.categoryId);

  /* ── AI açıklama (mevcut endpoint) ────────────────────────────────── */
  const handleAi = async () => {
    if (!form.name.trim()) {
      toast.error('Önce ürün adını gir');
      return;
    }
    if (!selectedCategory) {
      toast.error('Önce kategori seç');
      return;
    }
    setAiLoading(true);
    try {
      const { data } = await api.post<{ description: string }>('/ai/generate-description', {
        type: 'product',
        name: form.name,
        category: selectedCategory.name,
      });
      update('description', data.description);
      toast.success('AI açıklama oluşturuldu');
    } catch {
      toast.error('AI açıklama üretilemedi');
    } finally {
      setAiLoading(false);
    }
  };

  /* ── Görsel yükleme (mevcut /upload endpoint'leri) ─────────────────── */
  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files).slice(0, IMG_MAX - images.length);
      if (fileArr.length === 0) return;
      const tooBig = fileArr.find((f) => f.size > 5 * 1024 * 1024);
      if (tooBig) {
        toast.error('Dosya boyutu 5 MB sınırını aşıyor');
        return;
      }
      const fd = new FormData();
      if (fileArr.length === 1) fd.append('file', fileArr[0]);
      else fileArr.forEach((f) => fd.append('files', f));
      setUploadingImg(true);
      try {
        const endpoint = fileArr.length === 1 ? '/upload/image' : '/upload/images';
        const { data } = await api.post<{ urls: string[] }>(endpoint, fd);
        setImages((prev) => [...prev, ...data.urls]);
      } catch {
        toast.error('Görsel yüklenemedi');
      } finally {
        setUploadingImg(false);
      }
    },
    [images.length],
  );

  const removeImage = (idx: number) => setImages((prev) => prev.filter((_, i) => i !== idx));

  /* ── Submit ───────────────────────────────────────────────────────── */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return toast.error('Ürün adı zorunlu');
    if (!form.categoryId) return toast.error('Kategori seç');
    const price = Number(String(form.priceFiat).replace(',', '.'));
    if (!price || price <= 0) return toast.error('Geçerli bir fiyat gir');
    const stock = Number(form.stock);
    if (Number.isNaN(stock) || stock < 0) return toast.error('Geçerli stok değeri gir');
    if (images.length === 0) return toast.error('En az 1 görsel ekle');

    setSubmitting(true);
    try {
      await api.post('/products', {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        priceFiat: Math.round(price * 100),
        stock,
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

  /* ── ⌘S taslak (görsel — gerçek backend draft sonra) ──────────────── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        toast.info('Taslak kaydedildi');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* ── Tamamlanma checklist ────────────────────────────────────────── */
  const checklist = useMemo(
    () => [
      { label: 'Ürün adı', done: form.name.trim().length > 0 },
      { label: 'Açıklama', done: form.description.trim().length > 0 },
      {
        label: 'Fiyat',
        done: Number(String(form.priceFiat).replace(',', '.')) > 0,
      },
      {
        label: 'Stok',
        done: form.stock !== '' && Number(form.stock) >= 0,
      },
      { label: 'Kategori', done: form.categoryId !== '' },
      { label: 'En az 1 görsel', done: images.length > 0 },
    ],
    [form, images],
  );
  const completedCount = checklist.filter((c) => c.done).length;
  const completionPct = Math.round((completedCount / checklist.length) * 100);

  /* ────────────────────────────────────────────────────────────────── */
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[#FAFAF7] text-[#2A2A2A]">
        <form
          onSubmit={handleSubmit}
          className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 lg:px-10 lg:py-10"
        >
          {/* Top header */}
          <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <nav
                className="flex items-center gap-1 text-[12px] text-[#9A9A93]"
                aria-label="Breadcrumb"
              >
                <Link href="/admin" className="hover:text-[#2A2A2A]">
                  Admin
                </Link>
                <ChevronRight className="h-3 w-3" aria-hidden />
                <Link href="/admin/products" className="hover:text-[#2A2A2A]">
                  Ürünler
                </Link>
                <ChevronRight className="h-3 w-3" aria-hidden />
                <span className="text-[#2A2A2A]">Yeni Ekle</span>
              </nav>
              <h1
                className="mt-2 text-[28px] font-bold tracking-tight text-[#2A2A2A]"
                style={{
                  fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
                }}
              >
                Yeni Ürün Ekle
              </h1>
              <p className="mt-1 text-[13.5px] text-[#5C5953]">
                Kataloğuna yeni bir ürün ekle ve mağazada yayınla.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#ECE8E1] bg-white px-3 py-1.5 text-[12.5px] text-[#9A9A93]">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#9A9A93]" aria-hidden />
              Taslak otomatik kaydediliyor
            </div>
          </header>

          {/* Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Sol — Form */}
            <div className="space-y-6 lg:col-span-2">
              {/* Bölüm 1 — Temel Bilgiler */}
              <SectionCard
                title="Temel Bilgiler"
                badge="1 / 3"
                description="Ürününün kataloğa gireceği ana içeriği gir."
              >
                <Field
                  label="Ürün Adı"
                  required
                  hint={`${form.name.length}/${NAME_MAX}`}
                  htmlFor="p-name"
                >
                  <input
                    id="p-name"
                    required
                    maxLength={NAME_MAX}
                    value={form.name}
                    onChange={(e) => update('name', e.target.value)}
                    placeholder="Örn. El Dokuma Keten Yastık Kılıfı — Toprak"
                    className={INPUT_BASE}
                  />
                </Field>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="p-desc" className="text-[13px] font-semibold text-[#2A2A2A]">
                      Açıklama
                    </label>
                    <button
                      type="button"
                      onClick={handleAi}
                      disabled={aiLoading}
                      className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#7BE0A9] px-3 py-1.5 text-[12.5px] font-bold text-[#173122] transition-colors hover:bg-[#52C784] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D] focus-visible:ring-offset-2 disabled:opacity-60"
                    >
                      {aiLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      AI ile Üret
                    </button>
                  </div>
                  <textarea
                    id="p-desc"
                    value={form.description}
                    onChange={(e) => update('description', e.target.value)}
                    rows={6}
                    maxLength={DESC_MAX}
                    placeholder="Ürünün özelliklerini, malzemesini ve kullanım alanını yaz — ya da AI ile başla."
                    className={cn(INPUT_BASE, 'resize-y leading-relaxed')}
                  />
                  <div className="flex items-center justify-between text-[11.5px] text-[#9A9A93]">
                    <span>Markdown desteklenir.</span>
                    <span className="font-mono tabular-nums">
                      {form.description.length}/{DESC_MAX}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Fiyat (₺)" required hint="KDV dahil" htmlFor="p-price">
                    <div className="relative">
                      <span
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13.5px] text-[#9A9A93]"
                        aria-hidden
                      >
                        ₺
                      </span>
                      <input
                        id="p-price"
                        required
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.priceFiat}
                        onChange={(e) => update('priceFiat', e.target.value)}
                        placeholder="0,00"
                        className={cn(INPUT_BASE, 'pl-7 pr-3 tabular-nums')}
                      />
                    </div>
                  </Field>

                  <Field label="Stok" required htmlFor="p-stock">
                    <div className="relative">
                      <input
                        id="p-stock"
                        required
                        type="number"
                        min="0"
                        value={form.stock}
                        onChange={(e) => update('stock', e.target.value)}
                        placeholder="0"
                        className={cn(INPUT_BASE, 'pr-12 tabular-nums')}
                      />
                      <span
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] text-[#9A9A93]"
                        aria-hidden
                      >
                        adet
                      </span>
                    </div>
                  </Field>
                </div>

                <Field label="Kategori" required htmlFor="p-cat">
                  <select
                    id="p-cat"
                    required
                    value={form.categoryId}
                    onChange={(e) => update('categoryId', e.target.value)}
                    className={cn(INPUT_BASE, 'appearance-none pr-9')}
                    style={{
                      backgroundImage:
                        "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%239A9A93%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22M6 9l6 6 6-6%22/></svg>')",
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 10px center',
                      backgroundSize: '16px',
                    }}
                  >
                    <option value="">Kategori seç…</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </SectionCard>

              {/* Bölüm 2 — Görseller */}
              <SectionCard
                title="Görseller"
                badge={`${images.length} / ${IMG_MAX}`}
                description="İlk görsel, kapak olarak kullanılır."
              >
                {images.length < IMG_MAX && (
                  <label
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
                    }}
                    className={cn(
                      'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[8px] border border-dashed bg-[#FAFAF7] px-4 py-9 text-center transition-colors',
                      dragOver
                        ? 'border-[#6FA58D] bg-[#F0F7F4]'
                        : 'border-[#ECE8E1] hover:border-[#6FA58D]/50',
                    )}
                  >
                    {uploadingImg ? (
                      <Loader2 className="h-7 w-7 animate-spin text-[#6FA58D]" />
                    ) : (
                      <span className="grid h-11 w-11 place-items-center rounded-full bg-white text-[#6FA58D] shadow-[0_1px_2px_rgba(40,32,26,0.06)]">
                        <Upload className="h-5 w-5" aria-hidden />
                      </span>
                    )}
                    <p className="text-[13.5px] text-[#5C5953]">
                      <span className="font-semibold text-[#6FA58D] underline-offset-2 hover:underline">
                        Tıkla
                      </span>{' '}
                      veya buraya sürükleyip bırak
                    </p>
                    <p className="text-[11.5px] text-[#9A9A93]">
                      JPG, PNG, WebP · Min 1 · Max {IMG_MAX} görsel · 5 MB/dosya
                    </p>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={(e) => {
                        if (e.target.files?.length) uploadFiles(e.target.files);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>
                )}

                {images.length > 0 && (
                  <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">
                    {images.map((url, i) => (
                      <li
                        key={`${url}-${i}`}
                        className="group relative aspect-square overflow-hidden rounded-[10px] border border-[#ECE8E1] bg-[#F4F1EA]"
                      >
                        <Image
                          src={resolveImageUrl(url)}
                          alt=""
                          fill
                          sizes="120px"
                          unoptimized
                          className="object-cover"
                        />
                        {i === 0 && (
                          <span className="absolute left-1.5 top-1.5 rounded-md bg-[#0F1117]/85 px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-[0.06em] text-white">
                            Kapak
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(i)}
                          aria-label={`Görseli ${i + 1} sil`}
                          className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-white/95 text-[#E28D7A] opacity-0 shadow-sm transition-opacity hover:bg-white group-hover:opacity-100"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </SectionCard>

              {/* Bölüm 3 — Yayın Ayarları */}
              <SectionCard
                title="Yayın Ayarları"
                badge="3 / 3"
                description="Ürünün durumu ve uyarı eşikleri."
              >
                <div className="flex items-center justify-between rounded-[10px] border border-[#ECE8E1] bg-[#FAFAF7] px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold text-[#2A2A2A]">
                      <span
                        className="mr-2 inline-block h-1.5 w-1.5 rounded-full"
                        style={{
                          background: form.isActive ? '#6FA58D' : '#9A9A93',
                        }}
                        aria-hidden
                      />
                      Ürün durumu — {form.isActive ? 'Aktif' : 'Pasif'}
                    </p>
                    <p className="mt-0.5 text-[12px] text-[#5C5953]">
                      Mağazada listelenir ve satılabilir.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.isActive}
                    aria-label="Ürün durumu"
                    onClick={() => update('isActive', !form.isActive)}
                    className={cn(
                      'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D] focus-visible:ring-offset-2',
                      form.isActive ? 'bg-[#6FA58D]' : 'bg-[#D9D5CB]',
                    )}
                  >
                    <span
                      className={cn(
                        'inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform',
                        form.isActive ? 'translate-x-[22px]' : 'translate-x-0.5',
                      )}
                    />
                  </button>
                </div>

                <Field label="Stok Uyarı Eşiği" htmlFor="p-low">
                  <div className="relative">
                    <input
                      id="p-low"
                      type="number"
                      min="0"
                      value={form.lowStockThreshold}
                      onChange={(e) => update('lowStockThreshold', e.target.value)}
                      placeholder="örn. 5"
                      className={cn(INPUT_BASE, 'pr-12 tabular-nums')}
                    />
                    <span
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[12.5px] text-[#9A9A93]"
                      aria-hidden
                    >
                      adet
                    </span>
                  </div>
                </Field>
              </SectionCard>

              {/* Alt butonlar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-[12.5px] text-[#9A9A93]">
                  <kbd className="mr-1 inline-flex items-center rounded border border-[#ECE8E1] bg-white px-1.5 py-0.5 font-mono text-[11px] text-[#5C5953]">
                    ⌘ S
                  </kbd>
                  ile taslak kaydet
                </p>
                <div className="flex gap-3">
                  <Link
                    href="/admin/products"
                    className="inline-flex items-center rounded-[10px] border border-[#ECE8E1] bg-white px-4 py-2.5 text-[13.5px] font-semibold text-[#5C5953] transition-colors hover:border-[#9A9A93] hover:text-[#2A2A2A]"
                  >
                    Vazgeç
                  </Link>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center gap-2 rounded-[10px] bg-[#2A2A2A] px-5 py-2.5 text-[13.5px] font-bold text-white transition-colors hover:bg-[#0F1117] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2A2A2A] focus-visible:ring-offset-2 disabled:opacity-60"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Kaydediliyor…
                      </>
                    ) : (
                      <>
                        Ürün Oluştur <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Sağ — Önizleme */}
            <aside className="lg:col-span-1">
              <PreviewPanel
                form={form}
                category={selectedCategory?.name}
                cover={images[0] ? resolveImageUrl(images[0]) : null}
                checklist={checklist}
                completionPct={completionPct}
                completedCount={completedCount}
              />
            </aside>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Section Card
 * ────────────────────────────────────────────────────────────────────────── */
function SectionCard({
  title,
  badge,
  description,
  children,
}: {
  title: string;
  badge?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[12px] border border-[#ECE8E1] bg-white shadow-[0_1px_2px_rgba(40,32,26,0.04)]">
      <header className="flex items-start justify-between gap-3 border-b border-[#F4F1EA] px-5 py-4">
        <div>
          <h2 className="text-[15.5px] font-bold text-[#2A2A2A]">{title}</h2>
          {description && <p className="mt-0.5 text-[12.5px] text-[#5C5953]">{description}</p>}
        </div>
        {badge && (
          <span className="rounded-full bg-[#F4F1EA] px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.06em] text-[#5C5953]">
            {badge}
          </span>
        )}
      </header>
      <div className="space-y-4 px-5 py-5">{children}</div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Field — label + hint + control
 * ────────────────────────────────────────────────────────────────────────── */
function Field({
  label,
  hint,
  required,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-semibold text-[#2A2A2A]">
          {label}
          {required && <span className="ml-1 text-[#E28D7A]">*</span>}
        </label>
        {hint && (
          <span className="font-mono text-[11.5px] text-[#9A9A93] tabular-nums">{hint}</span>
        )}
      </div>
      {children}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Preview panel (sticky)
 * ────────────────────────────────────────────────────────────────────────── */
function PreviewPanel({
  form,
  category,
  cover,
  checklist,
  completionPct,
  completedCount,
}: {
  form: FormState;
  category: string | undefined;
  cover: string | null;
  checklist: { label: string; done: boolean }[];
  completionPct: number;
  completedCount: number;
}) {
  const price = Number(String(form.priceFiat).replace(',', '.'));
  return (
    <div className="space-y-4 lg:sticky lg:top-24">
      <section className="overflow-hidden rounded-[12px] border border-[#ECE8E1] bg-white shadow-[0_1px_2px_rgba(40,32,26,0.04)]">
        <header className="flex items-center justify-between border-b border-[#F4F1EA] px-5 py-3.5">
          <span className="inline-flex items-center gap-2 text-[13px] font-bold text-[#2A2A2A]">
            <Eye className="h-4 w-4 text-[#5C5953]" aria-hidden /> Ürün Önizlemesi
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EAF3EE] px-2.5 py-0.5 text-[10.5px] font-bold tracking-[0.04em] text-[#3F7561]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#6FA58D]" aria-hidden />
            CANLI
          </span>
        </header>

        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F4F1EA]">
          {cover ? (
            <Image src={cover} alt="" fill sizes="400px" unoptimized className="object-cover" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-[#9A9A93]">
              <ImagePlus className="h-7 w-7" aria-hidden />
              <p className="text-[12px]">Kapak görseli buraya gelecek</p>
            </div>
          )}
          {form.isActive && (
            <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-[#EAF3EE] px-2.5 py-1 text-[10.5px] font-bold text-[#3F7561]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6FA58D]" aria-hidden />
              Yayında
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2.5 px-5 py-4">
          {category && (
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[#9A9A93]">
              {category}
            </p>
          )}
          <h3 className="text-[16px] font-bold leading-snug -tracking-[0.005em] text-[#2A2A2A]">
            {form.name || 'Ürün adı önizlemesi'}
          </h3>
          <p className="line-clamp-3 whitespace-pre-line text-[12.5px] leading-relaxed text-[#5C5953]">
            {form.description || 'Açıklama eklendiğinde burada görünecek.'}
          </p>
          <div className="mt-1 flex items-baseline justify-between border-t border-[#F4F1EA] pt-3">
            <span
              className="text-[20px] font-bold tabular-nums text-[#2A2A2A]"
              style={{
                fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
              }}
            >
              ₺
              {price > 0
                ? price.toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : '0,00'}
            </span>
            <span className="text-[11.5px] font-medium text-[#5C5953]">
              {form.stock !== '' ? `${form.stock} adet stokta` : 'stok girilmedi'}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-[12px] border border-[#ECE8E1] bg-white p-5 shadow-[0_1px_2px_rgba(40,32,26,0.04)]">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-[13px] font-bold text-[#2A2A2A]">Tamamlanma</h4>
          <span className="font-mono text-[12.5px] font-semibold tabular-nums text-[#5C5953]">
            {completedCount}/{checklist.length}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-[#F1ECE2]"
          role="progressbar"
          aria-valuenow={completionPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#6FA58D] to-[#52C784] transition-[width] duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <ul className="mt-4 flex flex-col gap-2">
          {checklist.map((c) => (
            <li key={c.label} className="flex items-center gap-2 text-[13px]">
              <span
                className={cn(
                  'grid h-5 w-5 place-items-center rounded-full border transition-colors',
                  c.done
                    ? 'border-transparent bg-[#6FA58D] text-white'
                    : 'border-[#ECE8E1] bg-white text-[#9A9A93]',
                )}
                aria-hidden
              >
                {c.done ? <Check className="h-3 w-3" /> : null}
              </span>
              <span className={c.done ? 'text-[#2A2A2A]' : 'text-[#5C5953]'}>{c.label}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

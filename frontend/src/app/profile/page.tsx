'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Loader2, MapPin, Plus, Star, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

/* ────────────────────────────────────────────────────────────────────────── *
 * Schemas
 * ────────────────────────────────────────────────────────────────────────── */
const profileSchema = z.object({
  firstName: z.string().min(1, 'Ad gerekli'),
  lastName: z.string().min(1, 'Soyad gerekli'),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mevcut şifre gerekli'),
    newPassword: z.string().min(6, 'En az 6 karakter'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

const addressSchema = z.object({
  title: z.string().min(1, 'Başlık gerekli'),
  fullName: z.string().min(1, 'Ad soyad gerekli'),
  phone: z.string().min(10, 'Geçerli telefon girin'),
  city: z.string().min(1, 'Şehir gerekli'),
  district: z.string().min(1, 'İlçe gerekli'),
  address: z.string().min(5, 'Adres gerekli'),
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;
type AddressForm = z.infer<typeof addressSchema>;

interface Address {
  id: string;
  title: string;
  fullName: string;
  phone: string;
  city: string;
  district: string;
  address: string;
  isDefault: boolean;
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Stil yardımcıları
 * ────────────────────────────────────────────────────────────────────────── */
const INPUT_BASE =
  'w-full rounded-[10px] border border-[#ECE8E1] bg-white px-3 py-2 text-[13.5px] leading-[1.4] text-[#2A2A2A] placeholder:text-[#9A9A93] outline-none transition-colors focus:border-[#6FA58D] focus:ring-[3px] focus:ring-[#6FA58D]/20 disabled:bg-[#F4F1EA] disabled:text-[#9A9A93]';

const HEADING_FONT = 'var(--font-space-grotesk), system-ui, sans-serif' as const;

/* ────────────────────────────────────────────────────────────────────────── */
export default function ProfilePage() {
  const { user, fetchUser } = useAuthStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);

  // CP Kullanım Sınırı (localStorage destekli, default %7)
  // DEV2_API_READY: false — gerçek limit Dev2 servislerinde kullanıcı bazlı saklanacak.
  const [cpLimit, setCpLimit] = useState<number>(7);
  const [savedCpLimit, setSavedCpLimit] = useState<number>(7);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('cp_usage_limit');
    const parsed = stored ? parseInt(stored, 10) : NaN;
    if (!Number.isNaN(parsed) && parsed >= 7 && parsed <= 15) {
      setCpLimit(parsed);
      setSavedCpLimit(parsed);
    }
  }, []);

  const handleSaveCpLimit = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('cp_usage_limit', String(cpLimit));
    }
    setSavedCpLimit(cpLimit);
    toast.success(`CP kullanım sınırı %${cpLimit} olarak kaydedildi`);
  };

  /* ── Forms ───────────────────────────────────────────────────────── */
  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user?.firstName || '', lastName: user?.lastName || '' },
  });
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });
  const addressForm = useForm<AddressForm>({ resolver: zodResolver(addressSchema) });

  useEffect(() => {
    if (user) {
      profileForm.reset({ firstName: user.firstName || '', lastName: user.lastName || '' });
    }
  }, [user, profileForm]);

  useEffect(() => {
    api
      .get('/addresses')
      .then((res) => setAddresses(res.data))
      .catch(() => {});
  }, []);

  /* ── Submit handlers (mevcut logic korundu) ───────────────────────── */
  const onProfileSubmit = async (data: ProfileForm) => {
    try {
      await api.patch('/users/me', data);
      await fetchUser();
      toast.success('Profil güncellendi');
    } catch {
      toast.error('Güncelleme başarısız');
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
      await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      passwordForm.reset();
      toast.success('Şifre güncellendi');
    } catch {
      toast.error('Şifre güncellenemedi');
    }
  };

  const onAddressSubmit = async (data: AddressForm) => {
    try {
      const { data: addr } = await api.post('/addresses', data);
      setAddresses((prev) => [...prev, addr]);
      addressForm.reset();
      setShowAddressForm(false);
      toast.success('Adres eklendi');
    } catch {
      toast.error('Adres eklenemedi');
    }
  };

  const deleteAddress = async (id: string) => {
    try {
      await api.delete(`/addresses/${id}`);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      toast.success('Adres silindi');
    } catch {
      toast.error('Silinemedi');
    }
  };

  /* ────────────────────────────────────────────────────────────────── */
  return (
    <>
      <ProfileLightThemeStyles />
      <div className="space-y-6 text-[#2A2A2A]">
        <header>
          <h1
            className="text-[28px] font-bold tracking-tight text-[#2A2A2A]"
            style={{ fontFamily: HEADING_FONT }}
          >
            Kişisel Bilgiler
          </h1>
          <p className="mt-1 text-[13.5px] text-[#5C5953]">
            Profil, şifre, adresler ve XP indirim tercihlerini buradan yönet.
          </p>
        </header>

        {/* Profil */}
        <SectionCard title="Profil" description="Hesabında görünen ad ve soyad bilgileri.">
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Ad" htmlFor="p-first" required>
                <input id="p-first" className={INPUT_BASE} {...profileForm.register('firstName')} />
                <FieldError>{profileForm.formState.errors.firstName?.message}</FieldError>
              </Field>
              <Field label="Soyad" htmlFor="p-last" required>
                <input id="p-last" className={INPUT_BASE} {...profileForm.register('lastName')} />
                <FieldError>{profileForm.formState.errors.lastName?.message}</FieldError>
              </Field>
            </div>
            <Field label="E-posta" htmlFor="p-mail" hint="Değiştirilemez">
              <input id="p-mail" value={user?.email || ''} disabled className={INPUT_BASE} />
            </Field>
            <div>
              <button
                type="submit"
                disabled={profileForm.formState.isSubmitting}
                className="inline-flex items-center gap-2 rounded-[10px] bg-[#7BE0A9] px-4 py-2 text-[13.5px] font-bold text-[#173122] transition-colors hover:bg-[#52C784] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D] focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {profileForm.formState.isSubmitting && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {profileForm.formState.isSubmitting ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        </SectionCard>

        {/* Şifre Değiştir */}
        <SectionCard
          title="Şifre Değiştir"
          description="Hesap güvenliğin için şifreni düzenli aralıklarla yenile."
        >
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <Field label="Mevcut Şifre" htmlFor="pw-current" required>
              <input
                id="pw-current"
                type="password"
                className={INPUT_BASE}
                {...passwordForm.register('currentPassword')}
              />
              <FieldError>{passwordForm.formState.errors.currentPassword?.message}</FieldError>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Yeni Şifre" htmlFor="pw-new" hint="En az 6 karakter" required>
                <input
                  id="pw-new"
                  type="password"
                  className={INPUT_BASE}
                  {...passwordForm.register('newPassword')}
                />
                <FieldError>{passwordForm.formState.errors.newPassword?.message}</FieldError>
              </Field>
              <Field label="Yeni Şifre Tekrar" htmlFor="pw-confirm" required>
                <input
                  id="pw-confirm"
                  type="password"
                  className={INPUT_BASE}
                  {...passwordForm.register('confirmPassword')}
                />
                <FieldError>{passwordForm.formState.errors.confirmPassword?.message}</FieldError>
              </Field>
            </div>
            <div>
              <button
                type="submit"
                disabled={passwordForm.formState.isSubmitting}
                className="inline-flex items-center gap-2 rounded-[10px] bg-[#2A2A2A] px-4 py-2 text-[13.5px] font-bold text-white transition-colors hover:bg-[#0F1117] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2A2A2A] focus-visible:ring-offset-2 disabled:opacity-60"
              >
                {passwordForm.formState.isSubmitting && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                {passwordForm.formState.isSubmitting ? 'Güncelleniyor…' : 'Şifreyi Güncelle'}
              </button>
            </div>
          </form>
        </SectionCard>

        {/* Adresler */}
        <SectionCard
          title="Adreslerim"
          description="Sipariş teslimatında kullanılacak adresler."
          rightActions={
            !showAddressForm && (
              <button
                type="button"
                onClick={() => setShowAddressForm(true)}
                className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#6FA58D] bg-white px-3.5 py-1.5 text-[12.5px] font-semibold text-[#6FA58D] transition-colors hover:bg-[#F0F7F4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D] focus-visible:ring-offset-2"
              >
                <Plus className="h-3.5 w-3.5" /> Yeni Adres
              </button>
            )
          }
        >
          <div className="space-y-3">
            {addresses.map((addr) => (
              <article
                key={addr.id}
                className="flex items-start justify-between gap-3 rounded-[10px] border border-[#ECE8E1] bg-[#FAFAF7] px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[13.5px] font-bold text-[#2A2A2A]">
                      <MapPin className="h-3.5 w-3.5 text-[#6FA58D]" aria-hidden />
                      {addr.title}
                    </span>
                    {addr.isDefault && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF3EE] px-2 py-0.5 text-[10.5px] font-bold tracking-[0.02em] text-[#3F7561]">
                        <Star className="h-2.5 w-2.5 fill-[#6FA58D] text-[#6FA58D]" aria-hidden />
                        Varsayılan
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[13px] text-[#2A2A2A]">
                    {addr.fullName}
                    <span className="text-[#9A9A93]"> · </span>
                    <span className="font-mono tabular-nums text-[#5C5953]">{addr.phone}</span>
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-[#5C5953]">
                    {addr.address}, {addr.district}/{addr.city}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteAddress(addr.id)}
                  aria-label={`${addr.title} adresini sil`}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-[8px] text-[#9A9A93] transition-colors hover:bg-[#F8E8E0] hover:text-[#E28D7A] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E28D7A]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </article>
            ))}

            {showAddressForm && (
              <form
                onSubmit={addressForm.handleSubmit(onAddressSubmit)}
                className="space-y-3 rounded-[10px] border border-[#ECE8E1] bg-[#FAFAF7] p-4"
              >
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Başlık" htmlFor="a-title" required>
                    <input
                      id="a-title"
                      placeholder="Ev"
                      className={INPUT_BASE}
                      {...addressForm.register('title')}
                    />
                    <FieldError>{addressForm.formState.errors.title?.message}</FieldError>
                  </Field>
                  <Field label="Ad Soyad" htmlFor="a-name" required>
                    <input
                      id="a-name"
                      className={INPUT_BASE}
                      {...addressForm.register('fullName')}
                    />
                    <FieldError>{addressForm.formState.errors.fullName?.message}</FieldError>
                  </Field>
                  <Field label="Telefon" htmlFor="a-phone" required>
                    <input
                      id="a-phone"
                      placeholder="05XX XXX XX XX"
                      className={INPUT_BASE}
                      {...addressForm.register('phone')}
                    />
                    <FieldError>{addressForm.formState.errors.phone?.message}</FieldError>
                  </Field>
                  <Field label="Şehir" htmlFor="a-city" required>
                    <input id="a-city" className={INPUT_BASE} {...addressForm.register('city')} />
                    <FieldError>{addressForm.formState.errors.city?.message}</FieldError>
                  </Field>
                  <Field label="İlçe" htmlFor="a-district" required>
                    <input
                      id="a-district"
                      className={INPUT_BASE}
                      {...addressForm.register('district')}
                    />
                    <FieldError>{addressForm.formState.errors.district?.message}</FieldError>
                  </Field>
                </div>
                <Field label="Adres" htmlFor="a-addr" required>
                  <input
                    id="a-addr"
                    placeholder="Mahalle, sokak, bina no, daire no"
                    className={INPUT_BASE}
                    {...addressForm.register('address')}
                  />
                  <FieldError>{addressForm.formState.errors.address?.message}</FieldError>
                </Field>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    disabled={addressForm.formState.isSubmitting}
                    className="inline-flex items-center gap-2 rounded-[10px] bg-[#7BE0A9] px-4 py-2 text-[13px] font-bold text-[#173122] transition-colors hover:bg-[#52C784] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D] focus-visible:ring-offset-2 disabled:opacity-60"
                  >
                    {addressForm.formState.isSubmitting && (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    )}
                    Kaydet
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddressForm(false)}
                    className="inline-flex items-center rounded-[10px] border border-[#ECE8E1] bg-white px-4 py-2 text-[13px] font-semibold text-[#5C5953] transition-colors hover:border-[#9A9A93] hover:text-[#2A2A2A]"
                  >
                    İptal
                  </button>
                </div>
              </form>
            )}

            {addresses.length === 0 && !showAddressForm && (
              <p className="rounded-[10px] border border-dashed border-[#ECE8E1] bg-[#FAFAF7] py-8 text-center text-[13px] text-[#5C5953]">
                Henüz adres eklenmemiş.
              </p>
            )}
          </div>
        </SectionCard>

        {/* CP Kullanım Sınırı */}
        <SectionCard
          title="CP Kullanım Sınırı"
          description="Alışverişlerde CP puanıyla yapabileceğiniz maksimum indirim oranı."
        >
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label="CP kullanım sınırı oranı"
          >
            {[7, 8, 9, 10, 11, 12, 13, 14, 15].map((p) => {
              const active = p === cpLimit;
              return (
                <button
                  key={p}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setCpLimit(p)}
                  className={
                    'rounded-full border px-4 py-1.5 text-[13px] font-semibold tabular-nums transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D] focus-visible:ring-offset-2 ' +
                    (active
                      ? 'border-transparent bg-[#6FA58D] text-white shadow-[0_1px_2px_rgba(40,32,26,0.08)]'
                      : 'border-[#ECE8E1] bg-white text-[#5C5953] hover:border-[#6FA58D]/50 hover:text-[#2A2A2A]')
                  }
                >
                  %{p}
                </button>
              );
            })}
          </div>

          <p className="text-[12px] text-[#9A9A93]">
            Minimum %7, maksimum %15. Bu oran tüm alışverişlerinize uygulanır.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSaveCpLimit}
              disabled={savedCpLimit === cpLimit}
              className="inline-flex items-center rounded-[10px] bg-[#7BE0A9] px-4 py-2 text-[13.5px] font-bold text-[#173122] transition-colors hover:bg-[#52C784] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Kaydet
            </button>
            <span className="text-[12px] text-[#5C5953]">
              Mevcut sınır:{' '}
              <b className="font-semibold tabular-nums text-[#2A2A2A]">%{savedCpLimit}</b>
            </span>
          </div>
        </SectionCard>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Section Card
 * ────────────────────────────────────────────────────────────────────────── */
function SectionCard({
  title,
  description,
  rightActions,
  children,
}: {
  title: string;
  description?: string;
  rightActions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[12px] border border-[#ECE8E1] bg-white shadow-[0_1px_2px_rgba(40,32,26,0.04)]">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#F4F1EA] px-5 py-4">
        <div>
          <h2 className="text-[16px] font-bold text-[#2A2A2A]">{title}</h2>
          {description && <p className="mt-0.5 text-[12.5px] text-[#5C5953]">{description}</p>}
        </div>
        {rightActions}
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
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-semibold text-[#5C5953]">
          {label}
          {required && <span className="ml-1 text-[#E28D7A]">*</span>}
        </label>
        {hint && <span className="text-[11.5px] text-[#9A9A93]">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function FieldError({ children }: { children?: string }) {
  if (!children) return null;
  return <p className="text-[11.5px] text-[#E28D7A]">{children}</p>;
}

/* ────────────────────────────────────────────────────────────────────────── *
 * Sidebar override (orders/transactions ile tutarlı)
 * Sayfa unmount olunca otomatik kalkar — layout.tsx dokunulmadı.
 * ────────────────────────────────────────────────────────────────────────── */
function ProfileLightThemeStyles() {
  return (
    <style jsx global>{`
      body {
        background: #fafaf7 !important;
        color: #2a2a2a !important;
      }
      nav.space-y-1 {
        background: #ffffff;
        border-right: 1px solid #ece8e1;
        border-radius: 12px;
        padding: 8px 0;
      }
      nav.space-y-1 > a {
        color: #5c5953 !important;
        background: transparent !important;
        border-left: 3px solid transparent !important;
        border-radius: 0 !important;
        padding-left: 13px !important;
        font-weight: 500 !important;
      }
      nav.space-y-1 > a:hover {
        color: #2a2a2a !important;
        background: #f8f6f1 !important;
      }
      nav.space-y-1 > a[class*='bg-primary'] {
        color: #2a2a2a !important;
        background: #f0f7f4 !important;
        border-left: 3px solid #6fa58d !important;
      }
    `}</style>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2 } from 'lucide-react';

// --- Schemas ---
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

export default function ProfilePage() {
  const { user, fetchUser } = useAuthStore();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);

  // Profile form
  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { firstName: user?.firstName || '', lastName: user?.lastName || '' },
  });

  // Password form
  const passwordForm = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  // Address form
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Kişisel Bilgiler</h1>

      {/* Profil Bilgileri */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Profil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ad</Label>
                <Input {...profileForm.register('firstName')} />
                {profileForm.formState.errors.firstName && (
                  <p className="text-xs text-destructive">
                    {profileForm.formState.errors.firstName.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Soyad</Label>
                <Input {...profileForm.register('lastName')} />
                {profileForm.formState.errors.lastName && (
                  <p className="text-xs text-destructive">
                    {profileForm.formState.errors.lastName.message}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input value={user?.email || ''} disabled />
            </div>
            <Button type="submit" disabled={profileForm.formState.isSubmitting}>
              {profileForm.formState.isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Şifre Değiştirme */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Şifre Değiştir</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Mevcut Şifre</Label>
              <Input type="password" {...passwordForm.register('currentPassword')} />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-xs text-destructive">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Yeni Şifre</Label>
                <Input type="password" {...passwordForm.register('newPassword')} />
                {passwordForm.formState.errors.newPassword && (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Yeni Şifre Tekrar</Label>
                <Input type="password" {...passwordForm.register('confirmPassword')} />
                {passwordForm.formState.errors.confirmPassword && (
                  <p className="text-xs text-destructive">
                    {passwordForm.formState.errors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>
            <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
              {passwordForm.formState.isSubmitting ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Adresler */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Adreslerim</CardTitle>
          {!showAddressForm && (
            <Button variant="outline" size="sm" onClick={() => setShowAddressForm(true)}>
              + Yeni Adres
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="flex items-start justify-between rounded-md border p-3">
              <div className="text-sm">
                <p className="font-medium">
                  {addr.title}{' '}
                  {addr.isDefault && <span className="text-xs text-primary">(Varsayılan)</span>}
                </p>
                <p>
                  {addr.fullName} — {addr.phone}
                </p>
                <p className="text-muted-foreground">
                  {addr.address}, {addr.district}/{addr.city}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => deleteAddress(addr.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {showAddressForm && (
            <form
              onSubmit={addressForm.handleSubmit(onAddressSubmit)}
              className="space-y-3 rounded-md border p-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Başlık</Label>
                  <Input placeholder="Ev" {...addressForm.register('title')} />
                </div>
                <div>
                  <Label>Ad Soyad</Label>
                  <Input {...addressForm.register('fullName')} />
                </div>
                <div>
                  <Label>Telefon</Label>
                  <Input {...addressForm.register('phone')} />
                </div>
                <div>
                  <Label>Şehir</Label>
                  <Input {...addressForm.register('city')} />
                </div>
                <div>
                  <Label>İlçe</Label>
                  <Input {...addressForm.register('district')} />
                </div>
              </div>
              <div>
                <Label>Adres</Label>
                <Input {...addressForm.register('address')} />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  Kaydet
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddressForm(false)}
                >
                  İptal
                </Button>
              </div>
            </form>
          )}

          {addresses.length === 0 && !showAddressForm && (
            <p className="text-sm text-muted-foreground">Henüz adres eklenmemiş.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

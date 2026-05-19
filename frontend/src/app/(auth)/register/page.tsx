'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShoppingBag, Store } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const schema = z
  .object({
    email: z.string().email('Geçerli bir e-posta girin'),
    password: z.string().min(6, 'Şifre en az 6 karakter olmalı'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Şifreler eşleşmiyor',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;
type RegisterRole = 'USER' | 'SELLER';

const roleOptions: {
  value: RegisterRole;
  title: string;
  description: string;
  icon: typeof ShoppingBag;
}[] = [
  {
    value: 'USER',
    title: 'Müşteri',
    description: 'Ürün satın al, görev tamamla, XP kazan',
    icon: ShoppingBag,
  },
  {
    value: 'SELLER',
    title: 'Satıcı',
    description: 'Ürünlerini listele, AI ile açıklama üret',
    icon: Store,
  },
];

export default function RegisterPage() {
  const router = useRouter();
  const { fetchUser } = useAuthStore();
  const [role, setRole] = useState<RegisterRole>('USER');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      const res = await api.post('/auth/register', {
        email: data.email,
        password: data.password,
        role,
      });
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      await fetchUser();
      toast.success('Kayıt başarılı!');
      router.push(role === 'SELLER' ? '/seller/dashboard' : '/products');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Kayıt başarısız';
      toast.error(message);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Kayıt Ol</CardTitle>
          <CardDescription>Hesap oluşturarak alışverişe başlayın</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {roleOptions.map((option) => {
                const Icon = option.icon;
                const selected = role === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRole(option.value)}
                    className={cn(
                      'flex min-h-[132px] flex-col items-start gap-3 rounded-lg bg-white p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#6FA58D]',
                      selected
                        ? 'border-2 border-[#6FA58D] bg-[#F0F7F4]'
                        : 'border border-[#ECE8E1]',
                    )}
                    aria-pressed={selected}
                  >
                    <Icon className="h-6 w-6 text-[#6FA58D]" aria-hidden />
                    <span className="text-sm font-semibold text-[#2A2A2A]">{option.title}</span>
                    <span className="text-xs leading-5 text-muted-foreground">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-posta</Label>
              <Input id="email" type="email" placeholder="ornek@email.com" {...register('email')} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
              <Input id="confirmPassword" type="password" {...register('confirmPassword')} />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Zaten hesabınız var mı?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Giriş Yap
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

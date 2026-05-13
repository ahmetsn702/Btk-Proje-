'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type Status = 'loading' | 'success' | 'error';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    api
      .post('/auth/verify-email', { token })
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        {status === 'loading' && (
          <CardHeader>
            <CardTitle>Doğrulanıyor...</CardTitle>
            <CardDescription>E-posta adresiniz doğrulanıyor, lütfen bekleyin.</CardDescription>
          </CardHeader>
        )}
        {status === 'success' && (
          <>
            <CardHeader>
              <CardTitle>E-posta Doğrulandı ✓</CardTitle>
              <CardDescription>E-posta adresiniz başarıyla doğrulandı.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button className="w-full">Giriş Yap</Button>
              </Link>
            </CardContent>
          </>
        )}
        {status === 'error' && (
          <>
            <CardHeader>
              <CardTitle>Doğrulama Başarısız</CardTitle>
              <CardDescription>Bağlantı geçersiz veya süresi dolmuş olabilir.</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/login">
                <Button variant="outline" className="w-full">
                  Giriş Sayfasına Dön
                </Button>
              </Link>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}

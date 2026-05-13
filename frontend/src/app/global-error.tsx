'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry'ye hata gönder
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="tr">
      <body className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Bir hata oluştu</h2>
          <p className="text-muted-foreground">Beklenmeyen bir hata meydana geldi.</p>
          <Button onClick={reset}>Tekrar Dene</Button>
        </div>
      </body>
    </html>
  );
}

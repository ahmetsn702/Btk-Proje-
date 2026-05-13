'use client';

import { Button } from '@/components/ui/button';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <h1 className="text-6xl font-bold">500</h1>
      <p className="text-muted-foreground">Bir hata oluştu.</p>
      <Button onClick={reset}>Tekrar Dene</Button>
    </div>
  );
}

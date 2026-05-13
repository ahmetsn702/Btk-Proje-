import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';

export default function OrderFailedPage() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Sipariş Başarısız</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Siparişiniz oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Link href="/cart">
              <Button variant="outline">Sepete Dön</Button>
            </Link>
            <Link href="/products">
              <Button>Alışverişe Devam</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

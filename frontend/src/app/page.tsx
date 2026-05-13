import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
      <h1 className="text-4xl font-bold">BTK Proje</h1>
      <p className="max-w-md text-muted-foreground">
        Görevleri tamamla, puan kazan, alışverişte indirim kullan.
      </p>
      <div className="flex gap-4">
        <Link href="/products">
          <Button>Ürünleri Keşfet</Button>
        </Link>
        <Link href="/tasks">
          <Button variant="outline">Görevlere Bak</Button>
        </Link>
      </div>
    </div>
  );
}

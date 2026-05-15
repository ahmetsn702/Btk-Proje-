import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/20 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-heading text-sm font-medium">
            BTK<span className="text-primary">Market</span>
          </p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/products" className="hover:text-foreground transition-colors">
              Ürünler
            </Link>
            <Link href="/tasks" className="hover:text-foreground transition-colors">
              Görevler
            </Link>
            <Link href="/exchange" className="hover:text-foreground transition-colors">
              Takas
            </Link>
          </div>
          <p className="text-xs text-muted-foreground">© 2026 BTK Market</p>
        </div>
      </div>
    </footer>
  );
}

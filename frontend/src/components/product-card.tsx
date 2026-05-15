import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  priceFiat: number;
  images: string[];
  category?: { id: string; name: string; slug: string };
}

export function ProductCard({ product }: { product: Product }) {
  const price = (product.priceFiat / 100).toFixed(2);

  return (
    <Link
      href={`/products/${product.id}`}
      className="group glass rounded-xl p-4 transition-all hover:glow-blue hover:border-primary/50"
    >
      <div className="relative mb-4 aspect-square overflow-hidden rounded-lg bg-muted/30">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
            Görsel yok
          </div>
        )}
        <span className="absolute top-2 right-2 rounded-full bg-secondary/90 px-2 py-0.5 text-[10px] font-medium text-white">
          XP İndirim
        </span>
      </div>
      <h3 className="mb-1 line-clamp-2 text-sm font-medium">{product.name}</h3>
      {product.category && (
        <p className="mb-2 text-xs text-muted-foreground">{product.category.name}</p>
      )}
      <div className="flex items-center justify-between">
        <p className="font-heading font-bold text-foreground">{price} ₺</p>
        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-primary hover:bg-primary/20">
          <ShoppingCart className="h-4 w-4" />
        </Button>
      </div>
    </Link>
  );
}

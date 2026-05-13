import Link from 'next/link';

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
      className="group rounded-lg border p-4 transition-shadow hover:shadow-md"
    >
      <div className="mb-4 aspect-square overflow-hidden rounded-md bg-muted">
        {product.images[0] ? (
          <img
            src={product.images[0]}
            alt={product.name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            Görsel yok
          </div>
        )}
      </div>
      <h3 className="mb-1 line-clamp-2 text-sm font-medium">{product.name}</h3>
      {product.category && (
        <p className="mb-1 text-xs text-muted-foreground">{product.category.name}</p>
      )}
      <p className="font-semibold">{price} ₺</p>
    </Link>
  );
}

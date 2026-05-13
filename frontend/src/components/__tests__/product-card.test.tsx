import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ProductCard } from '@/components/product-card';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('ProductCard', () => {
  const product = {
    id: 'p1',
    name: 'Test Ürün',
    priceFiat: 9990,
    images: ['https://example.com/img.jpg'],
    category: { id: 'c1', name: 'Elektronik', slug: 'elektronik' },
  };

  it('renders product name', () => {
    render(<ProductCard product={product} />);
    expect(screen.getByText('Test Ürün')).toBeInTheDocument();
  });

  it('renders formatted price', () => {
    render(<ProductCard product={product} />);
    expect(screen.getByText('99.90 ₺')).toBeInTheDocument();
  });

  it('renders category name', () => {
    render(<ProductCard product={product} />);
    expect(screen.getByText('Elektronik')).toBeInTheDocument();
  });

  it('links to product detail page', () => {
    render(<ProductCard product={product} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/products/p1');
  });

  it('shows placeholder when no image', () => {
    render(<ProductCard product={{ ...product, images: [] }} />);
    expect(screen.getByText('Görsel yok')).toBeInTheDocument();
  });
});

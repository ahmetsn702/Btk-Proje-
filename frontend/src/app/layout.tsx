import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BTK Proje',
  description: 'E-ticaret + Blockchain ödül sistemi',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <Navbar />
        <main className="container mx-auto flex-1 px-4 py-8">{children}</main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}

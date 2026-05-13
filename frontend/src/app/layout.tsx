import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Toaster } from '@/components/ui/sonner';
import { AuthProvider } from '@/components/auth-provider';
import { Web3Provider } from '@/lib/web3';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BTK Proje',
  description: 'E-ticaret + Blockchain ödül sistemi',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className={`${inter.className} flex min-h-screen flex-col`}>
        <Web3Provider>
          <AuthProvider>
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-background focus:p-4 focus:text-foreground"
            >
              İçeriğe geç
            </a>
            <Navbar />
            <main id="main-content" className="container mx-auto flex-1 px-4 py-8">
              {children}
            </main>
            <Footer />
            <Toaster />
          </AuthProvider>
        </Web3Provider>
      </body>
    </html>
  );
}

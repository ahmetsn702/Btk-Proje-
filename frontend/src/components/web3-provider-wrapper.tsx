'use client';

import dynamic from 'next/dynamic';

const Web3Provider = dynamic(() => import('@/lib/web3').then((mod) => mod.Web3Provider), {
  ssr: false,
});

export function Web3ProviderWrapper({ children }: { children: React.ReactNode }) {
  return <Web3Provider>{children}</Web3Provider>;
}

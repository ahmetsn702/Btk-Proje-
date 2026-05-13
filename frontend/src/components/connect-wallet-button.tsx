'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useChainId } from 'wagmi';
import { polygon, polygonAmoy, arbitrumSepolia } from 'wagmi/chains';

const SUPPORTED_CHAIN_IDS: number[] = [polygon.id, polygonAmoy.id, arbitrumSepolia.id];

export function ConnectWalletButton() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const isWrongNetwork = isConnected && !SUPPORTED_CHAIN_IDS.includes(chainId);

  return (
    <div className="flex items-center gap-2">
      {isWrongNetwork && (
        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
          Yanlış Ağ
        </span>
      )}
      <ConnectButton accountStatus="avatar" chainStatus="icon" showBalance={false} />
    </div>
  );
}

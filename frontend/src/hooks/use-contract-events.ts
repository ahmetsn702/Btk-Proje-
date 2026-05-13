'use client';

import { useWatchContractEvent, useAccount } from 'wagmi';
import { toast } from 'sonner';
import { EXCHANGE_ABI, EXCHANGE_CONTRACT_ADDRESS } from '@/lib/contracts';
import { useBalances } from '@/hooks/use-balances';

/**
 * Smart contract event'lerini dinleyip UI'da güncelleme yapar.
 * Exchange contract'ındaki Swap event'ini dinler.
 * Kullanıcının kendi swap'ı onaylandığında toast gösterir ve bakiyeleri yeniler.
 */
export function useContractEvents() {
  const { address } = useAccount();
  const { refetch } = useBalances();

  useWatchContractEvent({
    address: EXCHANGE_CONTRACT_ADDRESS,
    abi: EXCHANGE_ABI,
    eventName: 'Swap',
    onLogs(logs) {
      for (const log of logs) {
        const args = (
          log as unknown as { args: { user: string; cpAmount: bigint; xpReceived: bigint } }
        ).args;
        if (args.user?.toLowerCase() === address?.toLowerCase()) {
          const xp = Number(args.xpReceived) / 1e18;
          toast.success(`✅ Takas onaylandı: +${xp.toFixed(2)} XP`, { duration: 6000 });
          refetch();
        }
      }
    },
    enabled:
      !!address && EXCHANGE_CONTRACT_ADDRESS !== '0x0000000000000000000000000000000000000000',
  });
}

/**
 * ContractEventListener bileşeni — layout'a eklenebilir.
 * Kullanıcı giriş yaptıysa ve cüzdan bağlıysa event'leri dinler.
 */
export function ContractEventListener() {
  useContractEvents();
  return null;
}

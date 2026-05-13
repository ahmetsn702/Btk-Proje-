'use client';

import { useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export function useWalletLink() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { fetchUser } = useAuthStore();
  const [linking, setLinking] = useState(false);

  const linkWallet = async () => {
    if (!address) {
      toast.error('Önce cüzdanınızı bağlayın');
      return;
    }

    setLinking(true);
    try {
      const message = `BTK Proje: ${address} adresini hesabıma bağlamak istiyorum.\nTimestamp: ${Date.now()}`;
      const signature = await signMessageAsync({ message });

      await api.post('/users/me/wallet', { walletAddress: address, signature });
      await fetchUser();
      toast.success('Cüzdan başarıyla bağlandı!');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Cüzdan bağlanamadı';
      toast.error(message);
    } finally {
      setLinking(false);
    }
  };

  return { linkWallet, linking, address };
}

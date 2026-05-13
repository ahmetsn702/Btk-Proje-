'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount, usePublicClient } from 'wagmi';
import { parseUnits, formatUnits, encodeFunctionData } from 'viem';
import { EXCHANGE_ABI, EXCHANGE_CONTRACT_ADDRESS } from '@/lib/contracts';

export type TxState = 'idle' | 'estimating' | 'confirming' | 'pending' | 'success' | 'error';

interface SwapParams {
  categoryId: number;
  cpAmount: number;
  minXpOut: number;
}

export function useExchangeSwap() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [txState, setTxState] = useState<TxState>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [gasEstimate, setGasEstimate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { writeContractAsync } = useWriteContract();
  const { data: receipt } = useWaitForTransactionReceipt({ hash: txHash });

  // Receipt geldiğinde state güncelle
  useEffect(() => {
    if (!receipt || txState !== 'pending') return;
    if (receipt.status === 'success') {
      setTxState('success');
    } else {
      setTxState('error');
      setError('İşlem başarısız oldu');
    }
  }, [receipt, txState]);

  // Gas fee tahmini
  const estimateSwapGas = async (params: SwapParams) => {
    if (!address || !publicClient) return null;
    setTxState('estimating');
    try {
      const data = encodeFunctionData({
        abi: EXCHANGE_ABI,
        functionName: 'swapCPforXP',
        args: [
          BigInt(params.categoryId),
          parseUnits(String(params.cpAmount), 18),
          parseUnits(String(params.minXpOut), 18),
        ],
      });

      const gas = await publicClient.estimateGas({
        to: EXCHANGE_CONTRACT_ADDRESS,
        data,
        account: address,
      });

      const formatted = formatUnits(gas, 9);
      setGasEstimate(formatted);
      setTxState('idle');
      return formatted;
    } catch {
      setGasEstimate(null);
      setTxState('idle');
      return null;
    }
  };

  // Transaction trigger
  const swap = async (params: SwapParams) => {
    if (!address) {
      setError('Cüzdan bağlı değil');
      return;
    }

    setTxState('confirming');
    setError(null);

    try {
      const hash = await writeContractAsync({
        address: EXCHANGE_CONTRACT_ADDRESS,
        abi: EXCHANGE_ABI,
        functionName: 'swapCPforXP',
        args: [
          BigInt(params.categoryId),
          parseUnits(String(params.cpAmount), 18),
          parseUnits(String(params.minXpOut), 18),
        ],
      });

      setTxHash(hash);
      setTxState('pending');
    } catch (err: unknown) {
      const msg = (err as { shortMessage?: string })?.shortMessage || 'İşlem reddedildi';
      setError(msg);
      setTxState('error');
    }
  };

  const reset = () => {
    setTxState('idle');
    setTxHash(undefined);
    setGasEstimate(null);
    setError(null);
  };

  return {
    swap,
    estimateSwapGas,
    txState,
    txHash,
    gasEstimate,
    error,
    receipt,
    reset,
  };
}

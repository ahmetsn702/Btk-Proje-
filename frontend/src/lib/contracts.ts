// Contract ABI'ları — Geliştirici 2 deploy ettikten sonra gerçek ABI ile değiştirilecek
// Bu dosya sadece import edilir, değiştirilmez (proje sınırları gereği)

export const EXCHANGE_CONTRACT_ADDRESS =
  (process.env.NEXT_PUBLIC_EXCHANGE_CONTRACT as `0x${string}`) ||
  '0x0000000000000000000000000000000000000000';

export const EXCHANGE_ABI = [
  {
    name: 'swapCPforXP',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'categoryId', type: 'uint256' },
      { name: 'cpAmount', type: 'uint256' },
      { name: 'minXpOut', type: 'uint256' },
    ],
    outputs: [{ name: 'xpReceived', type: 'uint256' }],
  },
  {
    name: 'getQuote',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'categoryId', type: 'uint256' },
      { name: 'cpAmount', type: 'uint256' },
    ],
    outputs: [{ name: 'xpOut', type: 'uint256' }],
  },
  {
    name: 'Swap',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'categoryId', type: 'uint256', indexed: true },
      { name: 'cpAmount', type: 'uint256', indexed: false },
      { name: 'xpReceived', type: 'uint256', indexed: false },
    ],
  },
] as const;

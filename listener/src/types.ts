export interface EventLog {
  txHash: string;
  logIndex: number;
  blockNumber: number;
  blockHash: string;
  contract: string; // 'Exchange' | 'CP' | 'XP' | 'TaskRewardManager'
  event: string;
  args: Record<string, unknown>;
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  timestamp?: number;
}

export interface SwapEvent extends EventLog {
  contract: 'Exchange';
  event: 'Swap';
  args: {
    user: string;
    categoryIn: string;
    categoryOut: string;
    amountIn: string;
    amountOut: string;
    fee: string;
  };
}

export interface TaskCompletedEvent extends EventLog {
  contract: 'TaskRewardManager';
  event: 'TaskCompleted';
  args: {
    user: string;
    taskId: string;
    categoryId: string;
    amount: string;
    timestamp: string;
  };
}

export interface EIP712Message {
  to: string;
  data: string;
  value: string;
  nonce: number;
  deadline: number;
}

export interface RelayerRequest {
  signature: string;
  message: EIP712Message;
  signer: string;
}

export interface RelayerResponse {
  txHash?: string;
  status: 'submitted' | 'failed' | 'rejected';
  error?: string;
}

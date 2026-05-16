export interface PaymentResult {
  success: boolean;
  transactionId: string;
  error?: string;
}

export interface PaymentProvider {
  charge(amount: number, metadata: Record<string, string>): Promise<PaymentResult>;
}

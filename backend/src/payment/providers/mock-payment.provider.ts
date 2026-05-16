import { PaymentProvider, PaymentResult } from '../payment.interface';

export class MockPaymentProvider implements PaymentProvider {
  async charge(amount: number, metadata: Record<string, string>): Promise<PaymentResult> {
    await new Promise((r) => setTimeout(r, 500));
    const transactionId = `mock_${Date.now()}`;
    console.log(`[MockPayment] Charged ${amount} kuruş, txId: ${transactionId}`, metadata);
    return { success: true, transactionId };
  }
}

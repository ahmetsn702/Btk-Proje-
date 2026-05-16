import { Injectable } from '@nestjs/common';
import { PaymentProvider, PaymentResult } from './payment.interface';
import { MockPaymentProvider } from './providers/mock-payment.provider';

@Injectable()
export class PaymentService {
  private provider: PaymentProvider;

  constructor() {
    const providerName = process.env.PAYMENT_PROVIDER || 'mock';
    if (providerName === 'iyzico') {
      throw new Error('iyzico provider not implemented yet');
    }
    this.provider = new MockPaymentProvider();
  }

  charge(amount: number, metadata: Record<string, string>): Promise<PaymentResult> {
    return this.provider.charge(amount, metadata);
  }
}

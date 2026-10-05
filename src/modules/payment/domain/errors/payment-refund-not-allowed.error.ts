import { BusinessRuleError } from '@core/domain/errors/business-rule.error';

export class PaymentRefundNotAllowedError extends BusinessRuleError {
  constructor(message: string) {
    super({ message, code: 'PAYMENT_REFUND_NOT_ALLOWED' });
  }
}

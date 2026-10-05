import { BusinessRuleError } from '@core/domain/errors/business-rule.error';

export class PaymentNotAllowedError extends BusinessRuleError {
  constructor(message: string) {
    super({ message, code: 'PAYMENT_NOT_ALLOWED' });
  }
}

import { BusinessRuleError } from '@core/domain/errors/business-rule.error';

export class CouponNotApplicableError extends BusinessRuleError {
  constructor(message: string) {
    super({ message, code: 'COUPON_NOT_APPLICABLE' });
  }
}

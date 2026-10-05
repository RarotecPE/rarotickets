import { BusinessRuleError } from '@core/domain/errors/business-rule.error';

export class CertificateNotEligibleError extends BusinessRuleError {
  constructor(message: string) {
    super({ message, code: 'CERTIFICATE_NOT_ELIGIBLE' });
  }
}

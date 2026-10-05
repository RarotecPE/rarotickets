import { ConflictError } from '@core/domain/errors/conflict.error';

export class InvalidPaymentTransitionError extends ConflictError {
  constructor(from: string, to: string) {
    super({
      message: `Transição de pagamento inválida: ${from} → ${to}`,
      code: 'INVALID_PAYMENT_TRANSITION',
    });
  }
}

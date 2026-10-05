import { NotFoundError } from '@core/domain/errors/not-found.error';

export class PaymentNotFoundError extends NotFoundError {
  constructor(identifier: string) {
    super({
      message: `Pagamento não encontrado: ${identifier}`,
      code: 'PAYMENT_NOT_FOUND',
    });
  }
}

import { NotFoundError } from '@core/domain/errors/not-found.error';

export class CouponNotFoundError extends NotFoundError {
  constructor(code: string) {
    super({ message: `Cupom não encontrado: ${code}`, code: 'COUPON_NOT_FOUND' });
  }
}

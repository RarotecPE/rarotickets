import { UseCase } from '@core/application/use-case.base';
import { CLOCK } from '@core/contracts/clock.contract';
import type { IClock } from '@core/contracts/clock.contract';
import { Result } from '@core/domain/result';
import { MoneyVO } from '@core/domain/value-objects/money.vo';
import { CouponNotApplicableError } from '../../../domain/errors/coupon-not-applicable.error';
import { CouponNotFoundError } from '../../../domain/errors/coupon-not-found.error';
import { COUPON_REPOSITORY } from '../../../domain/repositories/coupon-repository.interface';
import type { ICouponRepository } from '../../../domain/repositories/coupon-repository.interface';
import { CouponDiscountService } from '../../../domain/services/coupon-discount.service';
import { CouponMapper } from '../../mappers/coupon.mapper';
import type { ValidateCouponInputDto } from './validate-coupon.input.dto';
import type { ValidateCouponOutputDto } from './validate-coupon.output.dto';

export type ValidateCouponDependencies = {
  couponRepository: ICouponRepository;
  discountService: CouponDiscountService;
  clock: IClock;
  mapper: CouponMapper;
};

/** Pré-visualização do desconto para o participante antes de concluir (§25). */
export class ValidateCouponUseCase extends UseCase<ValidateCouponInputDto, ValidateCouponOutputDto> {
  private readonly dependencies: ValidateCouponDependencies;

  constructor(dependencies: ValidateCouponDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: ValidateCouponInputDto): Promise<Result<ValidateCouponOutputDto>> {
    const { couponRepository, discountService, clock, mapper } = this.dependencies;

    const coupon = await couponRepository.findByEventAndCode({ eventId: input.eventId, code: input.code });
    if (!coupon) return Result.fail(new CouponNotFoundError(input.code));
    if (!coupon.isWithinPeriod(clock.now())) {
      return Result.fail(new CouponNotApplicableError('Cupom fora do período de validade'));
    }
    if (!coupon.isActive) return Result.fail(new CouponNotApplicableError('Cupom inativo'));
    if (!coupon.type.isCourtesy() && !coupon.hasAvailableUses()) {
      return Result.fail(new CouponNotApplicableError('Cupom esgotado'));
    }

    const discountResult = discountService.execute({
      amountCents: input.amountCents,
      type: coupon.type.value,
      value: coupon.value,
    });
    if (discountResult.isFailure) return Result.fail(discountResult.error);

    return Result.ok({
      coupon: mapper.map({ coupon }),
      discountCents: discountResult.value.discountCents,
      finalAmountCents: discountResult.value.finalAmountCents,
      isCourtesy: discountResult.value.isCourtesy,
      discountFormatted: MoneyVO.reconstitute({ cents: discountResult.value.discountCents }).format(),
      finalAmountFormatted: MoneyVO.reconstitute({ cents: discountResult.value.finalAmountCents }).format(),
    });
  }
}

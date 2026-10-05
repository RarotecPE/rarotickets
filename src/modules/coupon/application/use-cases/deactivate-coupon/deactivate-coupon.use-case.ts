import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { Result } from '@core/domain/result';
import { CouponNotFoundError } from '../../../domain/errors/coupon-not-found.error';
import { COUPON_REPOSITORY } from '../../../domain/repositories/coupon-repository.interface';
import type { ICouponRepository } from '../../../domain/repositories/coupon-repository.interface';
import { CouponMapper } from '../../mappers/coupon.mapper';
import type { DeactivateCouponInputDto } from './deactivate-coupon.input.dto';
import type { DeactivateCouponOutputDto } from './deactivate-coupon.output.dto';

export type DeactivateCouponDependencies = {
  couponRepository: ICouponRepository;
  auditRecorder: IAuditRecorder;
  mapper: CouponMapper;
};

export class DeactivateCouponUseCase extends UseCase<DeactivateCouponInputDto, DeactivateCouponOutputDto> {
  private readonly dependencies: DeactivateCouponDependencies;

  constructor(dependencies: DeactivateCouponDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: DeactivateCouponInputDto): Promise<Result<DeactivateCouponOutputDto>> {
    const { couponRepository, auditRecorder, mapper } = this.dependencies;

    const coupon = await couponRepository.findById(input.couponId);
    if (!coupon) return Result.fail(new CouponNotFoundError(input.couponId));

    const result = coupon.deactivate();
    if (result.isFailure) return Result.fail(result.error);

    await couponRepository.update(coupon);
    await auditRecorder.record({
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? 'Operador',
      action: 'COUPON_DEACTIVATED',
      entity: 'coupon',
      entityId: coupon.id.toString(),
      description: `Cupom ${coupon.code.value} desativado`,
      before: { isActive: true },
      after: { isActive: false },
      ip: input.ip ?? null,
    });

    return Result.ok({ coupon: mapper.map({ coupon }) });
  }
}

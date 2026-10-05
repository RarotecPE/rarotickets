import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { Result } from '@core/domain/result';
import { CouponNotFoundError } from '../../../domain/errors/coupon-not-found.error';
import { COUPON_REPOSITORY } from '../../../domain/repositories/coupon-repository.interface';
import type { ICouponRepository } from '../../../domain/repositories/coupon-repository.interface';
import { CouponMapper } from '../../mappers/coupon.mapper';
import type { UpdateCouponInputDto } from './update-coupon.input.dto';
import type { UpdateCouponOutputDto } from './update-coupon.output.dto';

export type UpdateCouponDependencies = {
  couponRepository: ICouponRepository;
  auditRecorder: IAuditRecorder;
  mapper: CouponMapper;
};

export class UpdateCouponUseCase extends UseCase<UpdateCouponInputDto, UpdateCouponOutputDto> {
  private readonly dependencies: UpdateCouponDependencies;

  constructor(dependencies: UpdateCouponDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: UpdateCouponInputDto): Promise<Result<UpdateCouponOutputDto>> {
    const { couponRepository, auditRecorder, mapper } = this.dependencies;

    const coupon = await couponRepository.findById(input.couponId);
    if (!coupon) return Result.fail(new CouponNotFoundError(input.couponId));

    const before = { value: coupon.value, maxUses: coupon.maxUses, isActive: coupon.isActive };
    const changeResult = coupon.changeDetails({
      value: input.value,
      maxUses: input.maxUses,
      startDate: input.startDate ? new Date(input.startDate) : undefined,
      endDate: input.endDate ? new Date(input.endDate) : undefined,
      isActive: input.isActive,
    });
    if (changeResult.isFailure) return Result.fail(changeResult.error);

    await couponRepository.update(coupon);
    await auditRecorder.record({
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? 'Operador',
      action: 'COUPON_UPDATED',
      entity: 'coupon',
      entityId: coupon.id.toString(),
      description: `Cupom ${coupon.code.value} atualizado`,
      before,
      after: { value: coupon.value, maxUses: coupon.maxUses, isActive: coupon.isActive },
      ip: input.ip ?? null,
    });

    return Result.ok({ coupon: mapper.map({ coupon }) });
  }
}

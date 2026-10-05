import { UseCase } from '@core/application/use-case.base';
import { AUDIT_RECORDER } from '@core/contracts/audit.contract';
import type { IAuditRecorder } from '@core/contracts/audit.contract';
import { Result } from '@core/domain/result';
import { Coupon } from '../../../domain/entities/coupon.entity';
import { CouponNotApplicableError } from '../../../domain/errors/coupon-not-applicable.error';
import { COUPON_REPOSITORY } from '../../../domain/repositories/coupon-repository.interface';
import type { ICouponRepository } from '../../../domain/repositories/coupon-repository.interface';
import { CouponMapper } from '../../mappers/coupon.mapper';
import type { CreateCouponInputDto } from './create-coupon.input.dto';
import type { CreateCouponOutputDto } from './create-coupon.output.dto';

export type CreateCouponDependencies = {
  couponRepository: ICouponRepository;
  auditRecorder: IAuditRecorder;
  mapper: CouponMapper;
};

export class CreateCouponUseCase extends UseCase<CreateCouponInputDto, CreateCouponOutputDto> {
  private readonly dependencies: CreateCouponDependencies;

  constructor(dependencies: CreateCouponDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: CreateCouponInputDto): Promise<Result<CreateCouponOutputDto>> {
    const { couponRepository, auditRecorder, mapper } = this.dependencies;

    const couponResult = Coupon.create({
      eventId: input.eventId,
      code: input.code,
      type: input.type,
      value: input.value,
      maxUses: input.maxUses,
      startDate: new Date(input.startDate),
      endDate: new Date(input.endDate),
      isActive: input.isActive ?? true,
      createdBy: input.actorUserId ?? null,
    });
    if (couponResult.isFailure) return Result.fail(couponResult.error);
    const coupon = couponResult.value;

    const existing = await couponRepository.findByEventAndCode({
      eventId: input.eventId,
      code: coupon.code.value,
    });
    if (existing) {
      return Result.fail(new CouponNotApplicableError(`Já existe um cupom com o código ${coupon.code.value} neste evento`));
    }

    await couponRepository.save(coupon);

    await auditRecorder.record({
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? 'Operador',
      action: 'COUPON_CREATED',
      entity: 'coupon',
      entityId: coupon.id.toString(),
      description: `Cupom ${coupon.code.value} criado (${coupon.type.label})`,
      after: { code: coupon.code.value, type: coupon.type.value, value: coupon.value, maxUses: coupon.maxUses },
      ip: input.ip ?? null,
    });

    return Result.ok({ coupon: mapper.map({ coupon }) });
  }
}

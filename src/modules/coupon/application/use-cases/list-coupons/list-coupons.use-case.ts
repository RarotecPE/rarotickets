import { buildPaginationMeta, normalizePagination } from '@core/application/pagination/pagination';
import { UseCase } from '@core/application/use-case.base';
import { Result } from '@core/domain/result';
import { COUPON_REPOSITORY } from '../../../domain/repositories/coupon-repository.interface';
import type { ICouponRepository } from '../../../domain/repositories/coupon-repository.interface';
import { CouponMapper } from '../../mappers/coupon.mapper';
import type { ListCouponsInputDto } from './list-coupons.input.dto';
import type { ListCouponsOutputDto } from './list-coupons.output.dto';

export type ListCouponsDependencies = { couponRepository: ICouponRepository; mapper: CouponMapper };

export class ListCouponsUseCase extends UseCase<ListCouponsInputDto, ListCouponsOutputDto> {
  private readonly dependencies: ListCouponsDependencies;

  constructor(dependencies: ListCouponsDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async execute(input: ListCouponsInputDto): Promise<Result<ListCouponsOutputDto>> {
    const pagination = normalizePagination({ page: input.page, perPage: input.perPage });
    const { coupons, total } = await this.dependencies.couponRepository.list({
      eventId: input.eventId ?? null,
      search: input.search ?? null,
      isActive: input.isActive ?? null,
      page: pagination.page,
      perPage: pagination.perPage,
    });

    return Result.ok({
      coupons: coupons.map((coupon) => this.dependencies.mapper.map({ coupon })),
      meta: buildPaginationMeta({ ...pagination, total }),
    });
  }
}

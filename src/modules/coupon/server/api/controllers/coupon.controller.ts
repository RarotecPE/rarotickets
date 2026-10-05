import type { IUseCase } from '@core/application/use-case.interface';
import { Controller } from '@server/api/controller.base';
import { HttpResponse } from '@server/api/http-response';
import type { HttpRequestContext } from '@server/api/http-request.types';
import type { CreateCouponInputDto } from '../../../application/use-cases/create-coupon/create-coupon.input.dto';
import type { CreateCouponOutputDto } from '../../../application/use-cases/create-coupon/create-coupon.output.dto';
import type { DeactivateCouponInputDto } from '../../../application/use-cases/deactivate-coupon/deactivate-coupon.input.dto';
import type { DeactivateCouponOutputDto } from '../../../application/use-cases/deactivate-coupon/deactivate-coupon.output.dto';
import type { ListCouponsInputDto } from '../../../application/use-cases/list-coupons/list-coupons.input.dto';
import type { ListCouponsOutputDto } from '../../../application/use-cases/list-coupons/list-coupons.output.dto';
import type { UpdateCouponInputDto } from '../../../application/use-cases/update-coupon/update-coupon.input.dto';
import type { UpdateCouponOutputDto } from '../../../application/use-cases/update-coupon/update-coupon.output.dto';
import type { ValidateCouponInputDto } from '../../../application/use-cases/validate-coupon/validate-coupon.input.dto';
import type { ValidateCouponOutputDto } from '../../../application/use-cases/validate-coupon/validate-coupon.output.dto';
import type { CouponActionRequest } from '../dtos/coupon.request.types';

export type CouponControllerDependencies = {
  createCouponUseCase: IUseCase<CreateCouponInputDto, CreateCouponOutputDto>;
  updateCouponUseCase: IUseCase<UpdateCouponInputDto, UpdateCouponOutputDto>;
  listCouponsUseCase: IUseCase<ListCouponsInputDto, ListCouponsOutputDto>;
  validateCouponUseCase: IUseCase<ValidateCouponInputDto, ValidateCouponOutputDto>;
  deactivateCouponUseCase: IUseCase<DeactivateCouponInputDto, DeactivateCouponOutputDto>;
};

/** Cupons de desconto e cortesia (§25). */
export class CouponController extends Controller<HttpRequestContext<CouponActionRequest>, HttpResponse> {
  private readonly dependencies: CouponControllerDependencies;

  constructor(dependencies: CouponControllerDependencies) {
    super();
    this.dependencies = dependencies;
  }

  async handle(request: HttpRequestContext<CouponActionRequest>): Promise<HttpResponse> {
    const actor = request.actor;

    switch (request.body.action) {
      case 'validate': {
        const result = await this.dependencies.validateCouponUseCase.execute({
          eventId: request.body.body.eventId ?? '',
          code: request.body.body.code ?? '',
          amountCents: request.body.body.amountCents ?? 0,
        });
        if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'COUPON_INVALID');
        return HttpResponse.ok(result.value);
      }
      case 'list': {
        const query = request.body.query;
        const result = await this.dependencies.listCouponsUseCase.execute({
          eventId: query.eventId ?? null,
          search: query.search ?? null,
          isActive: query.isActive === undefined ? null : query.isActive === 'true',
          page: query.page ? Number(query.page) : 1,
          perPage: query.perPage ? Number(query.perPage) : 20,
        });
        if (result.isFailure) return HttpResponse.serverError(result.error.message);
        return HttpResponse.ok(result.value.coupons, { ...result.value.meta });
      }
      case 'create': {
        if (!actor) return HttpResponse.unauthorized();
        const body = request.body.body;
        const result = await this.dependencies.createCouponUseCase.execute({
          eventId: String(body.eventId ?? ''),
          code: String(body.code ?? ''),
          type: String(body.type ?? 'PERCENTUAL'),
          value: Number(body.value ?? 0),
          maxUses: Number(body.maxUses ?? 1),
          startDate: String(body.startDate ?? new Date().toISOString()),
          endDate: String(body.endDate ?? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()),
          isActive: body.isActive === undefined ? true : body.isActive === true,
          actorUserId: actor.userId,
          actorName: actor.name,
          ip: request.ip,
        });
        if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'COUPON_CREATE_FAILED');
        return HttpResponse.created(result.value);
      }
      case 'update': {
        if (!actor) return HttpResponse.unauthorized();
        const body = request.body.body;
        const result = await this.dependencies.updateCouponUseCase.execute({
          couponId: request.body.couponId,
          value: body.value === undefined ? undefined : Number(body.value),
          maxUses: body.maxUses === undefined ? undefined : Number(body.maxUses),
          startDate: body.startDate === undefined ? undefined : String(body.startDate),
          endDate: body.endDate === undefined ? undefined : String(body.endDate),
          isActive: body.isActive === undefined ? undefined : body.isActive === true,
          actorUserId: actor.userId,
          actorName: actor.name,
          ip: request.ip,
        });
        if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'COUPON_UPDATE_FAILED');
        return HttpResponse.ok(result.value);
      }
      case 'deactivate': {
        if (!actor) return HttpResponse.unauthorized();
        const result = await this.dependencies.deactivateCouponUseCase.execute({
          couponId: request.body.couponId,
          actorUserId: actor.userId,
          actorName: actor.name,
          ip: request.ip,
        });
        if (result.isFailure) return HttpResponse.unprocessable(result.error.message, 'COUPON_DEACTIVATE_FAILED');
        return HttpResponse.ok(result.value);
      }
      default:
        return HttpResponse.badRequest('Ação não suportada');
    }
  }
}

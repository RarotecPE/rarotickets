import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { internalErrorResponse, jsonSuccess, resultFailureResponse } from "@/server/api/http-response.util";
import { ValidateCouponUseCase } from "@/modules/ticketing/application/use-cases/validate-coupon/validate-coupon.use-case";
import { isJsonRecord, readOptionalText, readText } from "@/server/api/request-data.util";
import { CouponUnavailableError } from "@/modules/ticketing/domain/coupons/entities/coupon.entity";

export type ValidateCouponRequest = { request: NextRequest; eventSlug: string };
export type ValidateCouponDependencies = { useCase: ValidateCouponUseCase };

export class ValidateCouponController extends Controller<ValidateCouponRequest, NextResponse> {
  private readonly useCase: ValidateCouponUseCase;

  constructor(dependencies: ValidateCouponDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(input: ValidateCouponRequest): Promise<NextResponse> {
    try {
      const body: unknown = await input.request.json().catch(() => null);
      if (!isJsonRecord(body)) {
        return resultFailureResponse({
          error: new CouponUnavailableError(),
          status: 422,
        });
      }

      const code = readText({ value: body.code }).trim().toUpperCase();
      const lotId = readText({ value: body.lotId });
      const email = readOptionalText({ value: body.email });
      const cpf = readOptionalText({ value: body.cpf });

      if (!code || !lotId) {
        return resultFailureResponse({
          error: new CouponUnavailableError(),
          status: 422,
        });
      }

      const result = await this.useCase.execute({
        slug: input.eventSlug,
        lotId,
        code,
        email,
        cpf,
      });

      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 422 });
      }

      return jsonSuccess(result.value, 200);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

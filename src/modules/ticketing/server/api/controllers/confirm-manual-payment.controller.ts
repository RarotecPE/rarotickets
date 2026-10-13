import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { ConfirmManualPaymentUseCase } from "@/modules/ticketing/application/use-cases/confirm-manual-payment/confirm-manual-payment.use-case";
import { getClientIp } from "@/server/api/request-data.util";
import {
  internalErrorResponse,
  jsonSuccess,
  resultFailureResponse,
} from "@/server/api/http-response.util";
import { requirePermission } from "@/server/auth/permission-guard.util";

export type ConfirmManualPaymentRequest = {
  request: NextRequest;
  registrationId: string;
};
export type ConfirmManualPaymentDependencies = {
  useCase: ConfirmManualPaymentUseCase;
};

export class ConfirmManualPaymentController extends Controller<
  ConfirmManualPaymentRequest,
  NextResponse
> {
  private readonly useCase: ConfirmManualPaymentUseCase;
  constructor(dependencies: ConfirmManualPaymentDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }
  async handle(input: ConfirmManualPaymentRequest): Promise<NextResponse> {
    const guard = await requirePermission({
      request: input.request,
      permission: "registrations:manage",
    });
    if (!guard.ok) return guard.response;
    try {
      const result = await this.useCase.execute({
        registrationId: input.registrationId,
        userId: guard.session.user.id,
        userName: guard.session.user.nome,
        canManageAll: guard.scope.canManageAllRegistrations,
        ip: getClientIp(input.request),
      });
      if (result.isFailure)
        return resultFailureResponse({ error: result.error, status: 422 });
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}


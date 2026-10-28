import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { CancelCheckInUseCase } from "@/modules/ticketing/application/use-cases/cancel-check-in/cancel-check-in.use-case";
import { getClientIp } from "@/server/api/request-data.util";
import {
  internalErrorResponse,
  jsonSuccess,
  resultFailureResponse,
} from "@/server/api/http-response.util";
import { requirePermission } from "@/server/auth/permission-guard.util";

export type CancelCheckInRequest = {
  request: NextRequest;
  registrationId: string;
};

export type CancelCheckInDependencies = {
  useCase: CancelCheckInUseCase;
};

export class CancelCheckInController extends Controller<
  CancelCheckInRequest,
  NextResponse
> {
  private readonly useCase: CancelCheckInUseCase;

  constructor(dependencies: CancelCheckInDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(input: CancelCheckInRequest): Promise<NextResponse> {
    const guard = await requirePermission({
      request: input.request,
      permission: "registrations:manage",
    });
    if (!guard.ok) return guard.response;

    try {
      const body = (await input.request.json().catch(() => null)) as {
        checkInId?: string;
        reason?: string;
      } | null;

      const result = await this.useCase.execute({
        registrationId: input.registrationId,
        checkInId: body?.checkInId,
        reason: body?.reason,
        userId: guard.session.user.id,
        userName: guard.session.user.nome,
        canManageAll: guard.scope.canManageAllRegistrations,
        ip: getClientIp(input.request),
      });

      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 422 });
      }

      return jsonSuccess({
        registrationCode: result.value.registrationCode,
        cancelledCheckInId: result.value.cancelledCheckInId,
        message: "Check-in cancelado com sucesso.",
      });
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}


import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { CancelRegistrationUseCase } from "@/modules/ticketing/application/use-cases/cancel-registration/cancel-registration.use-case";
import { getClientIp, readObject, readText } from "@/server/api/request-data.util";
import { internalErrorResponse, jsonSuccess, resultFailureResponse } from "@/server/api/http-response.util";
import { requirePermission } from "@/server/auth/permission-guard.util";

export type CancelRegistrationRequest = { request: NextRequest; registrationId: string };
export type CancelRegistrationDependencies = { useCase: CancelRegistrationUseCase };

export class CancelRegistrationController extends Controller<CancelRegistrationRequest, NextResponse> {
  private readonly useCase: CancelRegistrationUseCase;
  constructor(dependencies: CancelRegistrationDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }
  async handle(input: CancelRegistrationRequest): Promise<NextResponse> {
    const guard = await requirePermission({ request: input.request, permission: "registrations:cancel" });
    if (!guard.ok) return guard.response;
    try {
      const body = readObject(await input.request.json().catch(() => null));
      const result = await this.useCase.execute({ registrationId: input.registrationId, reason: readText({ value: body.reason }), userId: guard.session.user.id, userName: guard.session.user.nome, canManageAll: guard.scope.canManageAllRegistrations, ip: getClientIp(input.request) });
      if (result.isFailure) return resultFailureResponse({ error: result.error, status: 422 });
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

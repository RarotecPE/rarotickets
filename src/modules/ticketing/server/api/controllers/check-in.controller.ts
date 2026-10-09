import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { CheckInUseCase } from "@/modules/ticketing/application/use-cases/check-in/check-in.use-case";
import { getClientIp, readBoolean, readObject, readOptionalText, readText } from "@/server/api/request-data.util";
import { internalErrorResponse, jsonError, jsonSuccess, resultFailureResponse } from "@/server/api/http-response.util";
import { requirePermission } from "@/server/auth/permission-guard.util";

export type CheckInRequest = { request: NextRequest };
export type CheckInDependencies = { useCase: CheckInUseCase };

export class CheckInController extends Controller<CheckInRequest, NextResponse> {
  private readonly useCase: CheckInUseCase;
  constructor(dependencies: CheckInDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }
  async handle(input: CheckInRequest): Promise<NextResponse> {
    const guard = await requirePermission({ request: input.request, permission: "checkin:write" });
    if (!guard.ok) return guard.response;
    try {
      const body = readObject(await input.request.json().catch(() => null));
      const result = await this.useCase.execute({ qrToken: readText({ value: body.qrToken }), operatorId: guard.session.user.id, operatorName: guard.session.user.nome, canReenter: guard.session.permissions.includes("checkin:reentry"), supervisorReentry: readBoolean({ value: body.reentry }), justification: readOptionalText({ value: body.justification }) ?? undefined, ip: getClientIp(input.request) });
      if (result.isFailure) return resultFailureResponse({ error: result.error, status: 422 });
      if (!result.value.accepted) return jsonError({ code: "CHECKIN_REJECTED", message: result.value.reason ?? "Check-in recusado.", status: 409, details: result.value });
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { internalErrorResponse, jsonSuccess, resultFailureResponse } from "@/server/api/http-response.util";
import { requirePermission } from "@/server/auth/permission-guard.util";
import { GetDashboardUseCase } from "@/modules/ticketing/application/use-cases/get-dashboard/get-dashboard.use-case";

export type GetDashboardDependencies = { useCase: GetDashboardUseCase };

export class GetDashboardController extends Controller<NextRequest, NextResponse> {
  private readonly useCase: GetDashboardUseCase;
  constructor(dependencies: GetDashboardDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }
  async handle(request: NextRequest): Promise<NextResponse> {
    const guard = await requirePermission({ request, permission: "dashboard:read" });
    if (!guard.ok) return guard.response;
    try {
      const result = await this.useCase.execute({ userId: guard.session.user.id, canViewAll: guard.scope.canViewAllEvents });
      if (result.isFailure) return resultFailureResponse({ error: result.error });
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

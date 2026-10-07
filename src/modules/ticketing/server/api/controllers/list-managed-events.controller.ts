import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { internalErrorResponse, jsonSuccess, resultFailureResponse } from "@/server/api/http-response.util";
import { readText } from "@/server/api/request-data.util";
import { requirePermission } from "@/server/auth/permission-guard.util";
import { ListManagedEventsUseCase } from "@/modules/ticketing/application/use-cases/list-managed-events/list-managed-events.use-case";

export type ListManagedEventsDependencies = { useCase: ListManagedEventsUseCase };

export class ListManagedEventsController extends Controller<NextRequest, NextResponse> {
  private readonly useCase: ListManagedEventsUseCase;
  constructor(dependencies: ListManagedEventsDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }
  async handle(request: NextRequest): Promise<NextResponse> {
    const guard = await requirePermission({ request, permission: "events:read" });
    if (!guard.ok) return guard.response;
    try {
      const result = await this.useCase.execute({ userId: guard.session.user.id, canViewAll: guard.scope.canViewAllEvents, query: readText({ value: request.nextUrl.searchParams.get("q") }) });
      if (result.isFailure) return resultFailureResponse({ error: result.error });
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { readPagination, readText } from "@/server/api/request-data.util";
import { internalErrorResponse, jsonSuccess, resultFailureResponse } from "@/server/api/http-response.util";
import { requirePermission } from "@/server/auth/permission-guard.util";
import { ListRegistrationsUseCase } from "@/modules/ticketing/application/use-cases/list-registrations/list-registrations.use-case";

export type ListRegistrationsDependencies = { useCase: ListRegistrationsUseCase };

export class ListRegistrationsController extends Controller<NextRequest, NextResponse> {
  private readonly useCase: ListRegistrationsUseCase;
  constructor(dependencies: ListRegistrationsDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }
  async handle(request: NextRequest): Promise<NextResponse> {
    const guard = await requirePermission({ request, permission: "registrations:read" });
    if (!guard.ok) return guard.response;
    try {
      const pagination = readPagination(request.nextUrl.searchParams);
      const result = await this.useCase.execute({ eventId: readText({ value: request.nextUrl.searchParams.get("eventId") }) || undefined, query: readText({ value: request.nextUrl.searchParams.get("q") }) || undefined, status: readText({ value: request.nextUrl.searchParams.get("status") }) || undefined, ...pagination, userId: guard.session.user.id, canViewAll: guard.scope.canViewAllEvents });
      if (result.isFailure) return resultFailureResponse({ error: result.error });
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

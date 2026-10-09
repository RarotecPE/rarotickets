import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { ListAuditLogUseCase } from "@/modules/ticketing/application/use-cases/list-audit-log/list-audit-log.use-case";
import { readPagination, readText } from "@/server/api/request-data.util";
import { internalErrorResponse, jsonSuccess, resultFailureResponse } from "@/server/api/http-response.util";
import { requirePermission } from "@/server/auth/permission-guard.util";

export type ListAuditLogDependencies = { useCase: ListAuditLogUseCase };

export class ListAuditLogController extends Controller<NextRequest, NextResponse> {
  private readonly useCase: ListAuditLogUseCase;
  constructor(dependencies: ListAuditLogDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }
  async handle(request: NextRequest): Promise<NextResponse> {
    const guard = await requirePermission({ request, permission: "audit:read" });
    if (!guard.ok) return guard.response;
    try {
      const result = await this.useCase.execute({ query: readText({ value: request.nextUrl.searchParams.get("q") }) || undefined, ...readPagination(request.nextUrl.searchParams) });
      if (result.isFailure) return resultFailureResponse({ error: result.error });
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

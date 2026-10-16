import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { readDate, readText } from "@/server/api/request-data.util";
import { internalErrorResponse, jsonSuccess, resultFailureResponse } from "@/server/api/http-response.util";
import { requirePermission } from "@/server/auth/permission-guard.util";
import { GetReportUseCase } from "@/modules/ticketing/application/use-cases/get-report/get-report.use-case";
import { auditClient, getRequestContext, sessionToAuditActor } from "@/lib/audit";

export type GetReportDependencies = { useCase: GetReportUseCase };

export class GetReportController extends Controller<NextRequest, NextResponse> {
  private readonly useCase: GetReportUseCase;
  constructor(dependencies: GetReportDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }
  async handle(request: NextRequest): Promise<NextResponse> {
    const guard = await requirePermission({ request, permission: "reports:read" });
    if (!guard.ok) return guard.response;
    try {
      const result = await this.useCase.execute({ eventId: readText({ value: request.nextUrl.searchParams.get("eventId") }) || undefined, from: readDate({ value: request.nextUrl.searchParams.get("from") }) ?? undefined, to: readDate({ value: request.nextUrl.searchParams.get("to") }) ?? undefined, userId: guard.session.user.id, canViewAll: guard.scope.canViewAllEvents });
      if (result.isFailure) return resultFailureResponse({ error: result.error });

      const context = getRequestContext(request);
      const actor = sessionToAuditActor(guard.session);
      auditClient.log({
        category: "report",
        action: "report.exported",
        severity: "INFO",
        actor,
        context,
        targets: [{ type: "report", id: "events-report", label: "Relatório de Eventos" }],
        details: {
          eventId: request.nextUrl.searchParams.get("eventId") || null,
          from: request.nextUrl.searchParams.get("from") || null,
          to: request.nextUrl.searchParams.get("to") || null,
        },
      });

      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

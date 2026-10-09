import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { GetManagedEventUseCase } from "@/modules/ticketing/application/use-cases/get-managed-event/get-managed-event.use-case";
import { IssueCertificatesUseCase } from "@/modules/ticketing/application/use-cases/issue-certificates/issue-certificates.use-case";
import { getClientIp } from "@/server/api/request-data.util";
import { internalErrorResponse, jsonError, jsonSuccess, resultFailureResponse } from "@/server/api/http-response.util";
import { requirePermission } from "@/server/auth/permission-guard.util";

export type IssueCertificatesRequest = { request: NextRequest; eventId: string };
export type IssueCertificatesDependencies = { getManagedEvent: GetManagedEventUseCase; issueCertificates: IssueCertificatesUseCase };

export class IssueCertificatesController extends Controller<IssueCertificatesRequest, NextResponse> {
  private readonly getManagedEvent: GetManagedEventUseCase;
  private readonly issueCertificates: IssueCertificatesUseCase;
  constructor(dependencies: IssueCertificatesDependencies) {
    super();
    this.getManagedEvent = dependencies.getManagedEvent;
    this.issueCertificates = dependencies.issueCertificates;
  }
  async handle(input: IssueCertificatesRequest): Promise<NextResponse> {
    const guard = await requirePermission({ request: input.request, permission: "certificates:write" });
    if (!guard.ok) return guard.response;
    try {
      const access = await this.getManagedEvent.execute({ id: input.eventId, userId: guard.session.user.id, canViewAll: guard.scope.canViewAllEvents });
      if (access.isFailure) return jsonError({ code: "EVENT_NOT_FOUND", message: access.error.message, status: 404 });
      const result = await this.issueCertificates.execute({ eventId: input.eventId, userId: guard.session.user.id, userName: guard.session.user.nome, canViewAll: guard.scope.canViewAllEvents, ip: getClientIp(input.request) });
      if (result.isFailure) return resultFailureResponse({ error: result.error });
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

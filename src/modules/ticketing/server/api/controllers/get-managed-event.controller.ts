import type { NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { GetManagedEventUseCase } from "@/modules/ticketing/application/use-cases/get-managed-event/get-managed-event.use-case";
import { jsonError, jsonSuccess, internalErrorResponse } from "@/server/api/http-response.util";
import { requirePermission } from "@/server/auth/permission-guard.util";
import type { NextRequest } from "next/server";

export type GetManagedEventRequest = { request: NextRequest; eventId: string };
export type GetManagedEventDependencies = { useCase: GetManagedEventUseCase };

export class GetManagedEventController extends Controller<GetManagedEventRequest, NextResponse> {
  private readonly useCase: GetManagedEventUseCase;
  constructor(dependencies: GetManagedEventDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }
  async handle(input: GetManagedEventRequest): Promise<NextResponse> {
    const guard = await requirePermission({ request: input.request, permission: "events:read" });
    if (!guard.ok) return guard.response;
    try {
      const result = await this.useCase.execute({ id: input.eventId, userId: guard.session.user.id, canViewAll: guard.scope.canViewAllEvents });
      if (result.isFailure) return jsonError({ code: "EVENT_NOT_FOUND", message: result.error.message, status: 404 });
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

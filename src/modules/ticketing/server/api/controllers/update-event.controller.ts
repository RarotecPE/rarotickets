import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { mapUpdateEventProps } from "@/server/api/event-request.mapper";
import { getClientIp, readObject } from "@/server/api/request-data.util";
import { internalErrorResponse, jsonSuccess, resultFailureResponse } from "@/server/api/http-response.util";
import { requirePermission } from "@/server/auth/permission-guard.util";
import { UpdateEventUseCase } from "@/modules/ticketing/application/use-cases/update-event/update-event.use-case";

export type UpdateEventRequest = { request: NextRequest; eventId: string };
export type UpdateEventDependencies = { useCase: UpdateEventUseCase };

export class UpdateEventController extends Controller<UpdateEventRequest, NextResponse> {
  private readonly useCase: UpdateEventUseCase;
  constructor(dependencies: UpdateEventDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }
  async handle(input: UpdateEventRequest): Promise<NextResponse> {
    const guard = await requirePermission({ request: input.request, permission: "events:write" });
    if (!guard.ok) return guard.response;
    try {
      const body = readObject(await input.request.json().catch(() => null));
      const parsed = mapUpdateEventProps(body);
      if (parsed.isFailure) return resultFailureResponse({ error: parsed.error, status: 400 });
      const { lots, fields, activities, ...props } = parsed.value;
      const result = await this.useCase.execute({
        eventId: input.eventId,
        props,
        userId: guard.session.user.id,
        userName: guard.session.user.nome,
        canViewAll: guard.scope.canViewAllEvents,
        ip: getClientIp(input.request),
        lots,
        fields,
        activities,
      });
      if (result.isFailure) return resultFailureResponse({ error: result.error, status: 422 });
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

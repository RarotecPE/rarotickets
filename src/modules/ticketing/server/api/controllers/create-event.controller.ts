import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { mapCreateEventRequest } from "@/server/api/event-request.mapper";
import { getClientIp, readObject } from "@/server/api/request-data.util";
import { internalErrorResponse, jsonSuccess, resultFailureResponse } from "@/server/api/http-response.util";
import { requirePermission } from "@/server/auth/permission-guard.util";
import { CreateEventUseCase } from "@/modules/ticketing/application/use-cases/create-event/create-event.use-case";

export type CreateEventDependencies = { useCase: CreateEventUseCase };

export class CreateEventController extends Controller<NextRequest, NextResponse> {
  private readonly useCase: CreateEventUseCase;
  constructor(dependencies: CreateEventDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }
  async handle(request: NextRequest): Promise<NextResponse> {
    const guard = await requirePermission({ request, permission: "events:write" });
    if (!guard.ok) return guard.response;
    try {
      const body = readObject(await request.json().catch(() => null));
      const parsed = mapCreateEventRequest(body);
      if (parsed.isFailure) return resultFailureResponse({ error: parsed.error, status: 400 });
      const result = await this.useCase.execute({ ...parsed.value, userId: guard.session.user.id, userName: guard.session.user.nome, ip: getClientIp(request) });
      if (result.isFailure) return resultFailureResponse({ error: result.error, status: 422 });
      return jsonSuccess(result.value, 201);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

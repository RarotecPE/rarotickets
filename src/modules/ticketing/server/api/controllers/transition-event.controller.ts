import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { TransitionEventUseCase } from "@/modules/ticketing/application/use-cases/transition-event/transition-event.use-case";
import type { EventStatus } from "@/modules/ticketing/domain/events/entities/event.aggregate";
import { getClientIp, readObject, readOptionalText } from "@/server/api/request-data.util";
import { internalErrorResponse, jsonError, jsonSuccess, resultFailureResponse } from "@/server/api/http-response.util";
import { requirePermission } from "@/server/auth/permission-guard.util";

export type TransitionEventRequest = { request: NextRequest; eventId: string };
export type TransitionEventDependencies = { useCase: TransitionEventUseCase };
const EVENT_STATUSES: EventStatus[] = ["rascunho", "agendado", "inscricoes_abertas", "inscricoes_encerradas", "em_andamento", "finalizado", "cancelado"];

export class TransitionEventController extends Controller<TransitionEventRequest, NextResponse> {
  private readonly useCase: TransitionEventUseCase;
  constructor(dependencies: TransitionEventDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }
  async handle(input: TransitionEventRequest): Promise<NextResponse> {
    const guard = await requirePermission({ request: input.request, permission: "events:write" });
    if (!guard.ok) return guard.response;
    try {
      const body = readObject(await input.request.json().catch(() => null));
      const nextStatus = typeof body.nextStatus === "string" && EVENT_STATUSES.includes(body.nextStatus as EventStatus) ? body.nextStatus as EventStatus : null;
      if (!nextStatus) return jsonError({ code: "INVALID_EVENT_STATUS", message: "Situação de evento inválida.", status: 400 });
      const result = await this.useCase.execute({ eventId: input.eventId, nextStatus, justification: readOptionalText({ value: body.justification }) ?? undefined, userId: guard.session.user.id, userName: guard.session.user.nome, canViewAll: guard.scope.canViewAllEvents, ip: getClientIp(input.request) });
      if (result.isFailure) return resultFailureResponse({ error: result.error, status: 422 });
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

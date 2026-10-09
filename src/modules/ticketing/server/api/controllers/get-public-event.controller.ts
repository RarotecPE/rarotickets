import type { NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { internalErrorResponse, jsonError, jsonSuccess, resultFailureResponse } from "@/server/api/http-response.util";
import { GetPublicEventUseCase } from "@/modules/ticketing/application/use-cases/get-public-event/get-public-event.use-case";

export type GetPublicEventRequest = { slug: string };
export type GetPublicEventDependencies = { useCase: GetPublicEventUseCase };

export class GetPublicEventController extends Controller<GetPublicEventRequest, NextResponse> {
  private readonly useCase: GetPublicEventUseCase;
  constructor(dependencies: GetPublicEventDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }
  async handle(request: GetPublicEventRequest): Promise<NextResponse> {
    try {
      const result = await this.useCase.execute({ slug: request.slug, at: new Date() });
      if (result.isFailure) return resultFailureResponse({ error: result.error });
      if (!result.value) return jsonError({ code: "EVENT_NOT_FOUND", message: "Evento não encontrado.", status: 404 });
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

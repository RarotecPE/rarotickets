import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { internalErrorResponse, jsonSuccess, resultFailureResponse } from "@/server/api/http-response.util";
import { clamp, readInteger, readText } from "@/server/api/request-data.util";
import type { ListPublicEventsUseCase } from "@/modules/ticketing/application/use-cases/list-public-events/list-public-events.use-case";

export type GetPublicEventsDependencies = { useCase: ListPublicEventsUseCase };

export class GetPublicEventsController extends Controller<NextRequest, NextResponse> {
  private readonly useCase: ListPublicEventsUseCase;
  constructor(dependencies: GetPublicEventsDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }
  async handle(request: NextRequest): Promise<NextResponse> {
    try {
      const limit = clamp({ value: readInteger({ value: request.nextUrl.searchParams.get("limit"), fallback: 24 }), minimum: 1, maximum: 100 });
      const result = await this.useCase.execute({ query: readText({ value: request.nextUrl.searchParams.get("q") }), modality: readText({ value: request.nextUrl.searchParams.get("modality") }), limit });
      if (result.isFailure) return resultFailureResponse({ error: result.error });
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

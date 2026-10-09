import type { NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { StartParticipantCheckoutUseCase } from "@/modules/ticketing/application/use-cases/start-participant-checkout/start-participant-checkout.use-case";
import { internalErrorResponse, jsonSuccess, resultFailureResponse } from "@/server/api/http-response.util";

export type StartParticipantCheckoutRequest = { accessToken: string };
export type StartParticipantCheckoutDependencies = { useCase: StartParticipantCheckoutUseCase };

export class StartParticipantCheckoutController extends Controller<StartParticipantCheckoutRequest, NextResponse> {
  private readonly useCase: StartParticipantCheckoutUseCase;
  constructor(dependencies: StartParticipantCheckoutDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }
  async handle(request: StartParticipantCheckoutRequest): Promise<NextResponse> {
    try {
      const result = await this.useCase.execute({ accessToken: request.accessToken });
      if (result.isFailure) return resultFailureResponse({ error: result.error, status: 409 });
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

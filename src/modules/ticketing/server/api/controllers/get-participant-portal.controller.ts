import type { NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { GetParticipantPortalUseCase } from "@/modules/ticketing/application/use-cases/get-participant-portal/get-participant-portal.use-case";
import { internalErrorResponse, jsonError, jsonSuccess } from "@/server/api/http-response.util";

export type GetParticipantPortalRequest = { accessToken: string };
export type GetParticipantPortalDependencies = { useCase: GetParticipantPortalUseCase };

export class GetParticipantPortalController extends Controller<GetParticipantPortalRequest, NextResponse> {
  private readonly useCase: GetParticipantPortalUseCase;
  constructor(dependencies: GetParticipantPortalDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }
  async handle(request: GetParticipantPortalRequest): Promise<NextResponse> {
    try {
      const result = await this.useCase.execute({ accessToken: request.accessToken });
      if (result.isFailure) return jsonError({ code: "PARTICIPANT_LINK_INVALID", message: result.error.message, status: 404 });
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

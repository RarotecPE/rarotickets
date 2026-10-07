import type { NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { ValidateCertificateUseCase } from "@/modules/ticketing/application/use-cases/validate-certificate/validate-certificate.use-case";
import { internalErrorResponse, jsonError, jsonSuccess } from "@/server/api/http-response.util";

export type ValidateCertificateRequest = { code: string };
export type ValidateCertificateDependencies = { useCase: ValidateCertificateUseCase };

export class ValidateCertificateController extends Controller<ValidateCertificateRequest, NextResponse> {
  private readonly useCase: ValidateCertificateUseCase;
  constructor(dependencies: ValidateCertificateDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }
  async handle(request: ValidateCertificateRequest): Promise<NextResponse> {
    try {
      const result = await this.useCase.execute({ code: request.code });
      if (result.isFailure) return internalErrorResponse(result.error);
      if (!result.value) return jsonError({ code: "CERTIFICATE_NOT_FOUND", message: "Não encontramos um certificado com esse código.", status: 404 });
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import {
  internalErrorResponse,
  jsonError,
  jsonSuccess,
  resultFailureResponse,
} from "@/server/api/http-response.util";
import type { RunMaintenanceUseCase } from "@/modules/ticketing/application/use-cases/run-maintenance/run-maintenance.use-case";
import {
  isPlaceholder,
  readEnvironment,
} from "@/server/config/environment.config";
import { safeEqual } from "@/server/infrastructure/providers/secure-token.provider";

const DEFAULT_BATCH_LIMIT = 50;
const MAX_BATCH_LIMIT = 100;

export type RunMaintenanceDependencies = {
  useCaseFactory: () => RunMaintenanceUseCase;
};

export class RunMaintenanceController extends Controller<
  NextRequest,
  NextResponse
> {
  private readonly useCaseFactory: () => RunMaintenanceUseCase;

  constructor(dependencies: RunMaintenanceDependencies) {
    super();
    this.useCaseFactory = dependencies.useCaseFactory;
  }

  async handle(request: NextRequest): Promise<NextResponse> {
    const secret = readEnvironment().cronSecret;
    if (isPlaceholder(secret)) {
      return jsonError({
        code: "MAINTENANCE_NOT_CONFIGURED",
        message: "O processamento agendado não está configurado.",
        status: 503,
      });
    }

    const authorization = request.headers.get("authorization") ?? "";
    const providedSecret = authorization.startsWith("Bearer ")
      ? authorization.slice("Bearer ".length).trim()
      : "";
    if (!providedSecret || !safeEqual(providedSecret, secret)) {
      return jsonError({
        code: "MAINTENANCE_UNAUTHORIZED",
        message: "Credencial de processamento inválida.",
        status: 401,
      });
    }

    const rawLimit = Number(
      new URL(request.url).searchParams.get("limit") ?? DEFAULT_BATCH_LIMIT,
    );
    if (
      !Number.isInteger(rawLimit) ||
      rawLimit < 1 ||
      rawLimit > MAX_BATCH_LIMIT
    ) {
      return jsonError({
        code: "INVALID_BATCH_LIMIT",
        message: "O limite deve ser um inteiro entre 1 e 100.",
        status: 400,
      });
    }

    try {
      const result = await this.useCaseFactory().execute({ limit: rawLimit });
      if (result.isFailure)
        return resultFailureResponse({ error: result.error });
      return jsonSuccess(result.value);
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

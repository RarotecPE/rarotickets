import type { NextRequest, NextResponse } from "next/server";
import { Controller } from "@/server/api/controller.base";
import { ExtendRegistrationReservationUseCase } from "@/modules/ticketing/application/use-cases/extend-registration-reservation/extend-registration-reservation.use-case";
import { getClientIp } from "@/server/api/request-data.util";
import {
  internalErrorResponse,
  jsonError,
  jsonSuccess,
  resultFailureResponse,
} from "@/server/api/http-response.util";
import { requirePermission } from "@/server/auth/permission-guard.util";

export type ExtendRegistrationReservationRequest = {
  request: NextRequest;
  registrationId: string;
};
export type ExtendRegistrationReservationDependencies = {
  useCase: ExtendRegistrationReservationUseCase;
};

export class ExtendRegistrationReservationController extends Controller<
  ExtendRegistrationReservationRequest,
  NextResponse
> {
  private readonly useCase: ExtendRegistrationReservationUseCase;

  constructor(dependencies: ExtendRegistrationReservationDependencies) {
    super();
    this.useCase = dependencies.useCase;
  }

  async handle(
    input: ExtendRegistrationReservationRequest,
  ): Promise<NextResponse> {
    const guard = await requirePermission({
      request: input.request,
      permission: "registrations:manage",
    });
    if (!guard.ok) return guard.response;

    try {
      const body = (await input.request.json().catch(() => null)) as {
        expiresAt?: string;
      } | null;

      if (!body?.expiresAt) {
        return jsonError({
          code: "EXPIRATION_DATE_REQUIRED",
          message: "Informe a nova data de expiração da reserva.",
          status: 400,
        });
      }

      const expiresAt = new Date(body.expiresAt);
      if (isNaN(expiresAt.getTime())) {
        return jsonError({
          code: "INVALID_EXPIRATION_DATE",
          message: "Data de expiração da reserva inválida.",
          status: 400,
        });
      }

      const result = await this.useCase.execute({
        registrationId: input.registrationId,
        expiresAt,
        userId: guard.session.user.id,
        userName: guard.session.user.nome,
        canManageAll: guard.scope.canManageAllRegistrations,
        ip: getClientIp(input.request),
      });

      if (result.isFailure) {
        return resultFailureResponse({ error: result.error, status: 422 });
      }

      return jsonSuccess({
        registrationCode: result.value.registrationCode,
        status: result.value.status,
        reservationExpiresAt: result.value.reservationExpiresAt.toISOString(),
      });
    } catch (error) {
      return internalErrorResponse(error);
    }
  }
}

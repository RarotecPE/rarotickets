import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { RegistrationRepository } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";

export type ExtendRegistrationReservationInputDto = {
  registrationId: string;
  expiresAt: Date;
  userId: string;
  userName: string;
  canManageAll: boolean;
  ip: string | null;
};

export type ExtendRegistrationReservationOutputDto = {
  registrationCode: string;
  status: string;
  reservationExpiresAt: Date;
};

export type ExtendRegistrationReservationDependencies = {
  registrationRepository: RegistrationRepository;
  auditRepository: IAuditRepository;
};

export class ExtendRegistrationReservationUseCase extends UseCase<
  ExtendRegistrationReservationInputDto,
  ExtendRegistrationReservationOutputDto
> {
  private readonly registrationRepository: RegistrationRepository;
  private readonly auditRepository: IAuditRepository;

  constructor(dependencies: ExtendRegistrationReservationDependencies) {
    super();
    this.registrationRepository = dependencies.registrationRepository;
    this.auditRepository = dependencies.auditRepository;
  }

  async execute(
    input: ExtendRegistrationReservationInputDto,
  ): Promise<Result<ExtendRegistrationReservationOutputDto>> {
    if (!input.expiresAt || isNaN(input.expiresAt.getTime())) {
      return Result.fail(new Error("Data de expiração inválida."));
    }

    const at = new Date();
    if (input.expiresAt <= at) {
      return Result.fail(
        new Error("A nova data de expiração da reserva deve estar no futuro."),
      );
    }

    const result = await this.registrationRepository.extendReservation({
      registrationId: input.registrationId,
      expiresAt: input.expiresAt,
      actorId: input.userId,
      canManageAll: input.canManageAll,
      at,
    });

    if (result.isFailure) {
      return Result.fail(result.error);
    }

    const extended = result.value;

    await this.auditRepository.write({
      userId: input.userId,
      userName: input.userName,
      action: "registration.reservation_extended",
      entity: "registration",
      recordId: extended.registrationCode,
      beforeData: {
        previousExpiresAt: extended.previousExpiresAt?.toISOString() ?? null,
      },
      afterData: {
        registrationId: extended.registrationId,
        status: extended.status,
        newExpiresAt: extended.newExpiresAt.toISOString(),
      },
      ip: input.ip,
    });

    return Result.ok({
      registrationCode: extended.registrationCode,
      status: extended.status,
      reservationExpiresAt: extended.newExpiresAt,
    });
  }
}


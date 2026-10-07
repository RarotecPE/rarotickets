import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";
import type { RegistrationRepository } from "@/modules/ticketing/domain/registrations/repositories/registration-repository.interface";
import type { PromoteWaitlistUseCase } from "@/modules/ticketing/application/use-cases/promote-waitlist/promote-waitlist.use-case";

export type CancelRegistrationInputDto = {
  registrationId: string;
  reason: string;
  userId: string;
  userName: string;
  canManageAll: boolean;
  ip: string | null;
};
export type CancelRegistrationOutputDto = {
  registrationCode: string;
  status: string;
  promotedWaitlistCount: number;
  waitlistPromotionPending: boolean;
};
export type CancelRegistrationDependencies = {
  registrationRepository: RegistrationRepository;
  auditRepository: IAuditRepository;
  promoteWaitlist: PromoteWaitlistUseCase;
};

export class CancelRegistrationUseCase extends UseCase<
  CancelRegistrationInputDto,
  CancelRegistrationOutputDto
> {
  private readonly registrationRepository: RegistrationRepository;
  private readonly auditRepository: IAuditRepository;
  private readonly promoteWaitlist: PromoteWaitlistUseCase;

  constructor(dependencies: CancelRegistrationDependencies) {
    super();
    this.registrationRepository = dependencies.registrationRepository;
    this.auditRepository = dependencies.auditRepository;
    this.promoteWaitlist = dependencies.promoteWaitlist;
  }

  async execute(
    input: CancelRegistrationInputDto,
  ): Promise<Result<CancelRegistrationOutputDto>> {
    if (!input.reason.trim())
      return Result.fail(new Error("Informe o motivo do cancelamento."));
    const at = new Date();
    const result = await this.registrationRepository.cancel({
      registrationId: input.registrationId,
      reason: input.reason,
      actorId: input.userId,
      at,
      canManageAll: input.canManageAll,
    });
    if (!result)
      return Result.fail(
        new Error("Inscrição não encontrada ou sem permissão para cancelar."),
      );
    await this.auditRepository.write({
      userId: input.userId,
      userName: input.userName,
      action: "registration.cancelled",
      entity: "registration",
      recordId: input.registrationId,
      beforeData: null,
      afterData: { status: result.status, reason: input.reason },
      ip: input.ip,
    });

    let promotedWaitlistCount = 0;
    let waitlistPromotionPending = false;
    if (result.seatReleased) {
      try {
        const promotion = await this.promoteWaitlist.execute({
          eventId: result.eventId,
          at,
          maxPromotions: 1,
        });
        if (promotion.isFailure) waitlistPromotionPending = true;
        else promotedWaitlistCount = promotion.value.promotedCount;
      } catch {
        waitlistPromotionPending = true;
      }
    }

    return Result.ok({
      registrationCode: result.registrationCode,
      status: result.status,
      promotedWaitlistCount,
      waitlistPromotionPending,
    });
  }
}

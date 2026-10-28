import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { CheckInRepository } from "@/modules/ticketing/domain/repositories/checkin-repository.interface";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";

export type CancelCheckInInputDto = {
  registrationId: string;
  checkInId?: string;
  reason?: string | null;
  userId: string;
  userName: string;
  canManageAll: boolean;
  ip: string | null;
};

export type CancelCheckInOutputDto = {
  registrationCode: string;
  cancelledCheckInId: string;
};

export type CancelCheckInDependencies = {
  checkInRepository: CheckInRepository;
  auditRepository: IAuditRepository;
};

export class CancelCheckInUseCase extends UseCase<
  CancelCheckInInputDto,
  CancelCheckInOutputDto
> {
  private readonly checkInRepository: CheckInRepository;
  private readonly auditRepository: IAuditRepository;

  constructor(dependencies: CancelCheckInDependencies) {
    super();
    this.checkInRepository = dependencies.checkInRepository;
    this.auditRepository = dependencies.auditRepository;
  }

  async execute(
    input: CancelCheckInInputDto,
  ): Promise<Result<CancelCheckInOutputDto>> {
    const at = new Date();
    const result = await this.checkInRepository.cancelCheckIn({
      registrationId: input.registrationId,
      checkInId: input.checkInId,
      actorId: input.userId,
      actorName: input.userName,
      canManageAll: input.canManageAll,
      at,
      reason: input.reason,
    });

    if (result.isFailure) {
      return Result.fail(result.error);
    }

    const value = result.value;

    await this.auditRepository.write({
      userId: input.userId,
      userName: input.userName,
      action: "checkin.cancelled",
      entity: "registration",
      recordId: value.registrationCode,
      beforeData: {
        checkInId: value.cancelledCheckInId,
        type: value.checkInType,
        happenedAt: value.happenedAt.toISOString(),
        operatorName: value.operatorName,
      },
      afterData: {
        cancelledAt: at.toISOString(),
        reason: input.reason ?? null,
        cancelledBy: input.userName,
      },
      ip: input.ip,
    });

    return Result.ok({
      registrationCode: value.registrationCode,
      cancelledCheckInId: value.cancelledCheckInId,
    });
  }
}


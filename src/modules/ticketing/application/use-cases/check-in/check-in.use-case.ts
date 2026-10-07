import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import { CheckInDomainService } from "@/modules/ticketing/domain/services/check-in.domain-service";
import type { CheckInResult, CheckInRepository } from "@/modules/ticketing/domain/repositories/checkin-repository.interface";
import type { ICredentialProvider } from "@/modules/ticketing/domain/services/credential-provider.interface";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";

export type CheckInInputDto = { qrToken: string; operatorId: string; operatorName: string; canReenter: boolean; supervisorReentry: boolean; justification?: string; ip: string | null };
export type CheckInOutputDto = CheckInResult;
export type CheckInDependencies = { checkInRepository: CheckInRepository; credentialProvider: ICredentialProvider; auditRepository: IAuditRepository; checkInDomainService: CheckInDomainService };

export class CheckInUseCase extends UseCase<CheckInInputDto, CheckInOutputDto> {
  private readonly checkInRepository: CheckInRepository;
  private readonly credentialProvider: ICredentialProvider;
  private readonly auditRepository: IAuditRepository;
  private readonly checkInDomainService: CheckInDomainService;

  constructor(dependencies: CheckInDependencies) {
    super();
    this.checkInRepository = dependencies.checkInRepository;
    this.credentialProvider = dependencies.credentialProvider;
    this.auditRepository = dependencies.auditRepository;
    this.checkInDomainService = dependencies.checkInDomainService;
  }

  async execute(input: CheckInInputDto): Promise<Result<CheckInOutputDto>> {
    const registrationId = this.credentialProvider.verifyQrToken({ token: input.qrToken });
    if (!registrationId) return Result.fail(new Error("QR Code inválido ou adulterado."));
    const at = new Date();
    const context = await this.checkInRepository.findContext({ registrationId, at });
    if (!context) return Result.fail(new Error("Inscrição não encontrada para este QR Code."));
    const reentryGranted = input.supervisorReentry && input.canReenter;
    const eligibility = this.checkInDomainService.execute({
      registrationStatus: context.registrationStatus,
      eventStatus: context.eventStatus,
      eventDayMatches: context.eventDayMatches,
      at,
      alreadyCheckedIn: context.alreadyCheckedIn,
      supervisorReentry: reentryGranted,
      justification: input.justification,
    });
    if (eligibility.isFailure) return Result.fail(eligibility.error);
    const result = await this.checkInRepository.create({
      registrationId,
      operatorId: input.operatorId,
      operatorName: input.operatorName,
      at,
      type: eligibility.value.type,
      justification: eligibility.value.type === "reentrada_autorizada" ? input.justification?.trim() ?? null : null,
    });
    if (!result.accepted) return Result.ok(result);
    await this.auditRepository.write({
      userId: input.operatorId,
      userName: input.operatorName,
      action: result.previousCheckInAt ? "checkin.reentry" : "checkin.created",
      entity: "registration",
      recordId: result.registrationCode,
      beforeData: result.previousCheckInAt ? { previousCheckInAt: result.previousCheckInAt.toISOString() } : null,
      afterData: { happenedAt: result.happenedAt.toISOString(), type: eligibility.value.type },
      ip: input.ip,
    });
    return Result.ok(result);
  }
}

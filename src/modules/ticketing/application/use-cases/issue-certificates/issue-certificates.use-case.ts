import { UseCase } from "@/@core/application/use-case.base";
import { Result } from "@/@core/domain/result";
import type { CertificateBatchResult, CertificateRepository } from "@/modules/ticketing/domain/repositories/certificate-repository.interface";
import type { IAuditRepository } from "@/modules/ticketing/domain/repositories/audit-repository.interface";

export type IssueCertificatesInputDto = { eventId: string; userId: string; userName: string; canViewAll: boolean; ip: string | null };
export type IssueCertificatesOutputDto = CertificateBatchResult;
export type IssueCertificatesDependencies = { certificateRepository: CertificateRepository; auditRepository: IAuditRepository };

export class IssueCertificatesUseCase extends UseCase<IssueCertificatesInputDto, IssueCertificatesOutputDto> {
  private readonly certificateRepository: CertificateRepository;
  private readonly auditRepository: IAuditRepository;
  constructor(dependencies: IssueCertificatesDependencies) {
    super();
    this.certificateRepository = dependencies.certificateRepository;
    this.auditRepository = dependencies.auditRepository;
  }
  async execute(input: IssueCertificatesInputDto): Promise<Result<IssueCertificatesOutputDto>> {
    const result = await this.certificateRepository.issueEligible({ eventId: input.eventId, actorId: input.userId, canViewAll: input.canViewAll, at: new Date() });
    await this.auditRepository.write({ userId: input.userId, userName: input.userName, action: "certificates.issued", entity: "event", recordId: input.eventId, beforeData: null, afterData: { created: result.created, existing: result.existing }, ip: input.ip });
    return Result.ok(result);
  }
}

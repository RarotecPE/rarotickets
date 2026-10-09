import { DomainService } from "@/@core/domain/domain-service.base";
import { Result } from "@/@core/domain/result";
import { DomainError } from "@/@core/domain/errors/domain-error.base";

export type CertificateEligibilityParams = { registrationStatus: string; eventStatus: string; hasCheckIn: boolean; certificateEnabled: boolean; workloadHours: number };
export type CertificateEligibility = { canIssue: boolean; workloadHours: number };

export class CertificateEligibilityError extends DomainError {
  constructor() { super({ code: "CERTIFICATE_NOT_ELIGIBLE", message: "O participante ainda não atende aos critérios para emissão do certificado." }); }
}

export class CertificateEligibilityDomainService extends DomainService<CertificateEligibilityParams, CertificateEligibility> {
  execute(params: CertificateEligibilityParams): Result<CertificateEligibility, CertificateEligibilityError> {
    if (params.registrationStatus !== "confirmada" || params.eventStatus !== "finalizado" || !params.hasCheckIn || !params.certificateEnabled || params.workloadHours <= 0) {
      return Result.fail(new CertificateEligibilityError());
    }
    return Result.ok({ canIssue: true, workloadHours: params.workloadHours });
  }
}

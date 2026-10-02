import { DomainService } from '../../../../@core/domain/domain-service.base.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { InvalidStateError } from '../../../../@core/domain/errors/domain-errors.ts';

export type CertificateRegistrationStatus = 'PENDENTE' | 'AGUARDANDO_PAGAMENTO' | 'CONFIRMADA' | 'CANCELADA' | 'LISTA_ESPERA';
export type CertificateEligibilityParams = {
  certificatesEnabled: boolean;
  registrationStatus: CertificateRegistrationStatus;
  requiresPresence: boolean;
  hasConfirmedPresence: boolean;
};

export class CertificateEligibilityService extends DomainService<CertificateEligibilityParams, void, InvalidStateError> {
  public execute(params: CertificateEligibilityParams): Result<void, InvalidStateError> {
    if (!params.certificatesEnabled) {
      return Result.fail(new InvalidStateError({ code: 'CERTIFICATES_DISABLED', message: 'Este evento não emite certificados.' }));
    }
    if (params.registrationStatus !== 'CONFIRMADA') {
      return Result.fail(new InvalidStateError({ code: 'CERTIFICATE_REGISTRATION_NOT_CONFIRMED', message: 'Somente inscrições confirmadas podem receber certificado.' }));
    }
    if (params.requiresPresence && !params.hasConfirmedPresence) {
      return Result.fail(new InvalidStateError({ code: 'CERTIFICATE_PRESENCE_REQUIRED', message: 'A presença confirmada é necessária para emitir o certificado.' }));
    }
    return Result.ok();
  }
}

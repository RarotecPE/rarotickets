import { NotFoundError } from '@core/domain/errors/not-found.error';

export class CertificateNotFoundError extends NotFoundError {
  constructor(code: string) {
    super({ message: `Certificado não encontrado: ${code}`, code: 'CERTIFICATE_NOT_FOUND' });
  }
}

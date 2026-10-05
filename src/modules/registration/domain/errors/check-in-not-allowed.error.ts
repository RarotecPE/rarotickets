import { DomainError } from '@core/domain/errors/domain-error.base';

export type CheckInBlockReason = 'INSCRICAO_NAO_CONFIRMADA' | 'CHECKIN_DUPLICADO' | 'EVENTO_ERRADO' | 'CREDENCIAL_INVALIDA';

const MESSAGES: Record<CheckInBlockReason, string> = {
  INSCRICAO_NAO_CONFIRMADA: 'Somente inscrições confirmadas podem realizar check-in',
  CHECKIN_DUPLICADO: 'Esta inscrição já realizou check-in',
  EVENTO_ERRADO: 'A credencial pertence a outro evento',
  CREDENCIAL_INVALIDA: 'Credencial inválida ou alterada',
};

export class CheckInNotAllowedError extends DomainError {
  public readonly reason: CheckInBlockReason;

  constructor(reason: CheckInBlockReason) {
    super({ message: MESSAGES[reason], code: 'CHECKIN_NOT_ALLOWED' });
    this.reason = reason;
  }
}

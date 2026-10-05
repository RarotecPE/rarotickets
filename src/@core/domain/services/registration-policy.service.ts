import { DomainService } from '../domain-service.base';
import { Result } from '../result';

export type EventRegistrationPolicySnapshot = {
  status: string;
  registrationStart: Date;
  registrationEnd: Date;
  waitlistEnabled: boolean;
  availableSeats: number;
  type: 'GRATUITO' | 'PAGO';
};

export type RegistrationPolicyBlockReason =
  | 'RASCUNHO'
  | 'CANCELADO'
  | 'INSCRICOES_ENCERRADAS'
  | 'INSCRICOES_NAO_INICIADAS'
  | 'FINALIZADO'
  | 'EM_ANDAMENTO'
  | 'CAPACIDADE_ATINGIDA';

export type EvaluateRegistrationPolicyParams = {
  event: EventRegistrationPolicySnapshot;
  at: Date;
  allowAdministrativeOverride?: boolean;
};

export type RegistrationPolicyDecision = {
  outcome: 'OCUPAR' | 'RESERVAR' | 'LISTA_ESPERA';
  availableSeats: number;
};

const BLOCK_MESSAGES: Record<RegistrationPolicyBlockReason, string> = {
  RASCUNHO: 'Evento em rascunho não aceita inscrições públicas',
  CANCELADO: 'Evento cancelado não aceita novas inscrições',
  INSCRICOES_ENCERRADAS:
    'As inscrições deste evento estão encerradas — somente ação administrativa autorizada pode incluir inscrições',
  INSCRICOES_NAO_INICIADAS: 'O período de inscrições deste evento ainda não começou',
  FINALIZADO: 'Evento finalizado não aceita novas inscrições',
  EM_ANDAMENTO: 'Evento em andamento não aceita novas inscrições',
  CAPACIDADE_ATINGIDA: 'A capacidade máxima do evento foi atingida',
};

export class RegistrationPolicyError extends Error {
  public readonly reason: RegistrationPolicyBlockReason;

  constructor(reason: RegistrationPolicyBlockReason) {
    super(BLOCK_MESSAGES[reason]);
    this.reason = reason;
    this.name = 'RegistrationPolicyError';
  }
}

/**
 * Política de aceitação de inscrições, compartilhada pelo contexto de eventos
 * e pelo fluxo de inscrições (§2, §3 e §26).
 */
export class RegistrationPolicyService extends DomainService<
  EvaluateRegistrationPolicyParams,
  RegistrationPolicyDecision
> {
  execute(params: EvaluateRegistrationPolicyParams): Result<RegistrationPolicyDecision> {
    const blockReason = this.resolveBlockReason(params);
    if (blockReason) return Result.fail(new RegistrationPolicyError(blockReason));

    const availableSeats = Math.max(params.event.availableSeats, 0);
    if (availableSeats > 0) {
      return Result.ok({
        outcome: params.event.type === 'PAGO' ? 'RESERVAR' : 'OCUPAR',
        availableSeats,
      });
    }

    return Result.ok({ outcome: 'LISTA_ESPERA', availableSeats });
  }

  public resolveBlockReason(
    params: EvaluateRegistrationPolicyParams,
  ): RegistrationPolicyBlockReason | null {
    const { status } = params.event;
    if (status === 'RASCUNHO') return 'RASCUNHO';
    if (status === 'CANCELADO') return 'CANCELADO';
    if (status === 'FINALIZADO') return 'FINALIZADO';
    if (status === 'EM_ANDAMENTO') return 'EM_ANDAMENTO';

    if (params.allowAdministrativeOverride) {
      return params.event.availableSeats > 0 || params.event.waitlistEnabled ? null : 'CAPACIDADE_ATINGIDA';
    }

    if (status === 'INSCRICOES_ENCERRADAS') return 'INSCRICOES_ENCERRADAS';

    const time = params.at.getTime();
    if (time < params.event.registrationStart.getTime()) return 'INSCRICOES_NAO_INICIADAS';
    if (time > params.event.registrationEnd.getTime()) return 'INSCRICOES_ENCERRADAS';

    if (params.event.availableSeats <= 0 && !params.event.waitlistEnabled) return 'CAPACIDADE_ATINGIDA';
    return null;
  }
}

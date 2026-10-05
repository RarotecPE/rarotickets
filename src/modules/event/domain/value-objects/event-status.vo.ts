import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type EventStatusValue =
  | 'RASCUNHO'
  | 'AGENDADO'
  | 'INSCRICOES_ABERTAS'
  | 'INSCRICOES_ENCERRADAS'
  | 'EM_ANDAMENTO'
  | 'FINALIZADO'
  | 'CANCELADO';

export type EventStatusProps = { value: EventStatusValue };

export const EVENT_STATUSES: readonly EventStatusValue[] = [
  'RASCUNHO',
  'AGENDADO',
  'INSCRICOES_ABERTAS',
  'INSCRICOES_ENCERRADAS',
  'EM_ANDAMENTO',
  'FINALIZADO',
  'CANCELADO',
];

export const EVENT_STATUS_LABELS: Record<EventStatusValue, string> = {
  RASCUNHO: 'Rascunho',
  AGENDADO: 'Agendado',
  INSCRICOES_ABERTAS: 'Inscrições abertas',
  INSCRICOES_ENCERRADAS: 'Inscrições encerradas',
  EM_ANDAMENTO: 'Em andamento',
  FINALIZADO: 'Finalizado',
  CANCELADO: 'Cancelado',
};

/** Transições permitidas entre status do evento (§2). */
const ALLOWED_TRANSITIONS: Record<EventStatusValue, readonly EventStatusValue[]> = {
  RASCUNHO: ['AGENDADO', 'INSCRICOES_ABERTAS', 'CANCELADO'],
  AGENDADO: ['INSCRICOES_ABERTAS', 'CANCELADO'],
  INSCRICOES_ABERTAS: ['INSCRICOES_ENCERRADAS', 'CANCELADO'],
  INSCRICOES_ENCERRADAS: ['INSCRICOES_ABERTAS', 'EM_ANDAMENTO', 'CANCELADO'],
  EM_ANDAMENTO: ['FINALIZADO', 'CANCELADO'],
  FINALIZADO: [],
  CANCELADO: [],
};

export class EventStatus extends ValueObject<EventStatusProps> {
  private constructor(props: EventStatusProps) {
    super(props);
  }

  get value(): EventStatusValue {
    return this.props.value;
  }

  get label(): string {
    return EVENT_STATUS_LABELS[this.props.value];
  }

  public static create(value: string): Result<EventStatus> {
    const normalized = (value ?? '').toUpperCase() as EventStatusValue;
    if (!EVENT_STATUSES.includes(normalized)) return Result.fail(new Error('Status do evento inválido'));
    return Result.ok(new EventStatus({ value: normalized }));
  }

  public static reconstitute(value: EventStatusValue): EventStatus {
    return new EventStatus({ value });
  }

  public canTransitionTo(next: EventStatus): boolean {
    return ALLOWED_TRANSITIONS[this.props.value].includes(next.value);
  }

  /** Evento em rascunho não aceita inscrições públicas. */
  public acceptsPublicRegistration(): boolean {
    return this.props.value === 'INSCRICOES_ABERTAS';
  }

  public isCancelled(): boolean {
    return this.props.value === 'CANCELADO';
  }

  public isDraft(): boolean {
    return this.props.value === 'RASCUNHO';
  }

  public isPubliclyVisible(): boolean {
    return this.props.value !== 'RASCUNHO';
  }

  public isRegistrationClosed(): boolean {
    return this.props.value === 'INSCRICOES_ENCERRADAS';
  }

  public isFinished(): boolean {
    return this.props.value === 'FINALIZADO';
  }
}

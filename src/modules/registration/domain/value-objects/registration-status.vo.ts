import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type RegistrationStatusValue =
  | 'PENDENTE'
  | 'AGUARDANDO_PAGAMENTO'
  | 'CONFIRMADA'
  | 'CANCELADA'
  | 'LISTA_ESPERA';
export type RegistrationStatusProps = { value: RegistrationStatusValue };

export const REGISTRATION_STATUSES: readonly RegistrationStatusValue[] = [
  'PENDENTE',
  'AGUARDANDO_PAGAMENTO',
  'CONFIRMADA',
  'CANCELADA',
  'LISTA_ESPERA',
];

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatusValue, string> = {
  PENDENTE: 'Pendente',
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  CONFIRMADA: 'Confirmada',
  CANCELADA: 'Cancelada',
  LISTA_ESPERA: 'Lista de espera',
};

export class RegistrationStatus extends ValueObject<RegistrationStatusProps> {
  private constructor(props: RegistrationStatusProps) {
    super(props);
  }

  get value(): RegistrationStatusValue {
    return this.props.value;
  }

  get label(): string {
    return REGISTRATION_STATUS_LABELS[this.props.value];
  }

  public static create(value: string): Result<RegistrationStatus> {
    const normalized = (value ?? '').toUpperCase() as RegistrationStatusValue;
    if (!REGISTRATION_STATUSES.includes(normalized)) {
      return Result.fail(new Error('Situação de inscrição inválida'));
    }
    return Result.ok(new RegistrationStatus({ value: normalized }));
  }

  public static reconstitute(value: RegistrationStatusValue): RegistrationStatus {
    return new RegistrationStatus({ value });
  }

  public isConfirmed(): boolean {
    return this.props.value === 'CONFIRMADA';
  }

  public isCancelled(): boolean {
    return this.props.value === 'CANCELADA';
  }

  public isWaitlisted(): boolean {
    return this.props.value === 'LISTA_ESPERA';
  }

  public isAwaitingPayment(): boolean {
    return this.props.value === 'AGUARDANDO_PAGAMENTO';
  }

  public occupiesSeat(): boolean {
    return this.props.value === 'CONFIRMADA';
  }

  public allowsCheckIn(): boolean {
    return this.props.value === 'CONFIRMADA';
  }

  public isOpen(): boolean {
    return ['PENDENTE', 'AGUARDANDO_PAGAMENTO', 'CONFIRMADA', 'LISTA_ESPERA'].includes(this.props.value);
  }
}

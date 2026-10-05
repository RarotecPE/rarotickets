import { ValueObject } from '@core/domain/value-object.base';
import { Result } from '@core/domain/result';

export type PaymentStatusValue =
  | 'PENDENTE'
  | 'AGUARDANDO'
  | 'PAGO'
  | 'RECUSADO'
  | 'CANCELADO'
  | 'EXPIRADO'
  | 'ESTORNADO';

export const PAYMENT_STATUS_LABELS: Record<PaymentStatusValue, string> = {
  PENDENTE: 'Pendente',
  AGUARDANDO: 'Aguardando pagamento',
  PAGO: 'Pago',
  RECUSADO: 'Recusado',
  CANCELADO: 'Cancelado',
  EXPIRADO: 'Expirado',
  ESTORNADO: 'Estornado',
};

/** Status internos e transições permitidas (§16). */
const TRANSITIONS: Record<PaymentStatusValue, PaymentStatusValue[]> = {
  PENDENTE: ['AGUARDANDO', 'PAGO', 'RECUSADO', 'CANCELADO', 'EXPIRADO'],
  AGUARDANDO: ['PAGO', 'RECUSADO', 'CANCELADO', 'EXPIRADO'],
  PAGO: ['ESTORNADO'],
  RECUSADO: ['AGUARDANDO', 'CANCELADO'],
  EXPIRADO: ['AGUARDANDO'],
  CANCELADO: [],
  ESTORNADO: [],
};

export type PaymentStatusProps = { value: PaymentStatusValue };

export class PaymentStatus extends ValueObject<PaymentStatusProps> {
  private constructor(value: PaymentStatusValue) {
    super({ value });
  }

  public static create(value: string): Result<PaymentStatus> {
    const normalized = value.trim().toUpperCase();
    if (!(normalized in PAYMENT_STATUS_LABELS)) {
      return Result.fail(new Error(`Status de pagamento inválido: ${value}`));
    }
    return Result.ok(new PaymentStatus(normalized as PaymentStatusValue));
  }

  public static reconstitute(value: PaymentStatusValue): PaymentStatus {
    return new PaymentStatus(value);
  }

  public get value(): PaymentStatusValue {
    return this.props.value;
  }

  public get label(): string {
    return PAYMENT_STATUS_LABELS[this.value];
  }

  public isPending(): boolean {
    return this.value === 'PENDENTE';
  }

  public isAwaiting(): boolean {
    return this.value === 'AGUARDANDO';
  }

  public isPaid(): boolean {
    return this.value === 'PAGO';
  }

  public isRefused(): boolean {
    return this.value === 'RECUSADO';
  }

  public isCancelled(): boolean {
    return this.value === 'CANCELADO';
  }

  public isExpired(): boolean {
    return this.value === 'EXPIRADO';
  }

  public isRefunded(): boolean {
    return this.value === 'ESTORNADO';
  }

  /** Cobrança ainda em aberto — pode receber notificação do provedor. */
  public isOpen(): boolean {
    return this.isPending() || this.isAwaiting();
  }

  public isFinal(): boolean {
    return this.isPaid() || this.isCancelled() || this.isRefunded() || this.isExpired();
  }

  public canTransitionTo(next: PaymentStatus): boolean {
    if (next.value === this.value) return false;
    return TRANSITIONS[this.value].includes(next.value);
  }
}

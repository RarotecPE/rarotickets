import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';
import type { EventType } from './event-type.vo';

export type PaymentSettingsProps = {
  seatReservationMinutes: number;
  maxInstallments: number;
  allowPix: boolean;
  allowBoleto: boolean;
  allowCreditCard: boolean;
  minInstallmentCents: number;
};

export type CreatePaymentSettingsParams = PaymentSettingsProps;

export const MIN_RESERVATION_MINUTES = 5;
export const MAX_RESERVATION_MINUTES = 1440;

/** Configurações de pagamento e reserva temporária de vaga (§4 e §17). */
export class PaymentSettings extends ValueObject<PaymentSettingsProps> {
  private constructor(props: PaymentSettingsProps) {
    super(props);
  }

  get seatReservationMinutes(): number { return this.props.seatReservationMinutes; }
  get maxInstallments(): number { return this.props.maxInstallments; }
  get allowPix(): boolean { return this.props.allowPix; }
  get allowBoleto(): boolean { return this.props.allowBoleto; }
  get allowCreditCard(): boolean { return this.props.allowCreditCard; }
  get minInstallmentCents(): number { return this.props.minInstallmentCents; }

  public static create(params: CreatePaymentSettingsParams, eventType: EventType): Result<PaymentSettings> {
    if (params.seatReservationMinutes < MIN_RESERVATION_MINUTES || params.seatReservationMinutes > MAX_RESERVATION_MINUTES) {
      return Result.fail(new Error(
        `Tempo de reserva de vaga deve estar entre ${MIN_RESERVATION_MINUTES} e ${MAX_RESERVATION_MINUTES} minutos`,
      ));
    }
    if (params.maxInstallments < 1 || params.maxInstallments > 12) {
      return Result.fail(new Error('Quantidade máxima de parcelas deve estar entre 1 e 12'));
    }
    if (params.minInstallmentCents < 0) {
      return Result.fail(new Error('Valor mínimo da parcela inválido'));
    }
    if (eventType.isPaid() && !params.allowPix && !params.allowBoleto && !params.allowCreditCard) {
      return Result.fail(new Error('Evento pago deve aceitar pelo menos uma forma de pagamento'));
    }
    return Result.ok(new PaymentSettings({ ...params }));
  }

  public static reconstitute(props: PaymentSettingsProps): PaymentSettings {
    return new PaymentSettings(props);
  }

  public allowsMethod(method: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'CORTESIA'): boolean {
    switch (method) {
      case 'PIX': return this.props.allowPix;
      case 'BOLETO': return this.props.allowBoleto;
      case 'CREDIT_CARD': return this.props.allowCreditCard;
      case 'CORTESIA': return true;
      default: return false;
    }
  }
}

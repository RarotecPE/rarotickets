import { ValueObject } from '@core/domain/value-object.base';

export type PaymentTransactionProps = {
  providerName: string | null;
  providerChargeId: string | null;
  providerStatus: string | null;
  qrCode: string | null;
  qrCodeImageUrl: string | null;
  qrCodeExpiresAt: Date | null;
  boletoLine: string | null;
  boletoUrl: string | null;
  boletoDueDate: Date | null;
  cardBrand: string | null;
  cardLast4: string | null;
  authorizationCode: string | null;
};

export type CreatePaymentTransactionParams = Partial<PaymentTransactionProps>;

const EMPTY: PaymentTransactionProps = {
  providerName: null,
  providerChargeId: null,
  providerStatus: null,
  qrCode: null,
  qrCodeImageUrl: null,
  qrCodeExpiresAt: null,
  boletoLine: null,
  boletoUrl: null,
  boletoDueDate: null,
  cardBrand: null,
  cardLast4: null,
  authorizationCode: null,
};

/**
 * Dados de cobrança devolvidos pelo provedor. Nunca armazena PAN nem CVV —
 * apenas dados públicos (QR, linha digitável, bandeira e 4 últimos dígitos).
 */
export class PaymentTransaction extends ValueObject<PaymentTransactionProps> {
  private constructor(props: PaymentTransactionProps) {
    super(props);
  }

  public static create(params: CreatePaymentTransactionParams = {}): PaymentTransaction {
    return new PaymentTransaction({ ...EMPTY, ...params });
  }

  public static empty(): PaymentTransaction {
    return new PaymentTransaction({ ...EMPTY });
  }

  public withPaymentData(params: CreatePaymentTransactionParams): PaymentTransaction {
    return new PaymentTransaction({ ...this.props, ...params });
  }

  public withProvider(providerName: string, providerChargeId: string, providerStatus: string): PaymentTransaction {
    return this.withPaymentData({ providerName, providerChargeId, providerStatus });
  }

  public merge(params: CreatePaymentTransactionParams): PaymentTransaction {
    return this.withPaymentData(params);
  }

  public get providerName(): string | null {
    return this.props.providerName;
  }

  public get providerChargeId(): string | null {
    return this.props.providerChargeId;
  }

  public get providerStatus(): string | null {
    return this.props.providerStatus;
  }

  public get qrCode(): string | null {
    return this.props.qrCode;
  }

  public get qrCodeImageUrl(): string | null {
    return this.props.qrCodeImageUrl;
  }

  public get qrCodeExpiresAt(): Date | null {
    return this.props.qrCodeExpiresAt;
  }

  public get boletoLine(): string | null {
    return this.props.boletoLine;
  }

  public get boletoUrl(): string | null {
    return this.props.boletoUrl;
  }

  public get boletoDueDate(): Date | null {
    return this.props.boletoDueDate;
  }

  public get cardBrand(): string | null {
    return this.props.cardBrand;
  }

  public get cardLast4(): string | null {
    return this.props.cardLast4;
  }

  public get authorizationCode(): string | null {
    return this.props.authorizationCode;
  }

  public hasPixData(): boolean {
    return Boolean(this.props.qrCode || this.props.qrCodeImageUrl);
  }

  public hasBoletoData(): boolean {
    return Boolean(this.props.boletoLine || this.props.boletoUrl);
  }

  /** Descrição segura do cartão usada em logs/notificações (sem dados sensíveis). */
  public get cardSummary(): string | null {
    if (!this.props.cardBrand) return null;
    return this.props.cardLast4 ? `${this.props.cardBrand} •••• ${this.props.cardLast4}` : this.props.cardBrand;
  }

  public toJSON(): PaymentTransactionProps {
    return { ...this.props };
  }
}

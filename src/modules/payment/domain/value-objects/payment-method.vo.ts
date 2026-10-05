import { ValueObject } from '@core/domain/value-object.base';
import { Result } from '@core/domain/result';
import type { ProviderPaymentMethod } from '@core/contracts/payment-provider.contract';

export type PaymentMethodValue = 'PIX' | 'CARTAO_CREDITO' | 'CARTAO' | 'CREDIT_CARD' | 'BOLETO' | 'CORTESIA';

export type PaymentMethodProps = { value: 'PIX' | 'CARTAO_CREDITO' | 'BOLETO' | 'CORTESIA' };

export const PAYMENT_METHOD_LABELS: Record<PaymentMethodProps['value'], string> = {
  PIX: 'PIX',
  CARTAO_CREDITO: 'Cartão de crédito',
  BOLETO: 'Boleto bancário',
  CORTESIA: 'Cortesia',
};

const ALIASES: Record<string, PaymentMethodProps['value']> = {
  PIX: 'PIX',
  CREDIT_CARD: 'CARTAO_CREDITO',
  CARTAO: 'CARTAO_CREDITO',
  CARTAO_CREDITO: 'CARTAO_CREDITO',
  BOLETO: 'BOLETO',
  CORTESIA: 'CORTESIA',
};

/**
 * Meio de pagamento aceito (§13). Cartão nunca armazena PAN/CVV — apenas o
 * retorno tokenizado do provedor.
 */
export class PaymentMethod extends ValueObject<PaymentMethodProps> {
  private constructor(value: PaymentMethodProps['value']) {
    super({ value });
  }

  public static create(value: string): Result<PaymentMethod> {
    const normalized = value.trim().toUpperCase().replace(/[\s-]+/g, '_');
    const resolved = ALIASES[normalized];
    if (!resolved) return Result.fail(new Error(`Forma de pagamento inválida: ${value}`));
    return Result.ok(new PaymentMethod(resolved));
  }

  public static reconstitute(value: string): PaymentMethod {
    const resolved = ALIASES[value.trim().toUpperCase()];
    if (!resolved) throw new Error(`Forma de pagamento inválida na base: ${value}`);
    return new PaymentMethod(resolved);
  }

  public get value(): PaymentMethodProps['value'] {
    return this.props.value;
  }

  public get label(): string {
    return PAYMENT_METHOD_LABELS[this.value];
  }

  public isPix(): boolean {
    return this.value === 'PIX';
  }

  public isBoleto(): boolean {
    return this.value === 'BOLETO';
  }

  public isCreditCard(): boolean {
    return this.value === 'CARTAO_CREDITO';
  }

  public isCourtesy(): boolean {
    return this.value === 'CORTESIA';
  }

  /** Equivalente ao meio no vocabulário do provedor. */
  public get providerMethod(): ProviderPaymentMethod {
    return this.isCreditCard() ? 'CREDIT_CARD' : (this.value as ProviderPaymentMethod);
  }
}

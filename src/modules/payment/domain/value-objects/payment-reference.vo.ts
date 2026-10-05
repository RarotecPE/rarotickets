import { ValueObject } from '@core/domain/value-object.base';
import { Result } from '@core/domain/result';

export type PaymentReferenceProps = { value: string };

export type CreatePaymentReferenceParams = { eventNumber: number; registrationNumber: number };

const PATTERN = /^EVENTO-(\d+)-INSCRICAO-(\d+)$/;

/**
 * Referência interna da cobrança (§16) — `EVENTO-120-INSCRICAO-4589`.
 * Nunca sequencial: os números derivam dos identificadores internos, evitando
 * expor a ordem real de criação.
 */
export class PaymentReference extends ValueObject<PaymentReferenceProps> {
  private constructor(value: string) {
    super({ value });
  }

  public static create(params: CreatePaymentReferenceParams): Result<PaymentReference> {
    if (!Number.isInteger(params.eventNumber) || params.eventNumber <= 0) {
      return Result.fail(new Error('Número do evento deve ser um inteiro positivo'));
    }
    if (!Number.isInteger(params.registrationNumber) || params.registrationNumber <= 0) {
      return Result.fail(new Error('Número da inscrição deve ser um inteiro positivo'));
    }
    return Result.ok(new PaymentReference(`EVENTO-${params.eventNumber}-INSCRICAO-${params.registrationNumber}`));
  }

  public static reconstitute(value: string): PaymentReference {
    const normalized = value.trim().toUpperCase();
    if (!PATTERN.test(normalized)) throw new Error(`Referência de pagamento inválida: ${value}`);
    return new PaymentReference(normalized);
  }

  public get value(): string {
    return this.props.value;
  }

  public get eventNumber(): number {
    return Number(PATTERN.exec(this.props.value)?.[1] ?? 0);
  }

  public get registrationNumber(): number {
    return Number(PATTERN.exec(this.props.value)?.[2] ?? 0);
  }

  public override toString(): string {
    return this.props.value;
  }
}

import { ValueObject } from '@core/domain/value-object.base';
import { Result } from '@core/domain/result';

export type InstallmentPlanProps = { installments: number; installmentCents: number; totalCents: number };

export type CreateInstallmentPlanParams = {
  totalCents: number;
  installments: number;
  maxInstallments: number;
  minInstallmentCents: number;
};

/** Plano de parcelamento do cartão (§13) — valida mínimo por parcela e limite do evento. */
export class InstallmentPlan extends ValueObject<InstallmentPlanProps> {
  private constructor(props: InstallmentPlanProps) {
    super(props);
  }

  public static create(params: CreateInstallmentPlanParams): Result<InstallmentPlan> {
    if (params.totalCents <= 0) return Result.fail(new Error('Valor da cobrança deve ser positivo'));
    if (!Number.isInteger(params.installments) || params.installments < 1) {
      return Result.fail(new Error('Número de parcelas deve ser ao menos 1'));
    }
    if (params.installments > params.maxInstallments) {
      return Result.fail(new Error(`O evento permite no máximo ${params.maxInstallments} parcelas`));
    }
    const installmentCents = Math.floor(params.totalCents / params.installments);
    if (params.installments > 1 && installmentCents < params.minInstallmentCents) {
      return Result.fail(new Error(`Cada parcela deve ter no mínimo ${params.minInstallmentCents} centavos`));
    }
    return Result.ok(
      new InstallmentPlan({ installments: params.installments, installmentCents, totalCents: params.totalCents }),
    );
  }

  public static reconstitute(props: InstallmentPlanProps): InstallmentPlan {
    return new InstallmentPlan(props);
  }

  /** Quantidades de parcelas válidas para o valor (1x até o limite do evento). */
  public static options(params: { totalCents: number; maxInstallments: number; minInstallmentCents: number }): number[] {
    const options: number[] = [];
    for (let count = 1; count <= params.maxInstallments; count += 1) {
      if (count === 1 || Math.floor(params.totalCents / count) >= params.minInstallmentCents) options.push(count);
    }
    return options;
  }

  public get installments(): number {
    return this.props.installments;
  }

  public get installmentCents(): number {
    return this.props.installmentCents;
  }

  public get totalCents(): number {
    return this.props.totalCents;
  }

  public get isSingle(): boolean {
    return this.props.installments === 1;
  }
}

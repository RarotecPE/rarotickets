import { ValueObject } from '../value-object.base.ts';
import { Result } from '../result.ts';
import { ValidationError } from '../errors/domain-errors.ts';

export type MoneyCurrency = 'BRL';
export type MoneyProps = { amountInMinorUnits: number; currency: MoneyCurrency };
export type CreateMoneyParams = { amountInMinorUnits: number; currency?: MoneyCurrency };

/** Monetary values are stored as integer cents to avoid floating-point drift. */
export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  public get amountInMinorUnits(): number {
    return this.props.amountInMinorUnits;
  }

  public get currency(): MoneyCurrency {
    return this.props.currency;
  }

  public static create(params: CreateMoneyParams): Result<Money, ValidationError> {
    if (!Number.isSafeInteger(params.amountInMinorUnits) || params.amountInMinorUnits < 0) {
      return Result.fail(new ValidationError({ code: 'MONEY_INVALID', message: 'O valor monetário deve ser um número inteiro de centavos não negativo.' }));
    }
    return Result.ok(new Money({ amountInMinorUnits: params.amountInMinorUnits, currency: params.currency ?? 'BRL' }));
  }

  public static reconstitute(params: CreateMoneyParams): Money {
    return new Money({ amountInMinorUnits: params.amountInMinorUnits, currency: params.currency ?? 'BRL' });
  }
}

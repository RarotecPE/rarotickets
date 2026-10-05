import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';
import type { Cents, CurrencyCode } from '@core/types/primitives';

export type MoneyProps = { cents: Cents; currency: CurrencyCode };
export type MoneyCreateParams = { cents: number; currency?: CurrencyCode };
export type Money = ValueObject<MoneyProps>;

const BRL_SYMBOL = 'R$';

/**
 * Dinheiro sempre em centavos (inteiro) para evitar erro de ponto flutuante.
 * Value Object de núcleo: reutilizado por eventos, inscrições e pagamentos.
 */
export class MoneyVO extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  get cents(): Cents {
    return this.props.cents;
  }

  get currency(): CurrencyCode {
    return this.props.currency;
  }

  public static create(params: MoneyCreateParams): Result<MoneyVO> {
    if (!Number.isInteger(params.cents)) {
      return Result.fail(new Error('Valor monetário deve ser informado em centavos (inteiro)'));
    }
    if (params.cents < 0) {
      return Result.fail(new Error('Valor monetário não pode ser negativo'));
    }
    if (params.cents > 100_000_000_00) {
      return Result.fail(new Error('Valor monetário acima do limite permitido'));
    }
    return Result.ok(new MoneyVO({ cents: params.cents, currency: params.currency ?? 'BRL' }));
  }

  public static zero(currency: CurrencyCode = 'BRL'): MoneyVO {
    return new MoneyVO({ cents: 0, currency });
  }

  /** Uso restrito a dados já validados na persistência. */
  public static reconstitute(params: MoneyCreateParams): MoneyVO {
    return new MoneyVO({ cents: params.cents, currency: params.currency ?? 'BRL' });
  }

  public add(other: MoneyVO): Result<MoneyVO> {
    if (other.currency !== this.currency) {
      return Result.fail(new Error('Não é possível somar valores de moedas diferentes'));
    }
    return MoneyVO.create({ cents: this.cents + other.cents, currency: this.currency });
  }

  public subtract(other: MoneyVO): Result<MoneyVO> {
    if (other.currency !== this.currency) {
      return Result.fail(new Error('Não é possível subtrair valores de moedas diferentes'));
    }
    if (other.cents > this.cents) {
      return Result.fail(new Error('A subtração resultaria em valor negativo'));
    }
    return MoneyVO.create({ cents: this.cents - other.cents, currency: this.currency });
  }

  /** Subtrai limitando o resultado a zero — usado para descontos de cupom. */
  public subtractClampedToZero(other: MoneyVO): MoneyVO {
    if (other.cents >= this.cents) return MoneyVO.zero(this.currency);
    return MoneyVO.reconstitute({ cents: this.cents - other.cents, currency: this.currency });
  }

  public multiply(factor: number): Result<MoneyVO> {
    if (factor < 0) return Result.fail(new Error('Fator de multiplicação inválido'));
    return MoneyVO.create({ cents: Math.round(this.cents * factor), currency: this.currency });
  }

  /** Percentual com arredondamento comercial (usado por cupons percentuais). */
  public percentage(percent: number): Result<MoneyVO> {
    if (percent < 0 || percent > 100) {
      return Result.fail(new Error('Percentual deve estar entre 0 e 100'));
    }
    return MoneyVO.create({ cents: Math.round((this.cents * percent) / 100), currency: this.currency });
  }

  public isZero(): boolean {
    return this.cents === 0;
  }

  public isGreaterThan(other: MoneyVO): boolean {
    return this.cents > other.cents;
  }

  public isLessThan(other: MoneyVO): boolean {
    return this.cents < other.cents;
  }

  public format(): string {
    const negative = this.cents < 0;
    const absolute = Math.abs(this.cents);
    const integerPart = Math.floor(absolute / 100).toString();
    const decimalPart = (absolute % 100).toString().padStart(2, '0');
    const grouped = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${negative ? '-' : ''}${BRL_SYMBOL} ${grouped},${decimalPart}`;
  }
}

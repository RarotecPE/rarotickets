import { ValueObject } from "@/@core/domain/value-object.base";
import { Result } from "@/@core/domain/result";
import { DomainError } from "@/@core/domain/errors/domain-error.base";

export type MoneyInCents = number;
export type MoneyProps = { cents: MoneyInCents };
export type InvalidMoneyErrorParams = { cents: MoneyInCents };

export class InvalidMoneyError extends DomainError {
  constructor(params: InvalidMoneyErrorParams) {
    super({ code: "INVALID_MONEY", message: `Valor monetário inválido: ${params.cents}` });
  }
}

export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  get cents(): number {
    return this.props.cents;
  }

  static create(cents: MoneyInCents): Result<Money, InvalidMoneyError> {
    if (!Number.isSafeInteger(cents) || cents < 0) return Result.fail(new InvalidMoneyError({ cents }));
    return Result.ok(new Money({ cents }));
  }

  static fromReais(value: number): Result<Money, InvalidMoneyError> {
    if (!Number.isFinite(value)) return Result.fail(new InvalidMoneyError({ cents: Number.NaN }));
    return Money.create(Math.round(value * 100));
  }

  static reconstitute(cents: MoneyInCents): Money {
    return new Money({ cents });
  }
}

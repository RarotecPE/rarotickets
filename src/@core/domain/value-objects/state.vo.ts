import { Result } from '@core/domain/result';
import { normalizeCode } from '@core/domain/text.util';
import { ValueObject } from '@core/domain/value-object.base';

export type StateProps = { value: string };

export const BRAZILIAN_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const;

export type BrazilianState = (typeof BRAZILIAN_STATES)[number];

export class State extends ValueObject<StateProps> {
  private constructor(props: StateProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): Result<State> {
    const normalized = normalizeCode(value ?? '');
    if (!normalized) return Result.fail(new Error('Estado (UF) é obrigatório'));
    if (!BRAZILIAN_STATES.includes(normalized as BrazilianState)) {
      return Result.fail(new Error('Estado (UF) inválido'));
    }
    return Result.ok(new State({ value: normalized }));
  }

  public static reconstitute(value: string): State {
    return new State({ value });
  }
}

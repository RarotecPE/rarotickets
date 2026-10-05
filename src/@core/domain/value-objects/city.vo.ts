import { Result } from '@core/domain/result';
import { normalizeSpaces } from '@core/domain/text.util';
import { ValueObject } from '@core/domain/value-object.base';

export type CityProps = { value: string };

export class City extends ValueObject<CityProps> {
  private constructor(props: CityProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): Result<City> {
    const normalized = normalizeSpaces(value ?? '');
    if (normalized.length < 2) return Result.fail(new Error('Município deve ter ao menos 2 caracteres'));
    if (normalized.length > 100) return Result.fail(new Error('Município deve ter no máximo 100 caracteres'));
    if (!/^[\p{L}\p{M}'\-. ]+$/u.test(normalized)) return Result.fail(new Error('Município contém caracteres inválidos'));
    return Result.ok(new City({ value: normalized }));
  }

  public static reconstitute(value: string): City {
    return new City({ value });
  }
}

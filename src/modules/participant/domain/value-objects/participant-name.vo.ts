import { Result } from '@core/domain/result';
import { normalizeSpaces } from '@core/domain/text.util';
import { ValueObject } from '@core/domain/value-object.base';

export type ParticipantNameProps = { value: string };

export class ParticipantName extends ValueObject<ParticipantNameProps> {
  private constructor(props: ParticipantNameProps) {
    super(props);
  }

  get value(): string {
    return this.props.value;
  }

  public static create(value: string): Result<ParticipantName> {
    const normalized = normalizeSpaces(value ?? '');
    if (normalized.length < 3) return Result.fail(new Error('Nome do participante deve ter ao menos 3 caracteres'));
    if (normalized.length > 150) return Result.fail(new Error('Nome do participante deve ter no máximo 150 caracteres'));
    if (!/^[\p{L}\p{M}'\-. ]+$/u.test(normalized)) {
      return Result.fail(new Error('Nome do participante contém caracteres inválidos'));
    }
    return Result.ok(new ParticipantName({ value: normalized }));
  }

  public static reconstitute(value: string): ParticipantName {
    return new ParticipantName({ value });
  }
}

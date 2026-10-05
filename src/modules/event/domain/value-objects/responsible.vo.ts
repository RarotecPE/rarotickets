import { Result } from '@core/domain/result';
import { normalizeEmail, normalizeSpaces } from '@core/domain/text.util';
import { ValueObject } from '@core/domain/value-object.base';

export type ResponsibleProps = { name: string; email: string | null };

/** Responsável pelo evento (§2). */
export class Responsible extends ValueObject<ResponsibleProps> {
  private constructor(props: ResponsibleProps) {
    super(props);
  }

  get name(): string { return this.props.name; }
  get email(): string | null { return this.props.email; }

  public static create(params: { name: string; email?: string | null }): Result<Responsible> {
    const name = normalizeSpaces(params.name ?? '');
    if (name.length < 3) return Result.fail(new Error('Responsável pelo evento é obrigatório'));

    const email = params.email ? normalizeEmail(params.email) : null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return Result.fail(new Error('E-mail do responsável inválido'));
    }
    return Result.ok(new Responsible({ name, email }));
  }

  public static reconstitute(props: ResponsibleProps): Responsible {
    return new Responsible(props);
  }
}

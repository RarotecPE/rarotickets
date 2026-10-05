import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type ConsentTypeValue = 'TERMOS_DE_USO' | 'POLITICA_DE_PRIVACIDADE' | 'COMUNICACAO_MARKETING';
export type ConsentTypeProps = { value: ConsentTypeValue };

export const CONSENT_TYPES: readonly ConsentTypeValue[] = [
  'TERMOS_DE_USO',
  'POLITICA_DE_PRIVACIDADE',
  'COMUNICACAO_MARKETING',
];

export const CONSENT_LABELS: Record<ConsentTypeValue, string> = {
  TERMOS_DE_USO: 'Termos de uso',
  POLITICA_DE_PRIVACIDADE: 'Política de privacidade',
  COMUNICACAO_MARKETING: 'Comunicação de marketing',
};

export class ConsentType extends ValueObject<ConsentTypeProps> {
  private constructor(props: ConsentTypeProps) {
    super(props);
  }

  get value(): ConsentTypeValue {
    return this.props.value;
  }

  public static create(value: string): Result<ConsentType> {
    const normalized = (value ?? '').toUpperCase() as ConsentTypeValue;
    if (!CONSENT_TYPES.includes(normalized)) {
      return Result.fail(new Error('Tipo de consentimento inválido'));
    }
    return Result.ok(new ConsentType({ value: normalized }));
  }

  public static reconstitute(value: ConsentTypeValue): ConsentType {
    return new ConsentType({ value });
  }

  /** O aceite de marketing nunca é obrigatório para se inscrever (§37). */
  public isMandatoryForRegistration(): boolean {
    return this.props.value !== 'COMUNICACAO_MARKETING';
  }
}

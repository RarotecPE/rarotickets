import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';
import { validateAnswerValue } from '@core/domain/validators/answer.validator';
import type { AnswerFieldType } from '@core/domain/validators/answer.validator';

export type FormFieldTypeValue =
  | 'TEXTO' | 'TEXTO_LONGO' | 'NUMERO' | 'DATA' | 'EMAIL' | 'TELEFONE'
  | 'CPF' | 'CNPJ' | 'SELECAO' | 'ESCOLHA_UNICA' | 'MULTIPLA_ESCOLHA'
  | 'SIM_NAO' | 'ARQUIVO';
export type FormFieldTypeProps = { value: FormFieldTypeValue };

export const FORM_FIELD_TYPES: readonly FormFieldTypeValue[] = [
  'TEXTO', 'TEXTO_LONGO', 'NUMERO', 'DATA', 'EMAIL', 'TELEFONE',
  'CPF', 'CNPJ', 'SELECAO', 'ESCOLHA_UNICA', 'MULTIPLA_ESCOLHA',
  'SIM_NAO', 'ARQUIVO',
];

export const FORM_FIELD_TYPE_LABELS: Record<FormFieldTypeValue, string> = {
  TEXTO: 'Texto',
  TEXTO_LONGO: 'Texto longo',
  NUMERO: 'Número',
  DATA: 'Data',
  EMAIL: 'E-mail',
  TELEFONE: 'Telefone',
  CPF: 'CPF',
  CNPJ: 'CNPJ',
  SELECAO: 'Seleção',
  ESCOLHA_UNICA: 'Escolha única',
  MULTIPLA_ESCOLHA: 'Múltipla escolha',
  SIM_NAO: 'Sim/Não',
  ARQUIVO: 'Arquivo',
};

/** Tipos que exigem lista de opções configurada. */
const OPTION_BASED_TYPES: readonly FormFieldTypeValue[] = ['SELECAO', 'ESCOLHA_UNICA', 'MULTIPLA_ESCOLHA'];

export class FormFieldType extends ValueObject<FormFieldTypeProps> {
  private constructor(props: FormFieldTypeProps) {
    super(props);
  }

  get value(): FormFieldTypeValue {
    return this.props.value;
  }

  get label(): string {
    return FORM_FIELD_TYPE_LABELS[this.props.value];
  }

  public static create(value: string): Result<FormFieldType> {
    const normalized = (value ?? '').toUpperCase() as FormFieldTypeValue;
    if (!FORM_FIELD_TYPES.includes(normalized)) return Result.fail(new Error('Tipo de campo inválido'));
    return Result.ok(new FormFieldType({ value: normalized }));
  }

  public static reconstitute(value: FormFieldTypeValue): FormFieldType {
    return new FormFieldType({ value });
  }

  public requiresOptions(): boolean {
    return OPTION_BASED_TYPES.includes(this.props.value);
  }

  public acceptsMultipleValues(): boolean {
    return this.props.value === 'MULTIPLA_ESCOLHA';
  }

  /** Valida o valor informado pelo participante conforme o tipo do campo. */
  public validateValue(rawValue: string | null, options: string[]): { isValid: boolean; message?: string } {
    const result = validateAnswerValue({
      label: 'campo',
      fieldType: this.props.value as AnswerFieldType,
      options,
      isRequired: false,
      value: rawValue,
    });
    return result.isSuccess ? { isValid: true } : { isValid: false, message: result.error.message.replace('O campo "campo" ', '') };
  }
}

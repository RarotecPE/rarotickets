import { Result } from '@core/domain/result';
import { ValueObject } from '@core/domain/value-object.base';

export type FormAnswerProps = {
  fieldId: string | null;
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  value: string | null;
};
export type CreateFormAnswerParams = {
  fieldId: string | null;
  fieldKey: string;
  fieldLabel: string;
  fieldType: string;
  value: string | null;
};

/**
 * Resposta vinculada à inscrição com snapshot do formulário no momento do
 * envio — alterações futuras no formulário não invalidam o histórico (§9).
 */
export class FormAnswer extends ValueObject<FormAnswerProps> {
  private constructor(props: FormAnswerProps) {
    super(props);
  }

  get fieldId(): string | null { return this.props.fieldId; }
  get fieldKey(): string { return this.props.fieldKey; }
  get fieldLabel(): string { return this.props.fieldLabel; }
  get fieldType(): string { return this.props.fieldType; }
  get value(): string | null { return this.props.value; }

  public static create(params: CreateFormAnswerParams): Result<FormAnswer> {
    if (!params.fieldKey) return Result.fail(new Error('Resposta sem campo de formulário associado'));
    if (!params.fieldLabel) return Result.fail(new Error('Resposta sem rótulo do campo'));
    if (params.value !== null && params.value.length > 5000) {
      return Result.fail(new Error(`Resposta do campo "${params.fieldLabel}" excede o tamanho máximo`));
    }
    return Result.ok(new FormAnswer({
      fieldId: params.fieldId,
      fieldKey: params.fieldKey,
      fieldLabel: params.fieldLabel,
      fieldType: params.fieldType,
      value: params.value,
    }));
  }

  public static reconstitute(props: FormAnswerProps): FormAnswer {
    return new FormAnswer(props);
  }

  /** Converte o valor em texto para exibição em relatórios (MULTIPLA_ESCOLHA usa "|"). */
  public toDisplayValue(): string {
    if (!this.props.value) return '';
    if (this.props.fieldType === 'MULTIPLA_ESCOLHA') {
      return this.props.value.split('|').join(', ');
    }
    if (this.props.fieldType === 'SIM_NAO') {
      return this.props.value.toUpperCase() === 'SIM' ? 'Sim' : 'Não';
    }
    return this.props.value;
  }
}

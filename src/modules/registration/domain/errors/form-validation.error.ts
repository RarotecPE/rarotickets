import { ValidationError } from '@core/domain/errors/validation.error';

export type FormValidationErrorParams = { message: string; fieldKey?: string };

export class FormValidationError extends ValidationError {
  public readonly fieldKey: string | null;

  constructor(params: FormValidationErrorParams) {
    super({ message: params.message, code: 'FORM_VALIDATION_ERROR' });
    this.fieldKey = params.fieldKey ?? null;
  }
}

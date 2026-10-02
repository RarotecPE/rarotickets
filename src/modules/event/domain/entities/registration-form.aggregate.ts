import { AggregateRoot } from '../../../../@core/domain/aggregate-root.base.ts';
import type { EntityConstructorParams } from '../../../../@core/domain/entity.base.ts';
import { Identifier } from '../../../../@core/domain/identifier.ts';
import { Cnpj } from '../../../../@core/domain/value-objects/cnpj.vo.ts';
import { Cpf } from '../../../../@core/domain/value-objects/cpf.vo.ts';
import { Email } from '../../../../@core/domain/value-objects/email.vo.ts';
import { Result } from '../../../../@core/domain/result.ts';
import { DomainError } from '../../../../@core/domain/domain-error.base.ts';
import { ValidationError } from '../../../../@core/domain/errors/domain-errors.ts';

export type RegistrationFieldType =
  | 'TEXT'
  | 'LONG_TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'EMAIL'
  | 'PHONE'
  | 'CPF'
  | 'CNPJ'
  | 'SELECT'
  | 'SINGLE_CHOICE'
  | 'MULTIPLE_CHOICE'
  | 'YES_NO'
  | 'FILE';

export type FormField = {
  id: string;
  name: string;
  description: string | null;
  type: RegistrationFieldType;
  required: boolean;
  order: number;
  options: string[];
  isActive: boolean;
};
export type FormFileAnswer = {
  fileId: string;
  fileName: string;
  mediaType: string;
  sizeBytes: number;
};
export type FormAnswer = string | number | boolean | string[] | FormFileAnswer;
export type FormAnswers = Record<string, FormAnswer | null>;
export type FormFieldIssue = { fieldId: string; fieldName: string; message: string };
export type FormValidationErrorParams = { issues: FormFieldIssue[] };
export type RegistrationFormProps = { eventId: string; version: number; fields: FormField[] };
export type CreateRegistrationFormParams = { eventId: string; fields: FormField[]; id?: string; now?: Date };
export type ReplaceRegistrationFormFieldsParams = { fields: FormField[]; now: Date };
export type RegistrationFormSnapshot = RegistrationFormProps & { formId: string };

export class FormValidationError extends DomainError {
  public readonly issues: FormFieldIssue[];

  constructor(params: FormValidationErrorParams) {
    super({ code: 'FORM_ANSWERS_INVALID', message: 'Uma ou mais respostas do formulário são inválidas.' });
    this.name = 'FormValidationError';
    this.issues = params.issues.map((issue) => ({ ...issue }));
  }
}

export class RegistrationForm extends AggregateRoot<RegistrationFormProps> {
  private constructor(params: EntityConstructorParams<RegistrationFormProps>) {
    super(params);
  }

  public static create(params: CreateRegistrationFormParams): Result<RegistrationForm, ValidationError> {
    const fieldError = this.validateFields(params.fields);
    if (!params.eventId.trim()) {
      return Result.fail(new ValidationError({ code: 'FORM_EVENT_REQUIRED', message: 'O formulário deve pertencer a um evento.' }));
    }
    if (fieldError) return Result.fail(fieldError);
    const entityParams: EntityConstructorParams<RegistrationFormProps> = {
      props: { eventId: params.eventId, version: 1, fields: this.copyFields(params.fields) },
      ...(params.now ? { createdAt: params.now, updatedAt: params.now } : {}),
    };
    if (params.id) entityParams.id = Identifier.fromExisting(params.id);
    return Result.ok(new RegistrationForm(entityParams));
  }

  public get eventId(): string { return this.props.eventId; }
  public get version(): number { return this.props.version; }
  public get fields(): FormField[] { return RegistrationForm.copyFields(this.props.fields); }

  public replaceFields(params: ReplaceRegistrationFormFieldsParams): Result<void, ValidationError> {
    const fieldError = RegistrationForm.validateFields(params.fields);
    if (fieldError) return Result.fail(fieldError);
    this.props.fields = RegistrationForm.copyFields(params.fields);
    this.props.version += 1;
    this.touch({ at: params.now });
    return Result.ok();
  }

  public snapshot(): RegistrationFormSnapshot {
    return {
      eventId: this.props.eventId,
      version: this.props.version,
      fields: RegistrationForm.copyFields(this.props.fields),
      formId: this.id.toString(),
    };
  }

  public validateAnswers(answers: FormAnswers): Result<FormAnswers, FormValidationError> {
    const issues = this.findAnswerIssues({ answers });
    if (issues.length > 0) return Result.fail(new FormValidationError({ issues }));
    return Result.ok(RegistrationForm.copyAnswers(answers));
  }

  private findAnswerIssues(params: { answers: FormAnswers }): FormFieldIssue[] {
    const activeFields = this.props.fields.filter((field) => field.isActive);
    const activeIds = new Set(activeFields.map((field) => field.id));
    const issues: FormFieldIssue[] = [];
    for (const answerId of Object.keys(params.answers)) {
      if (!activeIds.has(answerId)) issues.push({ fieldId: answerId, fieldName: answerId, message: 'O campo não está ativo neste formulário.' });
    }
    for (const field of activeFields) {
      const answer = params.answers[field.id];
      if (this.isMissingAnswer(answer)) {
        if (field.required) issues.push({ fieldId: field.id, fieldName: field.name, message: 'Este campo é obrigatório.' });
        continue;
      }
      const message = this.validateAnswer({ field, answer });
      if (message) issues.push({ fieldId: field.id, fieldName: field.name, message });
    }
    return issues;
  }

  private validateAnswer(params: { field: FormField; answer: FormAnswer | null | undefined }): string | null {
    const answer = params.answer;
    if (answer === null || answer === undefined) return null;
    if (params.field.type === 'TEXT' || params.field.type === 'LONG_TEXT' || params.field.type === 'PHONE') {
      return typeof answer === 'string' ? null : 'Informe um texto válido.';
    }
    if (params.field.type === 'NUMBER') return typeof answer === 'number' && Number.isFinite(answer) ? null : 'Informe um número válido.';
    if (params.field.type === 'DATE') return this.isValidDateAnswer(answer) ? null : 'Informe uma data válida no formato AAAA-MM-DD.';
    if (params.field.type === 'EMAIL') return this.validateEmailAnswer(answer);
    if (params.field.type === 'CPF') return this.validateCpfAnswer(answer);
    if (params.field.type === 'CNPJ') return this.validateCnpjAnswer(answer);
    if (params.field.type === 'SELECT' || params.field.type === 'SINGLE_CHOICE') return this.validateSingleChoice(params.field, answer);
    if (params.field.type === 'MULTIPLE_CHOICE') return this.validateMultipleChoice(params.field, answer);
    if (params.field.type === 'YES_NO') return typeof answer === 'boolean' ? null : 'Informe Sim ou Não.';
    return this.validateFileAnswer(answer);
  }

  private validateEmailAnswer(answer: FormAnswer): string | null {
    if (typeof answer !== 'string') return 'Informe um e-mail válido.';
    return Email.create(answer).isSuccess ? null : 'Informe um e-mail válido.';
  }

  private validateCpfAnswer(answer: FormAnswer): string | null {
    if (typeof answer !== 'string') return 'Informe um CPF válido.';
    return Cpf.create(answer).isSuccess ? null : 'Informe um CPF válido.';
  }

  private validateCnpjAnswer(answer: FormAnswer): string | null {
    if (typeof answer !== 'string') return 'Informe um CNPJ válido.';
    return Cnpj.create(answer).isSuccess ? null : 'Informe um CNPJ válido.';
  }

  private validateSingleChoice(field: FormField, answer: FormAnswer): string | null {
    if (typeof answer !== 'string' || !field.options.includes(answer)) return 'Selecione uma das opções disponíveis.';
    return null;
  }

  private validateMultipleChoice(field: FormField, answer: FormAnswer): string | null {
    if (!Array.isArray(answer) || answer.some((option) => !field.options.includes(option))) return 'Selecione somente opções disponíveis.';
    if (new Set(answer).size !== answer.length) return 'Não repita opções selecionadas.';
    return null;
  }

  private validateFileAnswer(answer: FormAnswer): string | null {
    if (typeof answer !== 'object' || Array.isArray(answer)) return 'Informe uma referência de arquivo válida.';
    if (!answer.fileId.trim() || !answer.fileName.trim() || !answer.mediaType.trim()
      || !Number.isSafeInteger(answer.sizeBytes) || answer.sizeBytes <= 0) return 'Informe uma referência de arquivo válida.';
    return null;
  }

  private isValidDateAnswer(answer: FormAnswer): boolean {
    if (typeof answer !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(answer)) return false;
    const parsed = new Date(`${answer}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === answer;
  }

  private isMissingAnswer(answer: FormAnswer | null | undefined): boolean {
    return answer === undefined || answer === null || answer === '' || (Array.isArray(answer) && answer.length === 0);
  }

  private static validateFields(fields: FormField[]): ValidationError | null {
    const fieldIds = new Set<string>();
    for (const field of fields) {
      if (!field.id.trim() || !field.name.trim() || fieldIds.has(field.id)
        || !Number.isSafeInteger(field.order) || field.order < 0) {
        return new ValidationError({ code: 'FORM_FIELD_INVALID', message: 'Os campos devem possuir identificadores, nomes e ordem válidos.' });
      }
      const isChoice = field.type === 'SELECT' || field.type === 'SINGLE_CHOICE' || field.type === 'MULTIPLE_CHOICE';
      if ((isChoice && (field.options.length === 0 || field.options.some((option) => !option.trim())))
        || (!isChoice && field.options.length > 0)) {
        return new ValidationError({ code: 'FORM_FIELD_OPTIONS_INVALID', message: 'As opções devem ser informadas somente em campos de escolha.' });
      }
      fieldIds.add(field.id);
    }
    return null;
  }

  private static copyFields(fields: FormField[]): FormField[] {
    return fields.map((field) => ({ ...field, options: [...field.options] })).sort((left, right) => left.order - right.order);
  }

  private static copyAnswers(answers: FormAnswers): FormAnswers {
    const copy: FormAnswers = {};
    for (const [fieldId, answer] of Object.entries(answers)) {
      if (Array.isArray(answer)) copy[fieldId] = [...answer];
      else if (answer && typeof answer === 'object') copy[fieldId] = { ...answer };
      else copy[fieldId] = answer;
    }
    return copy;
  }
}

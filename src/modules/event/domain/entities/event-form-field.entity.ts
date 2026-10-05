import { Entity } from '@core/domain/entity.base';
import type { EntityConstructorParams } from '@core/domain/entity.base';
import { Result } from '@core/domain/result';
import { toSlug } from '@core/domain/text.util';
import { FormFieldType } from '../value-objects/form-field-type.vo';
import type { FormFieldTypeValue } from '../value-objects/form-field-type.vo';

export type EventFormFieldProps = {
  eventId: string;
  fieldKey: string;
  label: string;
  description: string | null;
  fieldType: FormFieldType;
  isRequired: boolean;
  orderIndex: number;
  options: string[];
  placeholder: string | null;
  isActive: boolean;
};
export type EventFormFieldConstructorParams = EntityConstructorParams<EventFormFieldProps>;
export type ReconstituteEventFormFieldParams = EventFormFieldConstructorParams & {
  id: NonNullable<EventFormFieldConstructorParams['id']>;
};
export type CreateEventFormFieldParams = {
  eventId: string;
  fieldKey?: string;
  label: string;
  description?: string | null;
  fieldType: string;
  isRequired?: boolean;
  orderIndex?: number;
  options?: string[];
  placeholder?: string | null;
  isActive?: boolean;
};
export type UpdateEventFormFieldParams = Partial<Omit<CreateEventFormFieldParams, 'eventId' | 'fieldKey'>>;
export type FormFieldSnapshotData = {
  id: string;
  fieldKey: string;
  label: string;
  fieldType: FormFieldTypeValue;
};

/**
 * Campo do formulário de inscrição configurável por evento (§8).
 * Campos não são apagados: são inativados, preservando respostas antigas (§9).
 */
export class EventFormField extends Entity<EventFormFieldProps> {
  private constructor(params: EventFormFieldConstructorParams) {
    super(params);
  }

  get eventId(): string { return this.props.eventId; }
  get fieldKey(): string { return this.props.fieldKey; }
  get label(): string { return this.props.label; }
  get description(): string | null { return this.props.description; }
  get fieldType(): FormFieldType { return this.props.fieldType; }
  get isRequired(): boolean { return this.props.isRequired; }
  get orderIndex(): number { return this.props.orderIndex; }
  get options(): string[] { return [...this.props.options]; }
  get placeholder(): string | null { return this.props.placeholder; }
  get isActive(): boolean { return this.props.isActive; }

  public static create(params: CreateEventFormFieldParams): Result<EventFormField> {
    if (!params.eventId) return Result.fail(new Error('Campo deve pertencer a um evento'));

    const typeResult = FormFieldType.create(params.fieldType);
    if (typeResult.isFailure) return Result.fail(typeResult.error);

    const label = (params.label ?? '').trim();
    if (label.length < 2) return Result.fail(new Error('Rótulo do campo deve ter ao menos 2 caracteres'));
    if (label.length > 120) return Result.fail(new Error('Rótulo do campo deve ter no máximo 120 caracteres'));

    const fieldKey = deriveFieldKey(params.fieldKey, label);
    if (fieldKey.length < 2) return Result.fail(new Error('Identificador do campo inválido'));

    const options = normalizeOptions(params.options ?? []);
    if (typeResult.value.requiresOptions() && options.length < 2) {
      return Result.fail(new Error('Campos de seleção exigem ao menos duas opções'));
    }

    return Result.ok(new EventFormField({
      props: {
        eventId: params.eventId,
        fieldKey,
        label,
        description: params.description?.trim() || null,
        fieldType: typeResult.value,
        isRequired: params.isRequired ?? false,
        orderIndex: params.orderIndex ?? 0,
        options,
        placeholder: params.placeholder?.trim() || null,
        isActive: params.isActive ?? true,
      },
    }));
  }

  public static reconstitute(params: ReconstituteEventFormFieldParams): EventFormField {
    return new EventFormField(params);
  }

  public update(params: UpdateEventFormFieldParams): Result<void> {
    if (params.label !== undefined) {
      const label = params.label.trim();
      if (label.length < 2) return Result.fail(new Error('Rótulo do campo deve ter ao menos 2 caracteres'));
      this.props.label = label;
    }
    if (params.description !== undefined) this.props.description = params.description?.trim() || null;
    if (params.placeholder !== undefined) this.props.placeholder = params.placeholder?.trim() || null;

    if (params.fieldType !== undefined) {
      const typeResult = FormFieldType.create(params.fieldType);
      if (typeResult.isFailure) return Result.fail(typeResult.error);
      this.props.fieldType = typeResult.value;
    }
    if (params.options !== undefined) this.props.options = normalizeOptions(params.options);
    if (this.props.fieldType.requiresOptions() && this.props.options.length < 2) {
      return Result.fail(new Error('Campos de seleção exigem ao menos duas opções'));
    }
    if (params.isRequired !== undefined) this.props.isRequired = params.isRequired;
    if (params.orderIndex !== undefined) this.props.orderIndex = params.orderIndex;
    if (params.isActive !== undefined) this.props.isActive = params.isActive;

    this.touch();
    return Result.ok();
  }

  public deactivate(): void {
    this.props.isActive = false;
    this.touch();
  }

  public validateAnswer(rawValue: string | null): Result<string | null> {
    const value = (rawValue ?? '').trim();

    if (!value) {
      if (this.props.isRequired) return Result.fail(new Error(`O campo "${this.props.label}" é obrigatório`));
      return Result.ok(null);
    }
    if (value.length > 5000) return Result.fail(new Error(`O campo "${this.props.label}" excede o tamanho máximo`));

    const validation = this.props.fieldType.validateValue(value, this.props.options);
    if (!validation.isValid) {
      return Result.fail(new Error(validation.message ?? `Valor inválido para o campo "${this.props.label}"`));
    }
    return Result.ok(value);
  }

  /** Fotografia do campo usada para preservar o histórico das respostas (§9). */
  public toSnapshot(): FormFieldSnapshotData {
    return {
      id: this.id.toString(),
      fieldKey: this.props.fieldKey,
      label: this.props.label,
      fieldType: this.props.fieldType.value,
    };
  }
}

function deriveFieldKey(informedKey: string | undefined, label: string): string {
  const base = informedKey ? toSlug(informedKey) : toSlug(label);
  return base.replace(/-/g, '_').slice(0, 60);
}

function normalizeOptions(options: string[]): string[] {
  return [...new Set(options.map((option) => option.trim()).filter((option) => option.length > 0))].slice(0, 50);
}

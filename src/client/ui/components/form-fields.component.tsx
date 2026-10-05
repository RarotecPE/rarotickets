import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

export type FieldWrapperProps = {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

export function FieldWrapper({ label, hint, error, required, children }: FieldWrapperProps) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1 block text-[13px] font-medium text-app-foreground">
          {label}
          {required && <span className="text-app-danger"> *</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-[12px] text-app-muted">{hint}</span>}
      {error && <span className="mt-1 block text-[12px] text-app-danger">{error}</span>}
    </label>
  );
}

const CONTROL_CLASS =
  'w-full rounded-[8px] border border-app-border bg-app-surface-elevated px-3 py-2.5 text-sm text-app-foreground placeholder:text-app-muted/70 disabled:opacity-60';

export type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string };

export function TextField({ label, hint, error, required, className = '', ...rest }: TextFieldProps) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required}>
      <input className={`${CONTROL_CLASS} ${className}`} required={required} {...rest} />
    </FieldWrapper>
  );
}

export type TextareaFieldProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  hint?: string;
  error?: string;
};

export function TextareaField({ label, hint, error, required, className = '', ...rest }: TextareaFieldProps) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required}>
      <textarea className={`${CONTROL_CLASS} min-h-24 ${className}`} required={required} {...rest} />
    </FieldWrapper>
  );
}

export type SelectOption = { value: string; label: string };

export type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
};

export function SelectField({
  label,
  hint,
  error,
  options,
  placeholder,
  required,
  className = '',
  ...rest
}: SelectFieldProps) {
  return (
    <FieldWrapper label={label} hint={hint} error={error} required={required}>
      <select className={`${CONTROL_CLASS} ${className}`} required={required} {...rest}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
}

export type CheckboxFieldProps = InputHTMLAttributes<HTMLInputElement> & { label: ReactNode; hint?: string };

export function CheckboxField({ label, hint, className = '', ...rest }: CheckboxFieldProps) {
  return (
    <label className={`flex items-start gap-2.5 ${className}`}>
      <input
        type="checkbox"
        className="mt-0.5 size-4 shrink-0 rounded-[6px] border border-app-border accent-app-primary"
        {...rest}
      />
      <span className="text-[13px] text-app-foreground">
        {label}
        {hint && <span className="mt-0.5 block text-[12px] text-app-muted">{hint}</span>}
      </span>
    </label>
  );
}

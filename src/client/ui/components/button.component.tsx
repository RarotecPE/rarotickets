import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export type ButtonSize = 'sm' | 'md';

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  block?: boolean;
  iconLeft?: ReactNode;
};

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-app-primary text-app-primary-foreground hover:opacity-90 active:opacity-80 disabled:opacity-50',
  secondary:
    'bg-app-surface-elevated text-app-foreground border border-app-border hover:border-app-primary/60',
  ghost: 'bg-transparent text-app-foreground hover:bg-app-surface-elevated',
  danger: 'bg-app-danger text-white hover:opacity-90',
  success: 'bg-app-success text-white hover:opacity-90',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-[13px] gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  block = false,
  iconLeft,
  className = '',
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center rounded-[8px] font-medium transition-opacity disabled:cursor-not-allowed ${VARIANTS[variant]} ${SIZES[size]} ${block ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {isLoading ? <Spinner /> : iconLeft}
      {children}
    </button>
  );
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

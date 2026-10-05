import type { ReactNode } from 'react';

export function Alert({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children?: ReactNode;
}) {
  const tones: Record<string, string> = {
    info: 'border-app-border bg-app-surface-elevated text-app-foreground',
    success: 'border-app-success/40 bg-app-success/10 text-app-foreground',
    warning: 'border-app-warning/40 bg-app-warning/10 text-app-foreground',
    danger: 'border-app-danger/40 bg-app-danger/10 text-app-foreground',
  };
  return (
    <div role="status" className={`rounded-[8px] border px-3 py-2.5 text-[13px] ${tones[tone]}`}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? 'mt-0.5' : ''}>{children}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-[12px] border border-dashed border-app-border bg-app-surface px-4 py-10 text-center">
      <p className="text-[15px] font-medium">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-[13px] text-app-muted">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function LoadingBlock({ label = 'Carregando…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-app-muted">
      <span className="inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      {label}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert tone="danger" title="Não foi possível carregar">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="mt-2 font-medium underline" onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </Alert>
  );
}

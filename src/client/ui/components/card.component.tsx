import type { ReactNode } from 'react';

export type CardProps = { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' };

export function Card({ children, className = '', as = 'div' }: CardProps) {
  const Tag = as;
  return (
    <Tag className={`rounded-[12px] border border-app-border bg-app-surface ${className}`}>{children}</Tag>
  );
}

export type SectionCardProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function SectionCard({ title, description, actions, children, className = '' }: SectionCardProps) {
  return (
    <Card className={className}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-app-border px-4 py-3">
          <div className="min-w-0">
            {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
            {description && <p className="mt-0.5 text-[13px] text-app-muted">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className="p-4">{children}</div>
    </Card>
  );
}

export type StatCardProps = {
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger';
};

const STAT_TONES: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'text-app-foreground',
  success: 'text-app-success',
  warning: 'text-app-warning',
  danger: 'text-app-danger',
};

export function StatCard({ label, value, hint, tone = 'default' }: StatCardProps) {
  return (
    <div className="rounded-[12px] border border-app-border bg-app-surface p-4">
      <p className="text-[12px] uppercase tracking-wide text-app-muted">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${STAT_TONES[tone]}`}>{value}</p>
      {hint && <p className="mt-1 text-[12px] text-app-muted">{hint}</p>}
    </div>
  );
}

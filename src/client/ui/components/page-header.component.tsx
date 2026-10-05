import type { ReactNode } from 'react';

export type PageHeaderProps = { title: string; description?: string; actions?: ReactNode; breadcrumb?: string };

export function PageHeader({ title, description, actions, breadcrumb }: PageHeaderProps) {
  return (
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {breadcrumb && <p className="text-[12px] text-app-muted">{breadcrumb}</p>}
        <h1 className="text-[20px] font-semibold leading-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[13px] text-app-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

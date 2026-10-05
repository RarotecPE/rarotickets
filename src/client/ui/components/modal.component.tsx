import { useEffect } from 'react';
import type { ReactNode } from 'react';

export type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
};

const SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' } as const;

export function Modal({ open, title, description, onClose, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.document.addEventListener('keydown', onKeyDown);
    return () => window.document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`w-full ${SIZES[size]} max-h-[92vh] overflow-y-auto rounded-t-[12px] border border-app-border bg-app-surface sm:rounded-[12px]`}
      >
        <header className="sticky top-0 flex items-start justify-between gap-3 border-b border-app-border bg-app-surface px-4 py-3">
          <div>
            <h2 className="text-[15px] font-semibold">{title}</h2>
            {description && <p className="mt-0.5 text-[13px] text-app-muted">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="text-app-muted hover:text-app-foreground">
            ✕
          </button>
        </header>
        <div className="px-4 py-4">{children}</div>
        {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-app-border px-4 py-3">{footer}</footer>}
      </div>
    </div>
  );
}

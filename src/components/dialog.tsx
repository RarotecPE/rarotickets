"use client";

import { X } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { cn } from "@/shared/utils/cn";

/* Um dialog simples — abre com gatilho, fecha com ESC/overlay/X/submit. */
export function Dialog({
  trigger,
  title,
  description,
  children,
  maxWidth = "max-w-lg",
}: {
  trigger: ReactNode;
  title: string;
  description?: string;
  children: ReactNode;
  maxWidth?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {isValidElement(trigger)
        ? cloneElement(trigger as ReactElement<{ onClick?: () => void }>, {
            onClick: () => setOpen(true),
          })
        : trigger}

      {open && (
        <div
          className="fixed inset-0 z-[50] grid place-items-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-app-overlay"
            onClick={() => setOpen(false)}
          />
          <div
            ref={contentRef}
            className={cn(
              "relative w-full rounded-app-lg border border-app-border bg-app-surface shadow-app-elevated",
              maxWidth,
            )}
          >
            <div className="flex items-start justify-between border-b border-app-border px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-app-foreground">{title}</h3>
                {description ? (
                  <p className="mt-0.5 text-xs text-app-muted-foreground">{description}</p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="inline-flex h-8 w-8 items-center justify-center rounded-app-sm text-app-muted-foreground hover:bg-app-surface-elevated hover:text-app-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-y-auto px-5 py-4">
              {isValidElement(children)
                ? cloneElement(children as ReactElement<{ onClose?: () => void; refresh?: () => void }>, {
                    onClose: () => {
                      setOpen(false);
                      router.refresh();
                    },
                  })
                : children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Form que fecha o dialog quando o submit passa de pending para concluído.
 * Recebe action Server Action via props.
 */
export function DialogForm({
  action,
  children,
  onClose,
  className,
}: {
  action: (formData: FormData) => void | Promise<void>;
  children: ReactNode;
  onClose?: () => void;
  className?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const fd = new FormData(e.currentTarget);
      await action(fd);
      onClose?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className={cn("flex flex-col gap-4", className)}>
      {error ? (
        <div role="alert" className="rounded-app-md border border-app-danger/30 bg-app-danger/10 p-3 text-sm text-app-danger">
          {error}
        </div>
      ) : null}
      {children}
    </form>
  );
}

export function SubmitButton({
  children,
  className,
  formAction,
}: {
  children: ReactNode;
  className?: string;
  formAction?: string;
}) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="submit"
      formAction={formAction}
      disabled={pending}
      onClick={() => setPending(true)}
      className={cn(className)}
    >
      {pending ? (
        <span className="inline-flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none" />
          Processando...
        </span>
      ) : (
        children
      )}
    </button>
  );
}

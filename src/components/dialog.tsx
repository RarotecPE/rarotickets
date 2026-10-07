"use client";

import { useEffect, useRef, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { btnGhost } from "@/components/ui";

export type DialogProps = { open: boolean; onClose: () => void; title: string; description?: string; maxWidth?: string; children: ReactNode };
type KeyboardTrapParams = { event: KeyboardEvent; dialog: HTMLDivElement; onClose: () => void };

export function Dialog({ open, onClose, title, description, maxWidth = "max-w-lg", children }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = "dialog-title";
  const descriptionId = "dialog-description";

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelector<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])");
    focusable?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (dialog) trapDialogFocus({ event, dialog, onClose });
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4 backdrop-blur-app-overlay" onMouseDown={handleBackdropMouseDown({ onClose })}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className={cn("relative w-full rounded-app-lg border border-app-border bg-app-surface shadow-app-elevated", maxWidth)}>
      <div className="flex items-start justify-between gap-3 border-b border-app-border px-5 py-4">
        <div><h2 id={titleId} className="text-base font-bold text-app-foreground">{title}</h2>{description ? <p id={descriptionId} className="mt-1 text-xs text-app-muted-foreground">{description}</p> : null}</div>
        <button type="button" onClick={onClose} className={cn(btnGhost, "h-8 w-8 shrink-0 p-0")} aria-label="Fechar janela"><X className="h-4 w-4" aria-hidden="true" /></button>
      </div>
      <div className="max-h-[75vh] overflow-y-auto px-5 py-4">{children}</div>
    </div>
  </div>;
}

type BackdropHandlerParams = { onClose: () => void };
type BackdropMouseHandler = (event: ReactMouseEvent<HTMLDivElement>) => void;

function handleBackdropMouseDown(params: BackdropHandlerParams): BackdropMouseHandler {
  return (event) => {
    if (event.target === event.currentTarget) params.onClose();
  };
}

function trapDialogFocus(params: KeyboardTrapParams): void {
  if (params.event.key === "Escape") {
    params.event.preventDefault();
    params.onClose();
    return;
  }
  if (params.event.key !== "Tab") return;
  const focusable = Array.from(params.dialog.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])"));
  if (!focusable.length) {
    params.event.preventDefault();
    params.dialog.focus();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (params.event.shiftKey && document.activeElement === first) {
    params.event.preventDefault();
    last?.focus();
  } else if (!params.event.shiftKey && document.activeElement === last) {
    params.event.preventDefault();
    first?.focus();
  }
}


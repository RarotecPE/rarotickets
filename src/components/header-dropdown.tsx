"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type HeaderIconButtonProps = { label: string; active?: boolean; expanded?: boolean; controls?: string; children: ReactNode; onClick?: () => void; className?: string };
export type HeaderDropdownProps = { id: string; open: boolean; onClose: () => void; children: ReactNode; className?: string; align?: "right" | "center" };

export function HeaderIconButton({ label, active = false, expanded, controls, children, onClick, className }: HeaderIconButtonProps) {
  return <button type="button" onClick={handleToggle({ onClick })} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg border text-app-muted-foreground transition-colors hover:text-app-foreground sm:h-10 sm:w-10", active ? "border-app-primary/40 bg-app-primary/15 text-app-primary" : "border-transparent hover:border-app-border hover:bg-app-surface-elevated", className)} aria-label={label} aria-expanded={expanded} aria-controls={controls} title={label}>{children}</button>;
}

export function HeaderDropdown({ id, open, onClose, children, className, align = "right" }: HeaderDropdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) onClose();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onClose]);
  useEffect(() => { if (open) onClose(); }, [open, onClose, pathname]);
  if (!open) return null;
  return <div ref={containerRef} id={id} className={cn("absolute top-full z-[60] mt-2 max-h-[70dvh] w-[min(calc(100vw-1.5rem),20rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-app-border bg-app-surface shadow-2xl", align === "right" ? "right-0" : "right-1/2 translate-x-1/2", className)}>{children}</div>;
}

type ToggleHandlerParams = { onClick?: () => void };
type ButtonMouseHandler = (event: MouseEvent<HTMLButtonElement>) => void;
function handleToggle(params: ToggleHandlerParams): ButtonMouseHandler {
  return (event) => {
    event.stopPropagation();
    params.onClick?.();
  };
}

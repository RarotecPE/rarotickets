"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";

type HeaderIconButtonProps = {
  label: string;
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  className?: string;
};

type HeaderDropdownProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  align?: "right" | "center";
};

export function HeaderIconButton({
  label,
  active = false,
  children,
  onClick,
  type = "button",
  className = "",
}: HeaderIconButtonProps) {
  return (
    <button
      type={type}
      onClick={(event: MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onClick?.();
      }}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border text-app-muted-foreground transition-colors hover:text-app-foreground sm:h-10 sm:w-10 ${
        active
          ? "border-app-primary/40 bg-app-primary/15 text-app-primary"
          : "border-transparent hover:border-app-border hover:bg-app-surface-elevated"
      } ${className}`}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

export function HeaderDropdown({
  open,
  onClose,
  children,
  className = "",
  align = "right",
}: HeaderDropdownProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return;
    function onClick(event: globalThis.MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) onClose();
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  if (!open) return null;

  const alignmentClass = align === "center" ? "left-1/2 -translate-x-1/2" : "right-0";

  return (
    <div ref={ref} className={`absolute top-full z-[60] mt-2 ${alignmentClass} ${className}`}>
      <div className="max-h-[70dvh] w-[min(calc(100vw-1.5rem),20rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-app-border bg-app-surface shadow-2xl">
        {children}
      </div>
    </div>
  );
}

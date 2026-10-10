import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import type { Tone } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const btnPrimary = "inline-flex h-10 items-center justify-center gap-2 rounded-app-md bg-app-primary px-4 text-sm font-semibold text-app-primary-foreground transition-colors duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
export const btnSecondary = "inline-flex h-10 items-center justify-center gap-2 rounded-app-md border border-app-border bg-app-surface-elevated px-4 text-sm font-semibold text-app-foreground transition-colors duration-150 hover:bg-app-surface disabled:cursor-not-allowed disabled:opacity-50";
export const btnGhost = "inline-flex h-10 items-center justify-center gap-2 rounded-app-md px-3 text-sm font-semibold text-app-muted-foreground transition-colors duration-150 hover:bg-app-surface-elevated hover:text-app-foreground disabled:cursor-not-allowed disabled:opacity-50";
export const btnDanger = "inline-flex h-10 items-center justify-center gap-2 rounded-app-md bg-app-danger px-4 text-sm font-semibold text-white transition-colors duration-150 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";
export const btnXs = "inline-flex h-8 items-center justify-center gap-1.5 rounded-app-sm border border-app-border bg-app-surface-elevated px-2.5 text-xs font-semibold text-app-foreground transition-colors duration-150 hover:bg-app-surface disabled:cursor-not-allowed disabled:opacity-50";
export const btnXsGhost = "inline-flex h-8 items-center justify-center gap-1.5 rounded-app-sm px-2.5 text-xs font-semibold text-app-muted-foreground transition-colors duration-150 hover:bg-app-surface-elevated hover:text-app-foreground disabled:cursor-not-allowed disabled:opacity-50";
export const inputCls = "flex h-10 w-full rounded-app-md border border-app-border bg-app-surface px-3 text-sm text-app-foreground placeholder:text-app-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary disabled:cursor-not-allowed disabled:opacity-60";
export const selectCls = `${inputCls} appearance-none pr-8`;
export const textareaCls = "flex min-h-24 w-full rounded-app-md border border-app-border bg-app-surface px-3 py-2 text-sm text-app-foreground placeholder:text-app-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-app-primary disabled:cursor-not-allowed disabled:opacity-60";
export const labelCls = "text-sm font-medium text-app-foreground";
export const hintCls = "text-xs text-app-muted-foreground";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; compact?: boolean };
const BUTTON_VARIANTS: Record<NonNullable<ButtonProps["variant"]>, string> = { primary: btnPrimary, secondary: btnSecondary, ghost: btnGhost, danger: btnDanger };
export function Button({ variant = "primary", compact = false, className, ...props }: ButtonProps) {
  const variantClass = compact ? variant === "ghost" ? btnXsGhost : btnXs : BUTTON_VARIANTS[variant];
  return <button {...props} className={cn(variantClass, className)} />;
}

export type PanelProps = HTMLAttributes<HTMLElement>;
export function Panel({ className, ...props }: PanelProps) {
  return <section {...props} className={cn("rounded-app-lg border border-app-border bg-app-surface", className)} />;
}

export type PanelHeaderProps = { title: string; right?: ReactNode; description?: string; className?: string };
export function PanelHeader({ title, right, description, className }: PanelHeaderProps) {
  return <div className={cn("flex flex-wrap items-center justify-between gap-3 border-b border-app-border px-4 py-3 sm:px-5", className)}><div><h2 className="text-sm font-bold text-app-foreground">{title}</h2>{description ? <p className="mt-0.5 text-xs text-app-muted-foreground">{description}</p> : null}</div>{right}</div>;
}

export type BadgeProps = { tone?: Tone; solid?: boolean; className?: string; children: ReactNode };
const TONE_CLS: Record<Tone, string> = { primary: "bg-app-primary/15 text-app-primary", success: "bg-app-success/15 text-app-success", warning: "bg-app-warning/15 text-app-warning", danger: "bg-app-danger/15 text-app-danger", muted: "bg-app-surface-elevated text-app-muted-foreground" };
const SOLID_TONE_CLS: Record<Tone, string> = { primary: "bg-app-primary text-white shadow-sm backdrop-blur-sm", success: "bg-app-success text-white shadow-sm backdrop-blur-sm", warning: "bg-app-warning text-white shadow-sm backdrop-blur-sm", danger: "bg-app-danger text-white shadow-sm backdrop-blur-sm", muted: "border border-white/15 bg-slate-900/85 text-white shadow-sm backdrop-blur-sm" };
export function Badge({ tone = "muted", solid = false, className, children }: BadgeProps) {
  return <span className={cn("inline-flex items-center gap-1 rounded-app-pill px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap", solid ? SOLID_TONE_CLS[tone] : TONE_CLS[tone], className)}>{children}</span>;
}

export type StatProps = { label: string; value: ReactNode; hint?: string; tone?: Tone; icon?: ReactNode; className?: string };
export function Stat({ label, value, hint, tone = "muted", icon, className }: StatProps) {
  return <div className={cn("rounded-app-lg border border-app-border bg-app-surface p-4", className)}><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold text-app-muted-foreground">{label}</p>{icon ? <span className={cn("rounded-app-sm p-1.5", TONE_CLS[tone])}>{icon}</span> : null}</div><p className="mt-2 text-2xl font-bold text-app-foreground tabular-nums">{value}</p>{hint ? <p className="mt-1 text-xs text-app-muted-foreground">{hint}</p> : null}</div>;
}

export type EmptyProps = { title: string; description?: string; action?: ReactNode };
export function Empty({ title, description, action }: EmptyProps) {
  return <div className="flex flex-col items-center gap-1.5 rounded-app-md border border-dashed border-app-border p-6 text-center"><p className="text-sm font-semibold text-app-foreground">{title}</p>{description ? <p className="max-w-lg text-xs text-app-muted-foreground">{description}</p> : null}{action ? <div className="mt-2">{action}</div> : null}</div>;
}

export type FieldProps = { label: string; htmlFor?: string; hint?: string; hintId?: string; error?: string; errorId?: string; className?: string; children: ReactNode };
export function Field({ label, htmlFor, hint, hintId, error, errorId, className, children }: FieldProps) {
  const activeErrorId = errorId ?? (htmlFor && error ? `${htmlFor}-error` : undefined);
  return <div className={cn("flex flex-col gap-1.5", className)}><label htmlFor={htmlFor} className={labelCls}>{label}</label>{children}{hint ? <span id={hintId} className={hintCls}>{hint}</span> : null}{error ? <span id={activeErrorId} role="alert" className="text-xs text-app-danger">{error}</span> : null}</div>;
}

export type InlineAlertProps = { tone?: "danger" | "success" | "info"; children: ReactNode; className?: string };
export function InlineAlert({ tone = "info", children, className }: InlineAlertProps) {
  const colors = tone === "danger" ? "border-app-danger/30 bg-app-danger/10 text-app-danger" : tone === "success" ? "border-app-success/30 bg-app-success/10 text-app-success" : "border-app-primary/30 bg-app-primary/10 text-app-foreground";
  return <div role={tone === "danger" ? "alert" : "status"} className={cn("rounded-app-md border p-3 text-sm", colors, className)}>{children}</div>;
}

export type SpinnerProps = { label?: string; className?: string };
export function Spinner({ label = "Carregando…", className }: SpinnerProps) {
  return <span role="status" className={cn("inline-flex items-center gap-2 text-sm text-app-muted-foreground", className)}><span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-app-muted-foreground/30 border-t-app-primary motion-reduce:animate-none" />{label}</span>;
}

"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type OperationLoadingValue = { pending: number; start: () => () => void };
export type OperationLoadingProviderProps = { children: ReactNode };
const OperationLoadingContext = createContext<OperationLoadingValue | null>(null);

export function OperationLoadingProvider({ children }: OperationLoadingProviderProps) {
  const [pending, setPending] = useState(0);
  const start = useCallback(() => {
    setPending((current) => current + 1);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      setPending((current) => Math.max(0, current - 1));
    };
  }, []);
  const value = useMemo(() => ({ pending, start }), [pending, start]);
  return <OperationLoadingContext.Provider value={value}>{children}{pending > 0 ? <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-950/55 p-4 backdrop-blur-app-overlay" aria-live="polite"><div className="flex max-w-xs items-center gap-3 rounded-app-lg border border-app-border bg-app-surface p-4 shadow-app-elevated"><span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-app-muted-foreground/30 border-t-app-primary motion-reduce:animate-none" /><span className="text-sm text-app-foreground">Processando operação…</span></div></div> : null}</OperationLoadingContext.Provider>;
}

export function useOperationLoading(): OperationLoadingValue | null {
  return useContext(OperationLoadingContext);
}

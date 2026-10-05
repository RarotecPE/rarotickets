import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

export type ToastTone = 'info' | 'success' | 'warning' | 'danger';

export type ToastMessage = {
  id: string;
  tone: ToastTone;
  title: string;
  description?: string;
};

export type ShowToastParams = { tone?: ToastTone; title: string; description?: string };
export type ToastContextValue = {
  messages: ToastMessage[];
  show: (params: ShowToastParams) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    setMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  const show = useCallback(
    ({ tone = 'info', title, description }: ShowToastParams) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setMessages((current) => [...current, { id, tone, title, description }]);
      window.setTimeout(() => dismiss(id), 5200);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(() => ({ messages, show, dismiss }), [messages, show, dismiss]);

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast deve ser usado dentro de ToastProvider');
  return context;
}

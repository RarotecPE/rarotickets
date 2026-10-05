import { useToast } from '@client/state/toast.state';
import type { ToastTone } from '@client/state/toast.state';

const TONES: Record<ToastTone, string> = {
  info: 'border-app-border bg-app-surface-elevated',
  success: 'border-app-success/50 bg-app-success/10',
  warning: 'border-app-warning/50 bg-app-warning/10',
  danger: 'border-app-danger/50 bg-app-danger/10',
};

export function Toaster() {
  const { messages, dismiss } = useToast();
  if (messages.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6">
      {messages.map((message) => (
        <button
          key={message.id}
          type="button"
          onClick={() => dismiss(message.id)}
          className={`pointer-events-auto w-full max-w-md rounded-[8px] border px-3 py-2 text-left text-[13px] shadow-lg ${TONES[message.tone]}`}
        >
          <span className="block font-medium">{message.title}</span>
          {message.description && <span className="mt-0.5 block text-app-muted">{message.description}</span>}
        </button>
      ))}
    </div>
  );
}

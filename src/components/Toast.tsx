import { X } from 'lucide-react';

export interface ToastMessage {
  id: number;
  type: 'info' | 'success' | 'error';
  message: string;
}

interface ToastStackProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

export function ToastStack({ toasts, onDismiss }: ToastStackProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="no-print fixed right-4 bottom-4 z-50 flex max-w-sm flex-col gap-2"
    >
      {toasts.map((t) => {
        const borderTone =
          t.type === 'error'
            ? 'border-red-400/40 text-red-100'
            : t.type === 'success'
              ? 'border-[#A7BFA3]/40 text-[#F5F1E8]'
              : 'border-[#C6A96B]/40 text-[#F5F1E8]';
        const label =
          t.type === 'error' ? 'Error' : t.type === 'success' ? 'Done' : 'Notice';

        return (
          <div
            key={t.id}
            className={`flex items-start gap-3 rounded-lg border bg-[#111827]/95 px-4 py-3 text-sm shadow-2xl backdrop-blur ${borderTone}`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-[#C6A96B]">{label}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-[#F5F1E8]">{t.message}</p>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss notification"
              className="rounded p-1 text-[#A5ADBC] transition-colors hover:text-[#F5F1E8]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

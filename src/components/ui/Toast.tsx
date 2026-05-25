import { useState, useEffect, useCallback } from "react";

type ToastVariant = "success" | "error" | "info";

interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
}

const ICONS: Record<ToastVariant, string> = {
  success: "✓",
  error: "✕",
  info: "●",
};

const BORDER_COLORS: Record<ToastVariant, string> = {
  success: "border-l-green-500",
  error: "border-l-red-500",
  info: "border-l-violet-500",
};

const TEXT_COLORS: Record<ToastVariant, string> = {
  success: "text-green-400",
  error: "text-red-400",
  info: "text-violet-400",
};

let nextId = 0;

export function useToast() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = String(++nextId);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, showToast, dismissToast };
}

export default function ToastContainer({
  toasts,
  dismissToast,
}: {
  toasts: ToastData[];
  dismissToast: (id: string) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => dismissToast(toast.id)}
        />
      ))}
    </div>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  return (
    <div
      className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-lg border border-border shadow-elevated bg-elevated border-l-4 ${BORDER_COLORS[toast.variant]} transition-all duration-300 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 translate-y-2"
      }`}
    >
      <span className={`text-sm font-bold ${TEXT_COLORS[toast.variant]}`}>
        {ICONS[toast.variant]}
      </span>
      <span className="text-sm text-primary flex-1">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="text-secondary hover:text-primary transition-colors text-sm"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

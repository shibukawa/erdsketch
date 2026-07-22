import { CircleAlert, Info, X } from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useI18n } from "../../i18n/I18nProvider";
import { translateText } from "../../i18n/translations";

type ToastTone = "error" | "info";
type Toast = { id: string; message: string; tone: ToastTone };
type ToastContextValue = {
  error: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const { locale } = useI18n();
  const [toasts, setToasts] = useState<Toast[]>([]);

  function dismiss(id: string) {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  function show(message: string, tone: ToastTone) {
    const id = crypto.randomUUID();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => dismiss(id), 6000);
  }

  const value = {
    error(message: string) { show(message, "error"); },
    info(message: string) { show(message, "info"); }
  };

  return <ToastContext value={value}>
    {children}
    <div className="pointer-events-none fixed right-4 top-4 z-[220] flex w-[min(92vw,420px)] flex-col gap-2" aria-live="polite" aria-atomic="false">
      {toasts.map((toast) => <div key={toast.id} role={toast.tone === "error" ? "alert" : "status"} className={`pointer-events-auto flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-xl ${toast.tone === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-blue-200 bg-blue-50 text-blue-900"}`}>
        {toast.tone === "error" ? <CircleAlert className="mt-0.5 shrink-0" size={18} /> : <Info className="mt-0.5 shrink-0" size={18} />}
        <p className="min-w-0 flex-1 font-medium">{translateText(toast.message, locale)}</p>
        <button type="button" className="btn btn-ghost btn-xs btn-square -mr-1 -mt-1" aria-label="Dismiss notification" onClick={() => dismiss(toast.id)}><X size={14} /></button>
      </div>)}
    </div>
  </ToastContext>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

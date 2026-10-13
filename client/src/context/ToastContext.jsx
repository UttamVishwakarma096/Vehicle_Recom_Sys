import { useState, useCallback, useMemo } from "react";
import { FiX } from "react-icons/fi";
import { ToastContext } from "./toastContextDef.js";

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(({ type = "info", title, message, duration = 4000 }) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newToast = { id, type, title, message };

    setToasts((prev) => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toastHelpers = useMemo(() => ({
    success: (message, title = "Success") => addToast({ type: "success", title, message }),
    error: (message, title = "Error") => addToast({ type: "error", title, message }),
    warning: (message, title = "Warning") => addToast({ type: "warning", title, message }),
    info: (message, title = "Info") => addToast({ type: "info", title, message }),
    remove: removeToast,
  }), [addToast, removeToast]);

  const typeStyles = {
    success: {
      badge: "bg-[#1F5A3A]/20 text-[#1F5A3A] dark:text-[#D8FF2A] border-[#1F5A3A]/40",
      badgeText: "SUCCESS",
    },
    error: {
      badge: "bg-rose-500/15 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300/60 dark:border-rose-500/30",
      badgeText: "ERROR",
    },
    warning: {
      badge: "bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300/60 dark:border-amber-500/30",
      badgeText: "WARNING",
    },
    info: {
      badge: "bg-[#D8FF2A]/20 text-[#0A0A0A] dark:text-[#D8FF2A] border-[#D8FF2A]/40",
      badgeText: "INFO",
    },
  };

  return (
    <ToastContext.Provider value={toastHelpers}>
      {children}
      {/* Toast Overlay Container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const style = typeStyles[t.type] || typeStyles.info;
          return (
            <div
              key={t.id}
              role="alert"
              className="pointer-events-auto rounded-2xl border border-[#2B2B2B]/10 dark:border-white/10 bg-white/90 dark:bg-[#2B2B2B]/90 p-4 shadow-xl backdrop-blur-2xl transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider backdrop-blur-md ${style.badge}`}>
                    {style.badgeText}
                  </span>
                  {t.title && (
                    <strong className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                      {t.title}
                    </strong>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  aria-label="Dismiss alert"
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold cursor-pointer transition-colors"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              </div>
              {t.message && (
                <p className="mt-2 text-xs font-normal text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t.message}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

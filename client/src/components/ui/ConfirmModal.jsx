import { Modal } from "./Modal.jsx";
import { Button } from "./Button.jsx";
import { LoadingSpinner } from "./LoadingSpinner.jsx";
import { FiAlertTriangle } from "react-icons/fi";

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  children,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  icon,
  isLoading = false,
  maxWidth = "max-w-md",
}) {
  const isDanger = variant === "danger";
  const isWarning = variant === "warning";

  const iconBg = isDanger
    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
    : isWarning
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
      : "bg-[#1F5A3A]/10 text-[#1F5A3A] dark:text-[#D8FF2A] border border-[#1F5A3A]/20";

  return (
    <Modal isOpen={isOpen} onClose={isLoading ? () => {} : onClose} title={title} maxWidth={maxWidth}>
      <div className="space-y-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-xl ${iconBg}`}
          >
            {icon || <FiAlertTriangle className="w-5 h-5" />}
          </div>
          <div className="space-y-1.5 pt-0.5 text-sm leading-relaxed text-[#2B2B2B]/90 dark:text-[#F5F5F5]/90">
            {message && <p>{message}</p>}
            {children}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2B2B2B]/10 dark:border-white/10">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant={isDanger ? "danger" : isWarning ? "accent" : "primary"}
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className={isWarning ? "bg-amber-600 hover:bg-amber-500 text-white" : ""}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span>Processing...</span>
              </span>
            ) : (
              confirmText
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

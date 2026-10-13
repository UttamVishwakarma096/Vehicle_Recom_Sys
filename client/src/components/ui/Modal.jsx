import { useEffect, useRef } from "react";
import { FiX } from "react-icons/fi";

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={`w-[calc(100%-1.5rem)] sm:w-full ${maxWidth} max-h-[88dvh] overflow-y-auto rounded-2xl border border-[#2B2B2B]/10 dark:border-white/10 bg-white/95 dark:bg-[#2B2B2B]/95 p-5 sm:p-6 shadow-2xl backdrop-blur-2xl relative text-[#0A0A0A] dark:text-[#F5F5F5]`}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#2B2B2B]/10 dark:border-white/10">
          <h2
            id="modal-title"
            className="text-lg font-bold tracking-tight font-display text-[#0A0A0A] dark:text-[#F5F5F5]"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-full bg-[#2B2B2B]/10 dark:bg-[#0A0A0A]/80 hover:bg-[#2B2B2B]/20 dark:hover:bg-[#0A0A0A] text-[#2B2B2B] dark:text-[#F5F5F5] w-7 h-7 flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

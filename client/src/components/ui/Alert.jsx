export function Alert({
  title,
  children,
  variant = "warning",
  className = "",
}) {
  const styles = {
    warning: {
      bg: "bg-amber-500/10 dark:bg-amber-950/25 border-amber-200/70 dark:border-amber-500/25 text-amber-950 dark:text-amber-200",
      badgeBg: "bg-amber-500/20 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-300/60 dark:border-amber-500/30",
      badgeText: "NOTICE",
    },
    error: {
      bg: "bg-rose-500/10 dark:bg-rose-950/25 border-rose-200/70 dark:border-rose-500/25 text-rose-950 dark:text-rose-200",
      badgeBg: "bg-rose-500/20 dark:bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-300/60 dark:border-rose-500/30",
      badgeText: "ERROR",
    },
    success: {
      bg: "bg-[#1F5A3A]/10 dark:bg-[#1F5A3A]/20 border-[#1F5A3A]/30 text-[#1F5A3A] dark:text-[#D8FF2A]",
      badgeBg: "bg-[#1F5A3A]/20 text-[#1F5A3A] dark:text-[#D8FF2A] border-[#1F5A3A]/40",
      badgeText: "SUCCESS",
    },
    info: {
      bg: "bg-[#D8FF2A]/10 dark:bg-[#D8FF2A]/15 border-[#D8FF2A]/30 text-[#0A0A0A] dark:text-[#D8FF2A]",
      badgeBg: "bg-[#D8FF2A]/20 text-[#0A0A0A] dark:text-[#D8FF2A] border-[#D8FF2A]/40",
      badgeText: "INFO",
    },
  };

  const current = styles[variant] || styles.warning;

  return (
    <div
      role="region"
      aria-label={title || current.badgeText}
      className={`rounded-2xl border backdrop-blur-xl p-5 shadow-xs ${current.bg} ${className}`}
    >
      <div className="flex items-center gap-2.5">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-mono font-bold uppercase tracking-wider backdrop-blur-md ${current.badgeBg}`}
        >
          {current.badgeText}
        </span>
        {title && (
          <strong className="text-sm font-bold tracking-tight">
            {title}
          </strong>
        )}
      </div>
      <div className="mt-2 text-sm font-normal leading-relaxed opacity-90">
        {children}
      </div>
    </div>
  );
}

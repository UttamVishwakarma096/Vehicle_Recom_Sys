export function Badge({
  children,
  variant = "blue",
  size = "md",
  className = "",
}) {
  const variantStyles = {
    lime: "bg-[#D8FF2A]/20 text-[#0A0A0A] dark:text-[#D8FF2A] border-[#D8FF2A]/60 dark:border-[#D8FF2A]/40 font-bold",
    forest: "bg-[#1F5A3A]/15 text-[#1F5A3A] dark:text-[#D8FF2A] border-[#1F5A3A]/30 dark:border-[#D8FF2A]/25",
    charcoal: "bg-[#2B2B2B]/15 text-[#2B2B2B] dark:text-[#F5F5F5] border-[#2B2B2B]/25 dark:border-white/15",
    dark: "bg-[#0A0A0A]/90 text-[#F5F5F5] border-[#0A0A0A] dark:border-white/20",
    light: "bg-[#F5F5F5] text-[#0A0A0A] border-[#2B2B2B]/20",
    yellow: "bg-[#D8FF2A]/20 text-[#0A0A0A] dark:text-[#D8FF2A] border-[#D8FF2A]/60 dark:border-[#D8FF2A]/40",
    blue: "bg-[#1F5A3A]/15 text-[#1F5A3A] dark:text-[#D8FF2A] border-[#1F5A3A]/30 dark:border-[#D8FF2A]/30",
    green: "bg-[#1F5A3A]/20 text-[#1F5A3A] dark:text-emerald-300 border-[#1F5A3A]/35 dark:border-[#1F5A3A]/40",
    red: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-500/30",
    orange: "bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-200/60 dark:border-amber-500/30",
    gray: "bg-[#2B2B2B]/10 text-[#2B2B2B] dark:text-[#F5F5F5]/70 border-[#2B2B2B]/20 dark:border-white/10",
    black: "bg-[#0A0A0A]/90 text-[#F5F5F5] border-[#0A0A0A] dark:border-white/20",
    white: "bg-white/80 dark:bg-[#2B2B2B]/80 text-[#0A0A0A] dark:text-[#F5F5F5] border-[#2B2B2B]/15 dark:border-white/10",
    indigo: "bg-[#1F5A3A]/15 text-[#1F5A3A] dark:text-[#D8FF2A] border-[#1F5A3A]/30 dark:border-[#D8FF2A]/30",
    cyan: "bg-[#D8FF2A]/20 text-[#0A0A0A] dark:text-[#D8FF2A] border-[#D8FF2A]/40 dark:border-[#D8FF2A]/40",
    lemon: "bg-[#D8FF2A]/25 text-[#0A0A0A] dark:text-[#D8FF2A] border-[#D8FF2A]/60 dark:border-[#D8FF2A]/40",
  };

  const sizeStyles = {
    sm: "px-2.5 py-0.5 text-[11px] font-medium gap-1",
    md: "px-3 py-1 text-xs font-semibold gap-1.5",
    lg: "px-3.5 py-1.5 text-sm font-semibold gap-1.5",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border backdrop-blur-md select-none transition-colors ${
        variantStyles[variant] || variantStyles.blue
      } ${sizeStyles[size] || sizeStyles.md} ${className}`}
    >
      {children}
    </span>
  );
}

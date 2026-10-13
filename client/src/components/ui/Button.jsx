export function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  disabled = false,
  className = "",
  onClick,
  ...props
}) {
  const baseStyles =
    "inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-200 cursor-pointer select-none text-center focus-visible:outline-2 focus-visible:outline-[#D8FF2A] focus-visible:outline-offset-2";

  const sizeStyles = {
    sm: "px-3.5 py-1.5 text-xs min-h-[36px] gap-1.5",
    md: "px-5 py-2.5 text-sm min-h-[44px] gap-2",
    lg: "px-7 py-3 text-base min-h-[50px] gap-2.5",
  };

  const variantStyles = {
    primary:
      "bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] font-bold shadow-md shadow-[#D8FF2A]/20 hover:shadow-lg hover:shadow-[#D8FF2A]/30 hover:-translate-y-0.5 active:translate-y-0",
    accent:
      "bg-[#1F5A3A] hover:bg-[#27724a] text-[#F5F5F5] font-semibold shadow-md shadow-[#1F5A3A]/25 hover:shadow-lg hover:shadow-[#1F5A3A]/35 hover:-translate-y-0.5 active:translate-y-0",
    forest:
      "bg-[#1F5A3A] hover:bg-[#27724a] text-[#F5F5F5] font-semibold shadow-md shadow-[#1F5A3A]/25 hover:shadow-lg hover:shadow-[#1F5A3A]/35 hover:-translate-y-0.5 active:translate-y-0",
    lemon:
      "bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] shadow-md shadow-[#D8FF2A]/25 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 font-bold",
    lime:
      "bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] shadow-md shadow-[#D8FF2A]/25 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 font-bold",
    success:
      "bg-gradient-to-r from-[#1F5A3A] to-[#16422a] hover:from-[#27724a] hover:to-[#1F5A3A] text-white shadow-md shadow-[#1F5A3A]/25 hover:shadow-lg hover:shadow-[#1F5A3A]/35 hover:-translate-y-0.5 active:translate-y-0",
    danger:
      "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-md shadow-rose-500/25 hover:shadow-lg hover:shadow-rose-500/35 hover:-translate-y-0.5 active:translate-y-0",
    secondary:
      "bg-white/80 dark:bg-[#2B2B2B]/80 hover:bg-white dark:hover:bg-[#2B2B2B] text-[#0A0A0A] dark:text-[#F5F5F5] border border-[#2B2B2B]/15 dark:border-white/10 shadow-xs hover:shadow-md hover:border-[#1F5A3A]/40 dark:hover:border-[#D8FF2A]/30 backdrop-blur-md hover:-translate-y-0.5 active:translate-y-0",
    subtle:
      "bg-[#2B2B2B]/10 dark:bg-[#2B2B2B]/60 hover:bg-[#2B2B2B]/15 dark:hover:bg-[#2B2B2B]/90 text-[#2B2B2B] dark:text-[#F5F5F5] backdrop-blur-sm border border-transparent hover:border-[#2B2B2B]/20 dark:hover:border-white/10 active:scale-[0.98]",
  };

  const disabledStyles =
    "opacity-50 cursor-not-allowed pointer-events-none shadow-none transform-none filter-none";

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${disabled ? disabledStyles : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function LoadingSpinner({
  label = "Loading data...",
  size = "md",
  className = "",
}) {
  const sizeMap = {
    sm: "w-5 h-5 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-3",
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-3 p-6 select-none ${className}`}
    >
      <div
        className={`${sizeMap[size] || sizeMap.md} rounded-full border-[#2B2B2B]/20 dark:border-white/10 border-t-[#D8FF2A] animate-spin`}
      />
      {label && (
        <span className="text-xs font-semibold text-slate-500 tracking-wide">
          {label}
        </span>
      )}
    </div>
  );
}

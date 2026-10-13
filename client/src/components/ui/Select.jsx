export function Select({
  id,
  name,
  label,
  value,
  onChange,
  options = [],
  placeholder = "Select an option",
  error,
  hint,
  required = false,
  disabled = false,
  className = "",
  ...props
}) {
  const selectId = id || name;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={selectId}
          className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1 select-none"
        >
          {label}
          {required && <span className="text-rose-500 font-bold">*</span>}
        </label>
      )}

      {hint && (
        <span id={hintId} className="text-xs text-slate-500 dark:text-slate-400 font-normal">
          {hint}
        </span>
      )}

      <div className="relative">
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full min-h-[44px] px-3.5 py-2.5 pr-10 text-sm rounded-xl font-medium text-[#0A0A0A] dark:text-[#F5F5F5] bg-white/70 dark:bg-[#2B2B2B]/60 backdrop-blur-md border ${
            error
              ? "border-rose-400 bg-rose-50/50 dark:bg-rose-950/20 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15"
              : "border-[#2B2B2B]/15 dark:border-white/10 hover:border-[#2B2B2B]/30 dark:hover:border-white/20 focus:border-[#1F5A3A] dark:focus:border-[#D8FF2A] focus:bg-white/90 dark:focus:bg-[#2B2B2B]/90 focus:ring-4 focus:ring-[#1F5A3A]/15 dark:focus:ring-[#D8FF2A]/20"
          } shadow-xs appearance-none focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
          {...props}
        >
          {placeholder && <option value="" className="bg-[#F5F5F5] dark:bg-[#2B2B2B] text-[#0A0A0A] dark:text-[#F5F5F5]">{placeholder}</option>}
          {options.map((opt) => {
            const optVal = typeof opt === "object" ? opt.value : opt;
            const optLabel = typeof opt === "object" ? opt.label : opt;
            return (
              <option key={optVal} value={optVal} className="bg-[#F5F5F5] dark:bg-[#2B2B2B] text-[#0A0A0A] dark:text-[#F5F5F5]">
                {optLabel}
              </option>
            );
          })}
        </select>
        {/* Sleek Minimal Arrow */}
        <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-xs">
          ▼
        </div>
      </div>

      {error && (
        <span
          id={errorId}
          role="alert"
          className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-0.5"
        >
          {error}
        </span>
      )}
    </div>
  );
}

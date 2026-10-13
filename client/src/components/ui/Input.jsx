import { useState } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

export function Input({
  id,
  name,
  label,
  type = "text",
  value,
  onChange,
  placeholder = "",
  error,
  hint,
  required = false,
  disabled = false,
  autocomplete,
  className = "",
  showPasswordToggle = true,
  ...props
}) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const inputId = id || name;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  const isPassword = type === "password";
  const effectiveType = isPassword && isPasswordVisible ? "text" : type;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
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

      <div className="relative flex items-center w-full">
        <input
          id={inputId}
          name={name}
          type={effectiveType}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          autoComplete={autocomplete}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`w-full min-h-[44px] px-3.5 py-2.5 ${
            isPassword && showPasswordToggle ? "pr-11" : ""
          } text-sm rounded-xl font-medium text-[#0A0A0A] dark:text-[#F5F5F5] placeholder:text-slate-400 dark:placeholder:text-slate-500 bg-white/70 dark:bg-[#2B2B2B]/60 backdrop-blur-md border ${
            error
              ? "border-rose-400 bg-rose-50/50 dark:bg-rose-950/20 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15"
              : "border-[#2B2B2B]/15 dark:border-white/10 hover:border-[#2B2B2B]/30 dark:hover:border-white/20 focus:border-[#1F5A3A] dark:focus:border-[#D8FF2A] focus:bg-white/90 dark:focus:bg-[#2B2B2B]/90 focus:ring-4 focus:ring-[#1F5A3A]/15 dark:focus:ring-[#D8FF2A]/20"
          } shadow-xs focus:outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
          {...props}
        />

        {isPassword && showPasswordToggle && (
          <button
            type="button"
            onClick={() => setIsPasswordVisible((prev) => !prev)}
            aria-label={isPasswordVisible ? "Hide password" : "Show password"}
            title={isPasswordVisible ? "Hide password" : "Show password"}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-[#0A0A0A] dark:hover:text-[#F5F5F5] focus:text-[#1F5A3A] dark:focus:text-[#D8FF2A] rounded-lg hover:bg-slate-100/70 dark:hover:bg-[#2B2B2B]/80 focus:outline-none transition-colors cursor-pointer"
          >
            {isPasswordVisible ? (
              <FiEyeOff className="w-4 h-4" />
            ) : (
              <FiEye className="w-4 h-4" />
            )}
          </button>
        )}
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

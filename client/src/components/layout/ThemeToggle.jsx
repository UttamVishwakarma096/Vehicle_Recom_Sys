import { useTheme } from "../../context/useTheme.js";

export function ThemeToggle({ className = "" }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      className={`relative inline-flex items-center justify-center w-8 h-8 rounded-full border transition-all duration-300 cursor-pointer ${
        isDark
          ? "bg-[#2B2B2B]/80 border-[#2B2B2B] text-[#D8FF2A] hover:bg-[#2B2B2B] hover:border-white/20 shadow-sm shadow-black/40"
          : "bg-white/80 border-[#2B2B2B]/15 text-[#0A0A0A] hover:bg-[#F5F5F5] hover:text-[#0A0A0A] shadow-xs"
      } backdrop-blur-md ${className}`}
      title={isDark ? "Activate light mode" : "Activate dark mode"}
    >
      {isDark ? (
        /* Sun Icon */
        <svg
          className="w-4 h-4 transition-transform duration-300 rotate-0 hover:rotate-45"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
          />
        </svg>
      ) : (
        /* Moon Icon */
        <svg
          className="w-4 h-4 transition-transform duration-300 -rotate-12 hover:rotate-0 text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
          />
        </svg>
      )}
    </button>
  );
}

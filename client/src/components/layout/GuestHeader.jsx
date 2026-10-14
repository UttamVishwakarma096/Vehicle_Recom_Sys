import { useState } from "react";
import { FiMenu, FiX, FiLock } from "react-icons/fi";
import { Link } from "../../router/Router.jsx";
import { useLocation } from "../../router/hooks.js";
import { ThemeToggle } from "./ThemeToggle.jsx";

export function GuestHeader() {
  const { pathname } = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { to: "/vehicles", label: "Catalog" },
    { to: "/recommendations", label: "Recommendations", isProtected: true },
    { to: "/compare", label: "Compare", isProtected: true },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/80 dark:bg-[#0A0A0A]/85 backdrop-blur-xl border-b border-[#2B2B2B]/10 dark:border-white/10 shadow-xs dark:shadow-black/40 transition-colors duration-200">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-3 sm:px-6 lg:px-8 py-3">
        {/* Brand Logo */}
        <Link
          to="/"
          onClick={() => setMobileMenuOpen(false)}
          className="flex items-center gap-2 sm:gap-2.5 text-base sm:text-lg font-bold tracking-tight select-none group"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-[#1F5A3A] to-[#0A0A0A] border border-[#D8FF2A]/30 flex items-center justify-center text-[#D8FF2A] shadow-md shadow-[#D8FF2A]/10 group-hover:shadow-[#D8FF2A]/25 transition-all">
            <span className="font-display font-black text-xs tracking-wider text-[#D8FF2A]">VW</span>
          </div>
          <div className="flex items-center tracking-tight font-display">
            <span className="text-[#0A0A0A] dark:text-[#F5F5F5] font-bold text-base sm:text-lg">Vehicle</span>
            <span className="bg-gradient-to-r from-[#1F5A3A] to-[#D8FF2A] dark:from-[#D8FF2A] dark:to-[#85e022] bg-clip-text text-transparent font-bold text-base sm:text-lg">
              Wise
            </span>
          </div>
        </Link>

        {/* Desktop & Tablet Links (hidden on mobile phones) */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100/70 dark:bg-[#2B2B2B]/60 backdrop-blur-md p-1 rounded-full border border-slate-200/50 dark:border-white/10">
          {navLinks.map((link) => {
            const isActive = pathname === link.to;
            return (
              <div key={link.to} className="relative group inline-flex items-center">
                <Link
                  to={link.to}
                  title={link.isProtected ? "Needs login" : undefined}
                  aria-label={link.isProtected ? `${link.label} (Needs login)` : link.label}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all inline-flex items-center gap-1.5 ${
                    isActive
                      ? "bg-[#D8FF2A] text-[#0A0A0A] shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-[#2B2B2B]/70"
                  }`}
                >
                  <span>{link.label}</span>
                  {link.isProtected && (
                    <FiLock className="w-3 h-3 opacity-60" aria-hidden="true" />
                  )}
                </Link>

                {link.isProtected && (
                  <div
                    role="tooltip"
                    className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50 flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#0A0A0A]/95 dark:bg-[#2B2B2B]/95 text-white dark:text-[#F5F5F5] border border-white/10 px-2.5 py-1 text-[11px] font-medium shadow-xl opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 transition-all duration-150 backdrop-blur-md"
                  >
                    <FiLock className="w-2.5 h-2.5 text-[#D8FF2A]" aria-hidden="true" />
                    <span>Needs login</span>
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-[#0A0A0A] dark:bg-[#2B2B2B] border-t border-l border-white/10" />
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Desktop Controls (Theme + Auth CTAs) */}
        <div className="hidden md:flex items-center gap-2 sm:gap-3">
          <ThemeToggle />

          <Link
            to="/login"
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-[#F5F5F5] hover:text-[#1F5A3A] dark:hover:text-[#D8FF2A] transition-colors"
          >
            Sign In
          </Link>

          <Link
            to="/register"
            className="bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] px-4 py-1.5 text-xs font-bold rounded-xl shadow-md shadow-[#D8FF2A]/20 hover:shadow-[#D8FF2A]/35 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
          >
            Get Started →
          </Link>
        </div>

        {/* Mobile Header Controls (Theme + Hamburger Button) */}
        <div className="flex md:hidden items-center gap-1.5 sm:gap-2">
          <ThemeToggle />

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            className="p-2 rounded-xl bg-white/80 dark:bg-[#2B2B2B]/80 text-slate-700 dark:text-[#F5F5F5] border border-slate-200/60 dark:border-white/10 cursor-pointer flex items-center justify-center transition-colors"
          >
            {mobileMenuOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/50 dark:border-white/10 bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-2xl px-4 py-4 flex flex-col gap-2.5 shadow-xl animate-in fade-in duration-150">
          <div className="flex flex-col gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileMenuOpen(false)}
                  title={link.isProtected ? "Needs login" : undefined}
                  aria-label={link.isProtected ? `${link.label} (Needs login)` : link.label}
                  className={`p-2.5 text-sm font-semibold rounded-xl transition-colors flex items-center justify-between ${
                    isActive
                      ? "bg-[#D8FF2A] text-[#0A0A0A] font-bold"
                      : "text-slate-700 dark:text-slate-200 hover:bg-[#D8FF2A]/10 hover:text-[#1F5A3A] dark:hover:text-[#D8FF2A]"
                  }`}
                >
                  <span>{link.label}</span>
                  {link.isProtected && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-white/10 px-2 py-0.5 rounded-full">
                      <FiLock className="w-3 h-3 text-[#1F5A3A] dark:text-[#D8FF2A]" aria-hidden="true" />
                      Needs login
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex gap-2">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 bg-white/90 dark:bg-[#2B2B2B] border border-slate-200 dark:border-white/10 py-2.5 text-center text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#2B2B2B]/80 transition-colors"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              onClick={() => setMobileMenuOpen(false)}
              className="flex-1 bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] py-2.5 text-center text-xs font-bold rounded-xl shadow-md shadow-[#D8FF2A]/20 transition-all"
            >
              Get Started →
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

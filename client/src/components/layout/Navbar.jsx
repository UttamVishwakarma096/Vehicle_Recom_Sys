import { useState } from "react";
import { FiMenu, FiX, FiLock } from "react-icons/fi";
import { Link } from "../../router/Router.jsx";
import { useLocation } from "../../router/hooks.js";
import { useAuth } from "../../context/useAuth.js";
import { useToast } from "../../context/useToast.js";
import { ThemeToggle } from "./ThemeToggle.jsx";

export function Navbar() {
  const { pathname } = useLocation();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const toast = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Successfully signed out.", "Session Closed");
    } catch {
      toast.error("Failed to sign out cleanly.", "Network Error");
    }
  };

  const navLinks = [
    { to: "/vehicles", label: "Catalog" },
    { to: "/recommendations", label: "Recommendations", isProtected: !isAuthenticated },
    { to: "/compare", label: "Compare", isProtected: !isAuthenticated },
    ...(isAuthenticated ? [{ to: "/favorites", label: "Favorites" }] : []),
    ...(isAdmin ? [{ to: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/75 dark:bg-[#0A0A0A]/80 backdrop-blur-xl border-b border-white/60 dark:border-white/10 shadow-xs dark:shadow-black/40 transition-colors duration-200">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#1F5A3A]/10 via-[#2B2B2B]/10 to-[#D8FF2A]/10 dark:from-[#1F5A3A]/30 dark:via-[#2B2B2B]/30 dark:to-[#D8FF2A]/10 border-b border-[#2B2B2B]/10 dark:border-white/5 px-4 py-1.5 text-center text-xs font-medium text-slate-700 dark:text-slate-300 tracking-wide flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1.5 font-semibold text-[#1F5A3A] dark:text-[#D8FF2A]">
          <span className="inline-block w-2 h-2 rounded-full bg-[#D8FF2A] animate-pulse" />
          VehicleWise
        </span>
        <span className="hidden sm:inline text-slate-400 dark:text-slate-600">•</span>
        <span className="hidden sm:inline text-slate-600 dark:text-slate-400">Deterministic Preference Matching & Verified Specs</span>
      </div>

      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        {/* Brand Logo */}
        <Link
          to="/"
          className="flex items-center gap-2.5 text-lg font-bold tracking-tight select-none group"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#1F5A3A] to-[#0A0A0A] border border-[#D8FF2A]/30 flex items-center justify-center text-[#D8FF2A] shadow-md shadow-[#D8FF2A]/10 group-hover:shadow-[#D8FF2A]/30 transition-shadow">
            <span className="text-sm font-bold">VW</span>
          </div>
          <div className="flex items-center tracking-tight font-display">
            <span className="text-[#0A0A0A] dark:text-[#F5F5F5] font-bold text-lg">Vehicle</span>
            <span className="bg-gradient-to-r from-[#1F5A3A] to-[#D8FF2A] dark:from-[#D8FF2A] dark:to-[#85e022] bg-clip-text text-transparent font-bold text-lg">Wise</span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/60 dark:bg-[#2B2B2B]/60 backdrop-blur-md p-1 rounded-full border border-slate-200/50 dark:border-white/10">
          {navLinks.map((link) => {
            const isActive = pathname === link.to;
            return (
              <div key={link.to} className="relative group inline-flex items-center">
                <Link
                  to={link.to}
                  title={link.isProtected ? "Needs login" : undefined}
                  aria-label={link.isProtected ? `${link.label} (Needs login)` : link.label}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all inline-flex items-center gap-1.5 ${
                    isActive
                      ? "bg-[#D8FF2A] text-[#0A0A0A] shadow-xs font-bold"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/50 dark:hover:bg-[#2B2B2B]/50"
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

        {/* Desktop Controls (Theme + Auth) */}
        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />

          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 bg-white/70 dark:bg-[#2B2B2B]/70 backdrop-blur-md border border-slate-200/60 dark:border-white/10 px-3 py-1 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 shadow-xs">
                <span className="w-2 h-2 rounded-full bg-[#1F5A3A]" />
                <span className="max-w-[140px] truncate">{user.email}</span>
              </div>
              {isAdmin && (
                <span className="bg-[#1F5A3A]/10 text-[#1F5A3A] dark:text-[#D8FF2A] border border-[#1F5A3A]/30 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono">
                  Admin
                </span>
              )}
              <button
                type="button"
                onClick={handleLogout}
                className="bg-white/80 dark:bg-[#2B2B2B]/80 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-300 border border-slate-200/60 dark:border-white/10 hover:border-rose-200 dark:hover:border-rose-900/50 px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer shadow-xs"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#1F5A3A] dark:hover:text-[#D8FF2A] transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] px-4 py-1.5 text-xs font-bold rounded-full shadow-md shadow-[#D8FF2A]/20 transition-all"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger & Theme Toggle */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation Menu"
            aria-expanded={mobileMenuOpen}
            className="bg-white/80 dark:bg-[#2B2B2B]/80 backdrop-blur-md border border-slate-200/70 dark:border-white/10 p-2 rounded-xl text-slate-700 dark:text-slate-300 shadow-xs cursor-pointer flex items-center justify-center"
          >
            {mobileMenuOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200/50 dark:border-white/10 bg-white/90 dark:bg-[#0A0A0A]/95 backdrop-blur-2xl p-4 flex flex-col gap-2 shadow-lg">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileMenuOpen(false)}
              title={link.isProtected ? "Needs login" : undefined}
              aria-label={link.isProtected ? `${link.label} (Needs login)` : link.label}
              className="p-2.5 text-sm font-semibold rounded-xl text-slate-700 dark:text-slate-200 hover:bg-[#D8FF2A]/10 hover:text-[#1F5A3A] dark:hover:text-[#D8FF2A] transition-colors flex items-center justify-between"
            >
              <span>{link.label}</span>
              {link.isProtected && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-white/10 px-2 py-0.5 rounded-full">
                  <FiLock className="w-3 h-3 text-[#1F5A3A] dark:text-[#D8FF2A]" aria-hidden="true" />
                  Needs login
                </span>
              )}
            </Link>
          ))}

          <div className="pt-3 border-t border-slate-200/60 dark:border-white/10 flex flex-col gap-2">
            {isAuthenticated ? (
              <>
                <div className="text-xs font-medium text-slate-600 dark:text-slate-400 px-2.5 py-1">
                  Signed in as: <strong className="text-[#0A0A0A] dark:text-[#F5F5F5]">{user.email}</strong>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50 p-2 rounded-xl text-xs font-semibold text-center cursor-pointer"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 bg-white dark:bg-[#2B2B2B] border border-slate-200 dark:border-white/10 p-2 text-center text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-200"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 bg-[#D8FF2A] text-[#0A0A0A] p-2 text-center text-xs font-bold rounded-xl shadow-xs"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

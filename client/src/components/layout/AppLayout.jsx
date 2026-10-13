import { useState, useEffect } from "react";
import { FiMenu } from "react-icons/fi";
import { Link } from "../../router/Router.jsx";
import { useLocation, useNavigate } from "../../router/hooks.js";
import { useAuth } from "../../context/useAuth.js";
import { Sidebar } from "./Sidebar.jsx";
import { GuestHeader } from "./GuestHeader.jsx";
import { Footer } from "./Footer.jsx";
import { ThemeToggle } from "./ThemeToggle.jsx";

// Protected routes that require authentication
const PROTECTED_ROUTES = [
  "/ai-scanner",
  "/recommendations",
  "/compare",
  "/favorites",
  "/admin",
];

export function AppLayout({ children }) {
  const { pathname } = useLocation();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If a guest visits a protected feature page without logging in, redirect to "/login"
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      const isProtected = PROTECTED_ROUTES.some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
      );
      if (isProtected) {
        navigate("/login");
      }
    }
  }, [isLoading, isAuthenticated, pathname, navigate]);

  // Is this an unauthenticated guest visit on the landing page, login, or register page?
  const isGuestExperience = !isAuthenticated;

  return (
    <div className="relative min-h-screen flex flex-col bg-[#F5F5F5] dark:bg-[#0A0A0A] text-[#0A0A0A] dark:text-[#F5F5F5] font-sans selection:bg-[#D8FF2A] selection:text-[#0A0A0A] transition-colors duration-300">
      {/* Ambient background glows for realistic glass refraction using user color palette */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[580px] w-[580px] rounded-full bg-gradient-to-tr from-[#1F5A3A]/25 via-[#2B2B2B]/20 to-transparent dark:from-[#1F5A3A]/30 dark:via-[#0A0A0A] blur-3xl transition-colors duration-700" />
        <div className="absolute top-1/4 -right-40 h-[540px] w-[540px] rounded-full bg-gradient-to-br from-[#D8FF2A]/15 via-[#1F5A3A]/20 to-transparent dark:from-[#D8FF2A]/10 dark:via-[#1F5A3A]/15 blur-3xl transition-colors duration-700" />
        <div className="absolute bottom-10 left-1/3 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-[#2B2B2B]/10 via-[#D8FF2A]/10 to-transparent dark:from-[#1F5A3A]/20 dark:via-[#0A0A0A] blur-3xl transition-colors duration-700" />
      </div>

      {isGuestExperience ? (
        /* Guest Experience: Full-width modern landing page layout with top GuestHeader */
        <div className="flex-1 flex flex-col min-h-screen">
          <GuestHeader />
          <main className="flex-1 mx-auto w-full max-w-6xl px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8">
            {children}
          </main>
          <Footer />
        </div>
      ) : (
        /* Authenticated Experience: Sleek sidebar app navigation holding all features */
        <div className="relative min-h-screen flex">
          <Sidebar
            mobileOpen={mobileMenuOpen}
            onCloseMobile={() => setMobileMenuOpen(false)}
          />

          <div className="flex-1 flex flex-col min-w-0 lg:pl-64 min-h-screen">
            {/* Mobile & Tablet Header Bar (< lg) */}
            <header className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3 bg-white/85 dark:bg-[#0A0A0A]/90 backdrop-blur-xl border-b border-[#2B2B2B]/10 dark:border-white/10 shadow-xs">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(true)}
                  className="p-1.5 sm:p-2 rounded-xl bg-slate-100 dark:bg-[#2B2B2B] text-slate-700 dark:text-[#F5F5F5] text-lg cursor-pointer flex items-center justify-center hover:bg-slate-200 dark:hover:bg-[#2B2B2B]/80 transition-colors"
                  aria-label="Open navigation menu"
                >
                  <FiMenu className="w-5 h-5" />
                </button>
                <Link to="/" className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1F5A3A] to-[#0A0A0A] border border-[#D8FF2A]/30 flex items-center justify-center text-[#D8FF2A] shadow-xs">
                    <span className="font-display font-black text-[10px] tracking-wider text-[#D8FF2A]">VW</span>
                  </div>
                  <span className="font-display font-bold text-sm sm:text-base text-[#0A0A0A] dark:text-[#F5F5F5]">
                    Vehicle<span className="text-[#1F5A3A] dark:text-[#D8FF2A]">Wise</span>
                  </span>
                </Link>
              </div>

              <div className="flex items-center gap-2">
                <ThemeToggle />
              </div>
            </header>

            {/* Page Content Body */}
            <main className="flex-1 mx-auto w-full max-w-6xl px-3.5 sm:px-6 lg:px-8 py-5 sm:py-8">
              {children}
            </main>

            <Footer />
          </div>
        </div>
      )}
    </div>
  );
}

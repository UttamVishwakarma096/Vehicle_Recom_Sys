import { useEffect } from "react";
import { Link } from "../../router/Router.jsx";
import { useLocation } from "../../router/hooks.js";
import { useAuth } from "../../context/useAuth.js";
import { useToast } from "../../context/useToast.js";
import { ThemeToggle } from "./ThemeToggle.jsx";
import { FiHome, FiCamera, FiZap, FiStar, FiShield, FiX } from "react-icons/fi";
import { FaCar, FaScaleBalanced } from "react-icons/fa6";

export function Sidebar({ mobileOpen, onCloseMobile }) {
  const { pathname } = useLocation();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const toast = useToast();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Successfully signed out.", "Session Closed");
      if (onCloseMobile) onCloseMobile();
    } catch {
      toast.error("Failed to sign out cleanly.", "Network Error");
    }
  };

  const navItems = [
    {
      group: "DISCOVER",
      links: [
        { to: "/", label: "Home / Overview", icon: FiHome },
        { to: "/vehicles", label: "Vehicle Catalog", icon: FaCar },
        { to: "/ai-scanner", label: "AI Car Scanner", icon: FiCamera, isAi: true },
      ],
    },
    {
      group: "DECISION TOOLS",
      links: [
        { to: "/recommendations", label: "Recommendations", icon: FiZap },
        { to: "/compare", label: "Compare Matrix", icon: FaScaleBalanced },
        ...(isAuthenticated ? [{ to: "/favorites", label: "Saved Favorites", icon: FiStar }] : []),
      ],
    },
    ...(isAdmin
      ? [
          {
            group: "MANAGEMENT",
            links: [{ to: "/admin", label: "Admin Inventory", icon: FiShield }],
          },
        ]
      : []),
  ];

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onCloseMobile) {
        onCloseMobile();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const content = (
    <aside className="w-64 max-w-[85vw] h-dvh overflow-y-auto overscroll-y-contain flex flex-col justify-between p-4 bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-2xl border-r border-[#2B2B2B]/10 dark:border-white/10 select-none">
      {/* Brand & Platform Header */}
      <div>
        <div className="flex items-center justify-between pb-4 border-b border-[#2B2B2B]/10 dark:border-white/10 mb-4">
          <Link
            to="/"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1F5A3A] to-[#0A0A0A] border border-[#D8FF2A]/30 flex items-center justify-center text-[#D8FF2A] shadow-md shadow-[#D8FF2A]/10 group-hover:shadow-[#D8FF2A]/25 transition-all">
              <span className="font-display font-black text-xs tracking-wider text-[#D8FF2A]">VW</span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center tracking-tight font-display font-bold text-lg leading-tight">
                <span className="text-[#0A0A0A] dark:text-[#F5F5F5]">Vehicle</span>
                <span className="bg-gradient-to-r from-[#1F5A3A] to-[#D8FF2A] dark:from-[#D8FF2A] dark:to-[#85e022] bg-clip-text text-transparent">
                  Wise
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                AI Vision & Verified Specs
              </span>
            </div>
          </Link>

          {/* Close button on mobile */}
          {onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="lg:hidden text-slate-400 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-lg flex items-center justify-center cursor-pointer"
              aria-label="Close menu"
            >
              <FiX className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Sections */}
        <nav className="flex flex-col gap-5">
          {navItems.map((section) => (
            <div key={section.group}>
              <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 dark:text-slate-500 px-3 block mb-1.5 uppercase">
                {section.group}
              </span>
              <div className="flex flex-col gap-1">
                {section.links.map((item) => {
                  const isActive = pathname === item.to;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={onCloseMobile}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActive
                          ? "bg-[#D8FF2A] text-[#0A0A0A] shadow-sm shadow-[#D8FF2A]/20 font-bold"
                          : "text-slate-600 dark:text-[#F5F5F5]/80 hover:bg-[#2B2B2B]/10 dark:hover:bg-[#2B2B2B]/60 hover:text-[#0A0A0A] dark:hover:text-[#F5F5F5]"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      {item.isAi && (
                        <span
                          className={`text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                            isActive
                              ? "bg-[#0A0A0A] text-[#D8FF2A] font-extrabold"
                              : "bg-[#1F5A3A]/15 text-[#1F5A3A] dark:text-[#D8FF2A] border border-[#1F5A3A]/30 dark:border-[#D8FF2A]/30"
                          }`}
                        >
                          AI
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer Area: User Status & Theme Toggle */}
      <div className="pt-4 mt-4 border-t border-[#2B2B2B]/10 dark:border-white/10 flex flex-col gap-3">
        {/* Theme Toggle row */}
        <div className="flex items-center justify-between px-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Interface Theme
          </span>
          <ThemeToggle />
        </div>

        {/* Account Box */}
        {isAuthenticated ? (
          <div className="rounded-xl border border-[#2B2B2B]/15 dark:border-white/10 bg-white/70 dark:bg-[#2B2B2B]/60 p-2.5 backdrop-blur-md">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#1F5A3A] to-[#2B2B2B] text-[#D8FF2A] text-xs font-bold flex items-center justify-center shadow-xs">
                {user.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-xs font-semibold text-[#0A0A0A] dark:text-[#F5F5F5] truncate">
                  {user.profile?.displayName || user.email}
                </span>
                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                  {isAdmin ? "Administrator" : "Verified User"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full text-center py-1 rounded-lg text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Link
              to="/login"
              onClick={onCloseMobile}
              className="w-full text-center py-2 rounded-xl bg-[#D8FF2A] hover:bg-[#cbf520] text-[#0A0A0A] text-xs font-bold shadow-sm shadow-[#D8FF2A]/20 hover:shadow-[#D8FF2A]/30 transition-all cursor-pointer"
            >
              Sign In →
            </Link>
            <Link
              to="/register"
              onClick={onCloseMobile}
              className="w-full text-center py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-[#F5F5F5]/80 hover:bg-slate-100/70 dark:hover:bg-[#2B2B2B]/60 transition-colors"
            >
              Create Account
            </Link>
          </div>
        )}
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-40">
        {content}
      </div>

      {/* Mobile Slide-over Drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          {/* Drawer Panel */}
          <div className="relative z-50 flex-1 max-w-[280px]">
            {content}
          </div>
        </div>
      )}
    </>
  );
}

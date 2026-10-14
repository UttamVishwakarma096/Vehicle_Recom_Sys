import { Link } from "../../router/Router.jsx";

export function Footer() {
  return (
    <footer className="mt-12 sm:mt-24 border-t border-[#2B2B2B]/10 dark:border-white/10 bg-white/50 dark:bg-[#0A0A0A]/60 backdrop-blur-xl transition-colors duration-200">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <div className="flex items-center gap-2.5 text-lg font-bold tracking-tight">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#1F5A3A] to-[#0A0A0A] border border-[#D8FF2A]/30 flex items-center justify-center text-[#D8FF2A] shadow-xs">
                <span className="font-display font-black text-[10px] tracking-wider text-[#D8FF2A]">VW</span>
              </div>
              <span className="font-display font-bold text-[#0A0A0A] dark:text-[#F5F5F5]">VehicleWise</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Transparent, explainable vehicle recommendations based strictly on verified
              catalog evidence. No fabricated specs, no black-box estimates.
            </p>
            <div className="mt-3.5 inline-flex items-center gap-2 rounded-xl bg-slate-100/80 dark:bg-[#2B2B2B]/60 px-3 py-1.5 border border-slate-200/60 dark:border-white/10 text-xs text-slate-600 dark:text-slate-300">
              <span className="w-2 h-2 rounded-full bg-[#1F5A3A] dark:bg-[#D8FF2A] ring-2 ring-[#1F5A3A]/20 dark:ring-[#D8FF2A]/20" />
              <span>Created & Owned by <strong className="font-semibold text-[#0A0A0A] dark:text-[#F5F5F5]">Uttam Vishwakarma</strong></span>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A0A0A] dark:text-[#F5F5F5] font-display">
              Core Capabilities
            </h3>
            <ul className="mt-3 flex flex-col gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#1F5A3A] ring-2 ring-[#1F5A3A]/30" />
                100% Verified Specifications & Pricing
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#D8FF2A] ring-2 ring-[#D8FF2A]/30" />
                Gemini Multimodal AI Car Scanner
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2B2B2B] ring-2 ring-[#2B2B2B]/40" />
                Objective Preference Match Engine
              </li>
            </ul>
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A0A0A] dark:text-[#F5F5F5] font-display">
              Quick Navigation
            </h3>
            <ul className="mt-3 flex flex-col gap-2 text-xs text-slate-600 dark:text-slate-400">
              <li>
                <Link to="/vehicles" className="hover:text-[#1F5A3A] dark:hover:text-[#D8FF2A] transition-colors">
                  Browse Catalog →
                </Link>
              </li>
              <li>
                <Link to="/recommendations" className="hover:text-[#1F5A3A] dark:hover:text-[#D8FF2A] transition-colors">
                  Match Preferences →
                </Link>
              </li>
              <li>
                <Link to="/compare" className="hover:text-[#1F5A3A] dark:hover:text-[#D8FF2A] transition-colors">
                  Compare Vehicles →
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 sm:mt-12 pt-6 border-t border-[#2B2B2B]/10 dark:border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
          <span>VehicleWise • Developed & Maintained by <strong className="font-semibold text-[#0A0A0A] dark:text-[#F5F5F5]">Uttam Vishwakarma</strong></span>
          <span className="text-[11px] font-mono bg-slate-100/80 dark:bg-[#2B2B2B]/80 px-2.5 py-1 rounded-full border border-slate-200/60 dark:border-white/10 text-slate-600 dark:text-[#F5F5F5]">
            Verified Data Guarantee
          </span>
        </div>
      </div>
    </footer>
  );
}

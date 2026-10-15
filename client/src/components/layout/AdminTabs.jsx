import { Link } from "../../router/Router.jsx";
import { useLocation } from "../../router/hooks.js";
import { Badge } from "../ui/Badge.jsx";

export function AdminTabs() {
  const { pathname } = useLocation();

  const isUsers = pathname === "/admin/users";
  const isVehicles = pathname === "/admin" || pathname === "/admin/vehicles";

  return (
    <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/70 dark:border-white/10 pb-4">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="forest" size="sm">Admin Portal</Badge>
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Control Room</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0A0A0A] dark:text-[#F5F5F5] font-display">
          {isUsers ? "User Directory & Access Control" : "Vehicle Inventory Management"}
        </h1>
      </div>

      <div className="flex items-center gap-2 bg-slate-100/70 dark:bg-[#2B2B2B]/70 backdrop-blur-md p-1 rounded-xl border border-slate-200/60 dark:border-white/10 self-start sm:self-auto">
        <Link
          to="/admin"
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            isVehicles
              ? "bg-white dark:bg-[#0A0A0A] text-[#0A0A0A] dark:text-[#F5F5F5] shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          Vehicle Inventory
        </Link>
        <Link
          to="/admin/users"
          className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
            isUsers
              ? "bg-white dark:bg-[#0A0A0A] text-[#0A0A0A] dark:text-[#F5F5F5] shadow-xs font-bold"
              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          User Management
        </Link>
      </div>
    </div>
  );
}

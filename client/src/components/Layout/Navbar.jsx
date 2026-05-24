import { NavLink } from "react-router-dom";
import { Menu, Car } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useTheme } from "../../context/ThemeContext.jsx";
import { NotificationDropdown } from "../NotificationDropdown.jsx";


function initials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
}

export function Navbar({ onMenu }) {
  const { user, logout } = useAuth();
  const { theme, setMode } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/75 backdrop-blur dark:border-slate-800 dark:bg-slate-950/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          {/* Hamburger — only on mobile (below md) */}
          <button
            type="button"
            onClick={onMenu}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Logo */}
          <NavLink to="/dashboard" className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
              <Car className="h-5 w-5" />
            </span>
            <div className="leading-tight">
              <div className="text-sm font-extrabold uppercase tracking-tight text-slate-900 dark:text-white">
                KoPassenger
              </div>
              <div className="text-[10px] font-bold text-brand-600 dark:text-brand-400">RIDE SHARING</div>
            </div>
          </NavLink>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {user && <NotificationDropdown />}
          <button
            type="button"
            onClick={() => setMode(theme === "dark" ? "light" : "dark")}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
          >
            {theme === "dark" ? "Light" : "Dark"}
          </button>

          {/* User chip — visible from sm (640px) */}
          <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:flex">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              {initials(user?.fullName)}
            </div>
            <div className="hidden min-w-0 lg:block">
              <div className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                {user?.fullName ?? "Account"}
              </div>
              <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{user?.email}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => logout()}
            className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Log out
          </button>
        </div>
      </div>
    </header>
  );
}

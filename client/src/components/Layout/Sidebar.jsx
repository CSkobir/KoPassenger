import { NavLink } from "react-router-dom";
import { LayoutDashboard, User, Settings2, LogOut, Search, PlusSquare, ListChecks, Car, History, MessageSquare, Repeat } from "lucide-react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useEffect, useState } from "react";
import { getConversations } from "../../api/messages.js";

const linkClass = ({ isActive }) =>
  [
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-brand-600 text-white shadow-sm"
      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
  ].join(" ");

function initials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
}

export function Sidebar({ className = "", onNavigate, onClose }) {
  const { user, logout } = useAuth();
  const [totalUnread, setTotalUnread] = useState(0);

  // Poll for unread message count every 30s
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await getConversations();
        if (cancelled) return;
        const count = (data?.conversations ?? []).reduce(
          (sum, c) => sum + (c.unreadCount ?? 0),
          0
        );
        setTotalUnread(count);
      } catch {
        // silently ignore
      }
    };

    load();
    const timer = setInterval(load, 30_000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, []);

  return (
    <aside
      className={[
        "flex w-64 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
        className,
      ].join(" ")}
    >
      {/* User info header */}
      <div className="border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white">
            {initials(user?.fullName)}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
              {user?.fullName ?? "Account"}
            </p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Close
          </button>
        ) : null}
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 p-3">
        <p className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Menu</p>
        <NavLink to="/dashboard" className={linkClass} end onClick={onNavigate}>
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          Dashboard
        </NavLink>
        <NavLink to="/find-ride" className={linkClass} onClick={onNavigate}>
          <Search className="h-4 w-4 shrink-0" />
          Find Ride
        </NavLink>
        <NavLink to="/post-ride" className={linkClass} onClick={onNavigate}>
          <PlusSquare className="h-4 w-4 shrink-0" />
          Post Ride
        </NavLink>
        <NavLink to="/my-requests" className={linkClass} onClick={onNavigate}>
          <ListChecks className="h-4 w-4 shrink-0" />
          My Requests
        </NavLink>
        <NavLink to="/my-rides" className={linkClass} onClick={onNavigate}>
          <Car className="h-4 w-4 shrink-0" />
          My Rides
        </NavLink>
        <NavLink to="/my-fixed-rides" className={linkClass} onClick={onNavigate}>
          <Repeat className="h-4 w-4 shrink-0" />
          My Fixed Rides
        </NavLink>
        <NavLink to="/history" className={linkClass} onClick={onNavigate}>
          <History className="h-4 w-4 shrink-0" />
          Ride History
        </NavLink>

        {/* Chat with unread badge */}
        <NavLink to="/chat" className={linkClass} onClick={onNavigate}>
          <div className="relative">
            <MessageSquare className="h-4 w-4 shrink-0" />
            {totalUnread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {totalUnread > 9 ? "9+" : totalUnread}
              </span>
            )}
          </div>
          Messages
          {totalUnread > 0 && (
            <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">
              {totalUnread > 9 ? "9+" : totalUnread}
            </span>
          )}
        </NavLink>

        <p className="mb-1 mt-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Account</p>
        <NavLink to="/profile" className={linkClass} onClick={onNavigate}>
          <User className="h-4 w-4 shrink-0" />
          Profile
        </NavLink>
        <NavLink to="/settings" className={linkClass} onClick={onNavigate}>
          <Settings2 className="h-4 w-4 shrink-0" />
          Settings
        </NavLink>
      </nav>

      {/* Logout */}
      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        <button
          type="button"
          onClick={() => logout()}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          <LogOut className="h-4 w-4" />
          Log out
        </button>
      </div>
    </aside>
  );
}

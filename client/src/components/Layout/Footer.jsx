import { NavLink } from "react-router-dom";
import { Car } from "lucide-react";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-10 border-t border-slate-200 py-8 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-400">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Car className="h-4 w-4 text-brand-600" />
          <span className="font-bold uppercase tracking-tight text-slate-900 dark:text-slate-100">KoPassenger</span>
          <span className="text-slate-400 dark:text-slate-600">•</span>
          <span>© {year} UIU Community</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NavLink
            to="/find-ride"
            className="rounded-lg px-2 py-1 font-medium hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            Find Ride
          </NavLink>
          <NavLink
            to="/post-ride"
            className="rounded-lg px-2 py-1 font-medium hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            Post Ride
          </NavLink>
          <NavLink
            to="/my-rides"
            className="rounded-lg px-2 py-1 font-medium hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            My Rides
          </NavLink>
          <NavLink
            to="/profile"
            className="rounded-lg px-2 py-1 font-medium hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            Profile
          </NavLink>
        </div>
      </div>
    </footer>
  );
}

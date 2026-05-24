import { Link } from "react-router-dom";
import { Home } from "lucide-react";

export function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <p className="text-7xl font-bold text-slate-300 dark:text-slate-700">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-slate-900 dark:text-white">
        Page not found
      </h1>
      <p className="mt-2 max-w-md text-center text-slate-600 dark:text-slate-400">
        The page you&apos;re looking for doesn&apos;t exist or may have been moved.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700"
      >
        <Home className="h-4 w-4" />
        Back to home
      </Link>
    </div>
  );
}

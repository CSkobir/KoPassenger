import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar.jsx";
import { Navbar } from "./Navbar.jsx";
import { Footer } from "./Footer.jsx";

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar onMenu={() => setMobileOpen(true)} />

      {/* Mobile sidebar overlay — only below md (768px) */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[18rem] max-w-[85vw]">
            <Sidebar
              className="h-full shadow-2xl"
              onNavigate={() => setMobileOpen(false)}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex gap-6 py-6">
          {/* Desktop sidebar — visible from md (768px) and up */}
          <Sidebar className="hidden md:flex" />
          <main className="min-w-0 flex-1">
            <div className="mx-auto max-w-5xl">
              <Outlet />
            </div>
          </main>
        </div>
        <Footer />
      </div>
    </div>
  );
}

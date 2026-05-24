import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Bell, Moon, Sun, Trash2, AlertTriangle, ShieldCheck } from "lucide-react";
import { api, parseJson } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useTheme } from "../context/ThemeContext.jsx";

export function Settings() {
  const { user, refreshUser, setUser } = useAuth();
  const { theme, setMode } = useTheme();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(user?.emailNotifications ?? true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user?.emailNotifications !== undefined) {
      setNotifications(user.emailNotifications);
    }
  }, [user?.emailNotifications]);

  const toggleNotifications = async () => {
    const next = !notifications;
    const res = await api("/api/users/me/settings", {
      method: "PATCH",
      body: JSON.stringify({ emailNotifications: next }),
    });
    const body = await parseJson(res);
    if (!res.ok) {
      toast.error(body?.error || "Could not save preference");
      return;
    }
    setNotifications(next);
    await refreshUser();
    toast.success("Notification preferences updated!");
  };

  const toggleTheme = async () => {
    const next = theme === "dark" ? "light" : "dark";
    await setMode(next);
  };

  const deleteAccount = async () => {
    if (deleteConfirm !== "DELETE") {
      toast.error('Please type DELETE to confirm');
      return;
    }
    setDeleting(true);
    try {
      const res = await api("/api/users/me", {
        method: "DELETE",
        body: JSON.stringify({ password: deletePassword, confirm: "DELETE" }),
      });
      const body = await parseJson(res);
      if (!res.ok) {
        toast.error(body?.error || "Could not delete account");
        return;
      }
      setUser(null);
      toast.success("Account permanently deleted. We're sorry to see you go.");
      navigate("/login", { replace: true });
    } catch (err) {
      toast.error("An error occurred");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-4xl pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Settings</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Personalize your experience and manage your account security.
        </p>
      </div>

      {/* Preferences Section */}
      <section className="card shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="bg-slate-50/50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> Preferences
          </h2>
        </div>
        <div className="p-6 space-y-8">
          {/* Notifications Toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-10 w-10 shrink-0 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Email Notifications</p>
                <p className="text-sm text-slate-500">Receive updates about your rides and requests</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={notifications}
              onClick={toggleNotifications}
              className={`relative h-7 w-12 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                notifications ? "bg-brand-600" : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ${
                  notifications ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Theme Toggle */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-1 h-10 w-10 shrink-0 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
                {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-white">Appearance</p>
                <p className="text-sm text-slate-500">Switch between light and dark theme</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={theme === "dark"}
              onClick={toggleTheme}
              className={`relative h-7 w-12 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                theme === "dark" ? "bg-brand-600" : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-200 ${
                  theme === "dark" ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="card border-red-200 bg-red-50/30 dark:border-red-900/30 dark:bg-red-950/10 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-red-100 dark:border-red-900/20 bg-red-50/50 dark:bg-red-900/20">
          <h2 className="text-sm font-bold uppercase tracking-widest text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Danger Zone
          </h2>
        </div>
        <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-bold text-slate-900 dark:text-white">Delete Account</p>
            <p className="text-sm text-slate-500">Once deleted, your account cannot be recovered.</p>
          </div>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="btn bg-red-600 text-white hover:bg-red-700 border-none px-6 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" /> Delete Forever
          </button>
        </div>
      </section>

      {/* Delete Confirmation Modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-2xl dark:border-slate-800 dark:bg-slate-950 animate-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
          >
            <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 mx-auto mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white text-center">Are you sure?</h3>
            <p className="mt-2 text-sm text-slate-500 text-center">
              This action is permanent. To confirm, enter your password and type <strong className="text-slate-900 dark:text-white">DELETE</strong> below.
            </p>
            
            <div className="mt-6 space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Confirm Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  className="input h-11"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Verification String</label>
                <input
                  type="text"
                  placeholder='Type "DELETE"'
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  className="input h-11"
                />
              </div>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeletePassword("");
                  setDeleteConfirm("");
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting || deleteConfirm !== "DELETE"}
                onClick={deleteAccount}
                className="btn bg-red-600 text-white hover:bg-red-700 border-none disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

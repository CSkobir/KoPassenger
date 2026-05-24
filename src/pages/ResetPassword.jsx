import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Eye, EyeOff, Car, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api, parseJson } from "../api/client.js";
import { PasswordStrength } from "../components/PasswordStrength.jsx";

const schema = z
  .object({
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [show2, setShow2] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const password = watch("password");

  const onSubmit = async (data) => {
    if (!token) {
      toast.error("Missing reset token in URL");
      return;
    }
    const res = await api("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password: data.password }),
    });
    const body = await parseJson(res);
    if (!res.ok) {
      toast.error(body?.error || "Reset failed");
      return;
    }
    toast.success(body?.message || "Password updated");
    navigate("/login", { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Home / Back button */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/login"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </Link>
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <Car className="h-5 w-5 text-white" />
          </div>
          <span className="text-sm font-bold uppercase tracking-tight text-slate-900 dark:text-white">
            KoPassenger
          </span>
        </Link>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Set new password</h1>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
        Choose a strong password for your account.
      </p>

      {!token && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          No token in the URL. Open the reset link from your email (or dev console).
        </p>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New password</label>
          <div className="relative mt-1">
            <input
              type={show ? "text" : "password"}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-slate-900 outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              {...register("password")}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
              onClick={() => setShow((s) => !s)}
              aria-label={show ? "Hide password" : "Show password"}
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
          )}
          <div className="mt-3">
            <PasswordStrength password={password} />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Confirm password
          </label>
          <div className="relative mt-1">
            <input
              type={show2 ? "text" : "password"}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-slate-900 outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              {...register("confirmPassword")}
              autoComplete="new-password"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500"
              onClick={() => setShow2((s) => !s)}
              aria-label={show2 ? "Hide password" : "Show password"}
            >
              {show2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>
          )}
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !token}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-700 disabled:opacity-60"
        >
          {isSubmitting ? "Saving…" : "Update password"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
        <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
          Back to login
        </Link>
      </p>
      </div>
    </div>
  );
}

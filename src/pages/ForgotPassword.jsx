import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Car, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api, parseJson } from "../api/client.js";

const schema = z.object({
  email: z.string().email("Valid email required"),
});

export function ForgotPassword() {
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data) => {
    const res = await api("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email: data.email }),
    });
    const body = await parseJson(res);
    if (!res.ok) {
      toast.error(body?.error || "Request failed");
      return;
    }
    setDone(true);
    toast.success("Reset link sent!");
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
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Forgot password?</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          No worries — enter your email and we'll send you a reset link.
        </p>

        {done ? (
          <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900 dark:bg-emerald-950/40">
            <p className="font-semibold text-emerald-900 dark:text-emerald-100">📬 Check your inbox!</p>
            <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">
              If an account exists for that email, a reset link has been sent.
              In development, check the API server console for the link.
            </p>
            <Link
              to="/login"
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              <ArrowLeft className="h-3 w-3" /> Return to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input mt-1"
                {...register("email")}
                autoComplete="email"
                placeholder="you@uiu.ac.bd"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary w-full py-2.5"
            >
              {isSubmitting ? "Sending…" : "Send Reset Link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

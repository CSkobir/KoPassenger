import { Link, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Eye, EyeOff, Car, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api, parseJson } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";

const schema = z.object({
  email: z.string().email("Valid email required"),
  password: z.string().min(1, "Password required"),
  rememberMe: z.boolean().optional(),
});

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [show, setShow] = useState(false);

  const searchParams = new URLSearchParams(location.search);
  const redirectTo =
    location.state?.from?.pathname ||
    searchParams.get("redirectTo") ||
    "/dashboard";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const onSubmit = async (data) => {
    const res = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: data.email, password: data.password, rememberMe: data.rememberMe }),
    });
    const body = await parseJson(res);
    if (!res.ok) {
      toast.error(body?.error || "Sign in failed");
      return;
    }
    login(body.user);
    toast.success("Signed in!");
    navigate(redirectTo, { replace: true });
  };

  return (
    <div className="mx-auto w-full max-w-md">
      {/* Home / Back button */}
      <div className="mb-4 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
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
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Welcome back</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Sign in to continue your journey.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <div>
            <label className="label">Email</label>
            <input type="email" className="input mt-1" {...register("email")} autoComplete="email" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="label">Password</label>
              <Link to="/forgot-password" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">
                Forgot password?
              </Link>
            </div>
            <div className="relative mt-1">
              <input
                type={show ? "text" : "password"}
                className="input pr-10"
                {...register("password")}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" className="rounded border-slate-300" {...register("rememberMe")} />
            Remember me
          </label>

          <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full py-2.5">
            {isSubmitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          No account?{" "}
          <Link to="/signup" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}

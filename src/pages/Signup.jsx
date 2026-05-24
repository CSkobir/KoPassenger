import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { Eye, EyeOff, Car, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { api, parseJson } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { PasswordStrength } from "../components/PasswordStrength.jsx";

const schema = z
  .object({
    fullName: z.string().min(1, "Name is required").max(200),
    email: z.string().email("Valid email required"),
    password: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

export function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [show, setShow] = useState(false);
  const [show2, setShow2] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fullName: "", email: "", password: "", confirmPassword: "" },
  });

  const password = watch("password");

  const onSubmit = async (data) => {
    const res = await api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName: data.fullName, email: data.email, password: data.password }),
    });
    const body = await parseJson(res);
    if (!res.ok) {
      toast.error(body?.error || "Could not create account");
      return;
    }
    login(body.user);
    toast.success("Welcome to KoPassenger! 🎉");
    navigate("/dashboard", { replace: true });
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
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Create account</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Join the UIU community ride-sharing platform.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
          <div>
            <label className="label">Full name</label>
            <input className="input mt-1" {...register("fullName")} autoComplete="name" />
            {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName.message}</p>}
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input mt-1" {...register("email")} autoComplete="email" />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative mt-1">
              <input
                type={show ? "text" : "password"}
                className="input pr-10"
                {...register("password")}
                autoComplete="new-password"
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
            <div className="mt-3"><PasswordStrength password={password} /></div>
          </div>
          <div>
            <label className="label">Confirm password</label>
            <div className="relative mt-1">
              <input
                type={show2 ? "text" : "password"}
                className="input pr-10"
                {...register("confirmPassword")}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                onClick={() => setShow2((s) => !s)}
                aria-label={show2 ? "Hide password" : "Show password"}
              >
                {show2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting} className="btn btn-primary w-full py-2.5">
            {isSubmitting ? "Creating…" : "Create Account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:underline dark:text-brand-400">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

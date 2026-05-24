import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRef, useState, useEffect } from "react";
import { Eye, EyeOff, User, Mail, Camera, Lock, Save, LogOut, Star, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { api, parseJson, assetUrl } from "../api/client.js";
import { myReviews } from "../api/rides.js";
import { useAuth } from "../context/AuthContext.jsx";

const profileSchema = z.object({
  fullName: z.string().min(1, "Name is required").max(200),
  email: z.string().email("Valid email required"),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: z.string().min(8, "At least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

export function Profile() {
  const { user, refreshUser, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [show3, setShow3] = useState(false);

  const [reviewsData, setReviewsData] = useState(null);
  const [loadingReviews, setLoadingReviews] = useState(true);

  useEffect(() => {
    myReviews()
      .then((data) => setReviewsData(data))
      .catch((e) => toast.error(e.message))
      .finally(() => setLoadingReviews(false));
  }, []);

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    values: {
      fullName: user?.fullName ?? "",
      email: user?.email ?? "",
    },
  });

  const pwdForm = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSaveProfile = async (data) => {
    const res = await api("/api/users/me", {
      method: "PATCH",
      body: JSON.stringify({ fullName: data.fullName, email: data.email }),
    });
    const body = await parseJson(res);
    if (!res.ok) {
      toast.error(body?.error || "Update failed");
      return;
    }
    await refreshUser();
    toast.success("Profile updated successfully!");
  };

  const onAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("avatar", file);
    try {
      const res = await api("/api/users/me/avatar", { method: "POST", body: fd });
      const body = await parseJson(res);
      if (!res.ok) {
        toast.error(body?.error || "Upload failed");
        return;
      }
      await refreshUser();
      toast.success("Avatar updated!");
    } catch (err) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const onChangePassword = async (data) => {
    const res = await api("/api/users/me/password", {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      }),
    });
    const body = await parseJson(res);
    if (!res.ok) {
      toast.error(body?.error || "Could not change password");
      return;
    }
    pwdForm.reset();
    toast.success("Password changed! Please log in again.");
    logout();
  };

  const avatarSrc = assetUrl(user?.avatarUrl);

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Profile Settings</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Manage your account information and security preferences.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left Column: Avatar & Quick Info */}
        <div className="space-y-6 lg:col-span-1">
          <section className="card card-pad text-center">
            <div className="relative mx-auto h-32 w-32 group">
              <div className="h-full w-full overflow-hidden rounded-full border-4 border-white shadow-md dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                {avatarSrc ? (
                  <img src={avatarSrc} alt={user?.fullName} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-brand-600">
                    {(user?.fullName || "?").slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg hover:bg-brand-700 transition-transform hover:scale-110 disabled:opacity-50"
              >
                <Camera className="h-5 w-5" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onAvatar} />
            </div>
            
            <div className="mt-4">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{user?.fullName}</h3>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-center">
               <button 
                 onClick={() => logout()}
                 className="flex items-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 transition-colors"
               >
                 <LogOut className="h-4 w-4" /> Sign Out
               </button>
            </div>
          </section>

          <div className="card card-pad bg-brand-50/50 border-brand-100 dark:bg-brand-900/10 dark:border-brand-900/20">
            <h4 className="text-xs font-bold uppercase tracking-widest text-brand-700 dark:text-brand-400 mb-2">Account Status</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Your account is verified and active. You can post and join rides on campus routes.
            </p>
          </div>
        </div>

        {/* Right Column: Forms */}
        <div className="space-y-8 lg:col-span-2">
          {/* Details Form */}
          <section className="card card-pad shadow-sm border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
              <User className="h-5 w-5 text-brand-500" /> Personal Details
            </h2>
            <form onSubmit={profileForm.handleSubmit(onSaveProfile)} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="label">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input className="input pl-10" {...profileForm.register("fullName")} />
                  </div>
                  {profileForm.formState.errors.fullName && (
                    <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.fullName.message}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="label">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input type="email" className="input pl-10" {...profileForm.register("email")} />
                  </div>
                  {profileForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-red-600">{profileForm.formState.errors.email.message}</p>
                  )}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={profileForm.formState.isSubmitting}
                  className="btn btn-primary px-6 flex items-center gap-2"
                >
                  <Save className="h-4 w-4" />
                  {profileForm.formState.isSubmitting ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </section>

          {/* Password Form */}
          <section className="card card-pad shadow-sm border-slate-200 dark:border-slate-800">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
              <Lock className="h-5 w-5 text-brand-500" /> Security
            </h2>
            <form onSubmit={pwdForm.handleSubmit(onChangePassword)} className="space-y-4">
              <div className="space-y-1.5">
                <label className="label">Current Password</label>
                <div className="relative">
                  <input
                    type={show1 ? "text" : "password"}
                    className="input pr-10"
                    {...pwdForm.register("currentPassword")}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    onClick={() => setShow1((s) => !s)}
                  >
                    {show1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="label">New Password</label>
                  <div className="relative">
                    <input
                      type={show2 ? "text" : "password"}
                      className="input pr-10"
                      {...pwdForm.register("newPassword")}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      onClick={() => setShow2((s) => !s)}
                    >
                      {show2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="label">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={show3 ? "text" : "password"}
                      className="input pr-10"
                      {...pwdForm.register("confirmPassword")}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      onClick={() => setShow3((s) => !s)}
                    >
                      {show3 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
              
              {pwdForm.formState.errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{pwdForm.formState.errors.confirmPassword.message}</p>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={pwdForm.formState.isSubmitting}
                  className="btn btn-secondary px-6"
                >
                  {pwdForm.formState.isSubmitting ? "Updating…" : "Update Password"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>

      {/* Reviews Section */}
      <section className="card card-pad mt-8 shadow-sm border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Star className="h-5 w-5 text-brand-500" /> My Reviews
          </h2>
          {reviewsData && reviewsData.totalReviews > 0 && (
            <div className="flex items-center gap-1.5 bg-brand-50 dark:bg-brand-900/30 px-3 py-1 rounded-full border border-brand-100 dark:border-brand-800">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              <span className="font-bold text-brand-700 dark:text-brand-300">
                {reviewsData.averageRating}
              </span>
              <span className="text-xs text-brand-600/70 dark:text-brand-400/70">
                ({reviewsData.totalReviews} reviews)
              </span>
            </div>
          )}
        </div>

        {loadingReviews ? (
          <div className="animate-pulse flex flex-col gap-4">
            {[1, 2].map(i => (
              <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800 rounded-xl" />
            ))}
          </div>
        ) : !reviewsData || reviewsData.reviews.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
              <MessageSquare className="h-5 w-5 text-slate-400" />
            </div>
            <p className="text-slate-500 dark:text-slate-400">No reviews yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {reviewsData.reviews.map(review => (
              <div key={review.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/50 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={assetUrl(review.reviewer.avatarUrl)}
                      alt={review.reviewer.fullName}
                      className="h-8 w-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 bg-white"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {review.reviewer.fullName}
                    </p>
                  </div>
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? "fill-amber-400" : "text-slate-300 dark:text-slate-700"}`} />
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 italic">
                    "{review.comment}"
                  </p>
                )}
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-auto pt-2">
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

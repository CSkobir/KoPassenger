import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Star, MapPin, Calendar, MessageSquare, ArrowLeft } from "lucide-react";
import { getPublicProfile } from "../api/users.js";
import { assetUrl } from "../api/client.js";

export function PublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPublicProfile(id)
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-bold text-slate-900 dark:text-white">Profile not found</p>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <button onClick={() => navigate(-1)} className="mt-4 btn btn-secondary px-6">Go Back</button>
      </div>
    );
  }

  const { user, reviews } = profile;

  return (
    <div className="mx-auto max-w-3xl space-y-8 pb-10">
      <button 
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Header Card */}
      <section className="card overflow-hidden border-slate-200 dark:border-slate-800">
        <div className="h-32 bg-gradient-to-r from-brand-600 to-violet-600"></div>
        <div className="px-6 pb-6 sm:px-10">
          <div className="relative -mt-16 mb-4 flex items-end justify-between">
            <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-white shadow-md dark:border-slate-900 bg-slate-100 dark:bg-slate-800">
              {user.avatarUrl ? (
                <img src={assetUrl(user.avatarUrl)} alt={user.fullName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-brand-600">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            
            {user.reviewsCount > 0 && (
              <div className="flex flex-col items-end mb-2">
                <div className="flex items-center gap-1.5 bg-brand-50 dark:bg-brand-900/30 px-3 py-1 rounded-full border border-brand-100 dark:border-brand-800">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span className="font-bold text-brand-700 dark:text-brand-300">
                    {user.rating.toFixed(1)}
                  </span>
                </div>
                <span className="text-xs text-slate-500 mt-1 font-medium">{user.reviewsCount} reviews</span>
              </div>
            )}
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{user.fullName}</h1>
            <div className="mt-2 flex items-center gap-4 text-sm font-medium text-slate-500">
              <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> Joined {new Date(user.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-brand-500" /> Review History
        </h2>

        {reviews.length === 0 ? (
          <div className="card card-pad text-center py-12 bg-slate-50/50 dark:bg-slate-900/20">
            <p className="text-slate-500 dark:text-slate-400">No reviews yet.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {reviews.map(review => (
              <div key={review.id} className="card p-5 border-slate-200 dark:border-slate-800 flex flex-col gap-3 transition-colors hover:border-brand-200 dark:hover:border-brand-800/50">
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
                  <div className="flex text-amber-400 shrink-0">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className={`h-3 w-3 ${i < review.rating ? "fill-amber-400" : "text-slate-200 dark:text-slate-800"}`} />
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-slate-600 dark:text-slate-300 italic flex-1">
                    "{review.comment}"
                  </p>
                )}
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-auto pt-2">
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

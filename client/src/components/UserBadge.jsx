import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { assetUrl } from "../api/client.js";

export function UserBadge({ user, showAvatar = false }) {
  if (!user) return null;

  return (
    <Link 
      to={`/profile/${user.id}`}
      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
      onClick={(e) => e.stopPropagation()} // Prevent triggering parent ride clicks
    >
      {showAvatar && (
        <img
          src={assetUrl(user.avatarUrl)}
          alt={user.fullName}
          className="h-5 w-5 rounded-full object-cover bg-slate-100 dark:bg-slate-900"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
      )}
      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
        {user.fullName.split(' ')[0]}
      </span>
      {user.reviewsCount > 0 ? (
        <div className="flex items-center gap-0.5 text-xs text-slate-600 dark:text-slate-400">
          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
          <span className="font-bold text-slate-700 dark:text-slate-300 ml-0.5">
            {user.rating.toFixed(1)}
          </span>
          <span className="opacity-70">({user.reviewsCount})</span>
        </div>
      ) : (
        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">New</span>
      )}
    </Link>
  );
}

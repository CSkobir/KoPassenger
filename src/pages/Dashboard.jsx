import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import {
  Search, PlusCircle, Car, ListChecks, ArrowRight,
  MapPin, Clock, Users, DollarSign, CheckCircle2,
  Timer, Check, X, User, Activity, TrendingUp,
  AlertCircle, Zap, Flag, Navigation, Star, Play
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import {
  myRides, myRequests, acceptRequest, rejectRequest, completeRide, getRideReviews, cancelRide, startRide
} from "../api/rides.js";
import { fetchRoutes } from "../api/routes.js";
import { ReviewModal } from "../components/ReviewModal.jsx";
import { UserBadge } from "../components/UserBadge.jsx";
import { formatSmartTime } from "../utils/time.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

function timeUntil(iso) {
  const diff = new Date(iso) - Date.now();
  if (diff <= 0) return null; // departed
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m away` : `${m}m away`;
}



function isImminent(iso) {
  const diff = new Date(iso) - Date.now();
  return diff > 0 && diff < 2 * 3_600_000;
}

// ─── skeletons ────────────────────────────────────────────────────────────────

function Shimmer({ className = "" }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800 ${className}`} />;
}

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[...Array(4)].map((_, i) => <Shimmer key={i} className="h-24" />)}
    </div>
  );
}

// ─── stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${bg}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{label}</p>
      </div>
    </div>
  );
}

// ─── co-passenger active ride ───────────────────────────────────────────────────

function ActivePassengerRide({ request, routeLabel }) {
  const inProgress = request.ridePost.status === "IN_PROGRESS";
  const imminent   = isImminent(request.ridePost.departureTime);
  const countdown  = timeUntil(request.ridePost.departureTime);

  const gradientClass = inProgress
    ? "border-violet-300 bg-gradient-to-br from-violet-50 to-purple-50 dark:border-violet-800 dark:from-violet-950/40 dark:to-purple-950/40"
    : imminent
    ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 dark:border-emerald-800 dark:from-emerald-950/40 dark:to-teal-950/40"
    : "border-brand-200 bg-gradient-to-br from-brand-50 to-indigo-50 dark:border-brand-800 dark:from-brand-950/30 dark:to-indigo-950/30";

  const glowClass = inProgress ? "bg-violet-400" : imminent ? "bg-emerald-400" : "bg-brand-400";

  return (
    <div className={`relative overflow-hidden rounded-xl border p-5 shadow-sm ${gradientClass}`}>
      <div className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-30 blur-2xl ${glowClass}`} />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          {/* Status pill */}
          {inProgress ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Trip In Progress
            </span>
          ) : imminent ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              Departing Soon
            </span>
          ) : (
            <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              Confirmed Ride
            </span>
          )}

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400" />
            <span className="font-bold text-slate-900 dark:text-white">{routeLabel}</span>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Clock className="h-3.5 w-3.5 text-brand-500" />
              {formatSmartTime(request.ridePost.departureTime)}
            </span>
            <span className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-brand-500" />
              Organiser: <strong className="ml-1 text-slate-800 dark:text-slate-200">{request.ridePost.owner?.fullName ?? "—"}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
              ৳{request.ridePost.fareTotal}
            </span>
          </div>

          {inProgress && (
            <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">
              🚗 Your ride is underway — waiting for the ride organiser to end the trip.
            </p>
          )}
        </div>

        <div className="shrink-0 text-right">
          {inProgress ? (
            <div className="flex flex-col items-end gap-1">
              <Navigation className="h-7 w-7 text-violet-500 animate-pulse" />
              <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold">En Route</p>
            </div>
          ) : (
            <div>
              <p className="text-2xl font-black text-brand-600 dark:text-brand-400">{countdown}</p>
              <p className="text-xs text-slate-500 mt-0.5">until departure</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── organiser active ride ──────────────────────────────────────────────────────

function ActiveOrganizerRide({ ride, pendingCount, routeLabel, onComplete, onRefresh }) {
  const [starting, setStarting]     = useState(false);
  const [completing, setCompleting] = useState(false);
  const [confirm, setConfirm]       = useState(false);
  const [canceling, setCanceling]   = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  
  const inProgress = ride.status === "IN_PROGRESS";
  const countdown  = timeUntil(ride.departureTime);
  const filled     = ride.seatsTotal - ride.seatsAvailable;

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const { passengers } = await completeRide(ride.id);
      toast.success("Trip marked as completed! 🎉");
      if (passengers && passengers.length > 0) {
        onComplete(ride.id, passengers);
      } else {
        onComplete();
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCompleting(false);
      setConfirm(false);
    }
  };

  const handleStart = async () => {
    setStarting(true);
    try {
      await startRide(ride.id);
      toast.success("Ride started! 🚗");
      if (onRefresh) onRefresh();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setStarting(false);
    }
  };

  const handleCancel = async () => {
    setCanceling(true);
    try {
      await cancelRide(ride.id);
      toast.success("Trip has been cancelled.");
      onComplete();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setCanceling(false);
      setCancelConfirm(false);
    }
  };

  return (
    <div className={`relative overflow-hidden rounded-xl border p-5 shadow-sm ${
      inProgress
        ? "border-violet-300 bg-gradient-to-br from-violet-50 to-purple-50 dark:border-violet-800 dark:from-violet-950/40 dark:to-purple-950/40"
        : "border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-800 dark:from-amber-950/30 dark:to-orange-950/30"
    }`}>
      <div className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-20 blur-2xl ${inProgress ? "bg-violet-400" : "bg-amber-400"}`} />

      <div className="relative space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            {/* Status pill */}
            {inProgress ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                Trip In Progress
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                Your Active Ride
              </span>
            )}

            <div className="flex items-center gap-2">
              <MapPin className={`h-4 w-4 shrink-0 ${inProgress ? "text-violet-600" : "text-amber-600"}`} />
              <span className="font-bold text-slate-900 dark:text-white">{routeLabel}</span>
            </div>

            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1.5 font-medium">
                <Clock className={`h-3.5 w-3.5 ${inProgress ? "text-violet-500" : "text-amber-500"}`} />
                {formatSmartTime(ride.departureTime)}
              </span>
              <span className="flex items-center gap-1.5">
                <Users className={`h-3.5 w-3.5 ${inProgress ? "text-violet-500" : "text-amber-500"}`} />
                {filled}/{ride.seatsTotal} seats filled
              </span>
              <span className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
                ৳{ride.fareTotal}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            {inProgress ? (
              <div className="flex flex-col items-end gap-1">
                <Navigation className="h-7 w-7 text-violet-500 animate-pulse" />
                <p className="text-xs text-violet-600 dark:text-violet-400 font-semibold">En Route</p>
              </div>
            ) : (
              <div className="text-right">
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{countdown}</p>
                <p className="text-xs text-slate-500">until departure</p>
              </div>
            )}
            {pendingCount > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-amber-500 px-2.5 py-0.5 text-xs font-bold text-white">
                <AlertCircle className="h-3 w-3" />
                {pendingCount} pending
              </span>
            )}
          </div>
        </div>

        {/* End Trip & Cancel Actions */}
        <div className="border-t border-slate-200 dark:border-slate-700/50 pt-4 flex flex-col gap-3">
          {["OPEN", "FULL"].includes(ride.status) && !confirm && !cancelConfirm && (
            <button
              type="button"
              disabled={starting}
              onClick={handleStart}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-brand-700 active:scale-[0.98] transition-all sm:w-auto"
            >
              <Play className="h-4 w-4" />
              {starting ? "Starting..." : "Start Ride"}
            </button>
          )}

          {inProgress && !confirm && !cancelConfirm && (
            <button
              type="button"
              onClick={() => setConfirm(true)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-violet-700 active:scale-[0.98] transition-all sm:w-auto"
            >
              <Flag className="h-4 w-4" />
              End Trip &amp; Mark Complete
            </button>
          )}

          {confirm && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Confirm trip is done for all co-passengers?
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={completing}
                  onClick={handleComplete}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-60 transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  {completing ? "Saving…" : "Yes, Complete Trip"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirm(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Close
                </button>
              </div>
            </div>
          )}

          {!confirm && !cancelConfirm && (
            <button
              type="button"
              onClick={() => setCancelConfirm(true)}
              className="inline-flex w-fit items-center justify-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-700 hover:underline transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Cancel this Trip
            </button>
          )}

          {cancelConfirm && (
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center rounded-xl bg-red-50 p-3 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Are you sure you want to cancel? This will notify your co-passengers.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={canceling}
                  onClick={handleCancel}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-60 transition-colors"
                >
                  <AlertCircle className="h-3.5 w-3.5" />
                  {canceling ? "Canceling…" : "Yes, Cancel Trip"}
                </button>
                <button
                  type="button"
                  onClick={() => setCancelConfirm(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors"
                >
                  No, keep it
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── pending requests inbox ───────────────────────────────────────────────────

function PendingRequestsInbox({ rides, routes, onRefresh }) {
  const pending = (rides || [])
    .flatMap((ride) =>
      (ride.requests || [])
        .filter((r) => r.status === "PENDING")
        .map((r) => ({ ...r, ride }))
    )
    .slice(0, 3);

  if (pending.length === 0) return null;

  const onAccept = async (requestId) => {
    try { await acceptRequest(requestId); toast.success("Co-passenger accepted! ✅"); onRefresh(); }
    catch (e) { toast.error(e.message); }
  };

  const onReject = async (requestId) => {
    try { await rejectRequest(requestId); toast.success("Request rejected."); onRefresh(); }
    catch (e) { toast.error(e.message); }
  };

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[10px] font-black text-white">
          {pending.length}
        </span>
        Pending Co-passenger Requests
      </h2>

      <div className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
        {pending.map((req) => {
          const routeLabel = routes?.find((x) => x.id === req.ride.routeId)?.label ?? "Campus Route";
          return (
            <div key={req.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <UserBadge user={req.passenger} showAvatar={true} />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">{routeLabel} · {formatSmartTime(req.ride.departureTime)}</p>
                  </div>
                </div>
              <div className="flex shrink-0 items-center gap-2">
                <button type="button" onClick={() => onAccept(req.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 transition-colors">
                  <Check className="h-3.5 w-3.5" /> Accept
                </button>
                <button type="button" onClick={() => onReject(req.id)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 transition-colors">
                  <X className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <Link to="/my-rides" className="mt-2 block text-right text-xs text-brand-600 hover:underline dark:text-brand-400">
        View all in My Rides →
      </Link>
    </div>
  );
}

// ─── quick actions ────────────────────────────────────────────────────────────

const quickActions = [
  { to: "/find-ride",    icon: Search,      label: "Find a Ride",   desc: "Browse upcoming rides on your route",                   color: "text-brand-600",   bg: "bg-brand-50 dark:bg-brand-900/20"   },
  { to: "/post-ride",   icon: PlusCircle,  label: "Post a Ride",   desc: "Share your commute route with co-passengers",           color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20" },
  { to: "/my-rides",    icon: Car,         label: "My Rides",      desc: "Manage rides you organised and co-passenger requests", color: "text-amber-600",   bg: "bg-amber-50 dark:bg-amber-900/20"   },
  { to: "/my-requests", icon: ListChecks,  label: "My Requests",   desc: "Track rides you've joined as a co-passenger",          color: "text-purple-600",  bg: "bg-purple-50 dark:bg-purple-900/20" },
];

// ─── main component ───────────────────────────────────────────────────────────

export function Dashboard() {
  const { user } = useAuth();
  const first = user?.fullName?.split(" ")[0] || "there";

  const [rides,    setRides]    = useState([]);
  const [requests, setRequests] = useState([]);
  const [routes,   setRoutes]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [reviewState, setReviewState] = useState({ isOpen: false, rideId: null, reviewees: [] });
  const [passengerReviewPrompt, setPassengerReviewPrompt] = useState(null);

  const load = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const [r, rq, rt] = await Promise.all([myRides(), myRequests(), fetchRoutes()]);
      setRides(r);
      setRequests(rq);
      setRoutes(rt);

      // Check for passenger completed rides that need review
      const completedRequests = rq.filter(
        req => req.status === "ACCEPTED" && req.ridePost.status === "COMPLETED"
      );

      // Simple heuristic: just check the most recent completed ride
      if (completedRequests.length > 0) {
        const latest = completedRequests.sort(
          (a, b) => new Date(b.ridePost.departureTime) - new Date(a.ridePost.departureTime)
        )[0];
        
        try {
          const reviews = await getRideReviews(latest.ridePost.id);
          const alreadyReviewed = reviews.some(rev => rev.reviewerId === user.id);
          if (!alreadyReviewed && latest.ridePost.owner) {
            setPassengerReviewPrompt(latest);
          }
        } catch (e) {
          // ignore
        }
      } else {
        setPassengerReviewPrompt(null);
      }
    } catch (e) {
      if (!isBackground) toast.error(e.message);
    } finally {
      if (!isBackground) setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { 
    load(); 
    const interval = setInterval(() => load(true), 10000);
    return () => clearInterval(interval);
  }, [load]);

  // ── stats ──────────────────────────────────────────────────────────────────
  const totalPosted   = rides?.length || 0;
  const acceptedCount = (requests || []).filter((r) => r.status === "ACCEPTED").length;
  const pendingCount  = (requests || []).filter((r) => r.status === "PENDING").length;
  const upcomingRides = (rides || []).filter((r) => ["OPEN", "FULL"].includes(r.status)).length;

  // ── active ride detection ──────────────────────────────────────────────────
  // KEY FIX: we no longer filter by departureTime > now.
  // A ride is "active" until its status becomes COMPLETED or CANCELLED.

  // Passenger: accepted request on a ride that isn't done yet
  const activePassengerRequest = (requests || [])
    .filter((r) =>
      r.status === "ACCEPTED" &&
      !["COMPLETED", "CANCELLED"].includes(r.ridePost.status)
    )
    .sort((a, b) => new Date(a.ridePost.departureTime) - new Date(b.ridePost.departureTime))[0] ?? null;

  // Organiser: their own OPEN, FULL, or IN_PROGRESS ride that isn't done yet
  const activeOrganizerRide = (rides || [])
    .filter((r) => ["OPEN", "FULL", "IN_PROGRESS"].includes(r.status))
    .sort((a, b) => new Date(a.departureTime) - new Date(b.departureTime))[0] ?? null;

  const activeOrganizerPendingCount = activeOrganizerRide
    ? (activeOrganizerRide.requests || []).filter((r) => r.status === "PENDING").length
    : 0;

  const hasActivity = activePassengerRequest || activeOrganizerRide;

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Welcome back, {first}! 👋
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Here's your live commute overview.
        </p>
      </div>

      {/* Stats Strip */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Your Activity
        </h2>
        {loading ? <StatsSkeleton /> : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Rides Posted"        value={totalPosted}   icon={Car}          color="text-amber-600"   bg="bg-amber-50 dark:bg-amber-900/20"     />
            <StatCard label="Confirmed Bookings"  value={acceptedCount} icon={CheckCircle2} color="text-emerald-600" bg="bg-emerald-50 dark:bg-emerald-900/20"  />
            <StatCard label="Pending Requests"    value={pendingCount}  icon={Timer}        color="text-brand-600"   bg="bg-brand-50 dark:bg-brand-900/20"      />
            <StatCard label="Active Rides"        value={upcomingRides} icon={TrendingUp}   color="text-purple-600"  bg="bg-purple-50 dark:bg-purple-900/20"    />
          </div>
        )}
      </div>

      {/* Current Ride Status */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Activity className="h-4 w-4" />
          Current Ride Status
        </h2>

        {loading ? (
          <div className="animate-pulse h-36 rounded-xl bg-slate-200 dark:bg-slate-800" />
        ) : hasActivity ? (
          <div className="space-y-3">
            {activePassengerRequest && (
              <ActivePassengerRide
                request={activePassengerRequest}
                routeLabel={routes?.find((x) => x.id === activePassengerRequest.ridePost.routeId)?.label ?? "Campus Route"}
              />
            )}
            {activeOrganizerRide && (
              <ActiveOrganizerRide
                ride={activeOrganizerRide}
                pendingCount={activeOrganizerPendingCount}
                routeLabel={routes?.find((x) => x.id === activeOrganizerRide.routeId)?.label ?? "Campus Route"}
                onComplete={(rideId, passengers) => {
                  load();
                  if (rideId && passengers) {
                    setReviewState({ isOpen: true, rideId, reviewees: passengers });
                  }
                }}
                onRefresh={load}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 py-10 text-center dark:border-slate-700 dark:bg-slate-900/30">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Zap className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <p className="font-semibold text-slate-700 dark:text-slate-300">No active rides</p>
              <p className="mt-0.5 text-sm text-slate-500">Post a ride or find one to get started!</p>
            </div>
            <div className="flex gap-2">
              <Link to="/find-ride" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                Find a Ride
              </Link>
              <Link to="/post-ride" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                Post a Ride
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Passenger Review Prompt */}
      {passengerReviewPrompt && (
        <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 shadow-sm dark:border-brand-800 dark:bg-brand-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-800 shrink-0">
              <Star className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <p className="font-bold text-brand-900 dark:text-brand-100">Rate your recent ride</p>
              <p className="text-sm text-brand-700 dark:text-brand-300">
                You recently travelled with {passengerReviewPrompt.ridePost.owner.fullName}. How was it?
              </p>
            </div>
          </div>
          <button
            onClick={() => setReviewState({
              isOpen: true,
              rideId: passengerReviewPrompt.ridePost.id,
              reviewees: [passengerReviewPrompt.ridePost.owner]
            })}
            className="shrink-0 rounded-lg bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 shadow-sm"
          >
            Review Organiser
          </button>
        </div>
      )}

      {/* Pending Requests Inbox (organiser) */}
      {!loading && (
        <PendingRequestsInbox rides={rides} routes={routes} onRefresh={load} />
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Quick Actions
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {quickActions.map(({ to, icon: Icon, label, desc, color, bg }) => (
            <Link key={to} to={to}
              className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-900 dark:text-white">{label}</p>
                  <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-hover:translate-x-1" />
                </div>
                <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <ReviewModal
        isOpen={reviewState.isOpen}
        onClose={() => setReviewState({ isOpen: false, rideId: null, reviewees: [] })}
        rideId={reviewState.rideId}
        reviewees={reviewState.reviewees}
        onSuccess={load}
      />
    </div>
  );
}

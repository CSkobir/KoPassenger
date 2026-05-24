import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Check, X, Clock, MapPin, Users, DollarSign, User, MessageSquare, Play, CheckCircle } from "lucide-react";
import { acceptRequest, myRides, rejectRequest, startRide, completeRide, cancelRide } from "../api/rides.js";
import { fetchRoutes } from "../api/routes.js";
import { assetUrl } from "../api/client.js";
import { formatSmartTime } from "../utils/time.js";

function RideSkeleton() {
  return (
    <div className="card overflow-hidden border-slate-200 dark:border-slate-800 animate-pulse">
      <div className="bg-slate-50/50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-3 w-full">
          <div className="flex items-center gap-2">
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
          </div>
          <div className="flex gap-4">
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
      <div className="px-6 py-5">
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded mb-4"></div>
        <div className="h-16 w-full bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const styles = {
    OPEN: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    COMPLETED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
    CANCELLED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${styles[status] || styles.OPEN}`}>
      {status}
    </span>
  );
}

function RequestStatus({ status }) {
  const styles = {
    PENDING: "text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400 border-amber-100 dark:border-amber-900/30",
    ACCEPTED: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30",
    REJECTED: "text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 border-red-100 dark:border-red-900/30",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-md border font-bold uppercase tracking-wider ${styles[status]}`}>
      {status}
    </span>
  );
}

export function MyRides() {
  const [rides, setRides] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const [r, rt] = await Promise.all([myRides(), fetchRoutes()]);
    setRides(r);
    setRoutes(rt);
  };

  const load = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      await refresh();
    } catch (e) {
      if (!isBackground) toast.error(e.message);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    let alive = true;
    const fetchWrapper = async (isBackground) => {
      if (!alive) return;
      try {
        if (!isBackground) setLoading(true);
        await refresh();
      } catch (e) {
        if (!isBackground && alive) toast.error(e.message);
      } finally {
        if (!isBackground && alive) setLoading(false);
      }
    };

    fetchWrapper(false);
    const interval = setInterval(() => {
      if (alive) fetchWrapper(true);
    }, 10000);

    return () => { 
      alive = false; 
      clearInterval(interval); 
    };
  }, []);

  const onAccept = async (requestId) => {
    try {
      await acceptRequest(requestId);
      toast.success("Co-passenger accepted! ✅");
      await refresh();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onReject = async (requestId) => {
    try {
      await rejectRequest(requestId);
      toast.success("Request rejected.");
      await refresh();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onStartRide = async (rideId) => {
    try {
      await startRide(rideId);
      toast.success("Ride started! Passengers notified. 🚗");
      await refresh();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onCompleteRide = async (rideId) => {
    try {
      await completeRide(rideId);
      toast.success("Ride completed! 🏁");
      await refresh();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onCancelRide = async (rideId) => {
    if (!window.confirm("Are you sure you want to cancel this ride? All passengers will be notified.")) return;
    try {
      await cancelRide(rideId);
      toast.success("Ride cancelled.");
      await refresh();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Rides</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Manage the rides you've organised and handle co-passenger join requests.
        </p>
      </div>

      {loading && rides.length === 0 ? (
        <div className="grid gap-6">
          <RideSkeleton />
          <RideSkeleton />
        </div>
      ) : null}

      {!loading && rides.length === 0 ? (
        <div className="card card-pad text-center py-12 bg-slate-50/50 border-dashed border-2">
          <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No rides posted</h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-1">
            You haven't shared any rides yet. Post a ride to invite co-passengers and split the fare.
          </p>
        </div>
      ) : null}

      <div className="grid gap-6">
        {rides.map((ride) => (
          <div key={ride.id} className="card overflow-hidden shadow-sm hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800">
            {/* Ride Header */}
            <div className="bg-slate-50/50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {routes.find((x) => x.id === ride.routeId)?.label ?? "Campus Route"}
                  </h3>
                  <StatusBadge status={ride.status} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Clock className="h-4 w-4 text-brand-500" /> {formatSmartTime(ride.departureTime)}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-brand-500" /> {ride.seatsAvailable}/{ride.seatsTotal} seats
                  </div>
                  <div className="flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-500" /> ৳{ride.fareTotal}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {["OPEN", "FULL"].includes(ride.status) && (
                  <button
                    onClick={() => onStartRide(ride.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 shadow-sm transition-colors"
                  >
                    <Play className="h-4 w-4" /> Start Ride
                  </button>
                )}
                {ride.status === "IN_PROGRESS" && (
                  <button
                    onClick={() => onCompleteRide(ride.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm transition-colors"
                  >
                    <CheckCircle className="h-4 w-4" /> Complete
                  </button>
                )}
                {["OPEN", "FULL", "IN_PROGRESS"].includes(ride.status) && (
                  <button
                    onClick={() => onCancelRide(ride.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-red-900/20 shadow-sm transition-colors"
                  >
                    <X className="h-4 w-4" /> Cancel Trip
                  </button>
                )}
              </div>
            </div>

            {/* Requests Section */}
            <div className="px-6 py-5">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                Join Requests
                <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                  {ride.requests.length}
                </span>
              </h4>

              <div className="space-y-3">
                {ride.requests.map((req) => (
                  <div
                    key={req.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/50 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <Link to={`/profile/${req.passenger.id}`} className="flex flex-1 items-center gap-3 hover:opacity-80 transition-opacity">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-800">
                        {req.passenger.avatarUrl ? (
                          <img src={assetUrl(req.passenger.avatarUrl)} alt={req.passenger.fullName} className="h-full w-full object-cover" />
                        ) : (
                          <User className="h-5 w-5 text-brand-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          {req.passenger.fullName}
                          {req.passenger.reviewsCount > 0 ? (
                            <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-500">
                              ★ {req.passenger.rating.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">New</span>
                          )}
                        </div>
                        <div className="truncate text-xs text-slate-500 mb-1">{req.passenger.email}</div>
                        <RequestStatus status={req.status} />
                      </div>
                    </Link>

                    <div className="flex items-center gap-2">
                      {req.status === "PENDING" ? (
                        <>
                          <Link
                            to={`/chat?rid=${req.id}`}
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100 dark:border-brand-900/30 dark:bg-brand-900/20 dark:text-brand-400 dark:hover:bg-brand-900/40"
                          >
                            <MessageSquare className="h-3.5 w-3.5" /> Message
                          </Link>
                          <button
                            type="button"
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
                            onClick={() => onAccept(req.id)}
                          >
                            <Check className="h-3.5 w-3.5" /> Accept
                          </button>
                          <button
                            type="button"
                            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                            onClick={() => onReject(req.id)}
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </>
                      ) : req.status === "ACCEPTED" ? (
                        <Link
                          to={`/chat?rid=${req.id}`}
                          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100 dark:border-brand-900/30 dark:bg-brand-900/20 dark:text-brand-400 dark:hover:bg-brand-900/40"
                        >
                          <MessageSquare className="h-3.5 w-3.5" /> Message
                        </Link>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">No actions available</span>
                      )}
                    </div>
                  </div>
                ))}
                {ride.requests.length === 0 ? (
                  <div className="text-center py-6 text-sm text-slate-400 border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                    No join requests for this ride yet.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

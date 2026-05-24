import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, MapPin, Clock, Calendar, DollarSign, ArrowRight, CheckCircle2, Loader2, Repeat } from "lucide-react";
import { fetchRoutes } from "../api/routes.js";
import { findRides, requestJoin, myRequests } from "../api/rides.js";
import { getRoutines, subscribeToRoutine } from "../api/routines.js";
import { UserBadge } from "../components/UserBadge.jsx";
import { formatSmartTime } from "../utils/time.js";

function localToISO(localStr) {
  if (!localStr) return "";
  try { return new Date(localStr).toISOString(); } catch { return ""; }
}

function nowLocalDateTime() {
  const d = new Date(), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function defaultToLocalDateTime() {
  const d = new Date(Date.now() + 12*60*60*1000), p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

// ─── skeleton ─────────────────────────────────────────────────────────────────

function RideSkeleton() {
  return (
    <div className="card card-pad overflow-hidden border-slate-200 dark:border-slate-800 animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
          </div>
          <div className="flex gap-4">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        </div>
        <div className="h-10 w-full sm:w-24 bg-slate-200 dark:bg-slate-700 rounded-xl shrink-0"></div>
      </div>
    </div>
  );
}

// ─── join button with 3 states ────────────────────────────────────────────────

function JoinButton({ rideId, seatsAvailable, requested, onJoin }) {
  const [loading, setLoading] = useState(false);

  const isFull      = seatsAvailable === 0;
  const isSent      = requested;

  const handleClick = async () => {
    if (loading || isSent || isFull) return;
    setLoading(true);
    await onJoin(rideId);
    setLoading(false);
  };

  /* ── FULL ── */
  if (isFull) {
    return (
      <button disabled
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl
          bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-400
          dark:bg-slate-800 dark:text-slate-600 cursor-not-allowed sm:w-auto">
        Ride Full
      </button>
    );
  }

  /* ── SENT ── */
  if (isSent) {
    return (
      <div className="inline-flex w-full items-center justify-center gap-2 rounded-xl
        border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold
        text-amber-700 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-400 sm:w-auto">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Request Sent · Pending Review
      </div>
    );
  }

  /* ── LOADING ── */
  if (loading) {
    return (
      <button disabled
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl
          bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white opacity-80 sm:w-auto">
        <Loader2 className="h-4 w-4 animate-spin" />
        Sending…
      </button>
    );
  }

  /* ── DEFAULT ── */
  return (
    <button
      type="button"
      onClick={handleClick}
      className="group/btn inline-flex w-full items-center justify-center gap-2 rounded-xl
        bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm
        hover:bg-brand-700 active:scale-[0.97] transition-all sm:w-auto">
      Join Ride
      <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
    </button>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

export function FindRide() {
  const [routes,        setRoutes]        = useState([]);
  const [routeId,       setRouteId]       = useState("");
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [loading,       setLoading]       = useState(false);
  const [rides,         setRides]         = useState([]);
  const [hasSearched,   setHasSearched]   = useState(false);
  const [fromTime,      setFromTime]      = useState(nowLocalDateTime());
  const [toTime,        setToTime]        = useState(defaultToLocalDateTime());
  const [searchMode,    setSearchMode]    = useState("single"); // "single" | "routine"
  const [routines,      setRoutines]      = useState([]);

  // Set of ridePost IDs the user already has a pending/accepted request for
  const [requestedIds, setRequestedIds]   = useState(new Set());

  // On mount: load routes + pre-populate already-requested ride IDs
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoadingRoutes(true);
        const [rs, reqs] = await Promise.all([fetchRoutes(), myRequests()]);
        if (!alive) return;
        setRoutes(rs);
        setRouteId(rs?.[0]?.id ?? "");

        // Build set of ride IDs the user already requested (active requests only)
        const alreadyRequested = new Set(
          reqs
            .filter((r) => ["PENDING", "ACCEPTED"].includes(r.status))
            .map((r) => r.ridePost?.id)
            .filter(Boolean)
        );
        setRequestedIds(alreadyRequested);
      } catch (e) {
        toast.error(e.message);
      } finally {
        if (alive) setLoadingRoutes(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const onSearch = async (e) => {
    if (e) e.preventDefault();
    if (!routeId) return;
    setLoading(true);
    setHasSearched(true);
    try {
      if (searchMode === "single") {
        const data = await findRides({
          routeId,
          fromTime: localToISO(fromTime),
          toTime:   localToISO(toTime),
        });
        setRides(data);
        if (data.length === 0) toast.info("No rides found. Try expanding your search window.");
      } else {
        const data = await getRoutines(routeId);
        setRoutines(data.routines || []);
        if (data.routines?.length === 0) toast.info("No fixed rides found for this route.");
      }
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const onJoin = async (rideId) => {
    try {
      await requestJoin(rideId);
      // Optimistically mark as requested — button switches immediately
      setRequestedIds((prev) => new Set([...prev, rideId]));
      toast.success("Request sent! The ride organiser will review it soon. 🎉");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onSubscribe = async (routineId) => {
    try {
      await subscribeToRoutine(routineId);
      setRequestedIds((prev) => new Set([...prev, `routine_${routineId}`]));
      toast.success("Subscription requested! The organiser will review it soon. 🎉");
    } catch (e) {
      toast.error(e.message);
    }
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Find a Ride</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Browse upcoming rides and join fellow students on your route.
        </p>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-xl w-fit dark:bg-slate-800">
        <button
          onClick={() => { setSearchMode("single"); setHasSearched(false); }}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${searchMode === "single" ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
        >
          Single Rides
        </button>
        <button
          onClick={() => { setSearchMode("routine"); setHasSearched(false); }}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${searchMode === "routine" ? 'bg-white text-brand-600 shadow-sm dark:bg-slate-700 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
        >
          <Repeat className="w-4 h-4" /> Fixed Rides
        </button>
      </div>

      {/* Search Filter Card */}
      <section className="card card-pad shadow-lg border-brand-100 dark:border-brand-900/30 overflow-visible">
        <form onSubmit={onSearch} className="grid gap-6 md:grid-cols-12 md:items-end">
          <div className={`md:col-span-${searchMode === "single" ? "5" : "11"}`}>
            <label className="label flex items-center gap-1.5 mb-1.5">
              <MapPin className="h-4 w-4 text-brand-500" /> Select Route
            </label>
            <select
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
              className="input h-11"
              disabled={loadingRoutes}
              required
            >
              {loadingRoutes ? (
                <option>Loading routes...</option>
              ) : (
                routes.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)
              )}
            </select>
          </div>

          {searchMode === "single" && (
            <>
              <div className="md:col-span-3">
                <label className="label flex items-center gap-1.5 mb-1.5">
                  <Calendar className="h-4 w-4 text-brand-500" /> Earliest
                </label>
                <input type="datetime-local" value={fromTime}
                  onChange={(e) => setFromTime(e.target.value)} className="input h-11" required />
              </div>

              <div className="md:col-span-3">
                <label className="label flex items-center gap-1.5 mb-1.5">
                  <Clock className="h-4 w-4 text-brand-500" /> Latest
                </label>
                <input type="datetime-local" value={toTime}
                  onChange={(e) => setToTime(e.target.value)} className="input h-11" required />
              </div>
            </>
          )}

          <div className="md:col-span-1">
            <button
              type="submit"
              className="btn btn-primary h-11 w-full md:w-11 flex items-center justify-center p-0"
              disabled={!routeId || loading}
              title="Search"
            >
              {loading
                ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                : <Search className="h-5 w-5" />}
            </button>
          </div>
        </form>
      </section>

      {/* Results Section */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {hasSearched ? (searchMode === "single" ? "Available Rides" : "Available Fixed Rides") : (searchMode === "single" ? "Recommended Rides" : "Recommended Fixed Rides")}
          <span className="text-xs font-normal bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full text-slate-500">
            {searchMode === "single" ? rides.length : routines.length} found
          </span>
        </h2>

        {loading && ((searchMode === "single" && rides.length === 0) || (searchMode === "routine" && routines.length === 0)) && (
          <div className="grid gap-4">
            <RideSkeleton />
            <RideSkeleton />
            <RideSkeleton />
          </div>
        )}

        {!loading && ((searchMode === "single" && rides.length === 0) || (searchMode === "routine" && routines.length === 0)) && hasSearched && (
          <div className="card card-pad text-center py-12 bg-slate-50/50 border-dashed border-2">
            <Search className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              {searchMode === "single" ? "No rides found" : "No fixed rides found"}
            </h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-1">
              We couldn't find any {searchMode === "single" ? "rides matching your route and time." : "fixed rides for this route."} Try expanding your search.
            </p>
          </div>
        )}

        {!hasSearched && rides.length === 0 && routines.length === 0 && (
          <div className="card card-pad bg-brand-50/30 border-brand-100 dark:bg-brand-900/10 dark:border-brand-900/20 text-center py-10">
            <p className="text-slate-600 dark:text-slate-400">Select a route and time to start searching for rides.</p>
          </div>
        )}

        <div className="grid gap-4">
          {searchMode === "single" ? (
            rides.map((ride) => (
              <div
                key={ride.id}
                className="group card card-pad hover:shadow-md transition-all border-slate-200
                  hover:border-brand-300 dark:border-slate-800 dark:hover:border-brand-800"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {routes.find((r) => r.id === ride.routeId)?.label ?? "Route Detail"}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        ride.seatsAvailable > 0
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}>
                        {ride.seatsAvailable > 0 ? `${ride.seatsAvailable} seats left` : "Full"}
                      </span>
                      {requestedIds.has(ride.id) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase
                          tracking-wider text-amber-600 dark:text-amber-400">
                          <CheckCircle2 className="h-3 w-3" /> Requested
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock className="h-4 w-4 text-brand-500" />
                        {formatSmartTime(ride.departureTime)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                        ৳{ride.fareTotal} fare
                      </div>
                      <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-4">
                        <UserBadge user={ride.owner} showAvatar={true} />
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <JoinButton
                      rideId={ride.id}
                      seatsAvailable={ride.seatsAvailable}
                      requested={requestedIds.has(ride.id)}
                      onJoin={onJoin}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            routines.map((routine) => (
              <div
                key={routine.id}
                className="group card card-pad hover:shadow-md transition-all border-slate-200
                  hover:border-brand-300 dark:border-slate-800 dark:hover:border-brand-800"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        {routes.find((r) => r.id === routine.routeId)?.label ?? "Route Detail"}
                      </span>
                      <span className="bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center gap-1">
                        <Repeat className="w-3 h-3" /> Fixed Ride
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        routine.seatsAvailable > 0
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      }`}>
                        {routine.seatsAvailable > 0 ? `${routine.seatsAvailable} seats left` : "Full"}
                      </span>
                      {requestedIds.has(`routine_${routine.id}`) && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase
                          tracking-wider text-amber-600 dark:text-amber-400">
                          <CheckCircle2 className="h-3 w-3" /> Requested
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="h-4 w-4 text-brand-500" />
                        {routine.daysOfWeek.length === 7 ? "Every day" : routine.daysOfWeek.length === 5 && !routine.daysOfWeek.includes(0) && !routine.daysOfWeek.includes(6) ? "Weekdays" : routine.daysOfWeek.map(d => dayNames[d]).join(', ')}
                      </div>
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock className="h-4 w-4 text-brand-500" />
                        {routine.departureTime}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                        ৳{routine.fareTotal} fare
                      </div>
                      <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-4">
                        <UserBadge user={routine.owner} showAvatar={true} />
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <JoinButton
                      rideId={routine.id}
                      seatsAvailable={routine.seatsAvailable}
                      requested={requestedIds.has(`routine_${routine.id}`)}
                      onJoin={onSubscribe}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

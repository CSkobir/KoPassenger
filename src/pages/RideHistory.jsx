import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  History, Car, Users, MapPin, Clock, DollarSign,
  CheckCircle2, XCircle, Star, ChevronRight, CalendarDays,
  ArrowUpRight, ArrowDownLeft
} from "lucide-react";
import { myRides, myRequests } from "../api/rides.js";
import { fetchRoutes } from "../api/routes.js";

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(iso) {
  return new Date(iso).toLocaleString([], {
    weekday: "short", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString([], {
    year: "numeric", month: "long", day: "numeric",
  });
}

// Group items by month label
function groupByMonth(items, getDate) {
  const groups = {};
  for (const item of items) {
    const d = new Date(getDate(item));
    const key = d.toLocaleDateString([], { year: "numeric", month: "long" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

// ─── status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    COMPLETED: { label: "Completed", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400", Icon: CheckCircle2 },
    CANCELLED: { label: "Cancelled", cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", Icon: XCircle },
    REJECTED:  { label: "Rejected",  cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", Icon: XCircle },
    OPEN:      { label: "Open",      cls: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400", Icon: null },
    FULL:      { label: "Full",      cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", Icon: null },
  };
  const { label, cls, Icon } = map[status] || map.OPEN;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cls}`}>
      {Icon && <Icon className="h-3 w-3" />}
      {label}
    </span>
  );
}

// ─── stars ────────────────────────────────────────────────────────────────────

function Stars({ rating }) {
  if (!rating) return null;
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3 w-3 ${s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-300 dark:text-slate-700"}`}
        />
      ))}
      <span className="ml-1 text-xs text-slate-500">{Number(rating).toFixed(1)}</span>
    </span>
  );
}

// ─── organised ride card ──────────────────────────────────────────────────────

function OrgCard({ ride, routes }) {
  const route = routes.find((r) => r.id === ride.routeId);
  const accepted = (ride.requests || []).filter((r) => r.status === "ACCEPTED");
  const farePerSeat = accepted.length > 0
    ? Math.round(ride.fareTotal / (accepted.length + 1))
    : ride.fareTotal;

  return (
    <div className="group relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900">
      {/* Left accent line */}
      <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-amber-400 dark:bg-amber-500" />

      {/* Icon */}
      <div className="ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-900/20">
        <ArrowUpRight className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-0.5">
              Organised by you
            </p>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {route?.label ?? ride.routeId}
            </p>
          </div>
          <StatusBadge status={ride.status} />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-brand-500" />
            {fmt(ride.departureTime)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5 text-brand-500" />
            {accepted.length} co-passenger{accepted.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
            ৳{ride.fareTotal} total
            {accepted.length > 0 && (
              <span className="text-slate-400"> (≈৳{farePerSeat}/seat)</span>
            )}
          </span>
        </div>

        {/* Co-passengers list */}
        {accepted.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {accepted.map((req) => (
              <div key={req.id} className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 dark:bg-slate-800">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[9px] font-bold text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                  {req.passenger?.fullName?.slice(0, 1).toUpperCase() ?? "?"}
                </div>
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {req.passenger?.fullName ?? "Co-passenger"}
                </span>
                <Stars rating={req.passenger?.rating} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── joined ride card ─────────────────────────────────────────────────────────

function JoinedCard({ request, routes }) {
  const ride = request.ridePost;
  const route = routes.find((r) => r.id === ride.routeId);

  return (
    <div className="group relative flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 dark:border-slate-800 dark:bg-slate-900">
      {/* Left accent line */}
      <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-brand-400 dark:bg-brand-600" />

      {/* Icon */}
      <div className="ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-900/20">
        <ArrowDownLeft className="h-5 w-5 text-brand-600 dark:text-brand-400" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 mb-0.5">
              Joined as co-passenger
            </p>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {route?.label ?? ride.routeId}
            </p>
          </div>
          <StatusBadge status={request.status === "ACCEPTED" ? ride.status : request.status} />
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-brand-500" />
            {fmt(ride.departureTime)}
          </span>
          <span className="flex items-center gap-1">
            <DollarSign className="h-3.5 w-3.5 text-emerald-500" />
            ৳{ride.fareTotal}
          </span>
        </div>

        {/* Organiser info */}
        {ride.owner && (
          <div className="flex items-center gap-2 pt-1">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {ride.owner.fullName?.slice(0, 1).toUpperCase() ?? "?"}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Organised by <span className="font-semibold text-slate-700 dark:text-slate-300">{ride.owner.fullName}</span>
            </span>
            <Stars rating={ride.owner.rating} />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── empty state ──────────────────────────────────────────────────────────────

function Empty({ message }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-16 text-center dark:border-slate-800 dark:bg-slate-900/30">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
        <History className="h-7 w-7 text-slate-400" />
      </div>
      <p className="font-semibold text-slate-600 dark:text-slate-400">{message}</p>
      <p className="mt-1 text-sm text-slate-400 dark:text-slate-600">Your completed rides will appear here.</p>
    </div>
  );
}

// ─── month group ──────────────────────────────────────────────────────────────

function MonthGroup({ label, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-4 w-4 text-slate-400" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <div className="flex-1 border-t border-slate-200 dark:border-slate-800" />
      </div>
      {children}
    </div>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "all",      label: "All History" },
  { id: "organised", label: "Rides I Organised" },
  { id: "joined",   label: "Rides I Joined" },
];

const DONE_STATUSES = ["COMPLETED", "CANCELLED"];

export function RideHistory() {
  const [pastRides,    setPastRides]    = useState([]);  // organised rides (COMPLETED/CANCELLED)
  const [pastRequests, setPastRequests] = useState([]);  // joined rides (done)
  const [routes,       setRoutes]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [tab,          setTab]          = useState("all");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [rides, requests, rts] = await Promise.all([myRides(), myRequests(), fetchRoutes()]);
        if (!alive) return;

        // Only keep finished ones for history
        setPastRides(
          rides
            .filter((r) => DONE_STATUSES.includes(r.status))
            .sort((a, b) => new Date(b.departureTime) - new Date(a.departureTime))
        );
        setPastRequests(
          requests
            .filter((r) =>
              DONE_STATUSES.includes(r.ridePost?.status) ||
              ["REJECTED", "CANCELLED"].includes(r.status)
            )
            .sort((a, b) => new Date(b.ridePost?.departureTime) - new Date(a.ridePost?.departureTime))
        );
        setRoutes(rts);
      } catch (e) {
        toast.error(e.message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ── merge & sort for "All" tab ─────────────────────────────────────────────
  const allItems = [
    ...pastRides.map((r) => ({ type: "organised", date: r.departureTime, data: r })),
    ...pastRequests.map((r) => ({ type: "joined", date: r.ridePost?.departureTime, data: r })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  // ── grouped by month ───────────────────────────────────────────────────────
  const allGroups      = groupByMonth(allItems,      (i) => i.date);
  const orgGroups      = groupByMonth(pastRides,     (r) => r.departureTime);
  const joinedGroups   = groupByMonth(pastRequests,  (r) => r.ridePost?.departureTime);

  const totalCompleted =
    pastRides.filter((r) => r.status === "COMPLETED").length +
    pastRequests.filter((r) => r.ridePost?.status === "COMPLETED" && r.status === "ACCEPTED").length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold text-slate-900 dark:text-white">
            <History className="h-7 w-7 text-brand-600" />
            Ride History
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-400">
            All your past rides — ones you organised and ones you joined as a co-passenger.
          </p>
        </div>

        {/* Stats pill */}
        {!loading && (
          <div className="flex shrink-0 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/20">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-xl font-black text-slate-900 dark:text-white">{totalCompleted}</p>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Trips Completed</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={[
              "flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition-all",
              tab === t.id
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-800 dark:text-white"
                : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
          ))}
        </div>
      ) : (
        <>
          {/* ALL TAB */}
          {tab === "all" && (
            <div className="space-y-8">
              {Object.keys(allGroups).length === 0 ? (
                <Empty message="No ride history yet" />
              ) : (
                Object.entries(allGroups).map(([month, items]) => (
                  <MonthGroup key={month} label={month}>
                    {items.map((item, i) =>
                      item.type === "organised" ? (
                        <OrgCard key={`org-${item.data.id}-${i}`} ride={item.data} routes={routes} />
                      ) : (
                        <JoinedCard key={`joined-${item.data.id}-${i}`} request={item.data} routes={routes} />
                      )
                    )}
                  </MonthGroup>
                ))
              )}
            </div>
          )}

          {/* ORGANISED TAB */}
          {tab === "organised" && (
            <div className="space-y-8">
              {Object.keys(orgGroups).length === 0 ? (
                <Empty message="You haven't organised any rides yet" />
              ) : (
                Object.entries(orgGroups).map(([month, rides]) => (
                  <MonthGroup key={month} label={month}>
                    {rides.map((ride) => (
                      <OrgCard key={ride.id} ride={ride} routes={routes} />
                    ))}
                  </MonthGroup>
                ))
              )}
            </div>
          )}

          {/* JOINED TAB */}
          {tab === "joined" && (
            <div className="space-y-8">
              {Object.keys(joinedGroups).length === 0 ? (
                <Empty message="You haven't joined any rides yet" />
              ) : (
                Object.entries(joinedGroups).map(([month, reqs]) => (
                  <MonthGroup key={month} label={month}>
                    {reqs.map((req) => (
                      <JoinedCard key={req.id} request={req} routes={routes} />
                    ))}
                  </MonthGroup>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

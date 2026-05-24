import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Clock, MapPin, User, CheckCircle2, XCircle, Timer, ExternalLink, Check, X, Undo2, MessageSquare } from "lucide-react";
import { myRequests, myRides, acceptRequest, rejectRequest, cancelRequest } from "../api/rides.js";
import { fetchRoutes } from "../api/routes.js";
import { UserBadge } from "../components/UserBadge.jsx";
import { assetUrl } from "../api/client.js";
import { formatSmartTime } from "../utils/time.js";

function RequestSkeleton() {
  return (
    <div className="card card-pad border-slate-200 dark:border-slate-800 animate-pulse">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3 w-full">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-slate-200 dark:bg-slate-700"></div>
            <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
          <div className="flex gap-4">
            <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
            <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-20 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
            <div className="h-5 w-24 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestStatusBadge({ status }) {
  const configs = {
    PENDING: { icon: Timer, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-100 dark:border-amber-900/30" },
    ACCEPTED: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-100 dark:border-emerald-900/30" },
    REJECTED: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-100 dark:border-red-900/30" },
    CANCELLED: { icon: XCircle, color: "text-slate-600", bg: "bg-slate-50 dark:bg-slate-900/20", border: "border-slate-200 dark:border-slate-800" },
  };
  
  const { icon: Icon, color, bg, border } = configs[status] || configs.PENDING;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider ${color} ${bg} ${border}`}>
      <Icon className="h-3.5 w-3.5" />
      {status}
    </span>
  );
}

export function MyRequests() {
  const [activeTab, setActiveTab] = useState("sent"); // "sent" | "received"
  const [items, setItems] = useState([]);
  const [received, setReceived] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use a ref to store the load function so we can use it in onAccept/onReject
  const loadRef = useRef(null);

  useEffect(() => {
    let alive = true;
    const load = async (isBackground = false) => {
      if (!alive) return;
      try {
        if (!isBackground) setLoading(true);
        const [reqs, rts, rds] = await Promise.all([myRequests(), fetchRoutes(), myRides()]);
        if (!alive) return;
        setItems(reqs);
        setRoutes(rts);
        
        // Extract all requests received on the user's organized rides
        const allReceived = rds.flatMap(ride => 
          ride.requests.map(req => ({ ...req, ridePost: ride }))
        ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        setReceived(allReceived);
      } catch (e) {
        if (!isBackground && alive) toast.error(e.message);
      } finally {
        if (!isBackground && alive) setLoading(false);
      }
    };

    loadRef.current = load;

    load(false);
    const interval = setInterval(() => {
      if (alive) load(true);
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
      if (loadRef.current) loadRef.current(true);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onReject = async (requestId) => {
    try {
      await rejectRequest(requestId);
      toast.success("Request rejected.");
      if (loadRef.current) loadRef.current(true);
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onCancel = async (requestId) => {
    try {
      await cancelRequest(requestId);
      toast.success("Request withdrawn.");
      if (loadRef.current) loadRef.current(true);
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">My Join Requests</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Manage join requests you've sent to others, or received on your own rides.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab("sent")}
          className={`px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "sent"
              ? "border-brand-600 text-brand-600 dark:text-brand-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Requests Sent
        </button>
        <button
          onClick={() => setActiveTab("received")}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-colors border-b-2 ${
            activeTab === "received"
              ? "border-brand-600 text-brand-600 dark:text-brand-400"
              : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          }`}
        >
          Requests Received
          {received.filter(r => r.status === "PENDING").length > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
              {received.filter(r => r.status === "PENDING").length}
            </span>
          )}
        </button>
      </div>

      {loading && items.length === 0 && received.length === 0 ? (
        <div className="grid gap-4">
          <RequestSkeleton />
          <RequestSkeleton />
          <RequestSkeleton />
        </div>
      ) : null}

      {/* REQUESTS SENT */}
      {activeTab === "sent" && !loading && items.length === 0 ? (
        <div className="card card-pad text-center py-12 bg-slate-50/50 border-dashed border-2">
          <Clock className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No requests sent</h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-1">
            You haven't requested to join any rides yet. Head over to the Find Ride page to start browsing.
          </p>
          <Link to="/find-ride" className="btn btn-primary mt-4 inline-flex">Find a Ride</Link>
        </div>
      ) : null}

      {activeTab === "sent" && items.length > 0 && (
        <div className="grid gap-4">
          {items.map((r) => (
            <div
              key={r.id}
              className="group card card-pad hover:shadow-md transition-all border-slate-200 dark:border-slate-800"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center">
                      <MapPin className="h-4 w-4 text-brand-600" />
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {routes.find((x) => x.id === r.ridePost.routeId)?.label ?? "Campus Route"}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Clock className="h-4 w-4 text-brand-500" />
                      {formatSmartTime(r.ridePost.departureTime)}
                    </div>
                    <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-700 pl-4">
                      <UserBadge user={r.ridePost.owner} showAvatar={true} />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-wrap">
                    <RequestStatusBadge status={r.status} />
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${r.ridePost.status === 'IN_PROGRESS' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 animate-pulse' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}>
                      Ride: {r.ridePost.status}
                    </span>
                    {["PENDING", "ACCEPTED"].includes(r.status) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (r.status === "ACCEPTED" && !window.confirm("Are you sure you want to cancel your confirmed booking? The driver will be notified.")) return;
                          onCancel(r.id);
                        }}
                        className="ml-auto flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      >
                        {r.status === "PENDING" ? <Undo2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {r.status === "PENDING" ? "Undo Request" : "Cancel Booking"}
                      </button>
                    )}
                  </div>
                </div>

                {r.status === "ACCEPTED" && (
                  <div className="shrink-0 pt-1 flex flex-col gap-2 items-end">
                    <div className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 px-3 py-2 rounded-lg border border-emerald-100 dark:border-emerald-900/30 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      You're confirmed for this ride!
                    </div>
                    <Link
                      to={`/chat?rid=${r.id}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100 dark:border-brand-900/30 dark:bg-brand-900/20 dark:text-brand-400 dark:hover:bg-brand-900/40"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Message Driver
                    </Link>
                  </div>
                )}
                {r.status === "PENDING" && (
                  <div className="shrink-0 pt-1 flex flex-col gap-2 items-end">
                    <Link
                      to={`/chat?rid=${r.id}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100 dark:border-brand-900/30 dark:bg-brand-900/20 dark:text-brand-400 dark:hover:bg-brand-900/40"
                    >
                      <MessageSquare className="h-3.5 w-3.5" /> Message Driver
                    </Link>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* REQUESTS RECEIVED */}
      {activeTab === "received" && !loading && received.length === 0 ? (
        <div className="card card-pad text-center py-12 bg-slate-50/50 border-dashed border-2">
          <User className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No requests received</h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-1">
            You haven't received any join requests on your posted rides yet.
          </p>
        </div>
      ) : null}

      {activeTab === "received" && received.length > 0 && (
        <div className="grid gap-4">
          {received.map((req) => (
            <div
              key={req.id}
              className="group card card-pad hover:shadow-md transition-all border-slate-200 dark:border-slate-800 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-1 flex-col gap-3">
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                  <MapPin className="h-4 w-4 text-brand-500" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {routes.find((x) => x.id === req.ridePost.routeId)?.label ?? "Campus Route"}
                  </span>
                  <span>·</span>
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500 font-medium">{formatSmartTime(req.ridePost.departureTime)}</p>
                  </div>
                </div>

                <Link to={`/profile/${req.passenger.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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
                    <RequestStatusBadge status={req.status} />
                  </div>
                </Link>
              </div>

              <div className="flex items-center gap-2 sm:self-center">
                {req.status === "PENDING" ? (
                  <div className="flex w-full gap-2 sm:w-auto">
                    <Link
                      to={`/chat?rid=${req.id}`}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100 dark:border-brand-900/30 dark:bg-brand-900/20 dark:text-brand-400 dark:hover:bg-brand-900/40"
                    >
                      <MessageSquare className="h-4 w-4" /> Message
                    </Link>
                    <button
                      type="button"
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm"
                      onClick={() => onAccept(req.id)}
                    >
                      <Check className="h-4 w-4" /> Accept
                    </button>
                    <button
                      type="button"
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                      onClick={() => onReject(req.id)}
                    >
                      <X className="h-4 w-4" /> Reject
                    </button>
                  </div>
                ) : req.status === "ACCEPTED" ? (
                  <Link
                    to={`/chat?rid=${req.id}`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs font-bold text-brand-700 hover:bg-brand-100 dark:border-brand-900/30 dark:bg-brand-900/20 dark:text-brand-400 dark:hover:bg-brand-900/40"
                  >
                    <MessageSquare className="h-4 w-4" /> Message
                  </Link>
                ) : (
                  <span className="text-[10px] text-slate-400 italic">No actions available</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


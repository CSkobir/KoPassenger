import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Check, X, Clock, Users, DollarSign, User, Calendar, Repeat } from "lucide-react";
import { getMyRoutines, acceptSubscription, cancelSubscription, toggleRoutine } from "../api/routines.js";
import { fetchRoutes } from "../api/routes.js";
import { assetUrl } from "../api/client.js";

function StatusBadge({ status }) {
  const styles = {
    PENDING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    ACCEPTED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    CANCELLED: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${styles[status] || styles.PENDING}`}>
      {status}
    </span>
  );
}

export function MyFixedRides() {
  const [asOrganizer, setAsOrganizer] = useState([]);
  const [asSubscriber, setAsSubscriber] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const refresh = async () => {
    try {
      const [data, rt] = await Promise.all([getMyRoutines(), fetchRoutes()]);
      setAsOrganizer(data.asOrganizer || []);
      setAsSubscriber(data.asSubscriber || []);
      setRoutes(rt);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const onAccept = async (subId) => {
    try {
      await acceptSubscription(subId);
      toast.success("Co-passenger accepted into your fixed ride! ✅");
      await refresh();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onCancelSub = async (subId, isOrganizer) => {
    try {
      await cancelSubscription(subId);
      toast.success(isOrganizer ? "Subscription rejected." : "Subscription cancelled.");
      await refresh();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const onToggle = async (routineId) => {
    try {
      await toggleRoutine(routineId);
      toast.success("Fixed ride status updated.");
      await refresh();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
          <Repeat className="w-8 h-8 text-brand-500" />
          My Fixed Rides
        </h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Manage your daily fixed rides and co-passengers.
        </p>
      </div>

      {asOrganizer.length === 0 && asSubscriber.length === 0 && (
        <div className="card card-pad text-center py-12 bg-slate-50/50 border-dashed border-2">
          <Repeat className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No fixed rides found</h3>
          <p className="text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            You don't have any fixed rides yet.
          </p>
          <div className="flex justify-center gap-3">
            <Link to="/post-ride" className="btn btn-primary px-4 py-2 text-sm">Create Fixed Ride</Link>
            <Link to="/find-ride" className="btn btn-secondary px-4 py-2 text-sm">Find Fixed Ride</Link>
          </div>
        </div>
      )}

      {/* As Organizer */}
      {asOrganizer.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Fixed Rides I Organize</h2>
          <div className="grid gap-6">
            {asOrganizer.map((routine) => (
              <div key={routine.id} className={`card overflow-hidden shadow-sm hover:shadow-md transition-shadow border-slate-200 dark:border-slate-800 ${!routine.isActive && 'opacity-60 grayscale'}`}>
                <div className="bg-slate-50/50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 dark:text-white">
                        {routes.find((x) => x.id === routine.routeId)?.label ?? "Campus Route"}
                      </h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${routine.isActive ? 'bg-brand-100 text-brand-700' : 'bg-slate-200 text-slate-700'}`}>
                        {routine.isActive ? "ACTIVE" : "PAUSED"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Calendar className="h-4 w-4 text-brand-500" /> 
                        {routine.daysOfWeek.length === 7 ? "Every day" : routine.daysOfWeek.length === 5 && !routine.daysOfWeek.includes(0) && !routine.daysOfWeek.includes(6) ? "Weekdays" : routine.daysOfWeek.map(d => dayNames[d]).join(', ')}
                      </div>
                      <div className="flex items-center gap-1.5 font-medium">
                        <Clock className="h-4 w-4 text-brand-500" /> {routine.departureTime}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-brand-500" /> {routine.seatsTotal} total seats
                      </div>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => onToggle(routine.id)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${routine.isActive ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
                    >
                      {routine.isActive ? "Pause Fixed Ride" : "Resume Fixed Ride"}
                    </button>
                  </div>
                </div>

                <div className="px-6 py-5">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
                    Fixed Co-passengers
                  </h4>
                  <div className="space-y-3">
                    {routine.subscribers.map((sub) => (
                      <div key={sub.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/50 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 rounded-full bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-800">
                            {sub.passenger.avatarUrl ? (
                              <img src={assetUrl(sub.passenger.avatarUrl)} alt={sub.passenger.fullName} className="h-full w-full object-cover" />
                            ) : (
                              <User className="h-5 w-5 text-brand-600" />
                            )}
                          </div>
                          <div>
                            <div className="truncate text-sm font-bold text-slate-900 dark:text-white">
                              {sub.passenger.fullName}
                            </div>
                            <StatusBadge status={sub.status} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {sub.status === "PENDING" && (
                            <>
                              <button onClick={() => onAccept(sub.id)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700 shadow-sm">
                                <Check className="h-3.5 w-3.5" /> Accept
                              </button>
                              <button onClick={() => onCancelSub(sub.id, true)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                                <X className="h-3.5 w-3.5" /> Reject
                              </button>
                            </>
                          )}
                          {sub.status === "ACCEPTED" && (
                            <button onClick={() => onCancelSub(sub.id, true)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 px-3 py-1.5 text-xs font-bold hover:bg-red-100 dark:bg-red-900/20 dark:border-red-900/30">
                              <X className="h-3.5 w-3.5" /> Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {routine.subscribers.length === 0 && (
                      <div className="text-center py-6 text-sm text-slate-400 border border-dashed rounded-xl border-slate-200 dark:border-slate-800">
                        No one has subscribed to this fixed ride yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* As Subscriber */}
      {asSubscriber.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Fixed Commutes</h2>
          <div className="grid gap-4">
            {asSubscriber.map((sub) => (
              <div key={sub.id} className="card card-pad border-slate-200 dark:border-slate-800">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">
                      {routes.find((x) => x.id === sub.schedule.routeId)?.label ?? "Campus Route"}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400 mb-3">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-brand-500" />
                        {sub.schedule.daysOfWeek.length === 7 ? "Every day" : sub.schedule.daysOfWeek.length === 5 && !sub.schedule.daysOfWeek.includes(0) && !sub.schedule.daysOfWeek.includes(6) ? "Weekdays" : sub.schedule.daysOfWeek.map(d => dayNames[d]).join(', ')}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-brand-500" /> {sub.schedule.departureTime}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <DollarSign className="h-4 w-4 text-emerald-500" /> ৳{sub.schedule.fareTotal}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full overflow-hidden bg-slate-200">
                          {sub.schedule.owner.avatarUrl ? (
                            <img src={assetUrl(sub.schedule.owner.avatarUrl)} className="h-full w-full object-cover" />
                          ) : (
                            <User className="h-4 w-4 m-auto text-slate-400" />
                          )}
                        </div>
                        <span className="text-sm font-medium">{sub.schedule.owner.fullName}</span>
                      </div>
                      <StatusBadge status={sub.status} />
                    </div>
                  </div>
                  <div>
                    {['PENDING', 'ACCEPTED'].includes(sub.status) && (
                      <button onClick={() => onCancelSub(sub.id, false)} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 px-4 py-2 text-xs font-bold hover:bg-red-100 transition-colors">
                        <X className="h-4 w-4" /> Cancel Subscription
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

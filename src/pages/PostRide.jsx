import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Car, ArrowLeft, Clock, MapPin, Users, DollarSign, Calendar, Repeat } from "lucide-react";
import { fetchRoutes } from "../api/routes.js";
import { createRide } from "../api/rides.js";
import { createRoutine } from "../api/routines.js";

/** Convert a local datetime-local string ("2026-05-02T15:30") → ISO string */
function localToISO(localStr) {
  return new Date(localStr).toISOString();
}

/** Get a default value for datetime-local input: 30 min from now, in local time */
function defaultLocalDateTime() {
  const d = new Date(Date.now() + 30 * 60 * 1000);
  // datetime-local needs "YYYY-MM-DDTHH:mm"
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Minimum value for the picker: now (so users can't pick the past) */
function minLocalDateTime() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostRide() {
  const navigate = useNavigate();
  const [routes, setRoutes] = useState([]);
  const [routeId, setRouteId] = useState("");
  const [departureTime, setDepartureTime] = useState(defaultLocalDateTime());
  const [fareTotal, setFareTotal] = useState(200);
  const [seatsTotal, setSeatsTotal] = useState(2);
  const [isRoutine, setIsRoutine] = useState(false);
  const [routineTime, setRoutineTime] = useState("08:30");
  const [daysOfWeek, setDaysOfWeek] = useState([1, 2, 3, 4, 5]); // Default Mon-Fri
  const [submitting, setSubmitting] = useState(false);

  const toggleDay = (dayIndex) => {
    setDaysOfWeek((prev) => 
      prev.includes(dayIndex) 
        ? prev.filter(d => d !== dayIndex) 
        : [...prev, dayIndex].sort()
    );
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetchRoutes();
        if (!alive) return;
        setRoutes(r);
        setRouteId(r?.[0]?.id ?? "");
      } catch (e) {
        toast.error(e.message);
      }
    })();
    return () => { alive = false; };
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!routeId) return;
    if (isRoutine && daysOfWeek.length === 0) {
      toast.error("Please select at least one day for your fixed ride.");
      return;
    }
    setSubmitting(true);
    try {
      if (isRoutine) {
        await createRoutine({
          routeId,
          departureTime: routineTime,
          daysOfWeek,
          fareTotal: Number(fareTotal),
          seatsTotal: Number(seatsTotal),
        });
        toast.success("Fixed ride created! Rides will be generated daily. 🎉");
      } else {
        await createRide({
          routeId,
          departureTime: localToISO(departureTime),
          fareTotal: Number(fareTotal),
          seatsTotal: Number(seatsTotal),
        });
        toast.success("Ride posted successfully! 🎉");
      }
      navigate(isRoutine ? "/my-fixed-rides" : "/my-rides");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>

      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Post a Ride</h1>
        <p className="mt-1 text-slate-500 dark:text-slate-400">
          Share your commute route with co-passengers and split the fare.
        </p>
      </div>

      <div className="flex bg-slate-100 p-1 rounded-xl w-fit dark:bg-slate-800">
        <button
          type="button"
          onClick={() => setIsRoutine(false)}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${!isRoutine ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
        >
          One-time Ride
        </button>
        <button
          type="button"
          onClick={() => setIsRoutine(true)}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isRoutine ? 'bg-white text-brand-600 shadow-sm dark:bg-slate-700 dark:text-brand-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
        >
          <Repeat className="w-4 h-4" /> Fixed Ride
        </button>
      </div>

      <form onSubmit={onSubmit} className="card card-pad max-w-2xl space-y-6">

        {/* Route */}
        <div>
          <label className="label flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-brand-500" /> Route
          </label>
          <select
            value={routeId}
            onChange={(e) => setRouteId(e.target.value)}
            className="input mt-1"
            required
          >
            {routes.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>

        {/* Time / Fixed Ride Schedule */}
        {!isRoutine ? (
          <div>
            <label className="label flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-brand-500" /> Departure Date &amp; Time
            </label>
            <input
              type="datetime-local"
              className="input mt-1"
              value={departureTime}
              min={minLocalDateTime()}
              onChange={(e) => setDepartureTime(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-slate-400">Pick when your ride will depart.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-brand-500" /> Daily Departure Time
              </label>
              <input
                type="time"
                className="input mt-1"
                value={routineTime}
                onChange={(e) => setRoutineTime(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-brand-500" /> Days of Week
              </label>
              <div className="mt-1 flex gap-1 flex-wrap">
                {dayNames.map((day, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => toggleDay(idx)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${daysOfWeek.includes(idx) ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'}`}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-400">Pick days you commute.</p>
            </div>
          </div>
        )}

        {/* Fare & Seats */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label flex items-center gap-1.5">
              <DollarSign className="h-4 w-4 text-brand-500" /> Total Fare (৳)
            </label>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFareTotal((f) => Math.max(0, Number(f) - 10))}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-lg font-bold hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                −
              </button>
              <input
                type="number"
                min="0"
                max="1000000"
                step="1"
                value={fareTotal}
                onChange={(e) => setFareTotal(e.target.value)}
                className="input text-center"
              />
              <button
                type="button"
                onClick={() => setFareTotal((f) => Number(f) + 10)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-lg font-bold hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                +
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">Total fare to be split among all co-passengers.</p>
          </div>

          <div>
            <label className="label flex items-center gap-1.5">
              <Users className="h-4 w-4 text-brand-500" /> Available Seats
            </label>
            <div className="mt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSeatsTotal((s) => Math.max(1, Number(s) - 1))}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-lg font-bold hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                −
              </button>
              <input
                type="number"
                min="1"
                max="20"
                value={seatsTotal}
                onChange={(e) => setSeatsTotal(e.target.value)}
                className="input text-center"
              />
              <button
                type="button"
                onClick={() => setSeatsTotal((s) => Math.min(20, Number(s) + 1))}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-lg font-bold hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                +
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">Max 20 seats per ride.</p>
          </div>
        </div>

        {/* Summary preview */}
        {routeId && (
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 dark:border-brand-900/30 dark:bg-brand-900/20">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-400">
              {isRoutine ? "Fixed Ride Preview" : "Ride Preview"}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-900 dark:text-white">
              {routes.find(r => r.id === routeId)?.label}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {isRoutine ? (
                <>
                  🔄 Every {daysOfWeek.length === 7 ? "day" : daysOfWeek.length === 5 && !daysOfWeek.includes(0) && !daysOfWeek.includes(6) ? "Weekday" : daysOfWeek.map(d => dayNames[d]).join(', ')} at {routineTime}
                </>
              ) : (
                <>
                  🕐 {new Date(departureTime).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </>
              )}
              &nbsp;·&nbsp; {seatsTotal} seat{seatsTotal > 1 ? "s" : ""} &nbsp;·&nbsp; ৳{fareTotal}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={submitting || !routeId}
            className="btn btn-primary px-8 py-2.5"
          >
            {submitting ? "Posting…" : "Post Ride"}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn btn-secondary px-6 py-2.5"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

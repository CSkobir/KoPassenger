import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Car, Shield, Zap, Users, MapPin, Clock, CircleDot } from "lucide-react";
import { fetchPublicRides } from "../api/rides.js";
import { fetchRoutes } from "../api/routes.js";

function fmt(iso) {
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Landing() {
  const [rides, setRides] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [r, rt] = await Promise.all([fetchPublicRides(), fetchRoutes()]);
        setRides(r);
        setRoutes(rt);
      } catch (e) {
        console.error("Failed to fetch landing data", e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-slate-200/50 bg-white/70 backdrop-blur-xl dark:border-slate-800/50 dark:bg-slate-950/70">
        <div className="container-app flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 shadow-lg shadow-brand-600/20">
              <Car className="h-6 w-6 text-white" />
            </div>
            <div className="leading-tight">
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white uppercase">
                KoPassenger
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-sm font-semibold text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-500">
              Log in
            </Link>
            <Link to="/signup" className="btn btn-primary px-5">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-grow pt-16">
        {/* Hero Section */}
        <section className="relative overflow-hidden px-4 pb-20 pt-24 sm:px-6 lg:px-8 lg:pt-32">
          <div className="absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-0 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-500/10 blur-[120px] dark:bg-brand-500/5"></div>
          </div>
          
          <div className="container-app text-center">
            <div className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700 dark:border-brand-900/30 dark:bg-brand-900/20 dark:text-brand-400">
              <span className="mr-1">New:</span> Live ride previews enabled!
            </div>
            <h1 className="mt-8 text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-7xl">
              Commuting <span className="text-brand-600">Simplified</span>.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
              Join the smart way to travel. Connect with fellow students, share rides, 
              reduce your carbon footprint, and save on travel costs. All in one place.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/signup" className="btn btn-primary h-14 px-8 text-base">
                Join Now <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <Link to="/login?redirectTo=/find-ride" className="btn btn-secondary h-14 px-8 text-base">
                Browse All Rides
              </Link>
            </div>
          </div>
        </section>

        {/* Live Rides Preview Section */}
        <section className="py-12">
          <div className="container-app">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Live Rides</h2>
                <p className="text-sm text-slate-500">Upcoming departures from fellow students.</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full dark:bg-emerald-900/20 dark:text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                Updating Live
              </div>
            </div>

            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-48 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
                ))}
              </div>
            ) : rides.length > 0 ? (
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {rides.map(ride => (
                  <div key={ride.id} className="card card-pad group relative overflow-hidden transition-all hover:shadow-md border-l-4 border-l-brand-500">
                    <div className="flex justify-between items-start mb-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-brand-600 uppercase tracking-wider">
                          <CircleDot className="h-3 w-3" />
                          {routes.find(r => r.id === ride.routeId)?.label || ride.routeId}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                          <Clock className="h-4 w-4 text-slate-400" />
                          {fmt(ride.departureTime)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-slate-900 dark:text-white">৳{ride.fareTotal}</div>
                        <div className="text-[10px] text-slate-500 uppercase font-bold">Per Seat</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-6 w-6 rounded-full border-2 border-white bg-slate-200 dark:border-slate-900 dark:bg-slate-800"></div>
                          ))}
                        </div>
                        <span className="text-xs text-slate-500 font-medium">
                          {ride.seatsAvailable} seats left
                        </span>
                      </div>
                      <Link to={`/login?redirectTo=/find-ride`} className="text-xs font-bold text-brand-600 hover:underline">
                        Join Ride
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                <p className="text-slate-500">No rides scheduled for today yet. Be the first!</p>
                <Link to="/login?redirectTo=/post-ride" className="mt-4 inline-block text-brand-600 font-bold hover:underline">Post a Ride</Link>
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="bg-slate-100/50 py-24 dark:bg-slate-900/50">
          <div className="container-app">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
                Why KoPassenger?
              </h2>
              <p className="mt-4 text-slate-600 dark:text-slate-400">
                Built specifically for university commuting needs.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Student Verified",
                  description: "Safe and secure environment restricted to verified community members.",
                  icon: Shield,
                  color: "text-emerald-500",
                  bg: "bg-emerald-500/10"
                },
                {
                  title: "Cost Effective",
                  description: "Split fare costs and save significantly on daily commutes.",
                  icon: Zap,
                  color: "text-amber-500",
                  bg: "bg-amber-500/10"
                },
                {
                  title: "Community Driven",
                  description: "Meet classmates and build networks while on the move.",
                  icon: Users,
                  color: "text-brand-500",
                  bg: "bg-brand-500/10"
                }
              ].map((feature, idx) => (
                <div key={idx} className="card card-pad group transition-all hover:-translate-y-1 hover:shadow-lg">
                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${feature.bg}`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className="py-24">
          <div className="container-app">
            <div className="relative overflow-hidden rounded-3xl bg-brand-600 px-8 py-16 text-center text-white shadow-2xl">
              <div className="relative z-10">
                <h2 className="text-3xl font-bold sm:text-4xl">Ready to start sharing?</h2>
                <p className="mt-4 text-brand-100 text-lg">
                  Join hundreds of students already using KoPassenger.
                </p>
                <div className="mt-10 flex justify-center gap-4">
                  <Link to="/signup" className="rounded-xl bg-white px-8 py-4 text-base font-bold text-brand-600 shadow-xl transition-all hover:bg-brand-50">
                    Create Free Account
                  </Link>
                </div>
              </div>
              {/* Abstract shapes */}
              <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"></div>
              <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-brand-400/20 blur-3xl"></div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 dark:border-slate-800 dark:bg-slate-950">
        <div className="container-app flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <Car className="h-5 w-5 text-brand-600" />
            <span className="font-bold text-slate-900 dark:text-white">KoPassenger</span>
          </div>
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} KoPassenger. Built for UIU Community.
          </p>
          <div className="flex gap-6 text-sm font-medium text-slate-500">
            <a href="#" className="hover:text-brand-600">Privacy</a>
            <a href="#" className="hover:text-brand-600">Terms</a>
            <a href="#" className="hover:text-brand-600">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

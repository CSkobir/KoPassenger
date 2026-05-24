import { api, parseJson } from "./client.js";

export async function createRoutine(data) {
  const res = await api("/api/routines", {
    method: "POST",
    body: JSON.stringify(data),
  });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not create fixed ride");
  return body.routine;
}

export async function getRoutines(routeId) {
  const url = routeId ? `/api/routines?routeId=${encodeURIComponent(routeId)}` : "/api/routines";
  const res = await api(url);
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not load fixed rides");
  return body;
}

export async function getMyRoutines() {
  const res = await api("/api/routines/me");
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not load your fixed rides");
  return body;
}

export async function subscribeToRoutine(routineId) {
  const res = await api(`/api/routines/${routineId}/subscribe`, {
    method: "POST",
  });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not subscribe to fixed ride");
  return body.subscription;
}

export async function acceptSubscription(subId) {
  const res = await api(`/api/routines/subscriptions/${subId}/accept`, {
    method: "POST",
  });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not accept subscription");
  return body.subscription;
}

export async function cancelSubscription(subId) {
  const res = await api(`/api/routines/subscriptions/${subId}/cancel`, {
    method: "POST",
  });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not cancel subscription");
  return body.subscription;
}

export async function toggleRoutine(routineId) {
  const res = await api(`/api/routines/${routineId}/toggle`, {
    method: "PATCH",
  });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not toggle fixed ride status");
  return body.routine;
}

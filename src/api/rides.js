import { api, parseJson } from "./client.js";

export async function createRide(input) {
  const res = await api("/api/rides", {
    method: "POST",
    body: JSON.stringify(input),
  });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not create ride");
  return body.ride;
}

export async function findRides(params) {
  const qs = new URLSearchParams(params);
  const res = await api(`/api/rides?${qs.toString()}`);
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not load rides");
  return body.rides;
}

export async function requestJoin(rideId) {
  const res = await api(`/api/rides/${rideId}/request`, { method: "POST" });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not request ride");
  return body.request;
}

export async function myRequests() {
  const res = await api("/api/rides/me/requests");
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not load requests");
  return body.requests;
}

export async function myRides() {
  const res = await api("/api/rides/mine");
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not load rides");
  return body.rides;
}

export async function acceptRequest(requestId) {
  const res = await api(`/api/rides/requests/${requestId}/accept`, { method: "POST" });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not accept request");
  return body;
}

export async function rejectRequest(requestId) {
  const res = await api(`/api/rides/requests/${requestId}/reject`, { method: "POST" });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not reject request");
  return body.request;
}

export async function completeRide(rideId) {
  const res = await api(`/api/rides/${rideId}/complete`, { method: "POST" });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not complete ride");
  return body; // { ride, passengers }
}

export async function startRide(rideId) {
  const res = await api(`/api/rides/${rideId}/start`, { method: "POST" });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not start ride");
  return body.ride;
}

export async function submitReview(rideId, { revieweeId, rating, comment }) {
  const res = await api(`/api/rides/${rideId}/reviews`, {
    method: "POST",
    body: JSON.stringify({ revieweeId, rating, comment }),
  });
  const body = await parseJson(res);
  if (!res.ok) {
    const detailsMsg = body?.details ? JSON.stringify(body.details) : "";
    throw new Error(`${body?.error || "Could not submit review"} ${detailsMsg}`.trim());
  }
  return body.review;
}

export async function getRideReviews(rideId) {
  const res = await api(`/api/rides/${rideId}/reviews`);
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not load reviews");
  return body.reviews;
}

export async function myReviews() {
  const res = await api("/api/users/me/reviews");
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not load reviews");
  return body; // { reviews, averageRating, totalReviews }
}

export async function cancelRequest(requestId) {
  const res = await api(`/api/rides/requests/${requestId}/cancel`, { method: "POST" });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not cancel request");
  return body.request;
}

export async function cancelRide(rideId) {
  const res = await api(`/api/rides/${rideId}/cancel`, { method: "POST" });
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not cancel ride");
  return body.ride;
}

export async function fetchPublicRides() {
  const res = await api("/api/rides/public");
  const body = await parseJson(res);
  if (!res.ok) throw new Error(body?.error || "Could not load public rides");
  return body.rides;
}


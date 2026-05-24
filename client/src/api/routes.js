import { api, parseJson } from "./client.js";

export async function fetchRoutes() {
  const res = await api("/api/routes");
  const body = await parseJson(res);
  if (!res.ok) {
    throw new Error(body?.error || "Failed to load routes");
  }
  return body.routes;
}


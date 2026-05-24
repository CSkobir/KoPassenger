const BASE = import.meta.env.VITE_API_URL ?? "";

function buildUrl(path) {
  if (path.startsWith("http")) return path;
  return `${BASE}${path}`;
}

let refreshPromise = null;

/**
 * @param {string} path
 * @param {RequestInit & { _retry?: boolean }} [options]
 */
export async function api(path, options = {}) {
  const { _retry, ...init } = options;
  const headers = { ...init.headers };
  const isForm = init.body instanceof FormData;
  if (!isForm && init.body && typeof init.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  const res = await fetch(buildUrl(path), {
    ...init,
    credentials: "include",
    headers,
  });

  if (res.status === 401 && !_retry) {
    if (!refreshPromise) {
      refreshPromise = fetch(buildUrl("/api/auth/refresh"), {
        method: "POST",
        credentials: "include",
      }).finally(() => {
        refreshPromise = null;
      });
    }

    const refresh = await refreshPromise;
    if (refresh.ok) {
      return api(path, { ...options, _retry: true });
    }
  }

  return res;
}

export async function parseJson(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function assetUrl(relative) {
  if (!relative) return null;
  if (relative.startsWith("http")) return relative;
  return `${BASE}${relative}`;
}

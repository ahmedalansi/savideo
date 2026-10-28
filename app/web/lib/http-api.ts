// Real data layer: talks to the FastAPI service described in architecture.md.
import { ApiError, type DataLayer, type ErrorCode, type Quota } from "./types";

async function call<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError("network");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const err = body?.error ?? {};
    throw new ApiError((err.code as ErrorCode) ?? "network", err.message, err.retry_at ?? null, (err.quota as Quota) ?? null);
  }
  return body as T;
}

export function httpApi(base: string): DataLayer {
  return {
    resolveMedia: (url) => call(base, "/media/resolve", { method: "POST", body: JSON.stringify({ url }) }),
    resolvePlaylist: (url) => call(base, "/playlists/resolve", { method: "POST", body: JSON.stringify({ url }) }),
    createDownload: (req) => call(base, "/downloads", { method: "POST", body: JSON.stringify(req) }),
    getQuota: () => call(base, "/quota"),
    submitTakedown: (req) => call(base, "/takedowns", { method: "POST", body: JSON.stringify(req) }),
  };
}

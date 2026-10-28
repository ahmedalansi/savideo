import type { PlatformId } from "./types";

export interface PlatformDef {
  id: PlatformId;
  name: string;
  hosts: string[];
  audio: boolean;
}

// The brief's seven. Host matching here is only for instant feedback in the
// browser; the API does the authoritative check.
export const PLATFORMS: PlatformDef[] = [
  { id: "youtube", name: "YouTube", hosts: ["youtube.com", "youtu.be", "youtube-nocookie.com"], audio: true },
  { id: "facebook", name: "Facebook", hosts: ["facebook.com", "fb.watch", "fb.com"], audio: true },
  { id: "x", name: "X", hosts: ["x.com", "twitter.com"], audio: false },
  { id: "reddit", name: "Reddit", hosts: ["reddit.com", "redd.it"], audio: true },
  { id: "dailymotion", name: "Dailymotion", hosts: ["dailymotion.com", "dai.ly"], audio: true },
  { id: "bilibili", name: "Bilibili", hosts: ["bilibili.com", "b23.tv"], audio: true },
  { id: "twitch", name: "Twitch", hosts: ["twitch.tv"], audio: true },
];

export function parseUrl(raw: string): URL | null {
  const s = raw.trim();
  if (!s || s.length > 2048 || /\s/.test(s)) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!u.hostname.includes(".")) return null;
    return u;
  } catch {
    return null;
  }
}

export function detectPlatform(u: URL): PlatformDef | null {
  const host = u.hostname.toLowerCase().replace(/^(www|m|mobile)\./, "");
  return PLATFORMS.find((p) => p.hosts.some((h) => host === h || host.endsWith(`.${h}`))) ?? null;
}

/** A YouTube playlist link without a video id. A watch link with &list= is one video. */
export function isPlaylist(u: URL): boolean {
  const p = detectPlatform(u);
  return p?.id === "youtube" && u.pathname === "/playlist" && u.searchParams.has("list");
}

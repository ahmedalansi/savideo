// Fake data layer with the same signatures as the real one (lib/http-api.ts).
// Lets every screen run before /replica-backend exists. Seed links and the
// words that trigger each error are listed in README.md.
import { detectPlatform, isPlaylist, parseUrl, PLATFORMS } from "./platforms";
import {
  ApiError,
  type DataLayer,
  type DownloadRequest,
  type ErrorCode,
  type MediaFormat,
  type MediaInfo,
  type PlatformId,
  type Quota,
} from "./types";

const LIMIT = 3;
const MAX_DURATION_S = 3 * 3600;
const MAX_BYTES = 4e9;
const QUOTA_KEY = "sv.fake.quota";
const media = new Map<string, MediaInfo>();

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function thumb(seed: number, label: string): string {
  const hue = seed % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue} 60% 45%)"/><stop offset="1" stop-color="hsl(${(hue + 50) % 360} 65% 25%)"/></linearGradient></defs><rect width="320" height="180" fill="url(#g)"/><circle cx="160" cy="90" r="28" fill="rgba(255,255,255,.85)"/><path d="M152 76 L174 90 L152 104 Z" fill="hsl(${hue} 60% 35%)"/><text x="12" y="168" font-family="sans-serif" font-size="13" fill="rgba(255,255,255,.8)">${label}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const SEEDS: Record<string, { title: string; duration_s: number; maxHeight: number }> = {
  demo: { title: "Morning tide timelapse over a rocky coast (demo clip)", duration_s: 214, maxHeight: 2160 },
  long: {
    title: "A very long title to check clamping: notes from a full-day walking tour through old harbour streets and markets",
    duration_s: 4210,
    maxHeight: 1080,
  },
  arabic: { title: "جولة قصيرة في سوق قديم مع موسيقى هادئة", duration_s: 96, maxHeight: 1080 },
};

export const DEMO_URL = "https://www.youtube.com/watch?v=demo";

const TRIGGERS: [string, ErrorCode][] = [
  ["private", "private_video"],
  ["removed", "removed_video"],
  ["agegate", "age_restricted"],
  ["live", "live_stream"],
  ["geo", "geo_blocked"],
  ["toolong", "too_long"],
  ["busy", "busy"],
  ["paused", "platform_down"],
  ["offline", "network"],
];

function buildFormats(platform: PlatformId, seed: number, duration: number, maxHeight: number): MediaFormat[] {
  const heights = [2160, 1440, 1080, 720, 480, 360].filter((h) => h <= maxHeight);
  // Rough bytes per second for each height, in the range real sites serve.
  const bps: Record<number, number> = { 2160: 2.6e6, 1440: 1.3e6, 1080: 6.2e5, 720: 3.4e5, 480: 1.6e5, 360: 9e4 };
  const formats: MediaFormat[] = heights.map((h) => ({
    format_id: `v${h}`,
    kind: "video",
    height: h,
    ext: "mp4",
    size_estimate: Math.round(bps[h] * duration * (0.9 + (seed % 20) / 100)),
    needs_merge: platform === "youtube" ? h > 720 : h > 1080,
  }));
  if (PLATFORMS.find((p) => p.id === platform)?.audio) {
    formats.push({ format_id: "a192", kind: "audio", height: null, ext: "mp3", size_estimate: 24000 * duration, needs_merge: false, abr_kbps: 192 });
    formats.push({ format_id: "a128", kind: "audio", height: null, ext: "mp3", size_estimate: 16000 * duration, needs_merge: false, abr_kbps: 128 });
  }
  return formats;
}

function nextHour(): Date {
  const d = new Date();
  d.setUTCMinutes(0, 0, 0);
  d.setUTCHours(d.getUTCHours() + 1);
  return d;
}

function readQuota(): Quota {
  const resets = nextHour().toISOString();
  try {
    const raw = JSON.parse(localStorage.getItem(QUOTA_KEY) ?? "null");
    if (raw && raw.resets_at === resets) return { used: raw.used, limit: LIMIT, resets_at: resets };
  } catch {}
  return { used: 0, limit: LIMIT, resets_at: resets };
}

function writeQuota(q: Quota) {
  try {
    localStorage.setItem(QUOTA_KEY, JSON.stringify(q));
  } catch {}
}

export const fakeApi: DataLayer = {
  async resolveMedia(raw) {
    await wait(900);
    const u = parseUrl(raw);
    if (!u) throw new ApiError("invalid_url");
    const p = detectPlatform(u);
    if (!p) throw new ApiError("unsupported_site");
    const text = u.href.toLowerCase();
    const hit = TRIGGERS.find(([word]) => text.includes(word));
    if (hit?.[1] === "busy" && !sessionStorage.getItem("sv.fake.busy")) {
      sessionStorage.setItem("sv.fake.busy", "1");
      throw new ApiError("busy", "busy", new Date(Date.now() + 3000).toISOString());
    }
    if (hit && hit[1] !== "busy") throw new ApiError(hit[1]);

    const seedKey = Object.keys(SEEDS).find((k) => text.includes(k));
    const seed = hash(u.href);
    const base = seedKey
      ? SEEDS[seedKey]
      : { title: `Sample ${p.name} video ${seed % 1000}`, duration_s: 45 + (seed % 900), maxHeight: [2160, 1080, 720][seed % 3] };
    if (base.duration_s > MAX_DURATION_S) throw new ApiError("too_long");
    const info: MediaInfo = {
      media_id: `m_${seed.toString(36)}`,
      platform: p.id,
      title: base.title,
      duration_s: base.duration_s,
      thumbnail_url: text.includes("nothumb") ? null : thumb(seed, p.name),
      formats: buildFormats(p.id, seed, base.duration_s, base.maxHeight),
      audio_supported: p.audio,
    };
    media.set(info.media_id, info);
    return info;
  },

  async resolvePlaylist(raw) {
    await wait(900);
    const u = parseUrl(raw);
    if (!u || !isPlaylist(u)) throw new ApiError("invalid_url");
    const seed = hash(u.href);
    return {
      title: `Sample playlist ${seed % 100}`,
      items: Array.from({ length: 6 }, (_, i) => ({
        url: `https://www.youtube.com/watch?v=pl${seed % 1000}x${i}`,
        title: `Part ${i + 1}: sample playlist video`,
        duration_s: 60 + ((seed >> i) % 600),
        thumbnail_url: thumb(seed + i * 40, "YouTube"),
      })),
    };
  },

  async createDownload(req: DownloadRequest) {
    await wait(600);
    const info = media.get(req.media_id);
    const fmt = info?.formats.find((f) => f.format_id === req.format_id);
    if (!info || !fmt) throw new ApiError("removed_video");
    const q = readQuota();
    if (q.used >= q.limit) throw new ApiError("quota_exceeded", "quota_exceeded", q.resets_at, q);
    const start = req.trim_start_s ?? 0;
    const end = req.trim_end_s ?? info.duration_s;
    const size = fmt.size_estimate == null ? null : Math.round((fmt.size_estimate * (end - start)) / info.duration_s);
    if (size != null && size > MAX_BYTES) throw new ApiError("too_large");
    const quota = { ...q, used: q.used + 1 };
    writeQuota(quota);
    const label = fmt.kind === "audio" ? `${fmt.abr_kbps}kbps` : `${fmt.height}p`;
    const params = new URLSearchParams({ title: info.title, label, ext: fmt.ext });
    return {
      download_url: `/api/fake-download?${params}`,
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      size_estimate: size,
      quota,
    };
  },

  async getQuota() {
    return readQuota();
  },

  async submitTakedown() {
    await wait(700);
    return { id: "fake", status: "new" };
  },
};

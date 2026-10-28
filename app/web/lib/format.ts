export function formatDuration(total: number): string {
  const s = Math.max(0, Math.round(total));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

/** Accepts s, m:ss, mm:ss or h:mm:ss. Returns null when it can't be read. */
export function parseTime(raw: string): number | null {
  const s = raw.trim();
  if (!/^\d+(:\d{1,2}){0,2}$/.test(s)) return null;
  const parts = s.split(":").map(Number);
  if (parts.length > 1 && parts.slice(1).some((p) => p > 59)) return null;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

export function formatBytes(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

/** Estimated size of a clip, assuming a roughly constant bitrate. */
export function clipSize(full: number | null, duration: number, start: number, end: number): number | null {
  if (full == null || duration <= 0) return full;
  return Math.max(1, Math.round((full * (end - start)) / duration));
}

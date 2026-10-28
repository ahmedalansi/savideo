// Shapes match the API contract in replica/architecture.md, so the fake and
// the real data layer are interchangeable.

export type PlatformId = "youtube" | "facebook" | "x" | "reddit" | "dailymotion" | "bilibili" | "twitch" | "instagram";

export type FormatKind = "video" | "audio";

export interface MediaFormat {
  format_id: string;
  kind: FormatKind;
  height: number | null;
  ext: string;
  size_estimate: number | null;
  needs_merge: boolean;
  abr_kbps?: number;
}

export interface MediaInfo {
  media_id: string;
  platform: PlatformId;
  title: string;
  duration_s: number;
  thumbnail_url: string | null;
  formats: MediaFormat[];
  audio_supported: boolean;
}

export interface PlaylistInfo {
  title: string;
  items: { url: string; title: string; duration_s: number; thumbnail_url: string | null }[];
}

export interface Quota {
  used: number;
  limit: number;
  resets_at: string;
}

export interface DownloadRequest {
  media_id: string;
  format_id: string;
  kind: FormatKind;
  trim_start_s?: number;
  trim_end_s?: number;
}

export interface DownloadTicket {
  download_url: string;
  expires_at: string;
  size_estimate: number | null;
  quota: Quota;
}

export type ErrorCode =
  | "invalid_url"
  | "unsupported_site"
  | "private_video"
  | "removed_video"
  | "age_restricted"
  | "live_stream"
  | "geo_blocked"
  | "too_long"
  | "too_large"
  | "busy"
  | "platform_down"
  | "network"
  | "quota_exceeded"
  | "blocked"
  | "link_expired"
  | "rate_limited"
  | "invalid_request";

export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message = code,
    public retry_at: string | null = null,
    public quota: Quota | null = null,
  ) {
    super(message);
  }
}

export interface TakedownRequest {
  claimant_name: string;
  claimant_email: string;
  work_description: string;
  urls: string[];
  statement_good_faith: true;
  statement_accuracy: true;
  signature: string;
}

export interface DataLayer {
  resolveMedia(url: string): Promise<MediaInfo>;
  resolvePlaylist(url: string): Promise<PlaylistInfo>;
  createDownload(req: DownloadRequest): Promise<DownloadTicket>;
  getQuota(): Promise<Quota>;
  submitTakedown(req: TakedownRequest): Promise<{ id: string; status: string }>;
}

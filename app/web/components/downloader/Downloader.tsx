"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { PlayCircle } from "lucide-react";
import { api, isFake } from "@/lib/api";
import { DEMO_URL } from "@/lib/fake-api";
import { detectPlatform, isPlaylist, parseUrl, PLATFORMS } from "@/lib/platforms";
import { usePrefs, type RecentItem } from "@/lib/prefs";
import { ApiError, type ErrorCode, type MediaInfo, type PlaylistInfo, type Quota } from "@/lib/types";
import { Button } from "../ui/Button";
import { StatusMessage } from "../ui/StatusMessage";
import { MediaCardSkeleton } from "./MediaCard";
import { PlaylistResult } from "./PlaylistResult";
import { QuotaMeter } from "./QuotaMeter";
import { RecentDownloads } from "./RecentDownloads";
import { ResultPanel } from "./ResultPanel";
import { UrlInput } from "./UrlInput";
import { useToast } from "../ui/Toast";

type View =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; code: ErrorCode; retryIn?: number }
  | { kind: "media"; info: MediaInfo; url: string }
  | { kind: "playlist"; list: PlaylistInfo };

const INPUT_ERRORS: ErrorCode[] = ["invalid_url", "unsupported_site"];
// The "try a demo" link: a seed in demo mode, or a public test video set at build time.
const DEMO = isFake ? DEMO_URL : process.env.NEXT_PUBLIC_DEMO_URL;

/** S01 to S07 on one page: input, processing, result, trim, download, gate, playlist. */
export function Downloader() {
  const { t, prefs } = usePrefs();
  const [url, setUrl] = useState("");
  const [view, setView] = useState<View>({ kind: "idle" });
  const [quota, setQuota] = useState<Quota | null>(null);
  // A recent download being fetched again, numbered so the same one can be replayed twice.
  const [replay, setReplay] = useState<{ item: RecentItem; n: number } | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const retryTimer = useRef<ReturnType<typeof setInterval>>(undefined);
  const toast = useToast();

  useEffect(() => {
    api.getQuota().then(setQuota).catch(() => {});
    return () => clearInterval(retryTimer.current);
  }, []);

  // A download that failed on the server sends the browser back here with the reason.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("download_error");
    if (!code) return;
    params.delete("download_error");
    const rest = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (rest ? `?${rest}` : "") + window.location.hash);
    const text = /^[a-z_]+$/.test(code) ? t(`errors.${code}`, { seconds: 5, list: "" }) : "";
    toast("error", text && text !== `errors.${code}` ? text : t("result.failedToast"));
  }, [t, toast]);

  const resolve = useCallback(async (raw: string) => {
    clearInterval(retryTimer.current);
    const u = parseUrl(raw);
    // Instant checks in the browser; the API repeats them.
    if (!u) return setView({ kind: "error", code: "invalid_url" });
    if (!detectPlatform(u)) return setView({ kind: "error", code: "unsupported_site" });
    setView({ kind: "loading" });
    requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    try {
      if (isPlaylist(u)) setView({ kind: "playlist", list: await api.resolvePlaylist(u.href) });
      else setView({ kind: "media", info: await api.resolveMedia(u.href), url: u.href });
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError("network");
      if (err.code === "busy") {
        // Auto retry with a visible countdown.
        let left = Math.max(1, Math.ceil(((err.retry_at ? Date.parse(err.retry_at) : Date.now() + 5000) - Date.now()) / 1000));
        setView({ kind: "error", code: "busy", retryIn: left });
        retryTimer.current = setInterval(() => {
          left -= 1;
          if (left <= 0) {
            clearInterval(retryTimer.current);
            resolve(raw);
          } else setView({ kind: "error", code: "busy", retryIn: left });
        }, 1000);
        return;
      }
      setView({ kind: "error", code: err.code });
    }
  }, []);

  const inputError = view.kind === "error" && INPUT_ERRORS.includes(view.code);
  const sites = new Intl.ListFormat(prefs.lang, { type: "conjunction" }).format(PLATFORMS.map((p) => p.name));
  const errorText = view.kind === "error" ? t(`errors.${view.code}`, { list: sites, seconds: view.retryIn ?? 0 }) : "";

  return (
    <div id="downloader" className="space-y-3">
      <UrlInput
        value={url}
        onChange={setUrl}
        onSubmit={(v) => {
          setReplay(null);
          resolve(v);
        }}
        submitting={view.kind === "loading"}
        invalid={inputError}
        describedBy={inputError ? "url-error" : undefined}
      />
      {inputError && (
        <StatusMessage
          id="url-error"
          role="alert"
          tone={view.code === "unsupported_site" ? "warning" : "error"}
          action={
            view.code === "unsupported_site" ? (
              <Link href="#platforms" className="sv-focus shrink-0 rounded-sm font-semibold text-accent hover:underline">
                {t("errors.seeSites")}
              </Link>
            ) : undefined
          }
        >
          {errorText}
        </StatusMessage>
      )}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <QuotaMeter quota={quota} />
        {view.kind === "idle" && DEMO && (
          <button
            type="button"
            onClick={() => {
              setReplay(null);
              setUrl(DEMO);
              resolve(DEMO);
            }}
            className="sv-focus inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-accent hover:underline"
          >
            <PlayCircle className="size-4" strokeWidth={1.75} aria-hidden="true" />
            {t("hero.demo")}
          </button>
        )}
      </div>
      <p className="text-xs text-muted">
        {t("disclaimer.text")}{" "}
        <Link href="/terms" className="sv-focus rounded-sm underline underline-offset-2 hover:text-text">
          {t("disclaimer.terms")}
        </Link>
        {" · "}
        <Link href="/copyright" className="sv-focus rounded-sm underline underline-offset-2 hover:text-text">
          {t("disclaimer.copyright")}
        </Link>
      </p>

      <div ref={resultRef} className="scroll-mt-24 pt-4 empty:hidden">
        {view.kind === "loading" && <MediaCardSkeleton />}
        {view.kind === "error" && !inputError && (
          <StatusMessage
            role="alert"
            tone={view.code === "busy" ? "info" : "error"}
            action={
              view.code !== "busy" ? (
                <Button variant="secondary" size="sm" onClick={() => resolve(url)}>
                  {t("errors.retry")}
                </Button>
              ) : undefined
            }
          >
            {errorText}
          </StatusMessage>
        )}
        {view.kind === "media" && (
          <ResultPanel
            key={`${view.info.media_id}-${replay?.n ?? 0}`}
            info={view.info}
            sourceUrl={view.url}
            quota={quota}
            onQuota={setQuota}
            replay={replay?.item.url === view.url ? replay.item : undefined}
          />
        )}
        {view.kind === "playlist" && (
          <PlaylistResult
            list={view.list}
            onPick={(u) => {
              setReplay(null);
              setUrl(u);
              resolve(u);
            }}
          />
        )}
      </div>

      <RecentDownloads
        onReplay={(item) => {
          setReplay((r) => ({ item, n: (r?.n ?? 0) + 1 }));
          setUrl(item.url);
          resolve(item.url);
        }}
      />
    </div>
  );
}

"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Music, Video } from "lucide-react";
import { api } from "@/lib/api";
import { clipSize, formatBytes } from "@/lib/format";
import { usePrefs, type DefaultQuality } from "@/lib/prefs";
import { ApiError, type FormatKind, type MediaFormat, type MediaInfo, type Quota } from "@/lib/types";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { ProgressBar } from "../ui/Spinner";
import { SegmentedControl } from "../ui/SegmentedControl";
import { useToast } from "../ui/Toast";
import { DONATE_URL } from "@/lib/monetize";
import { DonateLink } from "../DonateLink";
import { LimitGate } from "./LimitGate";
import { MediaHeader } from "./MediaCard";
import { evaluateTrim, TrimControl, type TrimState } from "./TrimControl";
import { cx } from "@/lib/cx";

const MAX_BYTES = 4e9;

type RowState = "idle" | "preparing" | "downloading" | "done";

function recommended(formats: MediaFormat[], pref: DefaultQuality): string | undefined {
  if (pref === "mp3") return formats.find((f) => f.kind === "audio")?.format_id;
  const cap = pref === "1080" ? 1080 : pref === "720" ? 720 : Infinity;
  return formats.filter((f) => f.kind === "video" && (f.height ?? 0) <= cap).sort((a, b) => (b.height ?? 0) - (a.height ?? 0))[0]?.format_id;
}

function qualityLabel(f: MediaFormat) {
  if (f.kind === "audio") return `MP3 ${f.abr_kbps ?? ""} kbps`.replace("  ", " ");
  return `${f.height}p`;
}

export function ResultPanel({
  info,
  sourceUrl,
  quota,
  onQuota,
}: {
  info: MediaInfo;
  sourceUrl: string;
  quota: Quota | null;
  onQuota: (q: Quota) => void;
}) {
  const { prefs, t, addRecent } = usePrefs();
  const toast = useToast();
  const best = recommended(info.formats, prefs.quality);
  const [kind, setKind] = useState<FormatKind>(prefs.quality === "mp3" && info.audio_supported ? "audio" : "video");
  const [trim, setTrim] = useState<TrimState>({ open: false, start: "0:00", end: "" });
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [announce, setAnnounce] = useState("");
  const trimResult = evaluateTrim(trim, info.duration_s, t);
  const blocked = quota != null && quota.used >= quota.limit;
  const announceTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const list = useMemo(() => info.formats.filter((f) => f.kind === kind), [info.formats, kind]);

  // Announce new sizes once, after typing in the trim fields settles.
  useEffect(() => {
    if (!trim.open) return;
    clearTimeout(announceTimer.current);
    announceTimer.current = setTimeout(() => {
      if (trimResult.ok) setAnnounce(t("trim.clip", { length: `${Math.round(trimResult.end - trimResult.start)} s` }));
    }, 500);
    return () => clearTimeout(announceTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trim.start, trim.end, trim.open]);

  const setRow = (id: string, s: RowState, label: string) => {
    setRows((r) => ({ ...r, [id]: s }));
    const word = { idle: "", preparing: t("result.preparing"), downloading: t("result.started"), done: t("result.saved") }[s];
    if (word) setAnnounce(t("result.listStatus", { label, state: word }));
  };

  const download = async (f: MediaFormat) => {
    if (!trimResult.ok) return;
    const label = qualityLabel(f);
    setRow(f.format_id, "preparing", label);
    try {
      const ticket = await api.createDownload({
        media_id: info.media_id,
        format_id: f.format_id,
        kind: f.kind,
        ...(trimResult.trimmed ? { trim_start_s: trimResult.start, trim_end_s: trimResult.end } : {}),
      });
      onQuota(ticket.quota);
      // Hand the file to the browser's own download manager (works on iOS Safari too).
      const a = document.createElement("a");
      a.href = ticket.download_url;
      a.rel = "noopener";
      a.setAttribute("download", "");
      document.body.appendChild(a);
      a.click();
      a.remove();
      setRow(f.format_id, "downloading", label);
      toast("success", t("result.startedToast"));
      addRecent({ title: info.title, url: sourceUrl, label: trimResult.trimmed ? `${label} ✂` : label });
      setTimeout(() => setRow(f.format_id, "done", label), 2000);
    } catch (e) {
      setRow(f.format_id, "idle", label);
      if (e instanceof ApiError && e.code === "quota_exceeded") {
        if (e.quota) onQuota(e.quota);
        else if (e.retry_at && quota) onQuota({ ...quota, used: quota.limit, resets_at: e.retry_at });
        return;
      }
      const code = e instanceof ApiError ? e.code : "network";
      toast("error", t(`errors.${code}`, { seconds: 5, list: "" }) || t("result.failedToast"));
    }
  };

  return (
    <section aria-labelledby="result-title" className="space-y-5 rounded-lg border border-border bg-surface-raised p-4 shadow-card sm:p-6">
      <span id="result-title" className="sr-only">
        {info.title}
      </span>
      <MediaHeader info={info} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl<FormatKind>
          label={t("result.formats")}
          panelId="quality-list"
          value={kind}
          onChange={setKind}
          segments={[
            { value: "video", label: <><Video className="size-4" strokeWidth={1.75} aria-hidden="true" />{t("result.video")}</> },
            {
              value: "audio",
              label: <><Music className="size-4" strokeWidth={1.75} aria-hidden="true" />{t("result.audio")}</>,
              disabled: !info.audio_supported,
              title: info.audio_supported ? undefined : t("result.audioOff"),
            },
          ]}
        />
        {!info.audio_supported && <p className="text-xs text-muted">{t("result.audioOff")}</p>}
      </div>

      <TrimControl trim={trim} setTrim={setTrim} duration={info.duration_s} result={trimResult} />

      {blocked && quota && <LimitGate resetsAt={quota.resets_at} onReset={() => onQuota({ ...quota, used: 0 })} />}

      <div id="quality-list" role="tabpanel" aria-label={t(kind === "video" ? "result.video" : "result.audio")}>
        <ul className="divide-y divide-border overflow-hidden rounded-md border border-border">
          {list.map((f) => {
            const state = rows[f.format_id] ?? "idle";
            const size = trimResult.ok ? clipSize(f.size_estimate, info.duration_s, trimResult.start, trimResult.end) : f.size_estimate;
            const sizeText = size == null ? t("result.unknownSize") : t("result.about", { size: formatBytes(size) });
            const tooLarge = size != null && size > MAX_BYTES;
            const label = qualityLabel(f);
            const isBest = f.format_id === best;
            return (
              <li key={f.format_id} className="px-4 py-2.5 transition-colors duration-(--sv-motion-fast) hover:bg-surface">
                <div className="flex min-h-10 items-center gap-3">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-base font-semibold sv-ltr">{label}</span>
                    {f.height && f.height >= 2160 && <Badge tone="accent">4K</Badge>}
                    {f.height && f.height >= 720 && f.height < 2160 && <Badge>HD</Badge>}
                    {f.needs_merge && <Badge>{t("result.merged")}</Badge>}
                    {isBest && <Badge tone="success">{t("result.best")}</Badge>}
                    <span className="w-full text-sm text-muted sm:w-auto sm:ms-auto">
                      <span className="sv-ltr">{sizeText}</span>
                    </span>
                  </div>
                  {!blocked &&
                    (tooLarge ? (
                      <Button variant="secondary" disabled>
                        {t("result.tooLarge")}
                      </Button>
                    ) : (
                      <Button
                        variant={isBest && state !== "done" ? "primary" : "secondary"}
                        loading={state === "preparing"}
                        disabled={!trimResult.ok || state === "preparing" || state === "downloading"}
                        onClick={() => download(f)}
                        aria-label={t("result.downloadAria", { label, size: sizeText })}
                        icon={state === "done" ? <Check className="size-4 text-success" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
                        className="min-w-32"
                      >
                        {state === "preparing"
                          ? t("result.preparing")
                          : state === "downloading"
                            ? t("result.started")
                            : state === "done"
                              ? t("result.again")
                              : t("result.download")}
                      </Button>
                    ))}
                </div>
                {state === "downloading" && (
                  <div className={cx("pt-2")}>
                    <ProgressBar label={`${label} ${t("result.started")}`} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {Object.values(rows).includes("done") && <DonateThanks />}
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
    </section>
  );
}

/** Shown once a file has reached the browser. Nothing renders while DONATE_URL is empty. */
function DonateThanks() {
  const { t } = usePrefs();
  if (!DONATE_URL) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface px-4 py-3">
      <p className="text-sm text-muted">{t("donate.thanks")}</p>
      <DonateLink />
    </div>
  );
}

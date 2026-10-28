"use client";
import { ChevronDown, Scissors } from "lucide-react";
import { formatDuration, parseTime } from "@/lib/format";
import { useT } from "@/lib/prefs";
import { TimeField } from "./TimeField";
import { cx } from "@/lib/cx";

export interface TrimState {
  open: boolean;
  start: string;
  end: string;
}

export type TrimResult = { ok: true; start: number; end: number; trimmed: boolean } | { ok: false; error: string };

export function evaluateTrim(trim: TrimState, duration: number, t: (k: string, v?: Record<string, string | number>) => string): TrimResult {
  if (!trim.open) return { ok: true, start: 0, end: duration, trimmed: false };
  const start = parseTime(trim.start);
  const end = parseTime(trim.end);
  if (start == null || end == null) return { ok: false, error: t("trim.errFormat") };
  if (end > duration) return { ok: false, error: t("trim.errBeyond", { duration: formatDuration(duration) }) };
  if (end <= start) return { ok: false, error: t("trim.errOrder") };
  if (end - start < 1) return { ok: false, error: t("trim.errShort") };
  return { ok: true, start, end, trimmed: start > 0 || end < duration };
}

/** S04, a disclosure inside the result panel. */
export function TrimControl({
  trim,
  setTrim,
  duration,
  result,
}: {
  trim: TrimState;
  setTrim: (t: TrimState) => void;
  duration: number;
  result: TrimResult;
}) {
  const t = useT();
  const full = { start: "0:00", end: formatDuration(duration) };
  const startPct = result.ok ? (result.start / duration) * 100 : 0;
  const endPct = result.ok ? (result.end / duration) * 100 : 100;

  return (
    <div className="rounded-md bg-surface">
      <button
        type="button"
        aria-expanded={trim.open}
        aria-controls="trim-panel"
        onClick={() => setTrim(trim.open ? { ...trim, open: false } : { open: true, ...full })}
        className="sv-focus flex w-full items-center gap-2 rounded-md px-4 py-3 text-sm font-semibold"
      >
        <Scissors className="size-4 text-muted" strokeWidth={1.75} aria-hidden="true" />
        {t("trim.toggle")}
        {result.ok && result.trimmed && (
          <span className="font-normal text-muted">({t("trim.clip", { length: formatDuration(result.end - result.start) })})</span>
        )}
        <ChevronDown
          className={cx("ms-auto size-4 text-muted transition-transform duration-(--sv-motion-base)", trim.open && "rotate-180")}
          aria-hidden="true"
        />
      </button>
      {trim.open && (
        <div id="trim-panel" className="space-y-3 px-4 pb-4">
          <div className="flex items-end gap-3">
            <TimeField
              id="trim-start"
              label={t("trim.start")}
              value={trim.start}
              max={duration}
              invalid={!result.ok}
              describedBy="trim-msg trim-hint"
              onChange={(start) => setTrim({ ...trim, start })}
            />
            <TimeField
              id="trim-end"
              label={t("trim.end")}
              value={trim.end}
              max={duration}
              invalid={!result.ok}
              describedBy="trim-msg trim-hint"
              onChange={(end) => setTrim({ ...trim, end })}
            />
          </div>
          <div aria-hidden="true" className="relative h-1.5 rounded-pill bg-skeleton">
            <div className="absolute inset-y-0 rounded-pill bg-accent" style={{ insetInlineStart: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p id="trim-msg" className={result.ok ? "text-muted" : "font-semibold text-danger"}>
              {result.ok ? t("trim.clip", { length: formatDuration(result.end - result.start) }) : result.error}
            </p>
            <button
              type="button"
              onClick={() => setTrim({ open: true, ...full })}
              className="sv-focus rounded-sm font-semibold text-accent hover:underline"
            >
              {t("trim.reset")}
            </button>
          </div>
          <p id="trim-hint" className="text-xs text-muted">
            {t("trim.hint")} {t("trim.keyframe")}
          </p>
        </div>
      )}
    </div>
  );
}

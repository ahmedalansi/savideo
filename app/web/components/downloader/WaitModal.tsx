"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Music, Video, X } from "lucide-react";
import { useT } from "@/lib/prefs";
import { WAIT_AD_SECONDS } from "@/lib/monetize";
import type { MediaFormat } from "@/lib/types";
import { cx } from "@/lib/cx";
import { IconButton } from "../ui/Button";
import { WaitAd } from "./WaitAd";

export interface WaitJob {
  format: MediaFormat;
  label: string;
  trimmed: boolean;
  /** True once the API has answered with a download link. */
  ticketReady: boolean;
}

const STAGES = 4;
/** How long the window stays open after the download has started on its own. */
const CLOSE_AFTER_MS = 3000;
function stageOf(pct: number) {
  return pct < 10 ? 0 : pct < 55 ? 1 : pct < 92 ? 2 : 3;
}

/**
 * The window that opens after Download: conversion progress on top, an ad under it.
 * There is no skip: it stays until the wait is over and the API has answered, then the
 * download starts by itself and the window closes a moment later.
 */
export function WaitModal({ job, onReady, onClose }: { job: WaitJob | null; onReady: () => void; onClose: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const open = job != null;
  // Latest callbacks, so the timers below never call a stale one.
  const onReadyRef = useRef(onReady);
  const onCloseRef = useRef(onClose);
  onReadyRef.current = onReady;
  onCloseRef.current = onClose;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setElapsed(0);
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const started = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - started) / 1000), 100);
    return () => clearInterval(id);
  }, [open]);

  const total = Math.max(WAIT_AD_SECONDS, 0.1);
  const timeUp = elapsed >= total;
  const ready = !!job?.ticketReady && timeUp;
  // Eases toward 95% while waiting; jumps to 100 only when the file can really be handed over.
  const pct = ready ? 100 : Math.min(95, (elapsed / total) * 100);
  const stage = ready ? STAGES : stageOf(pct);

  // Hands the file over the moment it is ready, then closes the window shortly after.
  useEffect(() => {
    if (!ready) return;
    onReadyRef.current();
    const id = setTimeout(() => onCloseRef.current(), CLOSE_AFTER_MS);
    return () => clearTimeout(id);
  }, [ready]);

  const audio = job?.format.kind === "audio";
  const merge = !!job?.format.needs_merge;
  const stageKeys = [
    "wait.stage.analyze",
    audio ? "wait.stage.fetchAudio" : merge ? "wait.stage.fetchBoth" : "wait.stage.fetchVideo",
    job?.trimmed ? "wait.stage.trim" : audio ? "wait.stage.toMp3" : merge ? "wait.stage.merge" : "wait.stage.check",
    "wait.stage.finish",
  ];
  const fmtText = job ? `${job.format.ext.toUpperCase()} · ${job.label}` : "";

  return (
    <dialog
      ref={ref}
      aria-labelledby="wait-title"
      // Esc closes only once the file is ready.
      onCancel={(e) => {
        if (!ready) e.preventDefault();
      }}
      onClose={onClose}
      className={cx(
        "m-auto max-h-[calc(100dvh-24px)] w-[calc(100%-32px)] max-w-[380px] overflow-y-auto rounded-xl border border-border",
        "bg-surface-raised p-4 text-text shadow-pop backdrop:bg-black/55",
      )}
    >
      {job && (
        <div className="grid gap-3">
          {ready && (
            <IconButton label={t("wait.close")} variant="secondary" onClick={onClose} className="absolute end-2.5 top-2.5 z-20 rounded-pill bg-surface">
              <X className="size-4" aria-hidden="true" />
            </IconButton>
          )}

          <div
            className={cx(
              "grid grid-cols-[44px_1fr] items-center gap-x-3 gap-y-2.5 rounded-lg border p-3 transition-colors duration-(--sv-motion-base)",
              ready ? "border-success bg-success-subtle" : "border-border bg-surface",
            )}
          >
            <div className={cx("grid size-11 place-items-center rounded-md", ready ? "bg-success text-bg" : "bg-accent-subtle text-accent")}>
              {ready ? (
                <Check className="size-5" aria-hidden="true" />
              ) : audio ? (
                <Music className="size-5" aria-hidden="true" />
              ) : (
                <Video className="size-5" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0">
              <h2 id="wait-title" className="text-base font-bold">
                {t(ready ? (audio ? "wait.readyAudio" : "wait.readyVideo") : audio ? "wait.preparingAudio" : "wait.preparingVideo")}
              </h2>
              <div className="flex items-center justify-between gap-2 text-xs text-muted">
                <span className="sv-ltr truncate font-mono">{fmtText}</span>
                <span className="sv-ltr font-mono font-bold text-text tabular-nums">{Math.floor(pct)}%</span>
              </div>
            </div>
            <div
              role="progressbar"
              aria-label={t("wait.progress")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.floor(pct)}
              className="col-span-2 h-1.5 overflow-hidden rounded-pill bg-skeleton"
            >
              <div
                className={cx("h-full rounded-pill transition-[width] duration-200 ease-linear motion-reduce:transition-none", ready ? "bg-success" : "bg-accent")}
                style={{ width: `${pct}%` }}
              />
            </div>
            <ol className="col-span-2 grid grid-cols-4 gap-1">
              {stageKeys.map((k, i) => {
                const done = i < stage;
                const active = i === stage;
                return (
                  <li
                    key={k}
                    aria-current={active ? "step" : undefined}
                    className={cx("grid justify-items-center gap-1 text-center text-[11px] leading-tight", active ? "font-semibold text-text" : "text-muted")}
                  >
                    <span
                      aria-hidden="true"
                      className={cx(
                        "grid size-5 place-items-center rounded-pill border-2 text-[10px]",
                        done ? "border-success bg-success text-bg" : active ? "border-accent bg-surface-raised ring-3 ring-accent-subtle" : "border-skeleton bg-surface-raised",
                      )}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    {t(k)}
                  </li>
                );
              })}
            </ol>
          </div>

          <WaitAd />

          <p className="text-center text-xs text-muted" aria-live="polite">
            {ready ? t("wait.starting") : t("wait.note")}
          </p>
        </div>
      )}
    </dialog>
  );
}

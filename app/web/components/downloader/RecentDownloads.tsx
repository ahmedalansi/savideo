"use client";
import { useEffect, useState } from "react";
import { Download, Film, Lock, Music, Scissors, X } from "lucide-react";
import { openSettings, usePrefs, type RecentItem } from "@/lib/prefs";
import { IconButton } from "../ui/Button";

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86400],
  ["hour", 3600],
  ["minute", 60],
];

function ago(iso: string, now: number, rtf: Intl.RelativeTimeFormat): string {
  const s = Math.round((Date.parse(iso) - now) / 1000);
  for (const [unit, size] of UNITS) if (Math.abs(s) >= size) return rtf.format(Math.round(s / size), unit);
  return rtf.format(0, "second");
}

function Thumb({ item }: { item: RecentItem }) {
  const [broken, setBroken] = useState(false);
  const Icon = item.kind === "audio" ? Music : Film;
  return (
    <div className="relative flex aspect-video w-20 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-surface text-muted">
      {item.thumbnail_url && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.thumbnail_url} alt="" onError={() => setBroken(true)} className="size-full object-cover" />
      ) : (
        <Icon className="size-5" strokeWidth={1.5} aria-hidden="true" />
      )}
      {item.thumbnail_url && !broken && item.kind && (
        <span className="absolute start-1 bottom-1 rounded-sm bg-text/80 p-0.5 text-bg">
          <Icon className="size-3" strokeWidth={2} aria-hidden="true" />
        </span>
      )}
    </div>
  );
}

/** S09 on the main page: the last downloads, kept only in this browser, each one a tap away from downloading again. */
export function RecentDownloads({ onReplay }: { onReplay: (item: RecentItem) => void }) {
  const { recent, removeRecent, clearRecent, prefs, t } = usePrefs();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [recent]);

  if (!prefs.keepHistory || recent.length === 0) return null;
  const rtf = new Intl.RelativeTimeFormat(prefs.lang === "ar" ? "ar-u-nu-latn" : "en", { numeric: "auto" });

  return (
    <section aria-labelledby="recent-downloads-title" className="mt-6 overflow-hidden rounded-lg border border-border bg-surface-raised shadow-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3 sm:px-6">
        <h2 id="recent-downloads-title" className="text-base font-semibold">
          {t("recent.title")}
        </h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-pill bg-accent-subtle px-1.5 text-xs font-semibold text-accent sv-ltr">
          {recent.length}
        </span>
        <button
          type="button"
          onClick={clearRecent}
          className="sv-focus ms-auto rounded-sm text-sm font-semibold text-muted hover:text-text hover:underline"
        >
          {t("recent.clearAll")}
        </button>
      </div>
      <ul className="divide-y divide-border">
        {recent.map((r) => (
          <li key={r.saved_at} className="flex items-center gap-3 px-4 py-2.5 sm:px-6">
            <Thumb item={r} />
            <div className="min-w-0 flex-1">
              <p dir="auto" className="truncate text-sm font-semibold" title={r.title}>
                {r.title}
              </p>
              <p className="flex items-center gap-1 text-xs text-muted">
                <span className="sv-ltr">{r.label.replace(/ ✂$/, "")}</span>
                {r.label.endsWith("✂") && <Scissors className="size-3" aria-label={t("recent.trimmed")} />}
                <span aria-hidden="true">·</span>
                <time dateTime={r.saved_at}>{ago(r.saved_at, now, rtf)}</time>
              </p>
            </div>
            <IconButton variant="secondary" label={t("recent.again", { title: r.title })} onClick={() => onReplay(r)}>
              <Download className="size-4" aria-hidden="true" />
            </IconButton>
            <IconButton label={t("recent.remove", { title: r.title })} onClick={() => removeRecent(r.saved_at)}>
              <X className="size-4" aria-hidden="true" />
            </IconButton>
          </li>
        ))}
      </ul>
      <p className="flex items-center gap-2 border-t border-border bg-surface px-4 py-2.5 text-xs text-muted sm:px-6">
        <Lock className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
        <span>
          {t("recent.note")}{" "}
          <button type="button" onClick={openSettings} className="sv-focus rounded-sm font-semibold underline underline-offset-2 hover:text-text">
            {t("recent.settings")}
          </button>
        </span>
      </p>
    </section>
  );
}

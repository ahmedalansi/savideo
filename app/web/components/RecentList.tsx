"use client";
import { ExternalLink } from "lucide-react";
import { usePrefs } from "@/lib/prefs";
import { Button } from "./ui/Button";

/** S09: recent downloads, kept only in this browser. */
export function RecentList() {
  const { recent, clearRecent, t, prefs } = usePrefs();
  const date = new Intl.DateTimeFormat(prefs.lang === "ar" ? "ar-u-nu-latn" : "en", { dateStyle: "medium", timeStyle: "short" });
  return (
    <section aria-labelledby="recent-title" className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 id="recent-title" className="text-sm font-semibold">
          {t("settings.recent")}
        </h3>
        {recent.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearRecent}>
            {t("settings.clear")}
          </Button>
        )}
      </div>
      {recent.length === 0 ? (
        <p className="rounded-md bg-surface p-4 text-sm text-muted">{t("settings.recentEmpty")}</p>
      ) : (
        <ul className="divide-y divide-border rounded-md border border-border">
          {recent.map((r) => (
            <li key={r.saved_at + r.url} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p dir="auto" className="truncate text-sm font-semibold">
                  {r.title}
                </p>
                <p className="text-xs text-muted">
                  <span className="sv-ltr">{r.label}</span> · {date.format(new Date(r.saved_at))}
                </p>
              </div>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t("settings.open")}: ${r.title}`}
                className="sv-focus inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-surface hover:text-text"
              >
                <ExternalLink className="size-4 rtl:-scale-x-100" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

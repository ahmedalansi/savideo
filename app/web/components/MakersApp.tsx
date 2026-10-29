"use client";
import { Smartphone } from "lucide-react";
import { useT } from "@/lib/prefs";
import { MAKERS_APP_URL } from "@/lib/monetize";
import { cx } from "@/lib/cx";
import { buttonClass } from "./ui/Button";

/** Our own Android app, on /apps and the home page. Hidden when MAKERS_APP_URL is empty. */
export function MakersApp({ className }: { className?: string }) {
  const t = useT();
  if (!MAKERS_APP_URL) return null;
  return (
    <section aria-labelledby="makers-title" className={cx("not-prose rounded-lg border border-border bg-surface-raised p-6 shadow-card", className)}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">{t("makers.label")}</p>
      <div className="flex items-start gap-4">
        <Smartphone className="mt-0.5 size-6 shrink-0 text-accent" strokeWidth={1.75} aria-hidden="true" />
        <div>
          <h2 id="makers-title" className="mb-1 text-base font-semibold">{t("makers.name")}</h2>
          <p className="mb-4 text-sm text-muted">{t("makers.body")}</p>
          <a href={MAKERS_APP_URL} target="_blank" rel="noopener" className={buttonClass("secondary", "sm")}>
            {t("makers.open")}
          </a>
        </div>
      </div>
    </section>
  );
}

/** A quiet footer link to the same app. */
export function MakersLink() {
  const t = useT();
  if (!MAKERS_APP_URL) return null;
  return (
    <a
      href={MAKERS_APP_URL}
      target="_blank"
      rel="noopener"
      className="sv-focus inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-muted hover:text-text"
    >
      <Smartphone className="size-4 text-accent" strokeWidth={1.75} aria-hidden="true" />
      {t("makers.footer")}
    </a>
  );
}

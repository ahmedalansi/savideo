"use client";
import { Heart } from "lucide-react";
import { useT } from "@/lib/prefs";
import { DONATE_URL } from "@/lib/monetize";
import { cx } from "@/lib/cx";

/** A quiet "buy us a coffee" link. Renders nothing until DONATE_URL is set. */
export function DonateLink({ className }: { className?: string }) {
  const t = useT();
  if (!DONATE_URL) return null;
  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener"
      className={cx("sv-focus inline-flex items-center gap-1.5 rounded-sm text-sm font-semibold text-muted hover:text-text", className)}
    >
      <Heart className="size-4 text-accent" strokeWidth={1.75} aria-hidden="true" />
      {t("donate.cta")}
    </a>
  );
}

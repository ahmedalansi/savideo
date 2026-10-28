"use client";
import type { Quota } from "@/lib/types";
import { useT } from "@/lib/prefs";
import { cx } from "@/lib/cx";

/** Hidden until the visitor has used at least one free download. */
export function QuotaMeter({ quota }: { quota: Quota | null }) {
  const t = useT();
  if (!quota || quota.used === 0 || quota.used >= quota.limit) return null;
  const left = quota.limit - quota.used;
  return (
    <p className="flex items-center gap-2 text-xs text-muted">
      <span aria-hidden="true" className="flex gap-1">
        {Array.from({ length: quota.limit }, (_, i) => (
          <span key={i} className={cx("size-2 rounded-pill", i < left ? "bg-accent" : "bg-skeleton")} />
        ))}
      </span>
      {t("quota.left", { left, limit: quota.limit })}
    </p>
  );
}

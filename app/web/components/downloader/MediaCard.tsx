"use client";
import { useState } from "react";
import { Film } from "lucide-react";
import type { MediaInfo } from "@/lib/types";
import { PLATFORMS } from "@/lib/platforms";
import { formatDuration } from "@/lib/format";
import { useT } from "@/lib/prefs";
import { Skeleton } from "../ui/Skeleton";

export function MediaCardSkeleton() {
  const t = useT();
  return (
    <div aria-busy="true" className="space-y-4 rounded-lg border border-border bg-surface-raised p-4 shadow-card sm:p-6">
      <span role="status" className="sr-only">
        {t("loading.label")}
      </span>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Skeleton className="aspect-video w-full rounded-md sm:w-56" />
        <div className="flex-1 space-y-3 pt-1">
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-4 w-2/5" />
          <p className="pt-2 text-sm text-muted">{t("loading.status")}</p>
        </div>
      </div>
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    </div>
  );
}

export function MediaHeader({ info }: { info: Pick<MediaInfo, "title" | "duration_s" | "thumbnail_url" | "platform"> }) {
  const t = useT();
  const [broken, setBroken] = useState(false);
  const platform = PLATFORMS.find((p) => p.id === info.platform)?.name ?? info.platform;
  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-md bg-surface sm:w-56">
        {info.thumbnail_url && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={info.thumbnail_url} alt={info.title} onError={() => setBroken(true)} className="size-full object-cover" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 text-muted">
            <Film className="size-8" strokeWidth={1.5} aria-hidden="true" />
            <span className="text-xs">{t("result.noThumb")}</span>
          </div>
        )}
        <span className="absolute end-2 bottom-2 rounded-sm bg-text/80 px-1.5 py-0.5 font-mono text-xs text-bg sv-ltr">
          {formatDuration(info.duration_s)}
        </span>
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <h2 dir="auto" className="line-clamp-2 text-lg font-semibold break-words">
          {info.title}
        </h2>
        <p className="text-sm text-muted">
          {platform} · {t("result.duration")} <span className="sv-ltr">{formatDuration(info.duration_s)}</span>
        </p>
      </div>
    </div>
  );
}

"use client";
import type { PlaylistInfo } from "@/lib/types";
import { useT } from "@/lib/prefs";
import { formatDuration } from "@/lib/format";
import { Button } from "../ui/Button";

/** S07: pick one video from a playlist, then it opens in the normal result panel. */
export function PlaylistResult({ list, onPick }: { list: PlaylistInfo; onPick: (url: string) => void }) {
  const t = useT();
  return (
    <section aria-labelledby="pl-title" className="space-y-4 rounded-lg border border-border bg-surface-raised p-4 shadow-card sm:p-6">
      <div>
        <h2 id="pl-title" dir="auto" className="text-lg font-semibold">
          {t("playlist.title", { title: list.title })}
        </h2>
        <p className="text-sm text-muted">{t("playlist.count", { count: list.items.length })}</p>
      </div>
      <ul className="divide-y divide-border rounded-md border border-border">
        {list.items.map((item) => (
          <li key={item.url} className="flex items-center gap-3 p-3">
            {item.thumbnail_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.thumbnail_url} alt="" className="aspect-video w-24 shrink-0 rounded-sm object-cover" />
            )}
            <div className="min-w-0 flex-1">
              <p dir="auto" className="line-clamp-2 text-sm font-semibold">
                {item.title}
              </p>
              <p className="text-xs text-muted sv-ltr">{formatDuration(item.duration_s)}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => onPick(item.url)} aria-label={t("playlist.chooseAria", { title: item.title })}>
              {t("playlist.choose")}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

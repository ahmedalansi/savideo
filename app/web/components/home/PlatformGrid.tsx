"use client";
import { Camera, Clapperboard, MessageSquare, MonitorPlay, Play, Radio, Tv, Users, type LucideIcon } from "lucide-react";
import { PLATFORMS } from "@/lib/platforms";
import type { PlatformId } from "@/lib/types";
import { useT } from "@/lib/prefs";

// Generic glyphs of our own choosing, never the platforms' logos.
const GLYPHS: Record<PlatformId, LucideIcon> = {
  youtube: Play,
  facebook: Users,
  x: MessageSquare,
  reddit: Radio,
  dailymotion: MonitorPlay,
  bilibili: Tv,
  twitch: Clapperboard,
  instagram: Camera,
};

export function PlatformGrid() {
  const t = useT();
  return (
    <section id="platforms" aria-labelledby="platforms-title" className="scroll-mt-24">
      <h2 id="platforms-title" className="mb-6 text-xl font-bold">
        {t("platforms.title")}
      </h2>
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
        {PLATFORMS.map((p) => {
          const Icon = GLYPHS[p.id];
          return (
            <li key={p.id} className="flex items-center gap-3 rounded-md border border-border bg-surface p-4 text-sm font-semibold">
              <Icon className="size-5 shrink-0 text-muted" strokeWidth={1.75} aria-hidden="true" />
              {p.name}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

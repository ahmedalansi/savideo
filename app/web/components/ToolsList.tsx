"use client";
import { ExternalLink, FileVideo, Shield } from "lucide-react";
import { useT } from "@/lib/prefs";
import { activeTools, type ToolId } from "@/lib/monetize";
import { buttonClass } from "./ui/Button";

const ICONS: Record<ToolId, typeof Shield> = { vpn: Shield, compressor: FileVideo };

export function ToolsList() {
  const t = useT();
  return (
    <div className="mx-auto max-w-tool pt-12 sv-gutter md:pt-16">
      <h1 className="mb-3 text-xl font-extrabold tracking-tight sm:text-display">{t("tools.title")}</h1>
      <p className="mb-4 text-base text-muted">{t("tools.lead")}</p>
      <p className="mb-8 rounded-md bg-accent-subtle px-4 py-3 text-sm text-text">{t("tools.disclosure")}</p>
      <ul className="grid gap-4 sm:grid-cols-2">
        {activeTools.map(({ id, url }) => {
          const Icon = ICONS[id];
          return (
            <li key={id} className="flex flex-col rounded-lg border border-border bg-surface-raised p-6 shadow-card">
              <Icon className="mb-4 size-6 text-accent" strokeWidth={1.75} aria-hidden="true" />
              <h2 className="mb-1 text-base font-semibold">{t(`tools.items.${id}.name`)}</h2>
              <p className="mb-4 flex-1 text-sm text-muted">{t(`tools.items.${id}.body`)}</p>
              <p className="mb-3 text-xs text-muted">{t("tools.badge")}</p>
              <a href={url} target="_blank" rel="sponsored noopener" className={buttonClass("secondary", "md", "self-start")}>
                {t("tools.open")}
                <ExternalLink className="size-4" strokeWidth={1.75} aria-hidden="true" />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

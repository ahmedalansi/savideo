"use client";
import { Ban, CircleHelp, Download, EyeOff, Scissors, ShieldCheck, type LucideIcon } from "lucide-react";
import { useT } from "@/lib/prefs";

// Each promise maps to a fix in replica/fixes.md (1, 2, 3, 4) or a shipped feature.
const ITEMS: LucideIcon[] = [Ban, Download, CircleHelp, ShieldCheck, EyeOff, Scissors];

export function Features() {
  const t = useT();
  return (
    <section aria-labelledby="features-title">
      <h2 id="features-title" className="mb-6 text-xl font-bold">
        {t("features.title")}
      </h2>
      <ul className="grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((Icon, i) => (
          <li key={i} className="flex gap-4">
            <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-subtle text-accent">
              <Icon className="size-5" strokeWidth={1.75} />
            </span>
            <div>
              <h3 className="mb-1 text-base font-semibold">{t(`features.f${i + 1}t`)}</h3>
              <p className="text-sm text-muted">{t(`features.f${i + 1}b`)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

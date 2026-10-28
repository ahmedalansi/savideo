"use client";
import { MousePointerClick, ShieldAlert } from "lucide-react";
import { useT } from "@/lib/prefs";

// The two biggest complaints about downloader sites (replica/fixes.md), in our words.
export function Problem() {
  const t = useT();
  const items = [
    { Icon: MousePointerClick, n: 1 },
    { Icon: ShieldAlert, n: 2 },
  ];
  return (
    <section aria-labelledby="problem-title">
      <h2 id="problem-title" className="mb-6 text-xl font-bold">
        {t("problem.title")}
      </h2>
      <ul className="grid gap-4 md:grid-cols-2">
        {items.map(({ Icon, n }) => (
          <li key={n} className="rounded-lg border border-border bg-surface p-6">
            <Icon className="mb-4 size-6 text-muted" strokeWidth={1.75} aria-hidden="true" />
            <h3 className="mb-1 text-base font-semibold">{t(`problem.p${n}t`)}</h3>
            <p className="text-sm text-muted">{t(`problem.p${n}b`)}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-base font-semibold">{t("problem.close")}</p>
    </section>
  );
}

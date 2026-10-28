"use client";
import { Check } from "lucide-react";
import { useT } from "@/lib/prefs";
import { cx } from "@/lib/cx";

// Plans from replica/launch/pricing.md. Plus is not on sale; no checkout exists yet.
const PLANS = [
  { id: "free", bullets: 4, highlight: true },
  { id: "plus", bullets: 4, highlight: false },
] as const;

export function Pricing() {
  const t = useT();
  return (
    <section id="pricing" aria-labelledby="pricing-title" className="scroll-mt-24">
      <h2 id="pricing-title" className="mb-2 text-xl font-bold">
        {t("pricing.title")}
      </h2>
      <p className="mb-6 text-base text-muted">{t("pricing.lead")}</p>
      <ul className="grid gap-4 md:grid-cols-2">
        {PLANS.map((p) => (
          <li
            key={p.id}
            className={cx(
              "flex flex-col rounded-lg border bg-surface-raised p-6 shadow-card",
              p.highlight ? "border-accent" : "border-border",
            )}
          >
            <div className="mb-1 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold">{t(`pricing.${p.id}.name`)}</h3>
              <span className="inline-flex h-6 items-center rounded-pill bg-accent-subtle px-3 text-xs font-semibold text-accent">
                {t(`pricing.${p.id}.badge`)}
              </span>
            </div>
            <p className="mb-4 text-sm text-muted">{t(`pricing.${p.id}.for`)}</p>
            <p className="text-xl font-extrabold">{t(`pricing.${p.id}.price`)}</p>
            <p className="mb-6 text-sm text-muted">{t(`pricing.${p.id}.period`)}</p>
            <ul className="mb-6 space-y-2">
              {Array.from({ length: p.bullets }, (_, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={2} aria-hidden="true" />
                  {t(`pricing.${p.id}.b${i + 1}`)}
                </li>
              ))}
            </ul>
            <p className="mt-auto text-xs text-muted">{t(`pricing.${p.id}.note`)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

"use client";
import { useT } from "@/lib/prefs";

export function HowTo() {
  const t = useT();
  return (
    <section aria-labelledby="howto-title">
      <h2 id="howto-title" className="mb-6 text-xl font-bold">
        {t("howto.title")}
      </h2>
      <ol className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((n) => (
          <li key={n} className="rounded-lg border border-border bg-surface-raised p-6 shadow-card">
            <span aria-hidden="true" className="mb-4 grid size-9 place-items-center rounded-pill bg-accent-subtle font-bold text-accent">
              {n}
            </span>
            <h3 className="mb-1 text-base font-semibold">{t(`howto.s${n}t`)}</h3>
            <p className="text-sm text-muted">{t(`howto.s${n}b`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

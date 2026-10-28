"use client";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useT } from "@/lib/prefs";

/** Native <details> gives keyboard support and works with JS off. */
export function Faq({ headingLevel = 2, showMore = true }: { headingLevel?: 1 | 2; showMore?: boolean }) {
  const t = useT();
  const H = headingLevel === 1 ? "h1" : "h2";
  return (
    <section aria-labelledby="faq-title">
      <H id="faq-title" className={headingLevel === 1 ? "mb-8 text-display font-extrabold" : "mb-6 text-xl font-bold"}>
        {t("faq.title")}
      </H>
      <div className="border-t border-border">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
          <details key={n} className="group border-b border-border">
            <summary className="sv-focus flex cursor-pointer list-none items-center justify-between gap-4 rounded-sm py-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
              {t(`faq.q${n}`)}
              <ChevronDown
                className="size-5 shrink-0 text-muted transition-transform duration-(--sv-motion-base) group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <p className="pb-4 text-sm text-muted">{t(`faq.a${n}`)}</p>
          </details>
        ))}
      </div>
      {showMore && (
        <Link href="/faq" className="sv-focus mt-4 inline-block rounded-sm text-sm font-semibold text-accent hover:underline">
          {t("faq.more")}
        </Link>
      )}
    </section>
  );
}

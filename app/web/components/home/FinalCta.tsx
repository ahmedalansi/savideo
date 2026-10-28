"use client";
import { useT } from "@/lib/prefs";
import { buttonClass } from "../ui/Button";

export function FinalCta() {
  const t = useT();
  return (
    <section aria-labelledby="cta-title" className="rounded-xl bg-accent-subtle px-6 py-12 text-center">
      <h2 id="cta-title" className="mb-2 text-xl font-bold text-balance">
        {t("cta.title")}
      </h2>
      <p className="mx-auto mb-6 max-w-md text-base text-muted text-balance">{t("cta.lead")}</p>
      <a href="#get" className={buttonClass("primary", "lg")}>
        {t("cta.button")}
      </a>
    </section>
  );
}

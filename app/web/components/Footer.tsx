"use client";
import Link from "next/link";
import { useT } from "@/lib/prefs";
import { activeTools } from "@/lib/monetize";
import { DonateLink } from "./DonateLink";
import { MakersLink } from "./MakersApp";
import { Wordmark } from "./Wordmark";

export function Footer() {
  const t = useT();
  const groups = [
    { title: t("footer.product"), links: [["/", t("footer.home")], ["/apps", t("footer.apps")], ...(activeTools.length ? [["/tools", t("footer.tools")]] : []), ["/faq", t("footer.faq")]] },
    { title: t("footer.legal"), links: [["/terms", t("footer.terms")], ["/privacy", t("footer.privacy")], ["/copyright", t("footer.copyright")]] },
    { title: t("footer.contact"), links: [["/about", t("footer.about")], ["/contact", t("footer.contactUs")]] },
  ];
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto grid max-w-content gap-10 py-12 sv-gutter md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-3">
          <Wordmark />
          <p className="max-w-xs text-sm text-muted">{t("disclaimer.text")}</p>
          <p className="text-sm font-semibold">{t("footer.noStore")}</p>
          <DonateLink />
          <div>
            <MakersLink />
          </div>
        </div>
        {groups.map((g) => (
          <nav key={g.title} aria-label={g.title}>
            <h2 className="mb-3 text-sm font-semibold">{g.title}</h2>
            <ul className="space-y-2">
              {g.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="sv-focus rounded-sm text-sm text-muted hover:text-text">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <p className="mx-auto max-w-content pb-8 text-xs text-muted sv-gutter">{t("footer.rights")}</p>
    </footer>
  );
}

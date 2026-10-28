"use client";
import { useT } from "@/lib/prefs";
import { Downloader } from "../downloader/Downloader";

export function Hero() {
  const t = useT();
  return (
    <section id="get" className="mx-auto max-w-tool scroll-mt-24 pt-12 sv-gutter md:pt-20">
      <h1 className="mb-3 text-center text-xl font-extrabold tracking-tight text-balance sm:text-display">{t("hero.title")}</h1>
      <p className="mx-auto mb-8 max-w-xl text-center text-base text-muted text-balance">{t("hero.lead")}</p>
      <Downloader />
    </section>
  );
}

"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Settings } from "lucide-react";
import { useT } from "@/lib/prefs";
import { isFake } from "@/lib/api";
import { activeTools } from "@/lib/monetize";
import { IconButton } from "./ui/Button";
import { SettingsSheet } from "./SettingsSheet";
import { Wordmark } from "./Wordmark";

export function Header() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const gear = useRef<HTMLButtonElement>(null);

  return (
    <>
      <a
        href="#main"
        className="sv-focus fixed start-4 top-2 z-50 -translate-y-20 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-on-accent focus:translate-y-0"
      >
        {t("nav.skip")}
      </a>
      {isFake && (
        <p className="bg-warning-subtle py-1.5 text-center text-xs text-text sv-gutter">{t("fake.banner")}</p>
      )}
      <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
        <div className="mx-auto flex h-(--sv-layout-header-h) max-w-content items-center gap-6 sv-gutter">
          <Link href="/" aria-label={t("nav.home")} className="sv-focus rounded-sm">
            <Wordmark />
          </Link>
          <nav aria-label={t("nav.main")} className="ms-auto hidden items-center gap-1 sm:flex">
            <Link href="/faq" className="sv-focus rounded-md px-3 py-2 text-sm font-semibold text-muted hover:text-text">
              {t("nav.faq")}
            </Link>
            <Link href="/apps" className="sv-focus rounded-md px-3 py-2 text-sm font-semibold text-muted hover:text-text">
              {t("nav.apps")}
            </Link>
            {activeTools.length > 0 && (
              <Link href="/tools" className="sv-focus rounded-md px-3 py-2 text-sm font-semibold text-muted hover:text-text">
                {t("nav.tools")}
              </Link>
            )}
          </nav>
          <IconButton ref={gear} label={t("nav.settings")} onClick={() => setOpen(true)} className="ms-auto sm:ms-0">
            <Settings className="size-5" strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
        </div>
      </header>
      <SettingsSheet
        open={open}
        onClose={() => {
          setOpen(false);
          gear.current?.focus();
        }}
      />
    </>
  );
}

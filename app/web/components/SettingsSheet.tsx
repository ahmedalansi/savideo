"use client";
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { usePrefs, type DefaultQuality, type Lang, type Theme } from "@/lib/prefs";
import { IconButton } from "./ui/Button";
import { SegmentedControl } from "./ui/SegmentedControl";
import { Switch } from "./ui/Switch";
import { fieldClass } from "./ui/Field";
import { RecentList } from "./RecentList";
import { cx } from "@/lib/cx";

/** S08. Native <dialog> gives focus trapping, Esc to close and the backdrop. */
export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { prefs, setPrefs, t } = usePrefs();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="settings-title"
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      className={cx(
        "m-0 max-h-none max-w-none bg-surface-raised p-0 text-text shadow-pop",
        "fixed inset-x-0 top-auto bottom-0 w-full rounded-t-xl",
        "sm:inset-y-0 sm:start-auto sm:end-0 sm:h-dvh sm:w-[360px] sm:rounded-none",
      )}
    >
      <div className="flex max-h-[85dvh] flex-col sm:max-h-none sm:h-full">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 id="settings-title" className="text-lg font-semibold">
            {t("settings.title")}
          </h2>
          <IconButton label={t("settings.close")} onClick={onClose}>
            <X className="size-5" aria-hidden="true" />
          </IconButton>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold">{t("settings.theme")}</legend>
            <SegmentedControl<Theme>
              label={t("settings.theme")}
              value={prefs.theme}
              onChange={(theme) => setPrefs({ theme })}
              className="w-full"
              segments={[
                { value: "system", label: t("settings.system") },
                { value: "light", label: t("settings.light") },
                { value: "dark", label: t("settings.dark") },
              ]}
            />
          </fieldset>
          <fieldset>
            <legend className="mb-2 text-sm font-semibold">{t("settings.quality")}</legend>
            <SegmentedControl<DefaultQuality>
              label={t("settings.quality")}
              value={prefs.quality}
              onChange={(quality) => setPrefs({ quality })}
              className="w-full"
              segments={[
                { value: "best", label: t("settings.qBest") },
                { value: "1080", label: t("settings.q1080") },
                { value: "720", label: t("settings.q720") },
                { value: "mp3", label: t("settings.qMp3") },
              ]}
            />
          </fieldset>
          <div>
            <label htmlFor="lang" className="mb-2 block text-sm font-semibold">
              {t("settings.language")}
            </label>
            <select
              id="lang"
              value={prefs.lang}
              onChange={(e) => setPrefs({ lang: e.target.value as Lang })}
              className={cx(fieldClass(), "h-10")}
            >
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </div>
          <Switch label={t("settings.history")} checked={prefs.keepHistory} onChange={(keepHistory) => setPrefs({ keepHistory })} />
          <RecentList />
        </div>
      </div>
    </dialog>
  );
}

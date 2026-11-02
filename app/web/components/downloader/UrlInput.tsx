"use client";
import { useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, ClipboardPaste, X } from "lucide-react";
import { usePrefs, type DefaultQuality } from "@/lib/prefs";
import { Spinner } from "../ui/Spinner";
import { cx } from "@/lib/cx";

const QUALITIES: { value: DefaultQuality; key: string }[] = [
  { value: "best", key: "settings.qBest" },
  { value: "2160", key: "settings.q2160" },
  { value: "1080", key: "settings.q1080" },
  { value: "720", key: "settings.q720" },
  { value: "mp3", key: "settings.qMp3" },
];

/**
 * The hero link field. One big framed box: the action button pastes when the
 * box is empty, fetches when it has a link, and spins while the link is read.
 */
export function UrlInput({
  value,
  onChange,
  onSubmit,
  submitting,
  invalid,
  describedBy,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
  submitting: boolean;
  invalid: boolean;
  describedBy?: string;
}) {
  const { t, prefs, setPrefs } = usePrefs();
  const input = useRef<HTMLInputElement>(null);
  const [pasted, setPasted] = useState(false);
  const [pasteHint, setPasteHint] = useState(false);

  const paste = async () => {
    try {
      const text = (await navigator.clipboard.readText()).trim();
      if (!text) throw new Error("empty");
      onChange(text);
      setPasted(true);
      setPasteHint(false);
      setTimeout(() => setPasted(false), 1500);
      onSubmit(text);
    } catch {
      setPasteHint(true);
      input.current?.focus();
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(value);
  };

  const describe = [describedBy, pasteHint ? "paste-hint" : null].filter(Boolean).join(" ") || undefined;
  const hasValue = value.trim() !== "";
  const actionLabel = hasValue ? t("hero.submit") : pasted ? t("hero.pasted") : t("hero.paste");

  return (
    <form onSubmit={submit} noValidate className="space-y-3">
      <label htmlFor="video-url" className="sr-only">
        {t("hero.label")}
      </label>
      <div className="sv-brackets">
        <div
          data-busy={submitting || undefined}
          aria-invalid={invalid || undefined}
          className="sv-linkbox flex h-18 items-center gap-2 rounded-xl ps-5 pe-2 shadow-card sm:h-20 sm:ps-6"
        >
          <input
            ref={input}
            id="video-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            enterKeyHint="go"
            dir="ltr"
            placeholder={t("hero.placeholder")}
            value={value}
            readOnly={submitting}
            aria-invalid={invalid || undefined}
            aria-describedby={describe}
            onChange={(e) => onChange(e.target.value)}
            className="h-full min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-muted sm:text-lg rtl:text-end"
          />
          {hasValue && !submitting && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                input.current?.focus();
              }}
              aria-label={t("hero.clear")}
              className="sv-focus inline-flex size-9 shrink-0 items-center justify-center rounded-md text-muted hover:text-text"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
          <button
            type={hasValue ? "submit" : "button"}
            onClick={hasValue ? undefined : paste}
            disabled={submitting}
            aria-busy={submitting || undefined}
            aria-label={actionLabel}
            title={actionLabel}
            className={cx(
              "sv-focus inline-flex h-13 shrink-0 items-center justify-center gap-2 rounded-lg font-semibold select-none sm:h-15",
              "transition-[background-color,color,transform] duration-(--sv-motion-fast) active:translate-y-px",
              hasValue ? "min-w-13 px-4 sm:min-w-15 sm:px-5" : "w-13 sm:w-15",
              submitting
                ? "border border-border bg-surface-raised text-text"
                : "bg-accent text-on-accent shadow-card hover:bg-accent-hover",
            )}
          >
            {submitting ? (
              <Spinner size={20} />
            ) : pasted ? (
              <Check className="size-6" aria-hidden="true" />
            ) : hasValue ? (
              <>
                <span className="hidden sm:inline">{t("hero.submit")}</span>
                <ArrowRight className="size-6 rtl:-scale-x-100" strokeWidth={2} aria-hidden="true" />
              </>
            ) : (
              <ClipboardPaste className="size-6" strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
      <div role="group" aria-label={t("hero.qualityGroup")} className="flex flex-wrap justify-center gap-1.5 sm:gap-2">
        {QUALITIES.map((q) => {
          const on = prefs.quality === q.value;
          return (
            <button
              key={q.value}
              type="button"
              aria-pressed={on}
              onClick={() => setPrefs({ quality: q.value })}
              className={cx(
                "sv-focus h-10 min-w-0 rounded-md border px-3 font-mono sm:min-w-16 sm:px-4 text-sm font-semibold transition-colors duration-(--sv-motion-fast)",
                "pointer-coarse:min-h-(--sv-layout-tap-min)",
                on
                  ? "border-accent bg-accent-subtle text-text"
                  : "border-border bg-surface-raised text-muted hover:border-border-input hover:text-text",
              )}
            >
              {t(q.key)}
            </button>
          );
        })}
      </div>
      {pasteHint && (
        <p id="paste-hint" className="text-center text-xs text-muted">
          {t("hero.pasteDenied")}
        </p>
      )}
    </form>
  );
}

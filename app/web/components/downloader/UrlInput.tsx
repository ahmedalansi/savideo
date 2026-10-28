"use client";
import { useRef, useState, type FormEvent } from "react";
import { Check, ClipboardPaste, Link2, X } from "lucide-react";
import { useT } from "@/lib/prefs";
import { Button } from "../ui/Button";
import { cx } from "@/lib/cx";

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
  const t = useT();
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

  return (
    <form onSubmit={submit} noValidate className="space-y-2">
      <label htmlFor="video-url" className="sr-only">
        {t("hero.label")}
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div
          className={cx(
            "flex h-13 flex-1 items-center gap-2 rounded-lg border bg-surface-raised ps-4 pe-1.5 shadow-card sm:h-14",
            "transition-colors duration-(--sv-motion-fast) focus-within:border-accent focus-within:shadow-focus",
            invalid ? "border-danger" : "border-border-input",
          )}
        >
          <Link2 className="size-5 shrink-0 text-muted" strokeWidth={1.75} aria-hidden="true" />
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
            className="h-full min-w-0 flex-1 bg-transparent text-base text-text outline-none placeholder:text-muted rtl:text-end"
          />
          {value && !submitting && (
            <button
              type="button"
              onClick={() => {
                onChange("");
                input.current?.focus();
              }}
              aria-label={t("hero.clear")}
              className="sv-focus inline-flex size-9 items-center justify-center rounded-md text-muted hover:text-text"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
          <Button
            variant="ghost"
            size="md"
            onClick={paste}
            disabled={submitting}
            icon={pasted ? <Check className="size-5 text-success" aria-hidden="true" /> : <ClipboardPaste className="size-5" strokeWidth={1.75} aria-hidden="true" />}
          >
            {pasted ? t("hero.pasted") : t("hero.paste")}
          </Button>
        </div>
        <Button type="submit" size="lg" loading={submitting} className="w-full sm:h-14 sm:w-auto">
          {t("hero.submit")}
        </Button>
      </div>
      {pasteHint && (
        <p id="paste-hint" className="text-xs text-muted">
          {t("hero.pasteDenied")}
        </p>
      )}
    </form>
  );
}

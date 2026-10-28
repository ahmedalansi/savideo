"use client";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "@/lib/cx";

export interface Segment<V extends string> {
  value: V;
  label: ReactNode;
  disabled?: boolean;
  title?: string;
}

/**
 * role="tablist" when it switches panels (pass panelId), radio group when it
 * picks a value. Arrow keys move and select, skipping disabled segments.
 */
export function SegmentedControl<V extends string>({
  segments,
  value,
  onChange,
  label,
  panelId,
  className,
}: {
  segments: Segment<V>[];
  value: V;
  onChange: (v: V) => void;
  label: string;
  panelId?: string;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabs = Boolean(panelId);

  const onKey = (e: KeyboardEvent, i: number) => {
    const rtl = document.documentElement.dir === "rtl";
    const fwd = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    if (![fwd, back, "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const step = e.key === fwd || e.key === "ArrowDown" ? 1 : -1;
    const n = segments.length;
    let j = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : i;
    for (let k = 0; k < n; k++) {
      if (e.key !== "Home" && e.key !== "End") j = (j + step + n) % n;
      if (!segments[j].disabled) break;
      if (e.key === "Home") j++;
      if (e.key === "End") j--;
    }
    refs.current[j]?.focus();
    onChange(segments[j].value);
  };

  return (
    <div
      role={tabs ? "tablist" : "radiogroup"}
      aria-label={label}
      className={cx("inline-flex gap-1 rounded-md bg-surface p-1 border border-border", className)}
    >
      {segments.map((s, i) => {
        const on = s.value === value;
        return (
          <button
            key={s.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role={tabs ? "tab" : "radio"}
            aria-selected={tabs ? on : undefined}
            aria-checked={tabs ? undefined : on}
            aria-controls={tabs ? panelId : undefined}
            aria-disabled={s.disabled || undefined}
            title={s.title}
            tabIndex={on ? 0 : -1}
            onClick={() => !s.disabled && onChange(s.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cx(
              "sv-focus inline-flex h-8 min-w-16 flex-1 items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-semibold",
              "transition-colors duration-(--sv-motion-fast) pointer-coarse:min-h-10",
              on ? "bg-surface-raised text-text shadow-card" : "text-muted hover:text-text",
              s.disabled && "cursor-not-allowed opacity-40 hover:text-muted",
            )}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

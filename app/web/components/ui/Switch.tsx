"use client";
import { useId } from "react";
import { cx } from "@/lib/cx";

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4">
      <label htmlFor={id} className="text-sm cursor-pointer">
        {label}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cx(
          "sv-focus relative h-5 w-9 shrink-0 rounded-pill border transition-colors duration-(--sv-motion-fast)",
          checked ? "border-accent bg-accent" : "border-border-input bg-bg",
        )}
      >
        <span
          className={cx(
            "absolute top-px size-4 rounded-pill transition-[inset-inline-start] duration-(--sv-motion-fast)",
            checked ? "start-[calc(100%-1.0625rem)] bg-on-accent" : "start-px bg-border-input",
          )}
        />
      </button>
    </div>
  );
}

"use client";
import type { KeyboardEvent } from "react";
import { formatDuration, parseTime } from "@/lib/format";
import { fieldClass } from "../ui/Field";
import { cx } from "@/lib/cx";

export function TimeField({
  id,
  label,
  value,
  onChange,
  max,
  invalid,
  describedBy,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  invalid?: boolean;
  describedBy?: string;
}) {
  const nudge = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
    e.preventDefault();
    const now = parseTime(value) ?? 0;
    const step = (e.shiftKey ? 10 : 1) * (e.key === "ArrowUp" ? 1 : -1);
    onChange(formatDuration(Math.min(max, Math.max(0, now + step))));
  };

  return (
    <div className="flex-1 space-y-1.5">
      <label htmlFor={id} className="block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        dir="ltr"
        value={value}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onChange={(e) => onChange(e.target.value.replace(/[^\d:]/g, ""))}
        onKeyDown={nudge}
        onBlur={() => {
          const s = parseTime(value);
          if (s != null) onChange(formatDuration(s));
        }}
        className={cx(fieldClass(invalid), "h-10 font-mono")}
      />
    </div>
  );
}

import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

export const fieldClass = (invalid?: boolean) =>
  cx(
    "sv-focus-field w-full rounded-md border bg-bg px-3 text-base text-text placeholder:text-muted",
    "transition-colors duration-(--sv-motion-fast) hover:border-muted disabled:opacity-40 read-only:bg-surface",
    invalid ? "border-danger" : "border-border-input",
  );

export const TextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(
  function TextInput({ invalid, className, ...rest }, ref) {
    return <input ref={ref} aria-invalid={invalid || undefined} className={cx(fieldClass(invalid), "h-10", className)} {...rest} />;
  },
);

export function TextArea({ invalid, className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return <textarea aria-invalid={invalid || undefined} className={cx(fieldClass(invalid), "min-h-24 py-2", className)} {...rest} />;
}

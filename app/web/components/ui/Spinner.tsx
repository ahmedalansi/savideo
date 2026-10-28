import { cx } from "@/lib/cx";

export function Spinner({ size = 16, className }: { size?: 16 | 20; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        "inline-block shrink-0 rounded-pill border-2 border-current border-e-transparent animate-spin motion-reduce:animate-none",
        size === 16 ? "size-4" : "size-5",
        className,
      )}
    />
  );
}

export function ProgressBar({ value, label }: { value?: number; label: string }) {
  const known = typeof value === "number";
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={known ? 0 : undefined}
      aria-valuemax={known ? 100 : undefined}
      aria-valuenow={known ? Math.round(value) : undefined}
      className="relative h-1 w-full overflow-hidden rounded-pill bg-skeleton"
    >
      <div
        className={cx("absolute inset-y-0 start-0 rounded-pill bg-accent", known ? "" : "w-1/3 sv-indeterminate")}
        style={known ? { width: `${value}%` } : undefined}
      />
    </div>
  );
}

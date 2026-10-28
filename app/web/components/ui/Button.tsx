import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import Link from "next/link";
import { cx } from "@/lib/cx";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "sv-focus inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-semibold select-none " +
  "transition-[background-color,color,border-color,transform] duration-(--sv-motion-fast) active:translate-y-px " +
  "disabled:pointer-events-none disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover",
  secondary: "bg-surface text-text border border-border hover:border-border-input",
  ghost: "text-text hover:bg-surface",
  danger: "bg-danger text-bg hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-4 text-sm",
  md: "h-10 px-5 text-sm",
  lg: "h-13 px-6 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cx(base, variants[variant], sizes[size], "pointer-coarse:min-h-(--sv-layout-tap-min)", className);
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", loading, icon, className, children, type = "button", ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} aria-busy={loading || undefined} className={buttonClass(variant, size, className)} {...rest}>
      {loading ? <Spinner size={size === "lg" ? 20 : 16} /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string; variant?: "ghost" | "secondary" }>(
  function IconButton({ label, variant = "ghost", className, children, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        title={label}
        className={cx(
          "sv-focus inline-flex size-10 items-center justify-center rounded-md text-muted transition-colors duration-(--sv-motion-fast) hover:text-text",
          "pointer-coarse:size-(--sv-layout-tap-min) disabled:opacity-40",
          variant === "secondary" ? "border border-border bg-surface" : "hover:bg-surface",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

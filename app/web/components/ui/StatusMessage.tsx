import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { cx } from "@/lib/cx";

export type Tone = "info" | "success" | "warning" | "error";

const tones: Record<Tone, { box: string; Icon: typeof Info }> = {
  info: { box: "bg-accent-subtle text-text [&_svg]:text-accent", Icon: Info },
  success: { box: "bg-success-subtle text-text [&_svg]:text-success", Icon: CheckCircle2 },
  warning: { box: "bg-warning-subtle text-text [&_svg]:text-warning", Icon: AlertTriangle },
  error: { box: "bg-danger-subtle text-text [&_svg]:text-danger", Icon: XCircle },
};

export function StatusMessage({
  tone,
  children,
  action,
  role,
  id,
}: {
  tone: Tone;
  children: ReactNode;
  action?: ReactNode;
  role?: "alert" | "status";
  id?: string;
}) {
  const { box, Icon } = tones[tone];
  return (
    <div id={id} role={role} className={cx("flex items-start gap-3 rounded-md px-4 py-3 text-sm", box)}>
      <Icon className="mt-0.5 size-5 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <div className="flex-1">{children}</div>
      {action}
    </div>
  );
}

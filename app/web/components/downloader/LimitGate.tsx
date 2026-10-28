"use client";
import { Clock } from "lucide-react";
import { useT } from "@/lib/prefs";
import { ButtonLink } from "../ui/Button";
import { Countdown } from "./Countdown";

/** S06. Sits where the download buttons were; the page stays readable. */
export function LimitGate({ resetsAt, onReset }: { resetsAt: string; onReset: () => void }) {
  const t = useT();
  return (
    <section aria-labelledby="gate-title" className="rounded-lg bg-warning-subtle p-6">
      <div className="flex items-start gap-4">
        <Clock className="mt-0.5 size-6 shrink-0 text-warning" strokeWidth={1.75} aria-hidden="true" />
        <div className="space-y-3">
          <h3 id="gate-title" className="text-lg font-semibold">
            {t("quota.gateTitle")}
          </h3>
          <p className="text-sm text-muted">{t("quota.gateBody")}</p>
          <p className="text-base font-semibold">
            {t("quota.next")} <Countdown to={resetsAt} onDone={onReset} />
          </p>
          <ButtonLink href="/apps" variant="ghost" size="sm">{t("quota.cta")}</ButtonLink>
        </div>
      </div>
    </section>
  );
}

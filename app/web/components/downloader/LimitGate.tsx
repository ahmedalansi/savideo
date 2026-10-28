"use client";
import { Clock, Heart } from "lucide-react";
import { useT } from "@/lib/prefs";
import { DONATE_URL, GATE_SLOT, toolUrl } from "@/lib/monetize";
import { buttonClass, ButtonLink } from "../ui/Button";
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
          <GateSlot />
        </div>
      </div>
    </section>
  );
}

/** The one promo under the countdown, picked by GATE_SLOT in lib/monetize.ts. Hidden when its link is empty. */
function GateSlot() {
  const t = useT();
  if (GATE_SLOT === "apps") return <ButtonLink href="/apps" variant="ghost" size="sm">{t("quota.cta")}</ButtonLink>;
  if (GATE_SLOT === "donate") {
    if (!DONATE_URL) return null;
    return (
      <a href={DONATE_URL} target="_blank" rel="noopener" className={buttonClass("ghost", "sm")}>
        <Heart className="size-4 text-accent" strokeWidth={1.75} aria-hidden="true" />
        {t("gate.donate")}
      </a>
    );
  }
  if (GATE_SLOT) {
    const url = toolUrl(GATE_SLOT);
    if (!url) return null;
    return (
      <a href={url} target="_blank" rel="sponsored noopener" className={buttonClass("ghost", "sm")}>
        {t("gate.tool", { name: t(`tools.items.${GATE_SLOT}.name`) })}
      </a>
    );
  }
  return null;
}

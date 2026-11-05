"use client";
import { useEffect, useState } from "react";
import { useT } from "@/lib/prefs";
import { MAKERS_APP_URL, WAIT_AD } from "@/lib/monetize";
import { cx } from "@/lib/cx";

const SLIDE_MS = 3000;
const STEPS = ["snap", "pick", "cook", "plan"] as const;

/**
 * The ad inside the wait window: a phone showing our own app in four steps that keep
 * cycling until the file is ready. Hidden when WAIT_AD is null or its link is empty.
 */
export function WaitAd() {
  const t = useT();
  const [slide, setSlide] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setTick((n) => {
        if (n + 100 >= SLIDE_MS) {
          setSlide((s) => (s + 1) % STEPS.length);
          return 0;
        }
        return n + 100;
      });
    }, 100);
    return () => clearInterval(id);
  }, []);

  if (WAIT_AD !== "makers" || !MAKERS_APP_URL) return null;

  return (
    <aside
      aria-label={t("wait.adLabel")}
      className="relative grid gap-3 rounded-lg border border-border p-3"
      style={{
        backgroundImage:
          "linear-gradient(var(--sv-color-border) 1px, transparent 1px), linear-gradient(90deg, var(--sv-color-border) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
      }}
    >
      <span className="absolute start-2.5 top-2.5 z-10 rounded-sm border border-warning bg-warning-subtle px-2 text-xs font-bold text-warning">
        {t("wait.ad")}
      </span>

      <p className="mt-6 flex items-center justify-center gap-2 text-sm font-semibold" aria-live="off">
        <span className="grid size-5.5 place-items-center rounded-pill bg-[#d63a5a] font-mono text-xs text-white">{slide + 1}</span>
        {t(`wait.steps.${STEPS[slide]}`)}
      </p>

      <div className="mx-auto h-[300px] w-[172px] max-w-full rounded-[28px] bg-[#0b1012] p-2" aria-hidden="true">
        <div className="relative h-full overflow-hidden rounded-[21px] bg-surface-raised">
          <div className="mx-auto mt-1.5 h-3 w-12 rounded-pill bg-[#0b1012]" />
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={cx(
                "absolute inset-x-2.5 top-7 bottom-2.5 grid content-start gap-2 transition-opacity duration-(--sv-motion-slow) motion-reduce:transition-none",
                i === slide ? "opacity-100" : "opacity-0",
              )}
            >
              <Screen step={s} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1.5" aria-hidden="true">
        {STEPS.map((s, i) => (
          <div key={s} className={cx("grid gap-1 text-center text-[11px]", i === slide ? "font-semibold text-text" : "text-muted")}>
            <span className="block h-[3px] overflow-hidden rounded-pill bg-skeleton">
              <span
                className="block h-full bg-[#d63a5a]"
                style={{ width: `${i < slide ? 100 : i === slide ? Math.min(100, (tick / SLIDE_MS) * 100) : 0}%` }}
              />
            </span>
            {t(`wait.tabs.${s}`)}
          </div>
        ))}
      </div>

      <a
        href={MAKERS_APP_URL}
        target="_blank"
        rel="noopener"
        dir="ltr"
        className="sv-focus flex items-center justify-center gap-2.5 rounded-md bg-black px-3 py-2 text-white"
      >
        <svg width="20" height="22" viewBox="0 0 22 24" aria-hidden="true">
          <path d="M1 1l12 11L1 23z" fill="#34a853" />
          <path d="M1 1l16 9-4 2z" fill="#4285f4" />
          <path d="M1 23l16-9-4-2z" fill="#ea4335" />
          <path d="M17 10l4 2-4 2-4-2z" fill="#fbbc04" />
        </svg>
        <span className="leading-none">
          <small className="block text-[10px] opacity-80">GET IT ON</small>
          <strong className="text-base">Google Play</strong>
        </span>
        <span className="sr-only">{t("makers.name")}</span>
        <span className="ms-1 rounded-sm border border-white/50 px-1.5 text-[10px]">FREE</span>
      </a>
      <p className="text-center text-xs text-muted">{t("wait.adNote")}</p>
    </aside>
  );
}

function Line({ w = "100%" }: { w?: string }) {
  return <div className="h-2 rounded-pill bg-skeleton" style={{ width: w }} />;
}

function AppHead({ children }: { children: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-bold">
      <span className="size-4 rounded-[5px] bg-[#f2994a]" />
      {children}
    </div>
  );
}

function Screen({ step }: { step: (typeof STEPS)[number] }) {
  const t = useT();
  if (step === "snap")
    return (
      <>
        <AppHead>Fridge Feast</AppHead>
        <div className="relative h-28 overflow-hidden rounded-md bg-gradient-to-br from-[#9fd8de] to-[#e8f6f7]">
          <i className="absolute top-4 left-4 size-7 rounded-pill bg-[#e74c3c]" />
          <i className="absolute top-14 left-16 size-6 rounded-pill bg-[#f1c40f]" />
          <i className="absolute top-6 left-24 size-8 rounded-pill bg-[#27ae60]" />
        </div>
        <Line w="70%" />
        <Line w="50%" />
        <span className="absolute bottom-6 left-16 size-6 animate-ping rounded-pill border-2 border-[#d63a5a] bg-[#d63a5a]/30 motion-reduce:animate-none" />
      </>
    );
  if (step === "pick")
    return (
      <>
        <AppHead>{t("wait.tabs.pick")}</AppHead>
        <div className="flex flex-wrap gap-1">
          {(["a", "b", "c", "d", "e", "f"] as const).map((k, i) => (
            <span
              key={k}
              className={cx("rounded-pill px-2 py-0.5 text-[10px]", i % 3 === 2 ? "bg-accent-subtle text-accent" : "bg-accent text-on-accent")}
            >
              {t(`wait.food.${k}`)}
            </span>
          ))}
        </div>
        <Line />
        <Line w="60%" />
      </>
    );
  if (step === "cook")
    return (
      <>
        <AppHead>{t("wait.tabs.cook")}</AppHead>
        <div className="h-20 rounded-md bg-gradient-to-br from-[#f6c28b] to-[#fbe7d0]" />
        <div className="grid gap-1 rounded-md border border-border p-2 text-[11px]">
          <b>{t("wait.recipe")}</b>
          <span className="text-muted">{t("wait.recipeMeta")}</span>
        </div>
      </>
    );
  return (
    <>
      <AppHead>{t("wait.tabs.plan")}</AppHead>
      {(["d1", "d2", "d3"] as const).map((d) => (
        <div key={d} className="rounded-md border border-border p-2 text-[11px]">
          {t(`wait.week.${d}`)}
        </div>
      ))}
    </>
  );
}

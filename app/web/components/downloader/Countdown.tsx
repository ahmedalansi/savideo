"use client";
import { useEffect, useState } from "react";
import { formatDuration } from "@/lib/format";

/** Counts down to `to` every second. Not a live region: callers announce the end. */
export function Countdown({ to, onDone }: { to: string; onDone?: () => void }) {
  const target = new Date(to).getTime();
  const [left, setLeft] = useState(() => Math.max(0, target - Date.now()));

  useEffect(() => {
    const tick = () => {
      const ms = Math.max(0, target - Date.now());
      setLeft(ms);
      if (ms === 0) onDone?.();
      return ms;
    };
    if (tick() === 0) return;
    const id = setInterval(() => tick() === 0 && clearInterval(id), 1000);
    return () => clearInterval(id);
  }, [target, onDone]);

  return (
    <span aria-live="off" className="font-mono sv-ltr">
      {formatDuration(Math.ceil(left / 1000))}
    </span>
  );
}

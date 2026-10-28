"use client";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { StatusMessage, type Tone } from "./StatusMessage";
import { useT } from "@/lib/prefs";

interface ToastItem {
  id: number;
  tone: Tone;
  text: string;
}

const ToastContext = createContext<(tone: Tone, text: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const t = useT();
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    setItems((list) => list.filter((i) => i.id !== id));
  }, []);

  const arm = useCallback(
    (id: number, tone: Tone) => {
      if (tone === "error") return; // errors stay until dismissed
      timers.current.set(id, setTimeout(() => dismiss(id), 5000));
    },
    [dismiss],
  );

  const push = useCallback(
    (tone: Tone, text: string) => {
      const id = nextId.current++;
      setItems((list) => [...list.slice(-2), { id, tone, text }]);
      arm(id, tone);
    },
    [arm],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:end-6 sm:bottom-6 sm:items-end"
      >
        {items.map((i) => (
          <div
            key={i.id}
            className="pointer-events-auto w-full max-w-sm rounded-md shadow-pop sv-toast-in"
            onMouseEnter={() => clearTimeout(timers.current.get(i.id))}
            onMouseLeave={() => arm(i.id, i.tone)}
            onFocus={() => clearTimeout(timers.current.get(i.id))}
            onBlur={() => arm(i.id, i.tone)}
          >
            <StatusMessage
              tone={i.tone}
              action={
                <button
                  type="button"
                  onClick={() => dismiss(i.id)}
                  aria-label={t("toast.dismiss")}
                  className="sv-focus -m-1 rounded-sm p-1 text-muted hover:text-text"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              }
            >
              {i.text}
            </StatusMessage>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

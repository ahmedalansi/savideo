"use client";
import type { ReactNode } from "react";
import { PrefsProvider } from "@/lib/prefs";
import { ToastProvider } from "./ui/Toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PrefsProvider>
      <ToastProvider>{children}</ToastProvider>
    </PrefsProvider>
  );
}

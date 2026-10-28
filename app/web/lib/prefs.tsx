"use client";
// Preferences (S08) and recent downloads (S09) live only in this browser.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import en from "@/messages/en.json";
import ar from "@/messages/ar.json";

export type Theme = "system" | "light" | "dark";
export type Lang = "en" | "ar";
export type DefaultQuality = "best" | "1080" | "720" | "mp3";

export interface Prefs {
  theme: Theme;
  lang: Lang;
  quality: DefaultQuality;
  keepHistory: boolean;
}

export interface RecentItem {
  title: string;
  url: string;
  label: string;
  saved_at: string;
}

const PREFS_KEY = "sv.prefs";
const RECENT_KEY = "sv.recent";
const DEFAULTS: Prefs = { theme: "system", lang: "en", quality: "best", keepHistory: true };
const MESSAGES = { en, ar };

type Vars = Record<string, string | number>;

interface Ctx {
  prefs: Prefs;
  setPrefs: (p: Partial<Prefs>) => void;
  recent: RecentItem[];
  addRecent: (item: Omit<RecentItem, "saved_at">) => void;
  clearRecent: () => void;
  t: (key: string, vars?: Vars) => string;
}

const PrefsContext = createContext<Ctx | null>(null);

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function lookup(lang: Lang, key: string): string {
  const walk = (obj: unknown) =>
    key.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), obj);
  const v = walk(MESSAGES[lang]) ?? walk(MESSAGES.en);
  return typeof v === "string" ? v : key;
}

/** Applies theme, language and direction to <html>. Also inlined in layout.tsx to avoid a flash. */
export function applyToDocument(p: Prefs) {
  const el = document.documentElement;
  if (p.theme === "system") el.removeAttribute("data-theme");
  else el.setAttribute("data-theme", p.theme);
  el.lang = p.lang;
  el.dir = p.lang === "ar" ? "rtl" : "ltr";
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [prefs, setState] = useState<Prefs>(DEFAULTS);
  const [recent, setRecent] = useState<RecentItem[]>([]);

  useEffect(() => {
    setState(read(PREFS_KEY, DEFAULTS));
    try {
      setRecent(JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"));
    } catch {}
  }, []);

  useEffect(() => {
    applyToDocument(prefs);
    document.title = lookup(prefs.lang, "meta.title");
  }, [prefs]);

  const setPrefs = useCallback((p: Partial<Prefs>) => {
    setState((prev) => {
      const next = { ...prev, ...p };
      try {
        localStorage.setItem(PREFS_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const saveRecent = (list: RecentItem[]) => {
    setRecent(list);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    } catch {}
  };

  const addRecent = useCallback(
    (item: Omit<RecentItem, "saved_at">) => {
      if (!prefs.keepHistory) return;
      setRecent((prev) => {
        const list = [{ ...item, saved_at: new Date().toISOString() }, ...prev].slice(0, 20);
        try {
          localStorage.setItem(RECENT_KEY, JSON.stringify(list));
        } catch {}
        return list;
      });
    },
    [prefs.keepHistory],
  );

  const t = useCallback(
    (key: string, vars?: Vars) =>
      lookup(prefs.lang, key).replace(/\{(\w+)\}/g, (_, k) => (vars && k in vars ? String(vars[k]) : `{${k}}`)),
    [prefs.lang],
  );

  const value = useMemo(
    () => ({ prefs, setPrefs, recent, addRecent, clearRecent: () => saveRecent([]), t }),
    [prefs, setPrefs, recent, addRecent, t],
  );
  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): Ctx {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs outside PrefsProvider");
  return ctx;
}

export const useT = () => usePrefs().t;

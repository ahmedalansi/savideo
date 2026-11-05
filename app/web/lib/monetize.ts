// Donation and affiliate links, all in one place. Paste real URLs here; an empty
// string hides that link everywhere it is used.

/** Your Ko-fi page, e.g. "https://ko-fi.com/yourname". */
export const DONATE_URL = "https://ko-fi.com/savideo";

/** Our own Android app on Google Play, shown on /apps and (optionally) under the countdown. */
export const MAKERS_APP_URL = "https://play.google.com/store/apps/details?id=com.ownsupernoob.fridgefeast";

export type ToolId = "vpn" | "compressor";

/** Affiliate partners on /tools. Names and blurbs live in messages/*.json under tools.items.<id>. */
export const TOOLS: { id: ToolId; url: string }[] = [
  { id: "vpn", url: "" },
  { id: "compressor", url: "" },
];

/**
 * What sits under the countdown when the free limit is used up:
 * "donate", "makers" (our own app on Google Play), a tool id, "apps" (the extension/app page) or null for nothing.
 */
export const GATE_SLOT: "donate" | "makers" | "apps" | ToolId | null = "makers";

export const activeTools = TOOLS.filter((t) => t.url);
export const toolUrl = (id: ToolId) => TOOLS.find((t) => t.id === id)?.url ?? "";

/**
 * The wait window that opens after Download: conversion progress plus an ad.
 * Seconds the window stays up before the file is handed over (at least until the API answers).
 * 0 turns the window off and the download starts at once. NEXT_PUBLIC_WAIT_AD_SECONDS overrides it.
 */
export const WAIT_AD_SECONDS = (() => {
  const n = Number(process.env.NEXT_PUBLIC_WAIT_AD_SECONDS ?? 8);
  return Number.isFinite(n) && n >= 0 ? n : 8;
})();

/** What the wait window advertises: "makers" (our own app on Google Play) or null for no ad. */
export const WAIT_AD: "makers" | null = "makers";

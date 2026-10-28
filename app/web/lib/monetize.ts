// Donation and affiliate links, all in one place. Paste real URLs here; an empty
// string hides that link everywhere it is used.

/** Your Ko-fi page, e.g. "https://ko-fi.com/yourname". */
export const DONATE_URL = "https://ko-fi.com/savideo";

export type ToolId = "vpn" | "compressor";

/** Affiliate partners on /tools. Names and blurbs live in messages/*.json under tools.items.<id>. */
export const TOOLS: { id: ToolId; url: string }[] = [
  { id: "vpn", url: "" },
  { id: "compressor", url: "" },
];

/**
 * What sits under the countdown when the free limit is used up:
 * "donate", a tool id, "apps" (the extension/app page) or null for nothing.
 */
export const GATE_SLOT: "donate" | "apps" | ToolId | null = "donate";

export const activeTools = TOOLS.filter((t) => t.url);
export const toolUrl = (id: ToolId) => TOOLS.find((t) => t.id === id)?.url ?? "";

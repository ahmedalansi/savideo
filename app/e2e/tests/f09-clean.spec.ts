import { test, expect, resolved, row } from "./fixtures";

// Fix 1 (replica/fixes.md): a download click gives one file and nothing else.
// The landing page promises "no pop-ups, no new tabs", so this test guards it.
test.describe("F09 clean download promise", () => {
  test("F09-H1 a download click opens no window and stays on the page", async ({ page, context }) => {
    await resolved(page);
    const before = page.url();
    const popups: string[] = [];
    context.on("page", (p) => popups.push(p.url()));
    const dl = page.waitForEvent("download");
    await row(page, "720p").click();
    await dl;
    await page.waitForTimeout(500);
    expect(popups).toEqual([]);
    expect(page.url()).toBe(before);
  });

  test("F09-H2 the home page loads no third-party scripts", async ({ page }) => {
    const foreign: string[] = [];
    page.on("request", (r) => {
      const host = new URL(r.url()).hostname;
      if (r.resourceType() === "script" && host !== "localhost") foreign.push(r.url());
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(foreign).toEqual([]);
  });
});

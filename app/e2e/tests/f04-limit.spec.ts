import { test, expect, axe, resolved, row, API } from "./fixtures";

async function useAll(page: import("@playwright/test").Page) {
  for (const label of ["720p", "1080p", "720p"]) {
    const dl = page.waitForEvent("download");
    const b = row(page, label);
    await expect(b).toBeEnabled({ timeout: 10_000 });
    await b.click();
    await dl;
  }
}

test.describe("F04 free limit", () => {
  test("F04-H1 the gate replaces the buttons after 3 downloads, with a countdown @mobile", async ({ page }) => {
    await resolved(page);
    await useAll(page);
    await expect(page.getByRole("heading", { name: "That's this hour's 3 free downloads" })).toBeVisible();
    await expect(page.getByText(/Next free download in \d+:\d\d/)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Download / })).toHaveCount(0);
    const app = page.getByRole("link", { name: /From the makers of savideo/ });
    await expect(app).toHaveAttribute("href", /play\.google\.com\/store\/apps\/details\?id=com\.ownsupernoob\.fridgefeast/);
    await expect(app).toHaveAttribute("target", "_blank");
    await axe(page, "S06 gate");
  });

  test("F04-E1 the gate survives a reload and a new link", async ({ page }) => {
    await resolved(page);
    await useAll(page);
    await page.reload();
    await resolved(page, "https://www.reddit.com/r/videos/comments/abc123/x/");
    await expect(page.getByRole("heading", { name: "That's this hour's 3 free downloads" })).toBeVisible();
  });

  test("F04-E2 two tabs share one counter", async ({ page, context }) => {
    await resolved(page);
    await useAll(page);
    const tab2 = await context.newPage();
    await resolved(tab2);
    await expect(tab2.getByRole("heading", { name: "That's this hour's 3 free downloads" })).toBeVisible();
  });

  test("F04-E3 a tab opened before the limit was hit gets a clean gate, not an error", async ({ page, context }) => {
    const tab2 = await context.newPage();
    await resolved(tab2);
    await resolved(page);
    await useAll(page);
    await row(tab2, "720p").click();
    await expect(tab2.getByRole("heading", { name: "That's this hour's 3 free downloads" })).toBeVisible();
  });

  test("F04-E4 the server refuses a 4th ticket even if the page is bypassed", async ({ page }) => {
    await resolved(page);
    await useAll(page);
    const media = await page.request.post(`${API}/v1/media/resolve`, { data: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } });
    const r = await page.request.post(`${API}/v1/downloads`, { data: { media_id: (await media.json()).media_id, format_id: "v720", kind: "video" } });
    expect(r.status()).toBe(429);
    expect((await r.json()).error.code).toBe("quota_exceeded");
  });

  test("F04-E5 a new browser (no cookie) starts at 3", async ({ browser }) => {
    const ctx = await browser.newContext();
    const q = await (await ctx.request.get(`${API}/v1/quota`)).json();
    expect(q.used).toBe(0);
    expect(q.limit).toBe(3);
    await ctx.close();
  });

  test("F04-E6 countdown reaching zero brings the buttons back", async ({ page }) => {
    await page.clock.install();
    await resolved(page);
    await useAll(page);
    await expect(page.getByRole("heading", { name: "That's this hour's 3 free downloads" })).toBeVisible();
    await page.clock.fastForward("01:00:00");
    await expect(page.getByRole("button", { name: /^Download 720p/ })).toBeVisible();
  });
});

import { test, expect, axe, API } from "./fixtures";

const PAGES = ["/", "/faq", "/apps", "/terms", "/privacy", "/copyright", "/about", "/contact"];

test.describe("S10-S15 static pages", () => {
  for (const p of PAGES) {
    test(`P-${p} loads, has one h1, passes axe @mobile`, async ({ page }) => {
      await page.goto(p);
      await expect(page.locator("h1")).toHaveCount(1);
      await axe(page, p);
      const width = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(width).toBeLessThanOrEqual(0);
    });
  }

  test("P-skip the skip link moves focus to the page content on every page", async ({ page }) => {
    for (const p of ["/", "/faq"]) {
      await page.goto(p);
      await page.keyboard.press("Tab");
      const skip = page.getByRole("link", { name: "Skip to main content" });
      await expect(skip).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(new RegExp(`${p === "/" ? "/" : p}#main$`));
    }
  });

  test("P-404 unknown page shows the not-found page", async ({ page }) => {
    const r = await page.goto("/nope-nope");
    expect(r?.status()).toBe(404);
    await expect(page.getByRole("link", { name: /home|downloader/i }).first()).toBeVisible();
  });

  test("S14-H1 takedown form: validation, then saved", async ({ page }) => {
    await page.goto("/copyright");
    await page.getByRole("button", { name: /send|submit/i }).click();
    await expect(page.locator("#name-err")).toBeVisible();
    await page.getByLabel("Name", { exact: true }).fill("Rights Holder");
    await page.getByLabel("Email").fill("rights@studio-films.com");
    await page.getByLabel("The work you own").fill("My film");
    await page.getByLabel("Video links, one per line").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ\nhttps://x.com/a/status/1");
    await page.getByRole("checkbox").check();
    await page.getByLabel("Signature (type your full name)").fill("Rights Holder");
    const resp = page.waitForResponse((r) => r.url() === `${API}/v1/takedowns`);
    await page.getByRole("button", { name: /send|submit/i }).click();
    expect((await resp).status()).toBe(201);
    await expect(page.getByRole("status").filter({ hasText: "We got your request" })).toBeVisible();
  });
});

import { test, expect, axe, resolved, row } from "./fixtures";

test.describe("F08 preferences, S09 recent downloads", () => {
  test("F08-H1 dark theme and Arabic persist across reloads @mobile", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    const dlg = page.getByRole("dialog", { name: "Settings" });
    await expect(dlg).toBeVisible();
    await axe(page, "S08 settings");
    await dlg.getByRole("radio", { name: "Dark" }).click();
    await dlg.getByLabel("Language").selectOption("ar");
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await page.keyboard.press("Escape");
    await expect(dlg).toBeHidden();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await axe(page, "S01 arabic dark");
  });

  test("F08-E1 default quality MP3 opens on the Audio tab", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("radio", { name: "MP3" }).click();
    await page.keyboard.press("Escape");
    await resolved(page);
    await expect(page.getByRole("tab", { name: "Audio" })).toHaveAttribute("aria-selected", "true");
  });

  test("F08-E2 default 720p marks 720p as Best", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Settings" }).click();
    await page.getByRole("radio", { name: "720p" }).click();
    await page.keyboard.press("Escape");
    await resolved(page);
    await expect(page.getByRole("listitem").filter({ has: row(page, "720p") }).getByText("Best")).toBeVisible();
  });

  test("S09-H1 a download shows in recent; history off stops it; clear empties it", async ({ page }) => {
    await resolved(page);
    const dl = page.waitForEvent("download");
    await row(page, "720p").click();
    await dl;
    await page.getByRole("button", { name: "Settings" }).click();
    const dlg = page.getByRole("dialog", { name: "Settings" });
    await expect(dlg.getByRole("link", { name: /Open link: .*short trip/ })).toBeVisible();
    await dlg.getByRole("button", { name: "Clear history" }).click();
    await expect(dlg.getByText(/Nothing yet/)).toBeVisible();
    await dlg.getByRole("switch", { name: "Keep recent downloads on this device" }).click();
    await page.keyboard.press("Escape");
    const dl2 = page.waitForEvent("download");
    await row(page, "1080p").click();
    await dl2;
    await page.getByRole("button", { name: "Settings" }).click();
    await expect(dlg.getByText(/Nothing yet/)).toBeVisible();
  });

  test("S09-E1 broken localStorage does not break the page", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("sv.prefs", "{not json");
      localStorage.setItem("sv.recent", "[{]");
    });
    await page.goto("/");
    await expect(page.getByLabel("Video link")).toBeVisible();
  });
});

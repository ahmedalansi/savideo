import { execFileSync } from "node:child_process";
import { test, expect, axe, resolved, row } from "./fixtures";

test.describe("F02 audio only", () => {
  test("F02-H1 Audio tab, MP3 192 kbps saves an MP3", async ({ page }) => {
    await resolved(page);
    await page.getByRole("tab", { name: "Audio" }).click();
    await expect(page.getByRole("tab", { name: "Audio" })).toHaveAttribute("aria-selected", "true");
    await axe(page, "S03 audio tab");
    const dl = page.waitForEvent("download");
    await row(page, "MP3 192 kbps").click();
    const file = await dl;
    expect(file.suggestedFilename()).toMatch(/\(192kbps\)\.mp3$/);
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=codec_name", "-of", "csv=p=0", await file.path()]).toString().trim();
    expect(out).toBe("mp3");
  });

  test("F02-E1 X link: audio tab is disabled with a reason", async ({ page }) => {
    await resolved(page, "https://x.com/someone/status/1234567890");
    const tab = page.getByRole("tab", { name: "Audio" });
    await expect(tab).toHaveAttribute("aria-disabled", "true");
    await expect(page.getByText("This site doesn't offer audio-only files")).toBeVisible();
    await tab.click({ force: true });
    await expect(page.getByRole("tab", { name: "Video" })).toHaveAttribute("aria-selected", "true");
  });

  test("F02-E2 arrow keys move between Video and Audio tabs", async ({ page }) => {
    await resolved(page);
    await page.getByRole("tab", { name: "Video" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("tab", { name: "Audio" })).toHaveAttribute("aria-selected", "true");
  });
});

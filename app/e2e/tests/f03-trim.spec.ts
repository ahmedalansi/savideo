import { execFileSync } from "node:child_process";
import { test, expect, axe, resolved, row } from "./fixtures";

async function openTrim(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Trim" }).click();
  await expect(page.getByLabel("Start")).toHaveValue("0:00");
  await expect(page.getByLabel("End")).toHaveValue("0:10");
}

test.describe("F03 trim then download", () => {
  test("F03-H1 0:02 to 0:06 gives a 4 s clip, sizes update @mobile", async ({ page }) => {
    await resolved(page);
    const before = await row(page, "720p").getAttribute("aria-label");
    await openTrim(page);
    await page.getByLabel("Start").fill("0:02");
    await page.getByLabel("End").fill("0:06");
    await expect(page.locator("#trim-msg")).toHaveText("Clip: 0:04");
    expect(await row(page, "720p").getAttribute("aria-label")).not.toBe(before);
    await axe(page, "S04 trim");
    const dl = page.waitForEvent("download");
    await row(page, "720p").click();
    const file = await dl;
    expect(file.suggestedFilename()).toMatch(/\(720p clip\)\.mp4$/);
    const d = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", await file.path()]).toString());
    expect(d).toBeGreaterThan(3.5);
    expect(d).toBeLessThan(6.5);
  });

  for (const [id, start, end, msg] of [
    ["F03-N1 end before start", "0:06", "0:02", "The end has to come after the start."],
    ["F03-N2 end beyond duration", "0:00", "0:30", "The end is past the end of the video (0:10)."],
    ["F03-N3 zero-length clip", "0:04", "0:04", "The end has to come after the start."],
    ["F03-N4 bad format", "1:75", "0:06", "Write the time as m:ss or h:mm:ss."],
    ["F03-N5 letters are dropped", "abc", "0:06", "Write the time as m:ss or h:mm:ss."],
  ] as const) {
    test(id, async ({ page }) => {
      await resolved(page);
      await openTrim(page);
      await page.getByLabel("Start").fill(start);
      await page.getByLabel("End").fill(end);
      await expect(page.locator("#trim-msg")).toHaveText(msg);
      await expect(row(page, "720p")).toBeDisabled();
      await expect(page.getByLabel("Start")).toHaveAttribute("aria-invalid", "true");
    });
  }

  test("F03-E1 h:mm:ss and plain seconds are accepted", async ({ page }) => {
    await resolved(page);
    await openTrim(page);
    await page.getByLabel("Start").fill("0:00:03");
    await page.getByLabel("End").fill("8");
    await expect(page.locator("#trim-msg")).toHaveText("Clip: 0:05");
    await page.getByLabel("End").blur();
    await expect(page.getByLabel("End")).toHaveValue("0:08");
  });

  test("F03-E2 arrow keys nudge, Shift+arrow by 10, clamped to the video", async ({ page }) => {
    await resolved(page);
    await openTrim(page);
    await page.getByLabel("Start").focus();
    await page.keyboard.press("ArrowUp");
    await expect(page.getByLabel("Start")).toHaveValue("0:01");
    await page.keyboard.press("Shift+ArrowUp");
    await expect(page.getByLabel("Start")).toHaveValue("0:10");
    await page.keyboard.press("ArrowDown");
    await expect(page.getByLabel("Start")).toHaveValue("0:09");
  });

  test("F03-E3 Full video resets, closing the panel downloads the full file", async ({ page }) => {
    await resolved(page);
    await openTrim(page);
    await page.getByLabel("Start").fill("0:02");
    await page.getByRole("button", { name: "Full video" }).click();
    await expect(page.getByLabel("Start")).toHaveValue("0:00");
    await page.getByLabel("Start").fill("0:02");
    await page.getByRole("button", { name: /^Trim/ }).click();
    const dl = page.waitForEvent("download");
    await row(page, "720p").click();
    expect((await dl).suggestedFilename()).toMatch(/\(720p\)\.mp4$/);
  });

  test("F03-E4 trimmed MP3", async ({ page }) => {
    await resolved(page);
    await page.getByRole("tab", { name: "Audio" }).click();
    await openTrim(page);
    await page.getByLabel("End").fill("0:03");
    const dl = page.waitForEvent("download");
    await row(page, "MP3 128 kbps").click();
    const file = await dl;
    const d = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", await file.path()]).toString());
    expect(d).toBeLessThan(4.5);
  });
});

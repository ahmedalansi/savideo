import { execFileSync } from "node:child_process";
import { test, expect, alert, axe, getVideo, resolved, row, YT, API } from "./fixtures";

function probe(path: string) {
  return JSON.parse(
    execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=codec_type,height", "-of", "json", path]).toString(),
  );
}

test.describe("F01 download a video", () => {
  test("F01-H1 paste, pick 720p, file saved @mobile", async ({ page }) => {
    await page.goto("/");
    await axe(page, "S01 empty");
    await getVideo(page, YT());
    await expect(page.getByRole("heading", { name: /short trip/ })).toBeVisible();
    await axe(page, "S03 result");
    const dl = page.waitForEvent("download");
    await row(page, "720p").click();
    const file = await dl;
    expect(file.suggestedFilename()).toMatch(/^رحلة قصيرة .*\(720p\)\.mp4$/);
    const p = probe(await file.path());
    expect(p.streams.map((s: { codec_type: string }) => s.codec_type).sort()).toEqual(["audio", "video"]);
    await expect(page.getByRole("status").or(page.locator("[aria-live=polite]")).getByText(/download has started/)).toBeVisible();
    await expect(page.getByText("2 of 3 free downloads left this hour")).toBeVisible();
  });

  test("F01-H2 1080p is merged video + audio", async ({ page }) => {
    await resolved(page);
    const dl = page.waitForEvent("download");
    await row(page, "1080p").click();
    const p = probe(await (await dl).path());
    expect(p.streams.find((s: { codec_type: string }) => s.codec_type === "video").height).toBe(1080);
    expect(p.streams.some((s: { codec_type: string }) => s.codec_type === "audio")).toBe(true);
  });

  for (const [name, url, text] of [
    ["F01-N1 not a link", "hello world", "doesn't look like a link"],
    ["F01-N2 unsupported site", "https://vimeo.com/1234", "We don't support this site yet"],
    ["F01-N3 private video", YT("PRIVATEVIDx"), "This video is private"],
    ["F01-N4 live stream", YT("LIVEVIDEOxx"), "Live streams can't be downloaded"],
    ["F01-N5 too long", YT("LONGVIDEOxx"), "longer than we can handle"],
  ] as const) {
    test(name, async ({ page }) => {
      await page.goto("/");
      await getVideo(page, url);
      await expect(alert(page)).toContainText(text);
      await axe(page, name);
    });
  }

  test("F01-E1 empty input shows an error, not a request", async ({ page }) => {
    let calls = 0;
    page.on("request", (r) => r.url().includes("/media/resolve") && calls++);
    await page.goto("/");
    await page.getByRole("button", { name: "Get video" }).click();
    await expect(alert(page)).toContainText("doesn't look like a link");
    expect(calls).toBe(0);
  });

  test("F01-E2 very long link is refused cleanly", async ({ page }) => {
    await page.goto("/");
    await getVideo(page, YT() + "&x=" + "a".repeat(3000));
    await expect(alert(page)).toBeVisible();
    await expect(alert(page)).not.toContainText("Reload the page");
  });

  test("F01-E3 link without https and with tracking params", async ({ page }) => {
    await page.goto("/");
    await getVideo(page, "youtu.be/dQw4w9WgXcQ?si=abc");
    await expect(page.getByRole("tablist", { name: "Available qualities" })).toBeVisible();
  });

  test("F01-E4 double click on a quality uses one free download", async ({ page }) => {
    await resolved(page);
    await row(page, "720p").dblclick();
    await expect(page.getByText("2 of 3 free downloads left this hour")).toBeVisible();
    const q = await page.request.get(`${API}/v1/quota`);
    expect((await q.json()).used).toBe(1);
  });

  test("F01-E5 refresh after resolve returns to a clean page", async ({ page }) => {
    await resolved(page);
    await page.reload();
    await expect(page.getByLabel("Video link")).toHaveValue("");
    await expect(page.getByRole("tablist", { name: "Available qualities" })).toHaveCount(0);
  });

  test("F01-E6 back button mid-flow", async ({ page }) => {
    await page.goto("/faq");
    await page.goto("/");
    await getVideo(page);
    await page.goBack();
    await expect(page).toHaveURL(/\/faq/);
    await page.goForward();
    await expect(page.getByLabel("Video link")).toBeVisible();
  });

  test("F01-E7 offline: resolve shows a network error and retry works", async ({ page, context }) => {
    test.info().annotations.push({ type: "allow-console", description: "offline" });
    await page.goto("/");
    await context.setOffline(true);
    await getVideo(page);
    await expect(alert(page)).toContainText("couldn't reach the server");
    await context.setOffline(false);
    await page.getByRole("button", { name: "Try again" }).click();
    await expect(page.getByRole("tablist", { name: "Available qualities" })).toBeVisible();
  });

  test("F01-E8 slow network shows the loading state", async ({ page }) => {
    await page.route("**/v1/media/resolve", async (r) => {
      await new Promise((f) => setTimeout(f, 1500));
      await r.continue();
    });
    await page.goto("/");
    await getVideo(page);
    await expect(page.getByRole("status").filter({ hasText: /Loading|Reading/ })).toBeAttached();
    await expect(page.getByRole("tablist", { name: "Available qualities" })).toBeVisible();
  });

  test("F01-E9 keyboard only: paste link, Enter, Tab to a quality, Enter", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Video link").focus();
    await page.keyboard.type(YT());
    await page.keyboard.press("Enter");
    await expect(page.getByRole("tablist", { name: "Available qualities" })).toBeVisible();
    const dl = page.waitForEvent("download");
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const name = await page.evaluate(() => document.activeElement?.getAttribute("aria-label") ?? "");
      if (name.startsWith("Download 720p")) break;
    }
    await page.keyboard.press("Enter");
    await dl;
  });

  test("F01-E10 file disappears upstream: the visitor stays on the site and sees an error", async ({ page }) => {
    await resolved(page, YT("BROKENSTRMx"));
    await row(page, "720p").click();
    await page.waitForTimeout(2500);
    expect(page.url()).toBe("http://localhost:3000/");
    await expect(page.getByText("Downloads from this site are paused while we fix something.")).toBeVisible();
    await expect(page.getByLabel("Video link")).toBeVisible();
  });

  test("F01-E11 a failed download gives the free download back", async ({ page }) => {
    await resolved(page, YT("BROKENSTRMx"));
    await row(page, "720p").click();
    await page.waitForTimeout(2500);
    const q = await page.request.get(`${API}/v1/quota`);
    expect((await q.json()).used).toBe(0);
  });

  test("F01-E12 download link expired (left open > 10 min)", async ({ page }) => {
    await resolved(page);
    await page.route("**/v1/downloads", (r) =>
      r.fulfill({ status: 410, contentType: "application/json", body: JSON.stringify({ error: { code: "link_expired", message: "x", retry_at: null } }) }),
    );
    await row(page, "720p").click();
    await expect(page.getByText("This link has expired")).toBeVisible();
  });
});

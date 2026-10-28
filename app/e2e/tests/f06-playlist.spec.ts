import { test, expect, axe, getVideo, row } from "./fixtures";

test.describe("F06 playlist", () => {
  test("F06-H1 a playlist link lists 20 videos, choosing one opens it", async ({ page }) => {
    await page.goto("/");
    await getVideo(page, "https://www.youtube.com/playlist?list=PL1234567890");
    await expect(page.getByRole("heading", { name: "Playlist: Test list" })).toBeVisible();
    await expect(page.getByText("Showing the first 20 videos")).toBeVisible();
    await expect(page.getByRole("button", { name: /^Choose / })).toHaveCount(20);
    await axe(page, "S07 playlist");
    await page.getByRole("button", { name: "Choose Item 3" }).click();
    await expect(page.getByLabel("Video link")).toHaveValue(/PLITEM00003/);
    await expect(row(page, "720p")).toBeVisible();
  });

  test("F06-E1 a watch link with &list= is one video, not the playlist", async ({ page }) => {
    await page.goto("/");
    await getVideo(page, "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL1234567890");
    await expect(row(page, "720p")).toBeVisible();
  });
});

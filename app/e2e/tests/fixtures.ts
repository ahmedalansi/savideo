import { test as base, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export const API = "http://localhost:8000";
export const YT = (id = "dQw4w9WgXcQ") => `https://www.youtube.com/watch?v=${id}`;

// Chrome logs every 4xx answer as a console error. API errors (private video,
// quota...) are expected 4xx answers, and the fixture thumbnail on
// example.invalid answers 404. Anything else on the console fails a test.
const ALLOWED_CONSOLE = [/Failed to load resource: the server responded with a status of 4\d\d/];

export const test = base.extend<{ guard: void }>({
  guard: [
    async ({ page }, use) => {
      const problems: string[] = [];
      page.on("console", (m) => {
        if (m.type() === "error" && !ALLOWED_CONSOLE.some((r) => r.test(m.text()))) problems.push(`console: ${m.text()}`);
      });
      page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
      page.on("response", (r) => {
        if (r.status() >= 500 && !r.url().includes("expect5xx")) problems.push(`${r.status()} on ${r.url()}`);
      });
      await use();
      // A test that goes offline on purpose expects the browser to complain about it.
      if (base.info().annotations.some((a) => a.type === "allow-console" && a.description === "offline")) {
        const offline = /ERR_INTERNET_DISCONNECTED|Failed to fetch/;
        problems.splice(0, problems.length, ...problems.filter((p) => !offline.test(p)));
      }
      expect(problems, problems.join("\n")).toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export async function axe(page: Page, label: string) {
  const r = await new AxeBuilder({ page }).analyze();
  const v = r.violations.map((x) => `${label}: ${x.id} (${x.impact}) x${x.nodes.length}: ${x.nodes[0]?.target.join(" ")}`);
  expect(v, v.join("\n")).toEqual([]);
}

export async function getVideo(page: Page, url = YT()) {
  await page.getByLabel("Video link").fill(url);
  await page.getByRole("button", { name: "Get video" }).click();
}

export async function resolved(page: Page, url = YT()) {
  await page.goto("/");
  await getVideo(page, url);
  await expect(page.getByRole("tablist", { name: "Available qualities" })).toBeVisible();
}

export function alert(page: Page) {
  return page.getByRole("alert").filter({ hasText: /\S/ });
}

export function row(page: Page, label: string) {
  return page.getByRole("button", { name: new RegExp(`^Download ${label},`) });
}

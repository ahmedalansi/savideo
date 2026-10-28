// Stands in for GET /v1/downloads/{token} while the data layer is fake.
// Sends a small text file as an attachment so the browser's download flow runs for real.
export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const title = (q.get("title") ?? "video").slice(0, 120);
  const label = q.get("label") ?? "";
  const safe = title.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, " ").replace(/\s+/g, " ").trim() || "video";
  const name = `${safe} ${label} (demo).txt`;
  const ascii = name.replace(/[^\x20-\x7e]/g, "_");
  const body = `savideo demo file\n\nThis stands in for "${title}" (${label}, ${q.get("ext")}).\nReal files arrive once the backend is connected.\n`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
}

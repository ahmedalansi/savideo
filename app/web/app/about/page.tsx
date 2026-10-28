import { PageShell } from "@/components/PageShell";

export const metadata = { title: "About | savideo" };

export default function AboutPage() {
  return (
    <PageShell title="About">
      <p>savideo is a small, independent tool for saving public videos you have the right to keep. It runs on open-source software (yt-dlp and FFmpeg) and never stores the files it delivers.</p>
      <p>The name and look are placeholders while we pick our final brand.</p>
    </PageShell>
  );
}

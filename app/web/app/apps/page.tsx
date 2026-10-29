import { Chrome, Smartphone } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { MakersApp } from "@/components/MakersApp";
import { ButtonLink } from "@/components/ui/Button";

export const metadata = { title: "Extension and app | savideo" };

export default function AppsPage() {
  return (
    <PageShell title="Extension and app" lead="Both are on the way. They will lift the hourly limit and save you the copy-paste.">
      <ul className="not-prose grid gap-4 sm:grid-cols-2">
        {[
          { Icon: Chrome, title: "Browser extension", body: "A download button right under the video, for Chrome, Edge and other Chromium browsers." },
          { Icon: Smartphone, title: "Android app", body: "Share a video to the app from any other app and it saves straight to your gallery." },
        ].map(({ Icon, title, body }) => (
          <li key={title} className="rounded-lg border border-border bg-surface-raised p-6 shadow-card">
            <Icon className="mb-4 size-6 text-accent" strokeWidth={1.75} aria-hidden="true" />
            <h2 className="mb-1 text-base font-semibold">{title}</h2>
            <p className="mb-4 text-sm text-muted">{body}</p>
            <span className="inline-flex h-5 items-center rounded-pill bg-accent-subtle px-2 text-xs font-semibold text-accent">Coming soon</span>
          </li>
        ))}
      </ul>
      <MakersApp />
      <div className="mt-8">
        <ButtonLink href="/" variant="secondary">
          Back to the downloader
        </ButtonLink>
      </div>
    </PageShell>
  );
}

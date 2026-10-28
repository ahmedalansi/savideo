import { DraftNote, PageShell } from "@/components/PageShell";

export const metadata = { title: "Terms | savideo" };

export default function TermsPage() {
  return (
    <PageShell title="Terms of use">
      <DraftNote />
      <h2>What the service does</h2>
      <p>savideo reads a public video link you give it and sends the file to your device. We don&apos;t host, store or index any videos.</p>
      <h2>Your responsibility</h2>
      <p>Only use savideo for videos you own, videos whose owner has given you permission, or content whose licence allows saving it. You are responsible for respecting copyright and the rules of the site the video comes from.</p>
      <h2>What you may not do</h2>
      <ul>
        <li>Download content to redistribute it without the rights holder&apos;s permission.</li>
        <li>Use scripts, bots or automation to send requests in bulk.</li>
        <li>Try to get around the free limit or our security measures.</li>
      </ul>
      <h2>Limits and availability</h2>
      <p>Free use is limited per hour. Sites change without notice, so a source can stop working at any time. The service is provided as is.</p>
      <h2>Takedowns</h2>
      <p>
        Rights holders can ask us to block a video on our <a href="/copyright">copyright page</a>. We aim to respond within 48 hours.
      </p>
    </PageShell>
  );
}

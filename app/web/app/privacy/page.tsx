import { DraftNote, PageShell } from "@/components/PageShell";

export const metadata = { title: "Privacy | savideo" };

export default function PrivacyPage() {
  return (
    <PageShell title="Privacy">
      <DraftNote />
      <h2>What we keep</h2>
      <ul>
        <li>A random ID in a cookie, so we can count your free downloads this hour. It expires after two hours of no use.</li>
        <li>A hashed form of your IP address, with a key that changes every day, to stop abuse. We never store the raw address.</li>
        <li>Totals per site (how many downloads, how many failed), with nothing that points to you.</li>
      </ul>
      <h2>What we don&apos;t keep</h2>
      <p>We don&apos;t store the videos, their titles, or a list of what you downloaded. No accounts, no ad trackers.</p>
      <h2>On your device</h2>
      <p>Your settings and, if you turn it on, your recent downloads are saved in your browser only. Clear them from Settings at any time.</p>
    </PageShell>
  );
}

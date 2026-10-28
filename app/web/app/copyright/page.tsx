import { DraftNote, PageShell } from "@/components/PageShell";
import { TakedownForm } from "./TakedownForm";

export const metadata = { title: "Copyright and takedowns | savideo" };

export default function CopyrightPage() {
  return (
    <PageShell title="Copyright and takedowns" lead="If you own a video and don't want it downloadable here, tell us and we'll block it.">
      <DraftNote />
      <p>We don&apos;t host files, but we can block specific videos from being processed. Send the links and a short statement below. We aim to reply within 48 hours.</p>
      <TakedownForm />
    </PageShell>
  );
}

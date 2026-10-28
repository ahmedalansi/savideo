import { PageShell } from "@/components/PageShell";
import { ButtonLink } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <PageShell title="Page not found" lead="That address doesn't lead anywhere.">
      <ButtonLink href="/">Go to the downloader</ButtonLink>
    </PageShell>
  );
}

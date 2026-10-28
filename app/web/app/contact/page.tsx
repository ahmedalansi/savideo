import { PageShell } from "@/components/PageShell";

export const metadata = { title: "Contact | Naqi" };

export default function ContactPage() {
  return (
    <PageShell title="Contact">
      <p>
        For questions or bug reports, write to <a href="mailto:hello@naqi.example">hello@naqi.example</a> (placeholder address).
      </p>
      <p>
        For copyright requests, please use the <a href="/copyright">takedown form</a> so we can act on it quickly.
      </p>
    </PageShell>
  );
}

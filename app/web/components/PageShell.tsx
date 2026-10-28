import type { ReactNode } from "react";

export function PageShell({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-tool pt-12 sv-gutter md:pt-16">
      <h1 className="mb-3 text-xl font-extrabold tracking-tight sm:text-display">{title}</h1>
      {lead && <p className="mb-8 text-base text-muted">{lead}</p>}
      <div className="sv-prose">{children}</div>
    </div>
  );
}

export function DraftNote() {
  return (
    <p className="mb-6 rounded-md bg-warning-subtle px-4 py-3 text-sm text-text">
      Draft for the MVP, written from scratch. Have a lawyer review it before launch. English only for now.
    </p>
  );
}

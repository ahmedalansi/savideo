// Naqi mark: one drop (clean, pure) with a download arrow cut through it. Spec in replica/brand.md.
export function Wordmark() {
  return (
    <span className="flex items-center gap-2 text-lg font-bold tracking-tight sv-ltr">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7 text-accent">
        <path fill="currentColor" d="M12 2.5c-.4.5-7 8-7 12.5a7 7 0 0 0 14 0c0-4.5-6.6-12-7-12.5z" />
        <path fill="none" stroke="var(--sv-color-on-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 10v7m-3-3 3 3 3-3" />
      </svg>
      Naqi
    </span>
  );
}

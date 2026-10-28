"use client";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { ApiError } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { TextArea, TextInput } from "@/components/ui/Field";
import { StatusMessage } from "@/components/ui/StatusMessage";

type Errors = Partial<Record<"name" | "email" | "work" | "urls" | "statement" | "signature" | "form", string>>;

// Sends POST /v1/takedowns (or the fake data layer in demo mode).
export function TakedownForm() {
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get("name")).trim();
    const email = String(f.get("email")).trim();
    const work = String(f.get("work")).trim();
    const signature = String(f.get("signature")).trim();
    const next: Errors = {};
    if (!name) next.name = "Add your name or your organisation's.";
    if (!/^\S+@\S+\.\S+$/.test(email)) next.email = "Add an email address we can reply to.";
    if (!work) next.work = "Tell us which work you own.";
    const urls = String(f.get("urls")).split(/\s+/).filter(Boolean);
    if (urls.length === 0 || urls.length > 50 || urls.some((u) => !/^https?:\/\//.test(u))) next.urls = "Add one to 50 full links, one per line.";
    if (!f.get("statement")) next.statement = "Please confirm the statement.";
    if (!signature) next.signature = "Type your full name as a signature.";
    setErrors(next);
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      await api.submitTakedown({
        claimant_name: name,
        claimant_email: email,
        work_description: work,
        urls,
        statement_good_faith: true,
        statement_accuracy: true,
        signature,
      });
      setSent(true);
    } catch (err) {
      const code = err instanceof ApiError ? err.code : "network";
      setErrors({
        form:
          code === "rate_limited"
            ? "You've sent several requests already. Please wait an hour or email us."
            : code === "invalid_request"
              ? "Some details weren't accepted. Check the email address and links."
              : "We couldn't send your request. Please try again in a moment.",
      });
    } finally {
      setBusy(false);
    }
  };

  if (sent) return <StatusMessage tone="success" role="status">Thanks. We got your request and will reply by email within 48 hours.</StatusMessage>;

  const err = (k: keyof Errors) =>
    errors[k] ? (
      <p id={`${k}-err`} className="mt-1 text-sm font-semibold text-danger">
        {errors[k]}
      </p>
    ) : null;

  return (
    <form onSubmit={submit} noValidate className="not-prose mt-6 space-y-4">
      <div>
        <label htmlFor="name" className="mb-1.5 block text-sm font-semibold">Name</label>
        <TextInput id="name" name="name" autoComplete="name" invalid={!!errors.name} aria-describedby={errors.name ? "name-err" : undefined} />
        {err("name")}
      </div>
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">Email</label>
        <TextInput id="email" name="email" type="email" autoComplete="email" dir="ltr" invalid={!!errors.email} aria-describedby={errors.email ? "email-err" : undefined} />
        {err("email")}
      </div>
      <div>
        <label htmlFor="work" className="mb-1.5 block text-sm font-semibold">The work you own</label>
        <TextArea id="work" name="work" invalid={!!errors.work} aria-describedby={errors.work ? "work-err" : undefined} />
        {err("work")}
      </div>
      <div>
        <label htmlFor="urls" className="mb-1.5 block text-sm font-semibold">Video links, one per line</label>
        <TextArea id="urls" name="urls" dir="ltr" invalid={!!errors.urls} aria-describedby={errors.urls ? "urls-err" : undefined} />
        {err("urls")}
      </div>
      <div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="statement" className="sv-focus mt-0.5 size-4 accent-accent" aria-describedby={errors.statement ? "statement-err" : undefined} />
          I believe in good faith that this use is not authorised by the owner or the law, I own the rights to these videos or act for the owner, and the information above is accurate.
        </label>
        {err("statement")}
      </div>
      <div>
        <label htmlFor="signature" className="mb-1.5 block text-sm font-semibold">Signature (type your full name)</label>
        <TextInput id="signature" name="signature" autoComplete="name" invalid={!!errors.signature} aria-describedby={errors.signature ? "signature-err" : undefined} />
        {err("signature")}
      </div>
      {errors.form && <StatusMessage tone="error" role="alert">{errors.form}</StatusMessage>}
      <Button type="submit" loading={busy}>Send request</Button>
    </form>
  );
}

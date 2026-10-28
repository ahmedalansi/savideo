"use client";
import { useState } from "react";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TextInput } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProgressBar, Spinner } from "@/components/ui/Spinner";
import { StatusMessage } from "@/components/ui/StatusMessage";
import { Switch } from "@/components/ui/Switch";

/** Living copy of replica/design/preview.html, built from the real components. */
export default function DesignPage() {
  const [seg, setSeg] = useState("video");
  const [on, setOn] = useState(true);
  return (
    <div className="mx-auto max-w-content space-y-10 py-12 sv-gutter">
      <h1 className="text-xl font-bold">Design system</h1>
      <section className="space-y-3">
        <h2 className="font-semibold">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="lg" icon={<Download className="size-5" aria-hidden="true" />}>Primary lg</Button>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>HD</Badge><Badge tone="accent">4K</Badge><Badge tone="success">Best</Badge><Badge tone="warning">Slow</Badge><Badge tone="danger">No audio</Badge>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">Fields and controls</h2>
        <div className="grid max-w-md gap-3">
          <TextInput placeholder="Default" />
          <TextInput placeholder="Invalid" invalid />
          <SegmentedControl label="Kind" value={seg} onChange={setSeg} segments={[{ value: "video", label: "Video" }, { value: "audio", label: "Audio" }, { value: "off", label: "Disabled", disabled: true }]} />
          <Switch label="Switch" checked={on} onChange={setOn} />
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="font-semibold">Status</h2>
        <div className="grid max-w-xl gap-2">
          <StatusMessage tone="info">Info message</StatusMessage>
          <StatusMessage tone="success">Success message</StatusMessage>
          <StatusMessage tone="warning">Warning message</StatusMessage>
          <StatusMessage tone="error">Error message</StatusMessage>
        </div>
        <div className="flex max-w-xl items-center gap-4"><Spinner /><Spinner size={20} /><ProgressBar label="Known" value={60} /><ProgressBar label="Unknown" /></div>
        <div className="max-w-xl space-y-2"><Skeleton className="h-5 w-3/5" /><Skeleton className="h-4 w-2/5" /></div>
      </section>
    </div>
  );
}

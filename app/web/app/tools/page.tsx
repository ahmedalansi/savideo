import { notFound } from "next/navigation";
import { ToolsList } from "@/components/ToolsList";
import { activeTools } from "@/lib/monetize";

export const metadata = { title: "Tools we use | savideo" };

export default function ToolsPage() {
  // Hidden until at least one affiliate link is set in lib/monetize.ts.
  if (activeTools.length === 0) notFound();
  return <ToolsList />;
}

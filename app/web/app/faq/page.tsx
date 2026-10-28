"use client";
import { Faq } from "@/components/home/Faq";

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-tool pt-12 sv-gutter md:pt-16">
      <Faq headingLevel={1} showMore={false} />
    </div>
  );
}

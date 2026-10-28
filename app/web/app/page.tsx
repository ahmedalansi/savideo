import { Hero } from "@/components/home/Hero";
import { PlatformGrid } from "@/components/home/PlatformGrid";
import { Problem } from "@/components/home/Problem";
import { HowTo } from "@/components/home/HowTo";
import { Features } from "@/components/home/Features";
import { Pricing } from "@/components/home/Pricing";
import { Faq } from "@/components/home/Faq";
import { FinalCta } from "@/components/home/FinalCta";

export default function Home() {
  return (
    <>
      <Hero />
      <div className="mx-auto max-w-content space-y-16 sv-gutter pt-16 md:space-y-24 md:pt-24">
        <PlatformGrid />
        <Problem />
        <HowTo />
        <Features />
        <Pricing />
        <div className="mx-auto max-w-tool">
          <Faq />
        </div>
        <FinalCta />
      </div>
    </>
  );
}

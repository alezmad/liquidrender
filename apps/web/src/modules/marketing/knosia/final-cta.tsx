"use client";

import { cn } from "@turbostarter/ui";
import { buttonVariants } from "@turbostarter/ui-web/button";

import { TurboLink } from "~/modules/common/turbo-link";
import { Section } from "~/modules/marketing/layout/section";

import { finalCta } from "./copy";

export const FinalCta = () => {
  return (
    <Section className="relative overflow-hidden">
      {/* Background gradient */}
      <div className="from-primary/5 via-secondary/5 to-background absolute inset-0 bg-gradient-to-b" />

      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <h2 className="animate-fade-in text-4xl font-semibold tracking-tight text-balance opacity-0 [--animation-delay:0ms] md:text-5xl lg:text-6xl">
          {finalCta.title}
        </h2>

        <p className="text-muted-foreground animate-fade-in mx-auto mt-6 max-w-xl text-lg opacity-0 [--animation-delay:200ms]">
          {finalCta.subtitle}
        </p>

        <div className="animate-fade-in mt-8 flex flex-col items-center justify-center gap-4 opacity-0 [--animation-delay:400ms] sm:flex-row">
          <TurboLink
            href="/auth/register"
            className={cn(
              buttonVariants({ size: "lg" }),
              "min-w-[180px] text-base"
            )}
          >
            {finalCta.cta.primary}
          </TurboLink>

          <TurboLink
            href="/contact"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "min-w-[180px] text-base"
            )}
          >
            {finalCta.cta.secondary}
          </TurboLink>
        </div>

        <p className="text-muted-foreground animate-fade-in mt-6 text-sm opacity-0 [--animation-delay:600ms]">
          {finalCta.note}
        </p>
      </div>
    </Section>
  );
};

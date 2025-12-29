import { buttonVariants } from "@turbostarter/ui-web/button";
import { Icons } from "@turbostarter/ui-web/icons";
import { cn } from "@turbostarter/ui";

import { pathsConfig } from "~/config/paths";
import { TurboLink } from "~/modules/common/turbo-link";
import { Section, SectionBadge } from "~/modules/marketing/layout/section";

import { hero, briefingPreview } from "./copy";
import type { BriefingItem } from "./types";

// Use Star as the badge icon (closest to sparkles that exists)
// Use ArrowRight for primary CTA
// Use ChevronRight for secondary CTA

// ============================================
// BRIEFING ITEM COMPONENT
// ============================================

const getBriefingItemStyles = (type: BriefingItem["type"]) => {
  switch (type) {
    case "positive":
      return {
        border: "border-l-emerald-500",
        bg: "bg-emerald-500/5",
        iconBg: "bg-emerald-500/10",
      };
    case "warning":
      return {
        border: "border-l-amber-500",
        bg: "bg-amber-500/5",
        iconBg: "bg-amber-500/10",
      };
    case "target":
      return {
        border: "border-l-blue-500",
        bg: "bg-blue-500/5",
        iconBg: "bg-blue-500/10",
      };
    case "insight":
      return {
        border: "border-l-violet-500",
        bg: "bg-violet-500/5",
        iconBg: "bg-violet-500/10",
      };
  }
};

const BriefingItemCard = ({ item, index }: { item: BriefingItem; index: number }) => {
  const styles = getBriefingItemStyles(item.type);

  return (
    <div
      className={cn(
        "animate-fade-in group relative flex flex-col gap-2 rounded-lg border-l-2 p-4 opacity-0 transition-all duration-200",
        styles.border,
        styles.bg,
        "hover:shadow-sm"
      )}
      style={{ "--animation-delay": `${800 + index * 100}ms` } as React.CSSProperties}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md text-base",
            styles.iconBg
          )}
        >
          {item.icon}
        </span>
        <div className="flex-1 space-y-1">
          <h4 className="text-foreground text-sm font-medium leading-tight">
            {item.title}
          </h4>
          <p className="text-muted-foreground text-xs leading-relaxed">
            {item.detail}
          </p>
        </div>
      </div>

      {/* Actions */}
      {item.actions && item.actions.length > 0 && (
        <div className="ml-11 flex flex-wrap gap-2">
          {item.actions.map((action, actionIndex) => (
            <button
              key={actionIndex}
              className="text-primary hover:text-primary/80 text-xs font-medium underline-offset-2 transition-colors hover:underline"
            >
              {action}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================
// BRIEFING PREVIEW COMPONENT
// ============================================

const BriefingPreview = () => {
  return (
    <div
      className="animate-fade-up relative mt-8 w-full max-w-3xl opacity-0 [--animation-delay:600ms] sm:mt-12 md:mt-16"
    >
      {/* Terminal/Card wrapper */}
      <div className="bg-background/80 relative overflow-hidden rounded-xl border shadow-2xl backdrop-blur-sm">
        {/* Terminal header */}
        <div className="border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="size-3 rounded-full bg-red-500/80" />
              <div className="size-3 rounded-full bg-amber-500/80" />
              <div className="size-3 rounded-full bg-emerald-500/80" />
            </div>
            <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
              <Icons.Star className="size-3.5" />
              <span>Morning Briefing - December 29, 2025</span>
            </div>
          </div>
        </div>

        {/* Greeting */}
        <div className="border-b px-4 py-3">
          <p className="text-muted-foreground text-sm">
            Good morning. Here&apos;s what you need to know today:
          </p>
        </div>

        {/* Briefing items */}
        <div className="grid gap-3 p-4 sm:grid-cols-2">
          {briefingPreview.map((item, index) => (
            <BriefingItemCard key={index} item={item} index={index} />
          ))}
        </div>

        {/* Footer prompt */}
        <div className="border-t px-4 py-3">
          <div className="bg-muted/50 flex items-center gap-2 rounded-lg px-3 py-2">
            <span className="text-muted-foreground text-sm">
              Ask anything about your business...
            </span>
            <Icons.ArrowRight className="text-muted-foreground ml-auto size-4" />
          </div>
        </div>

        {/* Gradient overlay for visual polish */}
        <div className="from-primary/5 via-secondary/5 pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent" />
      </div>

      {/* Decorative glow */}
      <div className="from-primary/20 via-secondary/10 pointer-events-none absolute -inset-4 -z-10 rounded-2xl bg-gradient-to-r to-transparent opacity-50 blur-3xl" />
    </div>
  );
};

// ============================================
// HERO COMPONENT
// ============================================

export const Hero = async () => {
  return (
    <Section id="hero" className="gap-6 sm:gap-6 md:gap-6 lg:gap-6">
      {/* Badge */}
      <div className="animate-fade-in -translate-y-4 opacity-0">
        <SectionBadge>
          <Icons.Star className="text-primary mr-1.5 size-3.5" />
          {hero.badge}
        </SectionBadge>
      </div>

      {/* Title */}
      <h1 className="animate-fade-in mt-4 -translate-y-4 text-center text-5xl leading-[0.95] font-semibold tracking-tighter text-balance opacity-0 [--animation-delay:200ms] sm:text-6xl md:text-7xl lg:text-[5.5rem]">
        {hero.title}
      </h1>

      {/* Subtitle */}
      <p className="animate-fade-in text-muted-foreground -mt-2 -translate-y-4 text-center text-2xl font-medium tracking-tight opacity-0 [--animation-delay:300ms] sm:text-3xl md:text-4xl">
        {hero.subtitle}
      </p>

      {/* Description */}
      <p className="animate-fade-in text-muted-foreground mx-auto mb-3 max-w-[560px] -translate-y-4 text-center text-lg leading-[26px] text-balance opacity-0 [--animation-delay:400ms] sm:text-xl">
        {hero.description}
      </p>

      {/* CTAs */}
      <div className="animate-fade-in mx-auto flex w-full -translate-y-4 flex-col gap-2 opacity-0 ease-in-out [--animation-delay:500ms] sm:w-auto sm:flex-row sm:gap-3">
        <TurboLink
          href={pathsConfig.auth.register}
          className={buttonVariants({ size: "lg" })}
        >
          {hero.cta.primary}
          <Icons.ArrowRight className="ml-2 size-4" />
        </TurboLink>

        <TurboLink
          href="#how-it-works"
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          <Icons.ChevronRight className="mr-1 size-4" />
          {hero.cta.secondary}
        </TurboLink>
      </div>

      {/* Briefing Preview */}
      <BriefingPreview />
    </Section>
  );
};

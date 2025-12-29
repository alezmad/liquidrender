"use client";

import { motion } from "motion/react";

import { cn } from "@turbostarter/ui";
import { Card, CardContent } from "@turbostarter/ui-web/card";

import {
  Section,
  SectionDescription,
  SectionHeader,
  SectionTitle,
} from "~/modules/marketing/layout/section";

import { howItWorks } from "./copy";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  duration: string;
  isLast?: boolean;
}

const StepCard = ({
  number,
  title,
  description,
  duration,
  isLast,
}: StepCardProps) => {
  return (
    <div className="relative flex flex-1 flex-col">
      {/* Connector line - hidden on mobile, visible on desktop */}
      {!isLast && (
        <div className="pointer-events-none absolute left-1/2 top-8 hidden h-0.5 w-full -translate-y-1/2 lg:block">
          <div className="from-primary/40 to-primary/10 h-full w-full bg-gradient-to-r" />
          <div className="absolute -right-1 top-1/2 -translate-y-1/2">
            <svg
              width="8"
              height="12"
              viewBox="0 0 8 12"
              fill="none"
              className="text-primary/40"
            >
              <path
                d="M1 1L6 6L1 11"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Mobile connector - vertical line */}
      {!isLast && (
        <div className="from-primary/40 to-primary/10 absolute left-8 top-full h-8 w-0.5 bg-gradient-to-b lg:hidden" />
      )}

      <Card className="bg-card/50 relative h-full border backdrop-blur-sm transition-all duration-300 hover:shadow-lg">
        <CardContent className="flex flex-col gap-4 p-6">
          {/* Step number badge */}
          <div className="flex items-center gap-4">
            <div className="bg-primary text-primary-foreground flex size-14 shrink-0 items-center justify-center rounded-full font-mono text-lg font-bold shadow-md">
              {number}
            </div>
            {/* Duration tag */}
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                duration === "Automatic"
                  ? "bg-green-500/10 text-green-600 dark:text-green-400"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {duration}
            </span>
          </div>

          {/* Content */}
          <div className="space-y-2">
            <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {description}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const HowItWorks = () => {
  return (
    <Section id="how-it-works">
      <SectionHeader>
        <SectionTitle>{howItWorks.title}</SectionTitle>
        <SectionDescription>{howItWorks.subtitle}</SectionDescription>
      </SectionHeader>

      <motion.div
        className="flex w-full flex-col gap-12 lg:flex-row lg:gap-8"
        variants={staggerContainer}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true, margin: "-100px" }}
      >
        {howItWorks.steps.map((step, index) => (
          <motion.div
            key={step.number}
            className="flex-1"
            variants={fadeInUp}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <StepCard
              number={step.number}
              title={step.title}
              description={step.description}
              duration={step.duration}
              isLast={index === howItWorks.steps.length - 1}
            />
          </motion.div>
        ))}
      </motion.div>
    </Section>
  );
};

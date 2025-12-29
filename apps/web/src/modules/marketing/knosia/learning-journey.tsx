"use client";

import { motion } from "motion/react";

import { cn } from "@turbostarter/ui";

import {
  Section,
  SectionDescription,
  SectionHeader,
  SectionTitle,
} from "~/modules/marketing/layout/section";

import { learningJourney } from "./copy";

import type { JourneyStep } from "./types";

const TimelineStep = ({
  step,
  index,
  isLast,
}: {
  step: JourneyStep;
  index: number;
  isLast: boolean;
}) => {
  const isHighlighted = step.highlight;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.5,
        delay: index * 0.12,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className="relative flex gap-6 md:gap-8"
    >
      {/* Timeline line and dot */}
      <div className="relative flex flex-col items-center">
        {/* Dot */}
        <motion.div
          initial={{ scale: 0 }}
          whileInView={{ scale: 1 }}
          viewport={{ once: true }}
          transition={{
            duration: 0.4,
            delay: index * 0.12 + 0.2,
            type: "spring",
            stiffness: 200,
          }}
          className={cn(
            "relative z-10 flex size-4 shrink-0 items-center justify-center rounded-full",
            isHighlighted
              ? "bg-primary ring-primary/30 ring-4"
              : "bg-muted-foreground/40"
          )}
        >
          {isHighlighted && (
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{
                duration: 0.3,
                delay: index * 0.12 + 0.4,
              }}
              className="bg-primary-foreground size-2 rounded-full"
            />
          )}
        </motion.div>

        {/* Connecting line */}
        {!isLast && (
          <motion.div
            initial={{ scaleY: 0 }}
            whileInView={{ scaleY: 1 }}
            viewport={{ once: true }}
            transition={{
              duration: 0.4,
              delay: index * 0.12 + 0.3,
              ease: "easeOut",
            }}
            className={cn(
              "w-0.5 grow origin-top",
              isHighlighted
                ? "bg-gradient-to-b from-primary to-muted-foreground/30"
                : "bg-muted-foreground/30"
            )}
          />
        )}
      </div>

      {/* Content card */}
      <div
        className={cn(
          "mb-8 flex-1 rounded-xl border p-5 transition-all duration-300 md:mb-10 md:p-6",
          isHighlighted
            ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10"
            : "border-border/50 bg-card/50 hover:border-border hover:bg-card/80"
        )}
      >
        {/* Day badge */}
        <div className="mb-3 flex items-center gap-3">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
              isHighlighted
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {step.day}
          </span>
          {isHighlighted && (
            <span className="text-primary text-xs font-medium">
              Key Milestone
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className={cn(
            "mb-2 text-lg font-semibold tracking-tight md:text-xl",
            isHighlighted ? "text-primary" : "text-foreground"
          )}
        >
          {step.title}
        </h3>

        {/* Description */}
        <p className="text-muted-foreground text-sm leading-relaxed md:text-base">
          {step.description}
        </p>
      </div>
    </motion.div>
  );
};

// Mobile card variant for stacked layout
const MobileCard = ({
  step,
  index,
}: {
  step: JourneyStep;
  index: number;
}) => {
  const isHighlighted = step.highlight;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
      className={cn(
        "rounded-xl border p-5 transition-all duration-300",
        isHighlighted
          ? "border-primary/50 bg-primary/5 shadow-lg shadow-primary/10"
          : "border-border/50 bg-card/50"
      )}
    >
      {/* Day badge */}
      <div className="mb-3 flex items-center gap-3">
        <span
          className={cn(
            "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
            isHighlighted
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {step.day}
        </span>
        {isHighlighted && (
          <span className="text-primary text-xs font-medium">
            Key Milestone
          </span>
        )}
      </div>

      {/* Title */}
      <h3
        className={cn(
          "mb-2 text-lg font-semibold tracking-tight",
          isHighlighted ? "text-primary" : "text-foreground"
        )}
      >
        {step.title}
      </h3>

      {/* Description */}
      <p className="text-muted-foreground text-sm leading-relaxed">
        {step.description}
      </p>
    </motion.div>
  );
};

export const LearningJourney = () => {
  return (
    <Section id="learning-journey">
      <SectionHeader>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
        >
          <SectionTitle>{learningJourney.title}</SectionTitle>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <SectionDescription>{learningJourney.subtitle}</SectionDescription>
        </motion.div>
      </SectionHeader>

      {/* Desktop: Timeline layout */}
      <div className="hidden w-full max-w-2xl md:block">
        {learningJourney.steps.map((step, index) => (
          <TimelineStep
            key={step.day}
            step={step}
            index={index}
            isLast={index === learningJourney.steps.length - 1}
          />
        ))}
      </div>

      {/* Mobile: Stacked cards */}
      <div className="flex w-full flex-col gap-4 md:hidden">
        {learningJourney.steps.map((step, index) => (
          <MobileCard key={step.day} step={step} index={index} />
        ))}
      </div>
    </Section>
  );
};

"use client";

import { motion } from "motion/react";

import { cn } from "@turbostarter/ui";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@turbostarter/ui-web/card";

import {
  Section,
  SectionDescription,
  SectionHeader,
  SectionTitle,
} from "~/modules/marketing/layout/section";

import { threeModes } from "./copy";

import type { ModeCard } from "./types";

const ModeCardComponent = ({
  mode,
  index,
}: {
  mode: ModeCard;
  index: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.5,
        delay: index * 0.15,
        ease: [0.21, 0.47, 0.32, 0.98],
      }}
    >
      <Card
        className={cn(
          "group h-full transition-all duration-300",
          "hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5",
          "bg-card/50 backdrop-blur-sm"
        )}
      >
        <CardHeader className="pb-4">
          <div className="mb-3 flex items-center gap-3">
            <span
              className="text-3xl"
              role="img"
              aria-label={mode.title}
            >
              {mode.icon}
            </span>
            <CardTitle className="text-xl font-semibold tracking-tight">
              {mode.title}
            </CardTitle>
          </div>
          <CardDescription className="text-muted-foreground text-base leading-relaxed">
            {mode.description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "relative rounded-lg p-4",
              "bg-muted/50 border border-border/50",
              "font-mono text-sm",
              "before:absolute before:left-4 before:top-3 before:flex before:gap-1.5",
              "before:content-['']"
            )}
          >
            {/* Terminal-style header dots */}
            <div className="mb-3 flex gap-1.5">
              <span className="bg-destructive/60 size-2.5 rounded-full" />
              <span className="bg-warning/60 size-2.5 rounded-full" />
              <span className="bg-success/60 size-2.5 rounded-full" />
            </div>
            {/* Quote content */}
            <p className="text-foreground/80 leading-relaxed italic">
              {mode.example}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const ThreeModes = () => {
  return (
    <Section id="three-modes">
      <SectionHeader>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5 }}
        >
          <SectionTitle>{threeModes.title}</SectionTitle>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <SectionDescription>{threeModes.subtitle}</SectionDescription>
        </motion.div>
      </SectionHeader>

      <div className="grid w-full gap-6 md:grid-cols-2 lg:grid-cols-3">
        {threeModes.modes.map((mode, index) => (
          <ModeCardComponent key={mode.id} mode={mode} index={index} />
        ))}
      </div>
    </Section>
  );
};
